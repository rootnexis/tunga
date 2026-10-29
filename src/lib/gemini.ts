import { supabase } from '@/lib/supabase';
import type { ChatMessage, ProductSummary, OrderSummary, ChatContactActions } from '@/types/chat';
import type { LangCode } from '@/i18n/types';

export type ChatProductCard = ProductSummary;
export type ChatOrderCard = OrderSummary & { payment_status?: string };

export const OWNER_CONTACT: ChatContactActions = {
  whatsappUrl:
    'https://wa.me/250788000000?text=Hello%20Ituze%20Store%20Owner%2C%20I%20would%20like%20assistance%20with%20a%20question%20on%20Ituze.',
  emailUrl:
    'mailto:niyodieudonne62@gmail.com?subject=Inquiry%20from%20Ituze%20Store%20Customer',
  emailAddress: 'niyodieudonne62@gmail.com',
  phoneDisplay: '+250 788 000 000',
  contactPageUrl: '/contact',
};

interface StoreContextData {
  products: ChatProductCard[];
  categories: Array<{ name: string; slug: string; description?: string }>;
  orders: ChatOrderCard[];
}

/**
 * Complete store knowledge base covering all pages (FAQ, Terms & Conditions,
 * Privacy Policy, Returns & Refunds, Shipping Policy, About Us, Contact & Support)
 */
export const STORE_PAGES_KNOWLEDGE = `
=== ITUZE STORE COMPLETE PAGES & POLICIES KNOWLEDGE ===
1. ABOUT ITUZE (/about):
   - Mission: Making premium, authentic products accessible with luxury care, fast delivery, and exceptional customer support.
   - Core Values: Quality First (every item is vetted), Global & Regional Reach (Kigali, all Rwanda provinces, East Africa, and 80+ countries worldwide), Customer Focus (50,000+ happy shoppers), and Award-Winning service.

2. CONTACT US & DIRECT OWNER SUPPORT (/contact & /account/support):
   - Direct WhatsApp to Owner: https://wa.me/250788000000?text=Hello%20Ituze%20Store%20Owner%2C%20I%20would%20like%20assistance%20with%20a%20question%20on%20Ituze. (Phone/WhatsApp: +250 788 000 000)
   - Direct Email to Owner: mailto:niyodieudonne62@gmail.com?subject=Inquiry%20from%20Ituze%20Store%20Customer (Email: niyodieudonne62@gmail.com / hello@ituze.com)
   - Contact Form Page: [Contact Us](/contact)
   - Account Support Tickets: [Support Center](/account/support)
   - Business Hours: Monday – Saturday, 8:00 AM – 8:00 PM CAT.

3. SHIPPING & DELIVERY POLICY (/shipping-policy):
   - Processing Time: Orders are processed within 1–2 business days after payment confirmation.
   - Delivery Options:
     * Kigali Express (Same-Day): 5,000 RWF (or $12.99 Express) — delivered within hours in Kigali.
     * Kigali Standard: 2,500 RWF (1–2 business days) — FREE on orders over 50,000 RWF (or $50).
     * Rwanda Provincial Delivery: 4,500 RWF (2–4 business days across all provinces).
     * East Africa & International Shipping: Ships to 80+ countries (5–21 business days depending on destination).
   - Lost or Damaged Packages: Report within 7 days of delivery for an immediate investigation and free replacement or full refund.

4. RETURNS & REFUNDS POLICY (/returns-policy):
   - 30-Day Hassle-Free Returns: Items can be returned within 30 days of delivery if unused, unwashed, and in original packaging with tags attached.
   - Non-Returnable Items: Digital products/gift cards, perishable goods, "Final Sale" items, and custom/personalized items.
   - How to Return (5 Easy Steps):
     1. Sign in and go to [My Orders](/account/orders).
     2. Select the order and click "Request Return" or open a ticket in [Support Center](/account/support).
     3. Choose the item(s) and reason for return.
     4. Use the prepaid return label (100% free return shipping for defective or damaged items).
     5. Hand over the parcel to our courier or drop-off point.
   - Refund Timeline: Processed within 3–5 business days of receiving the returned item back to your original payment method (MTN MoMo, Airtel Money, Visa, or Mastercard).

5. TERMS & CONDITIONS (/terms):
   - Section 1 (Acceptance): Users must be at least 18 years old or have guardian consent when creating an account or placing an order.
   - Section 2 (Orders & Payments): All orders are subject to stock availability. Prices include applicable taxes. We accept MTN Mobile Money (MoMo), Airtel Money, Visa, Mastercard, and Cash on Delivery.
   - Section 3 (Delivery): Estimated delivery windows are provided at checkout.
   - Section 4 (Returns & Refunds): Governed by our 30-day return guarantee.
   - Section 5 (Intellectual Property): All content, branding, logos (ITUZE), and imagery belong to Ituze.
   - Section 6 (Limitation of Liability): Standard e-commerce liability protections apply.
   - Section 7 & 8 (Updates & Legal Contact): Terms may be updated periodically; contact niyodieudonne62@gmail.com for legal inquiries.

6. PRIVACY POLICY (/privacy):
   - Data Collected: Account profile (name, email, phone), shipping addresses, tokenized payment confirmation (we NEVER store raw card numbers), and site usage analytics.
   - How We Use Data: To fulfill and track your orders, personalize your shopping experience, provide customer support, and send order updates.
   - Data Sharing: We NEVER sell your personal data to third parties. Data is shared only with trusted payment and delivery partners required to fulfill your order.
   - Cookies & Security: Protected by 256-bit SSL encryption and strict access controls.
   - Your Rights: You can view, update, export, or request deletion of your personal data at any time via [My Profile](/account/profile) or by emailing niyodieudonne62@gmail.com.

7. FREQUENTLY ASKED QUESTIONS (/faq):
   - Order Changes/Cancellations: Orders can be modified or cancelled within 1 hour of placement (or while still in "Pending" status).
   - Gift Wrapping: Available at checkout with a personalized message option.
   - Active Promo Codes: WELCOME10 (10% off first order), SAVE20 (20% off orders over 50,000 RWF / $150), FREESHIP (Free standard delivery).
`;

/**
 * Fetch live catalog products, categories, and user orders from Supabase (or hybrid store)
 * so the chatbot can ground its responses in real store data, images, and links.
 */
