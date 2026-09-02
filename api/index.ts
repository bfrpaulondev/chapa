import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildApp } from "../src/server/app.js";

type App = ReturnType<typeof buildApp>;
let appPromise: Promise<App> | null = null;

function getApp(): Promise<App> {
  appPromise ??= buildApp().ready() as unknown as Promise<App>;
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    app.routing(req as never, res as never);
  } catch (err) {
    const e = err as Error;
    if (!res.headersSent) {
      res.status(500).json({ error: e?.stack ?? String(err) });
    } else {
      res.end(`\n[chapa] ${e?.message ?? err}`);
    }
  }
}
