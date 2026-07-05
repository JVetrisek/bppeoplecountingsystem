export function hasChartData(data, isRoom) {
  if (!data?.length) return false;
  return data.some((d) => {
    const value = isRoom ? d.occupancy : d.avgOccupancy;
    return value != null;
  });
}

export default function ChartEmptyState({ height = 200 }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-base-content/50 border border-dashed border-base-300 rounded-lg"
      style={{ height }}
    >
      Žádná dostupná data
    </div>
  );
}