export async function fetchChatbotContext(userId?: string | null): Promise<StoreContextData> {
  try {
    const [productsRes, categoriesRes, ordersRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, slug, short_description, description, tags, specifications, base_price, sale_price, currency, average_rating, is_active, is_archived, category:categories(name, slug), brand:brands(name), images:product_images(url, is_primary)')
        .eq('is_active', true)
        .eq('is_archived', false)
        .limit(50),
      supabase
        .from('categories')
        .select('name, slug, description')
        .eq('is_active', true),
      userId
        ? supabase
            .from('orders')
            .select('id, order_number, status, payment_status, total, currency, created_at, items:order_items(product_name, quantity)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] }),
    ]);

    const products: ChatProductCard[] = (productsRes.data ?? []).map((p: Record<string, unknown>) => {
      const images = (p.images as Array<{ url: string; is_primary: boolean }>) ?? [];
      const primaryImg =
        images.find((i) => i.is_primary)?.url ??
        images[0]?.url ??
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
      const cat = p.category as { name?: string; slug?: string } | null;
      const brand = p.brand as { name?: string } | null;

      return {
        id: String(p.id),
        name: String(p.name),
        slug: String(p.slug),
        base_price: Number(p.base_price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        currency: 'RWF',
        image_url: primaryImg,
        category: cat?.name,
        category_slug: cat?.slug,
        brand: brand?.name,
        average_rating: p.average_rating ? Number(p.average_rating) : undefined,
        short_description: p.short_description ? String(p.short_description) : undefined,
        description: p.description ? String(p.description) : undefined,
        tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
        specifications:
          p.specifications && typeof p.specifications === 'object'
            ? (p.specifications as Record<string, string>)
            : undefined,
      };
    });

    const categories = (categoriesRes.data ?? []).map((c: Record<string, unknown>) => ({
      name: String(c.name),
      slug: String(c.slug || ''),
      description: c.description ? String(c.description) : undefined,
    }));

    const orders: ChatOrderCard[] = (ordersRes.data ?? []).map((o: Record<string, unknown>) => {
      const items = (o.items as Array<{ product_name: string; quantity: number }>) ?? [];
      return {
        id: String(o.id),
        order_number: String(o.order_number),
        status: String(o.status),
        payment_status: String(o.payment_status || 'paid'),
        total: Number(o.total),
        currency: String(o.currency || 'RWF'),
        created_at: String(o.created_at),
        items_summary: items.map((i) => `${i.product_name} (x${i.quantity})`),
      };
    });

    return { products, categories, orders };
  } catch (err) {
    console.warn('[Chatbot] Failed to fetch live context:', err);
    return { products: [], categories: [], orders: [] };
  }
}

/**
 * Look up a specific order by order_number (e.g. ORD-2026-8912)
 */
async function lookupOrderByNumber(orderNum: string): Promise<ChatOrderCard | null> {
  try {
    const cleanNum = orderNum.trim().toUpperCase();
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, total, currency, created_at, items:order_items(product_name, quantity)')
      .ilike('order_number', `%${cleanNum}%`)
      .limit(1);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    const items = (row.items as Array<{ product_name: string; quantity: number }>) ?? [];
    return {
      id: String(row.id),
      order_number: String(row.order_number),
      status: String(row.status),
      payment_status: String(row.payment_status || 'paid'),
      total: Number(row.total),
      currency: String(row.currency || 'RWF'),
      created_at: String(row.created_at),
      items_summary: items.map((i) => `${i.product_name} (x${i.quantity})`),
    };
  } catch {
    return null;
  }
}

/**
 * Detect effective language from the user's actual message text if they write in
 * French, Kinyarwanda, Swahili, or English; otherwise fall back to the active UI language.
 */
function detectMessageLanguage(userMessage: string, defaultLang: LangCode): LangCode {
  const q = userMessage.toLowerCase().trim();

  if (/\b(muraho|mwiriwe|mwaramutse|amakuru|witwa|nde|ninde|kuki|ryari|he|iki|ibicuruzwa|komande|gutumiza|kwishyura|urakoze|murakoze|yego|oya|mbwira|sobanura|ni iki|wakoze|amategeko|ibanga|ubufasha|nimero)\b/i.test(q)) {
    return 'rw';
  }
  if (/\b(habari|mambo|shikamoo|hujambo|jina lako|nani|kwa nini|lini|wapi|nini|bidhaa|agizo|usafirishaji|malipo|asante|ndiyo|hapana|niambie|eleza|aliyeunda|aliyetengeneza|faragha|masharti|kurudisha|wasiliana)\b/i.test(q)) {
    return 'sw';
  }
  if (/\b(bonjour|salut|bonsoir|comment|qui a créé|qui a inventé|quel est|quelle est|pourquoi|quand|où|merci|commande|livraison|produits|prix|retour|paiement|explique|raconte|conditions|confidentialité|contacter)\b/i.test(q)) {
    return 'fr';
  }
  if (/\b(who|what|when|where|why|how|tell me|explain|created|invented|your name|are you|hello|hey|hi|good morning|good evening|terms|privacy|policy|refund|shipping|contact|owner|whatsapp)\b/i.test(q)) {
    return 'en';
  }

  return defaultLang;
}

/**
 * Determine user intent so we accurately handle products (including direct product names!),
 * store policies (terms, privacy, FAQ, shipping, returns, about), owner contact, orders, and general questions.
 */
export type UserIntent =
  | 'greeting'
  | 'identity'
  | 'thanks'
  | 'order'
  | 'shipping'
  | 'returns'
  | 'payment'
  | 'discount'
  | 'terms'
  | 'privacy'
  | 'faq'
  | 'about'
  | 'contact'
  | 'product'
  | 'general';

export function detectUserIntent(userMessage: string, catalogProducts: ChatProductCard[] = []): UserIntent {
  const q = userMessage.toLowerCase().trim();

  // 1. Identity / Name questions
  if (
    /\b(what is your name|what's your name|whats your name|who are you|your name|tell me your name|are you an ai|are you a bot|who made you)\b/i.test(q) ||
    /\b(comment tu t'appelles|comment vous appelez|quel est ton nom|quel est votre nom|qui es-tu|qui êtes-vous|ton nom)\b/i.test(q) ||
    /\b(witwa nde|uri nde|izina ryawe|witwa gute)\b/i.test(q) ||
    /\b(jina lako nani|wewe ni nani|unaitwa nani|jina lako)\b/i.test(q)
  ) {
    return 'identity';
  }

  // 2. Pure greeting
  if (
    /^(hi+|hey+|hello+|hola|yo|sup|good\s*(morning|afternoon|evening|day)|greetings|bonjour|salut|bonsoir|coucou|muraho|mwiriwe|mwaramutse|amakuru|bite|habari|mambo|sasa|hujambo|shikamoo)([!.,?\s]*|(there|ituze|ai|assistant|friend|bro|boss|how are you|comment ça va|amakuru yawe|habari yako)*)*$/i.test(
      q
    ) ||
    /^(how are you|how's it going|how are things|are you there|comment vas-tu|comment allez-vous|amakuru yawe|umeamkaje|habari za leo)[?!.\s]*$/i.test(
      q
    )
  ) {
    return 'greeting';
  }

  // 3. Thanks / Goodbye
  if (
    /^(thanks|thank you|thx|ty|merci|merci beaucoup|urakoze|murakoze|asante|asante sana|shukrani|bye|goodbye|see you|au revoir|murabeho|kwaheri)[!.,?\s]*$/i.test(
      q
    )
  ) {
    return 'thanks';
  }

  // 4. Direct Product Name / Brand / SKU match in catalog!
  // If the user mentions an actual product name or brand in our store (e.g. "novasound", "apex", "lumina", "aura", "magcharge", "chrono", "light bar", "power bank"), treat it as 'product'!
  const matchedByCatalog = findMatchingProducts(userMessage, catalogProducts);
  const hasStrongCatalogMatch = catalogProducts.some((p) => {
    const pWords = p.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['with', 'from', 'true', 'pack'].includes(w));
    const brandLower = (p.brand || '').toLowerCase();
    if (brandLower && brandLower.length >= 3 && q.includes(brandLower)) return true;
    return pWords.some((w) => q.includes(w));
  });

  // 5. Contact / Owner / WhatsApp / Email
  if (
    /\b(contact|support|phone|email|mail|call|whatsapp|chat with owner|owner|talk to human|talk to agent|human|agent|customer service|help desk|contacter|propriétaire|ubufasha|nyir'iduka|wasiliana|mmiliki|msaada)\b/i.test(
      q
    )
  ) {
    return 'contact';
  }

  // 6. Order tracking
  if (
    q.includes('ord-') ||
    /\b(track|my order|orders|order status|where is my|package|parcel|commande|suivre|suivi|komande|gutumiza|agizo|maagizo|fuatilia)\b/i.test(
      q
    )
  ) {
    return 'order';
  }

  // 7. Terms & Conditions
  if (
    /\b(terms|conditions|terms and conditions|terms of service|terms of use|legal|conditions générales|conditions d'utilisation|amategeko n'amabwiriza|masharti na vigezo|vigezo)\b/i.test(
      q
    )
  ) {
    return 'terms';
  }

  // 8. Privacy Policy
  if (
    /\b(privacy|privacy policy|personal data|my data|cookies|gdpr|data protection|confidentialité|politique de confidentialité|donnees personnelles|politiki y'ibanga|ibanga|sera ya faragha|faragha)\b/i.test(
      q
    )
  ) {
    return 'privacy';
  }

  // 9. Returns & Refunds
  if (
    /\b(return|returns|refund|refunds|exchange|money back|damaged item|defective|wrong item|retour|retours|remboursement|rembourser|échange|gusubiza|kurudisha|marejesho)\b/i.test(
      q
    )
  ) {
    return 'returns';
  }

  // 10. Shipping & Delivery
  if (
    /\b(ship|shipping|deliver|delivery|livraison|livrer|kugeza|ihererekanywa|usafirishaji|kusafirisha|how long to arrive|kigali delivery|international shipping)\b/i.test(
      q
    )
  ) {
    return 'shipping';
  }

  // 11. FAQ / Common Store Questions (cancel order, gift wrap, etc.)
  if (
    /\b(faq|faqs|frequently asked|cancel order|change order|modify order|gift wrap|gift wrapping|questions fréquentes|ibibazo bikunze kubazwa|maswali ya mara kwa mara)\b/i.test(
      q
    )
  ) {
    return 'faq';
  }

  // 12. About Ituze Store
  if (
    /\b(about ituze|about us|about the store|about this store|what is ituze|story of ituze|who owns ituze|à propos d'ituze|ibyerekeye ituze|kuhusu ituze)\b/i.test(
      q
    )
  ) {
    return 'about';
  }

  // 13. Payment
  if (
    /\b(pay|payment|momo|mobile money|mtn|airtel|visa|mastercard|cash on delivery|paiement|kwishyura|malipo|kulipa)\b/i.test(
      q
    )
  ) {
    return 'payment';
  }

  // 14. Discounts / Coupons
  if (
    /\b(discount|coupon|promo|voucher|code|sale|deal|remise|réduction|igabanyirizwa|punguzo|welcome10|save20|freeship)\b/i.test(
      q
    )
  ) {
    return 'discount';
  }

  // 15. Product Search / Recommendation / Helping User Choose
  const isRealLifeFactQuestion =
    /\b(who created|who invented|who founded|who discovered|when was .* invented|capital of|president of|population of|qui a créé|qui a inventé|ninde wakoze|ninde wavumbuye|nani aliyeunda|nani aligundua)\b/i.test(
      q
    ) && !hasStrongCatalogMatch;

  if (!isRealLifeFactQuestion) {
    if (hasStrongCatalogMatch || matchedByCatalog.length > 0) {
      return 'product';
    }

    const productKeywords =
      /\b(product|products|item|items|buy|shop|shopping|choose|help me choose|which one|compare|recommend|recommendation|suggest|looking for|search|find|show me|catalog|store|stock|available|price|cost|how much|cheap|affordable|best|top|rating|watch|watches|smartwatch|headphone|headphones|earbuds|audio|speaker|power bank|powerbank|charger|charging|light|lamp|ambient|shirt|t-shirt|jacket|dress|shoes|sneakers|bag|backpack|laptop|electronics|fashion|clothing|accessories|smart home|gift|gifts|produit|produits|acheter|choisir|montre|écouteurs|chargeur|lumière|vêtements|chaussures|sac|ibicuruzwa|kugura|guhitamo|isaha|imyenda|inkweto|igikapu|bidhaa|nunua|chagua|saa|nguo|viatu|mfuko)\b/i;

    if (productKeywords.test(q)) {
      return 'product';
    }
  }

  return 'general';
}

/**
 * Match relevant products from store catalog by name, brand, category, tags, or description.
 */
export function findMatchingProducts(query: string, products: ChatProductCard[]): ChatProductCard[] {
  if (!products || products.length === 0) return [];
  const q = query.toLowerCase().trim();

  // Check if user asked for cheapest / budget or premium / expensive
  const wantsCheap = /\b(cheap|cheapest|budget|affordable|under|low price|moins cher|idahenze|rahisi)\b/i.test(q);
  const wantsExpensive = /\b(expensive|luxury|premium|highest|pro|ultra)\b/i.test(q);

  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'what', 'how', 'can', 'you', 'show', 'me',
    'have', 'any', 'are', 'there', 'some', 'good', 'best', 'looking', 'want',
    'buy', 'need', 'recommend', 'products', 'product', 'items', 'item', 'shop',
    'please', 'tell', 'about', 'ituze', 'price', 'cost', 'much', 'help', 'choose',
    'find', 'search', 'give', 'link', 'image', 'picture', 'photo', 'store',
  ]);

  const keywords = q
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  // Synonym expansion so natural queries match catalog items
  const expandedKeywords = new Set<string>(keywords);
  for (const kw of keywords) {
    if (['watch', 'watches', 'montre', 'isaha', 'saa', 'clock', 'wearable'].includes(kw)) {
      expandedKeywords.add('smartwatch');
      expandedKeywords.add('chrono');
      expandedKeywords.add('wearables');
    }
    if (['headphone', 'headphones', 'earphone', 'earphones', 'music', 'sound', 'écouteurs', 'casque'].includes(kw)) {
      expandedKeywords.add('headphones');
      expandedKeywords.add('earbuds');
      expandedKeywords.add('audio');
    }
    if (['charger', 'charge', 'battery', 'power', 'magsafe', 'station', 'powerbank'].includes(kw)) {
      expandedKeywords.add('power');
      expandedKeywords.add('charging');
      expandedKeywords.add('magcharge');
      expandedKeywords.add('magnetic');
    }
    if (['light', 'lights', 'lamp', 'rgb', 'led', 'desk', 'room', 'lumière', 'itara'].includes(kw)) {
      expandedKeywords.add('lumina');
      expandedKeywords.add('ambient');
      expandedKeywords.add('light');
      expandedKeywords.add('smart');
    }
  }

  if (expandedKeywords.size > 0) {
    const scored = products
      .map((p) => {
        let score = 0;
        const nameLower = p.name.toLowerCase();
        const slugLower = p.slug.toLowerCase();
        const catLower = (p.category || '').toLowerCase();
        const brandLower = (p.brand || '').toLowerCase();
        const descLower = `${p.short_description || ''} ${p.description || ''}`.toLowerCase();
        const tagsLower = (p.tags || []).map((t) => t.toLowerCase());

        // Exact phrase match in product name
        if (q.length >= 3 && nameLower.includes(q)) {
          score += 15;
        }

        for (const kw of expandedKeywords) {
          if (nameLower.includes(kw)) score += 6;
          if (brandLower.includes(kw)) score += 5;
          if (slugLower.includes(kw)) score += 4;
          if (catLower.includes(kw)) score += 4;
          if (tagsLower.some((t) => t.includes(kw))) score += 4;
          if (descLower.includes(kw)) score += 2;
        }
        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      let results = scored.map((s) => s.product);
      if (wantsCheap) {
        results = results.sort((a, b) => (a.sale_price ?? a.base_price) - (b.sale_price ?? b.base_price));
      } else if (wantsExpensive) {
        results = results.sort((a, b) => (b.sale_price ?? b.base_price) - (a.sale_price ?? a.base_price));
      }
      return results.slice(0, 4);
    }
  }

  // If the user asked a general product question ("show me products", "help me choose a product", "what do you sell?"), return top catalog items
  if (
    /\b(product|products|item|items|buy|shop|choose|recommend|suggest|popular|best|top|featured|catalog|sell|available|gift|show|produits|acheter|choisir|ibicuruzwa|kugura|bidhaa|nunua)\b/i.test(
      q
    )
  ) {
    const sorted = [...products];
    if (wantsCheap) {
      sorted.sort((a, b) => (a.sale_price ?? a.base_price) - (b.sale_price ?? b.base_price));
    } else {
      sorted.sort((a, b) => (b.average_rating ?? 5) - (a.average_rating ?? 5));
    }
    return sorted.slice(0, 4);
  }

  return [];
}

/**
 * Clean search topic from a natural language question so we can query Wikipedia / DuckDuckGo APIs
 * when the backend Gemini API key is not configured.
 */
function extractKnowledgeTopic(question: string): string {
  return question
    .replace(/[?!.]+$/g, '')
    .replace(
      /^(who\s+(created|invented|founded|made|built|discovered|wrote|is|was)|what\s+(is|are|was|were|does)|when\s+(was|did|is)|where\s+(is|are|was)|tell\s+me\s+about|explain\s+what\s+is|explain|define|history\s+of|qui\s+(a\s+créé|a\s+inventé|a\s+fondé|est|était)|qu'est-ce\s+que\s+(le|la|l'|les|un|une)?|c'est\s+quoi|ninde\s+(wakoze|washinze|wavumbuye)|ni\s+iki|sobanura|nani\s+(aliyeunda|aliyetengeneza|aligundua|ni)|nini\s+maana\s+ya|eleza\s+kuhusu)\s+/i,
      ''
    )
    .replace(/^(the|a|an|le|la|les|un|une)\s+/i, '')
    .trim();
}

/**
 * Query live open knowledge APIs (Wikipedia REST & Search API + DuckDuckGo Instant Answer API)
 * so ITUZE AI can answer real-life questions using live web knowledge sources.
 */
async function fetchLiveKnowledgeAnswer(question: string, lang: LangCode): Promise<string | null> {
  const topic = extractKnowledgeTopic(question);
  if (!topic || topic.length < 2) return null;

  const wikiLangs = lang === 'fr' ? ['fr', 'en'] : lang === 'sw' ? ['sw', 'en'] : lang === 'rw' ? ['rw', 'en'] : ['en'];

  for (const wLang of wikiLangs) {
    try {
      const searchUrl = `https://${wLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        topic
      )}&utf8=&format=json&origin=*&srlimit=1`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const firstHit = searchData?.query?.search?.[0];
      if (!firstHit?.title) continue;

      const summaryUrl = `https://${wLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`;
      const summaryRes = await fetch(summaryUrl);
      if (!summaryRes.ok) continue;
      const summaryData = await summaryRes.json();

      if (summaryData?.extract && summaryData.extract.length > 40) {
        const sentences = String(summaryData.extract)
          .split(/(?<=[.!?])\s+/)
          .slice(0, 4)
          .join(' ');

        return `**${summaryData.title}**\n\n${sentences}`;
      }
    } catch {
      // Try next language or fallback
    }
  }

  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`
    );
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      if (ddgData?.AbstractText && String(ddgData.AbstractText).length > 30) {
        return `**${ddgData.Heading || topic}**\n\n${ddgData.AbstractText}`;
      }
    }
  } catch {
    // Ignore network error
  }

  return null;
}

/**
 * Curated multilingual real-life knowledge & math responder
 */
function answerCuratedRealLifeQuestion(userMessage: string, lang: LangCode): string | null {
  const q = userMessage.toLowerCase().trim();

  // 1. iPhone / Apple / Steve Jobs
  if (/\b(iphone|steve jobs|apple)\b/i.test(q) && /\b(who|created|invented|founded|made|built|founder|creator|qui|ninde|nani|when|history)\b/i.test(q)) {
    if (lang === 'fr') {
      return `L'**iPhone** a été créé et développé par **Apple Inc.** sous la direction visionnaire de son cofondateur et PDG **Steve Jobs**, qui a dévoilé le tout premier iPhone le **9 janvier 2007** à San Francisco.\n\n- **Créateur & Visionnaire** : Steve Jobs (cofondateur d'Apple avec Steve Wozniak et Ronald Wayne)\n- **Design industriel** : Sir Jony Ive\n- **Ingénierie matérielle & logicielle** : Tony Fadell, Scott Forstall et l'équipe d'Apple.`;
    }
    if (lang === 'rw') {
      return `**iPhone** yakozwe kandi itunganywa n'uruganda rwa **Apple Inc.** iyobowe na **Steve Jobs** (umwe mu bashinze Apple), wayimuritse ku mugaragaro bwa mbere ku wa **9 Mutarama 2007**.\n\n- **Uwayitekereje akanayobora umushinga**: Steve Jobs\n- **Igishushanyo mbonera (Design)**: Jony Ive\n- **Ikoranabuhanga**: Ikipe y'abahanga ba Apple barimo Tony Fadell na Scott Forstall.`;
    }
    if (lang === 'sw') {
      return `**iPhone** iliundwa na kutengenezwa na kampuni ya **Apple Inc.** chini ya uongozi wa mwanzilishi mwenza na Mkurugenzi Mtendaji **Steve Jobs**, aliyeizindua iPhone ya kwanza mnamo **Januari 9, 2007**.\n\n- **Mwanzilishi & Kiongozi wa Mradi**: Steve Jobs\n- **Muundo (Design)**: Jony Ive\n- **Uhandisi**: Tony Fadell, Scott Forstall na timu ya Apple.`;
    }
    return `The **iPhone** was created and developed by **Apple Inc.** under the visionary leadership of Apple co-founder and CEO **Steve Jobs**, who unveiled the first-generation iPhone on **January 9, 2007**.\n\n- **Visionary & Project Leader**: Steve Jobs (who co-founded Apple with Steve Wozniak and Ronald Wayne)\n- **Lead Industrial Designer**: Sir Jony Ive\n- **Key Hardware & Software Leaders**: Tony Fadell, Scott Forstall, and Apple's engineering team.`;
  }

  // 2. Other major tech founders
  if (/\b(who|created|invented|founded|founder|qui|ninde|nani)\b/i.test(q)) {
    if (q.includes('android')) {
      return `**Android** was founded in **October 2003** by **Andy Rubin, Rich Miner, Nick Sears, and Chris White**, and was acquired by **Google** in 2005.`;
    }
    if (q.includes('microsoft') || q.includes('windows')) {
      return `**Microsoft** was founded on **April 4, 1975** by **Bill Gates** and **Paul Allen**.`;
    }
    if (q.includes('tesla') || q.includes('spacex')) {
      return `**SpaceX** was founded in 2002 by **Elon Musk**. **Tesla** was founded in 2003 by Martin Eberhard and Marc Tarpenning, with **Elon Musk** joining shortly after as largest shareholder and CEO.`;
    }
    if (q.includes('facebook') || q.includes('meta') || q.includes('instagram') || q.includes('whatsapp')) {
      return `**Facebook (Meta)** was founded in **2004** by **Mark Zuckerberg**. **Instagram** was created by Kevin Systrom and Mike Krieger (2010), and **WhatsApp** was founded by Jan Koum and Brian Acton (2009).`;
    }
    if (q.includes('google')) {
      return `**Google** was founded on **September 4, 1998** by **Larry Page** and **Sergey Brin** while they were PhD students at Stanford University.`;
    }
    if (q.includes('amazon')) {
      return `**Amazon** was founded on **July 5, 1994** by **Jeff Bezos**.`;
    }
  }

  // 3. Math & Calculations
  const mathMatch = q.match(/(?:what is|calculate|combien font|ni angahe|ngapi)?\s*(-?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*(-?\d+(?:\.\d+)?)/i);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result: number | null = null;
    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*' || op === 'x' || op === '×') result = a * b;
    else if ((op === '/' || op === '÷') && b !== 0) result = Number((a / b).toFixed(4));

    if (result !== null && !Number.isNaN(result)) {
      if (lang === 'fr') return `Le résultat de **${a} ${op} ${b}** est **${result.toLocaleString()}**.`;
      if (lang === 'rw') return `Igisubizo cya **${a} ${op} ${b}** ni **${result.toLocaleString()}**.`;
      if (lang === 'sw') return `Jibu la **${a} ${op} ${b}** ni **${result.toLocaleString()}**.`;
      return `The answer to **${a} ${op} ${b}** is **${result.toLocaleString()}**.`;
    }
  }

  // 4. Current Date / Time
  if (/\b(what time|what day|today's date|what date|current date|quelle heure|quelle date|ni saa ngahe|italiki ya none|saa ngapi|tarehe ya leo)\b/i.test(q)) {
    const now = new Date();
    return `Today is **${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, and the current time is **${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`;
  }

  return null;
}

