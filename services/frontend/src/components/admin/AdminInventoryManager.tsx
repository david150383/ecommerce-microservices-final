import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Search, RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { productsApi, Product } from '../../api/products.api.ts';
import { adminApi, InventoryRecord } from '../../api/admin.api.ts';
import { RestockModal } from './RestockModal.tsx';

export const AdminInventoryManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodsRes, invRes] = await Promise.all([
        productsApi.getProducts(50, null),
        adminApi.listAllInventory(),
      ]);

      setProducts(prodsRes.data || []);

      const invLookup: Record<string, InventoryRecord> = {};
      (invRes.data || []).forEach((inv) => {
        invLookup[inv.product_id] = inv;
      });
      setInventoryMap(invLookup);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            placeholder="Search SKUs or product titles..."
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
          <button className="btn btn-secondary" onClick={fetchData} style={{ padding: '0.65rem' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
            <Loader2 size={32} color="#6366f1" className="animate-spin" />
            <p style={{ color: 'var(--text-secondary)' }}>Querying stock levels from Inventory Service (:3004)...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No products found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>SKU</th>
                <th style={{ padding: '0.85rem 1rem' }}>Product Title</th>
                <th style={{ padding: '0.85rem 1rem' }}>Available Stock</th>
                <th style={{ padding: '0.85rem 1rem' }}>In-Flight Reserved</th>
                <th style={{ padding: '0.85rem 1rem' }}>Total Stock Pool</th>
                <th style={{ padding: '0.85rem 1rem' }}>Stock Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const inv = inventoryMap[p.id];
                const available = inv ? inv.available_quantity : 0;
                const reserved = inv ? inv.reserved_quantity : 0;
                const total = available + reserved;
                const isOutOfStock = available <= 0;
                const isLowStock = available > 0 && available < 10;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#a5b4fc' }}>
                      {p.sku}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, fontSize: '1rem', color: isOutOfStock ? '#f43f5e' : isLowStock ? '#f59e0b' : '#10b981' }}>
                      {available} units
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: reserved > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
                      {reserved} reserved
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {total} units
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isOutOfStock && (
                        <span className="badge badge-rose">
                          <AlertTriangle size={12} /> Out of Stock
                        </span>
                      )}
                      {isLowStock && (
                        <span className="badge badge-amber">
                          <AlertTriangle size={12} /> Low Stock (&lt;10)
                        </span>
                      )}
                      {!isOutOfStock && !isLowStock && (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> In Stock
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setRestockProduct(p)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Layers size={14} color="#10b981" />
                        <span>Restock Pool</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RestockModal
        product={restockProduct}
        onClose={() => setRestockProduct(null)}
        onRestocked={fetchData}
      />
    </div>
  );
};
