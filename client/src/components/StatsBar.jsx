export default function StatsBar({ totalOccupancy, totalCapacity, overallPercent, busiestRoom, activeSensors, totalSensors }) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="card bg-base-100 p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-base-content/50">Osob v budově</div>
          <div className="text-2xl lg:text-3xl font-bold mt-1">{totalOccupancy}</div>
          <div className="text-xs lg:text-sm text-base-content/50 mt-1">z {totalCapacity} kapacity</div>
        </div>
  
        <div className="card bg-base-100 p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-base-content/50">Celková obsazenost</div>
          <div className="text-2xl lg:text-3xl font-bold mt-1">{overallPercent}<span className="text-xl lg:text-2xl">%</span></div>
          <div className="text-xs lg:text-sm text-base-content/50 mt-1">napříč všemi místnostmi</div>
        </div>
  
        <div className="card bg-base-100 p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-base-content/50">Nejvytíženější místnost</div>
          <div className="text-lg lg:text-2xl font-bold mt-1 truncate">{busiestRoom?.name ?? '—'}</div>
          <div className="text-xs lg:text-sm text-base-content/50 mt-1">
            {busiestRoom ? `${busiestRoom.currentOccupancy}/${busiestRoom.capacity} osob` : '—'}
          </div>
        </div>
  
        <div className="card bg-base-100 p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-base-content/50">Aktivní senzory</div>
          <div className="text-2xl lg:text-3xl font-bold mt-1">{activeSensors}</div>
          <div className="text-xs lg:text-sm text-base-content/50 mt-1">z {totalSensors} registrovaných</div>
        </div>
      </div>
    );
  }