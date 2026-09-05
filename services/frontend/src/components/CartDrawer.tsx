import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShieldAlert, Sparkles, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { ordersApi } from '../api/orders.api.ts';
import { StripePaymentModal } from './checkout/StripePaymentModal.tsx';

interface CartDrawerProps {
  onOrderPlaced: (orderId: string) => void;
  onOpenAuth: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOrderPlaced, onOpenAuth }) => {
  const { items, cartCount, cartTotalCents, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const handleCheckout = async (simulateDecline = false) => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    if (items.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // If simulating decline, set first item price to $9,999.99 (999999 cents) to trigger Mock Gateway card decline rule
      const orderItems = items.map((item, index) => ({
        productId: item.product.id,
        quantity: Math.max(1, Math.floor(Number(item.quantity))),
        unitPriceCents: simulateDecline && index === 0 ? 999999 : Math.max(0, Math.floor(Number(item.product.price_cents))),
      }));

      const res = await ordersApi.createOrder({
        items: orderItems,
        currency: 'USD',
      });

      clearCart();
      setIsCartOpen(false);
      onOrderPlaced(res.data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate order saga');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedSubtotal = `$${(cartTotalCents / 100).toFixed(2)}`;

  return (
    <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)}>
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
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>Your Shopping Cart</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {cartCount} {cartCount === 1 ? 'item' : 'items'} in cart
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => setIsCartOpen(false)} style={{ padding: '0.5rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
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

        {/* Items List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem' }}>Add items from the product catalog to begin</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{item.product.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    ${(item.product.price_cents / 100).toFixed(2)} each
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    style={{ padding: '0.2rem', minWidth: '24px', height: '24px' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    style={{ padding: '0.2rem', minWidth: '24px', height: '24px' }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Remove Item */}
                <button
                  className="btn btn-secondary"
                  onClick={() => removeFromCart(item.product.id)}
                  style={{ padding: '0.4rem', color: '#f43f5e' }}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Actions */}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formattedSubtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Shipping & Handling</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: '#ffffff', fontFamily: 'var(--font-display)' }}>{formattedSubtotal}</span>
            </div>

            {!isAuthenticated ? (
              <button
                className="btn btn-primary"
                onClick={onOpenAuth}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
              >
                Sign In to Checkout
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Stripe Checkout */}
                <button
                  className="btn btn-primary"
                  onClick={() => setIsStripeModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <CreditCard size={18} />
                  <span>Pay with Stripe (Card Checkout)</span>
                </button>

                {/* Instant 1-Click Checkout */}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCheckout(false)}
                  disabled={isSubmitting}
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Emitting Order Saga...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} color="#6366f1" />
                      <span>1-Click Fast Checkout</span>
                    </>
                  )}
                </button>

                {/* Failure Simulation Checkout */}
                <button
                  className="btn btn-danger"
                  onClick={() => handleCheckout(true)}
                  disabled={isSubmitting}
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                  title="Triggers card decline to visualize compensating rollback"
                >
                  <ShieldAlert size={15} />
                  <span>Simulate Card Decline (Compensating Rollback)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <StripePaymentModal
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        onOrderPlaced={(orderId) => {
          setIsCartOpen(false);
          onOrderPlaced(orderId);
        }}
        onOpenAuth={onOpenAuth}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};
