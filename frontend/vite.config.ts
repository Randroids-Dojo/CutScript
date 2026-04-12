import { spawn } from 'child_process';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendLauncher = () => ({
  name: 'backend-launcher',
  configureServer(server: any) {
    server.middlewares.use('/api/start-backend', (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const backendDir = path.join(process.cwd(), '..', 'backend');
      const child = spawn(
        '.venv/bin/python',
        ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8642'],
        { cwd: backendDir, detached: true, stdio: 'ignore' },
      );
      child.unref();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  },
});

export default defineConfig({
  plugins: [react(), backendLauncher()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
