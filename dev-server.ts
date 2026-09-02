import { buildApp } from "./src/server/app.js";

const port = Number(process.env.PORT ?? 4000);
const app = buildApp();

app.listen({ port, host: "127.0.0.1" }).catch((err) => {
  console.error(err);
  process.exit(1);
});
console.log(`[chapa] API Fastify em http://127.0.0.1:${port}`);
