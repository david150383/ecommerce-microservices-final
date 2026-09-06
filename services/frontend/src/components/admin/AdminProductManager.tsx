import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Layers, Search, RefreshCw, Loader2, Tag, X, SlidersHorizontal } from 'lucide-react';
import { productsApi, Product } from '../../api/products.api.ts';
import { adminApi } from '../../api/admin.api.ts';
import { ProductFormModal } from './ProductFormModal.tsx';
import { RestockModal } from './RestockModal.tsx';
import { Pagination } from '../common/Pagination.tsx';

const CATEGORIES = [
  'ALL',
  'Computers',
  'Audio',
  'Wearables',
  'Accessories',
  'Displays',
  'Gaming',
  'Mobile',
  'Cameras',
  'Storage',
  'Smart Home',
];

export const AdminProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const res = await productsApi.getProducts(
        pageSize,
        null,
        categoryFilter === 'ALL' ? undefined : categoryFilter,
        debouncedSearch || undefined,
        offset,
        'ALL',
      );
      setProducts(res.data || []);
      setTotalItems(res.pagination.total ?? (res.data?.length || 0));
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, categoryFilter, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await adminApi.deleteProduct(id);
      // If we deleted the only item on the last page, navigate back one page
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchProducts();
      }
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message || 'Unknown error'}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '280px', maxWidth: '400px', flexGrow: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, SKU, or specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={fetchProducts} style={{ padding: '0.65rem' }} title="Refresh">
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

        {/* Category Pills Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.2rem' }}>
            <SlidersHorizontal size={13} />
            <span>Category:</span>
          </div>
          {CATEGORIES.map((cat) => {
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: isSelected ? '#6366f1' : 'var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontWeight: isSelected ? 600 : 400,
                  fontFamily: 'inherit',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading catalog page {currentPage} from Product Service...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            No products found matching your filter criteria.
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
              {products.map((p) => (
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

        {/* Number-Based Pagination */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading}
          />
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

