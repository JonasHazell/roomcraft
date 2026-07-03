import { useShallow } from 'zustand/react/shallow';
import { useDesignStore } from '../../store/useDesignStore';
import { FurnitureMesh } from './FurnitureMesh';

export function FurnitureLayer() {
  const ids = useDesignStore(useShallow((s) => s.design.furniture.map((f) => f.id)));
  return (
    <>
      {ids.map((id) => (
        <FurnitureMesh key={id} id={id} />
      ))}
    </>
  );
}
