import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { applySecurityHeaders, assertProductionEnvironment, cleanupRateLimitStores, registrationRateLimit, sameOriginMutation } from "./security";

async function startServer() {
  assertProductionEnvironment();
  const app = express();
  const server = createServer(app);
  applySecurityHeaders(app);
  // SAHAYAT has no upload endpoint; keep request bodies intentionally small.
  app.use(express.json({ limit: "100kb", strict: true }));
  app.use(express.urlencoded({ limit: "20kb", extended: false }));
  app.use("/api/trpc", sameOriginMutation);
  app.use("/api/trpc/registration.submit", registrationRateLimit);
  const cleanupTimer = setInterval(cleanupRateLimitStores, 15 * 60 * 1000);
  cleanupTimer.unref();
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Keep API failures JSON even when parsing or middleware fails before tRPC.
  // This prevents the SPA fallback from being mistaken for an API response.
  app.use("/api/trpc", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
  app.use("/api/trpc", (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    console.error("[API] tRPC request failed:", error);
    res.status(500).json({ error: "The API request could not be completed." });
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));

  const gracefulShutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}, closing server...`);
    clearInterval(cleanupTimer);
    server.close(async () => {
      try {
        const { closeDb } = await import("../db");
        await closeDb();
      } catch (err) {
        console.error("[Server] Error closing database:", err);
      }
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

startServer().catch(error => { console.error(error); process.exit(1); });
