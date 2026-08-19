function escapeHTML(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/**
 * DiscoverPlay - Admin Dashboard JS
 * Manages CRUD operations for games via the API.
 */

const API_BASE = '/api';
let allAdminGames = [];
let gamesList = [];
let gameModal;
let adminFilteredGames = [];
let adminCurrentPage = 1;
let adminPageSize = 20;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    const adminUser = await requireAdmin();
    if (!adminUser) return;

    // Initialize bootstrap modal
    gameModal = new bootstrap.Modal(document.getElementById('gameModal'));
    
    // Load initial data
    fetchAdminStats();
    fetchAdminUsers();
    fetchAdminGames();
    initAdminGameFilters();

    // Setup form submit handler
    document.getElementById('game-form').addEventListener('submit', handleFormSubmit);
});

/** Fetch and render admin games. */
async function fetchAdminGames() {
    const tbody = document.getElementById('admin-games-tbody');
    try {
        const response = await fetch(`${API_BASE}/games?limit=500`, { credentials: 'include', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load games.');
        gamesList = Array.isArray(result.data) ? result.data : [];
        allAdminGames = [...gamesList];
        populateAdminPlatformFilter();
        applyAdminGameFilters();
    } catch (error) {
        console.error('Error fetching games:', error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">${escapeHTML(error.message || 'Failed to load games.')}</td></tr>`;
    }
}

function populateAdminPlatformFilter() {
    const select = document.getElementById('admin-platform-filter');
    if (!select) return;
    const platforms = [...new Set(allAdminGames.flatMap(game => Array.isArray(game.platforms) ? game.platforms : []))].sort();
    const current = select.value;
    select.innerHTML = '<option value="">All platforms</option>' + platforms.map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join('');
    select.value = platforms.includes(current) ? current : '';
}

function applyAdminGameFilters(resetPage = true) {
    const search = (document.getElementById('admin-game-search')?.value || '').trim().toLowerCase();
    const platform = document.getElementById('admin-platform-filter')?.value || '';
    const sort = document.getElementById('admin-sort')?.value || 'newest';
    if (resetPage) adminCurrentPage = 1;

    adminFilteredGames = allAdminGames.filter(game => {
        const haystack = [game.title, game.genre, game.developer, game.publisher, ...(game.platforms || [])].filter(Boolean).join(' ').toLowerCase();
        return (!search || haystack.includes(search)) && (!platform || (game.platforms || []).includes(platform));
    });
    adminFilteredGames.sort((a, b) => {
        if (sort === 'views') return Number(b.viewCount || 0) - Number(a.viewCount || 0);
        if (sort === 'az') return String(a.title || '').localeCompare(String(b.title || ''));
        if (sort === 'za') return String(b.title || '').localeCompare(String(a.title || ''));
        return new Date(b.releaseDate || b.createdAt || 0) - new Date(a.releaseDate || a.createdAt || 0);
    });
    renderTablePage();
}

function initAdminGameFilters() {
    ['admin-game-search', 'admin-platform-filter', 'admin-sort'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => applyAdminGameFilters(true));
    });
    const pageSizeEl = document.getElementById('admin-page-size');
    if (pageSizeEl) pageSizeEl.addEventListener('change', () => {
        adminPageSize = Number(pageSizeEl.value) || 20;
        applyAdminGameFilters(true);
    });
    const prev = document.getElementById('admin-prev-page');
    const next = document.getElementById('admin-next-page');
    if (prev) prev.addEventListener('click', () => { adminCurrentPage -= 1; renderTablePage(); });
    if (next) next.addEventListener('click', () => { adminCurrentPage += 1; renderTablePage(); });
    const logoInput = document.getElementById('game-logo');
    const coverInput = document.getElementById('game-cover');
    const screenshotInput = document.getElementById('game-screenshots');
    if (logoInput) logoInput.addEventListener('input', updateLogoPreview);
    if (coverInput) coverInput.addEventListener('input', updateCoverPreview);
    if (screenshotInput) screenshotInput.addEventListener('input', updateScreenshotPreview);
}

function renderTablePage() {
    const tbody = document.getElementById('admin-games-tbody');
    const summary = document.getElementById('admin-game-summary');
    const pageInfo = document.getElementById('admin-page-info');
    const prev = document.getElementById('admin-prev-page');
    const next = document.getElementById('admin-next-page');
    if (!tbody) return;
    const total = adminFilteredGames.length;
    const totalPages = Math.max(1, Math.ceil(total / adminPageSize));
    adminCurrentPage = Math.min(Math.max(adminCurrentPage, 1), totalPages);
    const start = (adminCurrentPage - 1) * adminPageSize;
    const pageGames = adminFilteredGames.slice(start, start + adminPageSize);
    if (!total) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-search fs-3 d-block mb-2"></i>No matching games found.</td></tr>';
    } else {
        tbody.innerHTML = pageGames.map(game => {
            const cover = escapeHTML(game.coverImage || 'https://placehold.co/50x50/1E1E1E/6C63FF?text=No+Img');
            return `<tr>
                <td><img src="${cover}" alt="Cover" width="44" height="58" class="rounded object-fit-cover border border-secondary" onerror="this.src='https://placehold.co/50x50/1E1E1E/6C63FF?text=No+Img'"></td>
                <td class="fw-medium">${escapeHTML(game.title || 'Untitled')}</td>
                <td>${escapeHTML(game.genre || '-')}</td>
                <td><small class="text-muted">${escapeHTML((game.platforms || []).join(', ') || '-')}</small></td>
                <td>${escapeHTML(game.developer || '-')}</td>
                <td><span class="badge bg-secondary">${Number(game.viewCount || 0).toLocaleString()}</span></td>
                <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-info me-1" onclick="openEditModal('${escapeHTML(game._id)}')"><i class="bi bi-pencil"></i> Edit</button><button class="btn btn-sm btn-outline-danger" onclick="deleteGame('${escapeHTML(game._id)}')"><i class="bi bi-trash"></i> Delete</button></td>
            </tr>`;
        }).join('');
    }
    const first = total ? start + 1 : 0;
    const last = Math.min(start + pageGames.length, total);
    if (summary) summary.textContent = total ? `Showing ${first}–${last} of ${total} matching games` : 'No matching games';
    if (pageInfo) pageInfo.textContent = `Page ${adminCurrentPage} of ${totalPages}`;
    if (prev) prev.disabled = adminCurrentPage <= 1;
    if (next) next.disabled = adminCurrentPage >= totalPages;
}

