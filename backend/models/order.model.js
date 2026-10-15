import mongoose from "mongoose";

// An Order is a *historical record*, not a live view of the catalogue.
//
// The Cart deliberately holds references so it always shows today's price.
// An Order does the opposite: it copies the product's name, price and image at
// the moment of purchase, because what the customer paid must never change
// when the shop later edits the product.
//
// That is why `name`, `price` and `image` sit inside `items` alongside the
// reference. The reference keeps the link back to the catalogue for things
// like "buy this again"; the copied fields are what the order actually means.
const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        // --- snapshot: copied at purchase time, never refreshed ---
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"]
        },
        image: {
            type: String
        }
    },
    { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        addressLine1: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        items: {
            type: [orderItemSchema],
            validate: {
                validator: (items) => items.length > 0,
                message: "An order must contain at least one item"
            }
        },

        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },

        // Calculated on the server from live product prices. The client's idea
        // of the total is never read.
        totalAmount: {
            type: Number,
            required: true,
            min: [0, "Total cannot be negative"]
        },

        paymentStatus: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED"],
            default: "PENDING"
        },

        status: {
            type: String,
            enum: [
                "PENDING_PAYMENT",
                "PLACED",
                "CONFIRMED",
                "SHIPPED",
                "DELIVERED"
            ],
            default: "PENDING_PAYMENT"
        },

        // Identifiers only. Card details are never seen by this application -
        // Razorpay's Checkout collects them and returns opaque ids.
        // The Key Secret is never stored here or anywhere in the database.
        razorpayOrderId: String,
        razorpayPaymentId: String
    },
    { timestamps: true }
);

// The My Orders page always asks for one user's orders, newest first.
orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
