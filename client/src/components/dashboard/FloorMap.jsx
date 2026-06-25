const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 720;

function getHeatColor(percent) {
  if (percent === undefined || percent === null) return '#f5f5f5';
  if (percent >= 80) return '#ffebee';
  if (percent >= 50) return '#fff3e0';
  return '#e8f5e9';
}

function getHeatStroke(percent) {
  if (percent === undefined || percent === null) return '#e0e0e0';
  if (percent >= 80) return '#ef5350';
  if (percent >= 50) return '#ffa726';
  return '#66bb6a';
}

export default function FloorMap({ rooms, selectedId, onSelect }) {
  return (
    <div className="card bg-base-100 p-4 flex-1 min-h-0 flex flex-col">
      <div className="font-bold mb-3">Plánek prostoru</div>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMin meet"
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundColor: '#fafafa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        {rooms.map(room => {
          const x = room.geometry?.x ?? 50;
          const y = room.geometry?.y ?? 50;
          const width = room.geometry?.width ?? 200;
          const height = room.geometry?.height ?? 150;
          const isSelected = selectedId === room.id;
          const percent = room.occupancyPercent ?? 0;

          return (
            <g
              key={room.id}
              onClick={() => onSelect(selectedId === room.id ? null : room.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={getHeatColor(percent)}
                stroke={isSelected ? '#2196F3' : getHeatStroke(percent)}
                strokeWidth={isSelected ? 2 : 1}
                rx={4}
              />
              <text
                x={x + width / 2}
                y={y + height / 2 - 8}
                textAnchor="middle"
                fontSize={14}
                fill="#333"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {room.name}
              </text>
              <text
                x={x + width / 2}
                y={y + height / 2 + 10}
                textAnchor="middle"
                fontSize={12}
                fill="#666"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {room.currentOccupancy ?? '—'} / {room.capacity ?? '—'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}