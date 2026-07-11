import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool as dbPool } from "@workspace/db";

const PgSession = connectPgSimple(session);

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionStore = process.env.DATABASE_URL
  ? new PgSession({
      pool: dbPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET ?? "meeting-manager-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

app.use("/api", router);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Swagger UI (available in all environments)
try {
  const openApiPath = path.resolve(__dirname, "../openapi.json");
  const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, "utf-8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: "Meeting Manager API Docs",
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));
} catch {
  // openapi.json not present — skip Swagger UI
}

// Serve DT dashboard at /dt  (must be registered before meeting-manager catch-all)
const dtDist = path.resolve(__dirname, "../../dt-dashboard/dist/public");
if (fs.existsSync(dtDist)) {
  app.use("/dt", express.static(dtDist));
  app.get("/dt/{*splat}", (_req, res) => {
    res.sendFile(path.join(dtDist, "index.html"));
  });
}

// Serve committees app at /committees  (must be registered before meeting-manager catch-all)
const committeesDist = path.resolve(__dirname, "../../committees/dist/public");
if (fs.existsSync(committeesDist)) {
  app.use("/committees", express.static(committeesDist));
  app.get("/committees/{*splat}", (_req, res) => {
    res.sendFile(path.join(committeesDist, "index.html"));
  });
}

// Serve meeting-manager at /
const frontendDist = path.resolve(__dirname, "../../meeting-manager/dist/public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Global error handler — catches any unhandled async errors from route handlers
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  logger.error({ err }, "Unhandled error");
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
});

export default app;
