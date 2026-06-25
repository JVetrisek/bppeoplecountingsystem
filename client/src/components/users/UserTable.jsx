import Icon from '../Icon';

const ROLE_LABELS = {
  admin: 'Administrátor',
  viewer: 'Viewer',
};

function RoleBadge({ role }) {
  if (role === 'admin') {
    return <span className="badge badge-soft badge-primary">{ROLE_LABELS.admin}</span>;
  }
  return <span className="badge badge-soft badge-neutral">{ROLE_LABELS.viewer}</span>;
}

export default function UserTable({ users, currentUserId, onEdit, onDelete }) {
  if (!users.length) {
    return <p className="text-base-content/50">Žádní uživatelé</p>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden rounded-box border border-base-content/5 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <table className="table table-pin-rows">
          <thead>
            <tr>
              <th>Jméno</th>
              <th>E-mail</th>
              <th>Role</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover">
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td><RoleBadge role={user.role} /></td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-sm btn-ghost gap-1" onClick={() => onEdit(user)}>
                      <Icon name="pencil-square" className="size-4" />
                      Upravit
                    </button>
                    {String(user.id) !== String(currentUserId) && (
                      <button className="btn btn-sm btn-error btn-outline gap-1" onClick={() => onDelete(user)}>
                        <Icon name="x-circle" className="size-4" />
                        Smazat
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
