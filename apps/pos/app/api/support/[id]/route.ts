import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

const replySchema = z.object({ message: z.string().trim().min(1).max(4000) });

// GET: a ticket and its full message thread. Viewing clears the user's unread flag.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireAuth(request);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const { id } = await params;
  const supabase = await createServerClient(request);
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, lastMessageFrom, createdAt')
    .eq('businessId', ctx.businessId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  const { data: messages, error: messagesError } = await supabase
    .from('support_messages')
    .select('id, senderType, senderName, body, createdAt')
    .eq('ticketId', id)
    .order('createdAt', { ascending: true });
  if (messagesError) throw messagesError;
  // Best-effort: mark the thread read for the user now that they've opened it.
  void supabase.from('support_tickets').update({ unreadForUser: false }).eq('id', id).then(() => undefined, () => undefined);
  return NextResponse.json({ ticket, messages: messages ?? [] });
}

// POST: the user adds a reply to the thread. A reply reopens a resolved/closed ticket.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireAuth(request);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const { id } = await params;
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a message.' }, { status: 400 });
  const supabase = await createServerClient(request);
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('id, status')
    .eq('businessId', ctx.businessId)
    .eq('id', id)
    .maybeSingle();
  if (ticketError) throw ticketError;
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  const { error: messageError } = await supabase.from('support_messages').insert({
    ticketId: id,
    businessId: ctx.businessId,
    senderType: 'USER',
    senderName: ctx.name,
    body: parsed.data.message,
  });
  if (messageError) throw messageError;
  const reopened = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      lastMessageAt: new Date().toISOString(),
      lastMessageFrom: 'USER',
      unreadForAdmin: true,
      unreadForUser: false,
      ...(reopened ? { status: 'OPEN' } : {}),
    })
    .eq('id', id);
  if (updateError) throw updateError;
  return NextResponse.json({ success: true });
}
