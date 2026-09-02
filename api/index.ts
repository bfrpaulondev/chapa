import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildApp } from "../src/server/app";

const app = buildApp();
const ready = app.ready();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ready;
  app.routing(req as never, res as never);
}
