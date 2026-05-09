import { defineConfig } from 'tsup';
export default defineConfig({
  entry: [
    'src/index.ts',
    'src/sqlite.ts',
    'src/postgres.ts',
    'src/mongo.ts',
    'src/redis.ts',
    'src/json.ts',
    'src/in-memory.ts',
    'src/mysql.ts',
    'src/dynamodb.ts',
    'src/turso.ts',
    'src/factory.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
