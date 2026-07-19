import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

const createSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(1).max(4000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
});

// GET: the current business's support tickets, newest activity first.
export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireAuth(request);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const supabase = await createServerClient(request);
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, lastMessageAt, lastMessageFrom, unreadForUser, createdAt')
    .eq('businessId', ctx.businessId)
    .order('lastMessageAt', { ascending: false })
    .limit(100);
  if (error) throw error;
  return NextResponse.json(data ?? []);
}

// POST: open a new ticket with its first message.
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireAuth(request);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a subject and a message.' }, { status: 400 });
  const supabase = await createServerClient(request);
  const now = new Date().toISOString();
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      businessId: ctx.businessId,
      subject: parsed.data.subject,
      priority: parsed.data.priority ?? 'NORMAL',
      status: 'OPEN',
      createdByStaffId: ctx.staffId,
      createdByName: ctx.name,
      createdByEmail: ctx.email,
      lastMessageAt: now,
      lastMessageFrom: 'USER',
      unreadForAdmin: true,
      unreadForUser: false,
    })
    .select('id')
    .single();
  if (error || !ticket) throw error ?? new Error('ticket-insert-failed');
  const { error: messageError } = await supabase.from('support_messages').insert({
    ticketId: ticket.id,
    businessId: ctx.businessId,
    senderType: 'USER',
    senderName: ctx.name,
    body: parsed.data.message,
  });
  if (messageError) throw messageError;
  return NextResponse.json({ id: ticket.id }, { status: 201 });
}
