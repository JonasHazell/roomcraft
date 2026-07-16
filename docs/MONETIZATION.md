# RoomCraft — Monetization Ideas

Different ways to make money from RoomCraft, tailored to what the app already
does: a 3D/2D room planner with a furniture catalog, AI-generated layout
proposals, and a rule-based interior-design validation ("design score").

> **Parked idea bank, not a mandate.** Monetization is deferred while the core
> experience is built (see [`STRATEGY.md`](STRATEGY.md#monetization-is-parked--for-now)).
> Several ideas below — affiliate links, a "Buy this room" flow, B2B licensing — are
> where [`VISION.md`](VISION.md)'s long-term marketplace destination eventually points;
> keep them here until that phase is deliberately opened.

## 1. Freemium / subscription (likely the core)

The most natural model for a tool people return to.

- **Free tier:** 1–2 saved rooms, basic furniture, limited 3D export.
- **Pro (e.g. $8–13/month):**
  - Unlimited rooms & projects
  - Unlimited AI layout proposals (`AiProposalsPanel` — cap generations per
    month on the free tier)
  - Full validation / "design score" with detailed feedback
    (`ValidationPanel` / `ValidationScore` are clear premium hooks)
  - High-resolution export (PNG/PDF/3D view) for sharing with tradespeople
- **Why it fits:** AI generations and validation cost you money (API calls), so
  they map perfectly onto paid features.

## 2. Furniture catalog as a revenue source

The `furnitureCatalog.ts` catalog is a gold mine.

- **Affiliate / partner links:** connect catalog furniture to real products
  (IKEA, Wayfair, etc.) and earn commission when users click/buy. This is often
  the most profitable channel for planner apps.
- **Sponsored furniture / brands:** brands pay to have their products available
  as choices in the catalog.
- **"Buy this room" button:** generate a shopping list from the plan → earn
  commission on the whole cart.

## 3. One-off purchases / credits

- **Credit system** for AI proposals (e.g. a small fee for a batch of new AI
  layouts) — good for users who don't want a subscription.
- **Export credits** — pay per PDF / 3D export.

## 4. B2B / professional

Often much higher willingness to pay than consumers.

- **Licenses for interior designers, realtors, landlords** — team accounts,
  branding, client presentations.
- **White-label** for furniture stores that want a planner on their own site.
- **API / embed** — sell the planner as a widget to e-commerce sites.

## 5. Other

- **Content packs:** premium furniture packs, style themes, textures.
- **One-off "Pro Lifetime"** for early adopters.

## Recommendation for RoomCraft

A **combination** works best here:

1. **Freemium** with AI proposals + validation + export as Pro features (drives
   subscriptions).
2. **Affiliate on the furniture catalog** (passive revenue without annoying the
   user).
3. Later: **B2B licenses** once the product is mature.

The affiliate model is the lowest-hanging fruit because it doesn't require a
paywall, and freemium around AI/validation matches exactly the features that
already cost you to run.
