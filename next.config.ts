import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["antd", "@ant-design/icons"],
  },
  // Em desenvolvimento, a UI (next dev) delega /api/* para o Fastify local
  // (`npm run dev:api`). Em produção a Vercel serve a função serverless api/index.
  async rewrites() {
    const api = process.env.DEV_API_URL;
    if (!api) return [];
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
