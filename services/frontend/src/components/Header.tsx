import React, { useState, useEffect } from 'react';
import { ShoppingBag, Bell, User, Activity, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { healthApi, CompositeHealthResponse } from '../api/health.api.ts';

interface HeaderProps {
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onOpenSagaHistory: () => void;
  activeView: 'STORE' | 'ADMIN';
  onToggleView: (view: 'STORE' | 'ADMIN') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onOpenNotifications,
  onOpenSagaHistory,
  activeView,
  onToggleView,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const [health, setHealth] = useState<CompositeHealthResponse | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await healthApi.getCompositeHealth();
        setHealth(data);
      } catch {
        setHealth(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'READY';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0.85rem 2rem',
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo & Cluster Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.5)',
            }}>
              <Activity size={20} color="#ffffff" />
            </div>
            <div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                APEX
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#6366f1',
                marginLeft: '4px',
                letterSpacing: '0.1em',
              }}>
                MICROSERVICES
              </span>
            </div>
          </div>

          {/* Composite Health Indicator */}
          <div
            className={`badge ${isHealthy ? 'badge-emerald' : 'badge-amber'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'default' }}
            title={`Status: ${health?.status || 'CONNECTING'} across 7 microservices + DBs + Redis + RabbitMQ`}
          >
            <div className={`pulse-dot ${isHealthy ? 'ready' : ''}`} />
            <span>Cluster {health?.status || 'CONNECTING'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Admin / Store Switcher */}
          {activeView === 'STORE' ? (
            <button
              className="btn btn-secondary"
              onClick={() => onToggleView('ADMIN')}
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', borderColor: 'rgba(236, 72, 153, 0.4)' }}
              title="Switch to Admin Operations Console"
            >
              <ShieldCheck size={16} color="#ec4899" />
              <span>Admin Console</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => onToggleView('STORE')}
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
              title="Return to Customer Storefront"
            >
              <ShoppingBag size={16} />
              <span>Storefront</span>
            </button>
          )}

          {/* Saga History Trigger */}
          <button
            className="btn btn-secondary"
            onClick={onOpenSagaHistory}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
          >
            <Activity size={16} color="#6366f1" />
            <span>Saga Tracker</span>
          </button>

          {/* Notifications Trigger */}
          <button
            className="btn btn-secondary"
            onClick={onOpenNotifications}
            style={{ position: 'relative', padding: '0.6rem' }}
            title="Notification Center & Audit Log"
          >
            <Bell size={18} />
          </button>

          {/* Shopping Cart Button */}
          <button
            className="btn btn-primary"
            onClick={() => setIsCartOpen(true)}
            style={{ position: 'relative' }}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#ec4899',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(236, 72, 153, 0.8)',
              }}>
                {cartCount}
              </span>
            )}
          </button>

          {/* User Session Menu */}
          {isAuthenticated && user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  {user.first_name[0]}
                </div>
                <span>{user.first_name}</span>
              </button>

              {userDropdownOpen && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '220px',
                    padding: '0.75rem',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.first_name} {user.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    <div className="badge badge-indigo" style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>
                      Role: {user.role}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    style={{ justifyContent: 'flex-start', color: '#f43f5e', width: '100%' }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={onOpenAuth}>
              <User size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
