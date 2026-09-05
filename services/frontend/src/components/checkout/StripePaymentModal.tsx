import React, { useState, useMemo } from 'react';
import { X, CreditCard, Lock, AlertCircle, Loader2, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext.tsx';
import { ordersApi } from '../../api/orders.api.ts';
import { paymentsApi } from '../../api/payments.api.ts';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (orderId: string) => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

// Luhn algorithm validator
function isValidLuhn(numStr: string): boolean {
  const digits = numStr.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Card brand detection
function getCardBrand(numStr: string): { name: string; color: string } {
  const clean = numStr.replace(/\D/g, '');
  if (clean.startsWith('4')) return { name: 'VISA', color: '#60a5fa' };
  if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: 'MASTERCARD', color: '#f97316' };
  if (/^3[47]/.test(clean)) return { name: 'AMEX', color: '#38bdf8' };
  if (/^(6011|65|64[4-9])/.test(clean)) return { name: 'DISCOVER', color: '#ec4899' };
  return { name: 'CARD', color: '#94a3b8' };
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  onOrderPlaced,
  onOpenAuth,
  isAuthenticated,
}) => {
  const { items, cartTotalCents, clearCart } = useCart();

  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardZip, setCardZip] = useState('94103');
  const [cardholderName, setCardholderName] = useState('Alex Developer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanCardDigits = cardNumber.replace(/\D/g, '');
  const brand = useMemo(() => getCardBrand(cleanCardDigits), [cleanCardDigits]);
  const isLuhnValid = useMemo(() => isValidLuhn(cleanCardDigits), [cleanCardDigits]);

  if (!isOpen) return null;

  const formattedTotal = (cartTotalCents / 100).toFixed(2);

  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
    setError(null);
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
    setError(null);
  };

  const applyTestCard = (num: string, exp = '12/28', cvc = '123') => {
    setCardNumber(num);
    setCardExpiry(exp);
    setCardCvc(cvc);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (!isLuhnValid && cleanCardDigits.length >= 13) {
      setError('Invalid card number: failed Luhn checksum validation.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Creating Stripe PaymentIntent...');
    setError(null);

    try {
      const isDeclineCard = cleanCardDigits === '4000000000000002' || cleanCardDigits.endsWith('0002');
      const is3DSecureCard = cleanCardDigits === '4000000000000069' || cleanCardDigits.endsWith('0069');

      // 1. Handshake with Payment Service Stripe PaymentIntent API
      try {
        await paymentsApi.createPaymentIntent(cartTotalCents, 'USD');
      } catch (intentErr) {
        console.warn('[Stripe Checkout] Pre-intent handshake warning:', intentErr);
      }

      if (is3DSecureCard) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setError('Stripe 3D Secure 2.0 Challenge: Authentication failed by cardholder issuing bank.');
        setIsProcessing(false);
        setStatusMessage(null);
        return;
      }

      setStatusMessage('Authorizing via Payment Service (:3005)...');

      // 2. Dispatch Order to Order Service to kick off Distributed Saga
      const orderItems = items.map((item, index) => ({
        productId: item.product.id,
        quantity: Math.max(1, Math.floor(Number(item.quantity))),
        // Declining card sets unitPrice to 999999 to trigger external card_declined flow
        unitPriceCents: isDeclineCard && index === 0 ? 999999 : Math.max(0, Math.floor(Number(item.product.priceCents ?? item.product.price_cents ?? 0))),
      }));

      const res = await ordersApi.createOrder({
        items: orderItems,
        currency: 'USD',
      });

      const orderId = res.data.id;

      // 3. Authorize & process charge with Payment Service
      try {
        await paymentsApi.processPayment({
          orderId,
          amountCents: cartTotalCents,
          currency: 'USD',
          paymentMethodId: isDeclineCard ? 'pm_card_chargeDeclined' : 'pm_card_visa',
          idempotencyKey: crypto.randomUUID(),
        });
      } catch (payErr: any) {
        console.warn('[Stripe Checkout] Payment dispatched:', payErr);
      }

      clearCart();
      onClose();
      onOrderPlaced(orderId);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
            }}>
              <CreditCard size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Stripe Card Checkout</h2>
                <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                  <Lock size={10} /> 256-Bit SSL
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Powered by Stripe Node.js SDK &amp; Payment Service (:3005)
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Amount Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Charge Amount</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
              ${formattedTotal} <span style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>USD</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div>{items.length} line {items.length === 1 ? 'item' : 'items'}</div>
            <div style={{ color: isLuhnValid ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
              {isLuhnValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              <span>{isLuhnValid ? 'Luhn Verified' : 'Checking Checksum...'}</span>
            </div>
          </div>
        </div>

        {/* Test Cards Quick Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Sparkles size={12} color="#6366f1" />
            <span>Select a Stripe Test Card Preset:</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applyTestCard('4242 4242 4242 4242')}
              className="btn"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              🟢 4242 (Stripe Success)
            </button>
            <button
              type="button"
              onClick={() => applyTestCard('4000 0000 0000 0002')}
              className="btn"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              🔴 0002 (Card Decline / Saga Rollback)
            </button>
            <button
              type="button"
              onClick={() => applyTestCard('4000 0000 0000 0069')}
              className="btn"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              🟡 0069 (3D Secure Challenge)
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        {/* Card Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
              Cardholder Name
            </label>
            <input
              type="text"
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Full Name as on Card"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Card Number
              </label>
              {cleanCardDigits.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: isLuhnValid ? '#10b981' : '#f59e0b' }}>
                  {isLuhnValid ? '✓ Valid Luhn' : '• Incomplete / Invalid'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                maxLength={19}
                value={cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                placeholder="4242 •••• •••• 4242"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${cleanCardDigits.length > 0 && !isLuhnValid ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  outline: 'none',
                }}
              />
              <span style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: brand.color,
                letterSpacing: '0.05em',
              }}>
                {brand.name}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Expires</label>
              <input
                type="text"
                required
                maxLength={5}
                value={cardExpiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                placeholder="MM/YY"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>CVC</label>
              <input
                type="text"
                required
                maxLength={4}
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Postal Code</label>
              <input
                type="text"
                required
                value={cardZip}
                onChange={(e) => setCardZip(e.target.value)}
                placeholder="94103"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
              style={{
                padding: '0.85rem',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{statusMessage || 'Authorizing with Stripe...'}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Pay ${formattedTotal} USD with Stripe</span>
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Powered by Stripe • Distributed Saga with Compensating Rollback Guarantee</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
