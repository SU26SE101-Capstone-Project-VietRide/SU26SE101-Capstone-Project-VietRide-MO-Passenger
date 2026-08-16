import type { PublishedPolicy } from '../types/policy';
import {
  flattenPolicySections,
  flattenPublishedPolicyPages,
  groupPublishedPolicies,
  policyCategoryLabel,
  policySourceOf,
} from './policyPresentation';

const policy = (
  overrides: Partial<PublishedPolicy> & Pick<PublishedPolicy, 'id'>,
): PublishedPolicy => ({
  operatorId: null,
  title: 'Policy',
  description: 'Description',
  content: 'Content',
  category: 'REFUND',
  version: 1,
  createdAt: '2026-08-15T10:00:00.000Z',
  updatedAt: '2026-08-15T10:00:00.000Z',
  ...overrides,
});

const PLATFORM_ID = '11111111-1111-4111-8111-111111111111';
const OPERATOR_POLICY_ID = '22222222-2222-4222-8222-222222222222';
const OPERATOR_ID = '44444444-4444-4444-8444-444444444444';

describe('policyPresentation', () => {
  it('classifies platform vs operator by operatorId', () => {
    expect(policySourceOf(policy({ id: PLATFORM_ID, operatorId: null }))).toBe('platform');
    expect(policySourceOf(policy({
      id: OPERATOR_POLICY_ID,
      operatorId: OPERATOR_ID,
    }))).toBe('operator');
  });

  it('translates known categories and leaves unknown tokens readable', () => {
    const translate = (key: string) => key;

    expect(policyCategoryLabel('REFUND', translate)).toBe('policy.categories.REFUND');
    expect(policyCategoryLabel('CUSTOM_FEE', translate)).toBe('CUSTOM FEE');
  });

  it('groups platform policies ahead of operator policies', () => {
    const operator = policy({
      id: OPERATOR_POLICY_ID,
      operatorId: OPERATOR_ID,
      title: 'Hành lý nhà xe',
    });
    const platform = policy({ id: PLATFORM_ID, title: 'Hoàn vé' });

    const sections = groupPublishedPolicies([operator, platform]);

    expect(sections).toEqual([
      { source: 'platform', operatorId: null, items: [platform] },
      { source: 'operator', operatorId: OPERATOR_ID, items: [operator] },
    ]);
  });

  it('flattens sections into typed list rows and de-duplicates pages', () => {
    const platform = policy({ id: PLATFORM_ID, description: '  ' });
    const rows = flattenPolicySections(groupPublishedPolicies([platform]));

    expect(rows).toEqual([
      { type: 'header', id: 'header:platform:platform', source: 'platform' },
      {
        type: 'policy',
        id: PLATFORM_ID,
        title: 'Policy',
        description: '',
        category: 'REFUND',
        source: 'platform',
        updatedAt: platform.updatedAt,
      },
    ]);

    expect(flattenPublishedPolicyPages([
      { items: [platform] },
      { items: [platform] },
    ])).toEqual([platform]);
  });
});
