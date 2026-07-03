# Rumskiss

Ett hjälpmedel för att inreda rum: rita upp rummet med mått, dörrar och fönster,
och möblera det i en 3D-vy.

## Funktioner

- Rektangulärt rum med bredd × längd × takhöjd
- Dörrar och fönster per vägg med position, bredd, höjd och höjd över golv
- 3D-vy med orbit-kamera — väggarna närmast kameran döljs automatiskt
- Möbler (säng, soffa, bord, stol, garderob, bokhylla, matta, egen låda) med
  egna mått, färg och rotation; dras runt på golvet och kan inte hamna utanför väggarna
- Färger på golv, väggar och varje möbel
- Autosparning, namngivna sparningar (localStorage) samt export/import som JSON-fil

## Kortkommandon

- **R** — rotera vald möbel 90°
- **Delete/Backspace** — ta bort vald möbel
- **Esc** — avmarkera

## Kom igång

```bash
npm install
npm run dev
```

Byggd med React, TypeScript, Vite, three.js (@react-three/fiber + drei), zustand och zod.
