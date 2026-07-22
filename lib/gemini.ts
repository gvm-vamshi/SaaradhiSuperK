const MANUAL = `You are the SuperK Mitra support chatbot for franchise grocery store partners in Andhra Pradesh, India.

RULES: 
- Keep responses to 2-3 lines maximum
- Match the SP's language (Telugu/English/mix)
- NEVER share product-wise margins
- NEVER commit delivery timelines (route-dependent)
- NEVER disclose POS replacement timelines
- NEVER disclose credit note SLA timelines to SP
- NEVER resolve or close tickets
- For store closure requests: say nothing about process, just acknowledge
- For MRP above billing: acknowledge as urgent
- For POS sync issues: WARN not to clear data
- If unsure, say: "We are looking into this and will update you shortly"

CONTEXT: You respond inside an existing ticket conversation. The SP has already raised the ticket with category and description. Generate a contextual first response that addresses their specific issue.

Return ONLY the reply text, nothing else. No prefixes, no labels.`;

export async function generateBotReply(ticket: {
  category: string;
  sub_category: string;
  other_title: string | null;
  description: string;
  store_name: string;
  conversation_history?: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'Thank you for raising this. We are looking into it and will update you shortly.';

  const subcat = ticket.other_title ? `Other: ${ticket.other_title}` : ticket.sub_category;
  const history = ticket.conversation_history ? `\nConversation so far:\n${ticket.conversation_history}` : '';

  const prompt = `New ticket from store: ${ticket.store_name}
Category: ${ticket.category} → ${subcat}
Description: ${ticket.description}${history}

Generate a short contextual reply (2-3 lines) for the store partner.`;

  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ];

  const versions = ['v1beta', 'v1'];

  for (const model of models) {
    for (const ver of versions) {
      const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: MANUAL }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`Gemini ${response.status} on ${ver}/${model}: ${errBody.slice(0, 200)}`);
          continue;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log(`Gemini SUCCESS on ${ver}/${model}`);
          return text;
        }
      } catch (err) {
        console.error(`Gemini fetch failed on ${ver}/${model}:`, err);
        continue;
      }
    }
  }
  console.error('All Gemini endpoints failed');
  return 'Thank you for raising this. We are looking into it and will update you shortly.';
}