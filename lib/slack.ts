export async function notifySlack(ticket: {
    ticket_code: string;
    store_name: string;
    store_phone: string | null;
    category: string;
    sub_category: string;
    other_title: string | null;
    priority: string;
    description: string;
  }) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return; // silently skip if not configured
  
    const priorityEmoji: Record<string, string> = {
      Critical: '🔴',
      High: '🟠',
      Medium: '🟡',
      Low: '🟢',
    };
  
    const subcat = ticket.other_title ? `Other: ${ticket.other_title}` : ticket.sub_category;
    const emoji = priorityEmoji[ticket.priority] || '⚪';
  
    const text = [
      `${emoji} *New Ticket — ${ticket.ticket_code}*`,
      `*Store:* ${ticket.store_name}${ticket.store_phone ? ` · 📞 ${ticket.store_phone}` : ''}`,
      `*Category:* ${ticket.category} → ${subcat}`,
      `*Priority:* ${ticket.priority}`,
      ticket.description ? `*Description:* ${ticket.description.slice(0, 300)}` : '',
    ].filter(Boolean).join('\n');
  
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch {
      // Don't let Slack failures break ticket creation
      console.error('Slack notification failed');
    }
  }