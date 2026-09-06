import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function PrivacyPage() {
  const { t } = useT();
  const page = t.privacyPage;

  return (
    <>
      <PageSeo title={`${page.title} — ${t.siteName}`} description={`${page.title} for ${t.siteName}.`} />
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">{page.title}</h1>
          <p className="page-hero-desc">{page.lastUpdated}</p>
        </div>
      </section>
      <div className="policy-content">
        <p>{page.intro}</p>
        <h2>{page.s1Title}</h2>
        <ul>
          {page.s1Items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <h2>{page.s2Title}</h2>
        <p>{page.s2Content}</p>
        <h2>{page.s3Title}</h2>
        <p>{page.s3Content}</p>
        <h2>{page.s4Title}</h2>
        <p>{page.s4Content}</p>
        <h2>{page.s5Title}</h2>
        <p>{page.s5Content}</p>
        <h2>{page.s6Title}</h2>
        <p>{page.s6Content}</p>
        <h2>{page.s7Title}</h2>
        <p>{page.s7Content}</p>
      </div>
    </>
  );
}

