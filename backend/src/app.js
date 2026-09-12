import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";
import env from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import tableRoutes from "./routes/table.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import outboundRoutes from "./routes/outboundRoutes.js";
import outboundCampaignRoutes from "./routes/outboundCampaign.routes.js";
import livekitRoutes from "./routes/livekitRoutes.js";
import customerRoutes from "./routes/customer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(xss());
app.get("/", (req, res) =>
    res
        .status(200)
        .json({ success: true, message: `${env.restaurantName} API Running` }),
);
app.get("/health", (req, res) =>
    res
        .status(200)
        .json({
            success: true,
            status: "ok",
            timestamp: new Date().toISOString(),
        }),
);
app.use("/api/auth", authRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/call", callRoutes);
app.use("/api/outbound", outboundRoutes);
app.use("/api/outbound/campaigns", outboundCampaignRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use((req, res) =>
    res.status(404).json({ success: false, message: "Route not found" }),
);
app.use((error, req, res, next) => {
    console.error(`[API_ERROR] ${req.method} ${req.originalUrl}`, error);
    const status = error.statusCode || error.status || 500;
    res.status(status).json({
        success: false,
        message: error.message || "Internal Server Error",
    });
});
export default app;
