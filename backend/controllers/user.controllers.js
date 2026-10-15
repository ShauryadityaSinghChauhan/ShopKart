import User from "../models/user.model.js"
import bcrypt from 'bcrypt'
import genToken from "../utils/genToken.js"

// The `web` and `api` services share one Vercel domain, so this cookie is
// same-origin in production and SameSite=Lax is enough - nothing has to be
// relaxed to SameSite=None. `secure` is on wherever the site is served over
// HTTPS; it stays off for plain http://localhost, where a secure cookie would
// simply be discarded by the browser.
const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production',
}

export const registerUser = async (req, res) => {
    const { fullName, email, password, phone } = req.body

    try {
        if (!fullName || !password || !email || !phone) {
            return res.status(400).json({ message: 'All fields are Required!' })
        }

        const E = await User.findOne({ email })

        if (E) {
            return res.status(409).json({ message: 'Email must be unique' })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password too short' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await User.create({ fullName, email, password: hashedPassword, phone })

        newUser.password = undefined

        res.status(200).json({
            success: true,
            message: "customer registered successfully",
            customer: newUser
        })

    } catch (error) {
        console.log("REGISTER ERROR:", error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const loginUser = async (req, res) => {
    console.log("LOGIN ROUTE HIT")

    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        const exists = await User.findOne({ email })

        if (!exists) {
            return res.status(401).json({ message: "email not found" })
        }

        const correctPassword = bcrypt.compareSync(password, exists.password)

        if (!correctPassword) {
            return res.status(401).json({ message: "details are incorrect" })
        }

        const token = genToken(exists._id)
        res.cookie("token", token, cookieOptions)

        exists.password = undefined
        res.status(200).json({
            message: "Login Successfull",
            customer: exists,
        })

    } catch (error) {
        console.log("LOGIN ERROR:", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}



export const logoutUser = async (req, res) => {
    res.clearCookie("token", cookieOptions)

    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    })
}

export const getUser = (req, res) => {
    res.status(200).json(req.user)
}