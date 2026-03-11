const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 1025, // e.g. Mailhog for local testing
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

const sendCRNotification = async (toEmail, subject, text, htmlText) => {
    try {
        const info = await transporter.sendMail({
            from: '"ITIL CMS Notifier" <noreply@aai.aero>',
            to: toEmail,
            subject: `[AAI-CMS] ${subject}`,
            text: text,
            html: htmlText || `<p>${text}</p>`
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email: ', error);
    }
};

module.exports = { sendCRNotification };