/**
 * Format rich product explanations with direct links and helpful buying advice
 */
function buildProductAdvisorResponse(
  products: ChatProductCard[],
  allCategories: Array<{ name: string; slug: string }>,
  lang: LangCode,
  userMessage: string
): string {
  const q = userMessage.toLowerCase();
  const isAskingToChoose = /\b(choose|compare|which|recommend|best|suggest|gift|help me|choisir|meilleur|guhitamo|chagua)\b/i.test(q);

  if (products.length === 0) {
    const catLinks = allCategories
      .map((c) => `[${c.name}](/shop/category/${c.slug})`)
      .join(' • ');
    if (lang === 'fr') {
      return `Je serais ravi de vous aider à choisir le produit idéal ! 🛍️\n\nNous proposons des articles dans ces catégories : ${catLinks || '[Toute la boutique](/shop)'}.\n\nDites-moi ce que vous cherchez (ou votre budget) ou parcourez notre [Catalogue Complet](/shop) !`;
    }
    if (lang === 'rw') {
      return `Nishimiye kugufasha guhitamo igicuruzwa kikubereye! 🛍️\n\nDufite ibyiciro bitandukanye: ${catLinks || '[Iduka ryose](/shop)'}.\n\nMbwira icyo wifuza cyangwa usure [Ibicuruzwa Byose](/shop)!`;
    }
    if (lang === 'sw') {
      return `Ningependa kukusaidia kuchagua bidhaa bora! 🛍️\n\nTuna kategoria hizi: ${catLinks || '[Duka Zima](/shop)'}.\n\nNiambie unachotafuta au tembelea [Duka Letu](/shop)!`;
    }
    return `I would love to help you choose the perfect product! 🛍️\n\nExplore our main categories: ${catLinks || '[All Products](/shop)'}.\n\nTell me what feature or budget you have in mind, or browse our [Full Shop Catalog](/shop)!`;
  }

  const bulletLines = products.map((p) => {
    const effectivePrice = p.sale_price ?? p.base_price;
    const priceStr = `${Math.round(effectivePrice).toLocaleString()} RWF`;
    const discountNote =
      p.sale_price && p.sale_price < p.base_price
        ? ` *(On Sale — was ${Math.round(p.base_price).toLocaleString()} RWF)*`
        : '';
    const desc = p.short_description || p.description || 'Premium quality, in stock and ready to ship.';
    const specNote = p.specifications
      ? ` — Key specs: ${Object.entries(p.specifications)
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}`
      : '';
    return `- **[${p.name}](/product/${p.slug})** (${priceStr}${discountNote}): ${desc}${specNote}`;
  });

  if (lang === 'fr') {
    const intro = isAskingToChoose
      ? `En tant que conseiller shopping sur **Ituze**, voici ma sélection personnalisée avec leurs caractéristiques et liens directs :`
      : `Voici les détails et liens directs pour les produits correspondants sur **Ituze** :`;
    return `${intro}\n\n${bulletLines.join('\n')}\n\n> 👇 *Cliquez sur une **carte produit avec photo** ci-dessous ou sur le nom du produit pour voir toutes les photos et l'ajouter au panier !*`;
  }

  if (lang === 'rw') {
    const intro = isAskingToChoose
      ? `Nk'inshuti n'umujyanama wawe mu guhaha kuri **Ituze**, dore ibicuruzwa byiza naguhitiyemo n'ibisobanuro byabyo:`
      : `Dore ibicuruzwa wabajije, ibiciro byabyo ndetse na link zikugeza kuri buri gicuruzwa mu iduka rya **Ituze**:`;
    return `${intro}\n\n${bulletLines.join('\n')}\n\n> 👇 *Kanda ku **ikarita y'igicuruzwa ifite ifoto** iri hasi kugira ngo ukirebe neza cyangwa ukigure!*`;
  }

  if (lang === 'sw') {
    const intro = isAskingToChoose
      ? `Kama rafiki na mshauri wako wa ununuzi katika **Ituze**, hapa kuna mapendekezo bora pamoja na maelezo na viungo vyake:`
      : `Hapa kuna maelezo na viungo vya moja kwa moja vya bidhaa ulizouliza kwenye **Ituze**:`;
    return `${intro}\n\n${bulletLines.join('\n')}\n\n> 👇 *Bofya **kadi ya bidhaa yenye picha** hapa chini ili kuona bidhaa kamili dukani!*`;
  }

  const intro = isAskingToChoose
    ? `As your shopping helper and friend at **Ituze**, here is a closer look at our best options to help you choose:`
    : `Here are the details, features, and direct store links for the product(s) you asked about:`;

  return `${intro}\n\n${bulletLines.join('\n')}\n\n> 👇 *Click any **product card with image** below (or the product link above) to open the product page, view full gallery images, and add it to your cart!*`;
}

