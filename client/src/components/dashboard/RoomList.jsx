function getOccupancyLabel(percent) {
    if (percent >= 80) return 'Vytížená';
    if (percent >= 50) return 'Obsazená';
    return 'Volná';
}

export default function RoomList({ rooms, selectedId, onSelect }) {
  const sorted = [...rooms].sort((a, b) => (b.occupancyPercent ?? 0) - (a.occupancyPercent ?? 0));

  return (
    <div className="card bg-base-100 p-3 lg:p-4 flex flex-col lg:h-full lg:min-h-0">
      <div className="mb-3 flex-shrink-0 font-bold">Dle obsazenosti</div>
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
        {sorted.map((room) => (
          <div
            key={room.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedId === room.id ? 'border-primary bg-primary/5' : 'border-base-300 hover:bg-base-200'}`}
            onClick={() => onSelect(selectedId === room.id ? null : room.id)}
          >
            <div className="flex gap-2 items-center">
              <div className="flex-[8] flex flex-col gap-1">
                <div className={`font-medium text-sm ${selectedId === room.id ? 'text-primary' : ''}`}>
                  {room.name}
                </div>
                <progress
                  className={`progress w-full ${room.occupancyPercent >= 80 ? 'progress-error' : room.occupancyPercent >= 50 ? 'progress-warning' : 'progress-success'}`}
                  value={room.occupancyPercent ?? 0}
                  max={100}
                />
              </div>
              <div className="flex-[2] text-right">
                <span className="font-medium text-sm">{room.currentOccupancy}/{room.capacity}</span>
                <div className="text-xs text-base-content/50">{getOccupancyLabel(room.occupancyPercent)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}