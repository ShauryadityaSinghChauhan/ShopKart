import express from 'express'
import {
    addToWishlist,
    getWishlist,
    getWishlistIds,
    removeFromWishlist,
    toggleWishlist
} from '../controllers/wishlist.controller.js'
import isAuthenticated from '../middlewares/authMiddleware.js'

const wishlistRoutes = express.Router()

// Every route in this file is protected: a wishlist belongs to a user, and
// only an authenticated request can name that user.
wishlistRoutes.use(isAuthenticated)

// "/ids" is declared before "/:productId" so it is not swallowed by the param route.
wishlistRoutes.get('/ids', getWishlistIds)

wishlistRoutes.get('/', getWishlist)
wishlistRoutes.post('/:productId', addToWishlist)
wishlistRoutes.delete('/:productId', removeFromWishlist)
wishlistRoutes.patch('/:productId/toggle', toggleWishlist)

export default wishlistRoutes
