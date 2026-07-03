import type { FurnitureKind, FurnitureSize } from '../types';

export interface CatalogEntry {
  label: string;
  defaultSize: FurnitureSize;
  defaultColor: string;
}

export const FURNITURE_CATALOG: Record<FurnitureKind, CatalogEntry> = {
  bed: {
    label: 'Säng',
    defaultSize: { width: 1.6, depth: 2.0, height: 0.5 },
    defaultColor: '#7d8c72',
  },
  sofa: {
    label: 'Soffa',
    defaultSize: { width: 2.2, depth: 0.9, height: 0.8 },
    defaultColor: '#b06a45',
  },
  table: {
    label: 'Bord',
    defaultSize: { width: 1.4, depth: 0.8, height: 0.75 },
    defaultColor: '#9b7350',
  },
  chair: {
    label: 'Stol',
    defaultSize: { width: 0.45, depth: 0.45, height: 0.9 },
    defaultColor: '#4a453c',
  },
  wardrobe: {
    label: 'Garderob',
    defaultSize: { width: 1.2, depth: 0.6, height: 2.0 },
    defaultColor: '#ded5c2',
  },
  bookshelf: {
    label: 'Bokhylla',
    defaultSize: { width: 0.9, depth: 0.35, height: 1.9 },
    defaultColor: '#8a6f52',
  },
  rug: {
    label: 'Matta',
    defaultSize: { width: 2.0, depth: 1.4, height: 0.02 },
    defaultColor: '#a5502f',
  },
  box: {
    label: 'Egen låda',
    defaultSize: { width: 1.0, depth: 1.0, height: 1.0 },
    defaultColor: '#b0a795',
  },
};

export const FURNITURE_KINDS = Object.keys(FURNITURE_CATALOG) as FurnitureKind[];
