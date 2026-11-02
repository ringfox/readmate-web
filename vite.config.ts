import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // 本地开发：把 /api/weread 转到微信读书网关，绕过浏览器 CORS
      '/api/weread': {
        target: 'https://i.weread.qq.com',
        changeOrigin: true,
        rewrite: () => '/api/agent/gateway',
      },
    },
  },
});
