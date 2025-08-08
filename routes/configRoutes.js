import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as signalRepository from '../database/signalRepository.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const SETTINGS = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'settings.json'), 'utf-8'));
router.get('/status-types', async (req, res) => {
    try {
        const statusTypes = await signalRepository.getAllStatusTypes();
        res.json(statusTypes);
    } catch (error) {
        console.error("Грешка при извличане на типове статуси:", error);
        res.status(500).json({ error: 'Неуспешно зареждане на статусите от базата данни.' });
    }
});
router.get('/get-prompts', (req, res) => {
    try {
        const visionPrompt = readFileSync(join(__dirname, '..', 'prompts', 'vision_prompt.txt'), 'utf-8');
        const institutionPrompt = readFileSync(join(__dirname, '..', 'prompts', 'institution_prompt.txt'), 'utf-8');
        res.json({
            vision: visionPrompt,
            institution: institutionPrompt
        });
    } catch (error) {
        res.status(500).json({ error: 'Неуспешно зареждане на промптове.' });
    }
  });
router.get('/get-institutions', (req, res) => {
    try {
        const institutionsPath = join(__dirname, '..', 'config', 'institutions.json');
        const institutions = readFileSync(institutionsPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(institutions);
    } catch (error) {
        res.status(500).json({ error: 'Неуспешно зареждане на списъка с институции.' });
    }
  });
router.get('/get-category-rules', (req, res) => {
    try {
        const rulesPath = join(__dirname, '..', 'config', 'category_rules.json');
        const rules = readFileSync(rulesPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(rules);
    } catch (error) {
        res.status(500).json({ error: 'Неуспешно зареждане на правилата за категории.' });
    }
  });

  router.get('/get-icon-mapping', (req, res) => {
    try {
        const mappingPath = join(__dirname, '..', 'config', 'icon_mapping.json');
        const mapping = readFileSync(mappingPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(mapping);
    } catch (error) {
        res.status(500).json({ error: 'Неуспешно зареждане на иконите.' });
    }
});

  router.get('/supabase-keys', (req, res) => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) return res.status(500).json({ error: 'Supabase ключовете не са конфигурирани.' });
    res.json({
      url,
      anonKey,
      nearbySignalsRadius: SETTINGS.nearbySignalsRadiusMeters
    });
});

export default router;