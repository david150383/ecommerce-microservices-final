import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const fromItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toItem = Math.min(totalItems, safePage * pageSize);

  // Generate numbered buttons with smart ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (safePage >= totalPages - 3) {
      return [
        1,
        'ellipsis',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 0.5rem',
        marginTop: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.875rem',
      }}
    >
      {/* Left: Summary text */}
      <div style={{ color: 'var(--text-secondary)' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{fromItem}</strong> to{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{toItem}</strong> of{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> items
      </div>

      {/* Right: Controls (Limit select + Page numbers) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        {/* Page size select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Page Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {/* Previous Button */}
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1 || isLoading}
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              opacity: safePage <= 1 || isLoading ? 0.45 : 1,
              cursor: safePage <= 1 || isLoading ? 'not-allowed' : 'pointer',
            }}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>

          {/* Numbered Page Buttons */}
          {pages.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '0 0.35rem',
                    color: 'var(--text-muted)',
                    userSelect: 'none',
                    fontSize: '0.85rem',
                  }}
                >
                  ...
                </span>
              );
            }

            const isActive = p === safePage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={isLoading || isActive}
                style={{
                  minWidth: '34px',
                  height: '34px',
                  padding: '0 0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: isActive
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: isActive || isLoading ? 'default' : 'pointer',
                  boxShadow: isActive ? '0 0 10px rgba(99, 102, 241, 0.35)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                {p}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages || isLoading}
            style={{
              padding: '0.4rem 0.65rem',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              opacity: safePage >= totalPages || isLoading ? 0.45 : 1,
              cursor: safePage >= totalPages || isLoading ? 'not-allowed' : 'pointer',
            }}
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
