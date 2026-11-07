/**
 * DiscoverPlay - Support Developer payment integration.
 * The contribution amount is fixed and enforced by the backend (₹99).
 */

const isLocalDiscoverPlay = window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const SUPPORT_API_BASE = isLocalDiscoverPlay
    ? 'http://localhost:5000/api'
    : 'https://discoverplay-payments-api.onrender.com/api';

let razorpayCheckoutPromise = null;

function loadRazorpayCheckout() {
    if (window.Razorpay) return Promise.resolve();
    if (razorpayCheckoutPromise) return razorpayCheckoutPromise;

    razorpayCheckoutPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check your internet connection.'));
        document.head.appendChild(script);
    });

    return razorpayCheckoutPromise;
}

async function startDiscoverPlaySupport(button) {
    if (!button || button.disabled) return;

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Preparing payment…';

    try {
        await loadRazorpayCheckout();

        let orderResponse;
        try {
            orderResponse = await fetch(`${SUPPORT_API_BASE}/payments/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (networkError) {
            throw new Error(
                'Cannot reach the DiscoverPlay payment server. The backend may be offline, not yet redeployed with the payment API, or blocking this website through CORS. Please try again after the backend is deployed.'
            );
        }

        const orderData = await orderResponse.json().catch(() => ({}));
        if (!orderResponse.ok) {
            throw new Error(orderData.message || 'Unable to start the payment. Please try again later.');
        }

        const checkout = new window.Razorpay({
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: orderData.name,
            description: 'Support the developer of DiscoverPlay',
            order_id: orderData.orderId,
            theme: { color: '#6c63ff' },
            handler: async function (paymentResponse) {
                button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Verifying payment…';

                try {
                    let verifyResponse;
                    try {
                        verifyResponse = await fetch(`${SUPPORT_API_BASE}/payments/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(paymentResponse)
                        });
                    } catch (networkError) {
                        throw new Error('Payment was submitted, but DiscoverPlay could not reach its server to verify it. Do not pay again immediately. Check your Razorpay test dashboard and contact the developer with the payment ID if needed.');
                    }
                    const verifyData = await verifyResponse.json().catch(() => ({}));

                    if (!verifyResponse.ok || !verifyData.success) {
                        throw new Error(verifyData.message || 'We could not verify this payment yet.');
                    }

                    window.alert('Thank you for supporting DiscoverPlay! ❤️');
                } catch (error) {
                    console.error('DiscoverPlay payment verification error:', error);
                    window.alert(`${error.message}\n\nIf money was deducted, please contact us with your Razorpay payment ID: ${paymentResponse.razorpay_payment_id}`);
                } finally {
                    button.disabled = false;
                    button.removeAttribute('aria-busy');
                    button.innerHTML = originalHTML;
                }
            },
            modal: {
                ondismiss: function () {
                    button.disabled = false;
                    button.removeAttribute('aria-busy');
                    button.innerHTML = originalHTML;
                }
            }
        });

        checkout.on('payment.failed', function (event) {
            const message = event?.error?.description || 'Payment could not be completed.';
            window.alert(`Payment failed: ${message}`);
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.innerHTML = originalHTML;
        });

        checkout.open();
    } catch (error) {
        console.error('DiscoverPlay support payment error:', error);
        window.alert(error.message || 'Unable to open payment checkout.');
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = originalHTML;
    }
}

// Payment API base must match the backend service deployed on Render.
// Add a compact floating support control on pages that load this script.
// Keeping it here ensures the button stays consistent across the public site.
function addDiscoverPlayFloatingSupportButton() {
    if (document.querySelector('[data-support-developer]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dp-support-float';
    button.setAttribute('data-support-developer', '');
    button.setAttribute('aria-label', 'Support DiscoverPlay developer with ₹99');
    button.setAttribute('title', 'Support Developer · ₹99');
    button.innerHTML = '<i class="bi bi-heart-fill" aria-hidden="true"></i><span class="dp-support-float__tooltip" aria-hidden="true">Support Developer · ₹99</span>';
    document.body.appendChild(button);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDiscoverPlayFloatingSupportButton, { once: true });
} else {
    addDiscoverPlayFloatingSupportButton();
}

document.addEventListener('click', event => {
    const button = event.target.closest('[data-support-developer]');
    if (!button) return;

    event.preventDefault();
    startDiscoverPlaySupport(button);
});
