import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    // Stores Product *references*, not copies of the product documents.
    // The Product collection stays the single source of truth for price,
    // stock and image, so a price change never leaves stale wishlist data.
    wishlist: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            }
        ],
        default: []
    },

    // A cart line needs one thing a wishlist entry does not: how many.
    // Each line references the Product and carries its own quantity, so
    // "Keyboard x3" is one row rather than three identical rows.
    cart: {
        type: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },
                quantity: {
                    type: Number,
                    default: 1,
                    min: [1, "Quantity must be at least 1"]
                }
            }
        ],
        default: []
    }
}, {
    timestamps: true
});


const User = mongoose.model('User', userSchema)

export default User