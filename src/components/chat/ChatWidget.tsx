import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Package,
  ArrowRight,
  Flame,
  PackageSearch,
  Truck,
  Tag,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  ShieldCheck,
  Clock,
  Star,
  Info,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { sendChatMessage } from '@/lib/gemini';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, formatCurrency } from '@/utils/formatters';
import type { ChatMessage } from '@/types/chat';
import '@/styles/chatbot.css';

// Helper to strip leading raw emoji characters from labels so we can pair them with modern SVG icons
function stripLeadingEmoji(str: string): string {
  return str.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\uFE0F\s]+/u, '').trim();
}

// Inline markdown parser for **bold**, *italic*, `code`, and [links](url)
function renderInlineContent(text: string): React.ReactNode[] {
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isInternal = href.startsWith('/') || href.includes('localhost:5173') || href.includes('tunga.store');
      if (isInternal) {
        const localPath = href.replace(/^https?:\/\/[^/]+/, '');
        return (
          <Link key={idx} to={localPath || '/'} className="chatbot-inline-link">
            <span>{label}</span>
            <ArrowRight size={10} className="chatbot-inline-link-icon" />
          </Link>
        );
      }
      return (
        <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="chatbot-inline-link">
          <span>{label}</span>
          <ExternalLink size={10} className="chatbot-inline-link-icon" />
        </a>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="chatbot-strong">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="chatbot-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

// Structured block parser that turns lists and points into modern content boxes with modern icons
interface FormattedBlock {
  type: 'heading' | 'bar-item' | 'numbered-item' | 'callout' | 'paragraph' | 'divider' | 'spacer';
  content: string;
  number?: number;
  accent?: 'indigo' | 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'cyan';
  iconType?: 'shipping' | 'deals' | 'returns' | 'payment' | 'orders' | 'support' | 'security' | 'clock' | 'sparkles' | 'product';
}

function BlockIcon({ type }: { type?: FormattedBlock['iconType'] }) {
  switch (type) {
    case 'shipping':
      return <Truck size={13} />;
    case 'orders':
      return <Package size={13} />;
    case 'deals':
      return <Tag size={13} />;
    case 'returns':
      return <RotateCcw size={13} />;
    case 'payment':
      return <CreditCard size={13} />;
    case 'security':
      return <ShieldCheck size={13} />;
    case 'support':
      return <HelpCircle size={13} />;
    case 'clock':
      return <Clock size={13} />;
    case 'product':
      return <ShoppingBag size={13} />;
    case 'sparkles':
    default:
      return <Zap size={13} />;
  }
}

function parseMessageBlocks(text: string): FormattedBlock[] {
  const lines = text.split('\n');
  const blocks: FormattedBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'spacer') {
        blocks.push({ type: 'spacer', content: '' });
      }
      continue;
    }

    // Divider: --- or ***
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: 'divider', content: '' });
      continue;
    }

    // Markdown Heading: # or ## or ###
    if (trimmed.startsWith('#')) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', content: headingText });
      continue;
    }

    // Blockquote or Callout: >
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      blocks.push({ type: 'callout', content: quoteText });
      continue;
    }

    // Bullet / List item starting with -, *, •
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      const lower = itemText.toLowerCase();

      // Pick distinctive icon and accent color for modern box of content
      let accent: FormattedBlock['accent'] = 'indigo';
      let iconType: FormattedBlock['iconType'] = 'sparkles';

      if (
        lower.includes('ship') ||
        lower.includes('livr') ||
        lower.includes('free') ||
        lower.includes('kugeza') ||
        lower.includes('usafirishaji') ||
        lower.includes('delivery')
      ) {
        accent = 'emerald';
        iconType = 'shipping';
      } else if (
        lower.includes('order') ||
        lower.includes('track') ||
        lower.includes('commande') ||
        lower.includes('status') ||
        lower.includes('agizo') ||
        lower.includes('komande')
      ) {
        accent = 'blue';
        iconType = 'orders';
      } else if (
        lower.includes('discount') ||
        lower.includes('coupon') ||
        lower.includes('promo') ||
        lower.includes('deal') ||
        lower.includes('code') ||
        lower.includes('remise') ||
        lower.includes('punguzo') ||
        lower.includes('sale') ||
        lower.includes('offr')
      ) {
        accent = 'amber';
        iconType = 'deals';
      } else if (
        lower.includes('return') ||
        lower.includes('refund') ||
        lower.includes('retour') ||
        lower.includes('rembours') ||
        lower.includes('gusubiza') ||
        lower.includes('kurudisha') ||
        lower.includes('exchange')
      ) {
        accent = 'purple';
        iconType = 'returns';
      } else if (
        lower.includes('pay') ||
        lower.includes('paiement') ||
        lower.includes('kwishyura') ||
        lower.includes('kulipa') ||
        lower.includes('momo') ||
        lower.includes('card') ||
        lower.includes('carte') ||
        lower.includes('visa') ||
        lower.includes('money')
      ) {
        accent = 'cyan';
        iconType = 'payment';
      } else if (
        lower.includes('security') ||
        lower.includes('garanti') ||
        lower.includes('warranty') ||
        lower.includes('sécurit') ||
        lower.includes('umutekano') ||
        lower.includes('ssl') ||
        lower.includes('pci')
      ) {
        accent = 'emerald';
        iconType = 'security';
      } else if (
        lower.includes('support') ||
        lower.includes('contact') ||
        lower.includes('help') ||
        lower.includes('aide') ||
        lower.includes('ubufasha') ||
        lower.includes('msaada') ||
        lower.includes('email') ||
        lower.includes('phone') ||
        lower.includes('whatsapp')
      ) {
        accent = 'rose';
        iconType = 'support';
      } else if (
        lower.includes('hour') ||
        lower.includes('day') ||
        lower.includes('jour') ||
        lower.includes('iminsi') ||
        lower.includes('siku') ||
        lower.includes('timing') ||
        lower.includes('time')
      ) {
        accent = 'blue';
        iconType = 'clock';
      } else if (
        lower.includes('product') ||
        lower.includes('produit') ||
        lower.includes('igicuruzwa') ||
        lower.includes('bidhaa') ||
        lower.includes('item')
      ) {
        accent = 'indigo';
        iconType = 'product';
      }

      blocks.push({ type: 'bar-item', content: itemText, accent, iconType });
      continue;
    }

    // Numbered item starting with 1. , 2. etc.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({
        type: 'numbered-item',
        number: parseInt(numMatch[1], 10),
        content: numMatch[2],
      });
      continue;
    }

    // Standalone bold heading: **Title:** or **Title**
    if (/^\*\*[^*]+:\*\*\s*$/.test(trimmed) || (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed) && trimmed.length < 50)) {
      const headingText = trimmed.replace(/\*\*/g, '').replace(/:$/, '');
      blocks.push({ type: 'heading', content: headingText });
      continue;
    }

    // Standard paragraph
    blocks.push({ type: 'paragraph', content: trimmed });
  }

  return blocks;
}

