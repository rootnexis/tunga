import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Headphones, Zap, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/contexts/LanguageContext';
import { ProductCard } from '@/components/shared/ProductCard';
import { Spinner } from '@/components/shared/Spinner';
import { PageSeo } from '@/components/shared/PageSeo';
import type { Product } from '@/types';

// Promotional banner image
const PROMO_IMG = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&fit=crop';

export default function HomePage() {
  const { t } = useT();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const benefits = [
    { icon: Truck,       title: t.home.freeShipping,   desc: t.home.freeShippingDesc },
    { icon: ShieldCheck, title: t.home.securePayments, desc: t.home.securePaymentsDesc },
    { icon: RotateCcw,   title: t.home.returns,        desc: t.home.returnsDesc },
    { icon: Headphones,  title: t.home.support,        desc: t.home.supportDesc },
  ];

  const categories = [
    { slug: 'electronics',  label: t.home.catElectronics, img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80&fit=crop' },
    { slug: 'clothing',     label: t.home.catClothing,    img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80&fit=crop' },
    { slug: 'home-garden',  label: t.home.catHomeGarden,  img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&fit=crop' },
    { slug: 'sports',       label: t.home.catSports,      img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80&fit=crop' },
    { slug: 'beauty',       label: t.home.catBeauty,      img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80&fit=crop' },
    { slug: 'books',        label: t.home.catBooks,       img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80&fit=crop' },
    { slug: 'toys',         label: t.home.catToys,        img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&fit=crop' },
    { slug: 'new-arrivals', label: t.home.catNewArrivals, img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80&fit=crop' },
  ];

  useEffect(() => {
    supabase
      .from('products')
      .select(`
        id, name, slug, base_price, sale_price, currency, is_active, is_featured, is_archived,
        images:product_images(id, url, alt_text, is_primary, sort_order),
        inventory(quantity_available, low_stock_threshold),
        category:categories(id, name, slug)
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .eq('is_archived', false)
      .limit(8)
      .then(({ data }) => {
        setFeatured((data as unknown as Product[]) ?? []);
        setIsLoading(false);
      });
  }, []);

  return (
    <>
      <PageSeo
        title={`${t.siteName} — ${t.home.heroTitle} ${t.home.heroTitleAccent}`}
        description={t.home.heroDesc}
      />

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-eyebrow">
              <Zap size={14} />
              {t.home.heroBadge}
            </div>
            <h1 className="hero-title">
              {t.home.heroTitle} <span className="accent">{t.home.heroTitleAccent}</span>
            </h1>
            <p className="hero-desc">
              {t.home.heroDesc}
            </p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-xl">
                {t.home.shopNow}
                <ArrowRight size={18} />
              </Link>
              <Link to="/shop/category/new-arrivals" className="btn btn-xl hero-btn-outline">
                {t.home.newArrivals}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div className="benefits-grid">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="benefit-card">
                <div className="benefit-icon"><Icon size={22} /></div>
                <div>
                  <p className="benefit-title">{title}</p>
                  <p className="benefit-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop by Category ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">{t.home.exploreLabel}</p>
            <h2 className="section-title">{t.home.shopByCategory}</h2>
            <p className="section-desc">{t.home.shopByCategoryDesc}</p>
          </div>
          <div className="categories-grid">
            {categories.map(cat => (
              <Link
                key={cat.slug}
                to={`/shop/category/${cat.slug}`}
                className="category-card"
                style={{ padding: 0, overflow: 'hidden', flexDirection: 'column', gap: 0 }}
              >
                <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
                  <img
                    src={cat.img}
                    alt={cat.label}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </div>
                <span className="category-card-name" style={{ padding: 'var(--space-3) var(--space-4)' }}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <p className="section-eyebrow">{t.home.handpicked}</p>
              <h2 className="section-title">{t.home.featuredProducts}</h2>
            </div>
            <Link to="/shop/category/featured" className="btn btn-secondary">
              {t.home.viewAll} <ArrowRight size={16} />
            </Link>
          </div>
          {isLoading ? (
            <Spinner fullPage label={t.common.loading} />
          ) : featured.length > 0 ? (
            <div className="grid-products">
              {featured.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-tertiary)' }}>
              <Star size={40} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
              <p>{t.home.featuredSoon}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Promo Banner ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="home-promo-banner">
            <img
              src={PROMO_IMG}
              alt="Promotion banner"
              className="home-promo-img"
            />
            <div className="home-promo-overlay" />
            <div className="home-promo-content">
              <p className="home-promo-badge">
                {t.home.limitedTime}
              </p>
              <h2 className="home-promo-title">
                {t.home.promoTitle}
              </h2>
              <p className="home-promo-desc">
                {t.home.promoDesc}
              </p>
              <div className="home-promo-actions">
                <Link to="/shop" className="btn btn-xl home-promo-btn-primary">
                  {t.home.shopTheSale} <ArrowRight size={18} />
                </Link>
                <Link to="/auth/register" className="btn btn-xl hero-btn-outline">
                  {t.home.joinFree}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
