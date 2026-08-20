/**
 * DiscoverPlay - main.js
 * Handles API calls and frontend interactions.
 * All game data comes from the backend API.
 */

// ============================================================
// Configuration
// ============================================================

const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : 'https://discoverplay-backend-f1o7.onrender.com/api';

const DEFAULT_COVER =
    'https://via.placeholder.com/500x750?text=No+Image';

const PLATFORMS = [
    'PC',
    'Android',
    'iOS',
    'PlayStation',
    'Xbox',
    'Nintendo Switch',
    'XR / VR',
    'macOS'
];

let allBrowseGames = [];

// Auth/library state is shared by game cards, game details, and the navbar.
// These must exist before any async initializer runs.
let currentAuthUser = null;
let libraryStateLoaded = false;
let libraryState = {
    favoriteIds: new Set(),
    wishlistIds: new Set()
};


// ============================================================
// Security / Utility Helpers
// ============================================================

/**
 * Escape text before inserting backend data into HTML.
 * Prevents HTML/XSS injection.
 */
function escapeHTML(value) {
    if (value === null || value === undefined) return '';

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/**
 * Safely create a URL.
 */
function safeURL(value, fallback = '#') {
    if (!value) return fallback;

    try {
        const url = new URL(value, window.location.href);

        if (
            url.protocol === 'http:' ||
            url.protocol === 'https:'
        ) {
            return url.href;
        }

        return fallback;
    } catch {
        return fallback;
    }
}


/**
 * Safely get JSON from fetch response.
 */
async function getJSON(response) {
    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
        );
    }

    return response.json();
}


// ============================================================
// Path Helpers
// ============================================================

function getDetailsPath() {
    if (window.location.pathname.includes('/pages/')) {
        return 'game-details.html';
    }

    return 'pages/game-details.html';
}


function getBrowsePath() {
    if (window.location.pathname.includes('/pages/')) {
        return 'browse.html';
    }

    return 'pages/browse.html';
}


function getGameDetailsUrl(gameId) {
    const id = encodeURIComponent(String(gameId || ''));
    // Keep the URL stable regardless of whether the click originated from
    // the root page, a /pages/ page, or a filtered browse URL.
    return `${window.location.origin}/pages/game-details.html?id=${id}`;
}


// ============================================================
// Date Helper
// ============================================================

function formatDate(dateValue, options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
}) {
    if (!dateValue) return 'TBA';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return 'TBA';
    }

    return date.toLocaleDateString('en-US', options);
}


// ============================================================
// Game Card
// ============================================================

function buildGameCard(game, options = {}) {
    const showLibraryActions = options.showLibraryActions === true;
    const cover = safeURL(game.coverImage, DEFAULT_COVER);

    const title = escapeHTML(
        game.title || 'Untitled'
    );

    const genre = escapeHTML(
        game.genre || 'Unknown'
    );

    const developer = escapeHTML(
        game.developer || 'Unknown Developer'
    );

    const gameId = encodeURIComponent(
        game._id || ''
    );

    const detailsUrl = getGameDetailsUrl(game._id);

    return `
        <div class="col">
            <div class="game-card"
                 style="cursor:pointer;"
                 onclick="if (!event.target.closest('button,a')) window.location.href='${detailsUrl}'">

                <img
                    src="${cover}"
                    class="card-img-top"
                    alt="${title}"
                    onerror="this.src='${escapeHTML(DEFAULT_COVER)}'"
                    style="height:220px;object-fit:cover;"
                >

                <div class="card-body">

                    <span class="genre-badge">
                        ${genre}
                    </span>

                    <h5 class="card-title">
                        ${title}
                    </h5>

                    <div class="platforms">
                        <small class="text-muted">
                            ${developer}
                        </small>
                    </div>

                    ${showLibraryActions ? `
                    <div class="d-flex gap-2 mt-auto mb-2">
                        <button type="button" class="btn btn-outline-light flex-fill library-action" data-library-action="favorite" data-game-id="${gameId}" aria-label="Add ${title} to favorites">
                            <i class="bi bi-heart me-1"></i><span>Favorite</span>
                        </button>
                        <button type="button" class="btn btn-outline-light flex-fill library-action" data-library-action="wishlist" data-game-id="${gameId}" aria-label="Add ${title} to wishlist">
                            <i class="bi bi-bookmark-heart me-1"></i><span>Wishlist</span>
                        </button>
                    </div>` : ''}

                    <a
                        href="${detailsUrl}"
                        class="btn btn-primary w-100"
                        onclick="event.stopPropagation();"
                    >
                        View Details
                    </a>

                </div>
            </div>
        </div>
    `;
}


// ============================================================
// Favorites / Wishlist
// ============================================================

async function loadLibraryState() {
    if (!currentAuthUser || libraryStateLoaded) return;
    try {
        const response = await fetch(`${API_BASE}/users/library`, {
            credentials: 'include',
            cache: 'no-store'
        });
        if (!response.ok) return;
        const result = await response.json();
        const data = result.data || {};
        libraryState.favoriteIds = new Set((data.favoriteIds || []).map(String));
        libraryState.wishlistIds = new Set((data.wishlistIds || []).map(String));
        libraryStateLoaded = true;
        refreshLibraryButtons();
    } catch (error) {
        console.warn('Could not load favorites/wishlist state:', error.message);
    }
}

function updateLibraryButton(button, active) {
    if (!button) return;
    const type = button.dataset.libraryAction;
    const icon = button.querySelector('i');
    const label = button.querySelector('span');
    const isFavorite = type === 'favorite';
    if (icon) icon.className = `bi ${isFavorite ? (active ? 'bi-heart-fill' : 'bi-heart') : (active ? 'bi-bookmark-heart-fill' : 'bi-bookmark-heart')} me-1`;
    if (label) label.textContent = active ? (isFavorite ? 'Favorited' : 'Wishlisted') : (isFavorite ? 'Favorite' : 'Wishlist');
    button.classList.toggle('active', active);
    button.classList.toggle('btn-primary', active);
    button.classList.toggle('btn-outline-light', !active);
}

