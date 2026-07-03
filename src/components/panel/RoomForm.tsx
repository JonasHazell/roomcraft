import { useDesignStore } from '../../store/useDesignStore';
import { ColorField, NumberField } from './fields';

export function RoomForm() {
  const room = useDesignStore((s) => s.design.room);
  const setRoom = useDesignStore((s) => s.setRoom);

  return (
    <div className="stack">
      <div className="field-grid">
        <NumberField
          label="Bredd"
          value={room.width}
          min={1}
          max={30}
          onChange={(width) => setRoom({ width })}
        />
        <NumberField
          label="Längd"
          value={room.length}
          min={1}
          max={30}
          onChange={(length) => setRoom({ length })}
        />
        <NumberField
          label="Takhöjd"
          value={room.height}
          min={2}
          max={6}
          onChange={(height) => setRoom({ height })}
        />
      </div>
      <div className="field-grid">
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
    </div>
  );
}
