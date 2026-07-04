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

export const FURNITURE_KINDS = Object.keys(FURNITURE_CATALOG) as FurnitureKind[];