function refreshLibraryButtons() {
    document.querySelectorAll('.library-action').forEach(button => {
        const id = String(button.dataset.gameId || '');
        const type = button.dataset.libraryAction;
        const active = type === 'favorite'
            ? libraryState.favoriteIds.has(id)
            : libraryState.wishlistIds.has(id);
        updateLibraryButton(button, active);
    });
}

let libraryAuthToastTimer = null;

function showLibraryAuthToast() {
    let toast = document.getElementById('library-auth-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'library-auth-toast';
        toast.className = 'dp-auth-save-toast';
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <div class="dp-auth-save-toast__icon"><i class="bi bi-heart"></i></div>
            <div class="dp-auth-save-toast__content">
                <strong>Sign in to save games</strong>
                <span>Create an account to use Favorites and Wishlist.</span>
            </div>
            <div class="dp-auth-save-toast__actions">
                <a class="btn btn-primary btn-sm" href="${getRegisterPath()}">Sign Up</a>
                <a class="btn btn-outline-light btn-sm" href="${getLoginPath()}">Log In</a>
                <button type="button" class="btn btn-sm btn-link text-white text-decoration-none" aria-label="Dismiss">&times;</button>
            </div>
        `;
        document.body.appendChild(toast);

        const dismiss = toast.querySelector('button');
        dismiss?.addEventListener('click', () => {
            toast.classList.remove('is-visible');
        });
    }

    toast.classList.add('is-visible');
    clearTimeout(libraryAuthToastTimer);
    libraryAuthToastTimer = setTimeout(() => {
        toast.classList.remove('is-visible');
        const currentPath = window.location.pathname + window.location.search;
        const redirect = encodeURIComponent(currentPath);
        window.location.href = `${getRegisterPath()}?redirect=${redirect}`;
    }, 3500);
}

async function handleLibraryAction(button) {
    const gameId = button?.dataset.gameId;
    const action = button?.dataset.libraryAction;
    if (!gameId || !action) return;

    if (!currentAuthUser) {
        showLibraryAuthToast();
        return;
    }

    button.disabled = true;
    try {
        const response = await fetch(`${API_BASE}/users/${action === 'favorite' ? 'favorites' : 'wishlist'}/${encodeURIComponent(gameId)}/toggle`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not update library.');
        libraryState.favoriteIds = new Set((result.favoriteGames || []).map(String));
        libraryState.wishlistIds = new Set((result.wishlistGames || []).map(String));
        libraryStateLoaded = true;
        refreshLibraryButtons();
    } catch (error) {
        console.error('Library action error:', error);
        alert(error.message || 'Could not update your games.');
    } finally {
        button.disabled = false;
    }
}

function initLibraryActions() {
    document.addEventListener('click', event => {
        const button = event.target.closest('.library-action');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        handleLibraryAction(button);
    });
}

// ============================================================
// Loading / Empty States
// ============================================================

function renderState(container, {
    type = 'empty',
    title = '',
    message = '',
    icon = 'bi-controller',
    actionLabel = '',
    onAction = null
} = {}) {
    if (!container) return;

    const isTable = container.tagName === 'TBODY';
    const isLoading = type === 'loading';
    const isError = type === 'error';
    const safeTitle = escapeHTML(title);
    const safeMessage = escapeHTML(message);
    const safeIcon = escapeHTML(icon);
    const stateHTML = `
        <div class="dp-state dp-state--${isLoading ? 'loading' : isError ? 'error' : 'empty'}">
            <div class="dp-state__icon">
                ${isLoading
                    ? '<div class="spinner-border" role="status" aria-hidden="true"></div>'
                    : `<i class="bi ${safeIcon}" aria-hidden="true"></i>`}
            </div>
            <div class="dp-state__content">
                <h4 class="dp-state__title">${safeTitle}</h4>
                ${safeMessage ? `<p class="dp-state__message">${safeMessage}</p>` : ''}
                ${actionLabel ? '<button type="button" class="btn btn-primary btn-sm mt-2 dp-state__action"></button>' : ''}
            </div>
        </div>`;

    if (isTable) {
        const colSpan = container.closest('table')?.querySelector('thead tr')?.children.length || 4;
        container.innerHTML = `<tr><td colspan="${colSpan}" class="p-0 border-0">${stateHTML}</td></tr>`;
    } else {
        container.innerHTML = stateHTML;
    }

    if (actionLabel && typeof onAction === 'function') {
        const button = container.querySelector('.dp-state__action');
        if (button) {
            button.textContent = actionLabel;
            button.addEventListener('click', onAction);
        }
    }
}

function showNoGames(container, message = 'No games available.') {
    renderState(container, {
        type: 'empty',
        title: message,
        message: 'There is nothing to show here yet.',
        icon: 'bi-controller'
    });
}

function showLoading(container, message = 'Loading…') {
    renderState(container, {
        type: 'loading',
        title: 'Loading',
        message,
        icon: 'bi-hourglass-split'
    });
}

function showError(container, message = 'Something went wrong.', retry = null) {
    renderState(container, {
        type: 'error',
        title: 'Unable to load this section',
        message,
        icon: 'bi-exclamation-triangle',
        actionLabel: typeof retry === 'function' ? 'Try again' : '',
        onAction: retry
    });
}


// ============================================================
// Navbar Platform Links
// ============================================================

function initPlatformNavLinks() {
    const dropdowns =
        document.querySelectorAll(
            '[aria-labelledby="navbarDropdown"]'
        );

    if (!dropdowns.length) return;

    const browsePath = getBrowsePath();

    const html = PLATFORMS.map(platform => {
        const encoded =
            encodeURIComponent(platform);

        return `
            <li>
                <a
                    class="dropdown-item"
                    href="${browsePath}?platform=${encoded}"
                >
                    ${escapeHTML(platform)}
                </a>
            </li>
        `;
    }).join('');

    dropdowns.forEach(dropdown => {
        dropdown.innerHTML = html;
    });
}


// ============================================================
// Platform Cards
// ============================================================

function initPlatformCards() {
    const cards =
        document.querySelectorAll('[data-platform]');

    if (!cards.length) return;

    const browsePath = getBrowsePath();

    cards.forEach(card => {
        const platform =
            card.getAttribute('data-platform');

        if (!platform) return;

        card.style.cursor = 'pointer';

        card.addEventListener('click', () => {
            window.location.href =
                `${browsePath}?platform=${encodeURIComponent(platform)}`;
        });
    });
}


// ============================================================
// HOME — Featured Game
// ============================================================

async function loadFeaturedGame() {
    const heroSection =
        document.getElementById('featured-hero');

    const titleEl =
        document.getElementById('featured-title');

    const descEl =
        document.getElementById('featured-desc');

    const actionsEl =
        document.getElementById('featured-actions');

    if (!heroSection || !titleEl) return;

    try {
        const response =
            await fetch(`${API_BASE}/games/featured?limit=1`, { credentials: 'include' });

        const result =
            await getJSON(response);

        const game = result.data;

        if (!game) {
            titleEl.textContent =
                'No Featured Game';

            if (descEl) {
                descEl.textContent =
                    'Add games via the Admin Dashboard to see them here.';
            }

            return;
        }

        const cover =
            safeURL(game.coverImage, DEFAULT_COVER);

        const gameId =
            encodeURIComponent(game._id || '');

        const detailsUrl =
            `${getDetailsPath()}?id=${gameId}`;

        // Background
        heroSection.style.background =
            `linear-gradient(
                rgba(18,18,18,0.65),
                rgba(18,18,18,1)
            ), url('${cover}') center/cover no-repeat`;

        // Title
        titleEl.textContent =
            game.title || 'Untitled';

        const logoHost = document.getElementById('game-logo');
        if (logoHost) {
            const logoURL = safeURL(game.logoImage, '');
            logoHost.innerHTML = logoURL
                ? `<img src="${logoURL}" alt="${escapeHTML(game.title || 'Game')} logo" class="game-title-logo" onerror="this.parentElement.innerHTML=''">`
                : '';
        }

        // Description
        if (descEl) {
            descEl.textContent =
                game.description ||
                'Discover a strong pick based on popularity, recency, and DiscoverPlay activity.';
        }

        // Buttons / badges
        if (actionsEl) {

            const genre =
                game.genre
                    ? `
                        <span class="badge bg-secondary me-2 mb-3">
                            ${escapeHTML(game.genre)}
                        </span>
                    `
                    : '';

            const platforms =
                Array.isArray(game.platforms) &&
                    game.platforms.length
                    ? game.platforms
                        .map(platform => `
                            <span class="badge bg-outline-light border me-1 mb-3">
                                ${escapeHTML(platform)}
                            </span>
                        `)
                        .join('')
                    : '';

            actionsEl.innerHTML = `
                <div class="mb-3">
                    ${genre}
                    ${platforms}
                </div>

                <a
                    href="${detailsUrl}"
                    class="btn btn-primary btn-lg px-4 me-2"
                >
                    <i class="bi bi-play-fill"></i>
                    View Details
                </a>

                <a
                    href="${getBrowsePath()}"
                    class="btn btn-outline-light btn-lg px-4"
                >
                    Browse All
                </a>
            `;
        }

    } catch (error) {

        console.error(
            'Error loading featured game:',
            error
        );

        titleEl.textContent = 'Featured game unavailable';

        if (descEl) {
            descEl.textContent = 'We could not load the featured game right now. Please try again.';
        }

        if (actionsEl) {
            actionsEl.innerHTML = `
                <button type="button" class="btn btn-primary btn-lg px-4" id="featured-retry">
                    <i class="bi bi-arrow-clockwise me-1"></i> Retry
                </button>`;
            document.getElementById('featured-retry')?.addEventListener('click', loadFeaturedGame);
        }
    }
}


// ============================================================
// HOME — Trending Games
// ============================================================

async function loadTrendingGames() {
    const grid =
        document.getElementById('trending-games-grid');

    if (!grid) return;

    showLoading(grid);

    try {
        const response =
            await fetch(`${API_BASE}/games/trending?limit=8`, { credentials: 'include' });

        const result =
            await getJSON(response);

        const games =
            Array.isArray(result.data)
                ? result.data
                : [];

        if (!games.length) {
            showNoGames(grid);
            return;
        }

        grid.innerHTML =
            games.map(buildGameCard).join('');

    } catch (error) {

        console.error(
            'Error loading trending games:',
            error
        );

        showNoGames(
            grid,
            'Could not load trending games.'
        );
    }
}


// ============================================================
// HOME — New Releases
// ============================================================

async function loadNewReleasesList() {
    const listEl =
        document.getElementById('new-releases-list');

    if (!listEl) return;

    try {
        const response =
            await fetch(`${API_BASE}/games/new-releases?limit=5`, { credentials: 'include' });

        const result =
            await getJSON(response);

        const games =
            Array.isArray(result.data)
                ? result.data.slice(0, 5)
                : [];

        if (!games.length) {
            showNoGames(listEl, 'No new releases yet.');
            return;
        }

        listEl.innerHTML =
            games.map(game => {

                const cover =
                    safeURL(
                        game.coverImage,
                        DEFAULT_COVER
                    );

                const title =
                    escapeHTML(
                        game.title || 'Untitled'
                    );

                const genre =
                    escapeHTML(
                        game.genre || ''
                    );

                const platforms =
                    Array.isArray(game.platforms)
                        ? game.platforms
                            .map(escapeHTML)
                            .join(', ')
                        : '';

                const date =
                    formatDate(game.releaseDate);

                const gameId =
                    encodeURIComponent(
                        game._id || ''
                    );

                const detailsUrl =
                    `${getDetailsPath()}?id=${gameId}`;

                return `
                    <a
                        href="${detailsUrl}"
                        class="list-group-item list-group-item-action bg-transparent text-white border-bottom border-secondary py-3 d-flex align-items-center gap-3"
                    >

                        <img
                            src="${cover}"
                            class="rounded"
                            alt="${title}"
                            width="64"
                            height="64"
                            style="object-fit:cover;"
                            onerror="this.src='${escapeHTML(DEFAULT_COVER)}'"
                        >

                        <div class="flex-grow-1">

                            <h6 class="mb-1">
                                ${title}
                            </h6>

                            <small class="text-muted">
                                ${genre}
                                ${genre && platforms ? ' • ' : ''}
                                ${platforms}
                            </small>

                        </div>

                        <div class="text-end">

                            <small class="text-muted d-block">
                                Released
                            </small>

                            <span class="text-white">
                                ${date}
                            </span>

                        </div>

                    </a>
                `;
            }).join('');

    } catch (error) {

        console.error(
            'Error loading new releases:',
            error
        );

        showError(listEl, 'The latest releases could not be loaded.');
    }
}


// ============================================================
// HOME — Recommended Games
// ============================================================

async function loadRecommendedList() {
    const listEl =
        document.getElementById('recommended-list');

    if (!listEl) return;

    try {
        const response =
            await fetch(`${API_BASE}/games/recommended?limit=5`, { credentials: 'include' });

        const result =
            await getJSON(response);

        const games =
            Array.isArray(result.data)
                ? result.data.slice(0, 5)
                : [];

        const recommendationNote =
            document.getElementById('recommended-description');
        if (recommendationNote) {
            recommendationNote.textContent = result.personalized
                ? 'Personalized from the games you have viewed.'
                : 'Popular picks while DiscoverPlay learns what you like.';
        }

        if (!games.length) {
            showNoGames(listEl, 'No recommendations yet.');
            return;
        }

        listEl.innerHTML =
            games.map((game, index) => {

                const cover =
                    safeURL(
                        game.coverImage,
                        DEFAULT_COVER
                    );

                const title =
                    escapeHTML(
                        game.title || 'Untitled'
                    );

                const genre =
                    escapeHTML(
                        game.genre || ''
                    );

                const platforms =
                    Array.isArray(game.platforms)
                        ? game.platforms
                            .map(escapeHTML)
                            .join(', ')
                        : '';

                const gameId =
                    encodeURIComponent(
                        game._id || ''
                    );

                const detailsUrl =
                    `${getDetailsPath()}?id=${gameId}`;

                const rankBadgeClass =
                    index === 0
                        ? 'bg-warning text-dark'
                        : index === 1
                            ? 'bg-secondary'
                            : index === 2
                                ? 'bg-danger'
                                : 'bg-dark border border-secondary';

                return `
                    <a
                        href="${detailsUrl}"
                        class="list-group-item list-group-item-action bg-transparent text-white border-bottom border-secondary py-3 d-flex align-items-center gap-3"
                    >

                        <img
                            src="${cover}"
                            class="rounded"
                            alt="${title}"
                            width="64"
                            height="64"
                            style="object-fit:cover;"
                            onerror="this.src='${escapeHTML(DEFAULT_COVER)}'"
                        >

                        <div class="flex-grow-1">

                            <h6 class="mb-1">
                                ${title}
                            </h6>

                            <small class="text-muted">
                                ${genre}
                                ${genre && platforms ? ' • ' : ''}
                                ${platforms}
                            </small>

                        </div>

                        <span
                            class="badge ${rankBadgeClass} fs-6 px-3"
                        >
                            #${index + 1}
                        </span>

                    </a>
                `;
            }).join('');

    } catch (error) {

        console.error(
            'Error loading recommended games:',
            error
        );

        showError(listEl, 'Recommendations could not be loaded.');
    }
}


// ============================================================
// GAME DETAILS
// ============================================================

async function loadGameDetails() {
    const titleEl =
        document.getElementById('game-title');

    if (!titleEl) return;

    const params =
        new URLSearchParams(window.location.search);

    const gameId =
        params.get('id');

    if (!gameId) {

        titleEl.textContent =
            'Game not found.';

        const descEl =
            document.getElementById('game-description');

        if (descEl) {
            descEl.textContent =
                'No game ID was provided in the URL.';
        }

        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE}/games/${encodeURIComponent(gameId)}`
            );

        if (!response.ok) {
            if (response.status === 404) {
                titleEl.textContent = 'Game not found';
                const descEl = document.getElementById('game-description');
                if (descEl) descEl.textContent = 'The requested game does not exist or may have been removed.';
                const actionsEl = document.getElementById('game-library-actions');
                if (actionsEl) actionsEl.innerHTML = `<a class="btn btn-primary" href="${getBrowsePath()}"><i class="bi bi-grid me-1"></i> Browse Games</a>`;
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result =
            await getJSON(response);

        const game =
            result.data || result;

        if (!game || !game._id) {

            titleEl.textContent =
                'Game not found.';

            return;
        }

        const gameTitle =
            game.title || 'Untitled';

        document.title =
            `${gameTitle} | DiscoverPlay`;

        titleEl.textContent =
            gameTitle;

        const gameActionsEl = document.getElementById('game-library-actions');
        if (gameActionsEl) {
            const gameIdAttr = escapeHTML(String(game._id));
            gameActionsEl.innerHTML = `
                <div class="d-flex flex-wrap gap-2 align-items-center">
                    <button type="button" class="btn btn-outline-light library-action" data-library-action="favorite" data-game-id="${gameIdAttr}" aria-label="Add ${escapeHTML(gameTitle)} to favorites">
                        <i class="bi bi-heart me-1"></i><span>Favorite</span>
                    </button>
                    <button type="button" class="btn btn-outline-light library-action" data-library-action="wishlist" data-game-id="${gameIdAttr}" aria-label="Add ${escapeHTML(gameTitle)} to wishlist">
                        <i class="bi bi-bookmark-heart me-1"></i><span>Wishlist</span>
                    </button>
                    <a class="btn btn-outline-accent" href="${getBrowsePath()}">Browse More</a>
                </div>
            `;
            refreshLibraryButtons();
        }

        // Description
        const descEl =
            document.getElementById(
                'game-description'
            );

        if (descEl) {
            descEl.textContent =
                game.description ||
                'No description available.';
        }

        // Cover
        const cover =
            safeURL(
                game.coverImage,
                DEFAULT_COVER
            );

        const coverEl =
            document.getElementById(
                'game-cover'
            );

        if (coverEl) {

            coverEl.src = cover;

            coverEl.alt =
                `${gameTitle} Cover`;

            coverEl.onerror = () => {
                coverEl.src = DEFAULT_COVER;
            };
        }

        // Banner
        const bannerEl =
            document.getElementById(
                'game-banner'
            );

        if (bannerEl) {

            bannerEl.style.background =
                `linear-gradient(
                    to top,
                    var(--dp-bg-primary) 0%,
                    rgba(18,18,18,0.3) 100%
                ),
                url('${cover}') center/cover no-repeat`;
        }

        // Developer
        const devEl =
            document.getElementById(
                'game-developer'
            );

        if (devEl) {
            devEl.textContent =
                game.developer || 'N/A';
        }

        // Publisher
        const pubEl =
            document.getElementById(
                'game-publisher'
            );

        if (pubEl) {
            pubEl.textContent =
                game.publisher || 'N/A';
        }

        // Release date
        const dateEl =
            document.getElementById(
                'game-release-date'
            );

        if (dateEl) {
            dateEl.textContent =
                formatDate(game.releaseDate);
        }

        // Genre + Platforms
        const badgesEl =
            document.getElementById(
                'game-genre-badges'
            );

        if (badgesEl) {

            let html = '';

            if (game.genre) {
                html += `
                    <span class="badge bg-primary fs-6 py-2 px-3 me-2">
                        ${escapeHTML(game.genre)}
                    </span>
                `;
            }

            if (
                Array.isArray(game.platforms) &&
                game.platforms.length
            ) {

                game.platforms.forEach(platform => {

                    html += `
                        <span class="badge bg-secondary py-2 px-3 me-1">
                            ${escapeHTML(platform)}
                        </span>
                    `;
                });
            }

            badgesEl.innerHTML =
                html ||
                '<span class="text-muted">N/A</span>';
        }

        // Screenshots
        const screenshotsEl =
            document.getElementById(
                'game-screenshots'
            );

        if (screenshotsEl) {

            if (
                Array.isArray(game.screenshots) &&
                game.screenshots.length
            ) {

                screenshotsEl.innerHTML =
                    game.screenshots
                        .map((url, index) => {

                            const imageURL =
                                safeURL(
                                    url,
                                    DEFAULT_COVER
                                );

                            return `
                                <div class="col-md-4">

                                    <img
                                        src="${imageURL}"
                                        class="img-fluid rounded border border-secondary"
                                        alt="Screenshot ${index + 1}"
                                        onerror="this.style.display='none'"
                                    >

                                </div>
                            `;
                        })
                        .join('');

            } else {

                screenshotsEl.innerHTML =
                    '<p class="text-muted">No screenshots available.</p>';
            }
        }

        // Store links
        const linksEl =
            document.getElementById(
                'game-store-links'
            );

        if (linksEl) {

            if (
                Array.isArray(game.storeLinks) &&
                game.storeLinks.length
            ) {

                linksEl.innerHTML =
                    game.storeLinks
                        .map(link => {

                            const storeURL =
                                safeURL(
                                    link.url,
                                    '#'
                                );

                            const storeName =
                                escapeHTML(
                                    link.store || 'Store'
                                );

                            return `
                                <a
                                    href="${storeURL}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="btn btn-dark border border-secondary px-4 py-2 d-flex align-items-center gap-2"
                                >

                                    <i class="bi bi-box-arrow-up-right"></i>

                                    ${storeName}

                                </a>
                            `;
                        })
                        .join('');

            } else {

                linksEl.innerHTML =
                    '<p class="text-muted">No store links available.</p>';
            }
        }

        // Similar games
        loadSimilarGames(gameId);

    } catch (error) {

        console.error(
            'Error loading game details:',
            error
        );

        titleEl.textContent = 'Unable to load game';

        const descEl = document.getElementById('game-description');
        if (descEl) {
            descEl.textContent = 'The game could not be loaded right now. Please check the server connection and try again.';
        }
        const actionsEl = document.getElementById('game-library-actions');
        if (actionsEl) {
            actionsEl.innerHTML = `<button type="button" class="btn btn-primary" id="game-retry"><i class="bi bi-arrow-clockwise me-1"></i> Retry</button>`;
            document.getElementById('game-retry')?.addEventListener('click', loadGameDetails);
        }
    }
}


// ============================================================
// GAME DETAILS — Similar Games
// ============================================================

async function loadSimilarGames(gameId) {
    const grid =
        document.getElementById(
            'similar-games-grid'
        );

    if (!grid) return;

    try {

        const response =
            await fetch(
                `${API_BASE}/games/${encodeURIComponent(gameId)}/similar`
            );

        const result =
            await getJSON(response);

        const games =
            Array.isArray(result.data)
                ? result.data
                : [];

        if (!games.length) {

            showNoGames(grid, 'No similar games found.');

            return;
        }

        grid.innerHTML =
            games.map(buildGameCard).join('');

    } catch (error) {

        console.error(
            'Error loading similar games:',
            error
        );

        showError(grid, 'Similar games could not be loaded.', () => loadSimilarGames(gameId));
    }
}


// ============================================================
// BROWSE PAGE
// ============================================================

async function loadBrowseGames(params = {}) {
    const grid = document.getElementById('browse-games-grid');
    const countEl = document.getElementById('browse-results-count');

    if (!grid) return;

    showLoading(grid);

    try {
        // Request a large page first. If the running backend still enforces
        // a smaller page size, follow its pagination metadata so Browse can
        // still display the complete collection (e.g. all 138 games).
        const requestParams = { ...params, limit: 500, page: 1 };
        const qs = new URLSearchParams(requestParams).toString();
        const firstResponse = await fetch(`${API_BASE}/games?${qs}`);
        const firstResult = await getJSON(firstResponse);

        let games = Array.isArray(firstResult.data) ? firstResult.data : [];
        const total = Number(firstResult.total) || games.length;
        const pageSize = Number(firstResult.limit) || games.length || 1;
        const totalPages = Math.max(1, Number(firstResult.totalPages) || Math.ceil(total / pageSize));

        // Fetch any remaining pages in parallel. This is intentionally based
        // on the server's reported page size rather than assuming 500.
        if (totalPages > 1 && games.length < total) {
            const pageRequests = [];

            for (let page = 2; page <= totalPages; page += 1) {
                const pageParams = { ...params, limit: 500, page };
                const pageQuery = new URLSearchParams(pageParams).toString();
                pageRequests.push(
                    fetch(`${API_BASE}/games?${pageQuery}`).then(getJSON)
                );
            }

            const pageResults = await Promise.all(pageRequests);
            pageResults.forEach(result => {
                if (Array.isArray(result.data)) games.push(...result.data);
            });
        }

        allBrowseGames = games;

        if (!games.length) {
            showNoGames(grid, 'No matching games found.');

            if (countEl) {
                countEl.innerHTML = 'Showing <strong class="text-white">0</strong> games';
            }

            buildGenreFilters([]);
            return;
        }

        grid.innerHTML = games.map(game => buildGameCard(game, { showLibraryActions: true })).join('');

        if (countEl) {
            countEl.innerHTML =
                `Showing <strong class="text-white">${games.length}</strong> game${games.length !== 1 ? 's' : ''}`;
        }

        buildGenreFilters(games);
    } catch (error) {
        console.error('Error loading browse games:', error);

        showError(grid, 'The game catalog could not be loaded. Make sure the backend server is running.', () => loadBrowseGames(params));

        if (countEl) {
            countEl.innerHTML = 'Unable to load games';
        }
    }
}

// ============================================================
// Browse — Genre Filters
// ============================================================

function buildGenreFilters(games) {
    const filterList =
        document.getElementById(
            'genre-filter-list'
        );

    if (!filterList) return;

    const genres =
        [
            ...new Set(
                games
                    .map(game => game.genre)
                    .filter(Boolean)
            )
        ].sort();

    if (!genres.length) {

        filterList.innerHTML =
            '<p class="text-muted small">No genres found.</p>';

        return;
    }

    filterList.innerHTML =
        genres.map((genre, index) => {

            const safeGenre =
                escapeHTML(genre);

            return `
                <div class="form-check mb-2">

                    <input
                        class="form-check-input genre-checkbox"
                        type="checkbox"
                        value="${safeGenre}"
                        id="genre-cb-${index}"
                        checked
                    >

                    <label
                        class="form-check-label text-muted"
                        for="genre-cb-${index}"
                    >
                        ${safeGenre}
                    </label>

                </div>
            `;
        }).join('');

    document
        .querySelectorAll('.genre-checkbox')
        .forEach(checkbox => {

            checkbox.addEventListener(
                'change',
                applyClientFilters
            );
        });
}


// ============================================================
// Browse — Client Filters
// ============================================================

function applyClientFilters() {
    const grid =
        document.getElementById(
            'browse-games-grid'
        );

    const countEl =
        document.getElementById(
            'browse-results-count'
        );

    if (!grid) return;

    const searchInput =
        document.getElementById(
            'browse-search-input'
        );

    const query =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : '';

    const selectedGenres =
        [
            ...document.querySelectorAll(
                '.genre-checkbox:checked'
            )
        ].map(
            checkbox => checkbox.value
        );

    const filtered =
        allBrowseGames.filter(game => {

            const title =
                String(
                    game.title || ''
                ).toLowerCase();

            const genre =
                String(
                    game.genre || ''
                );

            const titleMatch =
                !query ||
                title.includes(query);

            const genreMatch =
                selectedGenres.length === 0 ||
                selectedGenres.includes(genre);

            return titleMatch && genreMatch;
        });

    if (!filtered.length) {

        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <h4 class="text-muted">
                    No matching games found.
                </h4>
            </div>
        `;

    } else {

        grid.innerHTML =
            filtered.map(buildGameCard).join('');
    }

    if (countEl) {

        countEl.innerHTML =
            `Showing <strong class="text-white">${filtered.length}</strong> game${filtered.length !== 1 ? 's' : ''}`;
    }
}


// ============================================================
// Browse — Initialization
// ============================================================

function initBrowsePage() {
    const browseGrid =
        document.getElementById(
            'browse-games-grid'
        );

    if (!browseGrid) return;

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const platformParam =
        urlParams.get('platform') || '';

    const searchParam =
        urlParams.get('search') || '';

    const sortParam =
        urlParams.get('sort') || '';

    // Search input
    const searchInput =
        document.getElementById(
            'browse-search-input'
        );

    if (searchInput && searchParam) {
        searchInput.value =
            searchParam;
    }

    // Sort select
    const sortSelect =
        document.getElementById(
            'sort-select'
        );

    if (sortSelect && sortParam) {
        sortSelect.value =
            sortParam;
    }

    // Platform badge
    const platformBadgeEl =
        document.getElementById(
            'active-platform-badge'
        );

    if (
        platformBadgeEl &&
        platformParam
    ) {

        platformBadgeEl.innerHTML = `
            <span class="badge bg-primary fs-6 py-2 px-3 me-2">

                <i class="bi bi-funnel-fill me-1"></i>

                ${escapeHTML(platformParam)}

                <a
                    href="${getBrowsePath()}"
                    class="ms-2 text-white text-decoration-none"
                    title="Clear filter"
                >
                    ×
                </a>

            </span>
        `;

        platformBadgeEl.hidden = false;

    } else if (platformBadgeEl) {

        platformBadgeEl.hidden = true;
    }


    // Build initial API params
    const initialParams = {};

    if (platformParam) {
        initialParams.platform =
            platformParam;
    }

    if (searchParam) {
        initialParams.search =
            searchParam;
    }

    if (sortParam) {
        initialParams.sort = sortParam;
    } else if (sortSelect && sortSelect.value) {
        // Keep the visible default (Newest) consistent with the API query.
        initialParams.sort = sortSelect.value;
    }

    loadBrowseGames(initialParams);


    // Search form
    const searchForm =
        document.getElementById(
            'browse-search-form'
        );

    if (searchForm) {

        searchForm.addEventListener(
            'submit',
            event => {

                event.preventDefault();

                const query =
                    searchInput
                        ? searchInput.value.trim()
                        : '';

                const params = {};

                if (platformParam) {
                    params.platform =
                        platformParam;
                }

                if (query) {
                    params.search =
                        query;
                }

                if (
                    sortSelect &&
                    sortSelect.value
                ) {
                    params.sort =
                        sortSelect.value;
                }

                loadBrowseGames(params);
            }
        );
    }


    // Live search
    if (searchInput) {

        searchInput.addEventListener(
            'input',
            applyClientFilters
        );
    }


    // Sort
    if (sortSelect) {

        sortSelect.addEventListener(
            'change',
            () => {

                const params = {};

                if (platformParam) {
                    params.platform =
                        platformParam;
                }

                const query =
                    searchInput
                        ? searchInput.value.trim()
                        : '';

                if (query) {
                    params.search =
                        query;
                }

                if (sortSelect.value) {
                    params.sort =
                        sortSelect.value;
                }

                loadBrowseGames(params);
            }
        );
    }


    // Clear filters
    const clearBtn = document.getElementById('clear-filters-btn');

    if (clearBtn) {

        clearBtn.addEventListener(
            'click',
            () => {

                if (searchInput) {
                    searchInput.value = '';
                }

                if (sortSelect) {
                    sortSelect.value = 'newest';
                }

                document.querySelectorAll('.genre-checkbox').forEach(checkbox => {
                    checkbox.checked = true;
                });

                // Actually remove URL filters
                window.history.replaceState(
                    {},
                    '',
                    getBrowsePath()
                );

                const platformBadge =
                    document.getElementById(
                        'active-platform-badge'
                    );

                if (platformBadge) {
                    platformBadge.hidden = true;
                }

                loadBrowseGames({});
            }
        );
    }


    // Apply filters
    const applyBtn =
        document.getElementById(
            'apply-filters-btn'
        );

    if (applyBtn) {

        applyBtn.addEventListener(
            'click',
            applyClientFilters
        );
    }
}


// ============================================================
// LEADERBOARDS
// ============================================================

async function loadLeaderboards() {
    const trendingBody =
        document.getElementById(
            'leaderboard-trending-body'
        );

    const newBody =
        document.getElementById(
            'leaderboard-new-body'
        );

    const allBody =
        document.getElementById(
            'leaderboard-all-body'
        );

    if (
        !trendingBody &&
        !newBody &&
        !allBody
    ) {
        return;
    }


    // Trending
    if (trendingBody) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/games/trending?limit=10`,
                    { credentials: 'include' }
                );

            const result =
                await getJSON(response);

            const games =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            renderLeaderboardRows(
                trendingBody,
                games,
                true
            );

        } catch (error) {

            console.error(
                'Leaderboard trending error:',
                error
            );

            showLeaderboardState(trendingBody, 'Trending games could not be loaded.', true);
        }
    }


    // New releases
    if (newBody) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/games/new-releases?limit=10`,
                    { credentials: 'include' }
                );

            const result =
                await getJSON(response);

            const games =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            renderLeaderboardRows(
                newBody,
                games
            );

        } catch (error) {

            console.error(
                'Leaderboard new releases error:',
                error
            );

            showLeaderboardState(newBody, 'New releases could not be loaded.');
        }
    }


    // Recommended
    if (allBody) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/games/recommended?limit=10`,
                    { credentials: 'include' }
                );

            const result =
                await getJSON(response);

            const games =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            renderLeaderboardRows(
                allBody,
                games
            );

        } catch (error) {

            console.error(
                'Leaderboard recommended error:',
                error
            );

            showLeaderboardState(allBody, 'Recommendations could not be loaded.');
        }
    }
}


