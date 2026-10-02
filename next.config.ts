import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The server binds 0.0.0.0, which Next treats as a different dev origin from 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  // libheif-js loads a wasm bundle from disk; bundling it breaks the decoder.
  serverExternalPackages: ["heic-convert", "heic-decode", "libheif-js"],
};

export default nextConfig;
