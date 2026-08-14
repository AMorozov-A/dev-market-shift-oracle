import { Injectable } from '@nestjs/common';
import { ClassificationField, RoleCluster } from '@prisma/client';
import {
  CLASSIFIER_CLOSE_GAP,
  CLASSIFIER_MIN_SCORE,
  CLASSIFIER_VERSION,
  FIELD_WEIGHT_MULTIPLIER,
  getSignalsSortedByTermLength,
  type ClassifierField,
  type ClassificationSignal,
} from './role-classifier.config';

export interface ClassifierInput {
  title: string;
  description?: string | null;
  keySkills?: string[];
}

export interface MatchedSignalEvidence {
  cluster: RoleCluster;
  field: ClassificationField;
  matchedTerm: string;
  weight: number;
  contribution: number;
  negative: boolean;
  strongAiFirst: boolean;
}

export interface ClassifierResult {
  primaryCluster: RoleCluster;
  scores: Record<RoleCluster, number>;
  matchedSignals: MatchedSignalEvidence[];
  classificationVersion: string;
  confidence: number;
  hasStrongAiFirstSignal: boolean;
}

const SCORE_CLUSTERS: RoleCluster[] = [
  RoleCluster.FRONTEND,
  RoleCluster.FULLSTACK,
  RoleCluster.BACKEND,
  RoleCluster.MOBILE,
  RoleCluster.DEVOPS,
  RoleCluster.ML_AI,
  RoleCluster.AI_FIRST,
  RoleCluster.DATA_ENGINEERING,
];

@Injectable()
export class RoleClassifierService {
  private readonly signals = getSignalsSortedByTermLength();

  classify(input: ClassifierInput): ClassifierResult {
    const title = this.normalizeText(input.title);
    const description = this.normalizeText(input.description ?? '');
    const skillsText = this.normalizeText((input.keySkills ?? []).join(' '));

    const scores = this.emptyScores();
    const matchedSignals: MatchedSignalEvidence[] = [];
    let hasStrongAiFirstSignal = false;

    const fields: Array<{ field: ClassifierField; text: string }> = [
      { field: 'TITLE', text: title },
      { field: 'SKILL', text: skillsText },
      { field: 'DESCRIPTION', text: description },
    ];

    for (const { field, text } of fields) {
      if (!text) {
        continue;
      }
      const usedRanges: Array<{ start: number; end: number }> = [];

      for (const signal of this.signals) {
        const matches = this.findAllMatches(text, signal.term);
        for (const match of matches) {
          if (this.overlaps(usedRanges, match.start, match.end)) {
            continue;
          }
          usedRanges.push({ start: match.start, end: match.end });

          const contribution =
            signal.weight *
            FIELD_WEIGHT_MULTIPLIER[field] *
            (signal.negative ? -1 : 1);

          scores[signal.cluster] += contribution;
          if (signal.strongAiFirst && !signal.negative) {
            hasStrongAiFirstSignal = true;
          }

          matchedSignals.push({
            cluster: signal.cluster,
            field: ClassificationField[field],
            matchedTerm: signal.term,
            weight: signal.weight,
            contribution,
            negative: Boolean(signal.negative),
            strongAiFirst: Boolean(signal.strongAiFirst),
          });
        }
      }
    }

    // Fullstack hybrid boost: FE + BE signals without explicit fullstack title
    this.applyHybridFullstackBoost(scores, matchedSignals, title);

    // AI-first gate: without strong signal, clamp AI_FIRST score
    if (
      !hasStrongAiFirstSignal &&
      !this.hasAiEngineeringCombo(title, description, skillsText)
    ) {
      scores[RoleCluster.AI_FIRST] = Math.min(
        scores[RoleCluster.AI_FIRST],
        CLASSIFIER_MIN_SCORE - 0.1,
      );
    }

    const ranked = SCORE_CLUSTERS.map((cluster) => ({
      cluster,
      score: scores[cluster],
    })).sort((a, b) => b.score - a.score);

    const top = ranked[0];
    const second = ranked[1];
    let primaryCluster: RoleCluster = RoleCluster.UNCLASSIFIED;
    let confidence = 0;

    if (top && top.score >= CLASSIFIER_MIN_SCORE) {
      primaryCluster = top.cluster;
      const maxPossible = 24;
      confidence = Math.min(0.95, Math.max(0.15, top.score / maxPossible));

      const gap = top.score - (second?.score ?? 0);
      if (gap < CLASSIFIER_CLOSE_GAP) {
        confidence *= 0.55;
      }

      // Extra confidence penalty for borderline AI_FIRST
      if (primaryCluster === RoleCluster.AI_FIRST && !hasStrongAiFirstSignal) {
        confidence *= 0.7;
      }
    }

    return {
      primaryCluster,
      scores,
      matchedSignals,
      classificationVersion: CLASSIFIER_VERSION,
      confidence: Number(confidence.toFixed(4)),
      hasStrongAiFirstSignal,
    };
  }

