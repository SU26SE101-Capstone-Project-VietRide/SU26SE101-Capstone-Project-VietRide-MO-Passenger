import fs from 'node:fs';
import path from 'node:path';

interface CatalogCase {
  id: string;
  recommendedTier: string;
}

interface Catalog {
  cases: CatalogCase[];
}

interface AutomationEvidence {
  caseId: string;
  testFile: string;
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CASE_DIRECTORY = path.join(__dirname, 'cases');
const cases = new Map(
  fs
    .readdirSync(CASE_DIRECTORY)
    .filter(fileName => fileName.endsWith('.json'))
    .flatMap(
      fileName =>
        (
          JSON.parse(
            fs.readFileSync(path.join(CASE_DIRECTORY, fileName), 'utf8'),
          ) as Catalog
        ).cases,
    )
    .map(testCase => [testCase.id, testCase]),
);
const evidence = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'automation-evidence.json'), 'utf8'),
) as AutomationEvidence[];

describe('Functional automation evidence', () => {
  it('maps each automated case to an existing Jest-tier catalog entry', () => {
    expect(evidence.length).toBeGreaterThan(0);
    expect(new Set(evidence.map(item => item.caseId)).size).toBe(
      evidence.length,
    );

    for (const item of evidence) {
      expect(cases.get(item.caseId)?.recommendedTier).toBe('jest');
      expect(fs.existsSync(path.join(PROJECT_ROOT, item.testFile))).toBe(true);
    }
  });

  it('keeps the Excel ID in the executable test source', () => {
    for (const item of evidence) {
      const source = fs.readFileSync(
        path.join(PROJECT_ROOT, item.testFile),
        'utf8',
      );
      expect(source).toContain(`[${item.caseId}]`);
    }
  });
});
