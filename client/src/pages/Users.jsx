import { useState, useEffect, useCallback } from 'react';
import { getUsers, deleteUser } from '../api/users.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import UserTable from '../components/users/UserTable';
import UserModal from '../components/users/UserModal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/Icon';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const refreshUsers = useCallback(async () => {
    const { data } = await getUsers();
    setUsers(data);
  }, []);

  useEffect(() => {
    let active = true;

    getUsers()
      .then(({ data }) => {
        if (active) setUsers(data);
      })
      .catch((err) => {
        if (active) {
          console.error('Chyba při načítání uživatelů:', err);
          addToast('Chyba při načítání uživatelů', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [addToast]);

  const handleDelete = async () => {
    try {
      await deleteUser(deletingUser.id);
      addToast('Uživatel smazán', 'success');
      await refreshUsers();
      setDeletingUser(null);
    } catch (err) {
      const message = err.response?.data?.error || 'Chyba při mazání uživatele';
      addToast(message, 'error');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
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
    <div className="h-full flex flex-col min-h-0">
      <div className="card bg-base-100 p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <div className="font-bold text-lg">Správa uživatelů</div>
          <button className="btn btn-success gap-2" onClick={handleAdd}>
            <Icon name="plus-circle" className="size-5" />
            Přidat uživatele
          </button>
        </div>

        <UserTable
          users={users}
          currentUserId={currentUser?.id}
          onEdit={handleEdit}
          onDelete={(user) => setDeletingUser(user)}
        />
      </div>

      {modalOpen && (
        <UserModal
          key={editingUser?.id ?? 'new'}
          user={editingUser}
          onClose={() => {
            setModalOpen(false);
            setEditingUser(null);
          }}
          onSaved={refreshUsers}
        />
      )}

      {deletingUser && (
        <ConfirmModal
          title="Opravdu chcete smazat uživatele?"
          itemName={deletingUser.name}
          onConfirm={handleDelete}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}
