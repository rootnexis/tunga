import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
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

      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error('Gemini API Error:', error?.message || error);
      res.status(500).json({ error: error?.message || 'Failed to generate response' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
