import express from "express";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import cors from "cors";

import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";

dotenv.config();
const app = express();

const port = process.env.PORT || 3333;

// In production the `web` and `api` services share one Vercel domain, so the
// browser's requests arrive same-origin and CORS never comes into play. This is
// kept for local development, where Vite runs on its own port. Set
// `allowedOrigins` on the api service to add deployed origins (comma separated).
const allowedOrigins = (process.env.allowedOrigins || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Vercel terminates TLS in front of the function; without this Express cannot
// tell the request arrived over https, and secure cookies would be dropped.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

const dbURL = process.env.dbURL || process.env.dbUrl;

// --- Database ---------------------------------------------------------------
// Serverless functions are frozen between requests, so connecting once at
// startup is not enough and the old `mongoose.connect().then(...)` shape would
// never run for a request. The connection is opened lazily on the first request
// and cached on `global` so warm invocations reuse it rather than opening a new
// pool per request.
const connectDB = async () => {
    if (global._mongooseConnection) return global._mongooseConnection;

    if (!global._mongooseConnectionPromise) {
        global._mongooseConnectionPromise = mongoose.connect(dbURL).catch((err) => {
            // Clear the failed promise so the next request retries instead of
            // replaying the same rejection forever.
            global._mongooseConnectionPromise = null;
            throw err;
        });
    }

    global._mongooseConnection = await global._mongooseConnectionPromise;
    return global._mongooseConnection;
};

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('DB connection failed:', error.message);
        res.status(503).json({ message: 'Database unavailable' });
    }
});

// Every route lives under /api. Vercel routes /api/* to this service and
// forwards the path unchanged - `/api/products` arrives as `/api/products`, not
// `/products` - so the mounts here must include the prefix the browser calls.
app.use('/api/customers', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

export default app;

// Vercel invokes the exported app above as a function and owns the process
// lifecycle, so binding a port there would be meaningless. This branch keeps
// `node index.js` working locally.
if (!process.env.VERCEL) {
    connectDB()
        .then(() => {
            console.log('DB Connected');
            app.listen(port, () => {
                console.log(`Server Started at ${port}`);
            });
        })
        .catch((err) => {
            console.error('DB connection failed:', err.message);
            process.exit(1);
        });
}
