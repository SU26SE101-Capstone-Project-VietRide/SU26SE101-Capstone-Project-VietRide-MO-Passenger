import type { TFunction } from 'i18next';

import { formatDate } from '@shared/utils/format';
import type { PolicySource, PublishedPolicy } from '../types/policy';

export const KNOWN_POLICY_CATEGORIES = [
  'REFUND',
  'LUGGAGE',
  'CANCELLATION',
  'NO_SHOW',
  'PRIVACY',
  'TERMS',
  'PAYMENT',
  'SHUTTLE',
  'PARCEL',
] as const;

export type KnownPolicyCategory = (typeof KNOWN_POLICY_CATEGORIES)[number];

const KNOWN_CATEGORY_SET = new Set<string>(KNOWN_POLICY_CATEGORIES);

export const policySourceOf = (policy: PublishedPolicy): PolicySource =>
  policy.operatorId ? 'operator' : 'platform';

export const policyCategoryLabel = (
  category: string,
  translate: TFunction,
): string => {
  if (KNOWN_CATEGORY_SET.has(category)) {
    return translate(`policy.categories.${category}`);
  }
  return category.replace(/_/g, ' ');
};

export const policyUpdatedLabel = (
  updatedAt: string,
  translate: TFunction,
  locale?: string,
): string => {
  const formatted = formatDate(updatedAt, locale);
  if (!formatted) return '';
  return translate('policy.updatedOn', { date: formatted });
};

export interface PolicyListSection {
  source: PolicySource;
  operatorId: string | null;
  items: PublishedPolicy[];
}

/** Groups a flattened page set: platform first, then each operator. */
export const groupPublishedPolicies = (
  policies: readonly PublishedPolicy[],
): PolicyListSection[] => {
  const platform: PublishedPolicy[] = [];
  const operatorBuckets = new Map<string, PublishedPolicy[]>();

  for (const policy of policies) {
    if (!policy.operatorId) {
      platform.push(policy);
      continue;
    }
    const existing = operatorBuckets.get(policy.operatorId);
    if (existing) {
      existing.push(policy);
    } else {
      operatorBuckets.set(policy.operatorId, [policy]);
    }
  }

  const sections: PolicyListSection[] = [];
  if (platform.length > 0) {
    sections.push({ source: 'platform', operatorId: null, items: platform });
  }
  for (const [operatorId, items] of operatorBuckets) {
    sections.push({ source: 'operator', operatorId, items });
  }
  return sections;
};

export type PolicyListRow =
  | { type: 'header'; id: string; source: PolicySource }
  | {
      type: 'policy';
      id: string;
      title: string;
      description: string;
      category: string;
      source: PolicySource;
      updatedAt: string;
    };

export const flattenPolicySections = (
  sections: readonly PolicyListSection[],
): PolicyListRow[] => {
  const rows: PolicyListRow[] = [];
  for (const section of sections) {
    rows.push({
      type: 'header',
      id: `header:${section.source}:${section.operatorId ?? 'platform'}`,
      source: section.source,
    });
    for (const policy of section.items) {
      rows.push({
        type: 'policy',
        id: policy.id,
        title: policy.title,
        description: policy.description.trim(),
        category: policy.category,
        source: policySourceOf(policy),
        updatedAt: policy.updatedAt,
      });
    }
  }
  return rows;
};

export const flattenPublishedPolicyPages = (
  pages: readonly { items: readonly PublishedPolicy[] }[],
): PublishedPolicy[] => {
  const seen = new Set<string>();
  const items: PublishedPolicy[] = [];
  for (const page of pages) {
    for (const policy of page.items) {
      if (seen.has(policy.id)) continue;
      seen.add(policy.id);
      items.push(policy);
    }
  }
  return items;
};

export const POLICY_ERROR_KEYS = {
  POLICY_NOT_FOUND: 'policy.errors.notFound',
} as const;
