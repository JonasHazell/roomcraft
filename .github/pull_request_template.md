<!--
  RoomCraft PR template. Fill in every section that applies and delete the
  guidance comments before submitting.
-->

## What & why

<!-- What does this change do, and why? Link any related issue or doc. -->



## Does this change the GUI?

<!-- Tick one. A "user-facing surface" is any screen, panel, dialog, control,
     field, or a visual tweak — see docs/DESIGN.md. -->

- [ ] **Yes** — it changes a user-facing surface. **Attach media below (required).**
- [ ] **No** — no visible change (logic, docs, tooling, tests only).

### 🎥 GUI change — show it in action (required)

<!--
  So a reviewer can SEE the change without checking it out and clicking around,
  show it in action. RoomCraft is mobile-first, so cover BOTH viewports whenever
  the change is visible in both — a short screen recording (.mp4 / .mov / .gif) or
  before / after screenshots.

  HOW you attach media depends on how the PR was opened. Pick one and delete the
  other, then delete this whole section if you ticked "No" above.
-->

<!--
  ► PATH A — opened in the browser (GitHub web UI). BEST result: inline media.
    Drag a file into the table cells or paste an image/video — GitHub uploads it
    to its CDN and shows it inline. Keep this table; delete Path B.
-->

| | Before | After |
| --- | --- | --- |
| **Desktop** | | |
| **Mobile** | | |

<!--
  ► PATH B — opened through the API or CLI (the agent pipeline, `gh`, a script).
    You can't attach inline media this way: there's no browser to drag into,
    GitHub has no attachment API, and the posting layer strips both image embeds
    (`![](…)`) and any link whose URL ends in an image extension — so an image
    can't be rendered OR directly linked. What works is linking the committed
    FOLDER (a URL with no image extension survives the filter). The helper does it:

        node scripts/pr-media.mjs after-desktop.png after-mobile.png

    It copies the files into `.github/pr-media/<branch>/` and prints the line
    below. Commit the copied files on this branch, paste the link here, and delete
    Path A's table. The screenshots also render in this PR's "Files changed" tab.

    These committed files are temporary: when the PR merges, a workflow removes the
    folder from the base branch so media doesn't pile up in `main`. The "Files
    changed" tab keeps them viewable forever, so the folder link is just a
    review-time convenience.
-->

📸 **Screenshots for this PR:** _paste the folder link from `scripts/pr-media.mjs` here_ · they also render in the **Files changed** tab



## How I validated it

<!-- Per CLAUDE.md, any user-facing change must be driven in the real app in
     both a desktop and a mobile viewport, not just unit-tested. -->

- [ ] Added or extended an e2e spec in `e2e/` covering the new/changed flow
- [ ] `npm run test:e2e` passes (desktop **and** mobile)
- [ ] `npm run build`, `npm run lint`, and `npm test` pass

## Design consistency (for GUI changes)

<!-- See docs/DESIGN.md and the #styleguide gallery. -->

- [ ] Reused existing primitives (`.btn`, `.field-input`, `.card`, `.modal`, …) — no new one-offs
- [ ] No hard-coded colours/fonts/radii/shadows — used `var(--token)` from `:root`
- [ ] Icons via the shared `Icon` component
- [ ] Any genuinely new primitive is added to `StyleGuide.tsx` and documented in `docs/DESIGN.md`
