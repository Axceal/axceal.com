import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.NODE_ENV) {
  (process.env as Record<string, string>).NODE_ENV = "test";
}
