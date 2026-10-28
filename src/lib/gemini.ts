import { supabase } from '@/lib/supabase';
import type { ProductSummary, OrderSummary, ChatMessage } from '@/types/chat';

// Curated products currently available in the Ituze store catalog
export const FALLBACK_POPULAR_PRODUCTS: ProductSummary[] = [
  {
    id: 'p0000000-0000-0000-0000-000000000001',
    name: 'NovaSound Pro Wireless Headphones',
    slug: 'novasound-pro-wireless-headphones',
    base_price: 299.99,
    sale_price: 249.99,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    category: 'Audio & Sound',
    average_rating: 4.9,
    short_description: 'Active noise cancelling headphones with 40h battery life and spatial audio.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000002',
    name: 'Apex Chrono Smartwatch Ultra',
    slug: 'apex-chrono-smartwatch-ultra',
    base_price: 399.00,
    sale_price: 349.00,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    category: 'Wearables',
    average_rating: 4.8,
    short_description: 'Titanium bezel smartwatch with biometric tracking and always-on OLED display.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000003',
    name: 'Aura Magnetic Wireless Power Bank',
    slug: 'aura-magnetic-wireless-power-bank',
    base_price: 79.99,
    sale_price: null,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1609592807908-62a2fa84b80b?w=800&q=80',
    category: 'Accessories',
    average_rating: 4.7,
    short_description: '10,000mAh snap-on magnetic fast charger with aluminum casing.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000004',
    name: 'Lumina Flow Ambient Light Bar',
    slug: 'lumina-flow-ambient-light-bar',
    base_price: 119.00,
    sale_price: 99.00,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80',
    category: 'Smart Home',
    average_rating: 4.8,
    short_description: 'Smart RGBIC dynamic monitor and room light bar with audio sync.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000005',
    name: 'Aura Pods True Wireless Earbuds',
    slug: 'aura-pods-true-wireless-earbuds',
    base_price: 149.99,
    sale_price: 129.99,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
    category: 'Audio & Sound',
    average_rating: 4.8,
    short_description: 'Compact IPX7 waterproof wireless earbuds with wireless charging case.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000006',
    name: 'Apex MagCharge 3-in-1 Station',
    slug: 'apex-magcharge-3-in-1-charging-station',
    base_price: 89.99,
    sale_price: null,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=800&q=80',
    category: 'Accessories',
    average_rating: 4.6,
    short_description: 'Simultaneous fast wireless charging for your phone, smartwatch, and earbuds.',
  },
];

let cachedProducts: ProductSummary[] | null = null;
let lastProductFetch = 0;

