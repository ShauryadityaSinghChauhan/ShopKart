import mongoose from "mongoose"
import User from "../models/user.model.js"
import Product from "../models/product.model.js"

// Fields the cart needs to draw a line and price it. `stock` is included so the
// client can bound its +/- controls with the same number the server validates
// against, and price is read live on every request rather than copied into the
// cart - a price change must show up immediately.
const CART_PRODUCT_FIELDS = "name price category image stock"

// Loading the user with a populated cart is needed by every handler, so the
// shape lives in one place. The cart is returned populated so the client never
// has to resolve ids itself.
const findUserWithCart = (userId) =>
    User.findById(userId).populate({
        path: "cart.product",
        select: CART_PRODUCT_FIELDS
    })

// Lines whose product has been deleted since it was added. populate() leaves a
// null behind; those are dropped so the client never renders a broken row.
const validLines = (cart = []) =>
    cart.filter((line) => line && line.product)

// Response shape shared by every cart endpoint, so the client can replace its
// cart state wholesale from any mutation's response.
const cartResponse = (res, status, message, cart) => {
    const lines = validLines(cart)

    return res.status(status).json({
        success: true,
        message,
        count: lines.reduce((total, line) => total + line.quantity, 0),
        cart: lines
    })
}

// Finds the line for a product, comparing ids as strings so it works whether
// the entry holds an ObjectId or (after populate) a document.
const findLine = (cart, productId) =>
    cart.find((line) => String(line.product?._id ?? line.product).toLowerCase() === String(productId).toLowerCase())

// POST /cart/:productId
// First add creates the line at quantity 1; adding again increments it. Both
// paths are checked against the product's current stock before saving.
export const addToCart = async (req, res) => {
    try {
        const { productId } = req.params

        // req.user comes from the auth middleware - the client never sends a userId.
        const user = req.user

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        // Stock is read fresh here, not from anything the client sent.
        const product = await Product.findById(productId).select("_id stock")

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" })
        }

        const line = findLine(user.cart, productId)
        const nextQuantity = line ? line.quantity + 1 : 1

        // The business rule: never let the cart hold more than exists.
        if (nextQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: product.stock === 0
                    ? "Product is out of stock"
                    : `Only ${product.stock} unit(s) available`
            })
        }

        if (line) {
            line.quantity = nextQuantity
        } else {
            user.cart.push({ product: product._id, quantity: 1 })
        }

        await user.save()

        const populated = await findUserWithCart(user._id)

        return cartResponse(res, 200, "Cart updated", populated.cart)

    } catch (error) {
        console.log("ADD TO CART ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// GET /cart
export const getCart = async (req, res) => {
    try {
        // No GET /cart/:userId exists - the token decides whose cart this is.
        const user = await findUserWithCart(req.user._id)

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        return cartResponse(res, 200, "Cart fetched", user.cart)

    } catch (error) {
        console.log("GET CART ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// PATCH /cart/:productId   body: { quantity }
export const updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params
        const { quantity } = req.body

        const user = req.user

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        // Number() would turn "" and null into 0 and true into 1, so the raw
        // value is checked for type before it is trusted as a quantity.
        if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
            return res.status(400).json({ success: false, message: "Quantity must be a number" })
        }

        // Quantities are whole units; 2.5 units is not a thing you can ship.
        if (!Number.isInteger(quantity)) {
            return res.status(400).json({ success: false, message: "Quantity must be a whole number" })
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1. Use remove to delete the item."
            })
        }

        const product = await Product.findById(productId).select("_id stock")

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" })
        }

        const line = findLine(user.cart, productId)

        if (!line) {
            return res.status(404).json({ success: false, message: "Product not in cart" })
        }

        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} unit(s) available`
            })
        }

        line.quantity = quantity
        await user.save()

        const populated = await findUserWithCart(user._id)

        return cartResponse(res, 200, "Cart updated", populated.cart)

    } catch (error) {
        console.log("UPDATE CART ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}


export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params
        const user = req.user

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        const line = findLine(user.cart, productId)

        if (!line) {
            return res.status(404).json({ success: false, message: "Product not in cart" })
        }

        user.cart.pull({ _id: line._id })
        await user.save()

        const populated = await findUserWithCart(user._id)

        return cartResponse(res, 200, "Product removed from cart", populated.cart)

    } catch (error) {
        console.log("REMOVE FROM CART ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}
