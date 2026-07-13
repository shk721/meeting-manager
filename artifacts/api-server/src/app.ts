import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
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

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required but was not set.");
}

const PgSession = connectPgSimple(session);

const app: Express = express();

app.set("trust proxy", 1);

// CORS: allow origins from ALLOWED_ORIGINS env var (comma-separated) or localhost in dev
const rawOrigins = process.env.ALLOWED_ORIGINS;
const allowedOrigins = rawOrigins
  ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean)
  : process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"];

app.use(
  cors({
    origin: allowedOrigins.length > 0
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      : false,
    credentials: true,
  }),
);

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: true,
});
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down." },
});

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
    secret: sessionSecret,
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

app.use("/api/auth/login", loginLimiter);
app.use("/api", globalLimiter, router);

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
