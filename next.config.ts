import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The server binds 0.0.0.0, which Next treats as a different dev origin from 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
