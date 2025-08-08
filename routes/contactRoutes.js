import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter;
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
}

router.post('/send-contact-email', async (req, res) => {
    if (!transporter) {
        return res.status(500).json({ error: 'Услугата за изпращане на имейли не е конфигурирана на сървъра.' });
    }

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Моля, попълнете всички полета.' });
    }

    const mailOptions = {
        from: `"Smart Varna" <${EMAIL_USER}>`,
        to: 'smartcityloop@gmail.com',
        replyTo: email,
        subject: `Ново запитване от ${name} през формата за контакти`,
        text: `Получихте ново съобщение от формата за контакти:\n\nИме: ${name}\nИмейл: ${email}\n\nСъобщение:\n${message}`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Ново съобщение от формата за контакти</h2>
            <p><strong>Име:</strong> ${name}</p>
            <p><strong>Имейл:</strong> <a href="mailto:${email}">${email}</a></p>
            <hr>
            <h3>Съобщение:</h3>
            <p style="white-space: pre-wrap; background-color: #f4f4f4; padding: 15px; border-radius: 5px;">${message}</p>
        </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Съобщението е изпратено успешно.' });
    } catch (error) {
        console.error('Грешка при изпращане на имейл:', error);
        res.status(500).json({ error: 'Възникна грешка при изпращането на съобщението.' });
    }
});

export default router;