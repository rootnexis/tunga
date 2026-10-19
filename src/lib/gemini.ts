import { supabase } from '@/lib/supabase';
import type { ProductSummary, OrderSummary, ChatMessage } from '@/types/chat';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';

// Exact curated products currently available in the Ituze store catalog
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
 * Checks whether user message explicitly inquires about products or items to buy.
 */
function isExplicitProductInquiry(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes('show product') ||
    q.includes('recommend') ||
    q.includes('show me') ||
    q.includes('what do you sell') ||
    q.includes('products you have') ||
    q.includes('catalog') ||
    q.includes('looking for') ||
    q.includes('want to buy') ||
    q.includes('headphone') ||
    q.includes('earbud') ||
    q.includes('watch') ||
    q.includes('chrono') ||
    q.includes('light bar') ||
    q.includes('power bank') ||
    q.includes('charger') ||
    q.includes('speaker') ||
    q.includes('ibicuruzwa') ||
    q.includes('reba ibicuruzwa') ||
    q.includes('bidhaa')
  );
}

/**
 * Intelligent high-speed knowledge engine covering ALL e-commerce questions for Ituze.
 * Direct answers to questions asked, without unsolicited product attachments.
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
  const q = query.toLowerCase();
  const matchedOrders: OrderSummary[] = [];

  const customerName = userName || (lang === 'fr' ? 'Cher client' : lang === 'rw' ? 'Mukunzi' : lang === 'sw' ? 'Mteja' : 'Valued Customer');

  // 1. SPECIFIC ORDER QUERY OR GENERAL ORDER TRACKING
  if (specificOrder) {
    matchedOrders.push(specificOrder);
    let text = '';
    if (lang === 'fr') {
      text = `J'ai retrouvé votre commande **#${specificOrder.order_number}** !\n\n- **Statut actuel :** ${specificOrder.status.toUpperCase()}\n- **Montant total :** $${specificOrder.total} ${specificOrder.currency}\n- **Articles :** ${specificOrder.items_summary?.join(', ') || 'Articles Ituze'}\n- **Date :** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nVous pouvez cliquer sur la carte ci-dessous pour suivre votre colis en temps réel.`;
    } else if (lang === 'rw') {
      text = `Nabonye komande yawe **#${specificOrder.order_number}** !\n\n- **Imiterere :** ${specificOrder.status.toUpperCase()}\n- **Amafaranga yose :** $${specificOrder.total} ${specificOrder.currency}\n- **Ibicuruzwa :** ${specificOrder.items_summary?.join(', ') || 'Ibicuruzwa bya Ituze'}\n- **Itariki :** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nKanda ku ikarita iri munsi kugira ngo ukurikirane komande yawe.`;
    } else if (lang === 'sw') {
      text = `Nimepata agizo lako **#${specificOrder.order_number}** !\n\n- **Hali ya sasa :** ${specificOrder.status.toUpperCase()}\n- **Jumla ya gharama :** $${specificOrder.total} ${specificOrder.currency}\n- **Vitu :** ${specificOrder.items_summary?.join(', ') || 'Bidhaa za Ituze'}\n- **Tarehe :** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nBofya kadi hapa chini kufuatilia kifurushi chako.`;
    } else {
      text = `Found your order **#${specificOrder.order_number}**!\n\n- **Current Status:** ${specificOrder.status.toUpperCase()}\n- **Order Total:** $${specificOrder.total} ${specificOrder.currency}\n- **Items:** ${specificOrder.items_summary?.join(', ') || 'Ituze items'}\n- **Placed On:** ${new Date(specificOrder.created_at).toLocaleDateString()}\n\nTap the order card below to view live tracking details or download invoice.`;
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
        text = `Bonjour **${customerName}**, voici le récapitulatif de vos commandes récentes sur Ituze :\n\n- **Suivi en direct :** Cliquez sur une commande pour afficher les détails d'expédition.\n- **Délais de livraison :** Les colis standard arrivent sous 3 à 5 jours ouvrés.\n- **Besoin d'aide ?** Vous pouvez également m'indiquer votre numéro de commande (ex: ORD-2026-XXXX).`;
      } else if (lang === 'rw') {
        text = `Muraho **${customerName}**, dore ibyo uherutse gutumiza kuri Ituze :\n\n- **Gukurikirana :** Kanda kuri komande wifuza kureba uko ihagaze.\n- **Igihe cyo kugezwaho :** Bitwara iminsi 3 kugeza kuri 5 y'akazi.\n- **Ubufasha :** Ushobora no kunyandikira numero ya komande yawe (urugero: ORD-2026-XXXX).`;
      } else if (lang === 'sw') {
        text = `Habari **${customerName}**, hapa kuna maagizo yako ya hivi karibuni kwenye Ituze :\n\n- **Ufuatiliaji :** Bofya agizo kuangalia maelezo ya usafirishaji.\n- **Muda wa kuwasili :** Siku 3 hadi 5 za kazi kwa usafirishaji wa kawaida.\n- **Msaada :** Unaweza pia kunitumia nambari ya agizo lako (mfano: ORD-2026-XXXX).`;
      } else {
        text = `Hello **${customerName}**, here are your recent orders placed on Ituze:\n\n- **Live Tracking:** Tap any order card below to see detailed delivery progress.\n- **Delivery Timing:** Standard shipments arrive within 3–5 business days.\n- **Direct Lookup:** You can also type any specific order number (e.g., ORD-2026-XXXX).`;
      }
      return { content: text, matchedOrders };
    } else if (userId) {
      let text = '';
      if (lang === 'fr') {
        text = `Vous n'avez pas encore passé de commande sur Ituze. Vos achats apparaîtront automatiquement ici dès votre première commande.`;
      } else if (lang === 'rw') {
        text = `Nta komande urakora kuri Ituze. Ibyo uzagura byose bizahita bigaragara hano.`;
      } else if (lang === 'sw') {
        text = `Bado haujaweka agizo lolote kwenye Ituze. Maagizo yako yataonekana hapa pindi unapofanya ununuzi.`;
      } else {
        text = `You don't have any active orders right now. Once you place an order, live tracking and receipts will appear right here.`;
      }
      return { content: text };
    } else {
      let text = '';
      if (lang === 'fr') {
        text = `Pour consulter vos commandes, veuillez vous [connecter à votre compte](/auth/login) ou me fournir directement votre référence de commande (ex: **ORD-2026-XXXX**).\n\n- **Connexion rapide :** Vos commandes sont enregistrées dans votre espace client.\n- **Recherche immédiate :** Entrez votre référence pour un statut instantané.`;
      } else if (lang === 'rw') {
        text = `Kugira ngo urebe ibyo watumije, nyamuneka [injira kuri konti yawe](/auth/login) cyangwa unyandikire numero ya komande yawe (urugero: **ORD-2026-XXXX**).\n\n- **Kwinjira :** Komande zawe zose zibitse muri konti yawe.\n- **Gushakisha :** Andika numero ya komande ngufashe aka kanya.`;
      } else if (lang === 'sw') {
        text = `Kuangalia maagizo yako, tafadhali [ingia kwenye akaunti yako](/auth/login) au weka nambari ya agizo lako hapa (mfano: **ORD-2026-XXXX**).\n\n- **Ingia :** Maagizo yote yamehifadhiwa kwenye akaunti yako.\n- **Tafuta :** Weka nambari ya agizo upate maelezo ya haraka.`;
      } else {
        text = `To view your orders, please [sign in to your account](/auth/login) or type your Order Number (e.g. **ORD-2026-XXXX**).\n\n- **Account Orders:** Sign in to see past history, receipts, and order statuses.\n- **Guest Lookup:** Type your order number anytime for instant tracking!`;
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
      text = `Voici la politique de livraison officielle de **Ituze** :\n\n- **Livraison Gratuite :** Offerte pour toute commande supérieure à **$50 USD**.\n- **Livraison Standard :** 3 à 5 jours ouvrés ($4.99 USD).\n- **Livraison Express :** 1 à 2 jours ouvrés ($12.99 USD).\n- **Suivi des colis :** Numéro de suivi fourni dès l'expédition avec notifications SMS/Email.\n- **Couverture :** Expédition rapide et sécurisée.`;
    } else if (lang === 'rw') {
      text = `Dore amabwiriza yo kugeza ibicuruzwa ku bakiriya kuri **Ituze** :\n\n- **Kugezwaho ku buntu :** Kuri buri komande irengeje **$50 USD**.\n- **Uburyo busanzwe (Standard) :** Iminsi 3 kugeza kuri 5 y'akazi ($4.99 USD).\n- **Uburyo bwihuse (Express) :** Umunsi 1 kugeza kuri 2 y'akazi ($12.99 USD).\n- **Gukurikirana :** Uhita uhabwa uburyo bwo gukurikirana ipaki yawe ako kanya.`;
    } else if (lang === 'sw') {
      text = `Hapa kuna sera rasmi ya usafirishaji ya **Ituze** :\n\n- **Usafirishaji wa Bure :** Kwa maagizo yote zaidi ya **$50 USD**.\n- **Usafirishaji wa Kawaida :** Siku 3 hadi 5 za kazi ($4.99 USD).\n- **Usafirishaji wa Haraka (Express) :** Siku 1 hadi 2 za kazi ($12.99 USD).\n- **Ufuatiliaji :** Utapokea nambari ya kufuatilia kifurushi mara tu kinapotumwa.`;
    } else {
      text = `Here is everything you need to know about shipping with **Ituze**:\n\n- **Free Shipping:** Automatic free delivery on orders over **$50 USD**!\n- **Standard Delivery:** 3–5 business days ($4.99 USD).\n- **Express Priority:** 1–2 business days ($12.99 USD).\n- **Package Tracking:** Real-time tracking link and notifications sent via SMS and email.`;
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
      text = `Voici les codes promo actifs valables sur **Ituze** :\n\n- **Code WELCOME10 :** 10% de réduction immédiate sur votre commande.\n- **Code SAVE20 :** Réduction de 20% pour les paniers supérieurs à $150 USD.\n- **Application :** Entrez le code dans le champ "Code promo" lors de la finalisation de votre commande.`;
    } else if (lang === 'rw') {
      text = `Dore amakode y'ingirakamaro agabanya ibiciro kuri **Ituze** :\n\n- **Kodi WELCOME10 :** Igabanuka rya 10% kuri komande yawe.\n- **Kodi SAVE20 :** Igabanuka rya 20% kuri komande irengeje $150 USD.\n- **Uko ikoreshwa :** Wandika iyo kodi mu mwanya wagenewe "Discount Code" wishyura.`;
    } else if (lang === 'sw') {
      text = `Pata ofa na punguzo kabambe kutoka **Ituze** :\n\n- **Kodi WELCOME10 :** Punguzo la 10% kwenye agizo lako.\n- **Kodi SAVE20 :** Punguzo la 20% kwa maagizo zaidi ya $150 USD.\n- **Jinsi ya kutumia :** Weka kodi hiyo kwenye sehemu ya "Discount Code" wakati wa kulipa.`;
    } else {
      text = `Here are active discount codes you can apply on **Ituze**:\n\n- **Code WELCOME10:** 10% OFF your order storewide.\n- **Code SAVE20:** 20% OFF when your cart total exceeds $150 USD.\n- **How to apply:** Enter your code in the "Discount Code" field at Checkout and tap Apply!`;
    }
    return { content: text };
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
      text = `Notre politique de retour chez **Ituze** est simple et transparente :\n\n- **Délai :** Vous disposez de **30 jours** à compter de la réception pour retourner un article.\n- **Condition :** L'article doit être dans son état et emballage d'origine avec ses étiquettes.\n- **Remboursement rapide :** Crédité sous 3 à 5 jours ouvrés sur votre moyen de paiement initial.\n- **Démarche :** Rendez-vous dans votre compte client sous "Mes commandes" pour demander un retour.`;
    } else if (lang === 'rw') {
      text = `Dore amategeko yo gusubiza ibicuruzwa kuri **Ituze** :\n\n- **Igihe cyo gusubiza :** Ufite **iminsi 30** uhereye igihe wakiriye igicuruzwa cyawe.\n- **Ibisabwa :** Igicuruzwa kigomba kuba kikiri gishya mu bipfunyika byacyo by'umwimerere.\n- **Kwishyurwa :** Amafaranga agarurwa mu minsi 3 kugeza kuri 5 y'akazi.\n- **Uko ubisaba :** Jya muri konti yawe mu gice cya "My Orders" uhitemo "Request Return".`;
    } else if (lang === 'sw') {
      text = `Sera yetu ya kurudisha bidhaa kwenye **Ituze** ni rahisi sana :\n\n- **Muda :** Una siku **30** kuanzia siku uliyopokea bidhaa.\n- **Masharti :** Bidhaa lazima iwe mpya na katika vifungashio vyake asili.\n- **Kurejeshewa pesa :** Ndani ya siku 3 hadi 5 za kazi kwenye njia yako ya malipo.\n- **Jinsi ya kuanza :** Ingia kwenye akaunti yako, chagua "My Orders" kisha bofya "Request Return".`;
    } else {
      text = `Here is **Ituze's** 30-day hassle-free return and refund policy:\n\n- **30-Day Window:** Return any item within 30 days of delivery for a full refund or exchange.\n- **Condition:** Items must be in original packaging and undamaged.\n- **Fast Refund:** Processed within 3–5 business days to your original payment method.\n- **How to Start:** Go to your account under **My Orders** and tap **Request Return**.`;
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
      text = `**Ituze** propose des méthodes de paiement sécurisées et fiables :\n\n- **Mobile Money :** MTN Mobile Money (MoMo) & Airtel Money.\n- **Cartes bancaires :** Visa, Mastercard & American Express.\n- **Portefeuilles numériques :** PayPal.\n- **Sécurité :** Chiffrement SSL 256 bits conforme aux normes bancaires les plus strictes.`;
    } else if (lang === 'rw') {
      text = `Uburyo bwo kwishyura butekanye bwemewe kuri **Ituze** :\n\n- **Mobile Money :** MTN Mobile Money (MoMo) & Airtel Money.\n- **Amakarita ya Banki :** Visa na Mastercard.\n- **PayPal :** Yemerwa ku isi yose.\n- **Umutekano :** Kwishyura byose bikorwa mu mutekano usesuye hakoreshejwe ikoranabuhanga rya SSL 256-bit.`;
    } else if (lang === 'sw') {
      text = `Njia salama za malipo zinazokubalika kwenye **Ituze** :\n\n- **Mobile Money :** MTN MoMo na Airtel Money.\n- **Kadi za Benki :** Visa na Mastercard.\n- **PayPal :** Malipo ya kimataifa.\n- **Usalama :** Malipo yote yanalindwa kwa mfumo thabiti wa 256-bit SSL.`;
    } else {
      text = `**Ituze** supports flexible and secure payment options:\n\n- **Mobile Money:** MTN MoMo & Airtel Money (instant East Africa checkout).\n- **Credit / Debit Cards:** Visa, Mastercard, and American Express.\n- **Digital Wallets:** PayPal checkout.\n- **Bank-Grade Security:** 256-bit SSL encryption. We never store raw card credentials.`;
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
    q.includes('hotline');

  if (isContactIntent) {
    let text = '';
    if (lang === 'fr') {
      text = `Notre équipe d'assistance **Ituze** est à votre écoute 24h/24 et 7j/7 :\n\n- **Email de support :** hello@ituze.com\n- **Téléphone / WhatsApp :** +250 788 123 456\n- **Siège :** Kigali Heights, Boulevard de la Paix, Kigali, Rwanda\n- **Assistance en ligne :** Consultez notre [Page de contact](/contact) pour envoyer un message direct.`;
    } else if (lang === 'rw') {
      text = `Abashinzwe kwakira abakiriya kuri **Ituze** bari hafi yawe igihe cyose :\n\n- **Email :** hello@ituze.com\n- **Telefone / WhatsApp :** +250 788 123 456\n- **Icyicaro :** Kigali Heights, Boulevard de la Paix, Kigali, Rwanda\n- **Ubufasha :** Sura [Page yo kutwandikira](/contact) kugira ngo tukugoboke aka kanya.`;
    } else if (lang === 'sw') {
      text = `Wasaidizi wa **Ituze** wapo tayari kukuhudumia saa 24 kila siku :\n\n- **Barua pepe :** hello@ituze.com\n- **Simu / WhatsApp :** +250 788 123 456\n- **Ofisi :** Kigali Heights, Boulevard de la Paix, Kigali, Rwanda\n- **Msaada mtandaoni :** Tembelea [Ukurasa wa Mawasiliano](/contact) kutuma ujumbe wako.`;
    } else {
      text = `Our dedicated **Ituze Support** team is here for you 24/7:\n\n- **Email:** hello@ituze.com\n- **Phone & WhatsApp:** +250 788 123 456\n- **Office:** Kigali Heights, Boulevard de la Paix, Kigali, Rwanda\n- **Online Inquiry:** Visit our [Contact Page](/contact) to reach out directly.`;
    }
    return { content: text };
  }

  // 8. SPECIFIC PRODUCT DISCOVERY INTENT (Only triggered when the customer explicitly asks for products)
  if (isExplicitProductInquiry(q)) {
    const matchedProducts: ProductSummary[] = [];

    const isAudioQuery = q.includes('audio') || q.includes('headphone') || q.includes('earbud') || q.includes('sound') || q.includes('ecouteur');
    const isWatchQuery = q.includes('watch') || q.includes('montre') || q.includes('chrono') || q.includes('wearable') || q.includes('isaha');
    const isLightQuery = q.includes('light') || q.includes('lumina') || q.includes('lamp') || q.includes('itara');
    const isPowerQuery = q.includes('power bank') || q.includes('charger') || q.includes('charge') || q.includes('battery') || q.includes('station');

    if (isAudioQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.toLowerCase().includes('audio') || p.name.toLowerCase().includes('headphones') || p.name.toLowerCase().includes('pods')));
    } else if (isWatchQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.toLowerCase().includes('wearable') || p.name.toLowerCase().includes('watch')));
    } else if (isLightQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.toLowerCase().includes('smart home') || p.name.toLowerCase().includes('light')));
    } else if (isPowerQuery) {
      matchedProducts.push(...products.filter((p) => p.category?.toLowerCase().includes('accessories') || p.name.toLowerCase().includes('power') || p.name.toLowerCase().includes('charge')));
    } else {
      matchedProducts.push(...products.slice(0, 3));
    }

    const finalProducts = matchedProducts.slice(0, 3);

    let text = '';
    if (lang === 'fr') {
      text = `Voici les produits correspondants disponibles actuellement dans notre catalogue **Ituze** :\n\n- **100% Originaux :** Tous nos appareils sont certifiés avec garantie.\n- **Livraison rapide :** Expédition prioritaire avec suivi.\n\nCliquez sur un article ci-dessous pour voir les détails ou l'ajouter à votre panier :`;
    } else if (lang === 'rw') {
      text = `Dore ibicuruzwa bihari bifitanye isano n'ibyo usabye muri **Ituze** :\n\n- **Umwimerere :** Ibicuruzwa byose ni umwimerere 100% bifite garanti.\n- **Kugezwaho byihuse :** Icyo uhisemo kikugeraho mu mutekano usesuye.\n\nKanda ku gicuruzwa kiri munsi kureba ibirambuye :`;
    } else if (lang === 'sw') {
      text = `Hapa kuna bidhaa zilizopo kwenye duka la **Ituze** zinazolingana na ombi lako :\n\n- **Ubora Halisi :** Bidhaa zote ni halisi 100% zikiwa na dhamana rasmi.\n- **Usafirishaji wa Haraka :** Uwasilishaji salama na ufuatiliaji wa moja kwa moja.\n\nBofya bidhaa hapa chini kuangalia maelezo zaidi :`;
    } else {
      text = `Here are the matching in-stock products from our **Ituze** catalog:\n\n- **100% Genuine:** Certified devices with manufacturer warranty.\n- **Fast Dispatch:** Same-day warehouse dispatch with full insurance.\n\nTap any product card below to view specs or add to cart:`;
    }
    return { content: text, matchedProducts: finalProducts };
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
      text = `Gérer vos achats et votre compte **Ituze** est très simple :\n\n- **Créer un compte :** Cliquez sur [Créer un compte](/auth/register) pour suivre vos commandes et sauvegarder vos adresses.\n- **Mot de passe oublié :** Utilisez le lien de réinitialisation sur la page de connexion.\n- **Panier & Favoris :** Vos articles sélectionnés restent enregistrés sur tous vos appareils.`;
    } else if (lang === 'rw') {
      text = `Gucunga ibyo uhaha na konti yawe kuri **Ituze** biroroshye cyane :\n\n- **Gufungura konti :** Kanda kuri [Gufungura konti](/auth/register) kugira ngo ukurikirane ibyo watumije.\n- **Kwibagirwa ijambobanga :** Koresha inzira yo kongera gushyiraho irindi kuri page yo kwinjira.\n- **Agaseke n'Ibyo ukunda :** Ibicuruzwa wishimiye bibikwa neza kuri telefone na mudasobwa yawe.`;
    } else if (lang === 'sw') {
      text = `Kusimamia ununuzi na akaunti yako ya **Ituze** ni rahisi mno :\n\n- **Fungua akaunti :** Bofya [Fungua akaunti](/auth/register) kufuatilia maagizo yako na kuhifadhi anwani zako.\n- **Umesahau neno la siri :** Tumia kiungo cha kubadilisha neno la siri kwenye ukurasa wa kuingia.\n- **Gari na Vipendwa :** Bidhaa ulizochagua zinahifadhiwa kwa usalama kwenye vifaa vyako vyote.`;
    } else {
      text = `Managing your **Ituze** shopping experience is effortless:\n\n- **Create an Account:** Visit [Create Account](/auth/register) to save shipping addresses and access one-click checkout.\n- **Reset Password:** Tap "Forgot Password" on the sign-in screen to receive a secure reset link.\n- **Wishlist & Cart:** Save your favorite items across devices anytime by clicking the heart icon.`;
    }
    return { content: text };
  }

  // 10. GREETING / CASUAL CHAT / IDENTITY (Answers directly WITHOUT showing product cards)
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
    q.includes('ituze ai') ||
    q.includes('qui es-tu') ||
    q.includes('uri nde') ||
    q.includes('wewe ni nani');

  if (isGreeting) {
    let text = '';
    if (lang === 'fr') {
      text = `Bonjour **${customerName}** ! Je suis **Ituze AI**, l'assistant virtuel officiel de **Ituze**.\n\nJe suis à votre entière disposition pour répondre à toutes vos questions :\n- **Suivre une commande** ou vérifier un numéro de colis.\n- **Informations de livraison**, retours sous 30 jours et modes de paiement.\n- **Découvrir des produits** ou des codes promo actifs.\n\nQue puis-je faire pour vous aujourd'hui ?`;
    } else if (lang === 'rw') {
      text = `Muraho **${customerName}** ! Ndi **Ituze AI**, umufasha wawe w'ikoranabuhanga muri **Ituze**.\n\nNiteguye kugufasha mu bibazo byose waba ufite :\n- **Gukurikirana aho komande yawe igeze** n'igihe izagereraho.\n- **Amakuru yo kugezwaho ibicuruzwa**, gusubiza ibyo waguze no kwishyura.\n- **Gusubiza ibibazo byose** byerekeye amaduka n'amapromosiyo.\n\nNdagufasha iki uyu munsi ?`;
    } else if (lang === 'sw') {
      text = `Habari **${customerName}** ! Mimi ni **Ituze AI**, msaidizi rasmi wa **Ituze**.\n\nNinaweza kukusaidia kujibu maswali yako yote mara moja :\n- **Kufuatilia agizo lako** na kuangalia hali ya usafirishaji.\n- **Taarifa za usafirishaji**, kurudisha bidhaa ndani ya siku 30, na njia za malipo.\n- **Kupata majibu** kuhusu punguzo na huduma zetu.\n\nNawezaje kukusaidia leo ?`;
    } else {
      text = `Hello **${customerName}**! 👋 I am **Ituze AI**, the official virtual assistant for **Ituze**.\n\nI am here to answer any questions you have:\n- **Track your orders** and check live delivery statuses.\n- **Shipping policies**, 30-day returns, and payment options.\n- **Store guidance**, coupons, or account assistance.\n\nHow can I help you today?`;
    }
    return { content: text };
  }

  // 11. GENERAL PROFESSIONAL FALLBACK (Answers question directly without unsolicited product cards)
  let text = '';
  if (lang === 'fr') {
    text = `Merci pour votre question ! Voici les informations clés de **Ituze** pour vous assister :\n\n- **Catalogue :** Électronique haut de gamme, accessoires et objets connectés 100% authentiques.\n- **Livraison gratuite :** Dès $50 USD d'achats avec expédition suivie.\n- **Garantie 30 jours :** Retours simples et remboursement garanti.\n- **Paiements sécurisés :** MTN MoMo, Airtel Money, Visa, Mastercard et PayPal.\n- **Assistance 24/7 :** Contactez-nous à hello@ituze.com ou au +250 788 123 456.\n\nN'hésitez pas à me donner plus de détails sur votre demande !`;
  } else if (lang === 'rw') {
    text = `Urakoze ku kibazo cyawe ! Dore amakuru y'ingirakamaro kuri **Ituze** yakugoboka :\n\n- **Ibicuruzwa :** Iby'ikoranabuhanga n'ibikoresho byizewe by'umwimerere 100%.\n- **Kugezwaho ku buntu :** Kuri buri komande irengeje $50 USD.\n- **Garanti y'iminsi 30 :** Gusubizwa amafaranga niba utanyuzwe.\n- **Kwishyura byoroshye :** MTN MoMo, Airtel Money, Visa, Mastercard na PayPal.\n- **Ubufasha :** Twandikire kuri hello@ituze.com cyangwa uhamagare +250 788 123 456.\n\nBaza ikindi kibazo cyose waba ufite ngufashe !`;
  } else if (lang === 'sw') {
    text = `Asante kwa swali lako ! Hapa kuna taarifa muhimu za **Ituze** kukusaidia :\n\n- **Bidhaa zetu :** Vifaa vya kielektroniki vya kiwango cha juu vilivyo halisi 100%.\n- **Usafirishaji wa bure :** Kwa maagizo yote zaidi ya $50 USD.\n- **Dhamana ya siku 30 :** Kurudisha bidhaa kwa amani na uhakika.\n- **Malipo salama :** MTN MoMo, Airtel Money, Visa, Mastercard na PayPal.\n- **Msaada :** Wasiliana nasi kupitia hello@ituze.com au piga +250 788 123 456.\n\nNiambie swali lako lingine lolote nikusaidie mara moja !`;
  } else {
    text = `Thank you for your question! Here is helpful information about **Ituze** to assist you:\n\n- **Quality Guarantee:** 100% authentic curated electronics and lifestyle gear.\n- **Free Shipping:** Automatic free shipping on all orders over $50 USD.\n- **30-Day Hassle-Free Returns:** Full peace of mind with our return policy.\n- **Multiple Payment Options:** MTN MoMo, Airtel Money, Visa, Mastercard, and PayPal.\n- **24/7 Support:** Reach our team at hello@ituze.com or +250 788 123 456.\n\nPlease feel free to ask any specific question about your order, our policies, or our services!`;
  }

  return { content: text };
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

    const systemDirective = `You are "Ituze AI", the official intelligent personal shopping assistant for "Ituze" (https://ituze.store).
Language: Respond fluently in language code "${lang}".
Customer: ${userId ? `Logged in as ${userName || 'Customer'}` : 'Guest'}
Orders:\n${ordersContext}${specificOrder ? `\nFound order: #${specificOrder.order_number} (${specificOrder.status})` : ''}
Products in catalog:\n${productsContext}
Policies: Free shipping over $50. Standard shipping $4.99 (3-5 days). Express $12.99 (1-2 days). 30-day returns. MoMo, Airtel, Cards, PayPal. Active Coupons: WELCOME10 (10% off), SAVE20 (20% off >$150).
IMPORTANT INSTRUCTION: Answer ONLY the question asked in a professional, courteous, clear, and direct manner. Do NOT attach or recommend unrequested products unless the customer specifically asks for product recommendations or items to buy.`;

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
        // ONLY attach matched product cards if the user specifically asked for products or recommendations
        const matchedProducts: ProductSummary[] = [];
        if (isExplicitProductInquiry(message)) {
          const lower = (message + ' ' + replyText).toLowerCase();
          for (const p of popularProducts) {
            if (lower.includes(p.name.toLowerCase()) || lower.includes(p.slug.toLowerCase())) {
              if (!matchedProducts.find((i) => i.id === p.id)) matchedProducts.push(p);
            }
          }
        }

        const matchedOrders: OrderSummary[] = specificOrder
          ? [specificOrder]
          : (message.toLowerCase().includes('order') || message.toLowerCase().includes('commande') || message.toLowerCase().includes('track')) && userOrders.length > 0
          ? userOrders.slice(0, 3)
          : [];

        return {
          content: replyText,
          matchedProducts: matchedProducts.length > 0 ? matchedProducts.slice(0, 3) : undefined,
          matchedOrders: matchedOrders.length > 0 ? matchedOrders : undefined,
        };
      }
    }
  } catch {
    // Expected fallback when external Gemini network has high latency or is unreachable
  } finally {
    clearTimeout(timeoutId);
  }

  // Instant, intelligent, reliable response from our high-speed engine
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