/**
 * Intelligent multilingual responder covering all store pages, product search with images & links,
 * order tracking, real-life questions, and polite escalation to the store owner via WhatsApp & Email.
 */
async function generateIntelligentItuzeResponse(
  userMessage: string,
  intent: UserIntent,
  context: StoreContextData,
  lang: LangCode,
  userName?: string | null,
  matchedProducts: ChatProductCard[] = [],
  lookedUpOrder: ChatOrderCard | null = null
): Promise<{
  reply: string;
  matchedOrders: ChatOrderCard[];
  contactActions?: ChatContactActions;
}> {
  const effectiveLang = detectMessageLanguage(userMessage, lang);
  const nameGreeting = userName ? ` ${userName}` : '';

  // 0. Identity ("What is your name?", "Who are you?")
  if (intent === 'identity') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Je m'appelle **ITUZE AI** ! 🤖✨\n\nJe suis votre ami et conseiller intelligent sur la boutique **Ituze**. Je peux :\n- Vous aider à **choisir et comparer des produits** avec photos et liens directs vers la boutique\n- Expliquer toutes nos pages : [Conditions Générales](/terms), [Politique de Confidentialité](/privacy), [Retours & Remboursements](/returns-policy), [Livraison](/shipping-policy) et [FAQ](/faq)\n- **Suivre vos commandes** en temps réel\n- Répondre à vos **questions de la vie réelle** ou vous mettre en contact direct avec le propriétaire via [WhatsApp](${OWNER_CONTACT.whatsappUrl}) ou [Email](${OWNER_CONTACT.emailUrl}) !`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Nitwa **ITUZE AI**! 🤖✨\n\nNdi inshuti n'umufasha wawe w'ubwenge ku iduka rya **Ituze**. Nshobora:\n- Kugufasha **guhitamo ibicuruzwa** no kuguha amafoto na link zikugeza ku gicuruzwa\n- Kugusobanurira amapaji yose y'iduka: [Amategeko n'Amabwiriza](/terms), [Politiki y'Ibanga](/privacy), [Gusubiza Ibicuruzwa](/returns-policy), [Kugeza Ibicuruzwa](/shipping-policy) na [FAQ](/faq)\n- **Gukurikirana komande zawe** no gusubiza **ibibazo byo mu buzima busanzwe**\n- Kuguha link yo kuvugana na nyir'iduka kuri [WhatsApp](${OWNER_CONTACT.whatsappUrl}) cyangwa [Email](${OWNER_CONTACT.emailUrl})!`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Jina langu ni **ITUZE AI**! 🤖✨\n\nMimi ni rafiki na msaidizi wako mahiri katika duka la **Ituze**. Ninaweza:\n- Kukusaidia **kuchagua bidhaa** na kukupa picha na viungo vya moja kwa moja\n- Kukuelezea kurasa zote za duka: [Masharti na Vigezo](/terms), [Sera ya Faragha](/privacy), [Kurudisha Bidhaa](/returns-policy), [Usafirishaji](/shipping-policy) na [Maswali (FAQ)](/faq)\n- **Kufuatilia maagizo yako**, kujibu maswali ya maisha halisi, au kukuunganisha moja kwa moja na mmiliki kupitia [WhatsApp](${OWNER_CONTACT.whatsappUrl}) au [Barua Pepe](${OWNER_CONTACT.emailUrl})!`,
        matchedOrders: [],
      };
    }
    return {
      reply: `I am **ITUZE AI**! 🤖✨\n\nI am your friendly shopping helper and intelligent assistant on **Ituze**. Here is how I can help you:\n- **Search & Choose Products**: I can explain our products, help you pick the best option, and show **product images with direct links** to the store\n- **Explain Store Policies & Pages**: Full access to our [Terms & Conditions](/terms), [Privacy Policy](/privacy), [Returns & Refunds](/returns-policy), [Shipping Policy](/shipping-policy), [FAQ](/faq), and [About Us](/about)\n- **Track Your Orders**: Real-time order status updates\n- **Real-Life Questions & Direct Owner Contact**: I can answer general knowledge questions or connect you directly with the store owner on [WhatsApp](${OWNER_CONTACT.whatsappUrl}) or [Email](${OWNER_CONTACT.emailUrl})!`,
      matchedOrders: [],
    };
  }

  // 1. Greeting
  if (intent === 'greeting') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Bonjour${nameGreeting} ! 👋 Je suis **ITUZE AI**, votre ami et conseiller sur **Ituze**. Comment puis-je vous aider aujourd'hui ?\n\nVous pouvez me demander de vous recommander un produit (avec photo et lien), suivre une commande, expliquer nos politiques ([CGV](/terms), [Confidentialité](/privacy), [Retours](/returns-policy), [FAQ](/faq)), ou me poser n'importe quelle question !`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Muraho${nameGreeting}! 👋 Nitwa **ITUZE AI**, inshuti n'umufasha wawe kuri **Ituze**. Nabafasha iki uyu munsi?\n\nMushobora kumbaza ibicuruzwa mifuza (nkabereka amafoto na link), gukurikirana komande, kubasobanurira amategeko y'iduka ([Amategeko](/terms), [Ibanga](/privacy), [Gusubiza](/returns-policy), [FAQ](/faq)), cyangwa ikibazo cyose!`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Habari${nameGreeting}! 👋 Mimi ni **ITUZE AI**, rafiki na msaidizi wako kwenye **Ituze**. Naweza kukusaidia vipi leo?\n\nUnaweza kuniuliza kuhusu bidhaa (pamoja na picha na viungo), kufuatilia agizo, sera za duka ([Masharti](/terms), [Faragha](/privacy), [Marejesho](/returns-policy), [FAQ](/faq)), au swali lolote!`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Hey${nameGreeting}! 👋 I am **ITUZE AI**, your friendly shopping helper on **Ituze**. How can I brighten your day?\n\nAsk me to help you choose a product (with images & links), track an order, explain any store policy ([Terms](/terms), [Privacy](/privacy), [Returns](/returns-policy), [FAQ](/faq)), or ask any real-life question!`,
      matchedOrders: [],
    };
  }

  // 2. Thanks / Goodbye
  if (intent === 'thanks') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Avec grand plaisir${nameGreeting} ! 😊 Je suis toujours là pour vous aider. N'hésitez pas à revenir vers moi ou à contacter le propriétaire sur [WhatsApp](${OWNER_CONTACT.whatsappUrl}) si besoin. Excellente journée !`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Murakoze cyane${nameGreeting}! 😊 Ndi hano igihe cyose mukeneye ubufasha. Mugire umunsi mwiza cyane hamwe na **ITUZE AI**!`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Karibu sana${nameGreeting}! 😊 Niko hapa wakati wowote unaponihitaji. Uwe na siku njema na **ITUZE AI**!`,
        matchedOrders: [],
      };
    }
    return {
      reply: `You're so welcome${nameGreeting}! 😊 It's always a pleasure helping you. Let me know anytime you need product advice or support. Have a wonderful day!`,
      matchedOrders: [],
    };
  }

  // 3. Direct Contact with Store Owner (WhatsApp + Email + Contact Page)
  if (intent === 'contact') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Vous pouvez contacter directement le propriétaire et l'équipe **Ituze** à tout moment ! 🤝\n\n- **Discuter sur WhatsApp (Direct)** : [Ouvrir WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Envoyer un Email Direct** : [Envoyer un Email (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Formulaire de Contact** : [Visiter la page Contact](/contact)\n- **Tickets d'assistance client** : [Centre de Support](/account/support)\n\n> 💬 *Cliquez sur les boutons ci-dessous pour démarrer une discussion instantanée sur WhatsApp ou par Email avec le propriétaire !*`,
        matchedOrders: [],
        contactActions: OWNER_CONTACT,
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Mushobora kuvugana na nyir'iduka rya **Ituze** mu buryo butaziguye! 🤝\n\n- **Vugana na Nyir'iduka kuri WhatsApp**: [Fungura WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Ohereza Email Ako Kanya**: [Ohereza Email (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Ipaji yo Kutwandikira**: [Sura Ipaji ya Contact](/contact)\n- **Ubufasha kuri Konti**: [Ikigo cy'Ubufasha](/account/support)\n\n> 💬 *Kanda kuri buto ziri hasi kugira ngo wandikire nyir'iduka kuri WhatsApp cyangwa Email ako kanya!*`,
        matchedOrders: [],
        contactActions: OWNER_CONTACT,
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Unaweza kuwasiliana moja kwa moja na mmiliki wa duka la **Ituze** wakati wowote! 🤝\n\n- **Ongea na Mmiliki kupitia WhatsApp**: [Fungua WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Tuma Barua Pepe Moja kwa Moja**: [Tuma Email (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Ukurasa wa Mawasiliano**: [Tembelea Ukurasa wa Mawasiliano](/contact)\n- **Kituo cha Msaada**: [Fungua Kituo cha Msaada](/account/support)\n\n> 💬 *Bofya vitufe hapa chini kuwasiliana na mmiliki moja kwa moja kupitia WhatsApp au Barua Pepe!*`,
        matchedOrders: [],
        contactActions: OWNER_CONTACT,
      };
    }
    return {
      reply: `You can reach the **Ituze Store Owner** directly anytime — we are always happy to chat with you personally! 🤝\n\n- **Chat Directly on WhatsApp**: [Chat on WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Send a Direct Email**: [Email the Owner (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Store Contact Form**: [Visit Contact Us Page](/contact)\n- **Account Support Desk**: [Open Support Center](/account/support)\n\n> 💬 *Use the quick buttons below to open WhatsApp or your Email app immediately!*`,
      matchedOrders: [],
      contactActions: OWNER_CONTACT,
    };
  }

  // 4. Terms & Conditions (/terms)
  if (intent === 'terms') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Voici le résumé clair de nos **[Conditions Générales d'Utilisation (/terms)](/terms)** :\n\n- **1. Acceptation des conditions** : En passant commande ou en créant un compte, vous confirmez avoir au moins 18 ans.\n- **2. Commandes et Paiements** : Toutes les commandes dépendent de la disponibilité des stocks. Les paiements sont sécurisés (MTN MoMo, Airtel Money, Visa, Mastercard).\n- **3. Livraison** : Les délais sont estimés au moment de la commande ([Politique de livraison](/shipping-policy)).\n- **4. Retours et Remboursements** : Vous bénéficiez de **30 jours** pour retourner un article neuf dans son emballage d'origine ([Politique de retour](/returns-policy)).\n- **5. Propriété Intellectuelle & Responsabilité** : Tout le contenu et le logo **Ituze** sont protégés.\n\n👉 Vous pouvez lire l'intégralité du document ici : **[Conditions Générales](/terms)**.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Dore incamake y'**[Amategeko n'Amabwiriza bya Ituze (/terms)](/terms)**:\n\n- **1. Kwemera Amabwiriza**: Ukoresha urubuga cyangwa utumiza agomba kuba afite nibura imyaka 18.\n- **2. Komande no Kwishyura**: Ibicuruzwa bitangwa hakurikijwe ibihari mu bubiko. Kwishyura bikorwa mu mutekano usesuye (MTN MoMo, Airtel Money, Visa, Mastercard).\n- **3. Kugeza Ibicuruzwa**: Bikorerwa ku gihe cyateganyijwe ([Politiki yo Kugeza Ibicuruzwa](/shipping-policy)).\n- **4. Gusubiza no Gusubizwa Amafaranga**: Ufite **iminsi 30** yo gusubiza igicuruzwa kitakoreshejwe ([Politiki yo Gusubiza](/returns-policy)).\n- **5. Umutungo mu by'Ubwenge**: Ibikubiye ku rubuga n'ikirango cya **Ituze** birarinzwe.\n\n👉 Soma amategeko yose hano: **[Amategeko n'Amabwiriza](/terms)**.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Huu hapa ni muhtasari wa **[Masharti na Vigezo vyetu (/terms)](/terms)**:\n\n- **1. Kukubali Masharti**: Unapoweka agizo au kufungua akaunti, unathibitisha kuwa una umri wa angalau miaka 18.\n- **2. Maagizo na Malipo**: Maagizo yote yanategemea upatikanaji wa bidhaa. Malipo ni salama kupitia MoMo, Airtel Money, na Kadi za Benki.\n- **3. Kurudisha na Marejesho**: Una **siku 30** za kurudisha bidhaa ambayo haijatumika ([Sera ya Marejesho](/returns-policy)).\n- **4. Haki Miliki**: Nembo na maudhui yote ya **Ituze** yanalindwa kisheria.\n\n👉 Soma ukurasa kamili hapa: **[Masharti na Vigezo](/terms)**.`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Here is a clear explanation of our **[Terms & Conditions (/terms)](/terms)** on **Ituze**:\n\n- **1. Acceptance of Terms**: By creating an account or placing an order, you confirm you are at least 18 years old and agree to our platform guidelines.\n- **2. Orders & Payments**: Orders are subject to stock availability. Prices include applicable taxes, and we reserve the right to prevent fraudulent transactions.\n- **3. Delivery**: Delivery timelines are provided at checkout and covered in our [Shipping Policy](/shipping-policy).\n- **4. Returns & Refunds**: Unused items in original packaging can be returned within **30 days** for a full refund within 5 business days ([Returns Policy](/returns-policy)).\n- **5. Intellectual Property & Liability**: All **Ituze** branding, logos, images, and content are protected property of Ituze.\n\n👉 Read the full page anytime at **[Terms & Conditions](/terms)**.`,
      matchedOrders: [],
    };
  }

  // 5. Privacy Policy (/privacy)
  if (intent === 'privacy') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Voici comment notre **[Politique de Confidentialité (/privacy)](/privacy)** protège vos données :\n\n- **1. Données collectées** : Informations de compte (nom, email), adresses de livraison et historique de commandes (les paiements sont tokenisés, nous ne stockons jamais vos numéros de carte).\n- **2. Utilisation des données** : Uniquement pour traiter vos commandes, assurer la livraison et améliorer votre expérience.\n- **3. Aucun partage commercial** : Nous ne vendons **jamais** vos données personnelles.\n- **4. Sécurité & Vos Droits** : Cryptage SSL 256 bits. Vous pouvez modifier ou supprimer vos données à tout moment depuis [Mon Profil](/account/profile).\n\n👉 Consultez la page complète ici : **[Politique de Confidentialité](/privacy)**.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Dore uko **[Politiki y'Ibanga (/privacy)](/privacy)** irinda amakuru yawe kuri **Ituze**:\n\n- **1. Amakuru dukusanya**: Amazina, imeyili, aderesi yo kugezaho ibicuruzwa n'amateka ya komande.\n- **2. Uko akoreshwa**: Mu gutunganya komande zawe no kukugezaho serivisi nziza.\n- **3. Ntiducuruza amakuru yawe**: Amakuru yawe bwite ntabwoigera agurishwa ku bandi.\n- **4. Umutekano n'Uburenganzira bwawe**: Arinzwe na 256-bit SSL encryption, kandi ushobora kuyahindura igihe cyose kuri [Umwirondoro Wanjye](/account/profile).\n\n👉 Soma birambuye hano: **[Politiki y'Ibanga](/privacy)**.`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Here is how our **[Privacy Policy (/privacy)](/privacy)** protects you on **Ituze**:\n\n- **1. Data We Collect**: Your name, email, shipping address, and order history. Payment credentials are tokenized — we **never** store raw credit card numbers.\n- **2. How We Use Your Data**: To process and deliver your orders, provide customer support, and personalize your shopping experience.\n- **3. Strict No-Selling Guarantee**: We **never** sell your personal information to third parties. We only share delivery details with trusted couriers fulfilling your order.\n- **4. Security & Your Rights**: Protected by **256-bit SSL encryption**. You have the right to access, update, export, or delete your personal data anytime via [My Profile](/account/profile).\n\n👉 View the full document at **[Privacy Policy](/privacy)**.`,
      matchedOrders: [],
    };
  }

  // 6. FAQ (/faq)
  if (intent === 'faq') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Voici les réponses aux questions les plus fréquentes (**[Page FAQ (/faq)](/faq)**) :\n\n- **Délais de livraison** : Livraison le jour même ou en 1–2 jours à Kigali, 2–4 jours en province, et livraison internationale dans plus de 80 pays ([Politique de livraison](/shipping-policy)).\n- **Modifier ou annuler une commande** : Possible dans l'heure suivant la commande depuis [Mes Commandes](/account/orders).\n- **Retours & Remboursements** : Retours gratuits et sans tracas sous **30 jours** ([Politique de retour](/returns-policy)).\n- **Emballage cadeau** : Disponible lors de la validation du panier avec un message personnalisé.\n- **Sécurité des paiements** : Cryptage SSL 256 bits certifié PCI-DSS.\n\n👉 Voir toutes les questions sur la **[Page FAQ](/faq)**.`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Here are the top answers from our **[Frequently Asked Questions (/faq)](/faq)** page:\n\n- **How long does delivery take?** Express same-day or 1–2 days in Kigali, 2–4 days across Rwanda, and 3–7 business days standard international shipping to 80+ countries ([Shipping Policy](/shipping-policy)).\n- **Can I change or cancel my order?** Yes! Orders can be modified or cancelled within **1 hour** of placement from [My Orders](/account/orders) or by contacting us.\n- **What is your return policy?** Hassle-free returns within **30 days** of delivery for unused items in original packaging ([Returns Policy](/returns-policy)).\n- **Do you offer gift wrapping?** Yes, you can select gift wrapping and add a personalized note at checkout.\n- **Is payment secure?** 100% secure with **256-bit SSL encryption**.\n\n👉 Explore more on our **[FAQ Page](/faq)**.`,
      matchedOrders: [],
    };
  }

  // 7. About Us (/about)
  if (intent === 'about') {
    return {
      reply: `**About [Ituze (/about)](/about)** ✨\n\n**Ituze** was founded with a clear mission: to make curated, authentic, premium products accessible to everyone with luxury care, seamless speed, and warm customer support.\n\n- **Quality First**: Every product in our [Shop Catalog](/shop) is carefully vetted for durability and excellence.\n- **Global & Local Reach**: Fast delivery across Kigali, all provinces of Rwanda, and over 80 countries worldwide.\n- **Customer Focus**: Trusted by 50,000+ happy shoppers.\n\n👉 Learn more on our **[About Us Page](/about)** or browse our **[Shop](/shop)**!`,
      matchedOrders: [],
    };
  }

  // 8. Order Tracking
  if (intent === 'order') {
    if (lookedUpOrder) {
      return {
        reply:
          effectiveLang === 'fr'
            ? `J'ai trouvé votre commande **#${lookedUpOrder.order_number}** ! 📦\n- **Statut** : **${lookedUpOrder.status.toUpperCase()}**\n- **Paiement** : **${lookedUpOrder.payment_status}**\n\nCliquez sur la carte de commande ci-dessous ou visitez [Détails de la commande](/account/orders/${lookedUpOrder.id}) pour voir le suivi complet :`
            : effectiveLang === 'rw'
            ? `Nabonye komande yawe **#${lookedUpOrder.order_number}**! 📦\n- **Imimerere**: **${lookedUpOrder.status.toUpperCase()}**\n- **Kwishyura**: **${lookedUpOrder.payment_status}**\n\nKanda ku ikarita iri hasi cyangwa kuri [Reba Komande](/account/orders/${lookedUpOrder.id}) urebe aho igeze:`
            : effectiveLang === 'sw'
            ? `Nimepata agizo lako **#${lookedUpOrder.order_number}**! 📦\n- **Hali**: **${lookedUpOrder.status.toUpperCase()}**\n- **Malipo**: **${lookedUpOrder.payment_status}**\n\nBofya kadi hapa chini au [Tazama Agizo](/account/orders/${lookedUpOrder.id}) kuona maelezo kamili:`
            : `I found your order **#${lookedUpOrder.order_number}**! 📦\n- **Current Status**: **${lookedUpOrder.status.toUpperCase()}**\n- **Payment Status**: **${lookedUpOrder.payment_status}**\n\nClick the order card below or open [Order Details](/account/orders/${lookedUpOrder.id}) to view full step-by-step tracking:`,
        matchedOrders: [lookedUpOrder],
      };
    }

    if (context.orders.length > 0) {
      return {
        reply:
          effectiveLang === 'fr'
            ? `Voici vos commandes récentes${nameGreeting}. Cliquez sur une commande ci-dessous ou ouvrez [Mes Commandes](/account/orders) pour suivre son statut en temps réel :`
            : effectiveLang === 'rw'
            ? `Dore komande zawe za vuba${nameGreeting}. Kanda kuri komande iri hasi cyangwa ufungure [Komande Zanjye](/account/orders) kugira ngo ukurikirane aho igeze:`
            : effectiveLang === 'sw'
            ? `Haya hapa ni maagizo yako ya hivi karibuni${nameGreeting}. Bofya agizo lolote hapa chini au fungua [Maagizo Yangu](/account/orders) kufuatilia hali yake:`
            : `Here are your recent orders${nameGreeting}. Click any order card below or visit [My Orders](/account/orders) to track its real-time delivery progress:`,
        matchedOrders: context.orders.slice(0, 3),
      };
    }

    return {
      reply:
        effectiveLang === 'fr'
          ? `Pour suivre une commande, veuillez vous connecter et visiter **[Mes Commandes](/account/orders)**, ou envoyez-moi directement votre numéro de commande (par ex. **ORD-2026-8912**).`
          : effectiveLang === 'rw'
          ? `Kugira ngo ukurikirane komande yawe, injira muri konti yawe ujye kuri **[Komande Zanjye](/account/orders)**, cyangwa umbwire nimero ya komande yawe (urugero: **ORD-2026-8912**).`
          : effectiveLang === 'sw'
          ? `Ili kufuatilia agizo lako, tafadhali ingia kwenye **[Maagizo Yangu](/account/orders)** au nitumie nambari yako ya agizo (mfano **ORD-2026-8912**).`
          : `To track an order, please sign in and visit **[My Orders](/account/orders)**, or type your order number right here (for example **ORD-2026-8912**) and I'll look it up for you immediately!`,
      matchedOrders: [],
    };
  }

  // 9. Shipping & Delivery (/shipping-policy)
  if (intent === 'shipping') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Voici nos options et tarifs de livraison (**[Politique de Livraison (/shipping-policy)](/shipping-policy)**) :\n- **Livraison Gratuite** : Sur toutes les commandes de plus de **50 000 RWF** (ou $50)\n- **Kigali Express (Même jour)** : 5 000 RWF (livré en quelques heures)\n- **Kigali Standard** : 2 500 RWF (1 à 2 jours ouvrables)\n- **Provinces du Rwanda** : 4 500 RWF (2 à 4 jours ouvrables)\n- **International (80+ pays)** : 3 à 7 jours ouvrables en express/standard.\n\n👉 Plus de détails sur notre **[Politique de Livraison](/shipping-policy)**.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Dore uko tugeza ibicuruzwa ku bakiriya (**[Politiki yo Kugeza Ibicuruzwa (/shipping-policy)](/shipping-policy)**):\n- **Ubuntu**: Ku bicuruzwa birengeje **50,000 RWF**\n- **Kigali Express (Uwo munsi)**: 5,000 RWF\n- **Kigali Bisanzwe**: 2,500 RWF (iminsi 1–2)\n- **Mu Ntara zose z'u Rwanda**: 4,500 RWF (iminsi 2–4)\n- **Mu Mahanga (Ibihugu 80+)**: Iminsi 5–14.\n\n👉 Soma birambuye kuri **[Politiki yo Kugeza Ibicuruzwa](/shipping-policy)**.`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Here are our delivery options and timelines (**[Shipping Policy (/shipping-policy)](/shipping-policy)**):\n- **Free Shipping**: On all orders over **50,000 RWF** (or $50)\n- **Kigali Express (Same-Day)**: 5,000 RWF — delivered within hours\n- **Kigali Standard**: 2,500 RWF (1–2 business days)\n- **Provincial Delivery (All Rwanda)**: 4,500 RWF (2–4 business days)\n- **International Shipping (80+ Countries)**: 3–7 business days standard / 1–2 days express\n\n👉 Read the full details on our **[Shipping Policy Page](/shipping-policy)**.`,
      matchedOrders: [],
    };
  }

  // 10. Returns & Refunds (/returns-policy)
  if (intent === 'returns') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Notre **[Politique de Retours et Remboursements (/returns-policy)](/returns-policy)** est simple et rassurante :\n- **Garantie de 30 jours** : Retournez tout article non utilisé et dans son emballage d'origine sous 30 jours.\n- **Comment faire un retour** : Rendez-vous dans [Mes Commandes](/account/orders) ou ouvrez une demande dans le [Centre de Support](/account/support).\n- **Remboursement rapide** : Crédité sous **3 à 5 jours ouvrables** sur votre mode de paiement initial.\n\n👉 Consultez notre **[Politique de Retours](/returns-policy)** complète.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Dore **[Politiki yo Gusubiza Ibicuruzwa (/returns-policy)](/returns-policy)** muri **Ituze**:\n- **Iminsi 30**: Ushobora gusubiza igicuruzwa kitakoreshejwe kikiri mu gipfunyika cyacyo mu minsi 30.\n- **Uko bikorwa**: Injira kuri [Komande Zanjye](/account/orders) cyangwa utwandikire kuri [Ikigo cy'Ubufasha](/account/support).\n- **Gusubizwa amafaranga**: Bikorwa mu minsi **3–5 y'akazi** kuri MTN MoMo, Airtel Money cyangwa ikarita wakoresheje.\n\n👉 Soma birambuye kuri **[Politiki yo Gusubiza Ibicuruzwa](/returns-policy)**.`,
        matchedOrders: [],
      };
    }
    return {
      reply: `We offer a **30-day hassle-free return policy** (**[Returns & Refunds Policy (/returns-policy)](/returns-policy)**):\n- **Eligibility**: Items can be returned within 30 days of delivery if unused and in original packaging with tags.\n- **Easy Return Steps**: Go to [My Orders](/account/orders), select your order, and request a return (or reach out via [Support Center](/account/support)).\n- **Fast Refunds**: Processed within **3–5 business days** of receiving your return back to your original payment method.\n- **Damaged/Defective Items**: Covered by 100% free return shipping and immediate replacement.\n\n👉 View full details on our **[Returns & Refunds Page](/returns-policy)**.`,
      matchedOrders: [],
    };
  }

  // 11. Payment Methods
  if (intent === 'payment') {
    return {
      reply: `We accept multiple secure payment methods on **Ituze**:\n- **MTN Mobile Money (MoMo)** & **Airtel Money**\n- **Visa & Mastercard** debit/credit cards (protected by 256-bit SSL encryption)\n- **Cash on Delivery** (available for Kigali orders)\n\nReady to shop? Browse our **[Store Catalog](/shop)**!`,
      matchedOrders: [],
    };
  }

  // 12. Discounts & Coupons
  if (intent === 'discount') {
    return {
      reply: `Here are our active promo codes you can apply at [Checkout](/checkout):\n- **WELCOME10** — 10% off your first order\n- **SAVE20** — 20% off orders over 50,000 RWF ($150)\n- **FREESHIP** — Free standard shipping\n\nExplore our latest deals in the **[Shop](/shop)**!`,
      matchedOrders: [],
    };
  }

  // 13. Product Inquiry — Search products, explain them kindly, provide direct links AND product cards with images!
  if (intent === 'product') {
    const reply = buildProductAdvisorResponse(
      matchedProducts,
      context.categories,
      effectiveLang,
      userMessage
    );
    return {
      reply,
      matchedOrders: [],
    };
  }

  // 14. Real-Life & General Knowledge Questions:
  const curatedAnswer = answerCuratedRealLifeQuestion(userMessage, effectiveLang);
  if (curatedAnswer) {
    return { reply: curatedAnswer, matchedOrders: [] };
  }

  const liveKnowledge = await fetchLiveKnowledgeAnswer(userMessage, effectiveLang);
  if (liveKnowledge) {
    return { reply: liveKnowledge, matchedOrders: [] };
  }

  // 15. Polite, Respectful Escalation to Store Owner when AI doesn't have enough information for the specific question
  if (effectiveLang === 'fr') {
    return {
      reply: `Merci beaucoup pour votre question (*« ${userMessage} »*) ! 🙏\n\nJe n'ai pas la réponse exacte à cette question spécifique pour le moment, et je tiens à ce que vous receviez une information 100 % précise. Je vous invite respectueusement à contacter directement le propriétaire de la boutique **Ituze** qui se fera un plaisir de vous répondre personnellement :\n\n- **WhatsApp Direct** : [Discuter avec le Propriétaire sur WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Email Direct** : [Envoyer un Email au Propriétaire (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Page Contact** : [Nous Contacter](/contact)`,
      matchedOrders: [],
      contactActions: OWNER_CONTACT,
    };
  }
  if (effectiveLang === 'rw') {
    return {
      reply: `Murakoze cyane ku kibazo cyanyu (*"${userMessage}"*)! 🙏\n\nNtabwo mfite amakuru ahagije kuri iki kibazo kihariye muri aka kanya, kandi nifuza ko mubona igisubizo nyacyo. Ndabinginze mu cyubahiro cyinshi ngo muvugane na nyir'iduka rya **Ituze** mu buryo butaziguye abafashe ako kanya:\n\n- **WhatsApp ya Nyir'iduka**: [Vugana na Nyir'iduka kuri WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Email ya Nyir'iduka**: [Ohereza Email (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Ipaji yo Kutwandikira**: [Sura Ipaji ya Contact](/contact)`,
      matchedOrders: [],
      contactActions: OWNER_CONTACT,
    };
  }
  if (effectiveLang === 'sw') {
    return {
      reply: `Asante sana kwa swali lako (*"${userMessage}"*)! 🙏\n\nKwa sasa sina uhakika kamili kuhusu swali hili maalum, na ningependa upate jibu sahihi kabisa. Kwa heshima kubwa, ninakuomba uwasiliane moja kwa moja na mmiliki wa duka la **Ituze** ili akusaidie binafsi:\n\n- **WhatsApp ya Moja kwa Moja**: [Ongea na Mmiliki kupitia WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Barua Pepe ya Moja kwa Moja**: [Tuma Email kwa Mmiliki (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Ukurasa wa Mawasiliano**: [Tembelea Ukurasa wa Mawasiliano](/contact)`,
      matchedOrders: [],
      contactActions: OWNER_CONTACT,
    };
  }

  return {
    reply: `Thank you so much for asking (*"${userMessage}"*)! 🙏\n\nI don't have full information on that specific question right now, and I want to make sure you get the most accurate answer possible. Please feel free to reach out directly to the **Ituze Store Owner**, who will be happy to assist you personally:\n\n- **Direct WhatsApp Chat**: [Chat with the Owner on WhatsApp (${OWNER_CONTACT.phoneDisplay})](${OWNER_CONTACT.whatsappUrl})\n- **Direct Email**: [Email the Owner (${OWNER_CONTACT.emailAddress})](${OWNER_CONTACT.emailUrl})\n- **Contact Page**: [Visit Contact Us](/contact)`,
    matchedOrders: [],
    contactActions: OWNER_CONTACT,
  };
}

