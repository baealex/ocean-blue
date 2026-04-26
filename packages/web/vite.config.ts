import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

function getManualChunk(id: string) {
    return id.includes('/node_modules/react/')
        || id.includes('/node_modules/react-dom/')
        || id.includes('/node_modules/react-router-dom/')
        ? 'vendor'
        : undefined;
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        svgr(),
        tailwindcss()
    ],
    css: { preprocessorOptions: { scss: { api: 'modern' } } },
    resolve: { alias: { '~': path.resolve(__dirname, './src') } },
    build: {
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: getManualChunk
            }
        }
    },
    server: {
        host: '0.0.0.0',
        allowedHosts: ['localhost', '127.0.0.1'],
        proxy: {
            '/api': { target: 'http://localhost:25830' },
            '/pages': { target: 'http://localhost:25830' },
            '/graphql': { target: 'http://localhost:25830' },
            '/tunnel': {
                target: 'ws://localhost:25830',
                ws: true
            }
        }
    }
});
