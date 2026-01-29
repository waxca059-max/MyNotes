import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载根目录对应的环境文件
  const envFilePath = path.resolve(__dirname, '..');
  const rootEnv = loadEnv(mode, envFilePath, '');
  
  const backendPort = rootEnv.PORT || '3002';
  const backendTarget = `http://localhost:${backendPort}`;

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        }
      }
    }
  }
})
