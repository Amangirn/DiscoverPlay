/** DiscoverPlay authentication helpers. */
const AUTH_API_BASE = '/api';

async function authRequest(path, options = {}) {
    const response = await fetch(`${AUTH_API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {})
        }
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
    }
    return data;
}

async function getCurrentUser() {
    try {
        const result = await authRequest('/auth/me');
        return result.user || null;
    } catch (_) {
        return null;
    }
}

async function requireAdmin() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html?redirect=admin.html';
        return null;
    }
    return user;
}

async function logoutUser() {
    try {
        await authRequest('/auth/logout', { method: 'POST' });
    } finally {
        window.location.href = '../index.html';
    }
}


function initPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        let wrapper = input.closest('.password-input-wrapper');

        // Wrap the field if it is not already wrapped.
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'password-input-wrapper position-relative';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        // Remove any stale/duplicate buttons so every password field has exactly one.
        wrapper.querySelectorAll('.password-toggle').forEach(button => button.remove());

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'password-toggle btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted';
        button.setAttribute('aria-label', 'Show password');
        button.setAttribute('title', 'Show password');
        button.setAttribute('tabindex', '0');
        button.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i>';
        button.style.textDecoration = 'none';
        button.style.zIndex = '10';

        button.addEventListener('click', () => {
            const isVisible = input.type === 'text';
            input.type = isVisible ? 'password' : 'text';
            button.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
            button.setAttribute('title', isVisible ? 'Show password' : 'Hide password');
            button.innerHTML = `<i class="bi ${isVisible ? 'bi-eye' : 'bi-eye-slash'}" aria-hidden="true"></i>`;
        });

        wrapper.appendChild(button);
        input.style.paddingRight = '3rem';
        input.dataset.toggleReady = 'true';
    });
}

document.addEventListener('DOMContentLoaded', initPasswordToggles);
