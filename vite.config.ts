import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [],
  server: {
    middlewareMode: false,
  },
  publicDir: "public",
});