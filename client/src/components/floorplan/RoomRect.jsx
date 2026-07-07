const HANDLE_SIZE = 10;

export default function RoomRect({ room, isSelected, onSelect, onDragStart, onResizeStart }) {
  const { name, capacity } = room;
  const x = room.geometry?.x ?? 50;
  const y = room.geometry?.y ?? 50;
  const width = room.geometry?.width ?? 200;
  const height = room.geometry?.height ?? 150;

  const fillColor = isSelected ? '#e3f2fd' : '#FFFFFF';
  const strokeColor = isSelected ? '#2196F3' : '#c1c8cd';

  return (
    <g onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}>
      {/* Hlavní obdélník */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        rx={4}
        style={{ cursor: 'move' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(e, room.id);
        }}
      />

{/* Název místnosti */}
<text
  x={x + width / 2}
  y={y + height / 2 - 8}
  textAnchor="middle"
  fontSize={14}
  fill="#333"
  style={{ pointerEvents: 'none', userSelect: 'none' }}
>
  {name}
</text>

{/* Senzor */}
<text
  x={x + width / 2}
  y={y + height / 2 + 10}
  textAnchor="middle"
  fontSize={11}
  fill={room.sensor?.name ? '#666' : '#ef4444'}
  style={{ pointerEvents: 'none', userSelect: 'none' }}
>
  {room.sensor?.name ?? 'bez senzoru'} · kap {capacity ?? '—'}
</text>

      {/* Resize handle — pravý dolní roh */}
      {isSelected && (
        <rect
          x={x + width - HANDLE_SIZE}
          y={y + height - HANDLE_SIZE}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="#2196F3"
          style={{ cursor: 'se-resize' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, room.id);
          }}
        />
      )}
    </g>
  );
}