import { useState, useEffect, useRef } from 'react';
import { getRooms, getAggregate, getRoomReadings } from '../api/api';
import StatsBar from '../components/StatsBar';
import OccupancyChart from '../components/dashboard/OccupancyChart';
import RoomList from '../components/dashboard/RoomList';
import FloorMap from '../components/dashboard/FloorMap';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartRange, setChartRange] = useState('live');
  const pollingRef = useRef(null);

  const fetchRooms = async () => {
    try {
      const { data } = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getRangeConfig = (range) => {
    switch (range) {
      case '12h': return { hours: 12, interval: 'hour' };
      case '24h': return { hours: 24, interval: 'hour' };
      case '7d': return { hours: 7 * 24, interval: 'day' };
      case '30d': return { hours: 30 * 24, interval: 'day' };
      default: return { hours: 1, interval: 'hour' };
    }
  };

  const fetchChart = async (roomId, range) => {
    try {
      const { hours, interval } = getRangeConfig(range);
      const now = new Date();
      const from = new Date(now - hours * 3600 * 1000);
      const { data } = roomId
        ? await getRoomReadings(roomId, { from: from.toISOString(), interval })
        : await getAggregate({ from: from.toISOString(), interval });
      setChartData(roomId ? data.readings : data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchChart(selectedId, chartRange);
    pollingRef.current = setInterval(fetchRooms, 30000);
    return () => clearInterval(pollingRef.current);
  }, []);

  useEffect(() => {
    fetchChart(selectedId, chartRange);
  }, [selectedId, chartRange]);

  const selectedRoom = rooms.find(r => r.id === selectedId) || null;

  // Statistiky
  const totalOccupancy = rooms.reduce((s, r) => s + (r.currentOccupancy ?? 0), 0);
  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
  const overallPercent = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
  const busiestRoom = rooms.reduce((max, r) => (r.occupancyPercent ?? 0) > (max?.occupancyPercent ?? 0) ? r : max, null);
  const activeSensors = rooms.filter(r => r.sensor).length;

  return (
    <div className="flex gap-4 h-full">
      {/* Vlevo — heatmapa */}
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
  
      {/* Vpravo — panel */}
      <div className="w-80 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
        <OccupancyChart
          data={chartData}
          room={selectedRoom}
          range={chartRange}
          onRangeChange={setChartRange}
          totalCapacity={selectedRoom ? selectedRoom.capacity : totalCapacity}
          onBack={() => setSelectedId(null)}
          roomCount={rooms.length}
        />
        <div className="flex-1 min-h-0">
          <RoomList
            rooms={rooms}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
}