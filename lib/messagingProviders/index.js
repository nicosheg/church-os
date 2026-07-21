import { sendMessage as metaSend } from './meta.js';

// Switch to another provider by changing the import above
export async function sendWhatsAppMessage(phone, message) {
  return await metaSend(phone, message);
}
