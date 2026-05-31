import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: false,
  build: {
    outDir: "dist/frontend",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html"
    }
  }
});
