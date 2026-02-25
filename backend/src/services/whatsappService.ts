import axios from 'axios';

const GREEN_API_URL = 'https://api.green-api.com';

function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '972' + digits.slice(1);
  }
  return digits;
}

export interface SendResult {
  phone: string;
  success: boolean;
  error?: string;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<SendResult> {
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiToken = process.env.GREEN_API_TOKEN;

  if (!idInstance || !apiToken) {
    return { phone, success: false, error: 'Green API credentials not configured' };
  }

  const internationalPhone = toInternationalPhone(phone);
  const url = `${GREEN_API_URL}/waInstance${idInstance}/sendMessage/${apiToken}`;

  try {
    await axios.post(url, {
      chatId: `${internationalPhone}@c.us`,
      message,
    });
    return { phone, success: true };
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
    return { phone, success: false, error: errorMsg };
  }
}

export async function sendBulkWhatsApp(
  phones: string[],
  message: string,
  delayMs = 500
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (const phone of phones) {
    const result = await sendWhatsAppMessage(phone, message);
    results.push(result);

    if (phone !== phones[phones.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
