import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { sourceSignature, STAMP_PATH } from './e2e-signature.mjs';

// Run Playwright across both viewport projects (desktop + mobile). Any extra CLI
// args are forwarded, e.g. `npm run test:e2e -- --project=mobile smoke`.
const res = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (res.status === 0) {
  // Record the exact source state that just passed, so the Stop hook knows these
  // changes have been validated. Editing src/ again invalidates the stamp.
  mkdirSync(dirname(STAMP_PATH), { recursive: true });
  writeFileSync(STAMP_PATH, sourceSignature());
  process.stdout.write(
    '\n✓ Playwright validation passed in desktop + mobile — changes stamped as validated.\n',
  );
}

process.exit(res.status ?? 1);
