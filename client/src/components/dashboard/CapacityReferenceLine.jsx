import { ReferenceLine } from 'recharts';

export default function CapacityReferenceLine({ capacity, exceeded }) {
  const stroke = exceeded ? '#ef4444' : '#ccc';
  const tooltip = `Maximální kapacita: ${capacity}`;

  return (
    <ReferenceLine
      y={capacity}
      stroke={stroke}
      strokeDasharray="4 4"
      label={(labelProps) => {
        const { viewBox } = labelProps;
        if (!viewBox) return null;

        const { x, y, width } = viewBox;

        return (
          <g>
            <rect x={x} y={y - 8} width={width} height={16} fill="transparent">
              <title>{tooltip}</title>
            </rect>
            <text x={x + width} y={y} dy={14} textAnchor="end" fill="#999" fontSize={11}>
              <title>{tooltip}</title>
              {`kapacita ${capacity}`}
            </text>
          </g>
        );
      }}
    />
  );
}
