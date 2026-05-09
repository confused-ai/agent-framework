#!/usr/bin/env node
/**
 * CLI entry — see `build-program.ts` and `commands/`.
 *
 * @deprecated This module will be removed in the next major version.
 *   Use the `@confused-ai/cli` package CLI directly instead.
 */
import { buildProgram } from './build-program.js';

buildProgram().parse();
