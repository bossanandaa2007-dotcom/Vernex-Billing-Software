import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { writeSuperAdminAudit } from '@/services/super-admin/admin-audit.server';

const schema = z.object({
  message: z.string().trim().min(1).max(4000).optional(),
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
}).refine((value) => value.message !== undefined || value.status !== undefined, {
  message: 'Provide a reply or a status change.',
});

// Admin replies to a ticket and/or changes its status. Uses the privileged
// service-role client (cross-tenant) after verifying the super admin.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide a reply or a status change.' }, { status: 400 });
  const { id } = await params;
  try {
    const supabase = createPrivilegedSupabase();
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, businessId')
      .eq('id', id)
      .maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

    const { message, status } = parsed.data;
    const update: Record<string, unknown> = {};

    if (message) {
      const { error: messageError } = await supabase.from('support_messages').insert({
        ticketId: id,
        businessId: ticket.businessId,
        senderType: 'ADMIN',
        senderName: 'Vernex Support',
        body: message,
      });
      if (messageError) throw messageError;
      update.lastMessageAt = new Date().toISOString();
      update.lastMessageFrom = 'ADMIN';
      update.unreadForUser = true;
      update.unreadForAdmin = false;
      // A reply without an explicit status moves the ticket to "awaiting user".
      if (status === undefined) update.status = 'PENDING';
    }
    if (status !== undefined) update.status = status;

    const { error: updateError } = await supabase.from('support_tickets').update(update).eq('id', id);
    if (updateError) throw updateError;

    await writeSuperAdminAudit({
      businessId: ticket.businessId,
      action: message ? 'SUPPORT_REPLY' : 'SUPPORT_STATUS',
      entityType: 'SupportTicket',
      entityId: id,
      description: message ? 'Replied to a support ticket.' : `Changed support ticket status to ${status}.`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to manage support.'
      : 'Unable to update this ticket.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
