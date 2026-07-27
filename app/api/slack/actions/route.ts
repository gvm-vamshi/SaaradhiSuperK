import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const BOT_ID = '00000000-0000-0000-0000-000000000000';

function verifySlack(raw: string, ts: string | null, sig: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !ts || !sig) return false;

  // Reject anything older than 5 minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const expected = 'v0=' + crypto
    .createHmac('sha256', secret)
    .update(`v0:${ts}:${raw}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifySlack(raw, req.headers.get('x-slack-request-timestamp'), req.headers.get('x-slack-signature'))) {
    return new Response('invalid signature', { status: 401 });
  }

  // Slack sends interactive payloads form-encoded
  const params = new URLSearchParams(raw);
  const payloadStr = params.get('payload');
  if (!payloadStr) return new Response('', { status: 200 });

  const payload = JSON.parse(payloadStr);
  if (payload.type !== 'block_actions') return new Response('', { status: 200 });

  const action = payload.actions?.[0];
  if (!action) return new Response('', { status: 200 });

  const ticketId = Number(action.value);
  const actionId: string = action.action_id;
  const slackUserId: string = payload.user?.id ?? '';

  // Pull the typed reply out of the message's input block state
  let replyText = '';
  const stateValues = payload.state?.values ?? {};
  for (const blockId of Object.keys(stateValues)) {
    const el = stateValues[blockId]?.reply_text;
    if (el?.value) { replyText = String(el.value).trim(); break; }
  }

  const db = admin();

  // Identify the SPOC by their Slack user ID
  const { data: spoc } = await db
    .from('spoc_assignments')
    .select('person_name')
    .eq('slack_user_id', slackUserId)
    .limit(1)
    .maybeSingle();

  const actorName = spoc?.person_name ?? 'SPOC';

  const { data: ticket } = await db
    .from('tickets')
    .select('id, ticket_code, first_response_at, store_code')
    .eq('id', ticketId)
    .single();

  if (!ticket) {
    await db.rpc('post_slack_confirmation', { p_text: `⚠️ Ticket not found (id ${ticketId}).` });
    return new Response('', { status: 200 });
  }

  const needsReply = actionId === 'send_message' || actionId === 'send_and_resolve';

  if (needsReply && !replyText) {
    await db.rpc('post_slack_confirmation', {
      p_text: `⚠️ <@${slackUserId}> — please type a reply before clicking *${actionId === 'send_and_resolve' ? 'Send & Resolve' : 'Send Message'}* on ${ticket.ticket_code}.`,
    });
    return new Response('', { status: 200 });
  }

  // 1. Insert the reply into the ticket conversation
  if (needsReply) {
    const { error: msgErr } = await db.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender_id: BOT_ID,
      sender_role: 'agent',
      body: replyText,
    });
    if (msgErr) {
      await db.rpc('post_slack_confirmation', {
        p_text: `❌ Failed to send message on ${ticket.ticket_code}: ${msgErr.message}`,
      });
      return new Response('', { status: 200 });
    }
  }

  // 2. Update ticket status
  const patch: Record<string, unknown> = {};
  if (actionId === 'send_and_resolve') {
    patch.status = 'Resolved';
    patch.resolved_at = new Date().toISOString();
  } else if (actionId === 'mark_in_progress') {
    patch.status = 'In Progress';
  } else if (actionId === 'send_message') {
    patch.status = 'In Progress';
  }
  if (!ticket.first_response_at) patch.first_response_at = new Date().toISOString();

  if (Object.keys(patch).length > 0) {
    await db.from('tickets').update(patch).eq('id', ticketId);
  }

  // 3. Confirm back in the Slack channel
  let confirmation: string;
  if (actionId === 'send_and_resolve') {
    confirmation = `✅ *${ticket.ticket_code}* resolved by ${actorName}\n> ${replyText.slice(0, 300)}`;
  } else if (actionId === 'send_message') {
    confirmation = `💬 *${ticket.ticket_code}* — reply sent by ${actorName}\n> ${replyText.slice(0, 300)}`;
  } else {
    confirmation = `🔄 *${ticket.ticket_code}* marked In Progress by ${actorName}`;
  }

  await db.rpc('post_slack_confirmation', { p_text: confirmation });

  return new Response('', { status: 200 });
}