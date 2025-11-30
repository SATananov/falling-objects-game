import { defineConfig } from "vite";

export default defineConfig({
  base: "/falling-objects-game/",
  plugins: [],
  server: {
    middlewareMode: false,
  },
  publicDir: "public",
});