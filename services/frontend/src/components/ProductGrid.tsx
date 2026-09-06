import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Search, SlidersHorizontal, Sparkles, X, Layers, Database } from 'lucide-react';
import { productsApi, Product } from '../api/products.api.ts';
import { ProductCard } from './ProductCard.tsx';

const CATALOG_CATEGORIES = [
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

const PAGE_SIZE = 12;

export const ProductGrid: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch first page whenever category or search filter changes
  const fetchProducts = useCallback(async (cat: string, search: string) => {
    setIsLoading(true);
    try {
      const response = await productsApi.getProducts(PAGE_SIZE, null, cat, search);
      setProducts(response.data || []);
      setNextCursor(response.pagination?.next_cursor || null);
      setHasMore(response.pagination?.has_more || false);
      if (response.pagination?.total !== undefined) {
        setTotalCount(response.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(selectedCategory, debouncedSearch);
  }, [selectedCategory, debouncedSearch, fetchProducts]);

  // Load next page using the keyset cursor
  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await productsApi.getProducts(
        PAGE_SIZE,
        nextCursor,
        selectedCategory,
        debouncedSearch,
      );
      setProducts((prev) => {
        // Deduplicate in case of any overlap
        const existingIds = new Set(prev.map((p) => p.id));
        const newUnique = (response.data || []).filter((p) => !existingIds.has(p.id));
        return [...prev, ...newUnique];
      });
      setNextCursor(response.pagination?.next_cursor || null);
      setHasMore(response.pagination?.has_more || false);
    } catch (err) {
      console.error('Failed to load more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCategorySelect = (cat: string) => {
    if (selectedCategory === cat) return;
    setSelectedCategory(cat);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
  };

  return (
    <section style={{ marginBottom: '4rem' }}>
      {/* Top Filter & Search Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        {/* Search bar and refresh */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Search Input */}
          <div style={{
            position: 'relative',
            minWidth: '280px',
            maxWidth: '460px',
            flexGrow: 1,
          }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by title, SKU, or specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 2.6rem 0.75rem 2.65rem',
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
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '12px',
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
                <X size={16} />
              </button>
            )}
          </div>

          {/* Cursor status and refresh badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              className="badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: '#a5b4fc',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Database size={13} color="#818cf8" />
              <span>Keyset Cursor (created_at, id)</span>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => fetchProducts(selectedCategory, debouncedSearch)}
              style={{ padding: '0.65rem 0.85rem' }}
              title="Refresh Catalog"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          flexWrap: 'wrap',
          paddingBottom: '0.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.25rem' }}>
            <SlidersHorizontal size={14} />
            <span>Category:</span>
          </div>

          {CATALOG_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className="btn"
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-full)',
                  background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: isSelected ? '#6366f1' : 'var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Summary Bar */}
      {!isLoading && products.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0.85rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={14} color="#818cf8" />
            <span>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{products.length}</strong>
              {totalCount !== null && ` of ${totalCount}`} products
              {selectedCategory !== 'ALL' && ` in ${selectedCategory}`}
              {debouncedSearch && ` matching "${debouncedSearch}"`}
            </span>
          </div>

          {nextCursor && (
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Next Cursor: {nextCursor.slice(0, 16)}...
            </div>
          )}
        </div>
      )}

      {/* Product Cards Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '1rem' }}>
          <Loader2 size={36} color="#6366f1" className="animate-spin" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading catalog from Product Service (Keyset Pagination)...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Sparkles size={36} color="#6366f1" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No products found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            No products match your current filters. Try changing category or searching with another keyword.
          </p>
          {(selectedCategory !== 'ALL' || debouncedSearch) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedCategory('ALL');
                clearSearch();
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.75rem',
          }}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Cursor Pagination Button & Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3.5rem', gap: '1rem' }}>
            {hasMore ? (
              <button
                className="btn btn-secondary"
                onClick={loadMore}
                disabled={isLoadingMore}
                style={{
                  minWidth: '240px',
                  padding: '0.85rem 1.75rem',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={18} className="animate-spin" color="#818cf8" />
                    <span>Fetching Next Keyset Page...</span>
                  </>
                ) : (
                  <>
                    <Layers size={17} color="#818cf8" />
                    <span>Load More ({PAGE_SIZE} products)</span>
                  </>
                )}
              </button>
            ) : (
              <div style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}>
                ✓ All products loaded ({products.length} total)
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

