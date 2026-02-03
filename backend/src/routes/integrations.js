import express from 'express';
import { invokeLLM } from '../services/ai.js';

const router = express.Router();

router.post('/core/invoke-llm', async (req, res, next) => {
  try {
    const { prompt, response_json_schema } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt_required' });
    }

    const result = await invokeLLM({
      prompt,
      responseJsonSchema: response_json_schema,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;