function updateLogoPreview() {
    const input = document.getElementById('game-logo');
    const img = document.getElementById('game-logo-preview');
    const status = document.getElementById('game-logo-preview-status');
    if (!input || !img || !status) return;
    const url = input.value.trim();
    if (!url) {
        img.classList.add('d-none');
        img.removeAttribute('src');
        status.textContent = 'Preview appears when a valid image URL is entered.';
        return;
    }
    img.src = url;
    img.classList.remove('d-none');
    status.textContent = 'Loading preview...';
    img.onload = () => { status.textContent = 'Logo preview'; };
    img.onerror = () => {
        img.classList.add('d-none');
        status.textContent = 'Could not load this image URL.';
    };
}

function updateCoverPreview() {
    const input = document.getElementById('game-cover');
    const img = document.getElementById('game-cover-preview');
    const status = document.getElementById('game-cover-preview-status');
    if (!input || !img || !status) return;
    const url = input.value.trim();
    if (!url) { img.classList.add('d-none'); img.removeAttribute('src'); status.textContent = 'Preview appears when a valid image URL is entered.'; return; }
    img.src = url; img.classList.remove('d-none'); status.textContent = 'Loading preview...';
    img.onload = () => { status.textContent = 'Cover preview'; };
    img.onerror = () => { img.classList.add('d-none'); status.textContent = 'Could not load this image URL.'; };
}

function updateScreenshotPreview() {
    const input = document.getElementById('game-screenshots');
    const preview = document.getElementById('game-screenshot-preview');
    if (!input || !preview) return;
    const urls = input.value.split(',').map(v => v.trim()).filter(Boolean).slice(0, 6);
    preview.innerHTML = urls.map((url, index) => `<img src="${escapeHTML(url)}" alt="Screenshot ${index + 1}" onerror="this.style.display='none'">`).join('');
}

