import nodemailer, { Transporter } from 'nodemailer';

// Envoi d'e-mail sortant (Phase 5 : OTP par e-mail pour les comptes Naatalix). Configuration SMTP
// optionnelle en dev — comme Cloudinary, sans ces variables le service ne doit jamais faire
// planter le serveur : voir sendEmail() ci-dessous, qui journalise le contenu en console au lieu
// d'envoyer un vrai e-mail quand SMTP_HOST est absent.
export const isSmtpConfigured = (): boolean => Boolean(process.env.SMTP_HOST);

let transporter: Transporter | null = null;
const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
};

export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  if (!isSmtpConfigured()) {
    console.log(`[Email — SMTP non configuré, affiché en console] À : ${to} | Sujet : ${subject}\n${text}`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
};
