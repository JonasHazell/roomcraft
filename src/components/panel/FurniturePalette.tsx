import { FURNITURE_CATALOG, FURNITURE_KINDS } from '../../lib/furnitureCatalog';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

export function FurniturePalette() {
  const addFurniture = useDesignStore((s) => s.addFurniture);
  const select = useUiStore((s) => s.select);

  return (
    <div className="palette">
      {FURNITURE_KINDS.map((kind) => (
        <button
          type="button"
          key={kind}
          className="palette-btn"
          onClick={() => select(addFurniture(kind))}
        >
          <span className="swatch" style={{ background: FURNITURE_CATALOG[kind].defaultColor }} />
          {FURNITURE_CATALOG[kind].label}
        </button>
      ))}
    </div>
  );
}