  private emptyScores(): Record<RoleCluster, number> {
    return {
      [RoleCluster.FRONTEND]: 0,
      [RoleCluster.FULLSTACK]: 0,
      [RoleCluster.BACKEND]: 0,
      [RoleCluster.MOBILE]: 0,
      [RoleCluster.DEVOPS]: 0,
      [RoleCluster.ML_AI]: 0,
      [RoleCluster.AI_FIRST]: 0,
      [RoleCluster.DATA_ENGINEERING]: 0,
      [RoleCluster.UNCLASSIFIED]: 0,
    };
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .replace(/<[^>]+>/g, ' ')
      .replace(/[_/|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findAllMatches(
    text: string,
    term: string,
  ): Array<{ start: number; end: number }> {
    const normalizedTerm = term.toLowerCase();
    if (!normalizedTerm) {
      return [];
    }

    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isWord = !normalizedTerm.includes(' ') && normalizedTerm.length <= 12;
    const pattern = isWord
      ? new RegExp(`(?:^|[^a-z0-9+.#])(${escaped})(?=[^a-z0-9+.#]|$)`, 'gi')
      : new RegExp(escaped, 'gi');

    const matches: Array<{ start: number; end: number }> = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const full = match[0];
      const captured = match[1] ?? full;
      const offset = full.indexOf(captured);
      const start = match.index + Math.max(0, offset);
      const end = start + captured.length;
      matches.push({ start, end });
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex += 1;
      }
    }
    return matches;
  }

  private overlaps(
    ranges: Array<{ start: number; end: number }>,
    start: number,
    end: number,
  ): boolean {
    return ranges.some((range) => start < range.end && end > range.start);
  }

  private applyHybridFullstackBoost(
    scores: Record<RoleCluster, number>,
    matched: MatchedSignalEvidence[],
    title: string,
  ): void {
    if (
      title.includes('fullstack') ||
      title.includes('full stack') ||
      title.includes('full-stack')
    ) {
      return;
    }

    const hasFrontend = matched.some(
      (item) =>
        !item.negative &&
        item.cluster === RoleCluster.FRONTEND &&
        ['react', 'vue', 'angular', 'frontend', 'next.js', 'nextjs'].some(
          (term) => item.matchedTerm.includes(term),
        ),
    );
    const hasBackend = matched.some(
      (item) =>
        !item.negative &&
        item.cluster === RoleCluster.BACKEND &&
        [
          'node',
          'nestjs',
          'postgres',
          'mongodb',
          'backend',
          'express',
          'prisma',
          'django',
          'spring',
        ].some((term) => item.matchedTerm.includes(term)),
    );

    // Hybrid FE+BE without explicit fullstack title → prefer FULLSTACK over pure FE/BE.
    if (hasFrontend && hasBackend) {
      const hybridFloor =
        Math.max(scores[RoleCluster.FRONTEND], scores[RoleCluster.BACKEND]) +
        CLASSIFIER_CLOSE_GAP +
        1;
      scores[RoleCluster.FULLSTACK] = Math.max(
        scores[RoleCluster.FULLSTACK] + 6,
        hybridFloor,
      );
    }
  }

  private hasAiEngineeringCombo(
    title: string,
    description: string,
    skillsText: string,
  ): boolean {
    const corpus = `${title} ${description} ${skillsText}`;
    const hasAi = /\bai\b|artificial intelligence|машинн\w* интеллект/.test(
      corpus,
    );
    const hasEng =
      /developer|engineer|разработчик|инженер|prompt|llm|rag|agent/.test(
        corpus,
      );
    return (
      hasAi && hasEng && /developer|engineer|разработчик|инженер/.test(title)
    );
  }
}

// Keep type export used by config consumers
export type { ClassificationSignal };
