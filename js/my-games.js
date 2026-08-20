const LIBRARY_API = window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : 'https://discoverplay-backend-f1o7.onrender.com/api';
function libraryCard(game) {
    const cover = safeURL(game.coverImage, DEFAULT_COVER);
    const title = escapeHTML(game.title || 'Untitled');
    const genre = escapeHTML(game.genre || 'Unknown');
    const id = encodeURIComponent(game._id || '');
    return `<div class="col">
        <div class="game-card h-100">
            <a href="game-details.html?id=${id}" class="text-decoration-none">
                <img src="${cover}" class="card-img-top" alt="${title}" onerror="this.src='${escapeHTML(DEFAULT_COVER)}'">
            </a>
            <div class="card-body">
                <span class="genre-badge">${genre}</span>
                <h5 class="card-title">${title}</h5>
                <a href="game-details.html?id=${id}" class="btn btn-primary w-100 mt-auto">View Details</a>
            </div>
        </div>
    </div>`;
}

function libraryEmpty(icon, title, body) {
    return `<div class="col-12"><div class="dp-empty"><i class="bi ${icon} fs-1 mb-3"></i><h5>${title}</h5><p>${body}</p></div></div>`;
}

async function loadLibrary() {
    const favoritesGrid = document.getElementById('favorites-grid');
    const wishlistGrid = document.getElementById('wishlist-grid');
    if (!favoritesGrid || !wishlistGrid) return;

    try {
        const response = await fetch(`${LIBRARY_API}/users/library`, { credentials: 'include', cache: 'no-store' });
        if (response.status === 401) {
            const next = encodeURIComponent('pages/my-games.html');
            window.location.href = `/pages/login.html?redirect=${next}`;
            return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load library.');

        const favorites = result.data?.favorites || [];
        const wishlist = result.data?.wishlist || [];

        favoritesGrid.innerHTML = favorites.length
            ? favorites.map(libraryCard).join('')
            : libraryEmpty('bi-heart', 'No favorites yet', 'Open a game and tap the heart to keep it here.');

        wishlistGrid.innerHTML = wishlist.length
            ? wishlist.map(libraryCard).join('')
            : libraryEmpty('bi-bookmark-heart', 'Your wishlist is empty', 'Save games you want to remember and play later.');
    } catch (error) {
        console.error('Library load error:', error);
        favoritesGrid.innerHTML = libraryEmpty('bi-exclamation-triangle', 'Could not load favorites', 'Please try again.');
        wishlistGrid.innerHTML = libraryEmpty('bi-exclamation-triangle', 'Could not load wishlist', 'Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', loadLibrary);
