import crypto from "crypto"
import mongoose from "mongoose"
import Order from "../models/order.model.js"
import Product from "../models/product.model.js"
import User from "../models/user.model.js"
import getRazorpay from "../config/razorpay.js"

// ---------------------------------------------------------------------------
// Shipping address validation
// ---------------------------------------------------------------------------
// The browser validates the form too, using the same rules, so the user gets
// instant feedback. This copy is the one that matters: an HTTP client can post
// anything, and a shop that ships to an empty address because the client
// "already checked" has no one to blame but itself.

const REQUIRED_ADDRESS_FIELDS = [
    "fullName",
    "phone",
    "addressLine1",
    "city",
    "state",
    "pincode"
]

const FIELD_LABELS = {
    fullName: "Full name",
    phone: "Phone",
    addressLine1: "Address",
    city: "City",
    state: "State",
    pincode: "Pincode"
}

// Accepts 9876543210, +91 9876543210, 098765-43210, etc. Strips the country
// code and separators, then applies the Indian mobile rule: ten digits, first
// digit 6-9. A landline or a nine-digit number is not a deliverable contact.
export const normalisePhone = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "")
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2)
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1)
    return digits
}

const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalisePhone(value))

const isValidPincode = (value) => /^\d{6}$/.test(String(value ?? "").trim())

// Returns a { field: message } map so the frontend can attach each error to
// the input that caused it rather than showing one vague banner.
const validateShippingAddress = (address) => {
    const errors = {}

    if (!address || typeof address !== "object") {
        return { shippingAddress: "Shipping address is required" }
    }

    for (const field of REQUIRED_ADDRESS_FIELDS) {
        const value = address[field]
        // trim() before the emptiness test, so a field holding only spaces is
        // rejected rather than saved as a "valid-looking" blank.
        if (typeof value !== "string" || value.trim() === "") {
            errors[field] = `${FIELD_LABELS[field]} is required`
        }
    }

    // Only run the format checks when the field is actually present, otherwise
    // an empty phone would report two errors for one problem.
    if (!errors.phone && !isValidPhone(address.phone)) {
        errors.phone = "Enter a valid 10-digit mobile number"
    }

    if (!errors.pincode && !isValidPincode(address.pincode)) {
        errors.pincode = "Pincode must contain 6 digits"
    }

    return errors
}

// The address as it will be stored: trimmed, phone normalised to ten digits.
const cleanShippingAddress = (address) => ({
    fullName: address.fullName.trim(),
    phone: normalisePhone(address.phone),
    addressLine1: address.addressLine1.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim()
})

// ---------------------------------------------------------------------------
// POST /orders/create-payment-order
// ---------------------------------------------------------------------------
// Validates the cart, snapshots it into a pending order, then asks Razorpay to
// open an order for the server-calculated amount.
//
// Deliberately does NOT clear the cart: at this point nothing has been paid.

