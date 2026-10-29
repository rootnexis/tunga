import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // ── Server-Side Gemini AI Chatbot Route (/api/chat) ──
  app.post('/api/chat', async (req, res) => {
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
        storePagesKnowledge = '',
        ownerContact = {},
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

      const whatsappUrl =
        ownerContact?.whatsappUrl ||
        'https://wa.me/250788000000?text=Hello%20Ituze%20Store%20Owner%2C%20I%20would%20like%20assistance%20with%20a%20question%20on%20Ituze.';
      const emailUrl =
        ownerContact?.emailUrl ||
        'mailto:niyodieudonne62@gmail.com?subject=Inquiry%20from%20Ituze%20Store%20Customer';
      const emailAddress = ownerContact?.emailAddress || 'niyodieudonne62@gmail.com';
      const phoneDisplay = ownerContact?.phoneDisplay || '+250 788 000 000';

      const systemInstruction = `You are "ITUZE AI", a kind, warm, knowledgeable shopping friend, product advisor, and intelligent AI assistant on "Ituze — Premium E-Commerce" (Ituze).
Default UI language: ${languageName}.
IMPORTANT LANGUAGE RULE: Always reply in the language the user writes in (English, French, Kinyarwanda, Swahili, or any language they use). If the user's message is language-neutral, reply in ${languageName}.

YOUR IDENTITY:
- Your name is **ITUZE AI**.
- You are a helpful friend on the store who helps customers choose the right products, explains how products and services work, answers questions about every page on the website, tracks orders, and answers real-life general knowledge questions!

COMPLETE STORE PAGES & POLICIES KNOWLEDGE:
${storePagesKnowledge}

STORE CATALOG PRODUCTS (WITH DIRECT LINKS):
${storeSummary}

CUSTOMER STATUS & ORDERS:
- Customer: ${userContext}
- Orders: ${ordersContext}

KEY INSTRUCTIONS FOR EVERY SITUATION:
1. **When User Asks About Products (or names a product, or asks for help choosing)**:
   - Be a warm, kind advisor! Explain the product(s), their features, benefits, and prices clearly so the user feels guided by a trusted friend.
   - ALWAYS include direct markdown links to each product in the format \`[Product Name](/product/product-slug)\` so the user can click straight to the product page. (Note: The UI will also automatically attach visual Product Cards with images and links below your message when intent is "product"!)
2. **When User Asks to Contact Us / Contact the Owner**:
   - Provide direct clickable markdown links for BOTH WhatsApp and Email:
     - WhatsApp Direct: \`[Chat on WhatsApp (${phoneDisplay})](${whatsappUrl})\`
     - Direct Email: \`[Email the Owner (${emailAddress})](${emailUrl})\`
     - Contact Page: \`[Contact Us Page](/contact)\`
3. **When User Asks About Store Pages (Terms & Conditions, Privacy Policy, Returns & Refunds, Shipping Policy, FAQ, About Us)**:
   - Explain the relevant policy or FAQ clearly and kindly, and include the direct markdown link to that page: \`[Terms & Conditions](/terms)\`, \`[Privacy Policy](/privacy)\`, \`[Returns & Refunds](/returns-policy)\`, \`[Shipping Policy](/shipping-policy)\`, \`[FAQ Page](/faq)\`, or \`[About Us](/about)\`.
4. **When User Wants to Track an Order**:
   - Share their order status clearly and include a link to \`[My Orders](/account/orders)\` (and the UI will attach their interactive order card).
5. **Real-Life & General Knowledge Questions**:
   - Answer any real-life question (history, technology like "who created the iPhone", science, math, everyday advice) accurately and helpfully without forcing store products into the answer unless asked.
6. **Polite Escalation When You Don't Know a Specific Answer**:
   - If the user asks a specific question that you genuinely cannot answer or do not have information about, apologize respectfully and kindly invite them to contact the store owner directly via \`[Chat on WhatsApp (${phoneDisplay})](${whatsappUrl})\` or \`[Email the Owner (${emailAddress})](${emailUrl})\`.`;

      const ai = new GoogleGenAI({ apiKey });

      const recentHistory = Array.isArray(history)
        ? history
            .filter((m: { id?: string }) => !String(m.id || '').startsWith('welcome'))
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
          maxOutputTokens: 800,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        return res.status(502).json({ error: 'Empty response from Gemini', fallback: true });
      }

      return res.json({ reply: replyText, intent });
    } catch (err) {
      console.error('[/api/chat] Gemini API error:', err);
      return res.status(500).json({ error: 'Gemini request failed', fallback: true });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
