import React, { useState } from 'react';
import { Package, ShoppingBag, ShieldCheck, ArrowLeft, Users, Layers, Bell } from 'lucide-react';
import { AdminProductManager } from './AdminProductManager.tsx';
import { AdminInventoryManager } from './AdminInventoryManager.tsx';
import { AdminOrderMonitor } from './AdminOrderMonitor.tsx';
import { AdminUserManager } from './AdminUserManager.tsx';
import { AdminNotificationManager } from './AdminNotificationManager.tsx';

interface AdminDashboardProps {
  onReturnToStore: () => void;
  onInspectSaga: (orderId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onReturnToStore, onInspectSaga }) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'INVENTORY' | 'ORDERS' | 'USERS' | 'NOTIFICATIONS'>('PRODUCTS');

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
      {/* Top Admin Subheader */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onReturnToStore} style={{ padding: '0.5rem 0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Return to Storefront</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Operations Console</h1>
              <span className="badge badge-indigo">
                <ShieldCheck size={12} /> RBAC: ADMIN
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Full-cluster governance across Product, Inventory, Order, Auth, and Notification microservices
            </p>
          </div>
        </div>

        {/* 5-Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.2rem' }}>
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className="btn"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              background: activeTab === 'PRODUCTS' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'PRODUCTS' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'PRODUCTS' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Package size={15} />
            <span>Products</span>
          </button>
          <button
            onClick={() => setActiveTab('INVENTORY')}
            className="btn"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              background: activeTab === 'INVENTORY' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'INVENTORY' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'INVENTORY' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Layers size={15} />
            <span>Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className="btn"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              background: activeTab === 'ORDERS' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'ORDERS' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'ORDERS' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <ShoppingBag size={15} />
            <span>Orders & Sagas</span>
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className="btn"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              background: activeTab === 'USERS' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'USERS' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'USERS' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Users size={15} />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className="btn"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              background: activeTab === 'NOTIFICATIONS' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'NOTIFICATIONS' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'NOTIFICATIONS' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Bell size={15} />
            <span>Notifications</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'PRODUCTS' && <AdminProductManager />}
      {activeTab === 'INVENTORY' && <AdminInventoryManager />}
      {activeTab === 'ORDERS' && <AdminOrderMonitor onInspectSaga={onInspectSaga} />}
      {activeTab === 'USERS' && <AdminUserManager />}
      {activeTab === 'NOTIFICATIONS' && <AdminNotificationManager />}
    </div>
  );
};
