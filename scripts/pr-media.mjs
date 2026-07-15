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
 * markdown that LINKS to each file's GitHub blob view
 * (`https://github.com/<owner>/<repo>/blob/<branch>/<path>`). A reviewer clicks
 * the link and sees the screenshot rendered in GitHub's UI. It isn't inline, but
 * it's clickable and reliable from automation — and true inline rendering is only
 * available to a human dragging the file into the web editor.
 *
 * Commit the copied files on the same branch as the PR and paste the markdown.
 *
 * Usage:
 *   node scripts/pr-media.mjs [options] <file...>
 *
 * Options:
 *   --branch <name>   Branch the PR is opened from (default: current branch).
 *   --repo <o/r>      owner/repo (default: derived from `origin`).
 *   --table           Also print a filled Before/After × Desktop/Mobile table.
 *                     Files are matched into cells by name: a name containing
 *                     "before"/"after" and "desktop"/"mobile" lands in that cell.
 *   -h, --help        Show this help.
 *
 * Examples:
 *   node scripts/pr-media.mjs after-desktop.png after-mobile.png --table
 *   node scripts/pr-media.mjs /tmp/flow.gif
 *
 * Notes:
 *   • Output is clickable LINKS, not inline images — automation strips inline
 *     image embeds (see above). For true inline media a human must drag the file
 *     into the web PR editor, which uploads it to GitHub's user-attachments.
 *   • Links point at the blob view, which renders png/jpg/gif/svg (and plays
 *     mp4/mov/webm) in GitHub's UI on click.
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
  const opts = { files: [], table: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--table') opts.table = true;
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
      'Usage: node scripts/pr-media.mjs [--branch <name>] [--repo <owner/repo>] [--table] <file...>',
      '',
      'Copies media into .github/pr-media/<branch>/ and prints markdown that embeds',
      'it via an absolute raw URL, so it renders inline in an API/CLI-opened PR.',
      'Commit the copied files on the PR branch, then paste the printed markdown.',
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

const embeds = [];
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

  // Emit a plain markdown LINK, not an image embed (`![]()`). When a PR is
  // opened/edited through automation, the posting layer defangs image embeds as
  // an anti-tracking / anti-exfiltration guardrail — it wraps the `![]()` URL in
  // a code span or drops the leading `!`, so the image never renders and you're
  // left with an unclickable filename. A normal `[text](url)` link survives that
  // filter and stays clickable. The github.com/.../blob/... view shows the image
  // in GitHub's UI when clicked.
  const path = `${destDir.split('\\').join('/')}/${name}`;
  const url = `https://github.com/${repo}/blob/${branch}/${path}`;
  const alt = name.replace(e, '').replace(/[-_]+/g, ' ').trim() || 'media';
  embeds.push({ name, url, alt, isVideo: VIDEO_EXT.has(e) });
}

const cell = (needleA, needleB) => {
  const hit = embeds.find(
    (m) => m.name.toLowerCase().includes(needleA) && m.name.toLowerCase().includes(needleB),
  );
  return hit ? `[${hit.alt}](${hit.url})` : '';
};

console.log(`\nCopied ${embeds.length} file(s) into ${destDir}/`);
console.log('Commit them on this branch, then paste the markdown below into the PR body.');
console.log('(These are clickable LINKS — automation strips inline image embeds, so a');
console.log(' reviewer clicks through to view each screenshot on GitHub.)\n');
console.log('----- paste from here -----\n');

if (opts.table) {
  console.log('| | Desktop | Mobile |');
  console.log('| --- | --- | --- |');
  console.log(`| **Before** | ${cell('before', 'desktop')} | ${cell('before', 'mobile')} |`);
  console.log(`| **After** | ${cell('after', 'desktop')} | ${cell('after', 'mobile')} |`);
  console.log('');
} else {
  for (const m of embeds) {
    console.log(`- [${m.alt}](${m.url})`);
  }
  console.log('');
}

console.log('----- to here -----');
