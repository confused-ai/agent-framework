import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts', 'src/in-memory.ts', 'src/sqlite.ts', 'src/redis-store.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
