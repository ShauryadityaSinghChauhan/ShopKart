import mongoose from "mongoose"
import User from "../models/user.model.js"
import Product from "../models/product.model.js"
const WISHLIST_PRODUCT_FIELDS = "name price category image stock"

const findUserWithWishlist = (userId) =>
    User.findById(userId).populate({
        path: "wishlist",
        select: WISHLIST_PRODUCT_FIELDS
    })

const withoutMissingProducts = (wishlist = []) => wishlist.filter(Boolean)

const entryId = (entry) => String(entry?._id ?? entry).toLowerCase()

const isProductSaved = (wishlist, productId) =>
    wishlist.some((entry) => entryId(entry) === String(productId).toLowerCase())

// POST /wishlist/:productId
export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params

        // req.user comes from the auth middleware - the client never sends a userId.
        const user = req.user

        // An id that is not even ObjectId-shaped must not reach the query,
        // otherwise Mongoose throws a CastError and we would answer 500.
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        const product = await Product.findById(productId).select("_id")

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" })
        }

        // Compare as ids so it works whether the entry is an ObjectId
        // or (after populate) a document.
        const alreadySaved = isProductSaved(user.wishlist, productId)

        if (alreadySaved) {
            return res.status(409).json({ success: false, message: "Product already in wishlist" })
        }
        user.wishlist.push(product._id)
        await user.save()

        return res.status(201).json({
            success: true,
            message: "Product added to wishlist",
            count: user.wishlist.length
        })

    } catch (error) {
        console.log("ADD TO WISHLIST ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}


export const getWishlist = async (req, res) => {
    try {
        const user = await findUserWithWishlist(req.user._id)

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        const wishlist = withoutMissingProducts(user.wishlist)

        return res.status(200).json({
            success: true,
            count: wishlist.length,
            wishlist
        })

    } catch (error) {
        console.log("GET WISHLIST ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// DELETE /wishlist/:productId
export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params
        const user = req.user

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        const alreadySaved = isProductSaved(user.wishlist, productId)

        // Removing something that was never saved is a client mistake, not a
        // silent no-op, so it reports 404.
        if (!alreadySaved) {
            return res.status(404).json({ success: false, message: "Product not in wishlist" })
        }

        user.wishlist.pull(productId)
        await user.save()

        return res.status(200).json({
            success: true,
            message: "Product removed from wishlist",
            count: user.wishlist.length
        })

    } catch (error) {
        console.log("REMOVE FROM WISHLIST ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// PATCH /wishlist/:productId/toggle  (bonus)
// One button, one endpoint: saves the product if it is not saved, removes it
// if it already is. The response always states the resulting state.
export const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.params
        const user = req.user

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        const isSaved = isProductSaved(user.wishlist, productId)

        if (isSaved) {
            user.wishlist.pull(productId)
            await user.save()

            return res.status(200).json({
                success: true,
                saved: false,
                message: "Product removed from wishlist",
                count: user.wishlist.length
            })
        }

        // Only a real product may be added, so the toggle validates it too.
        const product = await Product.findById(productId).select("_id")

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" })
        }

        user.wishlist.push(product._id)
        await user.save()

        return res.status(201).json({
            success: true,
            saved: true,
            message: "Product added to wishlist",
            count: user.wishlist.length
        })

    } catch (error) {
        console.log("TOGGLE WISHLIST ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// GET /wishlist/ids  (bonus)
// A light endpoint for the catalogue page: it only needs the ids so it can
// render the correct button state, not the full product documents.
export const getWishlistIds = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("wishlist")

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        const ids = user.wishlist.map(entryId)

        return res.status(200).json({
            success: true,
            count: ids.length,
            productIds: ids
        })

    } catch (error) {
        console.log("GET WISHLIST IDS ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}
