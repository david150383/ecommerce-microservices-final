import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, ArrowRight, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { ordersApi, Order } from '../api/orders.api.ts';

interface SagaTrackerModalProps {
  orderId: string | null;
  onClose: () => void;
}

export const SagaTrackerModal: React.FC<SagaTrackerModalProps> = ({ orderId, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let isSubscribed = true;

    const fetchOrder = async () => {
      try {
        const res = await ordersApi.getOrder(orderId);
        if (isSubscribed) {
          setOrder(res.data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isSubscribed) {
          setError(err.message || 'Failed to poll order status');
          setIsLoading(false);
        }
      }
    };

    fetchOrder();

    // Auto-poll every 1.5 seconds if order is still in progress
    const interval = setInterval(() => {
      if (order && (order.status === 'COMPLETED' || order.status === 'CANCELLED')) {
        clearInterval(interval);
        return;
      }
      fetchOrder();
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [orderId, order?.status]);

  if (!orderId) return null;

  const isCompleted = order?.status === 'COMPLETED';
  const isCancelled = order?.status === 'CANCELLED';
  const isConfirmed = order?.status === 'CONFIRMED';
  const cancellationReason = order?.cancellation_reason || order?.cancellationReason || '';
  const isInventoryFailure = isCancelled && (
    cancellationReason.includes('PRODUCT_NOT_FOUND') ||
    cancellationReason.includes('INSUFFICIENT') ||
    cancellationReason.includes('INVENTORY') ||
    cancellationReason.includes('STOCK')
  );
  const isPaymentFailure = isCancelled && !isInventoryFailure;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Layers size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem' }}>Distributed Saga Orchestration Tracker</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Real-time event lifecycle across Order, Inventory, Payment, and Notification services
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fb7185',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && !order && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <p>Initializing Saga Tracker...</p>
          </div>
        )}

        {/* Order Details Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ORDER ID</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              {order?.id?.slice(0, 8)}...
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>STATUS</div>
            <div>
              <span className={`badge ${
                isCompleted ? 'badge-emerald' : isCancelled ? 'badge-rose' : 'badge-amber'
              }`}>
                {order?.status || 'POLLING'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL CHARGE</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              ${((order?.total_amount_cents || order?.totalAmountCents || 0) / 100).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CORRELATION ID</div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {order?.correlation_id ? `${order.correlation_id.slice(0, 8)}...` : 'Generating...'}
            </div>
          </div>
        </div>

        {/* Dynamic Saga Flow Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Step 1: Order Initiated */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={18} color="#ffffff" />
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>1. Order Created & Emitted (order.created)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Transactional Outbox in Order DB (Port 3003) published event to RabbitMQ
              </div>
            </div>
            <span className="badge badge-emerald">COMPLETED</span>
          </div>

          {/* Step 2: Inventory Reservation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: isInventoryFailure
              ? '1px solid rgba(244, 63, 94, 0.4)'
              : isPaymentFailure
              ? '1px solid rgba(245, 158, 11, 0.4)'
              : (isCompleted || isConfirmed)
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isInventoryFailure ? '#f43f5e' : isPaymentFailure ? '#f59e0b' : (isCompleted || isConfirmed) ? '#10b981' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isInventoryFailure ? (
                <AlertCircle size={18} color="#ffffff" />
              ) : isPaymentFailure ? (
                <RefreshCw size={16} color="#ffffff" />
              ) : (isCompleted || isConfirmed) ? (
                <CheckCircle2 size={18} color="#ffffff" />
              ) : (
                <Clock size={18} color="#ffffff" />
              )}
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {isInventoryFailure
                  ? '2. Inventory Reservation Failed (inventory.reservation_failed)'
                  : isPaymentFailure
                  ? '2. Inventory Compensated & Released (order.cancelled)'
                  : '2. Inventory Stock Reserved (inventory.reserved)'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isInventoryFailure
                  ? `Inventory Service (Port 3004) reservation failed: ${cancellationReason === 'PRODUCT_NOT_FOUND' ? 'Product not found in inventory stock pool' : cancellationReason}`
                  : isPaymentFailure
                  ? 'Inventory Service (Port 3004) processed compensation: available stock released'
                  : 'Inventory Service (Port 3004) processed Idempotent Inbox & Outbox confirmation'}
              </div>
            </div>
            <span className={`badge ${isInventoryFailure ? 'badge-rose' : isPaymentFailure ? 'badge-amber' : (isCompleted || isConfirmed) ? 'badge-emerald' : 'badge-amber'}`}>
              {isInventoryFailure ? 'RESERVATION FAILED' : isPaymentFailure ? 'ROLLBACK COMPLETE' : (isCompleted || isConfirmed) ? 'CONFIRMED' : 'RESERVING'}
            </span>
          </div>

          {/* Step 3: Payment Gateway */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: isPaymentFailure
              ? '1px solid rgba(244, 63, 94, 0.4)'
              : isInventoryFailure
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : isCompleted
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isPaymentFailure ? '#f43f5e' : isInventoryFailure ? 'rgba(255, 255, 255, 0.1)' : isCompleted ? '#10b981' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isPaymentFailure ? (
                <AlertCircle size={18} color="#ffffff" />
              ) : isInventoryFailure ? (
                <Clock size={18} color="#94a3b8" />
              ) : isCompleted ? (
                <ShieldCheck size={18} color="#ffffff" />
              ) : (
                <Clock size={18} color="#ffffff" />
              )}
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {isPaymentFailure
                  ? '3. Payment Failed (payment.failed)'
                  : isInventoryFailure
                  ? '3. Payment Gateway (Skipped)'
                  : '3. Payment Authorized (payment.completed)'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isPaymentFailure
                  ? `Payment Gateway (Port 3005) declined charge: ${cancellationReason || 'CARD_DECLINED_INSUFFICIENT_FUNDS'}`
                  : isInventoryFailure
                  ? 'Payment processing was not invoked because inventory reservation failed.'
                  : 'Payment Service (Port 3005) captured payment and emitted payment.completed'}
              </div>
            </div>
            <span className={`badge ${isPaymentFailure ? 'badge-rose' : isInventoryFailure ? 'badge-secondary' : isCompleted ? 'badge-emerald' : 'badge-amber'}`}>
              {isPaymentFailure ? 'DECLINED' : isInventoryFailure ? 'SKIPPED' : isCompleted ? 'AUTHORIZED' : 'PROCESSING'}
            </span>
          </div>

          {/* Step 4: Final State */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: isCancelled
              ? '1px solid rgba(244, 63, 94, 0.5)'
              : isCompleted
              ? '1px solid rgba(16, 185, 129, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isCancelled ? 'rgba(244, 63, 94, 0.2)' : isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `2px solid ${isCancelled ? '#f43f5e' : isCompleted ? '#10b981' : 'var(--text-muted)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowRight size={18} color={isCancelled ? '#f43f5e' : isCompleted ? '#10b981' : 'var(--text-muted)'} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {isCancelled ? '4. Saga Compensation Finished (CANCELLED)' : isCompleted ? '4. Saga Orchestration Complete (COMPLETED)' : '4. Finalizing Order Lifecycle...'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isCancelled
                  ? 'All microservice states rolled back cleanly. No stranded inventory, zero negative stock.'
                  : 'Customer notified via Notification Service (Port 8006), order marked completed.'}
              </div>
            </div>
            <span className={`badge ${isCancelled ? 'badge-rose' : isCompleted ? 'badge-emerald' : 'badge-indigo'}`}>
              {isCancelled ? 'CANCELLED' : isCompleted ? 'FULFILLED' : 'FINALIZING'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
