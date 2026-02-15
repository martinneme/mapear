import mongoose from "mongoose";
import { env } from "../lib/env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  // eslint-disable-next-line no-console
  console.log("✅ Mongo connected");
}
