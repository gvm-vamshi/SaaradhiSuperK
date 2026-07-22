const MANUAL = `You are the SuperK Mitra support chatbot for franchise grocery store partners in Andhra Pradesh, India.

RULES:
- Keep responses to 2-3 lines maximum
- Match the SP's language - if they write in Telugu, respond in Telugu. If English, respond in English. If mixed, respond in mixed.
- NEVER share product-wise margins
- NEVER commit delivery timelines (route-dependent)
- NEVER disclose POS replacement timelines
- NEVER disclose credit note SLA timelines to SP
- NEVER resolve or close tickets
- For store closure requests: say nothing about process, just acknowledge
- For MRP above billing: acknowledge as urgent
- For POS sync issues: WARN not to clear data
- If unsure, say: "We are looking into this and will update you shortly"

Return ONLY the reply text, nothing else. No prefixes, no labels, no markdown.`;

export async function generateBotReply(ticket: {
  category: string;
  sub_category: string;
  other_title: string | null;
  description: string;
  store_name: string;
  conversation_history?: string;
}): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    return 'Thank you for raising this. We are looking into it and will update you shortly.';
  }

  const subcat = ticket.other_title ? `Other: ${ticket.other_title}` : ticket.sub_category;
  const history = ticket.conversation_history ? `\nConversation so far:\n${ticket.conversation_history}` : '';

  const prompt = `New ticket from store: ${ticket.store_name}
Category: ${ticket.category} → ${subcat}
Description: ${ticket.description}${history}

Generate a short contextual reply (2-3 lines) for the store partner.`;

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: MANUAL }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
  });

  // Try all auth methods for AQ. keys
  const methods = [
    // Method 1: Bearer token auth
    {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      label: 'bearer-v1beta-flash',
    },
    // Method 2: x-goog-api-key header
    {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      label: 'header-v1beta-flash',
    },
    // Method 3: Query param
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      label: 'query-v1beta-flash',
    },
    // Method 4: v1 + Bearer
    {
      url: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      label: 'bearer-v1-flash',
    },
    // Method 5: flash-lite Bearer
    {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      label: 'bearer-v1beta-lite',
    },
    // Method 6: flash-lite x-goog-api-key
    {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      label: 'header-v1beta-lite',
    },
  ];

  for (const m of methods) {
    try {
      const response = await fetch(m.url, {
        method: 'POST',
        headers: m.headers,
        body,
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Gemini ${response.status} [${m.label}]: ${errBody.slice(0, 150)}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        console.log(`Gemini SUCCESS [${m.label}]`);
        return text;
      }
    } catch (err: any) {
      console.error(`Gemini fetch failed [${m.label}]:`, err?.message);
      continue;
    }
  }

  console.error('All Gemini methods failed');
  return 'Thank you for raising this. We are looking into it and will update you shortly.';
}