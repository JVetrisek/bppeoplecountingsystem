import { useState, useEffect, useRef, useCallback } from 'react';
import { getRooms, getAggregate, getRoomReadings, getReadings } from '../api/api';
import { aggregateLiveFloorReadings, getRoomSensorIds } from '../utils/liveFloorAggregation';
import { fillTimeSlots, mergeAggregateSlots } from '../utils/chartSlots';
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
  const { interval, from, to } = getRangeConfig(range);
  return { from: from.toISOString(), to: to.toISOString(), interval };
}

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartRange, setChartRange] = useState('live');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const pollingRef = useRef(null);
  const roomsRef = useRef(rooms);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const rangeConfig = getRangeConfig(chartRange);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchChart = useCallback(async (roomId, range, roomsList) => {
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

      if (!roomsList?.length) return [];

      const { data } = await getReadings(params);
      const sensorIds = getRoomSensorIds(roomsList);
      return aggregateLiveFloorReadings(data, from, to, sensorIds, roomsList);
    }

    const params = buildChartParams(range);
    let raw;
    if (roomId) {
      const { data } = await getRoomReadings(roomId, params);
      raw = data.readings;
    } else {
      const { data } = await getAggregate(params);
      raw = data;
    }

    if (!roomId) {
      return mergeAggregateSlots(raw, from, to, interval);
    }

    return fillTimeSlots(raw, from, to, interval, true);
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
        fetchChart(selectedId, chartRange, roomsRef.current)
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
    if (chartRange === 'live' && !selectedId && rooms.length === 0) return undefined;

    let active = true;

    fetchChart(selectedId, chartRange, roomsRef.current)
      .then((result) => {
        if (active) setChartData(result);
      })
      .catch((err) => {
        if (active) console.error(err);
      });

    return () => {
      active = false;
    };
  }, [selectedId, chartRange, fetchChart, rooms.length]);

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
