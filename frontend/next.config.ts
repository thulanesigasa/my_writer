import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep connections alive for SSE streaming
  httpAgentOptions: {
    keepAlive: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
