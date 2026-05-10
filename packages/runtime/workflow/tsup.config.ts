import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts', 'src/compose.ts', 'src/supervisor.ts', 'src/swarm.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
