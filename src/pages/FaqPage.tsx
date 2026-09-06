import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function FaqPage() {
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(null);
  const faqs = t.faqPage?.items ?? [];

  return (
    <>
      <PageSeo title={`${t.faqPage.title} — ${t.siteName}`} description={t.faqPage.subtitle} />

      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">{t.faqPage.title}</h1>
          <p className="page-hero-desc">{t.faqPage.subtitle}</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setOpen(prev => prev === i ? null : i)}
                aria-expanded={open === i}
                id={`faq-q-${i}`}
                aria-controls={`faq-a-${i}`}
              >
                {faq.q}
                {open === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {open === i && (
                <div className="faq-answer" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
