import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  getModalPresetConfig,
  getCustomRangeConfig,
  fetchChartData,
  computeStats,
  hasChartData,
} from '../../utils/chartData';
import Icon from '../Icon';
import CallyDatePicker from '../CallyDatePicker';
import TimePicker from '../TimePicker';
import ChartEmptyState from './ChartEmptyState';

const PRESET_RANGES = ['live', '12h', '24h', '7d', '30d'];

const RANGE_LABELS = {
  live: 'Živě',
  '12h': '12h',
  '24h': '24h',
  '7d': 'Týden',
  '30d': 'Měsíc',
};

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function toDateValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}`);
}

function formatTick(timestamp, hours) {
  const d = new Date(timestamp);

  if (hours > 7 * 24) {
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  }

  if (hours > 24) {
    const time = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    return `${DAY_NAMES[d.getDay()]} ${time}`;
  }

  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function formatTooltipLabel(timestamp, hours) {
  const d = new Date(timestamp);

  if (hours > 7 * 24) {
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  }

  if (hours > 24) {
    return d.toLocaleString('cs-CZ', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ label, value }) {
  return (
    <div className="card bg-base-200 p-3">
      <div className="text-xs text-base-content/50">{label}</div>
      <div className="text-2xl font-bold mt-1">{value ?? '—'}</div>
    </div>
  );
}

export default function ChartModal({
  open,
  onClose,
  room,
  roomId,
  roomCount,
  totalCapacity,
  initialRange,
}) {
  const [range, setRange] = useState(initialRange);
  const [customApplied, setCustomApplied] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const isCustom = !!customApplied;
  const rangeConfig = isCustom
    ? getCustomRangeConfig(customApplied.from, customApplied.to)
    : getModalPresetConfig(range);

  const [draftFromDate, setDraftFromDate] = useState(() => toDateValue(rangeConfig.from));
  const [draftFromTime, setDraftFromTime] = useState(() => toTimeValue(rangeConfig.from));
  const [draftToDate, setDraftToDate] = useState(() => toDateValue(rangeConfig.to));
  const [draftToTime, setDraftToTime] = useState(() => toTimeValue(rangeConfig.to));

  const title = room ? room.name : 'Celé podlaží';
  const isRoom = !!roomId;
  const stats = computeStats(chartData, isRoom);
  const hasData = hasChartData(chartData, isRoom);

  const chartPoints = chartData.map((d) => ({
    timestamp: new Date(d.timestamp).getTime(),
    value: isRoom ? d.occupancy : d.avgOccupancy,
  }));

  useEffect(() => {
    if (!open) return;
    setRange(initialRange);
    setCustomApplied(null);
  }, [open, initialRange]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setLoading(true);

    const config = isCustom
      ? getCustomRangeConfig(customApplied.from, customApplied.to)
      : getModalPresetConfig(range);

    fetchChartData(roomId, config)
      .then((result) => {
        if (active) setChartData(result);
      })
      .catch((err) => {
        if (active) console.error(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, roomId, range, customApplied, isCustom]);

  const handlePresetChange = (preset) => {
    setCustomApplied(null);
    setRange(preset);
    const config = getModalPresetConfig(preset);
    setDraftFromDate(toDateValue(config.from));
    setDraftFromTime(toTimeValue(config.from));
    setDraftToDate(toDateValue(config.to));
    setDraftToTime(toTimeValue(config.to));
  };

  const handleApplyCustom = () => {
    const from = combineDateTime(draftFromDate, draftFromTime);
    const to = combineDateTime(draftToDate, draftToTime);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) return;
    setCustomApplied({ from, to });
  };

  if (!open) return null;

  return (
    <div className="modal modal-middle modal-open">
      <div className="modal-box w-11/12 max-w-6xl p-0">
        <div className="grid grid-cols-[auto_1fr_auto] items-end gap-4 px-4 py-3 border-b border-base-300 flex-shrink-0">
          <div className="font-bold text-lg flex-shrink-0">{title}</div>

          <div className="flex flex-wrap items-end justify-center gap-2 min-w-0">
            <div className="flex items-center gap-1">
              {PRESET_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`btn btn-xs h-6 min-h-6 ${!isCustom && range === r ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handlePresetChange(r)}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 ml-2 flex-nowrap">
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Datum od</span>
                <CallyDatePicker
                  value={draftFromDate}
                  onChange={setDraftFromDate}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Čas od</span>
                <TimePicker
                  value={draftFromTime}
                  onChange={setDraftFromTime}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left w-[4.5rem]"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Datum do</span>
                <CallyDatePicker
                  value={draftToDate}
                  onChange={setDraftToDate}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Čas do</span>
                <TimePicker
                  value={draftToTime}
                  onChange={setDraftToTime}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left w-[4.5rem]"
                />
              </label>
              <button type="button" className="btn btn-xs btn-primary h-6 min-h-6" onClick={handleApplyCustom}>
                Použít
              </button>
            </div>
          </div>

          <button type="button" className="btn btn-sm btn-ghost btn-square flex-shrink-0 justify-self-end" onClick={onClose} aria-label="Zavřít">
            <Icon name="x-circle" className="size-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {!room && (
            <div className="text-sm text-base-content/50">{roomCount ?? 0} sledovaných místností</div>
          )}
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : !hasData ? (
            <ChartEmptyState height={400} />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartPoints} margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="colorOccupancyModal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    dataKey="timestamp"
                    domain={[rangeConfig.from.getTime(), rangeConfig.to.getTime()]}
                    scale="time"
                    allowDataOverflow
                    tickFormatter={(ts) => formatTick(ts, rangeConfig.hours)}
                    tick={{ fontSize: 11, fill: '#999' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    labelFormatter={(ts) => formatTooltipLabel(ts, rangeConfig.hours)}
                    formatter={(value) => [value ?? '—', 'Obsazenost']}
                    labelStyle={{ color: '#666' }}
                  />
                  {totalCapacity > 0 && (
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
                    fill="url(#colorOccupancyModal)"
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 4, fill: '#2196F3' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
          )}

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Průměrná obsazenost" value={stats.avg} />
            <StatCard label="Maximální obsazenost" value={stats.max} />
            <StatCard label="Minimální obsazenost" value={stats.min} />
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
