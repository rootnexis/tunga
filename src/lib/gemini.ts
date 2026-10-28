import { supabase } from '@/lib/supabase';
import type { ChatMessage, ProductSummary, OrderSummary } from '@/types/chat';
import type { LangCode } from '@/i18n/types';

export type ChatProductCard = ProductSummary;
export type ChatOrderCard = OrderSummary & { payment_status?: string };

interface StoreContextData {
  products: ChatProductCard[];
  categories: string[];
  orders: ChatOrderCard[];
}

/**
 * Fetch live catalog products, categories, and user orders from Supabase (or hybrid store)
 * so the chatbot can ground its responses in real store data when needed.
 */
export async function fetchChatbotContext(userId?: string | null): Promise<StoreContextData> {
  try {
    const [productsRes, categoriesRes, ordersRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, slug, base_price, sale_price, currency, average_rating, category:categories(name), images:product_images(url, is_primary)')
        .eq('status', 'active')
        .limit(30),
      supabase
        .from('categories')
        .select('name')
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
      const primaryImg = images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
      const cat = p.category as { name?: string } | null;

      return {
        id: String(p.id),
        name: String(p.name),
        slug: String(p.slug),
        base_price: Number(p.base_price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        currency: String(p.currency || 'RWF'),
        image_url: primaryImg,
        category: cat?.name,
        average_rating: p.average_rating ? Number(p.average_rating) : undefined,
      };
    });

    const categories: string[] = (categoriesRes.data ?? []).map((c: Record<string, unknown>) => String(c.name));

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

  // Kinyarwanda markers
  if (/\b(muraho|mwiriwe|mwaramutse|amakuru|witwa|nde|ninde|kuki|ryari|he|iki|ibicuruzwa|komande|gutumiza|kwishyura|urakoze|murakoze|yego|oya|mbwira|sobanura| ni iki|wakoze)\b/i.test(q)) {
    return 'rw';
  }
  // Swahili markers
  if (/\b(habari|mambo|shikamoo|hujambo|jina lako|nani|kwa nini|lini|wapi|nini|bidhaa|agizo|usafirishaji|malipo|asante|ndiyo|hapana|niambie|eleza|aliyeunda|aliyetengeneza)\b/i.test(q)) {
    return 'sw';
  }
  // French markers
  if (/\b(bonjour|salut|bonsoir|comment|qui a créé|qui a inventé|quel est|quelle est|pourquoi|quand|où|merci|commande|livraison|produits|prix|retour|paiement|explique|raconte)\b/i.test(q)) {
    return 'fr';
  }
  // English markers
  if (/\b(who|what|when|where|why|how|tell me|explain|created|invented|your name|are you|hello|hey|hi|good morning|good evening)\b/i.test(q)) {
    return 'en';
  }

  return defaultLang;
}

/**
 * Determine user intent so we NEVER show products unless the user explicitly asks for products.
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
  | 'contact'
  | 'product'
  | 'general';

export function detectUserIntent(userMessage: string): UserIntent {
  const q = userMessage.toLowerCase().trim();

  // 1. Identity / Name questions ("what is your name", "who are you", "witwa nde", "jina lako nani", "comment tu t'appelles")
  if (
    /\b(what is your name|what's your name|whats your name|who are you|your name|tell me your name|are you an ai|are you a bot|who made you|who created you)\b/i.test(q) ||
    /\b(comment tu t'appelles|comment vous appelez|quel est ton nom|quel est votre nom|qui es-tu|qui êtes-vous|ton nom)\b/i.test(q) ||
    /\b(witwa nde|uri nde|izina ryawe|witwa gute)\b/i.test(q) ||
    /\b(jina lako nani|wewe ni nani|unaitwa nani|jina lako)\b/i.test(q)
  ) {
    return 'identity';
  }

  // 2. Pure greeting or casual check-in
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

  // 4. Order tracking
  if (
    q.includes('ord-') ||
    /\b(track|my order|orders|order status|where is my|package|parcel|commande|suivre|suivi|komande|gutumiza|agizo|maagizo|fuatilia)\b/i.test(
      q
    )
  ) {
    return 'order';
  }

  // 5. Shipping / Delivery
  if (
    /\b(ship|shipping|deliver|delivery|livraison|livrer|kugeza|ihererekanywa|usafirishaji|kusafirisha|how long to arrive|kigali delivery)\b/i.test(
      q
    )
  ) {
    return 'shipping';
  }

  // 6. Returns / Refunds
  if (
    /\b(return|refund|exchange|retour|remboursement|gusubiza|kurudisha|marejesho|money back|broken)\b/i.test(
      q
    )
  ) {
    return 'returns';
  }

  // 7. Payment
  if (
    /\b(pay|payment|momo|mobile money|mtn|airtel|visa|mastercard|cash on delivery|paiement|kwishyura|malipo|kulipa)\b/i.test(
      q
    )
  ) {
    return 'payment';
  }

  // 8. Discounts / Coupons
  if (
    /\b(discount|coupon|promo|voucher|code|sale|deal|remise|réduction|igabanyirizwa|punguzo|welcome10|save20|freeship)\b/i.test(
      q
    )
  ) {
    return 'discount';
  }

  // 9. Contact / Human Support
  if (
    /\b(contact|support|phone|email|call|whatsapp|location|address|human|agent|customer service|contacter|ubufasha|wasiliana|msaada)\b/i.test(
      q
    )
  ) {
    return 'contact';
  }

  // 10. Explicit Product / Store Catalog Search
  // Make sure real-life questions like "who created iphone", "when was iphone invented", "what is an iphone" are treated as 'general' knowledge, NOT store product cards, unless the user asks to buy/shop/price!
  const isRealLifeFactQuestion =
    /\b(who|when|where|why|how did|how does|history of|inventor of|creator of|founder of|created|invented|founded|discovered|meaning of|definition of|capital of|president of|population of|qui a|quand|pourquoi|comment fonctionne|ninde|ryari|kuki|nani ali|lini|kwa nini)\b/i.test(
      q
    ) && !/\b(buy|shop|price|cost|in stock|sell|order|recommend|store|catalog|cheapest)\b/i.test(q);

  if (!isRealLifeFactQuestion) {
    const productKeywords =
      /\b(product|products|item|items|buy|shop|shopping|recommend|recommendation|suggest|looking for|search|find|show me|catalog|store|stock|available|price|cost|how much|cheap|best|top|rating|watch|watches|headphone|headphones|earbuds|audio|speaker|shirt|t-shirt|jacket|dress|shoes|sneakers|bag|backpack|laptop|phone|electronics|fashion|clothing|accessories|home|kitchen|fitness|beauty|gift|gifts|produit|produits|acheter|montre|écouteurs|vêtements|chaussures|sac|ibicuruzwa|kugura|isaha|imyenda|inkweto|igikapu|bidhaa|nunua|saa|nguo|viatu|mfuko)\b/i;

    if (productKeywords.test(q)) {
      return 'product';
    }
  }

  return 'general';
}

/**
 * Match relevant products from store catalog ONLY when intent === 'product'
 */
function findMatchingProducts(query: string, products: ChatProductCard[]): ChatProductCard[] {
  const q = query.toLowerCase();

  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'what', 'how', 'can', 'you', 'show', 'me',
    'have', 'any', 'are', 'there', 'some', 'good', 'best', 'looking', 'want',
    'buy', 'need', 'recommend', 'products', 'product', 'items', 'item', 'shop',
    'please', 'tell', 'about', 'ituze', 'price', 'cost', 'much',
  ]);

  const keywords = q
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (keywords.length > 0) {
    const scored = products
      .map((p) => {
        let score = 0;
        const nameLower = p.name.toLowerCase();
        const catLower = (p.category || '').toLowerCase();

        for (const kw of keywords) {
          if (nameLower.includes(kw)) score += 3;
          if (catLower.includes(kw)) score += 2;
        }
        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return scored.slice(0, 3).map((s) => s.product);
    }
  }

  if (
    q.includes('recommend') ||
    q.includes('best') ||
    q.includes('popular') ||
    q.includes('top') ||
    q.includes('featured') ||
    q.includes('show') ||
    q.includes('product') ||
    q.includes('produits') ||
    q.includes('ibicuruzwa') ||
    q.includes('bidhaa')
  ) {
    return [...products]
      .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
      .slice(0, 3);
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
 * so ITUZE AI can answer real-life questions using live web knowledge sources even on static Vercel deployments.
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

        if (lang === 'fr') {
          return `**${summaryData.title}**\n\n${sentences}\n\n> 💡 *Vous avez une autre question ? Demandez-moi tout ce que vous voulez — je suis **ITUZE AI** !*`;
        }
        if (lang === 'rw') {
          return `**${summaryData.title}**\n\n${sentences}\n\n> 💡 *Ufite ikindi kibazo? Mbwira icyo ushaka cyose — ndi **ITUZE AI**!*`;
        }
        if (lang === 'sw') {
          return `**${summaryData.title}**\n\n${sentences}\n\n> 💡 *Una swali lingine? Niulize chochote — mimi ni **ITUZE AI**!*`;
        }
        return `**${summaryData.title}**\n\n${sentences}\n\n> 💡 *Have another question? Feel free to ask me anything — I am **ITUZE AI**!*`;
      }
    } catch {
      // Try next language or fallback
    }
  }

  // Also try DuckDuckGo Instant Answer API
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
 * Curated multilingual real-life knowledge & math responder for instant, accurate answers
 * to common real-life questions (like "Who created the iPhone?", math expressions, date/time, AI, Rwanda, etc.)
 */
