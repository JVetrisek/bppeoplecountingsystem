import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAggregate, getRoomReadings, getReadings } from '../../api/api';
import Icon from '../Icon';
import CallyDatePicker from '../CallyDatePicker';
import TimePicker from '../TimePicker';
import ChartEmptyState, { hasChartData } from './ChartEmptyState';
import CapacityReferenceLine from './CapacityReferenceLine';

const PRESET_RANGES = ['live', '12h', '24h', '7d', '30d'];

const RANGE_LABELS = {
  live: 'Živě',
  '12h': '12h',
  '24h': '24h',
  '7d': 'Týden',
  '30d': 'Měsíc',
};

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function getRangeConfig(range) {
  const now = new Date();

  switch (range) {
    case '12h':
      return { hours: 12, interval: 'hour', from: new Date(now - 12 * 3600000), to: now };
    case '24h':
      return { hours: 24, interval: 'hour', from: new Date(now - 24 * 3600000), to: now };
    case '7d':
      return { hours: 7 * 24, interval: 'day', from: new Date(now - 7 * 24 * 3600000), to: now };
    case '30d':
      return { hours: 30 * 24, interval: 'day', from: new Date(now - 30 * 24 * 3600000), to: now };
    default:
      return { hours: 1, interval: 'hour', from: new Date(now - 3600000), to: now };
  }
}

function getCustomRangeConfig(from, to) {
  const hours = Math.max(0, (to - from) / 3600000);
  let interval = 'day';
  if (hours < 2) interval = 'minute';
  else if (hours <= 48) interval = 'hour';
  return { hours, interval, from, to };
}

function getModalPresetConfig(range) {
  const config = getRangeConfig(range);
  if (range === 'live') {
    return { ...config, interval: 'minute' };
  }
  return config;
}

function truncateToHourLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0);
}

function truncateToDayLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function slotKey(date, interval) {
  if (interval === 'day') {
    const d = truncateToDayLocal(date);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const d = truncateToHourLocal(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:00:00`;
}

function generateTimeSlots(from, to, interval) {
  const slots = [];
  let current = interval === 'day' ? truncateToDayLocal(from) : truncateToHourLocal(from);
  const end = new Date(to);

  while (current <= end) {
    slots.push(new Date(current));
    if (interval === 'day') {
      current = new Date(current);
      current.setDate(current.getDate() + 1);
    } else {
      current = new Date(current);
      current.setHours(current.getHours() + 1);
    }
  }

  return slots;
}

function indexDataBySlot(data, interval, isRoom) {
  const map = new Map();

  for (const point of data) {
    const key = slotKey(point.timestamp, interval);
    const value = isRoom ? point.occupancy : point.avgOccupancy;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
  }

  const result = new Map();
  for (const [key, values] of map) {
    result.set(key, values.reduce((sum, v) => sum + v, 0) / values.length);
  }
  return result;
}

function fillTimeSlots(data, from, to, interval, isRoom) {
  const indexed = indexDataBySlot(data, interval, isRoom);

  return generateTimeSlots(from, to, interval).map((slotDate) => {
    const key = slotKey(slotDate, interval);
    const value = indexed.get(key);

    if (value === undefined) {
      return isRoom
        ? { timestamp: key, occupancy: null }
        : { timestamp: key, avgOccupancy: null };
    }

    return isRoom
      ? { timestamp: key, occupancy: value }
      : { timestamp: key, avgOccupancy: value };
  });
}

function aggregateRoomReadings(readings, interval) {
  const map = new Map();

  for (const reading of readings) {
    const key = slotKey(reading.timestamp, interval);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(reading.occupancy);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, values]) => ({
      timestamp,
      occupancy: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    }));
}

function bucketFloorReadings(readings) {
  const bucketMs = 5 * 60 * 1000;
  const map = new Map();

  for (const reading of readings) {
    const bucket = Math.floor(new Date(reading.timestamp).getTime() / bucketMs) * bucketMs;
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket).push(reading.occupancy);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => ({
      timestamp: new Date(ts).toISOString(),
      avgOccupancy: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    }));
}

function computeStats(data, isRoom) {
  const values = data
    .map((d) => (isRoom ? d.occupancy : d.avgOccupancy))
    .filter((v) => v != null);

  if (!values.length) {
    return { avg: null, max: null, min: null };
  }

  return {
    avg: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

async function fetchChartData(roomId, rangeConfig) {
  const { from, to, interval } = rangeConfig;
  const params = {
    from: from.toISOString(),
    to: to.toISOString(),
    limit: 1000,
  };

  if (interval === 'minute') {
    if (roomId) {
      const { data } = await getRoomReadings(roomId, params);
      return [...data.readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    const { data } = await getReadings(params);
    return bucketFloorReadings(data);
  }

  if (roomId) {
    const { data } = await getRoomReadings(roomId, params);
    const aggregated = aggregateRoomReadings(data.readings, interval);
    return fillTimeSlots(aggregated, from, to, interval, true);
  }

  const { data } = await getAggregate({ ...params, interval });
  return fillTimeSlots(data, from, to, interval, false);
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
  const [loading, setLoading] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const floorCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
  const totalCapacity = selectedRoom ? selectedRoom.capacity : floorCapacity;

  const isCustom = !!customApplied;
  const rangeConfig = isCustom
    ? getCustomRangeConfig(customApplied.from, customApplied.to)
    : getModalPresetConfig(range);

  const [draftFromDate, setDraftFromDate] = useState(() => toDateValue(rangeConfig.from));
  const [draftFromTime, setDraftFromTime] = useState(() => toTimeValue(rangeConfig.from));
  const [draftToDate, setDraftToDate] = useState(() => toDateValue(rangeConfig.to));
  const [draftToTime, setDraftToTime] = useState(() => toTimeValue(rangeConfig.to));

  const title = selectedRoom ? selectedRoom.name : 'Celé podlaží';
  const isRoom = !!selectedRoomId;
  const stats = computeStats(chartData, isRoom);
  const hasData = hasChartData(chartData, isRoom);

  const chartPoints = chartData.map((d) => ({
    timestamp: new Date(d.timestamp).getTime(),
    value: isRoom ? d.occupancy : d.avgOccupancy,
  }));
  const maxValue = chartPoints.reduce((max, d) => (d.value != null ? Math.max(max, d.value) : max), 0);
  const yMax = Math.max(totalCapacity || 0, maxValue || 0) * 1.1;
  const capacityExceeded = maxValue > totalCapacity;

  useEffect(() => {
    if (!open) return;
    setRange(initialRange);
    setCustomApplied(null);
    setSelectedRoomId(roomId ?? null);
  }, [open, initialRange, roomId]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setLoading(true);

    const config = isCustom
      ? getCustomRangeConfig(customApplied.from, customApplied.to)
      : getModalPresetConfig(range);

    fetchChartData(selectedRoomId, config)
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
  }, [open, selectedRoomId, range, customApplied, isCustom]);

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
      <div className="modal-box w-11/12 max-w-6xl h-[75vh] p-0 overflow-hidden flex flex-col">
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
          <div className="flex-1 min-h-[300px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : !hasData ? (
            <ChartEmptyState height={300} />
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
                    labelFormatter={(ts) => formatTooltipLabel(ts, rangeConfig.hours)}
                    formatter={(value) => [value ?? '—', 'Obsazenost']}
                    labelStyle={{ color: '#666' }}
                  />
                  {totalCapacity > 0 && (
                    <CapacityReferenceLine capacity={totalCapacity} exceeded={capacityExceeded} />
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
