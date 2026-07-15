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
  attach media that shows it in action. Drag a file into this box or paste an
  image/video — GitHub uploads it and inserts the link for you.

  RoomCraft is mobile-first, so show BOTH viewports whenever the change is
  visible in both:
    • A short screen recording (.mp4 / .mov / .gif) of the flow, OR
    • Before / after screenshots.

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
