import dotenv from "dotenv";
dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: must("MONGO_URI"),
  jwtAccessSecret: must("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: must("JWT_REFRESH_SECRET"),
  accessTtlSec: Number(process.env.ACCESS_TOKEN_TTL || 900),
  refreshTtlSec: Number(process.env.REFRESH_TOKEN_TTL || 1209600),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};
