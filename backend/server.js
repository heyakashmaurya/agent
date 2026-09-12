
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import http from "http";
import { Server } from "socket.io";

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import env from "./src/config/env.js";
// import { resumePendingCampaigns } from "./src/services/outboundCampaign.service.js";

/* ---------------------------------- */
/* Create HTTP Server                 */
/* ---------------------------------- */
const server = http.createServer(app);

/* ---------------------------------- */
/* Socket.io Setup                    */
/* ---------------------------------- */
export const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

/* ---------------------------------- */
/* Socket Events                      */
/* ---------------------------------- */
io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

/* ---------------------------------- */
/* Start Server                       */
/* ---------------------------------- */
const startServer = async () => {
  try {
    await connectDB();
    // await resumePendingCampaigns();

    server.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
      console.log(`Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();


// import http from "http";
// import { Server } from "socket.io";

// import app from "./src/app.js";
// import connectDB from "./src/config/db.js";
// import env from "./src/config/env.js";
import { resumePendingCampaigns } from "./src/services/outboundCampaign.service.js";

// /* ---------------------------------- */
// /* Create HTTP Server                 */
// /* ---------------------------------- */
// const server = http.createServer(app);

// /* ---------------------------------- */
// /* Socket.io Setup                    */
// /* ---------------------------------- */
// export const io = new Server(server, {
//   cors: {
//     origin: env.clientUrl,
//     credentials: true
//   }
// });

// /* ---------------------------------- */
// /* Socket Events                      */
// /* ---------------------------------- */
// io.on("connection", (socket) => {
//   console.log(`Socket Connected: ${socket.id}`);

//   socket.on("disconnect", () => {
//     console.log(`Socket Disconnected: ${socket.id}`);
//   });
// });

// /* ---------------------------------- */
// /* Start Server                       */
// /* ---------------------------------- */
// const startServer = async () => {
//   try {
//     await connectDB();

//     server.listen(env.port, () => {
//       console.log(`Server running on port ${env.port}`);
//       console.log(`Environment: ${env.nodeEnv}`);
//     });
//   } catch (error) {
//     console.error("Server startup failed:", error.message);
//     process.exit(1);
//   }
// };

// startServer();