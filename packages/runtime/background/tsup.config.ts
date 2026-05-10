import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    clean: true,
    external: ['bullmq', 'kafkajs', 'amqplib', '@aws-sdk/client-sqs', 'ioredis'],
});
