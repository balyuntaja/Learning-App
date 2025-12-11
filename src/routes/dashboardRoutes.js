import express from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware, getDashboard);

export default router;

