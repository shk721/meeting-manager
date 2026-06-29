import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

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

app.use(
  session({
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

export default app;
