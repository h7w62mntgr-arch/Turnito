import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Turbopack tome como raíz un package-lock.json de una carpeta superior.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
