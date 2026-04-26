import { defineConfig } from 'tsup'

export default defineConfig([
  // CLI binary
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    clean: true,
    splitting: false,
    treeshake: true,
    minify: true,
    target: 'node18',
    banner: {
      js: '#!/usr/bin/env node'
    },
    outDir: 'dist',
    dts: false
  },
  // Library exports
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: 'node18',
    outDir: 'dist'
  }
])