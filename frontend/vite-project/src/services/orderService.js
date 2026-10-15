import api from '../axiosCalls/axios';

// Every order and payment network call lives here, so the pages never touch
// axios directly and the Razorpay script is loaded in exactly one place.

// ---------------------------------------------------------------------------
// Razorpay Checkout script
// ---------------------------------------------------------------------------
// Razorpay's checkout.js is loaded from their CDN on demand rather than from
// index.html, so a visitor who never reaches checkout never downloads it.
//
// The <script> tag is only ever added once: concurrent callers share the same
// promise, so a double-click cannot inject two copies of the SDK.

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be loaded in a browser'));
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;

    script.onload = () => resolve(true);

    script.onerror = () => {
      // Reset so a later attempt can retry after a network blip, instead of
      // caching the failure for the rest of the session.
      scriptPromise = null;
      script.remove();
      reject(new Error('Could not load the payment gateway. Check your connection.'));
    };

    document.body.appendChild(script);
  });

  return scriptPromise;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

// Opens a payment order on the server for the current cart. The server decides
// the amount; this call sends only the shipping address.
export const createPaymentOrder = async (shippingAddress) => {
  const response = await api.post('/orders/create-payment-order', { shippingAddress });
  return response.data;
};

// Sends Razorpay's three values back for verification. Nothing here is trusted
// by the server - the signature is checked before the order is marked paid.
export const verifyPayment = async (payload) => {
  const response = await api.post('/orders/verify-payment', payload);
  return response.data;
};

export const getOrders = async () => {
  const response = await api.get('/orders');
  return response.data.orders || [];
};

export const getOrderById = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data.order;
};

// ---------------------------------------------------------------------------
// Checkout modal
// ---------------------------------------------------------------------------

// Opens Razorpay's Standard Checkout and resolves with the payment response
// ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }).
//
// It resolves on Razorpay's success callback only. That callback is a UI signal
// and proves nothing on its own - the caller must still send the response to
// the server, which is where the signature is actually verified.
//
// Closing the modal rejects with `dismissed: true`, so the caller can stay
// quiet about a customer who simply changed their mind.
export const openRazorpayCheckout = async ({
  key,
  amount,
  currency,
  razorpayOrderId,
  shopKartOrderId,
  prefill,
}) => {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('The payment gateway failed to load. Please try again.');
  }

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key,

      // Razorpay expects the smallest currency unit, and this value came from
      // the server's own Razorpay order - the browser never computes a price.
      amount,
      currency: currency || 'INR',

      name: 'ShopKart',
      description: `Order ${String(shopKartOrderId).slice(-8).toUpperCase()}`,

      // Ties this modal to the order the server created, so the signature that
      // comes back is for that amount and no other.
      order_id: razorpayOrderId,

      prefill: {
        name: prefill?.name || '',
        email: prefill?.email || '',
        contact: prefill?.contact || '',
      },

      theme: { color: '#2563eb' },

      handler: (response) => resolve(response),

      modal: {
        ondismiss: () => {
          const error = new Error('Payment cancelled.');
          error.dismissed = true;
          reject(error);
        },
      },
    });

    // A failure raised by Razorpay itself (a declined card, a network drop)
    // arrives here rather than through the promise.
    checkout.on('payment.failed', (response) => {
      const error = new Error(
        response?.error?.description || 'The payment could not be completed.'
      );
      error.paymentFailed = true;
      reject(error);
    });

    checkout.open();
  });
};

export { getErrorMessage } from '../utils/helpers';
