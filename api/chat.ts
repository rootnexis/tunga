import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      return;
    }

    const { message, history = [], systemContext = '', lang = 'en' } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are "Ituze AI", the official virtual assistant for the Ituze e-commerce platform.
Respond fluently in language code "${lang}".

CRITICAL CONVERSATIONAL RULES:
1. If the user sends a greeting (e.g., "hey", "hi", "hello", "good morning", "bonjour", "salut", "muraho", "habari") or casual small talk (e.g., "how are you", "thanks", "thank you", "ok"), reply in 1-2 short, warm, simple conversational sentences. Do NOT show or pitch any products, and do NOT output bulleted lists of store policies for a simple greeting.
2. ONLY mention or recommend products if the user explicitly asks about products, items to buy, catalog recommendations, or prices.
3. Keep all answers concise, natural, polite, and directly focused on what the user asked.

Store Context:
${systemContext}`;

    const contents = [
      ...history.slice(-6).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.status(200).json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Vercel Gemini API Error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to generate response' });
  }
}
