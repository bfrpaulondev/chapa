import type { InjectOptions } from "fastify";
import { buildApp } from "../../src/server/app.js";

type App = ReturnType<typeof buildApp>;

let appPromise: Promise<App> | null = null;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// -.-.-.-
function getApp(): Promise<App> {
  appPromise ??= buildApp().ready() as unknown as Promise<App>;
  return appPromise;
}

// -.-.-.-
export default async function handler(request: Request): Promise<Response> {
  const app = await getApp();
  const url = new URL(request.url);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await app.inject({
    method: request.method as NonNullable<InjectOptions["method"]>,
    url: `${url.pathname}${url.search}`,
    headers: Object.fromEntries(request.headers.entries()),
    payload: hasBody ? Buffer.from(await request.arrayBuffer()) : undefined,
  });

  const headers = new Headers();
  for (const [name, value] of Object.entries(response.headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, String(item));
    }
  }

  const body = request.method === "HEAD" ? null : Uint8Array.from(response.rawPayload);

  return new Response(body, {
    status: response.statusCode,
    headers,
  });
}

export const config = {
  path: "/api/*",
};
