import express from 'express'
import { registerUser, loginUser, getUser, logoutUser } from '../controllers/user.controllers.js'
import isAuthenticated from '../middlewares/authMiddleware.js'

const userRoutes = express.Router()

userRoutes.post('/register', registerUser)
userRoutes.post('/login', loginUser)
userRoutes.get('/me', isAuthenticated, getUser)
userRoutes.post('/logout', isAuthenticated, logoutUser)

export default userRoutes