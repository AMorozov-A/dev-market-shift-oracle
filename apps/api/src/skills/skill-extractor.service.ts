import { Injectable } from '@nestjs/common';
import { ClassificationField } from '@prisma/client';
import {
  SKILL_DICTIONARY,
  buildSkillAliasIndex,
  normalizeSkillAlias,
  type SkillDictionaryEntry,
} from './skill-dictionary.config';

export interface ExtractedSkill {
  code: string;
  name: string;
  sourceField: ClassificationField;
  confidence: number;
}

export interface SkillExtractorInput {
  title: string;
  description?: string | null;
  keySkills?: string[];
}

@Injectable()
export class SkillExtractorService {
  private readonly aliasIndex = buildSkillAliasIndex(SKILL_DICTIONARY);
  private readonly aliasesByLength = [...this.aliasIndex.keys()].sort(
    (a, b) => b.length - a.length,
  );

  extract(input: SkillExtractorInput): ExtractedSkill[] {
    const found = new Map<string, ExtractedSkill>();

    const skillList = input.keySkills ?? [];
    for (const raw of skillList) {
      const entry = this.resolveAlias(raw);
      if (!entry) {
        continue;
      }
      this.upsert(found, entry, ClassificationField.SKILL, 0.95);
    }

    this.scanText(input.title, ClassificationField.TITLE, 0.9, found);
    this.scanText(
      input.description ?? '',
      ClassificationField.DESCRIPTION,
      0.75,
      found,
    );

    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private scanText(
    text: string,
    field: ClassificationField,
    confidence: number,
    found: Map<string, ExtractedSkill>,
  ): void {
    const normalized = normalizeSkillAlias(text.replace(/<[^>]+>/g, ' '));
    if (!normalized) {
      return;
    }

    const usedRanges: Array<{ start: number; end: number }> = [];
    for (const alias of this.aliasesByLength) {
      const pattern = this.toPattern(alias);
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(normalized)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (
          usedRanges.some((range) => start < range.end && end > range.start)
        ) {
          continue;
        }
        usedRanges.push({ start, end });
        const entry = this.aliasIndex.get(alias);
        if (entry) {
          this.upsert(found, entry, field, confidence);
        }
      }
    }
  }

  private resolveAlias(value: string): SkillDictionaryEntry | null {
    return this.aliasIndex.get(normalizeSkillAlias(value)) ?? null;
  }

  private upsert(
    found: Map<string, ExtractedSkill>,
    entry: SkillDictionaryEntry,
    sourceField: ClassificationField,
    confidence: number,
  ): void {
    const existing = found.get(entry.code);
    if (!existing || confidence > existing.confidence) {
      found.set(entry.code, {
        code: entry.code,
        name: entry.name,
        sourceField,
        confidence,
      });
    }
  }

  private toPattern(alias: string): RegExp {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const short = !alias.includes(' ') && alias.length <= 3;
    if (short) {
      return new RegExp(
        `(?:^|[^a-z0-9+.#])(${escaped})(?=[^a-z0-9+.#]|$)`,
        'gi',
      );
    }
    return new RegExp(escaped, 'gi');
  }
}
