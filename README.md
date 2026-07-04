# Rumskiss

Ett hjälpmedel för att inreda rum: rita upp rummet med mått, dörrar och fönster,
och möblera det i en 3D-vy.

## Funktioner

- 2D-planritning där rummets form ritas fritt: ytterväggar som sluten kontur
  (L-form, T-form m.m.) och valfria innerväggar — 90°-vinklar med snap till 0,1 m
- Dörrar och fönster per vägg med position, bredd, höjd och höjd över golv —
  markera en vägg i 3D-vyn eller planritningen och lägg till
- 3D-vy med orbit-kamera — ytterväggarna närmast kameran döljs automatiskt
- Möbler (säng, soffa, bord, stol, garderob, bokhylla, matta, egen låda) med
  egna mått, färg och rotation; dras runt på golvet och hålls innanför ytterväggarna
- Färger på golv, väggar och varje möbel
- Autosparning, namngivna sparningar (localStorage) samt export/import som JSON-fil —
  äldre sparningar (schema v1) migreras automatiskt

## Kortkommandon

- **R** — rotera vald möbel 90°
- **Delete/Backspace** — ta bort vald möbel eller innervägg
- **Esc** — avmarkera / avbryt pågående ritning
- **Enter** — avsluta innerväggskedja i planritningen

## Kom igång

```bash
npm install
npm run dev
```

Byggd med React, TypeScript, Vite, three.js (@react-three/fiber + drei), zustand och zod.
Tester körs med `npm test` (vitest).
