import express from 'express';
import * as signalRepository from '../database/signalRepository.js';
import * as notificationService from '../services/notificationService.js';

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ЗАМЯНА: Пътят вече е само '/login'
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
        console.error("ГРЕШКА: ADMIN_USERNAME или ADMIN_PASSWORD не са заредени от .env файла!");
        return res.status(500).json({ error: 'Сървърна грешка: Конфигурацията на администратора липсва.' });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.status(200).json({ success: true, message: 'Успешен вход.' });
    } else {
        res.status(401).json({ error: 'Грешно потребителско име или парола.' });
    }
});

// ЗАМЯНА: Пътят вече е само '/logout'
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Неуспешен изход.' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true, message: 'Успешен изход.' });
    });
});

router.get('/signals', async (req, res) => {
    try {
        // Използваме функция от signalRepository, която ще създадем след малко
        const signals = await signalRepository.getAllMasterSignals();
        res.status(200).json(signals);
    } catch (error) {
        console.error("Грешка при извличане на сигнали за админ панела:", error);
        res.status(500).json({ error: "Неуспешно извличане на сигнали." });
    }
});
router.get('/signals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Липсва ID на сигнала.' });
        }
        // Използваме функцията от repository-то
        const signalDetails = await signalRepository.getSignalDetailsById(id);
        res.json(signalDetails);
    } catch (error) {
        console.error(`Грешка при извличане на детайли за сигнал ${req.params.id}:`, error);
        if (error.message.includes('не е намерен')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Сървърна грешка при извличане на детайли.' });
        }
    }
});
// --- КРАЙ НА КОРЕКЦИЯТА ---


// Този ендпойнт обновява статуса на сигнала
router.post('/signals/:id/update-status', async (req, res) => {
    const { id } = req.params;
    const { newStatusId, newStatusLabel, message } = req.body;

    if (!newStatusId || !newStatusLabel || !message) {
        return res.status(400).json({ error: 'Липсват данни за обновяване на статуса.' });
    }

    try {
        const signal = await signalRepository.getSignalDetailsById(id);
        if (!signal) {
            return res.status(404).json({ error: 'Сигналът не е намерен.' });
        }

        const newStatusRecord = await signalRepository.createStatus(
            signal.trackCode,
            newStatusLabel,
            new Date(),
            newStatusId
        );

        await signalRepository.updateSignalStatus(id, newStatusRecord.status_id);

        notificationService.sendStatusUpdateEmail(id, newStatusLabel, message);
        
        res.status(200).json({ success: true, message: 'Статусът е променен успешно.' });

    } catch (error) {
        console.error(`Грешка при промяна на статус за сигнал ${id}:`, error);
        res.status(500).json({ error: 'Сървърна грешка при промяна на статус.' });
    }
});

export default router;