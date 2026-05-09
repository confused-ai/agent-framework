/**
 * @confused-ai/cli — buildProgram conformance tests
 *
 * The CLI package is a binary (no library export), so we import
 * `buildProgram` directly from the source file.
 */
import { describe, it, expect } from 'vitest';
import { buildProgram } from '../src/build-program.js';

describe('buildProgram()', () => {
    it('returns a Command instance', () => {
        const program = buildProgram();
        expect(program).toBeDefined();
        expect(typeof program.name).toBe('function');
        expect(typeof program.commands).toBe('object');
    });

    it('has the correct program name', () => {
        const program = buildProgram();
        expect(program.name()).toBe('confused-ai');
    });

    it('has a non-empty description', () => {
        const program = buildProgram();
        expect(program.description()).toBeTruthy();
        expect(program.description()).toContain('CLI');
    });

    it('has a version string', () => {
        const program = buildProgram();
        const versionStr = program.version();
        expect(typeof versionStr).toBe('string');
        expect(versionStr!.length).toBeGreaterThan(0);
    });

    const expectedCommands = [
        'create',
        'run',
        'serve',
        'eval',
        'test',
        'validate',
        'plan',
        'execute',
        'list-templates',
        'doctor',
        'replay',
        'inspect',
        'export',
        'diff',
        'chat',
    ];

    it('registers all expected sub-commands', () => {
        const program = buildProgram();
        const names = program.commands.map((c) => c.name());
        for (const cmd of expectedCommands) {
            expect(names).toContain(cmd);
        }
    });

    it(`registers exactly ${expectedCommands.length} sub-commands`, () => {
        const program = buildProgram();
        expect(program.commands).toHaveLength(expectedCommands.length);
    });

    it('each sub-command has a non-empty description', () => {
        const program = buildProgram();
        for (const cmd of program.commands) {
            expect(
                cmd.description().length,
                `command '${cmd.name()}' description is empty`,
            ).toBeGreaterThan(0);
        }
    });

    it('does not throw when called multiple times (stateless factory)', () => {
        expect(() => {
            buildProgram();
            buildProgram();
            buildProgram();
        }).not.toThrow();
    });

    describe('--version / --help via exitOverride', () => {
        it('throws CommanderError on --version (exit 0)', () => {
            const program = buildProgram();
            program.exitOverride();
            expect(() =>
                program.parse(['--version'], { from: 'user' }),
            ).toThrow();
        });

        it('throws CommanderError on --help (exit 0)', () => {
            const program = buildProgram();
            program.exitOverride();
            expect(() =>
                program.parse(['--help'], { from: 'user' }),
            ).toThrow();
        });
    });

    describe('list-templates command', () => {
        it('exists and has description', () => {
            const program = buildProgram();
            const cmd = program.commands.find((c) => c.name() === 'list-templates');
            expect(cmd).toBeDefined();
            expect(cmd!.description()).toBeTruthy();
        });
    });

    describe('doctor command', () => {
        it('exists and has description', () => {
            const program = buildProgram();
            const cmd = program.commands.find((c) => c.name() === 'doctor');
            expect(cmd).toBeDefined();
            expect(cmd!.description()).toBeTruthy();
        });
    });

    describe('eval command', () => {
        it('exists and has options or description', () => {
            const program = buildProgram();
            const cmd = program.commands.find((c) => c.name() === 'eval');
            expect(cmd).toBeDefined();
        });
    });
});
