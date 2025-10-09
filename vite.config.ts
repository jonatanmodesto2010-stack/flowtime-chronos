import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Generate build version automatically based on timestamp
  const buildTime = new Date().toISOString();
  const buildVersion = buildTime.replace(/[-:T.Z]/g, '').slice(0, 14); // Format: 20251009143000

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion),
    },
  };
});
