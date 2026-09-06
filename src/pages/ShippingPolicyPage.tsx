import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function ShippingPolicyPage() {
  const { t } = useT();
  const page = t.shippingPage;

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
            <li key={idx}>
              <strong>{item.label}:</strong> {item.desc}
            </li>
          ))}
        </ul>
        <h2>{page.s3Title}</h2>
        <p>{page.s3Content}</p>
        <h2>{page.s4Title}</h2>
        <p>{page.s4Content}</p>
        <h2>{page.s5Title}</h2>
        <p>{page.s5Content}</p>
      </div>
    </>
  );
}

