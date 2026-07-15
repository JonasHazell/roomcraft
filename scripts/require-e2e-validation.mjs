import { readFileSync } from 'node:fs';
import { sourceSignature, STAMP_PATH } from './e2e-signature.mjs';

/**
 * Stop hook: refuses to let the session finish while UI/feature changes under
 * src/ have not been validated with Playwright in desktop + mobile.
 *
 * The harness runs this deterministically — it does not depend on the model
 * remembering to validate. `npm run test:e2e` writes a stamp of the validated
 * source state (see e2e-validate.mjs); this compares the current state to it.
 */

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  /* no/'malformed stdin — treat as empty */
}

// Anti-loop backstop: if we already blocked once and the session is continuing
// as a result, don't block again — surface it once and let work proceed.
if (payload.stop_hook_active) process.exit(0);

const signature = sourceSignature();
if (!signature) process.exit(0); // no UI/feature changes → nothing to validate

let stamp = '';
try {
  stamp = readFileSync(STAMP_PATH, 'utf8').trim();
} catch {
  /* no stamp yet */
}

if (stamp === signature) process.exit(0); // current changes already validated

const message = [
  'Blocked: UI/feature changes under src/ have not been validated with Playwright.',
  '',
  'Run:  npm run test:e2e',
  '',
  'This drives the app in BOTH a desktop and a mobile viewport. Then:',
  '  • Fix any failures.',
  '  • Add/extend a spec in e2e/ that exercises the feature you changed,',
  '    so it is covered in desktop and mobile.',
  '  • Re-run until green — a passing run stamps these changes as validated.',
  '',
  "If the app genuinely can't run here, say so explicitly instead of finishing silently.",
].join('\n');

process.stderr.write(message + '\n');
process.exit(2); // exit 2 feeds stderr back to Claude, which must address it
