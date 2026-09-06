import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function ContactPage() {
  const { t } = useT();
  const { success } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setForm({ name: '', email: '', subject: '', message: '' });
      success('Message sent!', "We'll get back to you within 24 hours.");
    }, 1200);
  };

  return (
    <>
      <PageSeo title={`${t.contact.title} — ${t.siteName}`} description={t.contact.subtitle} />

      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">{t.contact.title}</h1>
          <p className="page-hero-desc">{t.contact.subtitle}</p>
        </div>
      </section>

      <div className="container">
        <div className="contact-grid">
          {/* Info */}
          <div>
            <h2 className="section-title" style={{ marginBottom: 'var(--space-6)' }}>{t.contact.title}</h2>
            <div className="contact-info-item">
              <div className="contact-info-icon"><Mail size={20} /></div>
              <div>
                <p className="contact-info-label">{t.contact.email}</p>
                <p className="contact-info-value">hello@storefront.com</p>
              </div>
            </div>
            <div className="contact-info-item">
              <div className="contact-info-icon"><Phone size={20} /></div>
              <div>
                <p className="contact-info-label">Phone</p>
                <p className="contact-info-value">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="contact-info-item">
              <div className="contact-info-icon"><MapPin size={20} /></div>
              <div>
                <p className="contact-info-label">Address</p>
                <p className="contact-info-value">123 Commerce St, New York, NY 10001</p>
              </div>
            </div>
            <div className="contact-info-item">
              <div className="contact-info-icon"><Clock size={20} /></div>
              <div>
                <p className="contact-info-label">Business Hours</p>
                <p className="contact-info-value">Mon–Fri, 9am–6pm EST</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-6)' }}>{t.contact.sendMessage}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">{t.contact.name}</label>
                  <input id="contact-name" type="text" className="input" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-email">{t.contact.email}</label>
                  <input id="contact-email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-subject">{t.contact.subject}</label>
                <input id="contact-subject" type="text" className="input" value={form.subject} onChange={set('subject')} placeholder="How can we help?" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-message">{t.contact.message}</label>
                <textarea id="contact-message" className="input" value={form.message} onChange={set('message')} placeholder="Tell us more…" rows={5} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isLoading}>
                {isLoading ? t.contact.sending : t.contact.send}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
