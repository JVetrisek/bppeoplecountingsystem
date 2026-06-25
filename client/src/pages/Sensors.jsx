import { useState, useEffect } from 'react';
import { getSensors, createSensor, updateSensor, deleteSensor } from '../api/api';
import SensorTable from '../components/sensors/SensorTable';
import SensorModal from '../components/sensors/SensorModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';

export default function Sensors() {
  const { addToast } = useToast();
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [deletingSensor, setDeletingSensor] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const getErrorField = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes('name') && lower.includes('deveui')) return null;
    if (lower.includes('deveui')) return 'devEui';
    if (lower.includes(' name') || lower.endsWith(': name')) return 'name';
    return null;
  };

  const fetchSensors = async () => {
    try {
      const { data } = await getSensors();
      setSensors(data);
    } catch (err) {
      console.error('Chyba při načítání senzorů:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

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
      await fetchSensors();
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
      await fetchSensors();
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
      <div className="h-full">
        <div className="card bg-base-100 p-4 h-full">Načítání...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
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
          sensor={deletingSensor}
          onConfirm={handleDelete}
          onClose={() => setDeletingSensor(null)}
        />
      )}
    </div>
  );
}