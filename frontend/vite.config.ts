import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Cần thiết khi chạy bên trong Docker để expose ra bên ngoài container
    host: true,
    proxy: {
      // Tự động chuyển tiếp các request /api sang backend
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
