import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  output: 'standalone',
  // Monorepo root, so the standalone bundle includes the workspace packages it uses.
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
