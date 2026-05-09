/**
 * Skills package — smoke tests.
 *
 * Verifies that each skill has the required structural shape and that the
 * Tool conformance contract is satisfied for each tool they export.
 */

import { describe, it, expect } from 'vitest';
import { webResearchSkill } from '../src/web-research.js';
import { pdfSummarizerSkill } from '../src/pdf-summarizer.js';
import { codeReviewerSkill } from '../src/code-reviewer.js';
import type { Skill, Tool } from '@confused-ai/contracts';

function assertSkillShape(skill: Skill, label: string): void {
  describe(`${label} skill shape`, () => {
    it('has a non-empty id', () => {
      expect(typeof skill.id).toBe('string');
      expect(skill.id.length).toBeGreaterThan(0);
    });

    it('has a non-empty name', () => {
      expect(typeof skill.name).toBe('string');
      expect(skill.name.length).toBeGreaterThan(0);
    });

    it('has non-empty instructions', () => {
      expect(typeof skill.instructions).toBe('string');
      expect((skill.instructions ?? '').length).toBeGreaterThan(0);
    });

    it('has at least one tool', () => {
      expect(Array.isArray(skill.tools)).toBe(true);
      expect((skill.tools ?? []).length).toBeGreaterThan(0);
    });

    it('each tool has name, description, parameters, execute', () => {
      for (const t of (skill.tools ?? []) as Tool[]) {
        expect(typeof t.name).toBe('string');
        expect(t.name.length).toBeGreaterThan(0);
        expect(typeof t.description).toBe('string');
        expect(t.description.length).toBeGreaterThan(0);
        expect(typeof t.parameters).toBe('object');
        expect(t.parameters).not.toBeNull();
        expect(typeof t.execute).toBe('function');
      }
    });
  });
}

// ── Shape conformance ─────────────────────────────────────────────────────────

assertSkillShape(webResearchSkill, 'webResearch');
assertSkillShape(pdfSummarizerSkill, 'pdfSummarizer');
assertSkillShape(codeReviewerSkill, 'codeReviewer');

// ── Code reviewer: read_source_file rejects non-allowed extensions ────────────

describe('codeReviewer.read_source_file security', () => {
  it('rejects binary file extensions', async () => {
    const tool = (codeReviewerSkill.tools as Tool[]).find(t => t.name === 'read_source_file')!;
    await expect(tool.execute({ path: '/tmp/test.exe' })).rejects.toThrow(/not supported/);
  });

  it('rejects missing files', async () => {
    const tool = (codeReviewerSkill.tools as Tool[]).find(t => t.name === 'read_source_file')!;
    await expect(tool.execute({ path: '/nonexistent/file.ts' })).rejects.toThrow(/not found/);
  });
});

// ── Web research: fetch_page rejects non-HTTPS URLs ──────────────────────────

describe('webResearch.fetch_page security', () => {
  it('rejects HTTP URLs', async () => {
    const tool = (webResearchSkill.tools as Tool[]).find(t => t.name === 'fetch_page')!;
    await expect(tool.execute({ url: 'http://example.com' })).rejects.toThrow(/HTTPS/);
  });
});
