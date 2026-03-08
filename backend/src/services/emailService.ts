import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendTotpResetEmail(to: string, qrCodeDataUrl: string, confirmUrl: string): Promise<void> {
  // Extract base64 data from data URL (e.g. "data:image/png;base64,...")
  const base64Data = qrCodeDataUrl.split(',')[1];
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: 'איפוס Google Authenticator - חמל העורף',
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>איפוס Google Authenticator</h2>
        <p>קיבלת בקשה לאיפוס קוד האימות הדו-שלבי שלך.</p>
        <p><strong>סרוק את הברקוד הבא עם אפליקציית Google Authenticator:</strong></p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="cid:qrcode@crm" alt="QR Code" style="width: 200px; height: 200px;" />
        </div>
        <p>לאחר הסריקה, לחץ על הכפתור להלן להפעלת הקוד החדש:</p>
        <p style="text-align: center;">
          <a href="${confirmUrl}" style="background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            אפס והפעל Authenticator
          </a>
        </p>
        <p style="color: #666;">הקישור יפוג תוקף בעוד שעה אחת.</p>
        <p style="color: #666;">אם לא ביקשת זאת, אתה יכול להתעלם מהודעה זו.</p>
        <hr />
        <p style="color: #999; font-size: 12px;">מערכת חמל העורף</p>
      </div>
    `,
    attachments: [
      {
        filename: 'qrcode.png',
        content: Buffer.from(base64Data, 'base64'),
        cid: 'qrcode@crm',
      },
    ],
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`TOTP reset email sent to ${to}`);
  } catch (error) {
    console.error('Error sending TOTP reset email:', error);
    throw new Error('Failed to send TOTP reset email');
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: 'אפס את סיסמתך - חמל העורף',
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>בקשת איפוס סיסמה</h2>
        <p>קיבלת בקשה לאיפוס סיסמה לחשבון שלך.</p>
        <p>לחץ על הקישור להלן כדי לאפס את הסיסמה:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #0891b2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            אפס סיסמה
          </a>
        </p>
        <p style="color: #666;">הקישור יפוג תוקף בעוד שעה אחת.</p>
        <p style="color: #666;">אם לא ביקשת זאת, אתה יכול להתעלם מהודעה זו.</p>
        <hr />
        <p style="color: #999; font-size: 12px;">מערכת חמל העורף</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
