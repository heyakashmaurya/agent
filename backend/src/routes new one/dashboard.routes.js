import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import { getDashboardOverview } from "../controllers/dashboard.controller.js";

const router = express.Router();
router.use(auth);
router.get("/overview", authorize("Owner", "Manager", "Staff"), getDashboardOverview);

export default router;
