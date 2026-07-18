'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const expoPackagePath = require.resolve('expo/package.json');
const expoCliPath = path.join(path.dirname(expoPackagePath), 'bin', 'cli');
const forwardedArguments = process.argv.slice(2);
const hasHostOption = forwardedArguments.some((argument) =>
  ['--lan', '--localhost', '--tunnel'].includes(argument),
);

const result = spawnSync(
  process.execPath,
  [
    expoCliPath,
    'start',
    ...(hasHostOption ? [] : ['--lan']),
    ...forwardedArguments,
  ],
  {
    env: {
      ...process.env,
      CI: '1',
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? (result.signal === 'SIGINT' ? 130 : 1);
