import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { productsApi, Product } from '../api/products.api.ts';
import { ProductCard } from './ProductCard.tsx';

export const ProductGrid: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchInitialProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await productsApi.getProducts(8, null);
      setProducts(response.data || []);
      setNextCursor(response.pagination?.next_cursor || null);
      setHasMore(response.pagination?.has_more || false);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialProducts();
  }, [fetchInitialProducts]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await productsApi.getProducts(8, nextCursor);
      setProducts((prev) => [...prev, ...(response.data || [])]);
      setNextCursor(response.pagination?.next_cursor || null);
      setHasMore(response.pagination?.has_more || false);
    } catch (err) {
      console.error('Failed to load more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section style={{ marginBottom: '4rem' }}>
      {/* Search & Category Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          minWidth: '280px',
          maxWidth: '400px',
          flexGrow: 1,
        }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search electronics, accessories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.65rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SlidersHorizontal size={16} color="var(--text-muted)" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-full)',
                background: selectedCategory === cat ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: selectedCategory === cat ? '#6366f1' : 'var(--border-subtle)',
              }}
            >
              {cat}
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={fetchInitialProducts}
            style={{ padding: '0.4rem 0.6rem' }}
            title="Refresh Catalog"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
          <Loader2 size={36} color="#6366f1" className="animate-spin" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading catalog from Product Service (Port 3002)...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No products found matching your search.</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.75rem',
          }}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Cursor Pagination Button */}
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
              <button
                className="btn btn-secondary"
                onClick={loadMore}
                disabled={isLoadingMore}
                style={{ minWidth: '220px', padding: '0.85rem 1.5rem', fontSize: '1rem' }}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Querying Cursor...</span>
                  </>
                ) : (
                  <span>Load More Products</span>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
