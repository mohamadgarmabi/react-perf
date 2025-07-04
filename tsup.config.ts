import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'cli': 'src/cli.ts',
    'index': 'src/index.ts',
    'performance-analyzer': 'src/performance-analyzer.ts',
    'bulk-perf-check': 'src/bulk-perf-check.ts',
    'quick-perf-check': 'src/quick-perf-check.ts',
    'simple-perf-check': 'src/simple-perf-check.ts',
    'check-perf': 'src/check-perf.ts'
  },
  format: ['esm'],
  target: 'node18',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  outDir: 'dist',
  platform: 'node',
  external: ['chalk', 'commander'],
  noExternal: [],
  treeshake: true,
  minify: true,
  onSuccess: 'node dist/cli.js --version'
}) 