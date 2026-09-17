import { supabase } from '@/lib/supabase';
import type { ProductSummary, OrderSummary, ChatMessage } from '@/types/chat';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const GEMINI_MODEL = 'gemini-1.5-flash';

// Curated store catalog for Tunga
export const FALLBACK_POPULAR_PRODUCTS: ProductSummary[] = [
  {
    id: 'p0000000-0000-0000-0000-000000000001',
    name: 'NovaSound Pro Wireless Headphones',
    slug: 'novasound-pro-wireless-headphones',
    base_price: 299.99,
    sale_price: 249.99,
    currency: 'RWF',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    category: 'Audio & Sound',
    average_rating: 4.9,
    short_description: 'Active noise cancelling headphones with 40h battery life and spatial audio.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000002',
    name: 'Apex Chrono Smartwatch Ultra',
    slug: 'apex-chrono-smartwatch-ultra',
    base_price: 229.99,
    sale_price: 199.99,
    currency: 'RWF',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    category: 'Wearables',
    average_rating: 4.8,
    short_description: 'Rugged titanium smartwatch with heart-rate tracking, GPS, and 7-day battery.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000003',
    name: 'Lumina Pulse Ambient Light Bar',
    slug: 'lumina-pulse-ambient-light-bar',
    base_price: 79.99,
    sale_price: null,
    currency: 'RWF',
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80',
    category: 'Smart Home',
    average_rating: 4.7,
    short_description: 'Smart RGB lighting bar syncing to music and screen colors with companion app.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000004',
    name: 'Aura Pods True Wireless Earbuds',
    slug: 'aura-pods-true-wireless-earbuds',
    base_price: 149.99,
    sale_price: 129.99,
    currency: 'RWF',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80',
    category: 'Audio & Sound',
    average_rating: 4.8,
    short_description: 'Compact IPX7 waterproof wireless earbuds with wireless charging case.',
  },
  {
    id: 'p0000000-0000-0000-0000-000000000005',
    name: 'Apex MagCharge 3-in-1 Station',
    slug: 'apex-magcharge-3-in-1-charging-station',
    base_price: 89.99,
    sale_price: null,
    currency: 'RWF',
    image_url: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=500&q=80',
    category: 'Accessories',
    average_rating: 4.6,
    short_description: 'Simultaneous fast wireless charging for your phone, smartwatch, and earbuds.',
  },
];

// In-memory caching for instant fast responses
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
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        base_price: Number(p.base_price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        currency: p.currency || 'RWF',
        image_url: primaryImage,
        category: p.category?.name || 'Electronics',
        short_description: p.short_description || undefined,
      };
    });
    lastProductFetch = now;
    return cachedProducts;
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
      currency: o.currency || 'RWF',
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
    const cleanNum = orderNum.trim().toUpperCase();
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
      currency: data.currency || 'RWF',
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
 * Intelligent high-speed knowledge engine covering ALL e-commerce questions
 * when live Gemini API has network latency, is unavailable, or times out.
 */