function answerCuratedRealLifeQuestion(userMessage: string, lang: LangCode): string | null {
  const q = userMessage.toLowerCase().trim();

  // 1. iPhone / Apple / Steve Jobs
  if (/\b(iphone|steve jobs|apple)\b/i.test(q) && /\b(who|created|invented|founded|made|built|founder|creator|qui|ninde|nani|when|history)\b/i.test(q)) {
    if (lang === 'fr') {
      return `L'**iPhone** a été créé et développé par **Apple Inc.** sous la direction visionnaire de son cofondateur et PDG **Steve Jobs**, qui a dévoilé le tout premier iPhone le **9 janvier 2007** à San Francisco (commercialisé le 29 juin 2007).\n\n- **Créateur & Visionnaire** : Steve Jobs (cofondateur d'Apple avec Steve Wozniak et Ronald Wayne)\n- **Design industriel** : Sir Jony Ive\n- **Ingénierie matérielle & logicielle** : Tony Fadell, Scott Forstall et l'équipe d'ingénieurs d'Apple.`;
    }
    if (lang === 'rw') {
      return `**iPhone** yakozwe kandi itunganywa n'uruganda rwa **Apple Inc.** iyobowe na **Steve Jobs** (umwe mu bashinze Apple), wayimuritse ku mugaragaro bwa mbere ku wa **9 Mutarama 2007**.\n\n- **Uwayitekereje akanayobora umushinga**: Steve Jobs\n- ** Igishushanyo mbonera (Design)**: Jony Ive\n- **Ikoranabuhanga**: Ikipe y'abahanga ba Apple barimo Tony Fadell na Scott Forstall.`;
    }
    if (lang === 'sw') {
      return `**iPhone** iliundwa na kutengenezwa na kampuni ya **Apple Inc.** chini ya uongozi wa mwanzilishi mwenza na Mkurugenzi Mtendaji **Steve Jobs**, aliyeizindua iPhone ya kwanza mnamo **Januari 9, 2007**.\n\n- **Mwanzilishi & Kiongozi wa Mradi**: Steve Jobs\n- **Muundo (Design)**: Jony Ive\n- **Uhandisi wa Vifaa na Programu**: Tony Fadell, Scott Forstall na timu ya Apple.`;
    }
    return `The **iPhone** was created and developed by **Apple Inc.** under the visionary leadership of Apple co-founder and CEO **Steve Jobs**, who unveiled the first-generation iPhone on **January 9, 2007** (and released it on June 29, 2007).\n\n- **Visionary & Project Leader**: Steve Jobs (who co-founded Apple with Steve Wozniak and Ronald Wayne)\n- **Lead Industrial Designer**: Sir Jony Ive\n- **Key Hardware & Software Leaders**: Tony Fadell, Scott Forstall, and Apple's engineering team.`;
  }

  // 2. Android / Samsung / Google / Microsoft / Tesla / SpaceX / Facebook / Amazon
  if (/\b(who|created|invented|founded|founder|qui|ninde|nani)\b/i.test(q)) {
    if (q.includes('android')) {
      return lang === 'fr'
        ? `**Android** a été créé en **octobre 2003** par **Andy Rubin, Rich Miner, Nick Sears et Chris White**, puis racheté par **Google** en 2005.`
        : `**Android** was founded in **October 2003** by **Andy Rubin, Rich Miner, Nick Sears, and Chris White**, and was acquired by **Google** in 2005.`;
    }
    if (q.includes('microsoft') || q.includes('windows')) {
      return lang === 'fr'
        ? `**Microsoft** a été fondée le **4 avril 1975** par **Bill Gates** et **Paul Allen**.`
        : `**Microsoft** was founded on **April 4, 1975** by **Bill Gates** and **Paul Allen**.`;
    }
    if (q.includes('tesla') || q.includes('spacex')) {
      return lang === 'fr'
        ? `**SpaceX** a été fondée en 2002 par **Elon Musk**. **Tesla** a été fondée en 2003 par Martin Eberhard et Marc Tarpenning, et **Elon Musk** en est devenu l'actionnaire principal et PDG.`
        : `**SpaceX** was founded in 2002 by **Elon Musk**. **Tesla** was founded in 2003 by Martin Eberhard and Marc Tarpenning, with **Elon Musk** joining shortly after as largest shareholder and CEO.`;
    }
    if (q.includes('facebook') || q.includes('meta') || q.includes('instagram') || q.includes('whatsapp')) {
      return `**Facebook (Meta)** was founded in **2004** by **Mark Zuckerberg** along with Eduardo Saverin, Andrew McCollum, Dustin Moskovitz, and Chris Hughes. **Instagram** was created by Kevin Systrom and Mike Krieger (2010), and **WhatsApp** was founded by Jan Koum and Brian Acton (2009).`;
    }
    if (q.includes('google')) {
      return `**Google** was founded on **September 4, 1998** by **Larry Page** and **Sergey Brin** while they were PhD students at Stanford University.`;
    }
    if (q.includes('amazon')) {
      return `**Amazon** was founded on **July 5, 1994** by **Jeff Bezos** in Bellevue, Washington.`;
    }
    if (q.includes('telephone') || q.includes('phone')) {
      return `The first practical **telephone** was invented and patented by **Alexander Graham Bell** in **1876**. The first handheld mobile phone was demonstrated by **Martin Cooper** at Motorola in **1973**, and the first **iPhone** was unveiled by **Steve Jobs** at Apple in **2007**.`;
    }
    if (q.includes('computer')) {
      return `**Charles Babbage** is considered the "father of the computer" for designing the Analytical Engine in the 1830s, while **Ada Lovelace** was the world's first computer programmer. Modern electronic computing was pioneered by **Alan Turing**, **John von Neumann**, and **Konrad Zuse**.`;
    }
    if (q.includes('internet') || q.includes('web') || q.includes('www')) {
      return `The foundational protocols of the **Internet (TCP/IP)** were developed by **Vint Cerf** and **Bob Kahn** in the 1970s, while the **World Wide Web (WWW)** was invented by British computer scientist **Sir Tim Berners-Lee** in **1989** at CERN.`;
    }
  }

  // 3. Math & Calculations (e.g., "what is 25 * 40", "1500 + 3200")
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
    return lang === 'fr'
      ? `Nous sommes aujourd'hui le **${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, et il est **${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`
      : lang === 'rw'
      ? `Uyu munsi ni ku wa **${now.toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, isaha ni **${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`
      : lang === 'sw'
      ? `Leo ni **${now.toLocaleDateString('sw-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, saa **${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`
      : `Today is **${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, and the current time is **${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`;
  }

  // 5. Rwanda / Kigali general questions
  if (/\b(rwanda|kigali)\b/i.test(q) && /\b(capital|about|where|country|president|currency|language|population)\b/i.test(q)) {
    if (lang === 'fr') {
      return `Le **Rwanda** (surnommé le *Pays des Mille Collines*) est un pays d'Afrique de l'Est dont la capitale est **Kigali**.\n\n- **Capitale** : Kigali\n- **Monnaie** : Franc rwandais (RWF)\n- **Langues officielles** : Kinyarwanda, Anglais, Français et Swahili.`;
    }
    if (lang === 'rw') {
      return `**U Rwanda** (*Igihugu cy'Imisozi Igihumbi*) ni igihugu giherereye muri Afurika y'Iburasirazuba, umurwa mukuru wacyo ukaba ari **Kigali**.\n\n- **Umurwa mukuru**: Kigali\n- **Ifaranga**: Ifaranga ry'u Rwanda (RWF / FRw)\n- **Indimi zemewe**: Ikinyarwanda, Icyongereza, Igifaransa n'Igiswahili.`;
    }
    return `**Rwanda** (known as the *Land of a Thousand Hills*) is an East African nation whose capital and largest city is **Kigali**.\n\n- **Capital**: Kigali\n- **Currency**: Rwandan Franc (RWF)\n- **Official Languages**: Kinyarwanda, English, French, and Swahili.`;
  }

  return null;
}

