# RoomCraft — review-decision playbook

Self-contained, executable instructions for handling a maintainer's decision —
**approve** or **changes-requested / close** — on the open Claude PR.

Written so a **fresh session** (e.g. one started by a Routine, which carries no
prior conversation) can run it top to bottom. The *why* lives in
[`../AGENT-WORKFLOW.md`](../AGENT-WORKFLOW.md); this is the checklist that both the
Routine and a live `subscribe_pr_activity` session follow, so behaviour is identical
whichever path triggers it.

Everything it needs is in the repo — nothing depends on session memory:

- Repo: `JonasHazell/roomcraft` · Claude branches: `claude/*`
- Protocol: [`../AGENT-WORKFLOW.md`](../AGENT-WORKFLOW.md)
- Ledger you read and update: [`../PREFERENCES.md`](../PREFERENCES.md)

## 0. Orient

Read `docs/AGENT-WORKFLOW.md` and `docs/PREFERENCES.md`. That is the full context.

## 1. Find the PR and its decision

- List **open** PRs from `claude/*` branches; also check **recently closed** ones
  from `claude/*` (a rejection is often a close).
- For the target PR, read: review states (`APPROVED` / `CHANGES_REQUESTED` /
  `COMMENTED`), PR state (open / closed / merged), and the latest maintainer
  comment or review body (may be Swedish or English).
- No PR and nothing unprocessed → **nothing to do. End.**

## 2. Idempotency — never act twice

This can re-fire (cron re-runs, overlapping subscription events). Before any write:

- If `PREFERENCES.md`'s **Rejection log** already has a row for this PR **and** the
  decision has not changed since → **End silently.**
- Act only on the newest, unprocessed decision.

## 3. Classify the outcome

- `APPROVED` or merged → **§4 Approve.**
- `CHANGES_REQUESTED`, or closed-unmerged with a reason, or a comment clearly
  saying no → **§5 Reject.**
- Only a question/comment, no decision → answer it (or ask via `AskUserQuestion`).
  Do **not** record a lesson. End.

## 4. Approve

1. If the comment praises a specific choice, record it as a **Direction** or
   **Execution** signal in `PREFERENCES.md` (dedupe — skip if this PR is already
   cited). Commit `docs: record preference from PR #NN approval` and push.
2. **Merge:** leave to the maintainer by default. Approval and merge are separate
   actions; do not merge your own PR unless merge-on-approval has been explicitly
   enabled (then approval is your authorization).
3. End.

## 5. Reject — the learning step

Run this in order; the learning commit is the deliverable even if the code is thrown
away.

1. **Classify** direction vs execution (see the table in `AGENT-WORKFLOW.md`). If
   genuinely ambiguous, `AskUserQuestion` before acting.
2. **Distil a general rule** — one that applies to the next feature, not a
   restatement of this PR.
3. **Update `PREFERENCES.md`:** put the rule under **Direction**, **Execution**, or
   **Avoid** (generalise, dedupe, merge with any existing rule), and append one row
   to the **Rejection log** citing the PR.
4. **Commit** `docs: record preference from PR #NN feedback` and push.
5. **Then the PR action:** *direction* → **close** the PR; *execution* → **revise**
   the same PR to match the feedback.
6. End.

## Invariants

- One open Claude PR at a time; never merge without maintainer approval.
- Safe to re-run — step 2 guarantees no double-recording.
- Same behaviour whether triggered by a Routine (fresh session) or a live
  `subscribe_pr_activity` event.
