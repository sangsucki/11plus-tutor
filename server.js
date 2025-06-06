import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { prompt, isJson } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const payload = {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  };
  if (isJson) {
    payload.response_format = { type: 'json_object' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', errText);
      return res.status(response.status).json({ error: 'OpenAI API request failed' });
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content?.trim();
    if (!text) return res.status(500).json({ error: 'Empty response from OpenAI' });

    res.json({ text });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch from OpenAI' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API proxy listening on ${port}`);
});