function showLeaderboardState(tbody, message, showViews = false, retry = null) {
    if (!tbody) return;
    renderState(tbody, {
        type: 'error',
        title: 'Unable to load leaderboard',
        message,
        icon: 'bi-exclamation-triangle',
        actionLabel: typeof retry === 'function' ? 'Try again' : '',
        onAction: retry
    });
}

// ============================================================
// LEADERBOARDS — Render Rows
// ============================================================

function renderLeaderboardRows(
    tbody,
    games,
    showViews = false
) {
    if (!games || !games.length) {

        showNoGames(tbody, 'No games available.');

        return;
    }

    const rankClasses = [
        'rank-1',
        'rank-2',
        'rank-3'
    ];

    tbody.innerHTML =
        games.map((game, index) => {

            const cover =
                safeURL(
                    game.coverImage,
                    DEFAULT_COVER
                );

            const title =
                escapeHTML(
                    game.title || 'Untitled'
                );

            const genre =
                escapeHTML(
                    game.genre || 'Unknown'
                );

            const platforms =
                Array.isArray(game.platforms) &&
                    game.platforms.length
                    ? game.platforms
                        .slice(0, 3)
                        .map(escapeHTML)
                        .join(', ')
                    : 'N/A';

            const date =
                formatDate(
                    game.releaseDate,
                    {
                        year: 'numeric',
                        month: 'short'
                    }
                );

            const rankClass =
                index < 3
                    ? rankClasses[index]
                    : 'rank-other';

            const gameId =
                encodeURIComponent(
                    game._id || ''
                );

            const detailsUrl =
                `${getDetailsPath()}?id=${gameId}`;

            return `
                <tr
                    class="leaderboard-row"
                    style="border-bottom:1px solid rgba(255,255,255,0.05);"
                >

                    <td class="px-4">

                        <div class="rank-badge ${rankClass}">
                            ${index + 1}
                        </div>

                    </td>

                    <td>

                        <a
                            href="${detailsUrl}"
                            class="d-flex align-items-center gap-3 text-decoration-none"
                        >

                            <img
                                src="${cover}"
                                class="rounded"
                                alt="${title}"
                                width="64"
                                height="64"
                                style="object-fit:cover;"
                                onerror="this.src='${escapeHTML(DEFAULT_COVER)}'"
                            >

                            <div>

                                <h6 class="mb-0 text-white">
                                    ${title}
                                </h6>

                                <small class="text-muted">
                                    ${genre}
                                </small>

                            </div>

                        </a>

                    </td>

                    <td class="text-muted">
                        ${platforms}
                    </td>

                    ${showViews ? `<td class="text-center text-muted">${Number(game.viewCount || 0).toLocaleString()}</td>` : ''}

                    <td class="text-end px-4 text-white">
                        ${date}
                    </td>

                </tr>
            `;
        }).join('');
}




