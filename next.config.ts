import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's client generates a custom output directory (src/generated/prisma).
  // Leaving @prisma/client external stops webpack from rewriting the paths it
  // uses at runtime to locate its query engine, which otherwise breaks on Vercel.
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
