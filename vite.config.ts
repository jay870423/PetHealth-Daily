
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    // 在 Vercel 开发模式下，Vercel CLI 会自动处理 /api 路由，无需手动配置代理。
    // 手动代理到 3000 端口会触发递归循环，导致 "string did not match pattern" 或 404 错误。
  }
});
