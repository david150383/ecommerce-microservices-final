import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, RefreshCw, Loader2, CheckCircle2, AlertCircle, Mail, MessageSquare, Globe, X, SlidersHorizontal } from 'lucide-react';
import { adminApi, AdminNotification } from '../../api/admin.api.ts';

export const AdminNotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'WEBHOOK'>('EMAIL');
  const [recipient, setRecipient] = useState('admin@example.com');
  const [subject, setSubject] = useState('System Broadcast: Platform Maintenance');
  const [body, setBody] = useState('All microservices and database nodes are performing nominal operations.');
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listAllNotifications({
        channel: channelFilter === 'ALL' ? undefined : channelFilter,
        limit: 50,
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load admin notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSending(true);

    try {
      await adminApi.sendManualNotification({ channel, recipient, subject, body });
      setIsModalOpen(false);
      fetchNotifications();
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch notification');
    } finally {
      setIsSending(false);
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'EMAIL':
        return <Mail size={12} />;
      case 'SMS':
        return <MessageSquare size={12} />;
      case 'WEBHOOK':
        return <Globe size={12} />;
      default:
        return <Bell size={12} />;
    }
  };

  const channels = ['ALL', 'EMAIL', 'SMS', 'WEBHOOK'];

  return (
    <div>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SlidersHorizontal size={16} color="var(--text-muted)" />
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-full)',
                background: channelFilter === ch ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.05)',
                color: channelFilter === ch ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: channelFilter === ch ? '#6366f1' : 'var(--border-subtle)',
              }}
            >
              {ch}
            </button>
          ))}
          <button className="btn btn-secondary" onClick={fetchNotifications} style={{ padding: '0.45rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Send size={16} />
          <span>Dispatch Notification</span>
        </button>
      </div>

      {/* Notifications Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading audit stream from Notification Service (:8006)...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No notification logs found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Channel</th>
                <th style={{ padding: '0.85rem 1rem' }}>Event / Type</th>
                <th style={{ padding: '0.85rem 1rem' }}>Recipient</th>
                <th style={{ padding: '0.85rem 1rem' }}>Subject & Content</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Delivered At</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr
                  key={n.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem' }}>
                    <span className="badge badge-indigo">
                      {getChannelIcon(n.channel)}
                      <span>{n.channel}</span>
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#a5b4fc' }}>
                    {n.eventType}
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {n.recipient}
                  </td>
                  <td style={{ padding: '1rem', maxWidth: '340px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {n.subject}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.body}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${n.status === 'DELIVERED' ? 'badge-emerald' : 'badge-rose'}`}>
                      {n.status === 'DELIVERED' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      <span>{n.status}</span>
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Dispatch Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Send size={18} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem' }}>Dispatch System Notification</h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Notification Service (:8006) delivery engine
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fb7185',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="EMAIL">EMAIL</option>
                    <option value="SMS">SMS</option>
                    <option value="WEBHOOK">WEBHOOK</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Recipient</label>
                  <input
                    type="text"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Body Message</label>
                <textarea
                  rows={3}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <span>Send Notification</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
