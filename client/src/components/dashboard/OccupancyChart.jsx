import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Icon from '../Icon';

const RANGES = ['live', '12h', '24h', '7d', '30d'];

const RANGE_LABELS = {
  live: 'Živě',
  '12h': '12h',
  '24h': '24h',
  '7d': 'Týden',
  '30d': 'Měsíc',
};

function formatTime(timestamp, range) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (range === '7d' || range === '30d') {
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  }
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

export default function OccupancyChart({ data, room, range, onRangeChange, totalCapacity, onBack, roomCount }) {
    const title = room ? room.name : 'Celé podlaží';
    const subtitle = room ? null : `${roomCount ?? 0} sledovaných místností`;
  
    const chartData = data.map(d => ({
      time: formatTime(d.timestamp, range),
      value: room ? d.occupancy : d.avgOccupancy,
    }));
  
    return (
      <div className="card bg-base-100 p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-bold text-lg">{title}</div>
            {subtitle && <div className="text-sm text-base-content/50">{subtitle}</div>}
          </div>
          {room && (
            <button className="btn btn-sm btn-ghost btn-square" onClick={onBack} aria-label="Zpět">
              <Icon name="x-circle" className="size-5" />
            </button>
          )}
        </div>
  
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#999' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              formatter={(value) => [value, 'Obsazenost']}
              labelStyle={{ color: '#666' }}
            />
            {totalCapacity && (
              <ReferenceLine
                y={totalCapacity}
                stroke="#ccc"
                strokeDasharray="4 4"
                label={{ value: `kapacita ${totalCapacity}`, position: 'right', fontSize: 11, fill: '#999' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2196F3"
              strokeWidth={2}
              fill="url(#colorOccupancy)"
              dot={false}
              activeDot={{ r: 4, fill: '#2196F3' }}
            />
          </AreaChart>
        </ResponsiveContainer>
  
        <div className="flex flex-wrap justify-center gap-1 mt-3">
          {RANGES.map(r => (
            <button
              key={r}
              className={`btn btn-xs ${range === r ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onRangeChange(r)}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
    );
  }