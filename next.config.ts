import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Leaving @prisma/client external stops webpack/Turbopack from bundling and
  // rewriting the paths it uses at runtime to locate its query engine.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
