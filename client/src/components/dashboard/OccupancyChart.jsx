import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '../Icon';
import CapacityReferenceLine from './CapacityReferenceLine';
import OccupancyTooltip from './OccupancyTooltip';
import ChartAggregationHelp from './ChartAggregationHelp';
import { hasChartData, toChartPoints } from '../../utils/chartData';

const RANGES = ['live', '12h', '24h', '7d', '30d'];

const RANGE_LABELS = {
  live: 'Živě',
  '12h': '12h',
  '24h': '24h',
  '7d': 'Týden',
  '30d': 'Měsíc',
};

function formatTick(timestamp, range) {
  const d = new Date(timestamp);

  if (range === 'live' || range === '12h' || range === '24h') {
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }

  if (range === '30d') {
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  }

  if (range === '7d') {
    return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric' });
  }

  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function formatTooltipLabel(timestamp, range) {
  const d = new Date(timestamp);

  if (range === 'live' || range === '12h' || range === '24h') {
    return d.toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (range === '30d') {
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  }

  if (range === '7d') {
    return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
  }

  return d.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ExpandIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

export default function OccupancyChart({
  data,
  room,
  range,
  onRangeChange,
  onExpand,
  totalCapacity,
  onBack,
  roomCount,
  from,
  to,
}) {
  const title = room ? room.name : 'Celé podlaží';
  const subtitle = room ? null : `${roomCount ?? 0} sledovaných místností`;
  const xMax = to;

  const chartData = toChartPoints(data);
  const hasData = hasChartData(data);
  const maxValue = chartData.reduce((max, d) => (d.value != null ? Math.max(max, d.value) : max), 0);
  const yMax = Math.max(totalCapacity || 0, maxValue || 0) * 1.1;
  const capacityExceeded = maxValue > totalCapacity;
  const tickCount = 4;
  const step = (xMax - from) / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => from + i * step);

  return (
    <div className="card bg-base-100 p-3 lg:p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <div className="truncate font-bold text-base lg:text-lg">{title}</div>
          {subtitle && <div className="text-sm text-base-content/50">{subtitle}</div>}
        </div>
        {room && (
          <button className="btn btn-sm btn-ghost btn-square" onClick={onBack} aria-label="Zpět">
            <Icon name="x-circle" className="size-5" />
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute -top-2 left-1 z-5">
          <ChartAggregationHelp isRoom={!!room} range={range} />
        </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
          <defs>
            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            dataKey="timestamp"
            domain={[from, xMax]}
            scale="time"
            allowDataOverflow
            ticks={ticks}
            tickFormatter={(ts) => formatTick(ts, range)}
            tick={{ fontSize: 11, fill: '#999' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={[0, yMax]} />
          <Tooltip
            content={(
              <OccupancyTooltip
                formatLabel={(ts) => formatTooltipLabel(ts, range)}
              />
            )}
          />
          {totalCapacity > 0 && (
            <CapacityReferenceLine capacity={totalCapacity} exceeded={capacityExceeded} />
          )}
          <Area
            type="linear"
            dataKey="value"
            stroke="#2196F3"
            strokeWidth={2}
            fill="url(#colorOccupancy)"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: '#2196F3' }}
          />
        </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center text-sm text-base-content/50 border border-dashed border-base-300 rounded-lg"
          style={{ height: 200 }}
        >
          Žádná dostupná data
        </div>
      )}
      </div>

      <div className="flex flex-wrap justify-center items-center gap-1 mt-3">
        {RANGES.map((r) => (
          <button
            key={r}
            className={`btn btn-xs ${range === r ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onRangeChange(r)}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-xs btn-ghost btn-square"
          onClick={onExpand}
          aria-label="Rozbalit graf"
        >
          <ExpandIcon />
        </button>
      </div>
    </div>
  );
}
