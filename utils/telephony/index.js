import { placeCall } from './providers/whatsapp-local';

export async function initiateFollowUpCall(member, escalate = false, customMessage = null) {
  return await placeCall(member, escalate, customMessage);
}
