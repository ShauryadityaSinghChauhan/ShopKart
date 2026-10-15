import mongoose from "mongoose"
import Product from "../models/product.model.js"


const SORT_OPTIONS = {
    price_asc: { price: 1 },
    price_desc: { price: -1 }
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")


const handleValidationError = (res, error) => {
    if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message)
        return res.status(400).json({
            success: false,
            message: errors.join(", "),
            errors
        })
    }

    if (error.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `Invalid value provided for ${error.path}`
        })
    }

    return null
}

// POST /products
export const createProduct = async (req, res) => {
    try {
        // The schema is the single source of truth for validation, so
        // missing / invalid fields all fall through to the 400 below.
        const product = await Product.create(req.body)

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        })

    } catch (error) {
        const validationResponse = handleValidationError(res, error)
        if (validationResponse) return validationResponse

        console.log("CREATE PRODUCT ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

// GET /products?search=&category=&sort=
export const getProducts = async (req, res) => {
    try {
        const { search, category, sort } = req.query

        // Build the query dynamically instead of hardcoding a filter per case
        const filter = {}

        if (search && search.trim()) {
            filter.name = { $regex: escapeRegex(search.trim()), $options: "i" }
        }

        if (category && category.trim()) {
            filter.category = { $regex: `^${escapeRegex(category.trim())}$`, $options: "i" }
        }

        const sortOption = SORT_OPTIONS[sort] || { createdAt: -1 }


        const products = await Product.find(filter)
            .select("-description -__v")
            .sort(sortOption)

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        })

    } catch (error) {
        console.log("GET PRODUCTS ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}


export const getProductById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" })
        }

        const product = await Product.findById(id).select("-__v")

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" })
        }

        return res.status(200).json({ success: true, product })

    } catch (error) {
        console.log("GET PRODUCT ERROR:", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}
