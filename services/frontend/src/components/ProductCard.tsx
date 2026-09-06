import React, { useState } from 'react';
import { ShoppingCart, Check, Tag } from 'lucide-react';
import { Product } from '../api/products.api.ts';
import { useCart } from '../context/CartContext.tsx';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const priceFormatted = `$${(product.price_cents / 100).toFixed(2)}`;

  // Default product visuals based on category
  const getProductImage = (category: string, name: string) => {
    const cat = category.toLowerCase();
    const nm = name.toLowerCase();

    if (cat.includes('computer') || nm.includes('laptop') || nm.includes('desktop') || nm.includes('ultrabook')) {
      return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('audio') || nm.includes('headphone') || nm.includes('speaker') || nm.includes('earbud')) {
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('wearable') || nm.includes('watch') || nm.includes('band') || nm.includes('ring')) {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('display') || nm.includes('monitor') || nm.includes('oled') || nm.includes('screen')) {
      return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('gaming') || nm.includes('game') || nm.includes('controller') || nm.includes('deck')) {
      return 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('mobile') || nm.includes('phone') || nm.includes('smartphone') || nm.includes('cellular')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff0252a?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('camera') || nm.includes('lens') || nm.includes('gimbal') || nm.includes('video')) {
      return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('storage') || nm.includes('ssd') || nm.includes('drive') || nm.includes('nvme')) {
      return 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80';
    }
    if (cat.includes('smart') || nm.includes('plug') || nm.includes('hub') || nm.includes('sensor')) {
      return 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80';
    }
    if (nm.includes('keyboard') || nm.includes('mouse') || cat.includes('accessories')) {
      return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';
  };

  const handleAdd = () => {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Product Image */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '220px',
        backgroundColor: '#161d2f',
        overflow: 'hidden',
      }}>
        <img
          src={getProductImage(product.category, product.name)}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
        }}>
          <span className="badge badge-indigo" style={{ backdropFilter: 'blur(8px)' }}>
            <Tag size={12} />
            {product.category}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          SKU: {product.sku}
        </div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>
          {product.name}
        </h3>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          marginBottom: '1.25rem',
          flexGrow: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.description}
        </p>

        {/* Pricing & Add Action */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
              {priceFormatted}
            </div>
          </div>

          <button
            className={`btn ${added ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleAdd}
            style={{ minWidth: '120px' }}
          >
            {added ? (
              <>
                <Check size={16} color="#10b981" />
                <span style={{ color: '#10b981' }}>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
