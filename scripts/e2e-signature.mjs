import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Directories whose changes must be validated with Playwright before finishing.
// This is the app's UI/feature code — the surface e2e is meant to guard.
const WATCHED = ['src'];

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/**
 * A deterministic signature of the current UI/feature changes relative to HEAD
 * (tracked edits plus new untracked files under the watched dirs). Returns an
 * empty string when there is nothing to validate, so callers can treat "no
 * signature" as "no UI change".
 */
export function sourceSignature() {
  const parts = [];
  for (const dir of WATCHED) {
    parts.push(sh(`git diff HEAD -- ${dir}`));
    const untracked = sh(`git ls-files --others --exclude-standard -- ${dir}`)
      .split('\n')
      .filter(Boolean);
    for (const file of untracked) {
      parts.push(`+++ ${file}`);
      try {
        parts.push(readFileSync(file, 'utf8'));
      } catch {
        /* ignore unreadable files */
      }
    }
  }
  const blob = parts.join('\n');
  if (!blob.trim()) return '';
  return createHash('sha256').update(blob).digest('hex');
}

export const STAMP_PATH = '.claude/.e2e-stamp';
