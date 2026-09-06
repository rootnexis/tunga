import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Globe, Award, Users } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

const VALUES = [
  { icon: ShieldCheck, title: 'Quality First',    desc: 'Every product is carefully vetted before listing.' },
  { icon: Globe,       title: 'Global Reach',      desc: 'We ship to over 80 countries worldwide.' },
  { icon: Users,       title: 'Customer Focus',    desc: '50,000+ happy customers and growing.' },
  { icon: Award,       title: 'Award Winning',     desc: 'Recognised for excellence in e-commerce.' },
];

export default function AboutPage() {
  const { t } = useT();

  return (
    <>
      <PageSeo title={`${t.about.title} — ${t.siteName}`} description={t.about.subtitle} />

      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">{t.about.title}</h1>
          <p className="page-hero-desc">
            {t.about.subtitle}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="section-header">
            <p className="section-eyebrow">{t.about.ourStory}</p>
            <h2 className="section-title">{t.about.ourStoryTitle}</h2>
          </div>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p>
              {t.about.ourStoryDesc}
            </p>
            <p>
              {t.home.heroDesc}
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--slate-50)' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <p className="section-eyebrow">Storefront</p>
            <h2 className="section-title">Values & Excellence</h2>
          </div>
          <div className="benefits-grid">
            {VALUES.map(({ icon: Icon, title, desc }) => (
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

      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>{t.home.shopNow}</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            {t.home.heroDesc}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/shop" className="btn btn-primary btn-lg">{t.nav.shop}</Link>
            <Link to="/contact" className="btn btn-secondary btn-lg">{t.contact.title}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
