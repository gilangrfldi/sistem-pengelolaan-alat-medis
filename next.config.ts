import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/masuk",
        permanent: false,
      },
      {
        source: "/login",
        destination: "/masuk",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
