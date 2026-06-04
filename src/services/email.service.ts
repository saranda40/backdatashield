// src/services/email.service.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter;

// Función interna para inicializar el transporte SMTP (Real o Pruebas)
async function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('tu_correo')) {
    console.log('📦 Configurando cuenta de pruebas rápida en Ethereal Email...');
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      // 👇 AGREGA ESTA SECCIÓN PARA ELIMINAR EL ERROR DE CERTIFICADO
      tls: {
        rejectUnauthorized: false
      }
    });
    return transporter;
  }

  // Configuración para el modo real futuro
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Opcional: También lo dejamos aquí por si tu futuro proveedor SMTP local lo requiere
    tls: {
      rejectUnauthorized: false
    }
  });
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendComplianceEmail = async ({ to, subject, html }: EmailOptions): Promise<void> => {
  try {
    const currentTransporter = await getTransporter();
    
    const info = await currentTransporter.sendMail({
      from: '"DataShield Cumplimiento" <compliance@datashield.cl>',
      to,
      subject,
      html,
    });

    console.log(`📧 Notificación procesada para: ${to}`);
    
    // Si estamos usando la cuenta de pruebas, Nodemailer nos regala una URL para ver el HTML enviado
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`🔗 [PRUEBA] Visualiza el correo enviado aquí: ${testUrl}`);
    }
  } catch (error) {
    console.error('❌ Error crítico en el servicio de correos:', error);
  }
};