export async function fetchPopularProducts(): Promise<ProductSummary[]> {
  const now = Date.now();
  if (cachedProducts && now - lastProductFetch < 60000) {
    return cachedProducts;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, base_price, sale_price, currency, short_description,
        images:product_images(url, is_primary),
        category:categories(name)
      `)
      .eq('is_active', true)
      .eq('is_archived', false)
      .limit(8);

    if (error || !data || data.length === 0) {
      cachedProducts = FALLBACK_POPULAR_PRODUCTS;
      lastProductFetch = now;
      return FALLBACK_POPULAR_PRODUCTS;
    }

    cachedProducts = data.map((p: any) => {
      const primaryImage =
        p.images?.find((img: any) => img.is_primary)?.url ||
        p.images?.[0]?.url ||
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        base_price: Number(p.base_price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        currency: p.currency || 'USD',
        image_url: primaryImage,
        category: p.category?.name || 'Electronics',
        short_description: p.short_description || undefined,
      };
    });
    lastProductFetch = now;
    return cachedProducts || FALLBACK_POPULAR_PRODUCTS;
  } catch {
    cachedProducts = FALLBACK_POPULAR_PRODUCTS;
    lastProductFetch = now;
    return FALLBACK_POPULAR_PRODUCTS;
  }
}

export async function fetchUserOrders(userId?: string): Promise<OrderSummary[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total, currency, created_at,
        items:order_items(product_name, quantity)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data) return [];

    return data.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      total: Number(o.total),
      currency: o.currency || 'USD',
      created_at: o.created_at,
      item_count: o.items?.length || 0,
      items_summary: o.items?.map((i: any) => `${i.product_name} (x${i.quantity})`) || [],
    }));
  } catch {
    return [];
  }
}

export async function findOrderByNumber(orderNum: string): Promise<OrderSummary | null> {
  try {
    const cleanNum = orderNum.trim().toUpperCase().replace(/^#/, '');
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total, currency, created_at,
        items:order_items(product_name, quantity)
      `)
      .ilike('order_number', `%${cleanNum}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      order_number: data.order_number,
      status: data.status,
      total: Number(data.total),
      currency: data.currency || 'USD',
      created_at: data.created_at,
      item_count: data.items?.length || 0,
      items_summary: data.items?.map((i: any) => `${i.product_name} (x${i.quantity})`) || [],
    };
  } catch {
    return null;
  }
}

export interface AssistantResponse {
  content: string;
  matchedProducts?: ProductSummary[];
  matchedOrders?: OrderSummary[];
}

/**
 * Strictly checks whether the user is explicitly asking to see, buy, or get recommendations for products.
 * Simple greetings ("hey", "hello") or general questions will return false so products are NOT shown.
 */
export function isExplicitProductInquiry(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  // Never show products on pure greetings or small talk
  if (
    /^(hey+|hi+|hello+|hola|yo|sup|good\s*(morning|afternoon|evening|day)|bonjour|salut|muraho|mwiriwe|mwaramutse|habari|hujambo|mambo|sasa|how\s+are\s+you|how's\s+it\s+going|thanks?|thank\s+you|merci|murakoze|asante|ok|okay|cool|great|nice)[!.?\s]*$/i.test(
      q
    )
  ) {
    return false;
  }

  return (
    q.includes('product') ||
    q.includes('popular') ||
    q.includes('recommend') ||
    q.includes('show me') ||
    q.includes('what do you sell') ||
    q.includes('what do you have') ||
    q.includes('catalog') ||
    q.includes('looking for') ||
    q.includes('want to buy') ||
    q.includes('buy ') ||
    q.includes('price of') ||
    q.includes('headphone') ||
    q.includes('earbud') ||
    q.includes('smartwatch') ||
    q.includes('watch') ||
    q.includes('chrono') ||
    q.includes('light bar') ||
    q.includes('power bank') ||
    q.includes('charger') ||
    q.includes('speaker') ||
    q.includes('produit') ||
    q.includes('populaire') ||
    q.includes('ibicuruzwa') ||
    q.includes('ibikunzwe') ||
    q.includes('bidhaa') ||
    q.includes('maarufu')
  );
}

/**
 * Matching helper that selects relevant products when a user explicitly asks for them.
 */
function selectMatchingProducts(query: string, replyText: string, products: ProductSummary[]): ProductSummary[] {
  const combined = (query + ' ' + replyText).toLowerCase();
  const matched: ProductSummary[] = [];

  const isAudioQuery =
    combined.includes('audio') ||
    combined.includes('headphone') ||
    combined.includes('earbud') ||
    combined.includes('sound') ||
    combined.includes('casque') ||
    combined.includes('ecouteur');
  const isWatchQuery =
    combined.includes('watch') ||
    combined.includes('montre') ||
    combined.includes('chrono') ||
    combined.includes('wearable') ||
    combined.includes('isaha');
  const isLightQuery =
    combined.includes('light') ||
    combined.includes('lumina') ||
    combined.includes('lamp') ||
    combined.includes('itara');
  const isPowerQuery =
    combined.includes('power bank') ||
    combined.includes('charger') ||
    combined.includes('charge') ||
    combined.includes('battery') ||
    combined.includes('station');

  if (isAudioQuery) {
    matched.push(
      ...products.filter(
        (p) =>
          p.category?.toLowerCase().includes('audio') ||
          p.name.toLowerCase().includes('headphones') ||
          p.name.toLowerCase().includes('pods')
      )
    );
  }
  if (isWatchQuery) {
    matched.push(
      ...products.filter(
        (p) => p.category?.toLowerCase().includes('wearable') || p.name.toLowerCase().includes('watch')
      )
    );
  }
  if (isLightQuery) {
    matched.push(
      ...products.filter(
        (p) => p.category?.toLowerCase().includes('smart home') || p.name.toLowerCase().includes('light')
      )
    );
  }
  if (isPowerQuery) {
    matched.push(
      ...products.filter(
        (p) =>
          p.category?.toLowerCase().includes('accessories') ||
          p.name.toLowerCase().includes('power') ||
          p.name.toLowerCase().includes('charge')
      )
    );
  }

  for (const p of products) {
    if (combined.includes(p.name.toLowerCase()) || combined.includes(p.slug.toLowerCase())) {
      if (!matched.find((item) => item.id === p.id)) {
        matched.push(p);
      }
    }
  }

  if (matched.length === 0) {
    return products.slice(0, 3);
  }

  // Deduplicate and return top 3
  const unique: ProductSummary[] = [];
  for (const item of matched) {
    if (!unique.find((u) => u.id === item.id)) {
      unique.push(item);
    }
  }
  return unique.slice(0, 3);
}

/**
 * Intelligent conversational engine covering casual greetings, order tracking, store policies, and product queries.
 */
function generateIntelligentItuzeResponse(
  query: string,
  products: ProductSummary[],
  orders: OrderSummary[],
  userId?: string,
  userName?: string,
  lang = 'en',
  specificOrder?: OrderSummary | null
): AssistantResponse {
  const q = query.trim().toLowerCase();
  const matchedOrders: OrderSummary[] = [];
  const nameSuffix = userName ? ` ${userName}` : '';

  // 1. PURE GREETINGS & SMALL TALK — Reply with simple, natural words and NO products or heavy lists
  const isSimpleGreeting =
    /^(hey+|hi+|hello+|hola|yo|good\s*(morning|afternoon|evening|day)|bonjour|salut|coucou|muraho|mwiriwe|mwaramutse|bite|habari|hujambo|mambo|sasa)[!.?\s]*$/i.test(
      q
    );

  if (isSimpleGreeting) {
    if (lang === 'fr') {
      return { content: `Bonjour${nameSuffix} ! Comment puis-je vous aider aujourd'hui ?` };
    }
    if (lang === 'rw') {
      return { content: `Muraho${nameSuffix} ! Nagufasha iki uyu munsi ?` };
    }
    if (lang === 'sw') {
      return { content: `Habari${nameSuffix}! Nawezaje kukusaidia leo?` };
    }
    return { content: `Hey${nameSuffix}! Welcome to Ituze. How can I help you today?` };
  }

  const isHowAreYou =
    q.includes('how are you') ||
    q.includes("how's it going") ||
    q.includes('how are things') ||
    q.includes('comment ça va') ||
    q.includes('comment vas-tu') ||
    q.includes('amakuru') ||
    q.includes('umeamkaje') ||
    q.includes('habari gani');

  if (isHowAreYou && !isExplicitProductInquiry(q)) {
    if (lang === 'fr') {
      return { content: `Je vais très bien, merci ! Comment puis-je vous aider aujourd'hui ?` };
    }
    if (lang === 'rw') {
      return { content: `Meze neza cyane, urakoze kubaza! Nagufasha iki uyu munsi?` };
    }
    if (lang === 'sw') {
      return { content: `Niko salama kabisa, asante kwa kuuliza! Nawezaje kukusaidia leo?` };
    }
    return { content: `I'm doing great, thank you for asking! How can I help you today?` };
  }

  const isThanksOrAck =
    /^(thanks?|thank\s+you(\s+so\s+much|\s+very\s+much)?|thx|ty|merci(\s+beaucoup)?|murakoze(\s+cyane)?|urakoze|asante(\s+sana)?|ok|okay|got\s+it|alright|awesome|great|nice|bye|goodbye)[!.?\s]*$/i.test(
      q
    );

  if (isThanksOrAck) {
    if (lang === 'fr') {
      return { content: `Avec plaisir ! N'hésitez pas si vous avez besoin d'autre chose.` };
    }
    if (lang === 'rw') {
      return { content: `Murakoze cyane! Niba hari ikindi ukeneye, mbwira ngufashe.` };
    }
    if (lang === 'sw') {
      return { content: `Karibu sana! Usisite kuniuliza kama unahitaji msaada mwingine.` };
    }
    return { content: `You're very welcome! Let me know if there's anything else I can help you with.` };
  }

  const isIdentityQuestion =
    q.includes('who are you') ||
    q.includes('what are you') ||
    q.includes('what can you do') ||
    q.includes('qui es-tu') ||
    q.includes('uri nde') ||
    q.includes('wewe ni nani');

  if (isIdentityQuestion) {
    if (lang === 'fr') {
      return {
        content: `Je suis **Ituze AI**, votre assistant personnel sur Ituze. Je peux vous aider à suivre vos commandes, répondre à vos questions sur la livraison ou vous recommander des produits si vous le souhaitez.`,
      };
    }
    if (lang === 'rw') {
      return {
        content: `Ndi **Ituze AI**, umufasha wawe kuri Ituze. Nshobora kugufasha gukurikirana komande zawe, gusubiza ibibazo byo kugeza ibicuruzwa, cyangwa kukwereka ibicuruzwa igihe ubisabye.`,
      };
    }
    if (lang === 'sw') {
      return {
        content: `Mimi ni **Ituze AI**, msaidizi wako kwenye Ituze. Ninaweza kukusaidia kufuatilia maagizo yako, kujibu maswali ya usafirishaji, au kukuonyesha bidhaa ukiomba.`,
      };
    }
    return {
      content: `I'm **Ituze AI**, your virtual shopping assistant for Ituze. I can help you track orders, answer questions about shipping and returns, or show you products whenever you ask.`,
    };
  }

  // 2. SPECIFIC ORDER LOOKUP (e.g. ORD-2026-8912)
  if (specificOrder) {
    matchedOrders.push(specificOrder);
    let text = '';
    if (lang === 'fr') {
      text = `J'ai trouvé votre commande **#${specificOrder.order_number}** (${specificOrder.status.toUpperCase()}) d'un montant de **$${specificOrder.total} ${specificOrder.currency}**. Cliquez sur la carte ci-dessous pour voir le suivi détaillé.`;
    } else if (lang === 'rw') {
      text = `Nabonye komande yawe **#${specificOrder.order_number}** (${specificOrder.status.toUpperCase()}) ihwanye na **$${specificOrder.total} ${specificOrder.currency}**. Kanda ku ikarita iri munsi urebe aho igeze.`;
    } else if (lang === 'sw') {
      text = `Nimepata agizo lako **#${specificOrder.order_number}** (${specificOrder.status.toUpperCase()}) lenye jumla ya **$${specificOrder.total} ${specificOrder.currency}**. Bofya kadi hapa chini kufuatilia.`;
    } else {
      text = `Here is your order **#${specificOrder.order_number}** — currently **${specificOrder.status.toUpperCase()}** ($${specificOrder.total} ${specificOrder.currency}). Click the order card below to view full step-by-step tracking.`;
    }
    return { content: text, matchedOrders };
  }

  // 3. ORDER / TRACKING INTENT
  const isOrderIntent =
    q.includes('order') ||
    q.includes('track') ||
    q.includes('package') ||
    q.includes('shipment') ||
    q.includes('where is my') ||
    q.includes('commande') ||
    q.includes('suivi') ||
    q.includes('colis') ||
    q.includes('agizo') ||
    q.includes('maagizo') ||
    q.includes('fuatilia') ||
    q.includes('komande') ||
    q.includes('ibyatumijwe') ||
    q.includes('status');

  if (isOrderIntent) {
    if (userId && orders.length > 0) {
      matchedOrders.push(...orders.slice(0, 3));
      let text = '';
      if (lang === 'fr') {
        text = `Voici vos commandes récentes. Cliquez sur une commande ci-dessous pour suivre son statut en direct ou allez dans votre [Tableau de bord](/account) :`;
      } else if (lang === 'rw') {
        text = `Dore komande zawe ziheruka. Kanda kuri komande iri munsi kugira ngo ukurikirane aho igeze cyangwa ujye muri [Konti yawe](/account) :`;
      } else if (lang === 'sw') {
        text = `Hapa kuna maagizo yako ya hivi karibuni. Bofya agizo hapa chini kufuatilia au tembelea [Dashibodi yako](/account) :`;
      } else {
        text = `Here are your recent orders. Tap any order card below to track its live delivery progress, or visit your [Account Dashboard](/account):`;
      }
      return { content: text, matchedOrders };
    } else if (userId) {
      return {
        content:
          lang === 'fr'
            ? `Vous n'avez pas encore de commande active. Vous pouvez aussi rechercher un numéro de commande (ex: ORD-2026-8912) directement depuis votre [Tableau de bord](/account).`
            : lang === 'rw'
            ? `Nta komande urakora. Ushobora no gushakisha numero ya komande (urugero: ORD-2026-8912) muri [Konti yawe](/account).`
            : lang === 'sw'
            ? `Bado huna agizo lolote. Unaweza pia kutafuta nambari ya agizo (mfano: ORD-2026-8912) kwenye [Dashibodi yako](/account).`
            : `You don't have any orders under your account yet. You can also enter an order number (such as **ORD-2026-8912**) right here or in your [Account Dashboard](/account) to track it.`,
      };
    } else {
      return {
        content:
          lang === 'fr'
            ? `Pour suivre vos commandes, veuillez vous [connecter à votre compte](/auth/login) ou m'indiquer votre numéro de commande (ex: **ORD-2026-8912**).`
            : lang === 'rw'
            ? `Kugira ngo ukurikirane komande zawe, [injira kuri konti yawe](/auth/login) cyangwa wandike numero ya komande yawe hano (urugero: **ORD-2026-8912**).`
            : lang === 'sw'
            ? `Kufuatilia maagizo yako, tafadhali [ingia kwenye akaunti yako](/auth/login) au andika nambari ya agizo lako hapa (mfano: **ORD-2026-8912**).`
            : `To track your orders, please [sign in to your account](/auth/login) or type your order number here (for example: **ORD-2026-8912**).`,
      };
    }
  }

  // 4. EXPLICIT PRODUCT INQUIRY — Only show product cards when the user asks for products
  if (isExplicitProductInquiry(q)) {
    const finalProducts = selectMatchingProducts(q, '', products);
    let text = '';
    if (lang === 'fr') {
      text = `Voici les produits correspondants dans notre catalogue Ituze. Cliquez sur un article pour voir les détails :`;
    } else if (lang === 'rw') {
      text = `Dore ibicuruzwa bihari muri Ituze bihuye n'ibyo ushaka. Kanda ku gicuruzwa urebe ibirambuye :`;
    } else if (lang === 'sw') {
      text = `Hapa kuna bidhaa zinazopatikana kwenye Ituze. Bofya bidhaa yoyote kuona maelezo zaidi :`;
    } else {
      text = `Here are the matching products from our Ituze collection. Tap any item below to view full details:`;
    }
    return { content: text, matchedProducts: finalProducts };
  }

  // 5. SHIPPING & DELIVERY INTENT
  if (
    q.includes('ship') ||
    q.includes('deliver') ||
    q.includes('livr') ||
    q.includes('kugeza') ||
    q.includes('usafirishaji') ||
    q.includes('how long')
  ) {
    if (lang === 'fr') {
      return {
        content: `La livraison est **gratuite dès $50 USD** d'achat. La livraison standard prend **3 à 5 jours ouvrés** ($4.99) et la livraison express prend **1 à 2 jours ouvrés** ($12.99).`,
      };
    }
    if (lang === 'rw') {
      return {
        content: `Kugeza ibicuruzwa ni **ubuntu ku bicuruzwa birengeje $50 USD**. Uburyo busanzwe bitwara **iminsi 3–5 y'akazi** ($4.99), naho Express bigatwara **iminsi 1–2** ($12.99).`,
      };
    }
    if (lang === 'sw') {
      return {
        content: `Usafirishaji ni **bure kwa maagizo zaidi ya $50 USD**. Usafirishaji wa kawaida huchukua **siku 3–5 za kazi** ($4.99) na Express huchukua **siku 1–2** ($12.99).`,
      };
    }
    return {
      content: `We offer **free shipping on all orders over $50 USD**. Standard shipping takes **3–5 business days** ($4.99), and Express Priority takes **1–2 business days** ($12.99).`,
    };
  }

  // 6. DISCOUNTS, COUPONS & DEALS
  if (
    q.includes('coupon') ||
    q.includes('discount') ||
    q.includes('promo') ||
    q.includes('deal') ||
    q.includes('code') ||
    q.includes('remise') ||
    q.includes('punguzo') ||
    q.includes('offer') ||
    q.includes('sale')
  ) {
    if (lang === 'fr') {
      return {
        content: `Vous pouvez utiliser le code **WELCOME10** pour obtenir **10% de réduction** sur toute la boutique, ou **SAVE20** pour **20% de réduction** dès $150 d'achat lors du paiement.`,
      };
    }
    if (lang === 'rw') {
      return {
        content: `Koresha kodi **WELCOME10** ubone **igabanuka rya 10%**, cyangwa **SAVE20** ubone **igabanuka rya 20%** kuri komande irengeje $150 wishyura.`,
      };
    }
    if (lang === 'sw') {
      return {
        content: `Tumia kodi **WELCOME10** kupata **punguzo la 10%**, au **SAVE20** kupata **punguzo la 20%** kwa maagizo zaidi ya $150 wakati wa kulipa.`,
      };
    }
    return {
      content: `You can use code **WELCOME10** at checkout for **10% OFF** any order, or **SAVE20** for **20% OFF** orders over $150 USD.`,
    };
  }

  // 7. RETURNS & REFUNDS
  if (
    q.includes('return') ||
    q.includes('refund') ||
    q.includes('retour') ||
    q.includes('rembours') ||
    q.includes('gusubiza') ||
    q.includes('kurudisha') ||
    q.includes('exchange') ||
    q.includes('warranty')
  ) {
    if (lang === 'fr') {
      return {
        content: `Vous disposez de **30 jours** après la livraison pour retourner un article dans son état d'origine et obtenir un remboursement complet sous 3 à 5 jours ouvrés.`,
      };
    }
    if (lang === 'rw') {
      return {
        content: `Ufite **iminsi 30** nyuma yo kwakira igicuruzwa yo kukisubiza kikiri gishya ukishyurwa amafaranga yawe yose mu minsi 3–5 y'akazi.`,
      };
    }
    if (lang === 'sw') {
      return {
        content: `Una **siku 30** baada ya kupokea bidhaa kuirudisha ikiwa katika hali yake ya asili na kurejeshewa pesa kamili ndani ya siku 3–5 za kazi.`,
      };
    }
    return {
      content: `We offer a **30-day hassle-free return policy**. Unused items in original packaging can be returned within 30 days for a full refund within 3–5 business days.`,
    };
  }

  // 8. PAYMENT METHODS
  if (
    q.includes('pay') ||
    q.includes('paiement') ||
    q.includes('kwishyura') ||
    q.includes('kulipa') ||
    q.includes('momo') ||
    q.includes('airtel') ||
    q.includes('visa') ||
    q.includes('mastercard') ||
    q.includes('card')
  ) {
    return {
      content:
        lang === 'fr'
          ? `Nous acceptons **MTN Mobile Money (MoMo)**, **Airtel Money**, les cartes **Visa / Mastercard** ainsi que **PayPal**. Toutes les transactions sont protégées par chiffrement SSL 256 bits.`
          : lang === 'rw'
          ? `Twemera kwishyura ukoresheje **MTN MoMo**, **Airtel Money**, amakarita ya **Visa / Mastercard** na **PayPal** mu mutekano usesuye.`
          : lang === 'sw'
          ? `Tunakubali malipo kupitia **MTN MoMo**, **Airtel Money**, kadi za **Visa / Mastercard**, na **PayPal** kwa usalama kamili.`
          : `We accept **MTN Mobile Money (MoMo)**, **Airtel Money**, **Visa**, **Mastercard**, and **PayPal**. All payments are encrypted with 256-bit SSL security.`,
    };
  }

  // 9. CONTACT & CUSTOMER SUPPORT
  if (
    q.includes('contact') ||
    q.includes('support') ||
    q.includes('help') ||
    q.includes('phone') ||
    q.includes('email') ||
    q.includes('service client') ||
    q.includes('ubufasha') ||
    q.includes('msaada')
  ) {
    return {
      content:
        lang === 'fr'
          ? `Vous pouvez joindre notre équipe 24h/24 par email à **hello@ituze.com**, par téléphone/WhatsApp au **+250 788 123 456**, ou via notre [Page de contact](/contact).`
          : lang === 'rw'
          ? `ushobora kutuvugisha kuri email **hello@ituze.com**, telefone/WhatsApp **+250 788 123 456**, cyangwa ku [Rupapuro rwo kutwandikira](/contact).`
          : lang === 'sw'
          ? `Unaweza kuwasiliana nasi saa 24 kupitia barua pepe **hello@ituze.com**, simu/WhatsApp **+250 788 123 456**, au kwenye [Ukurasa wa Mawasiliano](/contact).`
          : `You can reach our support team 24/7 at **hello@ituze.com**, via phone/WhatsApp at **+250 788 123 456**, or through our [Contact Page](/contact).`,
    };
  }

  // 10. ACCOUNT / LOGIN / SIGNUP QUESTIONS
  if (
    q.includes('account') ||
    q.includes('login') ||
    q.includes('sign in') ||
    q.includes('sign up') ||
    q.includes('register') ||
    q.includes('password') ||
    q.includes('compte') ||
    q.includes('konti') ||
    q.includes('akaunti')
  ) {
    return {
      content:
        lang === 'fr'
          ? `Vous pouvez vous [connecter ici](/auth/login) ou [créer un compte](/auth/register) avec votre adresse email et mot de passe pour accéder à votre tableau de bord et suivre vos commandes.`
          : lang === 'rw'
          ? `Ushobora [kwinjira hano](/auth/login) cyangwa [gufungura konti](/auth/register) ukoresheje email yawe n'ijambobanga kugira ngo ukurikirane komande zawe.`
          : lang === 'sw'
          ? `Unaweza [kuingia hapa](/auth/login) au [kufungua akaunti](/auth/register) kwa barua pepe na neno la siri ili kufuatilia maagizo yako kwenye dashibodi.`
          : `You can easily [Sign In](/auth/login) or [Create an Account](/auth/register) using your email and password to access your personal dashboard and track your orders in real time.`,
    };
  }

  // 11. CONCISE, NATURAL DEFAULT RESPONSE (No unsolicited products or wall of text)
  if (lang === 'fr') {
    return {
      content: `Je suis là pour vous aider ! Posez-moi une question sur le suivi d'une commande (ex: ORD-2026-8912), la livraison, les retours, ou demandez-moi de vous montrer des produits.`,
    };
  }
  if (lang === 'rw') {
    return {
      content: `Ndi hano ngo ngufashe! Ushobora kumbaza ibyerekeye gukurikirana komande yawe (urugero: ORD-2026-8912), kugeza ibicuruzwa, cyangwa ukansaba kukwereka ibicuruzwa bihari.`,
    };
  }
  if (lang === 'sw') {
    return {
      content: `Niko hapa kukusaidia! Unaweza kuniuliza kuhusu kufuatilia agizo lako (mfano: ORD-2026-8912), usafirishaji, au uniombe nikuonyeshe bidhaa zetu.`,
    };
  }
  return {
    content: `I'd be happy to help with that! You can ask me to track an order (e.g., **ORD-2026-8912**), check shipping or return policies, or ask me to recommend products whenever you're ready.`,
  };
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  userId?: string,
  userName?: string,
  lang = 'en'
): Promise<AssistantResponse> {
  const [popularProducts, userOrders] = await Promise.all([
    fetchPopularProducts(),
    fetchUserOrders(userId),
  ]);

  const orderNumberMatch = message.match(/ORD-[\w\d-]+/i);
  let specificOrder: OrderSummary | null = null;
  if (orderNumberMatch) {
    specificOrder = await findOrderByNumber(orderNumberMatch[0]);
  }

  const wantsProducts = isExplicitProductInquiry(message);
  const qLower = message.trim().toLowerCase();
  const isOrderQuery =
    Boolean(specificOrder) ||
    qLower.includes('order') ||
    qLower.includes('track') ||
    qLower.includes('commande') ||
    qLower.includes('suivi') ||
    qLower.includes('komande') ||
    qLower.includes('agizo');

  // Call the server-side Gemini endpoint (/api/chat)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const productsContext = popularProducts
      .map(
        (p) =>
          `- ${p.name} ($${p.sale_price ?? p.base_price} ${p.currency}, Category: ${p.category}): ${p.short_description || ''}`
      )
      .join('\n');

    const ordersContext =
      userOrders.length > 0
        ? userOrders
            .map(
              (o) =>
                `- Order #${o.order_number}: Status "${o.status}", Total: $${o.total} ${o.currency}, Placed ${new Date(o.created_at).toLocaleDateString()}, Items: ${o.items_summary?.join(', ') || 'Items'}`
            )
            .join('\n')
        : 'No past orders.';

    const systemContext = `Customer: ${userId ? `Logged in as ${userName || 'Customer'}` : 'Guest'}
Customer Orders:
${ordersContext}${specificOrder ? `\nLooked up Order: #${specificOrder.order_number} (Status: ${specificOrder.status}, Total: $${specificOrder.total} ${specificOrder.currency})` : ''}
Store Catalog (ONLY mention if user explicitly asks for products):
${productsContext}
Store Policies: Free shipping over $50. Standard shipping $4.99 (3-5 days). Express $12.99 (1-2 days). 30-day returns. Payment: MTN MoMo, Airtel Money, Visa, Mastercard, PayPal. Active Coupons: WELCOME10 (10% off), SAVE20 (20% off over $150).`;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        systemContext,
        lang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const replyText = (data?.text || '').trim();
      if (replyText.length > 0) {
        const matchedProducts = wantsProducts
          ? selectMatchingProducts(message, replyText, popularProducts)
          : undefined;

        const matchedOrders: OrderSummary[] = specificOrder
          ? [specificOrder]
          : isOrderQuery && userOrders.length > 0
          ? userOrders.slice(0, 3)
          : [];

        return {
          content: replyText,
          matchedProducts: matchedProducts && matchedProducts.length > 0 ? matchedProducts : undefined,
          matchedOrders: matchedOrders.length > 0 ? matchedOrders : undefined,
        };
      }
    }
  } catch {
    // Seamless fallback when running as static build or offline
  } finally {
    clearTimeout(timeoutId);
  }

  return generateIntelligentItuzeResponse(
    message,
    popularProducts,
    userOrders,
    userId,
    userName,
    lang,
    specificOrder
  );
}
