import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const localeDirectory = path.join(
  projectRoot,
  'src',
  'shared',
  'i18n',
  'locales',
);
const sourceDirectory = path.join(projectRoot, 'src');

const readJson = async filePath =>
  JSON.parse(await readFile(filePath, 'utf8'));

const flattenKeys = (value, prefix = '', output = new Set()) => {
  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenKeys(child, nextKey, output);
    } else {
      output.add(nextKey);
    }
  }
  return output;
};

const collectSourceFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
      continue;
    }
    if (
      /\.(ts|tsx)$/.test(entry.name)
      && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
    ) {
      files.push(fullPath);
    }
  }

  return files;
};

const enKeys = flattenKeys(
  await readJson(path.join(localeDirectory, 'en.json')),
);
const viKeys = flattenKeys(
  await readJson(path.join(localeDirectory, 'vi.json')),
);
const errors = [];

for (const key of enKeys) {
  if (!viKeys.has(key)) {
    errors.push(`Missing in vi.json: ${key}`);
  }
}
for (const key of viKeys) {
  if (!enKeys.has(key)) {
    errors.push(`Missing in en.json: ${key}`);
  }
}

const hasTranslationKey = key =>
  enKeys.has(key)
  || (
    enKeys.has(`${key}_one`)
    && enKeys.has(`${key}_other`)
    && viKeys.has(`${key}_one`)
    && viKeys.has(`${key}_other`)
  );

const translationCallPattern = /\bt\(\s*['"`]([^'"`]+)['"`]/g;
const literalFallbackPattern = /\bt\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]/;
for (const filePath of await collectSourceFiles(sourceDirectory)) {
  const source = await readFile(filePath, 'utf8');

  if (literalFallbackPattern.test(source)) {
    errors.push(
      `Literal translation fallback in ${path.relative(projectRoot, filePath)}`,
    );
  }

  for (const match of source.matchAll(translationCallPattern)) {
    const key = match[1];
    // Template-literal keys are resolved from a finite domain at runtime and
    // must be covered by their namespace entries, not treated as one literal.
    if (key.includes('${')) {
      continue;
    }
    if (!hasTranslationKey(key)) {
      errors.push(
        `Missing referenced key ${key} in ${path.relative(projectRoot, filePath)}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `i18n check passed: ${enKeys.size} locale keys with EN/VI parity.`,
  );
}