/**
 * Send user message to the server-side Gemini API (/api/chat) or use intelligent multilingual + live knowledge engine.
 */
export async function sendMessageToItuzeAI(
  userMessage: string,
  history: ChatMessage[],
  context: StoreContextData,
  lang: LangCode,
  userName?: string | null
): Promise<{
  reply: string;
  matchedProducts: ChatProductCard[];
  matchedOrders: ChatOrderCard[];
  contactActions?: ChatContactActions;
}> {
  const intent = detectUserIntent(userMessage, context.products);
  const effectiveLang = detectMessageLanguage(userMessage, lang);

  // Match products whenever intent is 'product'
  const matchedProducts =
    intent === 'product' ? findMatchingProducts(userMessage, context.products) : [];

  // Check if the user typed a specific order number (e.g., ORD-2026-8912)
  let lookedUpOrder: ChatOrderCard | null = null;
  const orderNumMatch = userMessage.match(/ORD-[A-Z0-9-]+/i);
  if (orderNumMatch) {
    lookedUpOrder = await lookupOrderByNumber(orderNumMatch[0]);
  }

  const storeSummary = context.products
    .slice(0, 25)
    .map((p) => {
      const price = p.sale_price ?? p.base_price;
      const priceLabel = `${Math.round(price).toLocaleString()} RWF`;
      return `- Name: "${p.name}" | Link: [/product/${p.slug}](/product/${p.slug}) | Category: ${p.category || 'General'} | Brand: ${p.brand || 'Ituze'} | Price: ${priceLabel} | Summary: ${p.short_description || ''}`;
    })
    .join('\n');

  const ordersContext =
    lookedUpOrder
      ? `Looked up order: #${lookedUpOrder.order_number} | ID: ${lookedUpOrder.id} | Status: ${lookedUpOrder.status} | Payment: ${lookedUpOrder.payment_status} | Total: ${lookedUpOrder.total.toLocaleString()} ${lookedUpOrder.currency}`
      : context.orders.length > 0
      ? context.orders
          .map(
            (o) =>
              `- Order #${o.order_number} (Link: /account/orders/${o.id}): Status=${o.status}, Payment=${o.payment_status}, Total=${o.total.toLocaleString()} ${o.currency}`
          )
          .join('\n')
      : 'No recent orders on file.';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        history: history.slice(-6).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
        lang: effectiveLang,
        storeSummary,
        storePagesKnowledge: STORE_PAGES_KNOWLEDGE,
        ownerContact: OWNER_CONTACT,
        ordersContext,
        userContext: userName ? `Logged in as ${userName}` : 'Guest shopper',
        intent,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.reply) {
        const matchedOrders =
          intent === 'order'
            ? lookedUpOrder
              ? [lookedUpOrder]
              : context.orders.slice(0, 3)
            : [];

        const shouldAttachContact =
          intent === 'contact' ||
          data.reply.includes('wa.me/') ||
          data.reply.includes('mailto:');

        return {
          reply: data.reply,
          matchedProducts,
          matchedOrders,
          contactActions: shouldAttachContact ? OWNER_CONTACT : undefined,
        };
      }
    }
  } catch {
    // Fall through to intelligent local + live open-knowledge responder
  }

  const fallback = await generateIntelligentItuzeResponse(
    userMessage,
    intent,
    context,
    effectiveLang,
    userName,
    matchedProducts,
    lookedUpOrder
  );

  return {
    reply: fallback.reply,
    matchedProducts,
    matchedOrders: fallback.matchedOrders,
    contactActions: fallback.contactActions,
  };
}

/**
 * Primary entry point used by ChatWidget.tsx
 */
export async function sendChatMessage(
  userMessage: string,
  history: ChatMessage[],
  userId?: string | null,
  userName?: string | null,
  lang: LangCode = 'en'
): Promise<{
  content: string;
  matchedProducts: ProductSummary[];
  matchedOrders: OrderSummary[];
  contactActions?: ChatContactActions;
}> {
  const context = await fetchChatbotContext(userId);
  const res = await sendMessageToItuzeAI(userMessage, history, context, lang, userName);
  return {
    content: res.reply,
    matchedProducts: res.matchedProducts,
    matchedOrders: res.matchedOrders,
    contactActions: res.contactActions,
  };
}
