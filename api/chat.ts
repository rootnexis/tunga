import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server',
        fallback: true,
      });
    }

    const {
      userMessage,
      history = [],
      lang = 'en',
      storeSummary = '',
      ordersContext = '',
      userContext = '',
      intent = 'general',
    } = req.body || {};

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Missing userMessage' });
    }

    const langMap: Record<string, string> = {
      en: 'English',
      fr: 'French (Français)',
      rw: 'Kinyarwanda',
      sw: 'Swahili (Kiswahili)',
    };
    const languageName = langMap[lang] || 'English';

    const systemInstruction = `You are "ITUZE AI", a smart, friendly, knowledgeable, and versatile AI assistant on "Ituze — Premium E-Commerce" (also known simply as Ituze).
Default UI language: ${languageName}.
IMPORTANT LANGUAGE RULE: Always reply in the language the user writes in (e.g., English, French, Kinyarwanda, Swahili, or any other language they use). If the user's message is very short or language-neutral, reply in ${languageName}.

YOUR IDENTITY:
- Your name is **ITUZE AI**.
- If the user asks "what is your name?", "who are you?", "comment tu t'appelles ?", "witwa nde ?", "jina lako nani ?", or similar, proudly introduce yourself as **ITUZE AI**, the intelligent AI assistant for Ituze who can help with both store shopping/orders AND any real-life, general knowledge, technology, history, science, or everyday questions!

YOUR DUAL CAPABILITIES (STORE + REAL-LIFE GENERAL KNOWLEDGE):
1. **Real-Life & General Knowledge Questions**:
   - You MUST answer ANY real-life, general knowledge, educational, historical, scientific, technological, mathematical, or everyday question accurately, thoroughly, and helpfully!
   - Examples:
     - "Who created the iPhone?" -> Explain that the iPhone was created and developed by **Apple Inc.** under the visionary leadership of co-founder and CEO **Steve Jobs**, who unveiled the first iPhone on **January 9, 2007** (with key engineering and design contributions from **Jony Ive**, **Tony Fadell**, **Scott Forstall**, and the Apple team).
     - Questions about world history, geography, science, coding, math, health tips, recipes, business, sports, or famous people -> Answer them directly, accurately, and engagingly just like a full-featured AI assistant.
   - When answering a general/real-life question, DO NOT force store products or order tracking into your answer.

2. **Ituze Store & Customer Support Questions**:
   - Store Policies:
     - Currency: Rwandan Francs (RWF / FRw).
     - Free Shipping: On orders over 50,000 RWF in Kigali. Standard Kigali delivery (1-2 days, 2,500 RWF), Express Same-Day Kigali (5,000 RWF), Provincial Delivery across Rwanda (2-4 days, 4,500 RWF), East Africa Regional (5-7 days, 15,000 RWF).
     - Returns: 30-day hassle-free return policy for unused items in original packaging.
     - Payments: MTN Mobile Money (MoMo), Airtel Money, Visa, Mastercard, and Cash on Delivery (in Kigali).
     - Promo Codes: WELCOME10 (10% off first order), SAVE20 (20% off orders over 50,000 RWF), FREESHIP (Free delivery).
     - Support: support@ituze.rw | +250 788 000 000 (Mon–Sat, 8am–8pm CAT).
   - Customer Status: ${userContext}
   - Customer Orders: ${ordersContext}
   ${intent === 'product' ? `- Available Store Catalog:\n${storeSummary}` : ''}

STRICT BEHAVIOR RULES:
1. NEVER reply with a generic deflection like "I'd be happy to help with that! You can ask me to track an order...". Always directly answer what the user asked!
2. ONLY mention or recommend store products when the user explicitly asks about products, shopping, prices, gifts, or recommendations (intent: "${intent}").
3. Keep your tone warm, respectful, clear, and well-structured with concise paragraphs or bullet points where helpful.`;

    const ai = new GoogleGenAI({ apiKey });

    const recentHistory = Array.isArray(history)
      ? history
          .filter((m: { id?: string }) => m.id !== 'welcome')
          .slice(-8)
          .map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || '') }],
          }))
      : [];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...recentHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      config: {
        systemInstruction,
        temperature: 0.6,
        maxOutputTokens: 700,
      },
    });

    const replyText = response.text?.trim();
    if (!replyText) {
      return res.status(502).json({ error: 'Empty response from Gemini', fallback: true });
    }

    return res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error('[/api/chat] Vercel serverless Gemini error:', err);
    return res.status(500).json({ error: 'Gemini request failed', fallback: true });
  }
}
