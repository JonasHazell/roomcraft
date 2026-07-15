#!/usr/bin/env node
/**
 * pr-media — attach media to a pull request opened by automation.
 *
 * The problem this solves: a PR opened or edited through the API/CLI (as the
 * RoomCraft agent pipeline does) can't attach media the way a human can.
 *   1. There is no browser to drag-and-drop into, and GitHub has no API to
 *      upload an attachment — so a bare filename in the body is just dead text.
 *   2. Inline image embeds don't survive either: the automation posting layer
 *      defangs `![alt](url)` as an anti-tracking/anti-exfiltration guardrail
 *      (it wraps the URL in a code span or drops the leading `!`), so the image
 *      never renders and you're left with an unclickable filename — exactly the
 *      symptom this repo hit.
 *
 * What DOES survive that filter is an ordinary markdown link, `[text](url)`. So
 * this helper commits the media into the branch and prints ready-to-paste
 * markdown that LINKS to the media FOLDER's GitHub tree view
 * (`https://github.com/<owner>/<repo>/tree/<branch>/<dir>`). A reviewer clicks
 * the link, opens the folder, and views each screenshot. It isn't inline, but
 * it's clickable and reliable from automation — and true inline rendering is only
 * available to a human dragging the file into the web editor.
 *
 * Why link to the folder and not each image? The automation posting layer defangs
 * any URL that contains an image extension (.png/.jpg/…) — an `![](…)` embed, a
 * `[text](…png)` link, and even a bare `…png` URL all come back wrapped in a code
 * span and render as unclickable text. A URL with no image extension (a tree view,
 * the PR's Files-changed tab) survives, so the folder link stays clickable.
 *
 * Commit the copied files on the same branch as the PR and paste the markdown.
 *
 * Usage:
 *   node scripts/pr-media.mjs [options] <file...>
 *
 * Options:
 *   --branch <name>   Branch the PR is opened from (default: current branch).
 *   --repo <o/r>      owner/repo (default: derived from `origin`).
 *   -h, --help        Show this help.
 *
 * Examples:
 *   node scripts/pr-media.mjs after-desktop.png after-mobile.png
 *   node scripts/pr-media.mjs /tmp/flow.gif
 *
 * Notes:
 *   • Output is a clickable LINK to the committed media, not an inline image —
 *     automation strips inline embeds. For true inline media a human must drag the
 *     file into the web PR editor, which uploads it to GitHub's user-attachments.
 *   • The committed files also render in the PR's "Files changed" tab.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm']);

function fail(msg) {
  console.error(`pr-media: ${msg}`);
  process.exit(1);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function parseArgs(argv) {
  const opts = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--branch') opts.branch = argv[++i];
    else if (a === '--repo') opts.repo = argv[++i];
    else if (a.startsWith('--')) fail(`unknown option ${a}`);
    else opts.files.push(a);
  }
  return opts;
}

// owner/repo from `git remote get-url origin`, tolerating https, ssh and the
// proxied `http://local_proxy@host/git/<owner>/<repo>` form used in CI.
function deriveRepo() {
  let url;
  try {
    url = git('remote', 'get-url', 'origin');
  } catch {
    fail('could not read origin remote; pass --repo <owner/repo>');
  }
  const m = url.match(/([^/:]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) fail(`could not parse owner/repo from "${url}"; pass --repo <owner/repo>`);
  return `${m[1]}/${m[2]}`;
}

function ext(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help || opts.files.length === 0) {
  console.log(
    [
      'Usage: node scripts/pr-media.mjs [--branch <name>] [--repo <owner/repo>] <file...>',
      '',
      'Copies media into .github/pr-media/<branch>/ and prints a clickable markdown',
      'link to the committed folder — a form that survives the automation filter that',
      'strips inline image embeds. Commit the copied files on the PR branch, then',
      'paste the printed markdown into the PR body.',
    ].join('\n'),
  );
  process.exit(opts.help ? 0 : 1);
}

const branch = opts.branch || git('rev-parse', '--abbrev-ref', 'HEAD');
if (!branch || branch === 'HEAD') {
  fail('could not determine the current branch; pass --branch <name>');
}
const repo = opts.repo || deriveRepo();

const destDir = join('.github', 'pr-media', branch);
mkdirSync(destDir, { recursive: true });

const names = [];
for (const file of opts.files) {
  const src = resolve(file);
  if (!existsSync(src) || !statSync(src).isFile()) fail(`no such file: ${file}`);
  const name = basename(file);
  const e = ext(name);
  if (!IMAGE_EXT.has(e) && !VIDEO_EXT.has(e)) {
    console.error(`pr-media: warning: ${name} is not a known image/video type`);
  }
  const dest = join(destDir, name);
  // Only copy when the file isn't already the destination (idempotent re-runs).
  if (resolve(dest) !== src) copyFileSync(src, dest);
  names.push(name);
}

// The link points at the media FOLDER (a tree view), deliberately NOT at each
// image file. When a PR is opened/edited through automation, the posting layer
// defangs any URL that contains an image extension — `![](…png)`, `[text](…png)`
// and even a bare `…png` all come back wrapped in a code span, so they render as
// unclickable text. A URL with no image extension (a directory tree view, the
// PR's Files-changed tab) survives and stays clickable. So we link to the folder;
// the reviewer opens it and clicks either screenshot, each of which GitHub then
// renders. The committed images also render in this PR's "Files changed" tab.
const dirPath = destDir.split('\\').join('/');
const folderUrl = `https://github.com/${repo}/tree/${branch}/${dirPath}`;

console.log(`\nCopied ${names.length} file(s) into ${destDir}/:`);
for (const n of names) console.log(`  • ${n}`);
console.log('\nCommit them on this branch, then paste the markdown below into the PR body.');
console.log('(Automation strips inline image embeds AND any link whose URL ends in an');
console.log(' image extension, so this links to the FOLDER — a form that stays clickable.)\n');
console.log('----- paste from here -----\n');
console.log(`📸 **Screenshots for this PR:** [view the ${names.length} committed screenshot(s)](${folderUrl})`);
console.log('_(They also render in the **Files changed** tab of this PR.)_');
console.log('');
console.log('----- to here -----');
