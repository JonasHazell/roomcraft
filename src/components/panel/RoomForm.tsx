import { useDesignStore } from '../../store/useDesignStore';
import { ColorField, NumberField } from './fields';

export function RoomForm() {
  const room = useDesignStore((s) => s.design.room);
  const setRoom = useDesignStore((s) => s.setRoom);

  return (
    <div className="stack">
      <div className="field-grid">
        <NumberField
          label="Takhöjd"
          value={Math.round(room.height * 100)}
          min={200}
          max={600}
          step={1}
          onChange={(v) => setRoom({ height: v / 100 })}
        />
        <ColorField
          label="Golv"
          value={room.floorColor}
          onChange={(floorColor) => setRoom({ floorColor })}
        />
        <ColorField
          label="Väggar"
          value={room.wallColor}
          onChange={(wallColor) => setRoom({ wallColor })}
        />
      </div>
      <p className="hint">Rummets form ritas i planritningen.</p>
    </div>
  );
}
