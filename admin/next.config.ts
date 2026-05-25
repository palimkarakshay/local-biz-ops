import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The per-vertical configs live in the repo-level `config/` folder (one level
// up). Point Turbopack's root at the repo so the admin can import them.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
};

export default nextConfig;
