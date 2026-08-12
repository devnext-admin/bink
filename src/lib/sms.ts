// Transactional SMS through the send-sms edge function (Taqnyat). The
// function messages the caller's own registered phone only; when SMS is not
// configured or the account has no phone it fails silently - SMS is a
// nice-to-have layered on top of in-app notifications, never a blocker.

import { getSupabase } from './supabase';

export function sendSmsToSelf(text: string): void {
  const sb = getSupabase();
  if (!sb) return;
  sb.functions.invoke('send-sms', { body: { text } }).catch(() => {});
}
