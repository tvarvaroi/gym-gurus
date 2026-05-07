/**
 * Svix Test Helper — Sprint 4 Task 5a.10
 *
 * Reusable helper for signing webhook test fixtures with the same Svix
 * signing scheme the production verifier accepts. Mirrors the pattern
 * from server/test/routes/webhooks/wearables.test.ts (BATCH 5a) so the
 * bridge integration tests can reuse it without re-implementing.
 *
 * Why this helper exists (Task 5a.10):
 *   The bridge integration tests in server/test/services/wearableIngest.bridge.test.ts
 *   sign a webhook envelope with the real Svix secret, send it through the
 *   real webhook route (no verifier mock), and assert the bridge resolver
 *   correctly translates OW's UUID → our internal user UUID. Per
 *   `_brain/notes/gotchas.md` "Tests that mock at the system boundary mask
 *   identity-bridge bugs" — bypassing the verifier weakens the test.
 *
 * Format: whsec_<base64> — required by the Svix `Webhook` constructor.
 *   The literal value here is for tests only; do NOT use this as the
 *   production OPEN_WEARABLES_WEBHOOK_SECRET.
 */
import { Webhook } from 'svix';

export const TEST_WEBHOOK_SECRET =
  'whsec_' + Buffer.from('bridge-test-webhook-secret-32-ch').toString('base64');

export interface SignedEnvelope {
  body: string;
  headers: {
    'svix-id': string;
    'svix-timestamp': string;
    'svix-signature': string;
  };
}

/**
 * Sign a webhook envelope (OW's `{type, data}` shape) with the test secret.
 * Returns the body + headers ready to be sent via supertest.
 *
 * Signature is real — the production verifier (svix.Webhook.verify) will
 * accept this without modification when configured with TEST_WEBHOOK_SECRET.
 */
export function signEnvelope(
  envelope: object,
  secret: string = TEST_WEBHOOK_SECRET
): SignedEnvelope {
  const body = JSON.stringify(envelope);
  const wh = new Webhook(secret);
  const svixId = `bridge-msg-${Math.random().toString(36).slice(2, 10)}`;
  const ts = new Date();
  const signature = wh.sign(svixId, ts, body);
  return {
    body,
    headers: {
      'svix-id': svixId,
      'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'svix-signature': signature,
    },
  };
}
