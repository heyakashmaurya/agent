// import express from "express";
// import { connectLivekit, makeOutboundCall } from "../controllers/outboundCallController.js";

// const router = express.Router();

// router.post("/call", makeOutboundCall);

// router.post(
// "/connect-livekit",
// (req,res)=>{
// console.log("TWILIO HIT");
// connectLivekit(req,res);
// }
// );
// export default router;

import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import {
  connectLivekit,
  makeOutboundCall,
  outboundStatus,
} from "../controllers/outboundCallController.js";

const router = express.Router();

// Twilio provider callbacks must stay public; validate them with Twilio signature
// verification at the edge/proxy in production or add dedicated webhook middleware.
router.post("/connect-livekit", connectLivekit);
router.post("/status", outboundStatus);

// Dashboard-originated call creation is authenticated.
router.post("/call", auth, authorize("Owner", "Manager", "Staff"), makeOutboundCall);

export default router;