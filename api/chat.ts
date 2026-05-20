import OpenAI from 'openai';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const messages = (body?.messages ?? []) as ChatMessage[];
  const userName = typeof body?.user === 'string' && body.user.trim() ? body.user.trim() : 'Danh';

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
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
      return res.status(502).json({ error: 'Empty reply from model' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'OpenRouter request failed' });
  }
}
