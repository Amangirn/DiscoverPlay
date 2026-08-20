const CONTACT_API = window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : 'https://discoverplay-backend-f1o7.onrender.com/api';
async function contactRequest(path, options = {}) {
    const response = await fetch(`${CONTACT_API}${path}`, {
        credentials: 'include',
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {})
        }
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.message || 'Could not send message.');
    return data;
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('contact-form');
    const email = document.getElementById('contact-email');
    const status = document.getElementById('contact-message-status');
    const submit = document.getElementById('contact-submit');
    if (!form) return;

    const user = await getCurrentUser();
    if (user && email && !email.value) email.value = user.email || '';

    form.addEventListener('submit', async event => {
        event.preventDefault();
        status.textContent = '';
        submit.disabled = true;
        try {
            const result = await contactRequest('/contact', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.value.trim(),
                    category: document.getElementById('contact-category').value,
                    message: document.getElementById('contact-message').value.trim()
                })
            });
            status.className = 'small text-success';
            status.textContent = result.message || 'Message sent.';
            form.reset();
            if (user && email) email.value = user.email || '';
        } catch (error) {
            status.className = 'small text-danger';
            status.textContent = error.message;
        } finally {
            submit.disabled = false;
        }
    });
});
