import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocket } from "./config/socket.js";
import { initCronJobs } from "./cron/price-scanner.js";
import { initAbandonWorker } from "./cron/abandon-worker.js";

const httpServer = http.createServer(app);

// Inițializează Socket.io pe același server HTTP
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`✅ Backend running on http://localhost:${env.PORT}`);
  console.log(`🔌 Socket.io activ pe ws://localhost:${env.PORT}`);
  
  // Inițializează scanerul de prețuri
  initCronJobs();

  // Inițializează worker-ul de abandon checkout
  initAbandonWorker();
});

