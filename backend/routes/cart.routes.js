import express from 'express'
import {
    addToCart,
    getCart,
    removeFromCart,
    updateCartItem
} from '../controllers/cart.controller.js'
import isAuthenticated from '../middlewares/authMiddleware.js'

const cartRoutes = express.Router()

// A cart belongs to a user, so every route here requires a verified token.
cartRoutes.use(isAuthenticated)

cartRoutes.get('/', getCart)
cartRoutes.post('/:productId', addToCart)
cartRoutes.patch('/:productId', updateCartItem)
cartRoutes.delete('/:productId', removeFromCart)

export default cartRoutes
