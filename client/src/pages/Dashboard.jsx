import { useState, useEffect, useRef, useCallback } from 'react';
import { getRooms } from '../api/api';
import { fetchChartData, getRangeConfig } from '../utils/chartData';
import StatsBar from '../components/StatsBar';
import OccupancyChart from '../components/dashboard/OccupancyChart';
import ChartModal from '../components/dashboard/ChartModal';
import RoomList from '../components/dashboard/RoomList';
import FloorMap from '../components/dashboard/FloorMap';

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
    const rangeConfig = getRangeConfig(range);
    return fetchChartData(roomId, rangeConfig);
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
    <div className="flex flex-col gap-4 lg:h-full lg:flex-row">
      <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
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

      <div className="flex w-full flex-col gap-4 lg:h-full lg:w-80 lg:min-h-0 lg:overflow-hidden">
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
        <div className="lg:min-h-0 lg:flex-1">
          <RoomList
            rooms={rooms}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      <ChartModal
        key={`${chartModalOpen ? 'open' : 'closed'}-${selectedId ?? 'floor'}-${chartRange}`}
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
