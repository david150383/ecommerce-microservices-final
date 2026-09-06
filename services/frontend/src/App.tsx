import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { ObservabilityBanner } from './components/ObservabilityBanner.tsx';
import { ProductGrid } from './components/ProductGrid.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { SagaTrackerModal } from './components/SagaTrackerModal.tsx';
import { SagaHistoryModal } from './components/SagaHistoryModal.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { ShieldCheck, Zap, Database, GitMerge } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

  const [activeView, setActiveView] = useState<'STORE' | 'ADMIN'>('STORE');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSagaHistoryOpen, setIsSagaHistoryOpen] = useState(false);
  const [activeSagaOrderId, setActiveSagaOrderId] = useState<string | null>(null);

  // Automatically ensure non-admins cannot stay in ADMIN view
  useEffect(() => {
    if (activeView === 'ADMIN' && !isAdmin) {
      setActiveView('STORE');
    }
  }, [activeView, isAdmin]);

  const handleOrderPlaced = (orderId: string) => {
    setActiveSagaOrderId(orderId);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Top Header */}
      <Header
        activeView={activeView}
        onToggleView={(view) => {
          if (view === 'ADMIN' && !isAdmin) {
            setIsAuthOpen(true);
            return;
          }
          setActiveView(view);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSagaHistory={() => setIsSagaHistoryOpen(true)}
      />

      {/* Main Content Area */}
      {activeView === 'ADMIN' && isAdmin ? (
        <AdminDashboard
          onReturnToStore={() => setActiveView('STORE')}
          onInspectSaga={(orderId) => setActiveSagaOrderId(orderId)}
        />
      ) : (
        <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '2.5rem 2rem', flexGrow: 1 }}>
          {/* Hero Section */}
          <section style={{ marginBottom: '3rem', textAlign: 'center', maxWidth: '880px', margin: '0 auto 3.5rem auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginBottom: '1.25rem',
            }}>
              <Zap size={14} color="#6366f1" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                7 Distributed Microservices • Full-Stack LGTM Observability
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '1.25rem',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1, #a5b4fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Resilient Event-Driven E-Commerce Platform
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
              Built with <strong>PostgreSQL Database-per-Service</strong>, <strong>Transactional Outbox</strong>, <strong>Idempotent Inbox</strong>, and <strong>Distributed Orchestrated Sagas</strong> with automatic compensating rollbacks.
            </p>

            {/* Architectural Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
              <span className="badge badge-indigo" style={{ padding: '0.4rem 0.85rem' }}>
                <Database size={13} /> 5 Isolated DBs
              </span>
              <span className="badge badge-emerald" style={{ padding: '0.4rem 0.85rem' }}>
                <GitMerge size={13} /> Compensating Sagas
              </span>
              <span className="badge badge-amber" style={{ padding: '0.4rem 0.85rem' }}>
                <ShieldCheck size={13} /> RS256 RSA-2048 JWT
              </span>
            </div>
          </section>

          {/* Observability Quick Launch Cards */}
          <ObservabilityBanner />

          {/* Product Catalog & Microsecond Pagination Grid */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem' }}>Product Catalog</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Cursor-based pagination from Product Service (Port 3002)
                </p>
              </div>
            </div>
            <ProductGrid />
          </div>
        </main>
      )}

      {/* Drawers & Modals */}
      <CartDrawer
        onOrderPlaced={handleOrderPlaced}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <SagaTrackerModal
        orderId={activeSagaOrderId}
        onClose={() => setActiveSagaOrderId(null)}
      />

      <SagaHistoryModal
        isOpen={isSagaHistoryOpen}
        onClose={() => setIsSagaHistoryOpen(false)}
        onSelectOrder={(orderId) => setActiveSagaOrderId(orderId)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 13, 20, 0.95)',
        padding: '2.5rem 2rem',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Apex Commerce</strong> — Production Microservices Architecture
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="http://localhost:3300" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Grafana (:3300)</a>
            <a href="http://localhost:9090" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Prometheus (:9090)</a>
            <a href="http://localhost:15672" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>RabbitMQ (:15672)</a>
            <a href="http://localhost:3000/health/ready" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Gateway Health (:3000)</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
