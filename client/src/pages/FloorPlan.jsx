import { useState, useEffect, useCallback, useRef } from 'react';
import { getRooms, createRoom, updateRoom, deleteRoom, getSensors } from '../api/api';
import Canvas from '../components/floorplan/Canvas';
import RoomDetail from '../components/floorplan/RoomDetail';
import AddRoomModal from '../components/floorplan/AddRoomModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';

const DEFAULT_GEOMETRY = { x: 50, y: 50, width: 200, height: 150 };

export default function FloorPlan() {
  const { addToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const patchTimers = useRef({});

  const fetchRooms = async () => {
    try {
      const { data } = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error('Chyba při načítání místností:', err);
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([getRooms(), getSensors()])
      .then(([roomsRes, sensorsRes]) => {
        if (!active) return;
        setRooms(roomsRes.data);
        setSensors(sensorsRes.data);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Chyba při načítání plánku:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedRoom = rooms.find((r) => r.id === selectedId) || null;

  const handleAddRoom = async (name) => {
    try {
      await createRoom({ name, capacity: 10, geometry: DEFAULT_GEOMETRY });
      addToast('Místnost vytvořena', 'success');
      await fetchRooms();
      setAddModalOpen(false);
    } catch (err) {
      console.error('Chyba při vytváření místnosti:', err);
      addToast('Chyba při vytváření místnosti', 'error');
    }
  };

  const handleRoomChange = useCallback((roomId, changes) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      if (changes.geometry) {
        return { ...r, geometry: { ...r.geometry, ...changes.geometry } };
      }
      if ('sensorId' in changes) {
        const sensor = sensors.find(s => s.id === changes.sensorId) || null;
        return { ...r, sensorId: changes.sensorId, sensor: sensor ? { id: sensor.id, name: sensor.name, devEui: sensor.devEui } : null };
      }
      return { ...r, ...changes };
    }));
  
    clearTimeout(patchTimers.current[roomId]);
    patchTimers.current[roomId] = setTimeout(async () => {
      try {
        await updateRoom(roomId, changes);
        addToast('Místnost uložena', 'success');
      } catch (err) {
        console.error('Chyba při ukládání místnosti:', err);
        addToast('Chyba při ukládání místnosti', 'error');
        await fetchRooms();
      }
    }, 500);
  }, [sensors, addToast]);

  const handleDelete = async () => {
    try {
      await deleteRoom(deletingRoom.id);
      addToast('Místnost smazána', 'success');
      setSelectedId(null);
      setDeletingRoom(null);
      await fetchRooms();
    } catch (err) {
      console.error('Chyba při mazání místnosti:', err);
      addToast('Chyba při mazání místnosti', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:flex-row">
      <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="card bg-base-100 p-3 lg:p-4 flex min-h-[300px] flex-col lg:min-h-0 lg:flex-1">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-bold text-base lg:text-lg">Plánek prostoru</div>
            <button
              className="btn btn-success btn-sm gap-2 lg:btn-md"
              onClick={() => setAddModalOpen(true)}
            >
              <Icon name="plus-circle" className="size-5" />
              Přidat místnost
            </button>
          </div>
          <Canvas
            rooms={rooms}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRoomChange={handleRoomChange}
          />
        </div>
      </div>

      <div className="flex w-full flex-col lg:h-full lg:w-80 lg:min-h-0 lg:overflow-hidden">
        {selectedRoom ? (
          <RoomDetail
            key={selectedRoom.id}
            room={selectedRoom}
            sensors={sensors}
            onClose={() => setSelectedId(null)}
            onChange={handleRoomChange}
            onDelete={(id) => setDeletingRoom(rooms.find((r) => r.id === id))}
          />
        ) : (
          <div className="card bg-base-100 p-3 lg:p-4 flex flex-col lg:h-full lg:min-h-0">
            <div className="mb-2 flex flex-shrink-0 items-center justify-between">
              <h2 className="font-bold text-base lg:text-lg">Místnosti</h2>
              <span className="text-sm text-base-content/50">{rooms.length} celkem</span>
            </div>
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
            {rooms.map(room => (
              <div
                key={room.id}
                className="p-3 rounded-lg border border-base-300 cursor-pointer hover:bg-base-200 transition-colors"
                onClick={() => setSelectedId(room.id)}
              >
                <div className="font-medium">{room.name}</div>
                <div className="text-sm text-base-content/50">
                  {room.geometry?.width ?? '—'} × {room.geometry?.height ?? '—'} · kapacita: {room.capacity ?? '—'}
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>

      {addModalOpen && (
        <AddRoomModal
          onSave={handleAddRoom}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {deletingRoom && (
        <ConfirmModal
          title="Opravdu chcete smazat místnost?"
          itemName={deletingRoom.name}
          onConfirm={handleDelete}
          onClose={() => setDeletingRoom(null)}
        />
      )}
    </div>
  );
}