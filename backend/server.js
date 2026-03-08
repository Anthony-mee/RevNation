require("dotenv").config();

const app = require("./app");
const config = require("./config");
const connectDatabase = require("./config/db");

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(config.port, () => {
      console.log(`[server] Listening on port ${config.port}`);
      console.log(`[server] Health check: http://localhost:${config.port}${config.apiPrefix}/health`);
    });

    // Avoid unhandled EventEmitter crash and print a clear action message.
    server.on("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        console.error(`[server] Port ${config.port} is already in use. Stop the other process or change PORT in .env.`);
        process.exit(1);
      }

      console.error("[server] Listen error:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("[server] Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
