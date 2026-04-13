import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(configDir, '..', 'backend');

const backendLauncher = () => {
  let spawning = false;
  return {
    name: 'backend-launcher',
    configureServer(server: any) {
      server.middlewares.use('/api/start-backend', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (!spawning) {
          spawning = true;
          const child = spawn(
            'python',
            ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8642'],
            { cwd: backendDir, detached: true, stdio: 'ignore' },
          );
          child.unref();
          // On crash wait 2s before allowing another attempt to prevent rapid re-spawn loops.
          child.on('exit', (code) => {
            if (code === 0) { spawning = false; }
            else { setTimeout(() => { spawning = false; }, 2000); }
          });
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
      });
    },
  };
};

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
