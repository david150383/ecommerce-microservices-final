import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Layers, Search, RefreshCw, Loader2, Tag } from 'lucide-react';
import { productsApi, Product } from '../../api/products.api.ts';
import { adminApi } from '../../api/admin.api.ts';
import { ProductFormModal } from './ProductFormModal.tsx';
import { RestockModal } from './RestockModal.tsx';

export const AdminProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productsApi.getProducts(50, null);
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await adminApi.deleteProduct(id);
      fetchProducts();
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message || 'Unknown error'}`);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flexGrow: 1 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchProducts} style={{ padding: '0.65rem' }}>
            <RefreshCw size={16} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading catalog from Product Service...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No products found. Click "Add Product" to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Product</th>
                <th style={{ padding: '0.85rem 1rem' }}>SKU</th>
                <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                <th style={{ padding: '0.85rem 1rem' }}>Price</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.sku}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                      <Tag size={10} /> {p.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                    ${(p.price_cents / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${p.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setRestockProduct(p)}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        title="Restock Inventory"
                      >
                        <Layers size={14} color="#10b981" />
                        <span>Restock</span>
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        title="Edit Product"
                      >
                        <Edit2 size={14} color="#6366f1" />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(p.id, p.name)}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: '#f43f5e' }}
                        title="Delete Product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchProducts}
        editingProduct={editingProduct}
      />

      <RestockModal
        product={restockProduct}
        onClose={() => setRestockProduct(null)}
        onRestocked={fetchProducts}
      />
    </div>
  );
};
