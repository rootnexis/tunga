import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';

// Inline SVG social icons
const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useT();

  const footerSections = [
    {
      title: t.footer.shopLinks,
      links: [
        { to: '/shop', label: t.shop.allProducts },
        { to: '/shop/category/new-arrivals', label: t.nav.newArrivals },
        { to: '/shop/category/featured', label: t.nav.featured },
        { to: '/shop', label: t.home.shopTheSale },
      ],
    },
    {
      title: t.footer.accountLinks,
      links: [
        { to: '/account', label: t.account.dashboard },
        { to: '/account/orders', label: t.account.orders },
        { to: '/account/wishlist', label: t.account.wishlist },
        { to: '/account/support', label: t.account.support },
      ],
    },
    {
      title: t.footer.companyLinks,
      links: [
        { to: '/about', label: t.about.title },
        { to: '/contact', label: t.contact.title },
        { to: '/faq', label: t.faq.title },
      ],
    },
    {
      title: t.footer.legalLinks,
      links: [
        { to: '/terms', label: t.policies.terms },
        { to: '/privacy', label: t.policies.privacy },
        { to: '/shipping-policy', label: t.policies.shipping },
        { to: '/returns-policy', label: t.policies.returns },
      ],
    },
  ];

  const socials = [
    { Icon: FacebookIcon, label: 'Facebook', href: '#' },
    { Icon: TwitterIcon,  label: 'X / Twitter', href: '#' },
    { Icon: InstagramIcon, label: 'Instagram', href: '#' },
    { Icon: YoutubeIcon,  label: 'YouTube', href: '#' },
  ];

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        {/* ── Top Section ── */}
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Home">
              <div className="footer-logo-icon">
                <Zap size={18} />
              </div>
              <span>{t.siteName}</span>
            </Link>
            <p className="footer-tagline">
              {t.footer.tagline}
            </p>
            {/* Contact */}
            <div className="footer-contact-list">
              <a href="mailto:hello@storefront.com" className="footer-contact-item">
                <Mail size={14} />
                hello@storefront.com
              </a>
              <a href="tel:+15551234567" className="footer-contact-item">
                <Phone size={14} />
                +1 (555) 123-4567
              </a>
              <div className="footer-contact-item">
                <MapPin size={14} />
                123 Commerce St, New York, NY 10001
              </div>
            </div>
            {/* Socials */}
            <div className="footer-socials">
              {socials.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="footer-social-btn"
                  aria-label={label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {footerSections.map(section => (
            <div key={section.title} className="footer-link-group">
              <h3 className="footer-link-heading">{section.title}</h3>
              <ul>
                {section.links.map(({ to, label }) => (
                  <li key={to + label}>
                    <Link to={to} className="footer-link">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Newsletter ── */}
        <div className="footer-newsletter">
          <div>
            <h3 className="footer-newsletter-title">{t.footer.newsletter}</h3>
            <p className="footer-newsletter-desc">
              {t.footer.newsletterDesc}
            </p>
          </div>
          <form
            className="footer-newsletter-form"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Newsletter signup"
          >
            <input
              type="email"
              placeholder={t.footer.emailPlaceholder}
              className="input"
              aria-label="Email address"
            />
            <button type="submit" className="btn btn-primary">{t.footer.subscribe}</button>
          </form>
        </div>

        {/* ── Bottom ── */}
        <div className="footer-bottom">
          <p>© {currentYear} {t.siteName}. {t.footer.copyright}</p>
          <div className="footer-bottom-links">
            <Link to="/privacy">{t.footer.privacy}</Link>
            <Link to="/terms">{t.footer.terms}</Link>
            <Link to="/faq">{t.footer.sitemap}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
