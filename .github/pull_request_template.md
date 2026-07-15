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

### 🎥 GUI change — attach a film or a screenshot (required)

<!--
  So a reviewer can SEE the change without checking it out and clicking around,
  attach media that shows it in action. RoomCraft is mobile-first, so show BOTH
  viewports whenever the change is visible in both:
    • A short screen recording (.mp4 / .mov / .gif) of the flow, OR
    • Before / after screenshots.

  TWO ways to get media into this PR — pick the one that matches how you opened it:

  1. Opening the PR in your browser (GitHub web UI)?
     Drag a file into the box or paste an image/video — GitHub uploads it to its
     CDN and inserts a working link for you. Done.

  2. Opening the PR through the API or CLI (the agent pipeline, `gh`, a script)?
     There is NO browser to drag into, and GitHub has no API to upload an
     attachment — a bare filename becomes a DEAD link you can't click. Instead,
     commit the media into this branch and embed it with an absolute raw URL,
     which renders inline. The helper does both for you:

         node scripts/pr-media.mjs after-desktop.png after-mobile.png --table

     It copies the files into .github/pr-media/<branch>/ and prints ready-to-paste
     markdown. Commit the copied files on this branch, then paste the markdown
     into the table below. (Committed .mp4/.mov show as a link, not a player —
     prefer a short .gif or screenshots for API/CLI-opened PRs.)

  Delete this whole section if you ticked "No" above.
-->

| | Before | After |
| --- | --- | --- |
| **Desktop** | | |
| **Mobile** | | |



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
