import express from "express";
import { getDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.post("/", getDashboard);

export default router;

