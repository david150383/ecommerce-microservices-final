import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, AlertCircle, Eye, Loader2 } from 'lucide-react';
import { ordersApi, Order } from '../api/orders.api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SagaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  onOpenAuth: () => void;
}

export const SagaHistoryModal: React.FC<SagaHistoryModalProps> = ({ isOpen, onClose, onSelectOrder, onOpenAuth }) => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await ordersApi.listCustomerOrders();
        setOrders(res.data || []);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>Your Orders & Saga Lifecycle History</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Inspect distributed state machine transitions for past orders
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {!isAuthenticated ? (
          <div style={{ textAlign: 'center', margin: 'auto 0', padding: '2rem' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Please sign in to view your order history and saga lifecycles.
            </p>
            <button className="btn btn-primary" onClick={() => { onClose(); onOpenAuth(); }}>
              Sign In
            </button>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto 0', gap: '0.75rem', padding: '3rem' }}>
            <Loader2 size={36} color="#6366f1" className="animate-spin" />
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Querying Order Service (:3003)...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto 0', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No orders placed yet</p>
            <p style={{ fontSize: '0.85rem' }}>Place a standard or failure simulation order to view the live saga lifecycle</p>
          </div>
        ) : (
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      Order #{o.id.slice(0, 8)}
                    </span>
                    {o.status === 'COMPLETED' && <span className="badge badge-emerald"><CheckCircle2 size={10} /> COMPLETED</span>}
                    {o.status === 'CANCELLED' && <span className="badge badge-rose"><AlertCircle size={10} /> CANCELLED</span>}
                    {(o.status === 'PENDING' || o.status === 'CONFIRMED') && <span className="badge badge-amber"><Clock size={10} /> {o.status}</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Total: ${(o.total_amount_cents / 100).toFixed(2)} {o.currency} • Placed {new Date(o.created_at).toLocaleDateString()} at {new Date(o.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    onClose();
                    onSelectOrder(o.id);
                  }}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                >
                  <Eye size={14} color="#6366f1" />
                  <span>Inspect Saga</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
