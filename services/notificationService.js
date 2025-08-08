// services/notificationService.js
import nodemailer from 'nodemailer';
import * as signalRepository from '../database/signalRepository.js';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter;
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
} else {
    console.warn("Предупреждение: Имейл услугата не е конфигурирана. Няма да се изпращат известия.");
}

/**
 * Изпраща имейл известие за промяна на статус до всички имейли, свързани със сигнал.
 * @param {string} signalId - UUID на главния сигнал.
 * @param {string} newStatusLabel - Новият статус, както се показва на потребителя (напр. "Решен").
 * @param {string} adminMessage - Персонализираното съобщение от администратора.
 */
export async function sendStatusUpdateEmail(signalId, newStatusLabel, adminMessage) {
    if (!transporter) {
        console.error("Грешка: Опит за изпращане на имейл, но услугата не е конфигурирана.");
        return; // Не хвърляме грешка, за да не спрем процеса, само логваме.
    }

    // 1. Вземаме всички имейли, свързани със сигнала (основен + дъщерни)
    const signalInfo = await signalRepository.getEmailsForSignal(signalId);
    if (!signalInfo || signalInfo.emails.length === 0) {
        console.log(`Няма имейли за известяване за сигнал ${signalId}.`);
        return;
    }

    const mailOptions = {
        from: `"Smart Varna" <${EMAIL_USER}>`,
        to: EMAIL_USER, // Изпращаме до себе си
        bcc: signalInfo.emails, // А всички получатели са като скрито копие
        subject: `Промяна в статуса на вашия сигнал #${signalInfo.trackCode}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Статусът на Вашия сигнал беше променен</h2>
                <p>Здравейте,</p>
                <p>Статусът на сигнал <strong>#${signalInfo.trackCode}</strong> (${signalInfo.title}) беше променен на:</p>
                <p style="font-size: 1.2em; font-weight: bold; color: #263A8D;">${newStatusLabel}</p>
                <hr>
                <h4>Съобщение от администратор:</h4>
                <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${adminMessage}</div>
                <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
                    Благодарим Ви, че използвате платформата Smart Varna!
                </p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Имейл известие изпратено до ${signalInfo.emails.length} получатели за сигнал ${signalId}.`);
    } catch (error) {
        console.error("Грешка при изпращане на имейл известие:", error);
        // Не хвърляме грешка, за да може статусът да се смени, дори имейлът да се провали
    }
}