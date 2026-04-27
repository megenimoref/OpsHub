import axios from 'axios';

// Green API now provisions an instance-specific subdomain (e.g.
// https://7103.api.greenapi.com) instead of the shared api.green-api.com
// host. We resolve the base URL in this order:
//   1. GREEN_API_URL env var (explicit override)
//   2. https://<idInstance>.api.green-api.com (auto-derived from instance id)
//   3. https://api.green-api.com (legacy fallback)
function resolveApiBaseUrl(idInstance: string): string {
  if (process.env.GREEN_API_URL) {
    return process.env.GREEN_API_URL.replace(/\/+$/, '');
  }
  if (idInstance) {
    return `https://${idInstance}.api.green-api.com`;
  }
  return 'https://api.green-api.com';
}

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
  // Accept both names: GREEN_API_TOKEN (existing) and
  // GREEN_API_TOKEN_INSTANCE (matches Green API's docs / control panel
  // label "apiTokenInstance"), so admins copy-pasting from either source
  // get a working config without surprises.
  const apiToken = process.env.GREEN_API_TOKEN || process.env.GREEN_API_TOKEN_INSTANCE;

  if (!idInstance || !apiToken) {
    return { phone, success: false, error: 'Green API credentials not configured' };
  }

  const internationalPhone = toInternationalPhone(phone);
  const baseUrl = resolveApiBaseUrl(idInstance);
  const url = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiToken}`;

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