// ============================================================
// AUTH-AWARE NAVIGATION
// ============================================================
function getLoginPath() {
    return window.location.pathname.includes('/pages/')
        ? 'login.html'
        : 'pages/login.html';
}

function getRegisterPath() {
    return window.location.pathname.includes('/pages/')
        ? 'register.html'
        : 'pages/register.html';
}

function getAdminPath() {
    return window.location.pathname.includes('/pages/')
        ? 'admin.html'
        : 'pages/admin.html';
}

async function initAuthNavigation() {
    const navs = document.querySelectorAll('[data-auth-nav]');
    if (!navs.length) return;

    const loginPath = getLoginPath();
    const registerPath = getRegisterPath();
    const adminPath = getAdminPath();

    navs.forEach(nav => {
        nav.innerHTML = `
            <a href="${loginPath}" class="btn btn-outline-light btn-sm">Log In</a>
            <a href="${registerPath}" class="btn btn-primary btn-sm">Sign Up</a>
        `;
    });

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include',
            cache: 'no-store'
        });

        if (!response.ok) {
            currentAuthUser = null;
            libraryStateLoaded = false;
            libraryState = { favoriteIds: new Set(), wishlistIds: new Set() };
            return;
        }

        const result = await response.json();
        const user = result.user;
        if (!user) return;

        currentAuthUser = user;
        await loadLibraryState();

        const username = escapeHTML(user.username || user.email || 'Account');
        const adminButton = user.role === 'admin'
            ? `<a href="${adminPath}" class="btn btn-outline-light btn-sm"><i class="bi bi-shield-lock me-1"></i>Admin</a>`
            : '';
        const myGamesPath = window.location.pathname.includes('/pages/') ? 'my-games.html' : 'pages/my-games.html';

        navs.forEach(nav => {
            nav.innerHTML = `
                <a href="${myGamesPath}" class="btn btn-outline-light btn-sm"><i class="bi bi-heart me-1"></i>My Games</a>
                <span class="auth-user-label d-none d-xl-inline" title="${username}">Hi, <strong>${username}</strong></span>
                ${adminButton}
                <button type="button" class="btn btn-outline-light btn-sm js-logout">Log Out</button>
            `;
        });

        document.querySelectorAll('.js-logout').forEach(button => {
            button.addEventListener('click', async () => {
                button.disabled = true;
                button.textContent = 'Logging out...';
                try {
                    await fetch(`${API_BASE}/auth/logout`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                } finally {
                    currentAuthUser = null;
                    libraryStateLoaded = false;
                    libraryState = { favoriteIds: new Set(), wishlistIds: new Set() };
                    window.location.href = window.location.pathname.includes('/pages/')
                        ? '../index.html'
                        : 'index.html';
                }
            });
        });
    } catch (error) {
        console.warn('Could not load authentication state:', error.message);
    }
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        // ----------------------------------------------------
        // Navbar shadow
        // ----------------------------------------------------

        const navbar =
            document.querySelector('.navbar');

        if (navbar) {

            const updateNavbarShadow = () => {

                navbar.style.boxShadow =
                    window.scrollY > 50
                        ? '0 4px 20px rgba(0,0,0,0.5)'
                        : 'none';
            };

            window.addEventListener(
                'scroll',
                updateNavbarShadow
            );

            updateNavbarShadow();
        }


        // ----------------------------------------------------
        // Bootstrap tooltips
        // ----------------------------------------------------

        if (
            typeof bootstrap !== 'undefined' &&
            typeof bootstrap.Tooltip === 'function'
        ) {

            const tooltipEls =
                document.querySelectorAll(
                    '[data-bs-toggle="tooltip"]'
                );

            tooltipEls.forEach(element => {
                new bootstrap.Tooltip(element);
            });
        }


        // ----------------------------------------------------
        // Global initialization
        // ----------------------------------------------------

        initPlatformNavLinks();
        initAuthNavigation();
        initLibraryActions();

        initPlatformCards();


        // ----------------------------------------------------
        // Home
        // ----------------------------------------------------

        loadFeaturedGame();

        loadTrendingGames();

        loadNewReleasesList();

        loadRecommendedList();


        // ----------------------------------------------------
        // Game Details
        // ----------------------------------------------------

        loadGameDetails();


        // ----------------------------------------------------
        // Browse
        // ----------------------------------------------------

        initBrowsePage();


        // ----------------------------------------------------
        // Leaderboards
        // ----------------------------------------------------

        loadLeaderboards();
    }
);