import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, MessageSquare, Webhook, CheckCircle2, Loader2 } from 'lucide-react';
import { notificationsApi, NotificationRecord } from '../api/notifications.api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const res = await notificationsApi.getNotifications();
        setNotifications(res.data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL': return <Mail size={16} color="#3b82f6" />;
      case 'SMS': return <MessageSquare size={16} color="#10b981" />;
      case 'WEBHOOK': return <Webhook size={16} color="#ec4899" />;
      default: return <Bell size={16} color="#6366f1" />;
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bell size={18} color="#6366f1" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Customer Notifications</h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Multi-channel delivery audit logs (Notification Service :8006)
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {!isAuthenticated ? (
          <div style={{ margin: 'auto 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <p style={{ fontSize: '1rem', marginBottom: '1rem' }}>Please sign in to view your notification history.</p>
            <button className="btn btn-primary" onClick={onOpenAuth}>
              Sign In
            </button>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto 0', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Querying delivery audit log...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ margin: 'auto 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>No notifications yet</p>
            <p style={{ fontSize: '0.85rem' }}>Order confirmation events and status alerts will appear here</p>
          </div>
        ) : (
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingRight: '0.4rem' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {getChannelIcon(n.channel)}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {n.channel} • {n.template_type}
                    </span>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    <CheckCircle2 size={10} /> {n.status}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  {n.subject}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Recipient: {n.recipient} • {new Date(n.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
