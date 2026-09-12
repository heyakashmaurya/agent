import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import { previewCampaign, createCampaignController, listCampaignsController, startCampaignController, cancelCampaignController } from "../controllers/outboundCampaign.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(auth, authorize("Owner", "Manager", "Staff"));
router.post("/preview", upload.single("file"), previewCampaign);
router.post("/", upload.single("file"), createCampaignController);
router.get("/", listCampaignsController);
router.post("/:id/start", startCampaignController);
router.post("/:id/cancel", cancelCampaignController);
export default router;
