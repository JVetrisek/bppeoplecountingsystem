export default function OccupancyTooltip({ active, payload, formatLabel }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point || point.value == null) return null;

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm shadow-md">
      <div className="text-base-content/60">{formatLabel(point.timestamp)}</div>
      <div className="font-semibold mt-0.5">Obsazenost: {point.value}</div>
    </div>
  );
}
