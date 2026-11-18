import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE");
  return {
    // Vitest stubs process.env per test, so only inline it outside test mode.
    define: mode === "test" ? {} : { "process.env": env },
    server: {
      port: 3000,
    },
    build: {
      outDir: "build",
      sourcemap: true,
    },
    plugins: [react()],
    // to get aws amplify to work with vite
    resolve: {
      alias: [
        {
          find: "./runtimeConfig",
          replacement: "./runtimeConfig.browser", // ensures browser compatible version of AWS JS SDK is used
        },
      ],
    },
  };
});