export const createPaymentOrder = async (req, res) => {
    try {
        // Resolve the client before anything is written.
        //
        // Both a missing package and a missing key pair are configuration
        // problems, not failed orders, so they answer 503 - and because this
        // runs before the order is created, there is nothing to clean up.
        let razorpay;

        try {
            razorpay = await getRazorpay();
        } catch (error) {
            return res.status(503).json({ success: false, message: error.message });
        }

        const addressErrors = validateShippingAddress(req.body?.shippingAddress)

        if (Object.keys(addressErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the highlighted shipping details",
                errors: addressErrors
            })
        }

        // req.user comes from the auth middleware. Nothing about who is
        // ordering, or what it costs, is taken from the request body.
        const user = await User.findById(req.user._id)

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" })
        }

        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty. Add a product before checking out."
            })
        }

        // --- Re-read every product, live -------------------------------------
        // The cart held ids and quantities; prices and stock are read now, so
        // an order can never be built from a stale catalogue snapshot.
        const productIds = user.cart.map((line) => line.product)
        const products = await Product.find({ _id: { $in: productIds } })
        const productById = new Map(products.map((p) => [String(p._id), p]))

        const items = []
        let totalAmount = 0

        for (const line of user.cart) {
            const product = productById.get(String(line.product))

            // Deleted since it was added to the cart. Rejected rather than
            // silently skipped, so the customer is not charged for a basket
            // they did not choose.
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: "A product in your cart is no longer available. Please remove it and try again."
                })
            }

            // Stock may have dropped since the item was added.
            if (line.quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: product.stock === 0
                        ? `Insufficient stock for ${product.name}. It is now out of stock.`
                        : `Insufficient stock for ${product.name}. Only ${product.stock} left.`
                })
            }

            // The snapshot: what was bought, at what price, as of right now.
            items.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: line.quantity,
                image: product.image
            })

            // The server owns pricing. Any totalAmount in the request body is
            // ignored entirely - it is never read.
            totalAmount += product.price * line.quantity
        }

        const order = await Order.create({
            user: user._id,
            items,
            shippingAddress: cleanShippingAddress(req.body.shippingAddress),
            totalAmount,
            paymentStatus: "PENDING",
            status: "PENDING_PAYMENT"
        })

        // --- Ask Razorpay to open an order -----------------------------------
        let razorpayOrder

        try {
            razorpayOrder = await razorpay.orders.create({
                // Razorpay works in the smallest currency unit. For INR that is
                // paise: rupees * 100. Rounding guards against a float like
                // 7496.999999 turning into 749699.
                amount: Math.round(totalAmount * 100),
                currency: "INR",
                // Our own id, so a Razorpay payment can always be traced back
                // to the order that produced it.
                receipt: order._id.toString()
            })
        } catch (error) {
            // Leaving a PENDING_PAYMENT order behind for a payment that was
            // never even offered would clutter My Orders with phantom rows.
            await Order.findByIdAndDelete(order._id)

            console.error("RAZORPAY ORDER ERROR:", error)
            return res.status(502).json({
                success: false,
                message: "Could not reach the payment gateway. Please try again."
            })
        }

        order.razorpayOrderId = razorpayOrder.id
        await order.save()

        return res.status(201).json({
            success: true,
            message: "Payment order created",
            shopKartOrderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            // The Key ID is public - it identifies the account and is meant to
            // be in the browser. The Key Secret is its password and never
            // leaves this process.
            key: process.env.RAZORPAY_KEY_ID
        })

    } catch (error) {
        console.log("CREATE PAYMENT ORDER ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// ---------------------------------------------------------------------------
// POST /orders/verify-payment
// ---------------------------------------------------------------------------
// The browser's success callback proves nothing - it runs on the customer's
// machine, where anything can be forged. The signature is the proof: it can
// only be produced by someone holding the Key Secret, which is Razorpay and
// this server.

export const verifyPayment = async (req, res) => {
    try {
        const {
            shopKartOrderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body || {}

        if (!shopKartOrderId || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification details are incomplete"
            })
        }

        if (!mongoose.Types.ObjectId.isValid(shopKartOrderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID" })
        }

        const order = await Order.findById(shopKartOrderId)

        // Reporting 404 for someone else's order rather than 403 keeps the
        // endpoint from confirming that an id exists at all.
        if (!order || String(order.user) !== String(req.user._id)) {
            return res.status(404).json({ success: false, message: "Order not found" })
        }

        // Razorpay can deliver the same confirmation twice (a retry, a double
        // click). The cart is already empty by then, so treat it as success.
        if (order.paymentStatus === "PAID") {
            return res.status(200).json({
                success: true,
                message: "Payment already verified",
                order
            })
        }

        // The order id used for the HMAC comes from OUR database, not from the
        // request. A browser-supplied id would let an attacker pair a real
        // signature with a different order.
        const body = `${order.razorpayOrderId}|${razorpay_payment_id}`

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex")

        // timingSafeEqual instead of === so the comparison cannot be timed to
        // discover the expected signature one character at a time. It requires
        // equal lengths, hence the guard.
        const expected = Buffer.from(expectedSignature)
        const received = Buffer.from(String(razorpay_signature))
        const signatureMatches =
            expected.length === received.length && crypto.timingSafeEqual(expected, received)

        if (!signatureMatches) {
            // Left PENDING and the cart is left alone. A forged signature must
            // not be able to destroy someone's basket or mark an order paid.
            order.paymentStatus = "FAILED"
            await order.save()

            return res.status(400).json({
                success: false,
                message: "Invalid payment signature. Your cart has not been cleared."
            })
        }

        // --- Verified. Only now does anything become permanent. --------------
        order.paymentStatus = "PAID"
        order.status = "PLACED"
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()

        // The cart is cleared here and nowhere else: after the money is
        // confirmed, never before.
        const user = await User.findById(req.user._id)

        if (user) {
            user.cart = []
            await user.save()
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified and order placed",
            order
        })

    } catch (error) {
        console.log("VERIFY PAYMENT ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// ---------------------------------------------------------------------------
// GET /orders
// ---------------------------------------------------------------------------
// Scoped by the token, never by a query parameter - there is no way to ask for
// someone else's orders because the endpoint accepts no user identifier.
export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        })

    } catch (error) {
        console.log("GET ORDERS ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// ---------------------------------------------------------------------------
// GET /orders/:id
// ---------------------------------------------------------------------------
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid order ID" })
        }

        const order = await Order.findById(id)

        // Ownership is checked in the same breath as existence, and both
        // failures answer 404. Guessing an id tells the guesser nothing: they
        // cannot distinguish "no such order" from "not yours".
        if (!order || String(order.user) !== String(req.user._id)) {
            return res.status(404).json({ success: false, message: "Order not found" })
        }

        return res.status(200).json({ success: true, order })

    } catch (error) {
        console.log("GET ORDER ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}
