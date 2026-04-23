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

  const response = await axios.post(
    INFORU_SMS_URL,
    {
      Data: {
        Message: message,
        Recipients: {
          PhoneNumber: phoneCsv,
        },
        Settings: {
          Sender: INFORU_SENDER,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: INFORU_BASE_CREDENTIALS,
      },
    }
  );

  const body = response.data;
  const succeeded: number = body?.Data?.SuccessCount ?? (body?.StatusId === 1 ? phones.length : 0);
  const failed: number = body?.Data?.FailedCount ?? (body?.StatusId !== 1 ? phones.length : 0);

  return {
    succeeded,
    failed,
    total: phones.length,
    statusDescription: body?.StatusDescription ?? '',
  };
}
