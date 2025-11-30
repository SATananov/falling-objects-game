import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  server: {
    middlewareMode: false,
  },
  publicDir: "public",
});