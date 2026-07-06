import { useState, useEffect, useRef, useCallback } from 'react';
import { getRooms, getAggregate, getRoomReadings, getReadings } from '../api/api';
import StatsBar from '../components/StatsBar';
import OccupancyChart from '../components/dashboard/OccupancyChart';
import ChartModal from '../components/dashboard/ChartModal';
import RoomList from '../components/dashboard/RoomList';
import FloorMap from '../components/dashboard/FloorMap';

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

function buildChartParams(range) {
  const { interval, from } = getRangeConfig(range);
  return { from: from.toISOString(), interval };
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

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartRange, setChartRange] = useState('live');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const pollingRef = useRef(null);

  const rangeConfig = getRangeConfig(chartRange);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchChart = useCallback(async (roomId, range) => {
    const { interval, from, to } = getRangeConfig(range);

    if (range === 'live') {
      const params = {
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 1000,
      };

      if (roomId) {
        const { data } = await getRoomReadings(roomId, params);
        return [...data.readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }

      const { data } = await getReadings(params);
      return [...data]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map((d) => ({ timestamp: d.timestamp, avgOccupancy: d.occupancy }));
    }

    const params = buildChartParams(range);
    const { data } = roomId
      ? await getRoomReadings(roomId, params)
      : await getAggregate(params);
    const raw = roomId ? data.readings : data;

    return fillTimeSlots(raw, from, to, interval, !!roomId);
  }, []);

  useEffect(() => {
    let active = true;

    getRooms()
      .then(({ data }) => {
        if (active) setRooms(data);
      })
      .catch((err) => {
        if (active) console.error(err);
      });

    pollingRef.current = setInterval(() => {
      fetchRooms();
      if (chartRange === 'live') {
        fetchChart(selectedId, chartRange)
          .then((result) => {
            if (active) setChartData(result);
          })
          .catch((err) => {
            if (active) console.error(err);
          });
      }
    }, 180000);

    return () => {
      active = false;
      clearInterval(pollingRef.current);
    };
  }, [fetchRooms, fetchChart, selectedId, chartRange]);

  useEffect(() => {
    let active = true;

    fetchChart(selectedId, chartRange)
      .then((result) => {
        if (active) setChartData(result);
      })
      .catch((err) => {
        if (active) console.error(err);
      });

    return () => {
      active = false;
    };
  }, [selectedId, chartRange, fetchChart]);

  const selectedRoom = rooms.find((r) => r.id === selectedId) || null;

  const totalOccupancy = rooms.reduce((s, r) => s + (r.currentOccupancy ?? 0), 0);
  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
  const overallPercent = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
  const busiestRoom = rooms.reduce(
    (max, r) => ((r.occupancyPercent ?? 0) > (max?.occupancyPercent ?? 0) ? r : max),
    null
  );
  const activeSensors = rooms.filter((r) => r.sensor).length;

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 overflow-hidden">
        <StatsBar
          totalOccupancy={totalOccupancy}
          totalCapacity={totalCapacity}
          overallPercent={overallPercent}
          busiestRoom={busiestRoom}
          activeSensors={activeSensors}
          totalSensors={rooms.length}
        />
        <FloorMap
          rooms={rooms}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <div className="w-80 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
        <OccupancyChart
          data={chartData}
          room={selectedRoom}
          range={chartRange}
          onRangeChange={setChartRange}
          onExpand={() => setChartModalOpen(true)}
          totalCapacity={selectedRoom ? selectedRoom.capacity : totalCapacity}
          onBack={() => setSelectedId(null)}
          roomCount={rooms.length}
          from={rangeConfig.from.getTime()}
          to={rangeConfig.to.getTime()}
        />
        <div className="flex-1 min-h-0">
          <RoomList
            rooms={rooms}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      <ChartModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        rooms={rooms}
        roomId={selectedId}
        roomCount={rooms.length}
        initialRange={chartRange}
      />
    </div>
  );
}