function generateIntelligentTungaResponse(
  query: string,
  products: ProductSummary[],
  orders: OrderSummary[],
  userId?: string,
  userName?: string,
  lang = 'en',
  specificOrder?: OrderSummary | null
): AssistantResponse {
  const q = query.toLowerCase();
  const matchedProducts: ProductSummary[] = [];
  const matchedOrders: OrderSummary[] = [];

  const customerName = userName || (lang === 'fr' ? 'Cher client' : lang === 'rw' ? 'Mukunzi' : lang === 'sw' ? 'Mteja' : 'Valued Customer');

  // 1. SPECIFIC ORDER QUERY OR GENERAL ORDER TRACKING
  if (specificOrder) {
    matchedOrders.push(specificOrder);
    let text = '';
    if (lang === 'fr') {
      text = `J'ai retrouvé votre commande **#${specificOrder.order_number}** !\n\n- **Statut actuel :** ${specificOrder.status.toUpperCase()}\n- **Montant total :** $${specificOrder.total} ${specificOrder.currency}\n- **Articles :** ${specificOrder.items_summary?.join(', ') || 'Articles Tunga'}\n- **Date :** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nVous pouvez cliquer sur la carte ci-dessous pour suivre votre colis en temps réel.`;
    } else if (lang === 'rw') {
      text = `Nabonye komande yawe **#${specificOrder.order_number}** !\n\n- **Imiterere :** ${specificOrder.status.toUpperCase()}\n- **Amafaranga yose :** $${specificOrder.total} ${specificOrder.currency}\n- **Ibicuruzwa :** ${specificOrder.items_summary?.join(', ') || 'Ibicuruzwa bya Tunga'}\n- **Itariki :** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nKanda ku ikarita iri munsi kugira ngo ukurikirane komande yawe.`;
    } else if (lang === 'sw') {
      text = `Nimepata agizo lako **#${specificOrder.order_number}** !\n\n- **Hali ya sasa :** ${specificOrder.status.toUpperCase()}\n- **Jumla ya gharama :** $${specificOrder.total} ${specificOrder.currency}\n- **Vitu :** ${specificOrder.items_summary?.join(', ') || 'Bidhaa za Tunga'}\n- **Tarehe :** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nBofya kadi hapa chini kufuatilia kifurushi chako.`;
    } else {
      text = `Found your order **#${specificOrder.order_number}**!\n\n- **Current Status:** ${specificOrder.status.toUpperCase()}\n- **Order Total:** $${specificOrder.total} ${specificOrder.currency}\n- **Items:** ${specificOrder.items_summary?.join(', ') || 'Tunga items'}\n- **Placed On:** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nTap the order card below to view live tracking details or download invoice.`;
    }
    return { content: text, matchedOrders };
  }

  // 2. ORDER / TRACKING INTENT
  const isOrderIntent =
    q.includes('order') ||
    q.includes('track') ||
    q.includes('commande') ||
    q.includes('suivi') ||
    q.includes('agizo') ||
    q.includes('fuatilia') ||
    q.includes('komande') ||
    q.includes('status');

  if (isOrderIntent) {
    if (userId && orders.length > 0) {
      matchedOrders.push(...orders.slice(0, 3));
      let text = '';
      if (lang === 'fr') {
        text = `Bonjour **${customerName}**, voici le récapitulatif de vos commandes récentes sur Tunga :\n\n- **Suivi en direct :** Cliquez sur une commande pour afficher les détails d'expédition.\n- **Délais de livraison :** Les colis standard arrivent sous 3 à 5 jours ouvrés.\n- **Besoin d'aide ?** Vous pouvez également m'indiquer votre numéro de commande (ex: ORD-2026-XXXX).`;
      } else if (lang === 'rw') {
        text = `Muraho **${customerName}**, dore ibyo uherutse gutumiza kuri Tunga :\n\n- **Gukurikirana :** Kanda kuri komande wifuza kureba uko ihagaze.\n- **Igihe cyo kugezwaho :** Bitwara iminsi 3 kugeza kuri 5 y'akazi.\n- **Ubufasha :** Ushobora no kunyandikira numero ya komande yawe (urugero: ORD-2026-XXXX).`;
      } else if (lang === 'sw') {
        text = `Habari **${customerName}**, hapa kuna maagizo yako ya hivi karibuni kwenye Tunga :\n\n- **Ufuatiliaji :** Bofya agizo kuangalia maelezo ya usafirishaji.\n- **Muda wa kuwasili :** Siku 3 hadi 5 za kazi kwa usafirishaji wa kawaida.\n- **Msaada :** Unaweza pia kunitumia nambari ya agizo lako (mfano: ORD-2026-XXXX).`;
      } else {
        text = `Hello **${customerName}**, here are your recent orders placed on Tunga:\n\n- **Live Tracking:** Tap any order card below to see detailed delivery progress.\n- **Delivery Timing:** Standard shipments arrive within 3–5 business days.\n- **Direct Lookup:** You can also type any specific order number (e.g., ORD-2026-XXXX).`;
      }
      return { content: text, matchedOrders };
    } else if (userId) {
      let text = '';
      if (lang === 'fr') {
        text = `Vous n'avez pas encore passé de commande sur Tunga. Découvrez nos produits phares et profitez de notre garantie satisfaction !`;
      } else if (lang === 'rw') {
        text = `Nta komande urakora kuri Tunga. Reba ibicuruzwa bikunzwe witegure guhaha mu mutekano !`;
      } else if (lang === 'sw') {
        text = `Bado haujaweka agizo lolote kwenye Tunga. Angalia bidhaa zetu maarufu na ufurahie ununuzi salama !`;
      } else {
        text = `You don't have any active orders right now. Explore our catalog below to start shopping with 100% genuine products and fast delivery!`;
      }
      return { content: text, matchedProducts: products.slice(0, 3) };
    } else {
      let text = '';
      if (lang === 'fr') {
        text = `Pour consulter vos commandes, veuillez vous [connecter à votre compte](/login) ou me fournir directement votre référence de commande (ex: **ORD-2026-XXXX**).\n\n- **Connexion rapide :** Vos commandes sont enregistrées dans votre espace client.\n- **Recherche immédiate :** Entrez votre référence pour un statut instantané.`;
      } else if (lang === 'rw') {
        text = `Kugira ngo urebe ibyo watumije, nyamuneka [injira kuri konti yawe](/login) cyangwa unyandikire numero ya komande yawe (urugero: **ORD-2026-XXXX**).\n\n- **Kwinjira :** Komande zawe zose zibitse muri konti yawe.\n- **Gushakisha :** Andika numero ya komande ngufashe aka kanya.`;
      } else if (lang === 'sw') {
        text = `Kuangalia maagizo yako, tafadhali [ingia kwenye akaunti yako](/login) au weka nambari ya agizo lako hapa (mfano: **ORD-2026-XXXX**).\n\n- **Ingia :** Maagizo yote yamehifadhiwa kwenye akaunti yako.\n- **Tafuta :** Weka nambari ya agizo upate maelezo ya haraka.`;
      } else {
        text = `To view your orders, please [sign in to your account](/login) or type your Order Number (e.g. **ORD-2026-XXXX**).\n\n- **Account Orders:** Sign in to see past history, receipts, and order statuses.\n- **Guest Lookup:** Type your order number anytime for instant tracking!`;
      }
      return { content: text };
    }
  }

  // 3. SHIPPING & DELIVERY INTENT
  const isShippingIntent =
    q.includes('ship') ||
    q.includes('deliver') ||
    q.includes('livr') ||
    q.includes('kugeza') ||
    q.includes('posita') ||
    q.includes('usafirishaji') ||
    q.includes('transport') ||
    q.includes('how long');

  if (isShippingIntent) {
    let text = '';
    if (lang === 'fr') {
      text = `Voici la politique de livraison officielle de **Tunga** :\n\n- **Livraison Gratuite :** Offerte pour toute commande supérieure à **$50 USD**.\n- **Livraison Standard :** 3 à 5 jours ouvrés ($5.00 USD).\n- **Livraison Express :** 1 à 2 jours ouvrés ($12.00 USD).\n- **Livraison Internationale :** Expédition sécurisée vers plus de 80 pays.\n- **Suivi des colis :** Numéro de suivi fourni dès l'expédition avec notifications SMS/Email.`;
    } else if (lang === 'rw') {
      text = `Dore amabwiriza yo kugeza ibicuruzwa ku bakiriya kuri **Tunga** :\n\n- **Kugezwaho ku buntu :** Kuri buri komande irengeje **$50 USD**.\n- **Uburyo busanzwe (Standard) :** Iminsi 3 kugeza kuri 5 y'akazi ($5.00 USD).\n- **Uburyo bwihuse (Express) :** Umunsi 1 kugeza kuri 2 y'akazi ($12.00 USD).\n- **Kuri Kigali & Intara :** Dukurikirana ko ibicuruzwa bikugiraho neza.\n- **Gukurikirana :** Uhita uhabwa uburyo bwo gukurikirana ipaki yawe.`;
    } else if (lang === 'sw') {
      text = `Hapa kuna sera rasmi ya usafirishaji ya **Tunga** :\n\n- **Usafirishaji wa Bure :** Kwa maagizo yote zaidi ya **$50 USD**.\n- **Usafirishaji wa Kawaida :** Siku 3 hadi 5 za kazi ($5.00 USD).\n- **Usafirishaji wa Haraka (Express) :** Siku 1 hadi 2 za kazi ($12.00 USD).\n- **Mataifa mengine :** Tunasafirisha kwa usalama katika nchi zaidi ya 80.\n- **Ufuatiliaji :** Utapokea nambari ya kufuatilia kifurushi mara tu kinapotumwa.`;
    } else {
      text = `Here is everything you need to know about shipping with **Tunga**:\n\n- **Free Shipping:** Automatic free delivery on orders over **$50 USD**!\n- **Standard Delivery:** 3–5 business days ($5.00 USD).\n- **Express Delivery:** 1–2 business days ($12.00 USD).\n- **Global Coverage:** Fast, insured delivery across East Africa and to 80+ countries.\n- **Package Tracking:** Real-time tracking link and notifications sent via SMS and email.`;
    }
    return { content: text };
  }

  // 4. DISCOUNTS, COUPONS & DEALS INTENT
  const isDealsIntent =
    q.includes('coupon') ||
    q.includes('discount') ||
    q.includes('promo') ||
    q.includes('deal') ||
    q.includes('code') ||
    q.includes('remise') ||
    q.includes('rabais') ||
    q.includes('kugabanyirizwa') ||
    q.includes('punguzo') ||
    q.includes('offer') ||
    q.includes('sale');

  if (isDealsIntent) {
    let text = '';
    if (lang === 'fr') {
      text = `Profitez de nos offres et réductions exclusives chez **Tunga** !\n\n- **Code WELCOME10 :** 10% de réduction immédiate sur votre première commande.\n- **Code SAVE20 :** Réduction de 20% pour les paniers supérieurs à $150 USD.\n- **Code TUNGAVIP :** Avantages exclusifs pour les membres VIP.\n- **Comment l'appliquer :** Entrez simplement le code dans le champ "Code promo" lors de votre paiement.`;
    } else if (lang === 'rw') {
      text = `Dore amakode y'ingirakamaro agabanya ibiciro kuri **Tunga** !\n\n- **Kodi WELCOME10 :** Igabanuka rya 10% kuri komande yawe ya mbere.\n- **Kodi SAVE20 :** Igabanuka rya 20% kuri komande irengeje $150 USD.\n- **Kodi TUNGAVIP :** Ibyiza bidasanzwe ku banyamuryango ba Tunga VIP.\n- **Uko ikoreshwa :** Wandika iyo kodi mu mwanya wagenewe "Discount Code" wishyura.`;
    } else if (lang === 'sw') {
      text = `Pata ofa na punguzo kabambe kutoka **Tunga** !\n\n- **Kodi WELCOME10 :** Punguzo la 10% kwenye agizo lako la kwanza.\n- **Kodi SAVE20 :** Punguzo la 20% kwa maagizo zaidi ya $150 USD.\n- **Kodi TUNGAVIP :** Faida za kipekee kwa wanachama wa Tunga VIP.\n- **Jinsi ya kutumia :** Weka kodi hiyo kwenye sehemu ya "Discount Code" wakati wa kulipa.`;
    } else {
      text = `Here are active discounts and special promotions you can use right now on **Tunga**:\n\n- **Code WELCOME10:** 10% OFF your first order storewide.\n- **Code SAVE20:** 20% OFF when your cart total exceeds $150 USD.\n- **Code TUNGAVIP:** VIP privileges and seasonal member discounts.\n- **How to apply:** Enter your promo code in the "Discount Code" box at Checkout and click Apply!`;
    }
    return { content: text, matchedProducts: products.slice(0, 3) };
  }

  // 5. RETURNS & REFUNDS INTENT
  const isReturnIntent =
    q.includes('return') ||
    q.includes('refund') ||
    q.includes('retour') ||
    q.includes('rembours') ||
    q.includes('gusubiza') ||
    q.includes('kurudisha') ||
    q.includes('rejesha') ||
    q.includes('exchange') ||
    q.includes('warranty');

  if (isReturnIntent) {
    let text = '';
    if (lang === 'fr') {
      text = `Notre politique de retour chez **Tunga** est simple et transparente :\n\n- **Délai de retour :** Vous disposez de **30 jours** à compter de la réception pour retourner un article.\n- **Conditions :** L'article doit être neuf, inutilisé, avec ses étiquettes et son emballage d'origine.\n- **Remboursement rapide :** Le montant est crédité sous 3 à 5 jours ouvrés sur votre moyen de paiement initial.\n- **Comment initier :** Rendez-vous dans votre espace client sous "Mes commandes" puis cliquez sur "Demander un retour".`;
    } else if (lang === 'rw') {
      text = `Dore amategeko yo gusubiza ibicuruzwa kuri **Tunga** :\n\n- **Igihe cyo gusubiza :** Ufite **iminsi 30** uhereye igihe wakiriye igicuruzwa cyawe.\n- **Ibisabwa :** Igicuruzwa kigomba kuba kikiri gishya, kitarakoreshejwe kandi gifite ibirango byacyo byose.\n- **Kwishyurwa :** Amafaranga yawe agarurwa mu minsi 3 kugeza kuri 5 y'akazi.\n- **Uko ubisaba :** Jya kuri konti yawe mu gice cya "My Orders" uhitemo "Request Return".`;
    } else if (lang === 'sw') {
      text = `Sera yetu ya kurudisha bidhaa kwenye **Tunga** ni rahisi sana :\n\n- **Muda wa kurudisha :** Una siku **30** kuanzia siku uliyopokea bidhaa.\n- **Masharti :** Bidhaa lazima iwe mpya, haijatumika, na ina vifungashio vyake asili.\n- **Kurejeshewa pesa :** Pesa zitarudishwa ndani ya siku 3 hadi 5 za kazi kwenye njia yako ya malipo.\n- **Jinsi ya kuanza :** Ingia kwenye akaunti yako, chagua "My Orders" kisha bofya "Request Return".`;
    } else {
      text = `Here is **Tunga's** hassle-free return and refund policy:\n\n- **30-Day Window:** Return any item within 30 days of delivery for a full refund or exchange.\n- **Condition:** Items must be unused, unwashed, with original tags and packaging intact.\n- **Speedy Refunds:** Processed within 3–5 business days back to your original payment method.\n- **How to Start:** Go to your account under **My Orders** and tap **Request Return** to get a prepaid return label.`;
    }
    return { content: text };
  }

  // 6. PAYMENT METHODS INTENT
  const isPaymentIntent =
    q.includes('pay') ||
    q.includes('paiement') ||
    q.includes('kwishyura') ||
    q.includes('kulipa') ||
    q.includes('momo') ||
    q.includes('airtel') ||
    q.includes('visa') ||
    q.includes('mastercard') ||
    q.includes('card') ||
    q.includes('money');

  if (isPaymentIntent) {
    let text = '';
    if (lang === 'fr') {
      text = `**Tunga** propose des méthodes de paiement sécurisées et locales :\n\n- **Mobile Money :** MTN Mobile Money (MoMo) & Airtel Money.\n- **Cartes bancaires :** Visa, Mastercard & American Express.\n- **Portefeuilles numériques :** PayPal & Apple Pay.\n- **Sécurité maximale :** Chiffrement SSL 256 bits et conformité PCI-DSS. Aucune donnée bancaire n'est conservée.`;
    } else if (lang === 'rw') {
      text = `Uburyo bwo kwishyura butekanye bwemewe kuri **Tunga** :\n\n- **Mobile Money :** MTN Mobile Money (MoMo) & Airtel Money.\n- **Amakarita ya Banki :** Visa & Mastercard.\n- **Ibindi :** PayPal.\n- **Umutekano :** Kwishyura byose bikorwa mu mutekano usesuye hakoreshejwe ikoranabuhanga rya SSL 256-bit.`;
    } else if (lang === 'sw') {
      text = `Njia salama za malipo zinazokubalika kwenye **Tunga** :\n\n- **Mobile Money :** MTN MoMo & Airtel Money.\n- **Kadi za Benki :** Visa na Mastercard.\n- **Nyinginezo :** PayPal.\n- **Usalama :** Malipo yote yanalindwa kwa mfumo salama wa 256-bit SSL encryption.`;
    } else {
      text = `**Tunga** supports convenient, secure, and fast payment options:\n\n- **Mobile Money:** MTN MoMo & Airtel Money (instant East Africa checkout).\n- **Credit / Debit Cards:** Visa, Mastercard, and American Express.\n- **Digital Wallets:** PayPal and international payment gateways.\n- **Security Guarantee:** 256-bit SSL bank-grade encryption with PCI-DSS compliance. We never store raw card numbers.`;
    }
    return { content: text };
  }

  // 7. CONTACT & CUSTOMER SUPPORT INTENT
  const isContactIntent =
    q.includes('contact') ||
    q.includes('support') ||
    q.includes('help') ||
    q.includes('phone') ||
    q.includes('email') ||
    q.includes('adresse') ||
    q.includes('service client') ||
    q.includes('ubufasha') ||
    q.includes('msaada') ||
    q.includes('hotline') ||
    q.includes('kigali');

  if (isContactIntent) {
    let text = '';
    if (lang === 'fr') {
      text = `Notre équipe d'assistance **Tunga** est à votre écoute 24h/24 et 7j/7 :\n\n- **Email de support :** support@tunga.com\n- **Téléphone / WhatsApp :** +250 788 123 456\n- **Siège social :** KG 7 Ave, Kigali Heights, Kigali, Rwanda\n- **Centre d'assistance :** Rendez-vous sur notre [Page d'assistance](/account/support) pour ouvrir un ticket.`;
    } else if (lang === 'rw') {
      text = `Abashinzwe kwakira abakiriya kuri **Tunga** bari hafi yawe amasaha 24 kuri 24 :\n\n- **Email :** support@tunga.com\n- **Telefone / WhatsApp :** +250 788 123 456\n- **Icyicaro gikuru :** KG 7 Ave, Kigali Heights, Kigali, Rwanda\n- **Gufungura itike :** Kanda kuri [Page y'ubufasha](/account/support) kugira ngo tugufashe byihuse.`;
    } else if (lang === 'sw') {
      text = `Wasaidizi wa **Tunga** wapo tayari kukuhudumia saa 24 kila siku :\n\n- **Barua pepe :** support@tunga.com\n- **Simu / WhatsApp :** +250 788 123 456\n- **Ofisi yetu :** KG 7 Ave, Kigali Heights, Kigali, Rwanda\n- **Tiketi ya msaada :** Tembelea [Ukurasa wa Msaada](/account/support) kuanzisha maombi.`;
    } else {
      text = `Our dedicated **Tunga Customer Support** team is here for you 24/7:\n\n- **Email:** support@tunga.com / hello@tunga.com\n- **24/7 Phone & WhatsApp:** +250 788 123 456\n- **Headquarters:** KG 7 Ave, Kigali Heights, Kigali, Rwanda\n- **Support Ticket:** Visit our [Support Center](/account/support) to submit an inquiry anytime!`;
    }
    return { content: text };
  }

  // 8. PRODUCTS, RECOMMENDATIONS & CATEGORY SEARCH
  const isAudioQuery = q.includes('audio') || q.includes('headphone') || q.includes('earbud') || q.includes('sound') || q.includes('ecouteur');
  const isWatchQuery = q.includes('watch') || q.includes('montre') || q.includes('chrono') || q.includes('wearable') || q.includes('isaha');
  const isHomeQuery = q.includes('light') || q.includes('home') || q.includes('lumina') || q.includes('smart') || q.includes('itara');
  const isChargerQuery = q.includes('charger') || q.includes('charge') || q.includes('battery') || q.includes('power') || q.includes('station');
  const isGeneralProductQuery =
    q.includes('product') ||
    q.includes('popular') ||
    q.includes('recommend') ||
    q.includes('best') ||
    q.includes('produit') ||
    q.includes('populaire') ||
    q.includes('bikunzwe') ||
    q.includes('maarufu') ||
    q.includes('item') ||
    q.includes('buy') ||
    q.includes('shop');

  if (isAudioQuery || isWatchQuery || isHomeQuery || isChargerQuery || isGeneralProductQuery) {
    if (isAudioQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.includes('Audio') || p.name.includes('Sound') || p.name.includes('Pods')));
    } else if (isWatchQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.includes('Wearables') || p.name.includes('Watch')));
    } else if (isHomeQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.includes('Smart Home') || p.name.includes('Light')));
    } else if (isChargerQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.includes('Accessories') || p.name.includes('Charge')));
    }

    if (matchedProducts.length === 0) {
      matchedProducts.push(...products.slice(0, 3));
    }

    let text = '';
    if (lang === 'fr') {
      text = `Voici les produits les plus recommandés et les mieux notés sur **Tunga** :\n\n- **Qualité premium certifiée :** Tous nos articles sont 100% originaux avec garantie fabricant.\n- **Garantie 30 jours :** Satisfait ou remboursé sous 30 jours.\n- **Livraison rapide :** Expédition prioritaire avec suivi en temps réel.\n\nCliquez sur un article ci-dessous pour voir la fiche détaillée ou l'ajouter à votre panier :`;
    } else if (lang === 'rw') {
      text = `Dore bimwe mu bicuruzwa byiza kandi bikunzwe cyane kuri **Tunga** :\n\n- **Ubwiza budashidikanywaho :** Ibicuruzwa byose ni umwimerere bifite garanti.\n- **Gusubizwa amafaranga :** Iminsi 30 yo gusubiza igicuruzwa niba utanyuzwe.\n- **Kugezwaho byihuse :** Icyo utumije kigugeraho mu gihe gito.\n\nKanda ku gicuruzwa wifuza kureba ibirambuye cyangwa kugishyira mu kagorofani (cart) :`;
    } else if (lang === 'sw') {
      text = `Hapa kuna bidhaa bora zaidi na maarufu zaidi kwenye **Tunga** kwa sasa :\n\n- **Ubora wa hali ya juu :** Bidhaa zote ni halisi 100% zikiwa na dhamana ya mtengenezaji.\n- **Dhamana ya siku 30 :** Rudishiwa pesa zako ndani ya siku 30 usiporidhika.\n- **Usafirishaji wa haraka :** Tunasafirisha kwa ufanisi na kukupa nambari ya ufuatiliaji.\n\nBofya bidhaa hapa chini kuangalia maelezo au kuweka kwenye gari lako :`;
    } else {
      text = `Here are our top-rated recommendations curated specially for you on **Tunga**:\n\n- **100% Genuine Quality:** Authentic certified devices with official brand warranty.\n- **30-Day Money Back:** Zero risk shopping with our 30-day return policy.\n- **Fast Dispatch:** Same-day or next-day warehouse dispatch with full insurance.\n\nTap any product card below to see full specs, customer reviews, or add to cart:`;
    }
    return { content: text, matchedProducts: matchedProducts.slice(0, 3) };
  }

  // 9. ACCOUNT, WISHLIST, HOW TO ORDER
  const isAccountOrGuide =
    q.includes('account') ||
    q.includes('compte') ||
    q.includes('konti') ||
    q.includes('akaunti') ||
    q.includes('password') ||
    q.includes('login') ||
    q.includes('signup') ||
    q.includes('register') ||
    q.includes('cart') ||
    q.includes('panier') ||
    q.includes('wishlist');

  if (isAccountOrGuide) {
    let text = '';
    if (lang === 'fr') {
      text = `Gérer vos achats et votre compte **Tunga** est très simple :\n\n- **Créer un compte :** Cliquez sur [Créer un compte](/register) pour suivre vos commandes et sauvegarder vos adresses.\n- **Mot de passe oublié :** Utilisez le lien de réinitialisation sur la page de connexion.\n- **Panier & Favoris :** Vos articles sélectionnés restent enregistrés sur tous vos appareils.`;
    } else if (lang === 'rw') {
      text = `Gucunga ibyo uhaha na konti yawe kuri **Tunga** biroroshye cyane :\n\n- **Gufungura konti :** Kanda kuri [Gufungura konti](/register) kugira ngo ukurikirane ibyo watumije.\n- **Kwibagirwa ijambobanga :** Koresha inzira yo kongera gushyiraho irindi kuri page yo kwinjira.\n- **Agaseke n'Ibyo ukunda :** Ibicuruzwa wishimiye bibikwa neza kuri telefone na mudasobwa yawe.`;
    } else if (lang === 'sw') {
      text = `Kusimamia ununuzi na akaunti yako ya **Tunga** ni rahisi mno :\n\n- **Fungua akaunti :** Bofya [Fungua akaunti](/register) kufuatilia maagizo yako na kuhifadhi anwani zako.\n- **Umesahau neno la siri :** Tumia kiungo cha kubadilisha neno la siri kwenye ukurasa wa kuingia.\n- **Gari na Vipendwa :** Bidhaa ulizochagua zinahifadhiwa kwa usalama kwenye vifaa vyako vyote.`;
    } else {
      text = `Managing your **Tunga** shopping experience is effortless:\n\n- **Create an Account:** Visit [Create Account](/register) to save shipping addresses and access one-click checkout.\n- **Reset Password:** Tap "Forgot Password" on the sign-in screen to receive a secure reset link.\n- **Wishlist & Cart:** Save your favorite items across devices anytime by clicking the heart icon.`;
    }
    return { content: text };
  }

  // 10. GREETING / CASUAL CHAT / IDENTITY
  const isGreeting =
    q.includes('hi') ||
    q.includes('hello') ||
    q.includes('hey') ||
    q.includes('bonjour') ||
    q.includes('salut') ||
    q.includes('muraho') ||
    q.includes('mwiriwe') ||
    q.includes('habari') ||
    q.includes('hujambo') ||
    q.includes('who are you') ||
    q.includes('tunga ai') ||
    q.includes('qui es-tu') ||
    q.includes('uri nde') ||
    q.includes('wewe ni nani');

  if (isGreeting) {
    let text = '';
    if (lang === 'fr') {
      text = `Bonjour **${customerName}** ! Je suis **Tunga AI**, votre assistant d'achat personnel pour **Tunga**.\n\nJe peux vous aider à tout moment pour :\n- **Suivre vos commandes** et connaître les dates de livraison.\n- **Découvrir les meilleures offres**, codes promos et produits populaires.\n- **Répondre à toutes vos questions** sur la livraison, les retours et les paiements.\n\nQue puis-je faire pour vous aujourd'hui ?`;
    } else if (lang === 'rw') {
      text = `Muraho **${customerName}** ! Ndi **Tunga AI**, umufasha wawe w'ikoranabuhanga muri **Tunga**.\n\nNiteguye kugufasha muri ibi bikurikira :\n- **Gukurikirana aho komande yawe igeze** n'igihe izagereraho.\n- **Kukwereka ibicuruzwa bikunzwe**, amapromosiyo na kodi zigabanya ibiciro.\n- **Gusubiza ibibazo byose** byerekeye kugeza ibintu ku bakiriya, kwishyura no gusubiza ibyo waguze.\n\nNdagufasha iki uyu munsi ?`;
    } else if (lang === 'sw') {
      text = `Habari **${customerName}** ! Mimi ni **Tunga AI**, msaidizi wako mkuu wa ununuzi kwenye **Tunga**.\n\nNinaweza kukusaidia mara moja kwa :\n- **Kufuatilia maagizo yako** na tarehe za kuwasili.\n- **Kupata bidhaa maarufu**, ofa na punguzo kabambe.\n- **Kujibu maswali yote** kuhusu usafirishaji, kurudisha bidhaa na njia za malipo.\n\nNawezaje kukusaidia leo ?`;
    } else {
      text = `Hello **${customerName}**! 👋 I am **Tunga AI**, your personal AI concierge for **Tunga**.\n\nI am ready to help you with:\n- **Tracking Orders:** Live delivery updates, order numbers, and receipts.\n- **Product Discovery:** Recommendations, specs, and top deals on headphones, smartwatches, and smart devices.\n- **Store Information:** Shipping rates, 30-day return policy, mobile money payments, and discount codes.\n\nHow can I help you today?`;
    }
    return { content: text, matchedProducts: products.slice(0, 2) };
  }

  // 11. COMPREHENSIVE FALLBACK FOR ANY OTHER QUESTIONS (NEVER GIVES A BLANK OR VAGUE ANSWER)
  let text = '';
  if (lang === 'fr') {
    text = `Merci pour votre question ! Voici les informations clés de **Tunga** pour vous orienter :\n\n- **Recherche de produits :** Parcourez notre vaste catalogue de produits électroniques et accessoires certifiés.\n- **Livraison rapide :** Gratuite à partir de $50 USD d'achats avec suivi en direct.\n- **Garantie 30 jours :** Retours sans tracas et remboursement sous 3 à 5 jours.\n- **Paiements locaux :** MTN MoMo, Airtel Money, Visa et Mastercard acceptés.\n- **Assistance 24/7 :** Contactez nos conseillers à support@tunga.com ou par téléphone au +250 788 123 456.\n\nN'hésitez pas à me donner plus de précisions sur ce que vous recherchez !`;
  } else if (lang === 'rw') {
    text = `Urakoze ku kibazo cyawe ! Dore amakuru y'ingirakamaro kuri **Tunga** yakugoboka :\n\n- **Gushaka ibicuruzwa :** Reba ibikoresho by'ikoranabuhanga n'ibindi byiza byizewe.\n- **Kugezwaho byihuse :** Ku buntu kuri komande irengeje $50 USD.\n- **Garanti y'iminsi 30 :** Ufite uburenganzira bwo gusubiza igicuruzwa niba kidahuje n'ibyo wifuzaga.\n- **Kwishyura byoroshye :** MTN MoMo, Airtel Money, Visa na Mastercard.\n- **Ubufasha bw'abakiriya :** Twandikire kuri support@tunga.com cyangwa uhamagare +250 788 123 456.\n\nNyandikira neza icyo wifuza ngufashe aka kanya !`;
  } else if (lang === 'sw') {
    text = `Asante kwa swali lako ! Hapa kuna taarifa muhimu za **Tunga** kukusaidia :\n\n- **Kutafuta bidhaa :** Vinjari orodha yetu ya bidhaa halisi za kielektroniki na vifaa vya kisasa.\n- **Usafirishaji wa haraka :** Bure kwa maagizo yote zaidi ya $50 USD.\n- **Dhamana ya siku 30 :** Rudisha bidhaa kwa urahisi na urejeshewe pesa zako.\n- **Malipo ya haraka :** MTN MoMo, Airtel Money, Visa na Mastercard.\n- **Msaada saa 24 :** Wasiliana nasi kupitia support@tunga.com au piga +250 788 123 456.\n\nNiambie maelezo zaidi ya kile unachohitaji nikusaidie !`;
  } else {
    text = `Thanks for asking! Here is helpful store guidance from **Tunga** to assist you:\n\n- **Explore Products:** Browse our verified electronics, audio gear, smartwatches, and accessories.\n- **Fast Shipping:** Free standard shipping on orders over $50 USD with live tracking.\n- **30-Day Hassle-Free Returns:** Shop with peace of mind with our 30-day money-back guarantee.\n- **Multiple Payment Options:** MTN MoMo, Airtel Money, Visa, Mastercard, and PayPal.\n- **Need Special Help?** Our 24/7 team is reachable at support@tunga.com or +250 788 123 456.\n\nFeel free to ask any specific question about products, your orders, or our services!`;
  }

  return {
    content: text,
    matchedProducts: products.slice(0, 2),
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

  // Check if message asks for a specific order number (e.g., ORD-2026-XXXX)
  const orderNumberMatch = message.match(/ORD-[\w\d-]+/i);
  let specificOrder: OrderSummary | null = null;
  if (orderNumberMatch) {
    specificOrder = await findOrderByNumber(orderNumberMatch[0]);
  }

  // Set up a quick AbortController with a 2200ms timeout
  // If external network is slow, it immediately falls back to our lightning-fast knowledge engine
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);

  try {
    const productsContext = popularProducts
      .map(
        (p) =>
          `- ${p.name} ($${p.sale_price ?? p.base_price} ${p.currency}, Category: ${p.category}): ${p.short_description || ''}`
      )
      .join('\n');

    const ordersContext = userOrders.length > 0
      ? userOrders
          .map(
            (o) =>
              `- Order #${o.order_number}: Status "${o.status}", Total: $${o.total} ${o.currency}, Placed ${new Date(o.created_at).toLocaleDateString()}, Items: ${o.items_summary?.join(', ') || 'Items'}`
          )
          .join('\n')
      : 'No past orders.';

    const systemDirective = `You are "Tunga AI", the smart personal shopping assistant for "Tunga" (https://tunga.store).
Language: Respond fluently in language code "${lang}".
Customer: ${userId ? `Logged in as ${userName || 'Customer'}` : 'Guest'}
Orders:\n${ordersContext}${specificOrder ? `\nFound order: #${specificOrder.order_number} (${specificOrder.status})` : ''}
Products:\n${productsContext}
Policies: Free shipping over $50. Standard shipping $5 (3-5 days). Express $12 (1-2 days). 30-day returns. MoMo, Airtel, Cards, PayPal. Coupons: WELCOME10 (10% off), SAVE20 (20% off >$150).
Tone: Helpful, polite, structured with markdown bullet points.`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `[SYSTEM DIRECTIVE]\n${systemDirective}\n\n[USER PROMPT]: ${message}` }],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText && replyText.trim().length > 0) {
        // Collect companion product/order cards
        const matchedProducts: ProductSummary[] = [];
        const lower = (message + ' ' + replyText).toLowerCase();
        for (const p of popularProducts) {
          if (lower.includes(p.name.toLowerCase()) || (lower.includes('popular') && matchedProducts.length < 3)) {
            if (!matchedProducts.find((i) => i.id === p.id)) matchedProducts.push(p);
          }
        }
        const matchedOrders: OrderSummary[] = specificOrder
          ? [specificOrder]
          : (lower.includes('order') || lower.includes('commande') || lower.includes('track')) && userOrders.length > 0
          ? userOrders.slice(0, 3)
          : [];

        return {
          content: replyText,
          matchedProducts: matchedProducts.slice(0, 3),
          matchedOrders,
        };
      }
    }
  } catch {
    // Expected fallback when external Gemini network has high latency or is unreachable
  } finally {
    clearTimeout(timeoutId);
  }

  // Instant, intelligent, reliable response from our high-speed engine
  return generateIntelligentTungaResponse(
    message,
    popularProducts,
    userOrders,
    userId,
    userName,
    lang,
    specificOrder
  );
}
