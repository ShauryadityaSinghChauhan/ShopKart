// The Razorpay client is resolved lazily, and the package itself is imported
// dynamically.
//
// Both of those are load-bearing. A top-level `import Razorpay from "razorpay"`
// is evaluated when this module is first loaded, and index.js loads its routes
// at the top - so an uninstalled package (or, at that same moment, unread .env
// keys) would throw during startup and bring down the entire server, including
// the product, cart and wishlist routes that have nothing to do with payments.
//
// Deferring both means the server always boots. Only the checkout endpoints
// report the problem, and they report it precisely.

let client = null;
let RazorpayConstructor = null;

export const isRazorpayConfigured = () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Raised when the package is missing so the controller can answer 503 with an
// actionable message rather than a generic gateway error.
const getConstructor = async () => {
    if (RazorpayConstructor) return RazorpayConstructor;

    try {
        const module = await import("razorpay");
        RazorpayConstructor = module.default;
    } catch (error) {
        throw new Error(
            "The razorpay package is not installed. Run `npm install razorpay` in the backend folder."
        );
    }

    return RazorpayConstructor;
};

// Async, because the constructor may still need to be imported.
const getRazorpay = async () => {
    if (!isRazorpayConfigured()) {
        throw new Error(
            "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env"
        );
    }

    if (!client) {
        const Razorpay = await getConstructor();

        client = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }

    return client;
};

export default getRazorpay;
