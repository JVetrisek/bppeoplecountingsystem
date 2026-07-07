import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import OccupancyTooltip from './OccupancyTooltip';
import ChartAggregationHelp from './ChartAggregationHelp';
import Icon from '../Icon';
import CallyDatePicker from '../CallyDatePicker';
import TimePicker from '../TimePicker';
import CapacityReferenceLine from './CapacityReferenceLine';
import { fetchChartData, getCustomRangeConfig, getRangeConfig, hasChartData, toChartPoints } from '../../utils/chartData';

const PRESET_RANGES = ['live', '12h', '24h', '7d', '30d'];

const RANGE_LABELS = {
  live: 'Živě',
  '12h': '12h',
  '24h': '24h',
  '7d': 'Týden',
  '30d': 'Měsíc',
};

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function computeStats(data) {
  const values = data.map((d) => d.value).filter((v) => v != null);

  if (!values.length) {
    return { avg: null, max: null, min: null };
  }

  return {
    avg: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

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
    return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
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
  rooms = [],
  roomId,
  roomCount,
  initialRange,
}) {
  const [range, setRange] = useState(initialRange);
  const [selectedRoomId, setSelectedRoomId] = useState(roomId ?? null);
  const [customApplied, setCustomApplied] = useState(null);
  const [chartData, setChartData] = useState([]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const floorCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
  const totalCapacity = selectedRoom ? selectedRoom.capacity : floorCapacity;

  const isCustom = !!customApplied;
  const customRangeKey = customApplied
    ? `${customApplied.from.getTime()}-${customApplied.to.getTime()}`
    : '';
  const rangeConfig = isCustom
    ? getCustomRangeConfig(customApplied.from, customApplied.to)
    : getRangeConfig(range);

  const [draftFromDate, setDraftFromDate] = useState(() => toDateValue(rangeConfig.from));
  const [draftFromTime, setDraftFromTime] = useState(() => toTimeValue(rangeConfig.from));
  const [draftToDate, setDraftToDate] = useState(() => toDateValue(rangeConfig.to));
  const [draftToTime, setDraftToTime] = useState(() => toTimeValue(rangeConfig.to));

  const title = selectedRoom ? selectedRoom.name : 'Celé podlaží';
  const isRoom = !!selectedRoomId;
  const stats = computeStats(chartData);
  const hasData = hasChartData(chartData);

  const chartPoints = toChartPoints(chartData);
  const maxValue = chartPoints.reduce((max, d) => (d.value != null ? Math.max(max, d.value) : max), 0);
  const yMax = Math.max(totalCapacity || 0, maxValue || 0) * 1.1;
  const capacityExceeded = maxValue > totalCapacity;

  useEffect(() => {
    if (!open) return undefined;
    let active = true;

    const config = customRangeKey
      ? getCustomRangeConfig(customApplied.from, customApplied.to)
      : getRangeConfig(range);

    fetchChartData(selectedRoomId, config)
      .then((result) => {
        if (active) setChartData(result);
      })
      .catch((err) => {
        if (active) console.error(err);
      });

    return () => {
      active = false;
    };
  }, [open, selectedRoomId, range, customRangeKey, customApplied, rooms.length]);

  const handlePresetChange = (preset) => {
    setCustomApplied(null);
    setRange(preset);
    const config = getRangeConfig(preset);
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
      <div className="modal-box w-11/12 max-w-6xl p-0 overflow-hidden flex flex-col">
        <div className="grid grid-cols-[auto_1fr_auto] items-end gap-4 px-4 py-3 border-b border-base-300 flex-shrink-0">
          <div className="font-bold text-lg flex-shrink-0">{title}</div>

          <div className="flex flex-wrap items-end justify-center gap-2 min-w-0">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-base-content/50">Místnost</span>
              <select
                className="select select-bordered select-xs h-6 min-h-6 w-[9rem] truncate"
                value={selectedRoomId ?? ''}
                onChange={(e) => setSelectedRoomId(e.target.value || null)}
              >
                <option value="">Celé podlaží</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-0.5 ml-2">
              <span className="text-[10px] text-base-content/50">Období</span>
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
            </label>

            <div className="flex items-end gap-2 ml-2 flex-nowrap">
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Datum od</span>
                <CallyDatePicker
                  value={draftFromDate}
                  onChange={setDraftFromDate}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left w-[5.75rem]"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Čas od</span>
                <TimePicker
                  value={draftFromTime}
                  onChange={setDraftFromTime}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Datum do</span>
                <CallyDatePicker
                  value={draftToDate}
                  onChange={setDraftToDate}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left w-[5.75rem]"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-base-content/50">Čas do</span>
                <TimePicker
                  value={draftToTime}
                  onChange={setDraftToTime}
                  className="input input-bordered input-xs h-6 min-h-6 px-2 text-left"
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

        <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
          {!selectedRoom && (
            <div className="text-sm text-base-content/50 flex-shrink-0">{roomCount ?? 0} sledovaných místností</div>
          )}
          <div className="relative h-[300px] flex-shrink-0">
          <div className="absolute -top-1 left-2 z-5">
            <ChartAggregationHelp
              isRoom={isRoom}
              range={isCustom ? null : range}
              interval={rangeConfig.interval}
              iconClassName="size-[1.55rem]"
            />
          </div>
          {!hasData ? (
            <div
              className="flex items-center justify-center text-sm text-base-content/50 border border-dashed border-base-300 rounded-lg"
              style={{ height: 300 }}
            >
              Žádná dostupná data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
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
                  <YAxis hide domain={[0, yMax]} />
                  <Tooltip
                    content={(
                      <OccupancyTooltip
                        formatLabel={(ts) => formatTooltipLabel(ts, rangeConfig.hours)}
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
                    fill="url(#colorOccupancyModal)"
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 4, fill: '#2196F3' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
          )}
          </div>

          <div className="grid grid-cols-3 gap-3 flex-shrink-0">
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
