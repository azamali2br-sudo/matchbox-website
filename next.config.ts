import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One canonical site for Google: the old production alias permanently
  // redirects page requests to www.matchboxpadel.com (path + query kept, so
  // manage links in old emails still land on the right booking). API routes are
  // NOT redirected — the Vercel cron and any in-flight calls keep working.
  // Preview / per-deployment URLs are unaffected (host must match exactly).
  async redirects() {
    return [
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "matchbox-website.vercel.app" }],
        destination: "https://www.matchboxpadel.com/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
