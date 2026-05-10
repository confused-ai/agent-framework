import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts', 'src/loaders.ts', 'src/knowledge-engine.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
