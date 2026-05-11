#!/usr/bin/env node
/**
 * Compatibility wrapper for the root declaration build step.
 *
 * Historically `build:root` invoked this script to generate lightweight re-export
 * declarations. That drifted from the actual source entrypoints and caused the
 * published root package types to disagree with the documented API.
 *
 * Keep the command name stable, but delegate to the real declaration bundler so
 * `dist/*.d.ts` reflects the current source surface.
 */

import './build-dts.mjs';