/**
 * Intelligent multilingual responder when backend Gemini API is not reachable.
 */
async function generateIntelligentItuzeResponse(
  userMessage: string,
  intent: UserIntent,
  context: StoreContextData,
  lang: LangCode,
  userName?: string | null,
  matchedProducts: ChatProductCard[] = [],
  lookedUpOrder: ChatOrderCard | null = null
): Promise<{ reply: string; matchedOrders: ChatOrderCard[] }> {
  const effectiveLang = detectMessageLanguage(userMessage, lang);
  const nameGreeting = userName ? ` ${userName}` : '';

  // 0. Identity ("What is your name?", "Who are you?")
  if (intent === 'identity') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Je m'appelle **ITUZE AI** ! 🤖✨\n\nJe suis l'assistant intelligent officiel d'**Ituze**. Je peux :\n- Répondre à toutes vos **questions de la vie réelle et de culture générale** (sciences, histoire, technologie, calculs, etc.)\n- Vous aider à **suivre vos commandes**, découvrir nos **produits**, ou vérifier nos options de **livraison et paiement**.\n\nQue puis-je faire pour vous aujourd'hui ?`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Nitwa **ITUZE AI**! 🤖✨\n\nNdi umufasha wawe w'ubwenge ku rubuga rwa **Ituze**. Nshobora:\n- Kugusubiza **ibibazo byose byo mu buzima busanzwe n'ubumenyi rusange** (ikoranabuhanga, amateka, siyansi, imibare, n'ibindi)\n- Kugufasha **gukurikirana komande zawe**, kureba **ibicuruzwa**, no kumenya amakuru yo **kugeza ibicuruzwa cyangwa kwishyura**.\n\nNakugirira akahe kamaro uyu munsi?`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Jina langu ni **ITUZE AI**! 🤖✨\n\nMimi ni msaidizi wako mahiri wa AI kwenye duka la **Ituze**. Ninaweza:\n- Kujibu **maswali yoyote ya maisha halisi na maarifa ya jumla** (teknolojia, historia, sayansi, hesabu, n.k.)\n- Kukusaidia **kufuatilia maagizo yako**, kupata **bidhaa**, na kuangalia sera za **usafirishaji na malipo**.\n\nNaweza kukusaidia na nini leo?`,
        matchedOrders: [],
      };
    }
    return {
      reply: `I am **ITUZE AI**! 🤖✨\n\nI am your intelligent AI assistant here on **Ituze**. I can help you in two ways:\n- Answer **any real-life or general knowledge questions** (technology, history, science, math, everyday advice, and more)\n- Help you **track orders**, explore **store products**, or check **shipping, returns, and payment** details.\n\nWhat would you like to ask me today?`,
      matchedOrders: [],
    };
  }

  // 1. Greeting — short, friendly, NO products attached
  if (intent === 'greeting') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Bonjour${nameGreeting} ! 👋 Je suis **ITUZE AI**. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser n'importe quelle question générale ou me demander de l'aide sur la boutique Ituze !`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Muraho${nameGreeting}! 👋 Nitwa **ITUZE AI**. Nabafasha iki uyu munsi? Mushobora kumbaza ikibazo cyose cyo mu buzima busanzwe cyangwa ibijyanye n'iduka rya Ituze!`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Habari${nameGreeting}! 👋 Mimi ni **ITUZE AI**. Naweza kukusaidia vipi leo? Unaweza kuniuliza swali lolote la maisha halisi au kuhusu duka la Ituze!`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Hey${nameGreeting}! 👋 I am **ITUZE AI**. How can I help you today? Feel free to ask me any real-life question, or ask about orders, shipping, and products on Ituze!`,
      matchedOrders: [],
    };
  }

  // 2. Thanks / Goodbye — short & warm, NO products attached
  if (intent === 'thanks') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Je vous en prie${nameGreeting} ! N'hésitez pas si vous avez d'autres questions. Bonne journée avec **ITUZE AI** !`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Murakoze cyane${nameGreeting}! Niba hari ikindi kibazo mugize, mbwira rwose. Mugire umunsi mwiza hamwe na **ITUZE AI**!`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Karibu sana${nameGreeting}! Usisite kuniuliza ukiwa na swali lingine lolote. Uwe na siku njema na **ITUZE AI**!`,
        matchedOrders: [],
      };
    }
    return {
      reply: `You're very welcome${nameGreeting}! Let me know anytime you have another question. Have a wonderful day from **ITUZE AI**!`,
      matchedOrders: [],
    };
  }

  // 3. Order Tracking
  if (intent === 'order') {
    if (lookedUpOrder) {
      return {
        reply:
          effectiveLang === 'fr'
            ? `J'ai trouvé votre commande **#${lookedUpOrder.order_number}** ! Son statut actuel est **${lookedUpOrder.status.toUpperCase()}** (Paiement : **${lookedUpOrder.payment_status}**). Cliquez sur la carte ci-dessous pour voir le suivi complet :`
            : effectiveLang === 'rw'
            ? `Nabonye komande yawe **#${lookedUpOrder.order_number}**! Imerewe gutya: **${lookedUpOrder.status.toUpperCase()}** (Kwishyura: **${lookedUpOrder.payment_status}**). Kanda ku ikarita iri hasi urebe aho igeze:`
            : effectiveLang === 'sw'
            ? `Nimepata agizo lako **#${lookedUpOrder.order_number}**! Hali yake ni **${lookedUpOrder.status.toUpperCase()}** (Malipo: **${lookedUpOrder.payment_status}**). Bofya kadi hapa chini kuona maelezo kamili:`
            : `I found order **#${lookedUpOrder.order_number}**! Its current status is **${lookedUpOrder.status.toUpperCase()}** (Payment: **${lookedUpOrder.payment_status}**). Click the order card below to view full tracking details:`,
        matchedOrders: [lookedUpOrder],
      };
    }

    if (context.orders.length > 0) {
      return {
        reply:
          effectiveLang === 'fr'
            ? `Voici vos commandes récentes${nameGreeting}. Cliquez sur une commande ci-dessous pour suivre son statut en temps réel :`
            : effectiveLang === 'rw'
            ? `Dore komande zawe za vuba${nameGreeting}. Kanda kuri komande iri hasi kugira ngo ukurikirane aho igeze:`
            : effectiveLang === 'sw'
            ? `Haya hapa ni maagizo yako ya hivi karibuni${nameGreeting}. Bofya agizo lolote hapa chini kufuatilia hali yake:`
            : `Here are your recent orders${nameGreeting}. Click any order card below to track its real-time delivery progress:`,
        matchedOrders: context.orders.slice(0, 3),
      };
    }

    return {
      reply:
        effectiveLang === 'fr'
          ? `Pour suivre une commande, veuillez vous connecter à votre compte et visiter **Mon Compte → Commandes**, ou envoyez-moi directement votre numéro de commande (par ex. **ORD-2026-8912**).`
          : effectiveLang === 'rw'
          ? `Kugira ngo ukurikirane komande yawe, injira muri konti yawe ujye kuri **Konti Yanjye → Komande**, cyangwa umbwire nimero ya komande yawe (urugero: **ORD-2026-8912**).`
          : effectiveLang === 'sw'
          ? `Ili kufuatilia agizo lako, tafadhali ingia kwenye akaunti yako (**Akaunti Yangu → Maagizo**) au nitumie nambari yako ya agizo (mfano **ORD-2026-8912**).`
          : `To track an order, please sign in to your account and open **My Account → Orders**, or type your order number right here (for example **ORD-2026-8912**) and I'll look it up for you.`,
      matchedOrders: [],
    };
  }

  // 4. Shipping & Delivery
  if (intent === 'shipping') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Voici nos options de livraison chez **Ituze** :\n- **Livraison Gratuite** : Sur toutes les commandes de plus de **50 000 RWF** à Kigali\n- **Kigali Express (Même jour)** : 5 000 RWF (livré en quelques heures)\n- **Kigali Standard** : 2 500 RWF (1 à 2 jours ouvrables)\n- **Provinces du Rwanda** : 4 500 RWF (2 à 4 jours ouvrables)\n- **Afrique de l'Est** : 15 000 RWF (5 à 7 jours ouvrables)`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Dore uko tugeza ibicuruzwa ku bakiriya muri **Ituze**:\n- **Ubuntu i Kigali**: Ku bicuruzwa birengeje **50,000 RWF**\n- **Kigali Express (Uwo munsi)**: 5,000 RWF\n- **Kigali Bisanzwe**: 2,500 RWF (iminsi 1–2)\n- **Mu Ntara zose z'u Rwanda**: 4,500 RWF (iminsi 2–4)\n- **Akarere ka Afurika y'Iburasirazuba**: 15,000 RWF (iminsi 5–7)`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Chaguo zetu za usafirishaji katika **Ituze**:\n- **Usafirishaji wa Bure**: Kwa maagizo zaidi ya **50,000 RWF** ndani ya Kigali\n- **Kigali Express (Siku Hiyo Hiyo)**: 5,000 RWF\n- **Kigali ya Kawaida**: 2,500 RWF (Siku 1–2)\n- **Mikoani Rwanda**: 4,500 RWF (Siku 2–4)\n- **Afrika Mashariki**: 15,000 RWF (Siku 5–7)`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Here are our delivery options at **Ituze**:\n- **Free Shipping**: On all orders over **50,000 RWF** in Kigali\n- **Kigali Express (Same-Day)**: 5,000 RWF\n- **Kigali Standard**: 2,500 RWF (1–2 business days)\n- **Provincial Delivery (All Rwanda)**: 4,500 RWF (2–4 business days)\n- **East Africa Regional**: 15,000 RWF (5–7 business days)`,
      matchedOrders: [],
    };
  }

  // 5. Returns & Refunds
  if (intent === 'returns') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Notre politique de retour est simple et sans tracas :\n- **Garantie de 30 jours** pour retourner ou échanger un article non utilisé dans son emballage d'origine.\n- **Remboursement rapide** via MTN MoMo, Airtel Money ou votre carte bancaire sous 3 à 5 jours ouvrables.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Politiki yo gusubiza ibicuruzwa muri **Ituze**:\n- Ufite **iminsi 30** yo gusubiza cyangwa guhindura igicuruzwa kitakoreshejwe kikiri mu gipfunyika cyacyo.\n- **Gusubizwa amafaranga** bikorwa mu minsi 3–5 kuri MTN MoMo, Airtel Money cyangwa ikarita ya banki.`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'sw') {
      return {
        reply: `Sera yetu ya kurudisha bidhaa katika **Ituze**:\n- **Siku 30 za kurudisha** bidhaa ambayo haijatumika ikiwa kwenye kifungashio chake cha awali.\n- **Marejesho ya pesa** hufanyika ndani ya siku 3–5 kupitia MTN MoMo, Airtel Money au kadi ya benki.`,
        matchedOrders: [],
      };
    }
    return {
      reply: `We offer a **30-day hassle-free return policy** at **Ituze**:\n- Items must be unused and in their original packaging.\n- Refunds are processed within **3–5 business days** back to your MTN MoMo, Airtel Money, or payment card.\n- Defective or damaged items qualify for a free immediate replacement.`,
      matchedOrders: [],
    };
  }

  // 6. Payment Methods
  if (intent === 'payment') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Nous acceptons les moyens de paiement sécurisés suivants :\n- **MTN Mobile Money (MoMo)** & **Airtel Money**\n- **Cartes Visa & Mastercard** (sécurisées par cryptage SSL 256 bits)\n- **Paiement à la livraison** (disponible à Kigali)`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Uburyo bwo kwishyura bwemewe muri **Ituze**:\n- **MTN Mobile Money (MoMo)** na **Airtel Money**\n- **Amakarita ya Visa & Mastercard**\n- **Kwishyura ibicuruzwa bikugezeho** (mu mujyi wa Kigali)`,
        matchedOrders: [],
      };
    }
    return {
      reply: `We accept multiple secure payment methods on **Ituze**:\n- **MTN Mobile Money (MoMo)** & **Airtel Money**\n- **Visa & Mastercard** debit/credit cards (256-bit SSL encrypted)\n- **Cash on Delivery** (available for Kigali orders)`,
      matchedOrders: [],
    };
  }

  // 7. Discounts & Coupons
  if (intent === 'discount') {
    if (effectiveLang === 'fr') {
      return {
        reply: `Voici nos codes promotionnels actifs :\n- **WELCOME10** : 10% de réduction sur votre première commande\n- **SAVE20** : 20% de réduction sur les commandes de plus de 50 000 RWF\n- **FREESHIP** : Livraison standard gratuite`,
        matchedOrders: [],
      };
    }
    if (effectiveLang === 'rw') {
      return {
        reply: `Dore kode za poromosiyo ziri gukora muri **Ituze**:\n- **WELCOME10**: Igabanyirizwa rya 10% kuri komande yawe ya mbere\n- **SAVE20**: Igabanyirizwa rya 20% kuri komande irengeje 50,000 RWF\n- **FREESHIP**: Kugezwaho ibicuruzwa ku buntu`,
        matchedOrders: [],
      };
    }
    return {
      reply: `Here are our active promo codes you can apply at checkout:\n- **WELCOME10** — 10% off your first order\n- **SAVE20** — 20% off orders over 50,000 RWF\n- **FREESHIP** — Free standard shipping`,
      matchedOrders: [],
    };
  }

  // 8. Contact / Support
  if (intent === 'contact') {
    return {
      reply: `You can reach the **Ituze Support Team** directly:\n- **Email**: support@ituze.rw\n- **Phone / WhatsApp**: +250 788 000 000\n- **Hours**: Monday – Saturday, 8:00 AM – 8:00 PM CAT\n- **Contact Page**: Visit **/contact** from the top navigation menu.`,
      matchedOrders: [],
    };
  }

  // 9. Product Inquiry — ONLY show products when user explicitly asked about products!
  if (intent === 'product') {
    if (matchedProducts.length > 0) {
      return {
        reply:
          effectiveLang === 'fr'
            ? `Voici les meilleurs produits disponibles dans notre catalogue qui correspondent à votre demande :`
            : effectiveLang === 'rw'
            ? `Dore ibicuruzwa byiza bihuye n'ibyo mwifuje biboneka mu iduka ryacu:`
            : effectiveLang === 'sw'
            ? `Hizi hapa ni bidhaa bora zinazolingana na hitaji lako:`
            : `Here are the top matching products currently available in our store:`,
        matchedOrders: [],
      };
    }
    return {
      reply:
        effectiveLang === 'fr'
          ? `Nous avons plusieurs catégories populaires (${context.categories.join(', ') || 'Électronique, Mode, Maison, Accessoires'}). Quel type de produit recherchez-vous exactement ?`
          : `We carry a curated collection across **${context.categories.join(', ') || 'Electronics, Fashion, Home & Living, and Accessories'}**. Tell me what item or budget you have in mind and I'll find the best options for you!`,
      matchedOrders: [],
    };
  }

  // 10. Real-Life & General Knowledge Questions:
  // First check curated real-life knowledge & math
  const curatedAnswer = answerCuratedRealLifeQuestion(userMessage, effectiveLang);
  if (curatedAnswer) {
    return { reply: curatedAnswer, matchedOrders: [] };
  }

  // Next query live Wikipedia / DuckDuckGo public APIs in the user's language
  const liveKnowledge = await fetchLiveKnowledgeAnswer(userMessage, effectiveLang);
  if (liveKnowledge) {
    return { reply: liveKnowledge, matchedOrders: [] };
  }

  // Friendly, thoughtful conversational response if no encyclopedia article matched
  if (effectiveLang === 'fr') {
    return {
      reply: `Je suis **ITUZE AI**, votre assistant intelligent ! 🤖\n\nConcernant votre message (*« ${userMessage} »*), pourriez-vous préciser un peu plus votre question ? Je peux répondre à vos questions sur **l'histoire, la technologie, la science, les calculs**, ou vous aider avec **vos commandes et produits Ituze**.`,
      matchedOrders: [],
    };
  }
  if (effectiveLang === 'rw') {
    return {
      reply: `Ndi **ITUZE AI**, umufasha wawe w'ubwenge! 🤖\n\nKu bijyanye n'ikibazo cyawe (*"${userMessage}"*), ushobora kukivuga mu bundi buryo bworoheje? Nshobora kugusubiza ku **ikoranabuhanga, amateka, siyansi, imibare**, cyangwa ibijyanye na **komande n'ibicuruzwa bya Ituze**.`,
      matchedOrders: [],
    };
  }
  if (effectiveLang === 'sw') {
    return {
      reply: `Mimi ni **ITUZE AI**, msaidizi wako mahiri! 🤖\n\nKuhusu swali lako (*"${userMessage}"*), unaweza kulifafanua kidogo? Ninaweza kujibu maswali ya **teknolojia, historia, sayansi, hesabu**, au kukusaidia kuhusu **maagizo na bidhaa za Ituze**.`,
      matchedOrders: [],
    };
  }

  return {
    reply: `I am **ITUZE AI**, your intelligent assistant! 🤖\n\nRegarding *"${userMessage}"* — could you share a little more detail or rephrase your question? I can answer real-life questions about **technology, history, science, famous people, and math**, as well as help with **Ituze orders, shipping, and products**!`,
    matchedOrders: [],
  };
}

