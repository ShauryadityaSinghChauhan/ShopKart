import express from "express";
import {
    createPaymentOrder,
    verifyPayment,
    getOrders,
    getOrderById
} from "../controllers/order.controller.js";
import isAuthenticated from "../middlewares/authMiddleware.js";

const orderRoutes = express.Router();

// Every order route is behind the same gate. There is no public order
// endpoint, and no route reads a user id from the URL or the body - the
// authenticated token is the only thing that decides whose orders are returned.
orderRoutes.use(isAuthenticated);

// Fixed paths are declared before "/:id" so a request can never be swallowed by
// the parameter route.
orderRoutes.post("/create-payment-order", createPaymentOrder);
orderRoutes.post("/verify-payment", verifyPayment);

orderRoutes.get("/", getOrders);
orderRoutes.get("/:id", getOrderById);

export default orderRoutes;
