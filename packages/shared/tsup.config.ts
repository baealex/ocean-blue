import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'node18',
  outDir: 'dist'
});
