import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

const openrouterApiKey = defineSecret('OPENROUTER_API_KEY');
const openrouterModel = defineSecret('OPENROUTER_MODEL');

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const chat = onRequest(
  {
    cors: true,
    secrets: [openrouterApiKey, openrouterModel],
    region: 'asia-southeast1',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const messages = (body?.messages ?? []) as ChatMessage[];
      const userName = typeof body?.user === 'string' && body.user.trim() ? body.user.trim() : 'Danh';

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Missing messages' });
        return;
      }

      const client = new OpenAI({
        apiKey: openrouterApiKey.value(),
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const completion = await client.chat.completions.create({
        model: openrouterModel.value() || 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are DANH AI, a sharp, concise, helpful assistant for ${userName}. Sound natural, capable, and modern. Keep the tone clean and conversational, similar to a polished ChatGPT-style assistant.`,
          },
          ...messages,
        ],
        temperature: 0.8,
      });

      const reply = completion.choices[0]?.message?.content?.trim();
      if (!reply) {
        res.status(502).json({ error: 'Empty reply from model' });
        return;
      }

      res.status(200).json({ reply });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'OpenRouter request failed' });
    }
  },
);
