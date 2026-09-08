import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";

import env from "./config/env.js";

import errorHandler from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";

import tableRoutes from "./routes/table.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import analyticsRoutes
  from "./routes/analyticsRoutes.js";

import callRoutes from "./routes/callRoutes.js";

import outboundRoutes from "./routes/outboundRoutes.js";

import livekitRoutes from "./routes/livekitRoutes.js";

//updated code format new routes imported here now 
import customerRoutes from "./routes/customer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";






const app = express();



app.set("trust proxy", 1);
console.log("Trust Proxy:", app.get("trust proxy"));




/* ---------------------------------- */
/* Security Middleware                */
/* ---------------------------------- */
app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);

app.use(xss());

// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 200,
//     message: "Too many requests. Please try again later."
//   })
// );

/* ---------------------------------- */
/* Core Middleware                    */
/* ---------------------------------- */
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ---------------------------------- */
/* Health Check                       */
/* ---------------------------------- */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: `${env.restaurantName} API Running`
  });
});



/* ---------------------------------- */
/* API Placeholder Routes             */
/* ---------------------------------- */

app.use("/api/auth", authRoutes);

app.use("/api/tables", tableRoutes);

// app.use("/api/customers", customerRoutes);

app.use("/api/bookings", bookingRoutes);

app.use(
  "/api/analytics",
  analyticsRoutes
);

app.use(errorHandler);







app.use("/api/call", callRoutes);

app.use("/api/outbound", outboundRoutes);




app.use(
  "/api/livekit",
  livekitRoutes
);


app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);

/* ---------------------------------- */
/* 404 Handler                        */
/* ---------------------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/* ---------------------------------- */
/* Global Error Handler               */
/* ---------------------------------- */
app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error"
  });
});

export default app;