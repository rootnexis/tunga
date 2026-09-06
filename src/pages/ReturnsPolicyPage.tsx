import { Link } from 'react-router-dom';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function ReturnsPolicyPage() {
  const { t } = useT();
  const page = t.returnsPage;

  return (
    <>
      <PageSeo title={`${page.title} — ${t.siteName}`} description={page.subtitle} />
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">{page.title}</h1>
          <p className="page-hero-desc">{page.subtitle}</p>
        </div>
      </section>
      <div className="policy-content">
        <h2>{page.s1Title}</h2>
        <p>{page.s1Content}</p>
        <h2>{page.s2Title}</h2>
        <ul>
          {page.s2Items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <h2>{page.s3Title}</h2>
        <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'decimal', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {page.s3Steps.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
        <h2>{page.s4Title}</h2>
        <p>{page.s4Content}</p>
        <h2>{page.s5Title}</h2>
        <p>{page.s5Content}</p>
        <h2>{page.s6Title}</h2>
        <p>
          {page.s6Content}
          <Link to="/account/support" style={{ color: 'var(--color-primary)' }}>
            {page.supportCenter}
          </Link>
          .
        </p>
      </div>
    </>
  );
}

