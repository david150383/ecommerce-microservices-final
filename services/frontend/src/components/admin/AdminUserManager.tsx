import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Loader2, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';
import { adminApi, AdminUser } from '../../api/admin.api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const AdminUserManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listUsers(50);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleToggle = async (targetUser: AdminUser) => {
    const nextRole = targetUser.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    if (!window.confirm(`Change ${targetUser.email} role to ${nextRole}?`)) return;

    setUpdatingUserId(targetUser.id);
    try {
      await adminApi.updateUserRole(targetUser.id, nextRole);
      await fetchUsers();
    } catch (err: any) {
      alert(`Failed to update user role: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flexGrow: 1 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchUsers} style={{ padding: '0.65rem' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading user directory from Auth Service (:3001)...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No registered users found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>User</th>
                <th style={{ padding: '0.85rem 1rem' }}>Email</th>
                <th style={{ padding: '0.85rem 1rem' }}>Role (RBAC)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Account Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>Joined</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                const isUpdating = updatingUserId === u.id;

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #ec4899, #6366f1)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}>
                          {u.first_name ? u.first_name[0] : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                          {isCurrent && <span style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>● Current Session</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-indigo' : 'badge-emerald'}`}>
                        {u.role === 'ADMIN' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${u.is_active ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.7rem' }}>
                        {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleRoleToggle(u)}
                        disabled={isUpdating}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                        title={u.role === 'ADMIN' ? 'Demote to Customer' : 'Promote to Admin'}
                      >
                        {isUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : u.role === 'ADMIN' ? (
                          <>
                            <ShieldAlert size={14} color="#f43f5e" />
                            <span>Revert to Customer</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} color="#6366f1" />
                            <span>Make Admin</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