async function fetchAdminStats() {
    try {
        const response = await fetch(`${API_BASE}/users/stats`, { credentials: 'include', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load dashboard stats.');
        const stats = result.data || {};
        document.getElementById('stat-games').textContent = Number(stats.games || 0).toLocaleString();
        document.getElementById('stat-users').textContent = Number(stats.users || 0).toLocaleString();
        document.getElementById('stat-views').textContent = Number(stats.totalViews || 0).toLocaleString();
        document.getElementById('stat-unread').textContent = Number(stats.unreadMessages || 0).toLocaleString();
    } catch (error) {
        console.error('Admin stats error:', error);
    }
}

async function fetchAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    try {
        const response = await fetch(`${API_BASE}/users`, { credentials: 'include', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load users.');
        const users = result.data || [];
        document.getElementById('admin-user-count').textContent = `${users.length} total`;
        tbody.innerHTML = users.length ? users.map(user => `<tr><td>${escapeHTML(user.username || '-')}</td><td>${escapeHTML(user.email || '-')}</td><td><span class="badge ${user.role === 'admin' ? 'bg-warning text-dark' : 'bg-secondary'}">${escapeHTML(user.role || 'user')}</span></td><td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted py-4">No users found.</td></tr>';
    } catch (error) {
        console.error('Admin users error:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">${escapeHTML(error.message || 'Could not load users.')}</td></tr>`;
    }
}

/**
 * Open the modal to ADD a new game
 */
function openAddModal() {
    document.getElementById('game-form').reset();
    document.getElementById('game-id').value = '';
    document.getElementById('gameModalLabel').textContent = 'Add New Game';
    
    // Uncheck all platforms
    document.querySelectorAll('.platform-cb').forEach(cb => cb.checked = false);
    updateCoverPreview();
    updateScreenshotPreview();
    gameModal.show();
}

/**
 * Open the modal to EDIT an existing game
 */
async function openEditModal(id) {
    let game = gamesList.find(g => String(g._id) === String(id));

    // If the game isn't in the current admin page/filter, fetch it directly.
    if (!game) {
        try {
            const response = await fetch(`${API_BASE}/games/${encodeURIComponent(id)}`, {
                credentials: 'include',
                cache: 'no-store'
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || 'Could not load the game for editing.');
            game = result.data;
        } catch (error) {
            console.error('Error loading game for edit:', error);
            showAdminToast(error.message || 'Could not load the game.', 'danger');
            return;
        }
    }

    if (!game) return;

    document.getElementById('game-form').reset();
    document.getElementById('game-id').value = game._id;
    document.getElementById('gameModalLabel').textContent = 'Edit Game';

    document.getElementById('game-title').value = game.title || '';
    document.getElementById('game-genre').value = game.genre || '';
    document.getElementById('game-desc').value = game.description || '';
    document.getElementById('game-dev').value = game.developer || '';
    document.getElementById('game-pub').value = game.publisher || '';

    if (game.releaseDate) {
        const d = new Date(game.releaseDate);
        if (!Number.isNaN(d.getTime())) {
            document.getElementById('game-date').value = d.toISOString().split('T')[0];
        }
    }

    document.getElementById('game-logo').value = game.logoImage || '';
    document.getElementById('game-cover').value = game.coverImage || '';
    document.getElementById('game-screenshots').value = Array.isArray(game.screenshots) ? game.screenshots.join(', ') : '';
    updateLogoPreview();
    updateCoverPreview();
    updateScreenshotPreview();

    document.querySelectorAll('.platform-cb').forEach(cb => {
        cb.checked = Array.isArray(game.platforms) && game.platforms.includes(cb.value);
    });

    const storeNames = document.querySelectorAll('.store-name');
    const storeUrls = document.querySelectorAll('.store-url');
    for (let i = 0; i < 3; i += 1) {
        storeNames[i].value = game.storeLinks?.[i]?.store || '';
        storeUrls[i].value = game.storeLinks?.[i]?.url || '';
    }

    gameModal.show();
}

/**
 * Handle form submission (Add or Edit)
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('game-id').value;
    const isEditing = !!id;
    
    // Gather platforms
    const platforms = [];
    document.querySelectorAll('.platform-cb:checked').forEach(cb => platforms.push(cb.value));

    // Gather screenshots
    const screenshotsRaw = document.getElementById('game-screenshots').value;
    const screenshots = screenshotsRaw ? screenshotsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Gather store links
    const storeLinks = [];
    const storeNames = document.querySelectorAll('.store-name');
    const storeUrls = document.querySelectorAll('.store-url');
    for (let i = 0; i < 3; i++) {
        const name = storeNames[i].value.trim();
        const url = storeUrls[i].value.trim();
        if (name && url) {
            storeLinks.push({ store: name, url: url });
        }
    }

    // Build payload
    const payload = {
        title: document.getElementById('game-title').value.trim(),
        genre: document.getElementById('game-genre').value.trim(),
        description: document.getElementById('game-desc').value.trim(),
        developer: document.getElementById('game-dev').value.trim(),
        publisher: document.getElementById('game-pub').value.trim(),
        releaseDate: document.getElementById('game-date').value || null,
        logoImage: document.getElementById('game-logo').value.trim(),
        coverImage: document.getElementById('game-cover').value.trim(),
        platforms: platforms,
        screenshots: screenshots,
        storeLinks: storeLinks
    };

    const saveButton = document.getElementById('save-game-btn');
    const saveLabel = saveButton?.querySelector('span');
    if (saveButton) { saveButton.disabled = true; if (saveLabel) saveLabel.textContent = isEditing ? 'Saving Changes...' : 'Adding Game...'; }

    try {
        const url = isEditing ? `${API_BASE}/games/${id}` : `${API_BASE}/games`;
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Failed to save the game.');
        gameModal.hide();
        await Promise.all([fetchAdminGames(), fetchAdminStats()]);
        showAdminToast(isEditing ? 'Game updated successfully.' : 'Game added successfully.', 'success');
    } catch (error) {
        console.error('Error saving game:', error);
        showAdminToast(error.message || 'Could not save the game.', 'danger');
    } finally {
        if (saveButton) { saveButton.disabled = false; if (saveLabel) saveLabel.textContent = 'Save Game'; }
    }
}

/**
 * Delete a game
 */
async function deleteGame(id) {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/games/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Failed to delete the game.');
        await Promise.all([fetchAdminGames(), fetchAdminStats()]);
        showAdminToast('Game deleted successfully.', 'success');
    } catch (error) {
        console.error('Error deleting game:', error);
        showAdminToast(error.message || 'Could not delete the game.', 'danger');
    }
}

function showAdminToast(message, tone = 'success') {
    const container = document.getElementById('admin-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `alert alert-${tone} shadow-lg mb-2`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}


async function loadContactMessages() {
    const tbody = document.getElementById('admin-contact-tbody');
    const unreadBadge = document.getElementById('contact-unread-count');
    if (!tbody) return;
    try {
        const response = await fetch(`${API_BASE}/contact`, { credentials: 'include' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load messages.');
        const messages = result.data || [];
        const unread = messages.filter(m => m.status === 'unread').length;
        if (unreadBadge) unreadBadge.textContent = `${unread} unread`;
        if (!messages.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No contact messages yet.</td></tr>';
            return;
        }
        tbody.innerHTML = messages.map(message => `
            <tr>
                <td>${escapeHTML(message.email || '')}</td>
                <td><span class="badge bg-secondary">${escapeHTML(message.category || 'other')}</span></td>
                <td style="min-width:260px;white-space:pre-wrap;">${escapeHTML(message.message || '')}</td>
                <td>${message.createdAt ? new Date(message.createdAt).toLocaleString() : '-'}</td>
                <td><span class="badge ${message.status === 'read' ? 'bg-success' : 'bg-warning text-dark'}">${escapeHTML(message.status)}</span></td>
                <td class="text-end">
                    ${message.status === 'unread' ? `<button class="btn btn-sm btn-outline-success me-1" data-message-read="${message._id}">Mark read</button>` : ''}
                    <button class="btn btn-sm btn-outline-danger" data-message-delete="${message._id}">Delete</button>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('[data-message-read]').forEach(button => {
            button.addEventListener('click', async () => {
                await fetch(`${API_BASE}/contact/${button.dataset.messageRead}/status`, {
                    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'read' })
                });
                loadContactMessages();
            });
        });
        tbody.querySelectorAll('[data-message-delete]').forEach(button => {
            button.addEventListener('click', async () => {
                if (!confirm('Delete this message?')) return;
                await fetch(`${API_BASE}/contact/${button.dataset.messageDelete}`, { method: 'DELETE', credentials: 'include' });
                loadContactMessages();
            });
        });
    } catch (error) {
        console.error('Contact messages error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Could not load contact messages.</td></tr>';
    }
}

// Load contact messages after admin authentication is confirmed.
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadContactMessages, 250);
});
