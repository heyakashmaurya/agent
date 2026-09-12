import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import { getOutboundConfig, makeOutboundCall, connectLivekit, twilioStatus, exotelStatus, vobizStatus } from "../controllers/outboundCallController.js";

const router = express.Router();
router.get("/config", auth, authorize("Owner", "Manager", "Staff"), getOutboundConfig);
router.post("/call", auth, authorize("Owner", "Manager", "Staff"), makeOutboundCall);
router.post("/twilio/connect", connectLivekit);
router.post("/twilio/status", twilioStatus);
router.post("/exotel/status", exotelStatus);
router.post("/vobiz/status", vobizStatus);
export default router;
