import type { Object3D } from 'three';
import type { FurnitureSize } from '../types';

/**
 * Reads a user-supplied GLTF/GLB file into a self-contained furniture model: a
 * data URL (so it saves with the room) plus the bounding-box dimensions used as
 * the piece's size — and therefore its collision footprint. three and the GLTF
 * loader are imported dynamically so they stay out of the main bundle (the 3D
 * scene is already lazy-loaded) and only load when someone actually imports.
 */

/** Kept well under the ~5 MB localStorage budget, since the model saves inline. */
export const MAX_MODEL_BYTES = 2 * 1024 * 1024;

export interface ImportedModelResult {
  src: string;
  name: string;
  size: FurnitureSize;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function importFurnitureModel(file: File): Promise<ImportedModelResult> {
  if (file.size > MAX_MODEL_BYTES) {
    throw new Error('That model is too large — please use a file under 2 MB.');
  }
  const src = await readAsDataUrl(file);
  const [{ GLTFLoader }, THREE] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three'),
  ]);
  const gltf = await new Promise<{ scene: Object3D }>((resolve, reject) => {
    new GLTFLoader().load(src, resolve, undefined, () =>
      reject(new Error('That file could not be read as a 3D model (GLTF or GLB).')),
    );
  });
  const dim = new THREE.Vector3();
  new THREE.Box3().setFromObject(gltf.scene).getSize(dim);
  const clampDim = (v: number) => Math.min(100, Math.max(0.05, v || 0.5));
  return {
    src,
    name: file.name.replace(/\.(glb|gltf)$/i, '') || 'Custom model',
    size: { width: clampDim(dim.x), depth: clampDim(dim.z), height: clampDim(dim.y) },
  };
}
