import { defineConfig, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const base = '/accountingnight/';

const attendanceTrailingSlashRedirect = {
  name: 'attendance-trailing-slash-redirect',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((request, response, next) => {
      const requestUrl = request.url ?? '';
      const pathname = requestUrl.split('?')[0];
      if (pathname !== `${base}attendance`) {
        next();
        return;
      }

      response.statusCode = 302;
      response.setHeader('Location', `${base}attendance/${requestUrl.slice(pathname.length)}`);
      response.end();
    });
  },
};

export default defineConfig({
  plugins: [attendanceTrailingSlashRedirect, react()],
  base,
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        invitation: `${projectRoot}index.html`,
        sponsor: `${projectRoot}sponsor/index.html`,
        attendance: `${projectRoot}attendance/index.html`,
        student: `${projectRoot}student/index.html`,
        studentAttendance: `${projectRoot}student/attendance/index.html`,
        admin: `${projectRoot}admin/index.html`,
      },
    },
  },
});
