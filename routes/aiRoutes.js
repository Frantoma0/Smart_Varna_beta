import express from 'express';

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// Endpoint: Analyze image
router.post('/analyze-image', async (req, res) => {
    const { base64Image, systemPrompt } = req.body;
    if (!base64Image || typeof base64Image !== 'string' || !base64Image.startsWith('data:image/')) {
      return res.status(400).json({ error: "Липсва или е невалидно изображение за анализ." });
    }
    if (!OPENAI_KEY) {
      return res.status(500).json({ error: 'OpenAI ключът не е конфигуриран на сървъра.' });
    }
    const payload = { model: 'gpt-4o', messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: [ { type: 'text', text: 'Анализирай това изображение.' }, { type: 'image_url', image_url: { url: base64Image } } ] } ], max_tokens: 100 };
    try {
      const response = await fetch(OPENAI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'OpenAI API error');
      res.json({ description: data.choices[0].message.content.trim() });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Unknown error from OpenAI' });
    }
  });
  
  // Endpoint: Get institution
  router.post('/get-institution', async (req, res) => {
    const { description, systemPrompt } = req.body;
    if (!OPENAI_KEY) return res.status(500).json({ error: 'OpenAI ключът не е конфигуриран на сървъра.' });
    const payload = { model: 'gpt-4o', messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: description } ], max_tokens: 50 };
    try {
      const response = await fetch(OPENAI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'OpenAI API error');
      res.json({ institution: data.choices[0].message.content.trim() });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Unknown error from OpenAI' });
    }
  });
  
  // Endpoint: Get intent
  router.post('/get-intent', async (req, res) => {
      const { text, systemPrompt } = req.body;
      if (!OPENAI_KEY) {
        return res.status(500).json({ error: 'OpenAI ключът не е конфигуриран на сървъра.' });
      }
      const payload = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: 100
      };
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'OpenAI API error');
        let result = {};
        try { result = JSON.parse(data.choices[0].message.content.trim()); } catch (e) { result = { intent: "general_chat", tracking_code: null }; }
        res.json(result);
      } catch (error) {
        res.status(500).json({ intent: "general_chat", tracking_code: null, error: error.message || 'Unknown error from OpenAI' });
      }
    });
    
    // Endpoint: Get extract (description/address extraction)
    router.post('/get-extract', async (req, res) => {
      const { text, systemPrompt } = req.body;
      if (!OPENAI_KEY) {
        return res.status(500).json({ error: 'OpenAI ключът не е конфигуриран на сървъра.' });
      }
      const payload = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: 150
      };
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'OpenAI API error');
        let result = {};
        try { result = JSON.parse(data.choices[0].message.content.trim()); } catch (e) { result = { description: text, address: null }; }
        res.json(result);
      } catch (error) {
        res.status(500).json({ description: text, address: null, error: error.message || 'Unknown error from OpenAI' });
      }
    });

    export default router;