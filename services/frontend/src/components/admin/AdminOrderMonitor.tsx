import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock, Search, SlidersHorizontal } from 'lucide-react';
import { adminApi } from '../../api/admin.api.ts';
import { Order } from '../../api/orders.api.ts';

interface AdminOrderMonitorProps {
  onInspectSaga: (orderId: string) => void;
}

export const AdminOrderMonitor: React.FC<AdminOrderMonitorProps> = ({ onInspectSaga }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listAllOrders(50, statusFilter === 'ALL' ? undefined : statusFilter);
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load global admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filteredOrders = orders.filter((o) =>
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.correlation_id && o.correlation_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statuses = ['ALL', 'COMPLETED', 'PENDING', 'CONFIRMED', 'CANCELLED'];

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
            placeholder="Search by Order ID, Customer, or Correlation..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SlidersHorizontal size={16} color="var(--text-muted)" />
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-full)',
                background: statusFilter === st ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: statusFilter === st ? '#6366f1' : 'var(--border-subtle)',
              }}
            >
              {st}
            </button>
          ))}
          <button className="btn btn-secondary" onClick={fetchOrders} style={{ padding: '0.45rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ color: 'var(--text-secondary)' }}>Polling cluster orders from Order Service (:3003)...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No orders found matching the criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Order ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.85rem 1rem' }}>Amount</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>Created At</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Saga Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    #{o.id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {o.customer_id.slice(0, 12)}...
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                    ${(o.total_amount_cents / 100).toFixed(2)} {o.currency}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {o.status === 'COMPLETED' && <span className="badge badge-emerald"><CheckCircle2 size={10} /> COMPLETED</span>}
                    {o.status === 'CANCELLED' && (
                      <span className="badge badge-rose" title={o.cancellation_reason || 'CANCELLED'}>
                        <AlertCircle size={10} /> CANCELLED
                      </span>
                    )}
                    {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                      <span className="badge badge-amber"><Clock size={10} /> {o.status}</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onInspectSaga(o.id)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} color="#6366f1" />
                      <span>Inspect Saga</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
