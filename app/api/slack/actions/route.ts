import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const BOT_ID = '00000000-0000-0000-0000-000000000000';

export async function GET() {
  return new Response('slack actions route alive', { status: 200 });
}

function verifySlack(raw: string, ts: string | null, sig: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) { console.error('SLACK: signing secret missing'); return false; }
  if (!ts || !sig) { console.error('SLACK: missing ts/sig headers'); return false; }
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) { console.error('SLACK: timestamp too old'); return false; }

  const expected = 'v0=' + crypto.createHmac('sha256', secret).update(`v0:${ts}:${raw}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) { console.error('SLACK: sig length mismatch'); return false; }
  const ok = crypto.timingSafeEqual(a, b);
  if (!ok) console.error('SLACK: sig mismatch');
  return ok;
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  console.log('SLACK: POST received');

  const raw = await req.text();
  console.log('SLACK: body length', raw.length);

  if (!verifySlack(raw, req.headers.get('x-slack-request-timestamp'), req.headers.get('x-slack-signature'))) {
    console.error('SLACK: signature verification FAILED');
    return new Response('invalid signature', { status: 401 });
  }
  console.log('SLACK: signature OK');

  const params = new URLSearchParams(raw);
  const payloadStr = params.get('payload');
  if (!payloadStr) { console.log('SLACK: no payload param'); return new Response('', { status: 200 }); }

  const payload = JSON.parse(payloadStr);
  console.log('SLACK: type', payload.type);
  if (payload.type !== 'block_actions') return new Response('', { status: 200 });

  const action = payload.actions?.[0];
  if (!action) return new Response('', { status: 200 });

  const ticketId = Number(action.value);
  const actionId: string = action.action_id;
  const slackUserId: string = payload.user?.id ?? '';
  console.log('SLACK: action', actionId, 'ticket', ticketId, 'user', slackUserId);

  let replyText = '';
  const stateValues = payload.state?.values ?? {};
  for (const blockId of Object.keys(stateValues)) {
    const el = stateValues[blockId]?.reply_text;
    if (el?.value) { replyText = String(el.value).trim(); break; }
  }

  const db = admin();

  const { data: spoc } = await db
    .from('spoc_assignments').select('person_name')
    .eq('slack_user_id', slackUserId).limit(1).maybeSingle();
  const actorName = spoc?.person_name ?? 'SPOC';

  const { data: ticket, error: tErr } = await db
    .from('tickets').select('id, ticket_code, first_response_at, status').eq('id', ticketId).single();

  if (tErr || !ticket) {
    console.error('SLACK: ticket lookup failed', tErr?.message);
    await db.rpc('post_slack_confirmation', { p_text: `⚠️ Ticket not found (id ${ticketId}).` });
    return new Response('', { status: 200 });
  }

  if (ticket.status === 'Resolved') {
    await db.rpc('post_slack_confirmation', {
      p_text: `ℹ️ *${ticket.ticket_code}* is already resolved. This action was ignored.`,
    });
    return new Response('', { status: 200 });
  }

  const needsReply = actionId === 'send_message' || actionId === 'send_and_resolve';

  if (needsReply && !replyText) {
    await db.rpc('post_slack_confirmation', {
      p_text: `⚠️ <@${slackUserId}> — please type a reply before clicking that button on ${ticket.ticket_code}.`,
    });
    return new Response('', { status: 200 });
  }

  if (needsReply) {
    const { error: msgErr } = await db.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender_id: BOT_ID,
      sender_role: 'agent',
      body: replyText,
    });
    if (msgErr) {
      console.error('SLACK: insert failed', msgErr.message);
      await db.rpc('post_slack_confirmation', {
        p_text: `❌ Failed to send on ${ticket.ticket_code}: ${msgErr.message}`,
      });
      return new Response('', { status: 200 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (actionId === 'send_and_resolve') {
    patch.status = 'Resolved';
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.status = 'In Progress';
  }
  if (!ticket.first_response_at) patch.first_response_at = new Date().toISOString();
  await db.from('tickets').update(patch).eq('id', ticketId);

  const confirmation =
    actionId === 'send_and_resolve'
      ? `✅ *${ticket.ticket_code}* resolved by ${actorName}\n> ${replyText.slice(0, 300)}`
      : actionId === 'send_message'
      ? `💬 *${ticket.ticket_code}* — reply sent by ${actorName}\n> ${replyText.slice(0, 300)}`
      : `🔄 *${ticket.ticket_code}* marked In Progress by ${actorName}`;

  await db.rpc('post_slack_confirmation', { p_text: confirmation });
  console.log('SLACK: done');

  return new Response('', { status: 200 });
}