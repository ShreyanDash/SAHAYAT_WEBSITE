import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
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
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
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
}

startServer().catch(error => { console.error(error); process.exit(1); });
