import { useState, useEffect, useMemo } from 'react';
import { getSensors, getRooms, createSensor, updateSensor, deleteSensor } from '../api/api';
import SensorTable from '../components/sensors/SensorTable';
import SensorModal from '../components/sensors/SensorModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';

export default function Sensors() {
  const { addToast } = useToast();
  const [sensors, setSensors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [deletingSensor, setDeletingSensor] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const stats = useMemo(() => {
    const assigned = sensors.filter((s) => s.room).length;
    const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);

    return {
      registered: sensors.length,
      totalCapacity,
      assigned,
    };
  }, [sensors, rooms]);

  const getErrorField = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes('name') && lower.includes('deveui')) return null;
    if (lower.includes('deveui')) return 'devEui';
    if (lower.includes(' name') || lower.endsWith(': name')) return 'name';
    return null;
  };

  const fetchData = async () => {
    const [sensorsRes, roomsRes] = await Promise.all([getSensors(), getRooms()]);
    setSensors(sensorsRes.data);
    setRooms(roomsRes.data);
  };

  useEffect(() => {
    let active = true;

    Promise.all([getSensors(), getRooms()])
      .then(([sensorsRes, roomsRes]) => {
        if (active) {
          setSensors(sensorsRes.data);
          setRooms(roomsRes.data);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Chyba při načítání senzorů:', err);
          addToast('Chyba při načítání senzorů', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [addToast]);

  const handleSave = async (formData) => {
    try {
      if (editingSensor) {
        await updateSensor(editingSensor.id, formData);
        addToast('Senzor uložen', 'success');
      } else {
        await createSensor(formData);
        addToast('Senzor vytvořen', 'success');
      }
      setSaveError(null);
      await fetchData();
      setModalOpen(false);
      setEditingSensor(null);
    } catch (err) {
      console.error('Chyba při ukládání senzoru:', err);
      const message = err.response?.data?.error || 'Chyba při ukládání senzoru';
      setSaveError({ message, field: getErrorField(message) });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSensor(deletingSensor.id);
      addToast('Senzor smazán', 'success');
      await fetchData();
      setDeletingSensor(null);
    } catch (err) {
      console.error('Chyba při mazání senzoru:', err);
      addToast('Chyba při mazání senzoru', 'error');
    }
  };

  const handleEdit = (sensor) => {
    setSaveError(null);
    setEditingSensor(sensor);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSaveError(null);
    setEditingSensor(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-base-100 p-4">
          <div className="text-sm text-base-content/50">Registrované senzory</div>
          <div className="text-3xl font-bold mt-1">{stats.registered}</div>
        </div>
        <div className="card bg-base-100 p-4">
          <div className="text-sm text-base-content/50">Celková kapacita</div>
          <div className="text-3xl font-bold mt-1">{stats.totalCapacity}</div>
        </div>
        <div className="card bg-base-100 p-4">
          <div className="text-sm text-base-content/50">Přiřazeno k místnostem</div>
          <div className="text-3xl font-bold mt-1">
            {stats.assigned} / {stats.registered}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <div className="font-bold text-lg">Správa senzorů</div>
          <button className="btn btn-success gap-2" onClick={handleAdd}>
            <Icon name="plus-circle" className="size-5" />
            Přidat senzor
          </button>
        </div>

        <SensorTable
          sensors={sensors}
          onEdit={handleEdit}
          onDelete={(sensor) => setDeletingSensor(sensor)}
        />
      </div>

      {modalOpen && (
        <SensorModal
          sensor={editingSensor}
          onSave={handleSave}
          error={saveError}
          onClearError={() => setSaveError(null)}
          onClose={() => {
            setModalOpen(false);
            setEditingSensor(null);
            setSaveError(null);
          }}
        />
      )}

      {deletingSensor && (
        <ConfirmModal
          title="Opravdu chcete smazat senzor?"
          itemName={deletingSensor.name}
          onConfirm={handleDelete}
          onClose={() => setDeletingSensor(null)}
        />
      )}
    </div>
  );
}
