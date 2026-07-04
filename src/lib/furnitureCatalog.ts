import type { FurnitureKind, FurnitureSize } from '../types';

export interface CatalogEntry {
  label: string;
  defaultSize: FurnitureSize;
  defaultColor: string;
  /**
   * Var möbelns framsida sitter (lokal +z), i klartext — används i AI-prompten så
   * att `facing`-punkten pekar åt rätt håll. Framsidan är alltid lokal +z i modellen.
   */
  front: string;
  /**
   * Fri yta (meter) som måste finnas framför framsidan och gå att nå från en dörr
   * för att möbeln ska vara användbar. 0 = ingen egen åtkomstzon krävs.
   */
  accessDepth: number;
  /** Hindrar passage: räknas som hinder i nåbarhetsanalysen (höga/solida möbler). */
  blocks: boolean;
}

export const FURNITURE_CATALOG: Record<FurnitureKind, CatalogEntry> = {
  bed: {
    label: 'Säng',
    defaultSize: { width: 1.6, depth: 2.0, height: 0.5 },
    defaultColor: '#7d8c72',
    front: 'fotändan (huvudgaveln sitter på baksidan, mot vägg)',
    accessDepth: 0.6,
    blocks: true,
  },
  sofa: {
    label: 'Soffa',
    defaultSize: { width: 2.2, depth: 0.9, height: 0.8 },
    defaultColor: '#b06a45',
    front: 'sittsidan (ryggen sitter på baksidan)',
    accessDepth: 0.5,
    blocks: true,
  },
  table: {
    label: 'Bord',
    defaultSize: { width: 1.4, depth: 0.8, height: 0.75 },
    defaultColor: '#9b7350',
    front: 'långsidan man sitter vid',
    accessDepth: 0.6,
    blocks: true,
  },
  chair: {
    label: 'Stol',
    defaultSize: { width: 0.45, depth: 0.45, height: 0.9 },
    defaultColor: '#4a453c',
    front: 'sittsidan (ryggstödet sitter på baksidan)',
    accessDepth: 0,
    blocks: false,
  },
  desk: {
    label: 'Skrivbord',
    defaultSize: { width: 1.2, depth: 0.7, height: 0.74 },
    defaultColor: '#8f7a5e',
    front: 'sittsidan (skärmen står mot baksidan)',
    accessDepth: 0.8,
    blocks: true,
  },
  nightstand: {
    label: 'Nattduksbord',
    defaultSize: { width: 0.45, depth: 0.4, height: 0.55 },
    defaultColor: '#a08b6f',
    front: 'lådsidan (ställs intill sängens huvudända)',
    accessDepth: 0,
    blocks: true,
  },
  tv: {
    label: 'TV',
    defaultSize: { width: 1.3, depth: 0.35, height: 0.85 },
    defaultColor: '#3a3a3d',
    front: 'skärmsidan (ryggen mot vägg)',
    accessDepth: 0,
    blocks: true,
  },
  mirror: {
    label: 'Spegel',
    defaultSize: { width: 0.6, depth: 0.05, height: 1.7 },
    defaultColor: '#b9c4c9',
    front: 'glassidan (ryggen mot vägg)',
    accessDepth: 0,
    blocks: true,
  },
  plant: {
    label: 'Växt',
    defaultSize: { width: 0.4, depth: 0.4, height: 1.2 },
    defaultColor: '#5d7a4e',
    front: 'ingen riktning (kruka på golvet)',
    accessDepth: 0,
    blocks: true,
  },
  wardrobe: {
    label: 'Garderob',
    defaultSize: { width: 1.2, depth: 0.6, height: 2.0 },
    defaultColor: '#ded5c2',
    front: 'dörrsidan (ryggen sitter på baksidan, mot vägg)',
    accessDepth: 0.9,
    blocks: true,
  },
  bookshelf: {
    label: 'Bokhylla',
    defaultSize: { width: 0.9, depth: 0.35, height: 1.9 },
    defaultColor: '#8a6f52',
    front: 'den öppna hyllsidan (ryggen sitter på baksidan, mot vägg)',
    accessDepth: 0.6,
    blocks: true,
  },
  rug: {
    label: 'Matta',
    defaultSize: { width: 2.0, depth: 1.4, height: 0.02 },
    defaultColor: '#a5502f',
    front: 'ingen riktning (platt på golvet)',
    accessDepth: 0,
    blocks: false,
  },
  box: {
    label: 'Egen låda',
    defaultSize: { width: 1.0, depth: 1.0, height: 1.0 },
    defaultColor: '#b0a795',
    front: 'användningssidan (t.ex. skrivbordets sittsida eller TV-bänkens framsida)',
    accessDepth: 0.6,
    blocks: true,
  },
};

// Tuple-typ så att listan kan mata z.enum direkt (persistence, AI-schema).
export const FURNITURE_KINDS = Object.keys(FURNITURE_CATALOG) as [
  FurnitureKind,
  ...FurnitureKind[],
];
