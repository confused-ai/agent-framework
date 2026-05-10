import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts', 'src/openai.ts', 'src/anthropic.ts', 'src/google.ts', 'src/ollama.ts', 'src/bedrock.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
