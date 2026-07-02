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
