import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    webpackBuildWorker: true,
  },
};

export default nextConfig;
