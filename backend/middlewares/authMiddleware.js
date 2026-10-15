import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'

// The browser client sends the JWT as an httpOnly cookie, while API tools such
// as Postman send it as "Authorization: Bearer <token>". Both are accepted so
// the wishlist endpoints can be exercised either way.
const extractToken = (req) => {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7).trim()
    }

    return req.cookies?.token
}

const isAuthenticated = async (req, res, next) => {
    try {
        const token = extractToken(req)

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized" })
        }

        const decoded = jwt.verify(token, process.env.jwt_secret)
        const user = await User.findById(decoded.userId)

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" })
        }

        // The client never tells us who it is - the verified token does.
        req.user = user
        next()
    } catch (error) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
    }
}

export default isAuthenticated