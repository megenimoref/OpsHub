import axios from 'axios';

const INFORU_SMS_URL = 'https://capi.inforu.co.il/api/v2/SMS/SendSms';
const INFORU_BASE_CREDENTIALS = process.env.INFORU_BASE_CREDENTIALS || 'Basic c2FnaWJvOmM3ZDBkYzQwLWM5ZmEtNGY5Ni1hYzlkLWM0ZmExMDcyODU4OA==';
const INFORU_SENDER = process.env.INFORU_SENDER || 'Megenim';

export interface SmsSendResult {
  succeeded: number;
  failed: number;
  total: number;
  statusDescription: string;
}

// Normalize Israeli phone: strip non-digits, convert 0XXXXXXXXX → 972XXXXXXXXX
function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return digits;
}

export async function sendBulkSms(phones: string[], message: string): Promise<SmsSendResult> {
  // Inforu v2 expects PhoneNumber as a comma-separated STRING, not an array.
  const normalized = phones.map(normalizePhone).filter((p) => p.length >= 10);
  const phoneCsv = normalized.join(',');

  const payload = {
    Data: {
      Message: message,
      Recipients: {
        PhoneNumber: phoneCsv,
      },
      Settings: {
        Sender: INFORU_SENDER,
      },
    },
  };

  // eslint-disable-next-line no-console
  console.log('[smsService] → Inforu request:', JSON.stringify({
    url: INFORU_SMS_URL,
    sender: INFORU_SENDER,
    phoneCount: normalized.length,
    phoneCsv: phoneCsv.slice(0, 120),
    messageLength: message.length,
    messagePreview: message.slice(0, 80),
  }));

  try {
    const response = await axios.post(INFORU_SMS_URL, payload, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: INFORU_BASE_CREDENTIALS,
      },
      // Accept any status so we can read Inforu's error body instead of throwing
      validateStatus: () => true,
    });

    // eslint-disable-next-line no-console
    console.log('[smsService] ← Inforu response:', JSON.stringify({
      httpStatus: response.status,
      body: response.data,
    }));

    if (response.status >= 400) {
      const msg = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
      throw new Error(`Inforu HTTP ${response.status}: ${msg.slice(0, 500)}`);
    }

    const body = response.data;
    const succeeded: number = body?.Data?.SuccessCount ?? (body?.StatusId === 1 ? phones.length : 0);
    const failed: number = body?.Data?.FailedCount ?? (body?.StatusId !== 1 ? phones.length : 0);

    return {
      succeeded,
      failed,
      total: phones.length,
      statusDescription: body?.StatusDescription ?? '',
    };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[smsService] Inforu request failed:', err?.message || err);
    throw err;
  }
}