/**
 * Send user message to the server-side Gemini API (/api/chat) or use intelligent multilingual + live knowledge engine.
 * Strictly attaches product cards ONLY when the user's intent is 'product'.
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
}> {
  const intent = detectUserIntent(userMessage);
  const effectiveLang = detectMessageLanguage(userMessage, lang);

  // ONLY find matching products if the user explicitly asked for products!
  const matchedProducts = intent === 'product' ? findMatchingProducts(userMessage, context.products) : [];

  // Check if the user typed a specific order number (e.g., ORD-2026-8912)
  let lookedUpOrder: ChatOrderCard | null = null;
  const orderNumMatch = userMessage.match(/ORD-[A-Z0-9-]+/i);
  if (orderNumMatch) {
    lookedUpOrder = await lookupOrderByNumber(orderNumMatch[0]);
  }

  const storeSummary = context.products
    .slice(0, 15)
    .map((p) => {
      const price = p.sale_price ?? p.base_price;
      return `- ${p.name} (${p.category || 'General'}): ${price.toLocaleString()} ${p.currency}`;
    })
    .join('\n');

  const ordersContext =
    lookedUpOrder
      ? `Looked up order: #${lookedUpOrder.order_number} | Status: ${lookedUpOrder.status} | Payment: ${lookedUpOrder.payment_status} | Total: ${lookedUpOrder.total.toLocaleString()} ${lookedUpOrder.currency}`
      : context.orders.length > 0
      ? context.orders
          .map(
            (o) =>
              `- Order #${o.order_number}: Status=${o.status}, Payment=${o.payment_status}, Total=${o.total.toLocaleString()} ${o.currency}`
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

        return {
          reply: data.reply,
          matchedProducts,
          matchedOrders,
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
}> {
  const context = await fetchChatbotContext(userId);
  const res = await sendMessageToItuzeAI(userMessage, history, context, lang, userName);
  return {
    content: res.reply,
    matchedProducts: res.matchedProducts,
    matchedOrders: res.matchedOrders,
  };
}

