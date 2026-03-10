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

export async function sendWelcomeEmail(to: string, firstName: string, setupUrl: string): Promise<void> {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: 'ברוך הבא למערכת - חמל העורף',
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>שלום ${firstName || ''},</h2>
        <p>נוצר עבורך חשבון במערכת <strong>חמל העורף</strong>.</p>
        <p>כתובת הכניסה שלך: <strong>${to}</strong></p>
        <p>לחץ על הכפתור להלן להגדרת הסיסמה שלך:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${setupUrl}" style="background-color: #0891b2; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 15px;">
            הגדר סיסמה
          </a>
        </p>
        <p style="color: #666;">הקישור יפוג תוקף בעוד שעה אחת.</p>
        <hr />
        <p style="color: #999; font-size: 12px;">מערכת חמל העורף</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
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
