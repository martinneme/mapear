import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { connectDb } from "./db/connect.js";
import  authRouter from "./routes/auth.js";
import  tenantsRouter  from "./routes/tenants.js";
import layersRouter from "./routes/layers.js";
import contentRouter from "./routes/content.js";
import eventsRouter from "./routes/events.js";
import analystsRoutes from "./routes/analysts.js";
import subscriptionsRoutes from "./routes/subscriptions.js";

async function main() {
  await connectDb();

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.use(cors({
    origin: env.corsOrigin,
    credentials: true,
  }));

  app.get("/health", (_, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/tenants", tenantsRouter);
  app.use("/layers", layersRouter);
  app.use("/content", contentRouter);
  app.use("/events", eventsRouter);
  app.use(analystsRoutes);
  app.use(subscriptionsRoutes);
  
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API listening on http://localhost:${env.port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
