// routes/signals.js

import express from 'express';
import * as signalRepository from '../database/signalRepository.js';
import { createSignal } from '../services/signalService.js';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'settings.json'), 'utf-8'));

const router = express.Router();

// --- Rate Limiters ---
const dailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: SETTINGS.rateLimit.daily,
    message: { error: 'Превишихте дневния лимит от 50 сигнала.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const hourlyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: SETTINGS.rateLimit.hourly,
    message: { error: 'Превишихте часовия лимит от 10 сигнала.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Дефиниция на ендпойнта ---
router.post('/submit-signal', [dailyLimiter, hourlyLimiter], async (req, res) => {
    if (req.body.website) {
        console.log('🍯 Хванат бот в honeypot капана!');
        return res.status(400).json({ error: 'Спам детекция.' });
    }
    // Валидация на входните данни
    const requiredFields = ['description', 'institution', 'trackCode'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Липсващи полета: ${missingFields.join(', ')}` });
    }

    try {
        const result = await createSignal(req.body);
        res.json(result);
    } catch (error) {
        console.error("💥 === ЦЯЛОСТНА ГРЕШКА в /api/submit-signal ===", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/update-title', async (req, res) => {
    const { trackCode, newTitle } = req.body;

    if (!trackCode || !newTitle) {
        return res.status(400).json({ error: 'Липсват trackCode или newTitle.' });
    }

    try {
        // Ще създадем тази функция след малко
        await signalRepository.updateSignalTitle(trackCode, newTitle);
        res.status(200).json({ success: true, message: 'Заглавието е обновено.' });
    } catch (error) {
        console.error('Грешка при обновяване на заглавие:', error);
        res.status(500).json({ error: error.message });
    }
});
// Експортираме рутера, за да може server.js да го използва
export default router;