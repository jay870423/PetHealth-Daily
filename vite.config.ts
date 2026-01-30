
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3001, // 修改前端开发端口，避免与 server.mjs (3000) 冲突
    proxy: {
      // 将 /api 请求转发到本地后端服务或 Mock 环境
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
