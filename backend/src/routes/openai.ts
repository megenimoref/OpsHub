import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OpenAI API key in server env' });
    }
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );
    res.json(response.data);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

export default router;
