import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents and partialPrefetching (template defaults) are left out:
  // they speed up pages that load data on the server, and this dashboard loads
  // everything in the browser (Firebase Web SDK), after the admin check.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