export function ChatWidget() {
  const { user, profile } = useAuth();
  const { t, lang } = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [showPill, setShowPill] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getInitialMessage = (): ChatMessage => ({
    id: `welcome-msg-${lang}`,
    role: 'assistant',
    content: t.chatbot.welcomeMessage,
    timestamp: new Date().toISOString(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(`tunga_chat_${lang}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [getInitialMessage()];
      }
    }
    return [getInitialMessage()];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action chips horizontal slider refs & scroll state
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkChipsScroll = () => {
    if (!chipsContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = chipsContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  const slideChips = (direction: 'left' | 'right') => {
    if (!chipsContainerRef.current) return;
    const offset = direction === 'left' ? -180 : 180;
    chipsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkChipsScroll, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // If user changes site language and only initial message is present, update greeting
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [getInitialMessage()];
      }
      return prev;
    });
  }, [lang, t]);

  // Persist messages in session storage per language
  useEffect(() => {
    sessionStorage.setItem(`tunga_chat_${lang}`, JSON.stringify(messages));
  }, [messages, lang]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Modern quick actions with professional Lucide icons and clean labels
  const quickActions = useMemo(() => [
    {
      key: 'popular',
      icon: Flame,
      color: 'amber',
      label: stripLeadingEmoji(t.chatbot.quickActions.popularProducts) || 'Popular Products',
      query: t.chatbot.quickActions.popularProductsQuery,
    },
    {
      key: 'orders',
      icon: PackageSearch,
      color: 'blue',
      label: stripLeadingEmoji(t.chatbot.quickActions.trackOrders) || 'Track Orders',
      query: t.chatbot.quickActions.trackOrdersQuery,
    },
    {
      key: 'shipping',
      icon: Truck,
      color: 'emerald',
      label: stripLeadingEmoji(t.chatbot.quickActions.shipping) || 'Shipping Policy',
      query: t.chatbot.quickActions.shippingQuery,
    },
    {
      key: 'deals',
      icon: Tag,
      color: 'purple',
      label: stripLeadingEmoji(t.chatbot.quickActions.deals) || 'Deals & Offers',
      query: t.chatbot.quickActions.dealsQuery,
    },
    {
      key: 'support',
      icon: HelpCircle,
      color: 'indigo',
      label: lang === 'fr' ? 'Assistance' : lang === 'rw' ? 'Ubufasha' : lang === 'sw' ? 'Msaada' : 'Support & FAQ',
      query: lang === 'fr'
        ? 'Comment contacter le service client ou voir la FAQ ?'
        : lang === 'rw'
        ? "Nafashwa nte n'abashinzwe kwakira abakiriya ?"
        : lang === 'sw'
        ? 'Nawezaje kupata msaada au maswali ya mara kwa mara ?'
        : 'How can I contact customer support or view FAQ?',
    },
  ], [t, lang]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const userName = profile?.first_name || user?.email?.split('@')[0] || undefined;
      const response = await sendChatMessage(
        textToSend,
        messages,
        user?.id,
        userName,
        lang
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        products: response.matchedProducts,
        orders: response.matchedOrders,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to get chat response:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          content: t.chatbot.errorMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([getInitialMessage()]);
    sessionStorage.removeItem(`tunga_chat_${lang}`);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render assistant content using modern vertical accent bars instead of boring * or . bullets
  const renderFormattedText = (text: string, role: 'user' | 'assistant') => {
    if (role === 'user') {
      return (
        <div className="chatbot-bubble-text user-text">
          {text.split('\n').map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      );
    }

    const blocks = parseMessageBlocks(text);

    return (
      <div className="chatbot-bubble-text assistant-text">
        {blocks.map((block, idx) => {
          if (block.type === 'spacer') {
            return <div key={idx} className="chatbot-spacer" />;
          }

          if (block.type === 'divider') {
            return <div key={idx} className="chatbot-gradient-divider" />;
          }

          if (block.type === 'heading') {
            return (
              <div key={idx} className="chatbot-section-heading">
                <div className="chatbot-heading-icon-wrap">
                  <Sparkles size={12} />
                </div>
                <span className="chatbot-heading-title">{block.content}</span>
              </div>
            );
          }

          if (block.type === 'callout') {
            return (
              <div key={idx} className="chatbot-callout-block">
                <div className="chatbot-callout-icon-wrap">
                  <Info size={13} />
                </div>
                <div className="chatbot-callout-text">{renderInlineContent(block.content)}</div>
              </div>
            );
          }

          // Modern box of content with icon badge and accent styling
          if (block.type === 'bar-item') {
            return (
              <div key={idx} className={`chatbot-bar-card accent-${block.accent}`}>
                <span className="chatbot-bar-indicator" />
                <div className={`chatbot-bar-icon-wrap icon-${block.iconType || 'sparkles'}`}>
                  <BlockIcon type={block.iconType} />
                </div>
                <div className="chatbot-bar-content">{renderInlineContent(block.content)}</div>
              </div>
            );
          }

          // Numbered item with modern badge
          if (block.type === 'numbered-item') {
            return (
              <div key={idx} className="chatbot-bar-card numbered">
                <span className="chatbot-number-pill">{block.number}</span>
                <div className="chatbot-bar-content">{renderInlineContent(block.content)}</div>
              </div>
            );
          }

          return (
            <p key={idx} className="chatbot-paragraph">
              {renderInlineContent(block.content)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* ── Background Overlay for mobile devices ── */}
      <div
        className={`chatbot-overlay ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      {/* ── Floating Launcher ── */}
      <div className="chatbot-launcher">
        {showPill && !isOpen && (
          <div className="chatbot-launcher-pill" onClick={() => setIsOpen(true)}>
            <Sparkles size={14} color="#6366f1" />
            <span>{t.chatbot.welcomePill}</span>
            <button
              type="button"
              className="chatbot-launcher-pill-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowPill(false);
              }}
              title={t.chatbot.closeChat}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <button
          type="button"
          className="chatbot-launcher-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? t.chatbot.closeChat : t.chatbot.title}
          title={isOpen ? t.chatbot.closeChat : t.chatbot.title}
        >
          {isOpen ? <X size={24} /> : <Bot size={26} />}
        </button>
      </div>

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label={t.chatbot.title}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar-wrap">
                <Bot size={20} />
                <span className="chatbot-avatar-badge" />
              </div>
              <div className="chatbot-header-info">
                <div className="chatbot-header-title-row">
                  <h3 className="chatbot-header-title">{t.chatbot.title}</h3>
                  <span className="chatbot-status-pill">
                    <span className="chatbot-status-dot" />
                    Online
                  </span>
                </div>
                <p className="chatbot-header-subtitle">{t.chatbot.subtitle}</p>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-header-btn"
                onClick={handleReset}
                title={t.chatbot.restartChat}
                aria-label={t.chatbot.restartChat}
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="chatbot-header-btn"
                onClick={() => setIsOpen(false)}
                title={t.chatbot.closeChat}
                aria-label={t.chatbot.closeChat}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Chips Slider with Professional Icons */}
          <div className="chatbot-chips-slider-wrap">
            {canScrollLeft && (
              <button
                type="button"
                className="chatbot-chip-nav chatbot-chip-nav-left"
                onClick={() => slideChips('left')}
                aria-label="Slide left"
                title="Scroll left"
              >
                <ChevronLeft size={14} />
              </button>
            )}

            <div
              ref={chipsContainerRef}
              className="chatbot-chips-bar"
              onScroll={checkChipsScroll}
            >
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    className={`chatbot-chip chip-${action.color}`}
                    onClick={() => handleSend(action.query)}
                    disabled={isLoading}
                    title={action.label}
                  >
                    <span className="chatbot-chip-icon-wrap">
                      <IconComponent size={13} />
                    </span>
                    <span className="chatbot-chip-text">{action.label}</span>
                  </button>
                );
              })}
            </div>

            {canScrollRight && (
              <button
                type="button"
                className="chatbot-chip-nav chatbot-chip-nav-right"
                onClick={() => slideChips('right')}
                aria-label="Slide right"
                title="Scroll right"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Messages Feed Area */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-msg-row ${msg.role}`}>
                <div className={`chatbot-msg-avatar ${msg.role}`}>
                  {msg.role === 'assistant' ? <Bot size={15} /> : <User size={14} />}
                </div>

                <div className="chatbot-bubble">
                  {msg.role === 'assistant' && (
                    <div className="chatbot-bubble-ai-pill">
                      <Sparkles size={10} className="chatbot-sparkle-spin" />
                      <span>Tunga AI</span>
                    </div>
                  )}
                  {renderFormattedText(msg.content, msg.role === 'assistant' ? 'assistant' : 'user')}

                  {/* Attached Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="chatbot-cards-list">
                      {msg.products.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/product/${prod.slug}`}
                          className="chatbot-product-card"
                          onClick={() => setIsOpen(false)}
                        >
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="chatbot-product-img"
                            loading="lazy"
                          />
                          <div className="chatbot-product-info">
                            <div className="chatbot-product-title">{prod.name}</div>
                            <div className="chatbot-product-meta">
                              <span className="chatbot-product-price">
                                {formatCurrency(prod.sale_price ?? prod.base_price, prod.currency)}
                              </span>
                              {prod.sale_price && (
                                <span className="chatbot-product-oldprice">
                                  {formatCurrency(prod.base_price, prod.currency)}
                                </span>
                              )}
                              {prod.average_rating && (
                                <span className="chatbot-product-rating">
                                  ★ {prod.average_rating}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="chatbot-product-view-btn">
                            <span>{t.chatbot.viewProduct}</span>
                            <ArrowRight size={12} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Attached Order Cards */}
                  {msg.orders && msg.orders.length > 0 && (
                    <div className="chatbot-cards-list">
                      {msg.orders.map((ord) => {
                        const statusClass =
                          ORDER_STATUS_COLORS[ord.status as keyof typeof ORDER_STATUS_COLORS] ||
                          'badge-neutral';
                        const statusLabel =
                          ORDER_STATUS_LABELS[ord.status as keyof typeof ORDER_STATUS_LABELS] ||
                          ord.status;

                        return (
                          <Link
                            key={ord.id}
                            to={`/account/orders/${ord.id}`}
                            className="chatbot-order-card"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="chatbot-order-card-header">
                              <span className="chatbot-order-num">
                                <Package size={14} color="var(--indigo-600)" />
                                #{ord.order_number}
                              </span>
                              <span className={`badge ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </div>

                            {ord.items_summary && ord.items_summary.length > 0 && (
                              <div className="chatbot-order-items">
                                {ord.items_summary.slice(0, 2).join(', ')}
                                {ord.items_summary.length > 2 && ' + more'}
                              </div>
                            )}

                            <div className="chatbot-order-footer">
                              <span>
                                {t.chatbot.orderTotal}:{' '}
                                <span className="chatbot-order-total">
                                  {formatCurrency(ord.total, ord.currency)}
                                </span>
                              </span>
                              <span className="chatbot-order-track-link">
                                {t.chatbot.trackOrder} <ArrowRight size={11} />
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Bubble Footer: Timestamp & Quick Actions */}
                  <div className="chatbot-bubble-meta">
                    <span className="chatbot-bubble-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        className="chatbot-copy-btn"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} color="var(--emerald-600)" />
                            <span style={{ color: 'var(--emerald-600)' }}>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="chatbot-msg-row assistant">
                <div className="chatbot-msg-avatar assistant">
                  <Bot size={15} />
                </div>
                <div className="chatbot-typing">
                  <span className="chatbot-typing-icon">
                    <Sparkles size={12} />
                  </span>
                  <span className="chatbot-typing-label">Tunga AI is typing</span>
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="chatbot-footer">
            <form
              className="chatbot-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className="chatbot-input"
                placeholder={t.chatbot.placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="chatbot-send-btn"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="chatbot-branding-note">
              <Sparkles size={11} color="var(--indigo-500)" />
              {t.chatbot.poweredBy}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
