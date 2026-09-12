import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import { getAISettings, updateAISettings } from "../controllers/settings.controller.js";
const router=express.Router(); router.use(auth); router.get("/ai",authorize("Owner","Manager","Staff"),getAISettings); router.patch("/ai",authorize("Owner","Manager"),updateAISettings); export default router;