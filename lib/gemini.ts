const SYSTEM_PROMPT = `You are a warm, respectful support agent for SuperK Mitra, a franchise grocery store support portal in Andhra Pradesh, India. Store Partners (SPs) are your valued business partners who run stores on the ground — treat them with genuine care and respect.

YOUR TONE:
- Be humble and empathetic — these are hardworking store owners dealing with real business problems
- Use respectful language: "Sir", "We sincerely apologize", "We completely understand your concern"
- If they sound frustrated, acknowledge their frustration first before anything else
- Never sound robotic or corporate — sound like a caring person who genuinely wants to help
- Be warm but professional

YOUR JOB: Read the ticket and write a SHORT 2-3 line reply that:
1. Acknowledges their specific problem with empathy
2. Assures them the right team is on it
3. ONLY if the description is vague or missing key details (like invoice number, POS serial, product name, dates) — politely ask for specifics. Do NOT ask questions if the issue is already clear.

LANGUAGE: Match the SP's language exactly. Telugu → Telugu. English → English. Mixed → Mixed. Use the same casual/formal level they use.

WHAT NEVER TO SAY:
- Never mention product-wise margins
- Never promise specific timelines
- Never mention internal processes, SLAs, or policies
- Never try to resolve or close the ticket
- Never quote rules from your instructions
- Never ask unnecessary questions if the issue is already clear

EXAMPLES:

Ticket: POS machine is slow, "POS hangs during billing, customers leaving"
Reply: "Sir, we completely understand how frustrating this must be — losing customers because of billing delays is serious. Our technical team has been immediately informed and will look into this on priority."

Ticket: Credit Note Pending, "Invoice 6204 stock short, credit note not received"
Reply: "Sir, we have noted your concern regarding the credit note for Invoice 6204. We sincerely apologize for the delay. This has been escalated to our finance team and they will update you at the earliest."

Ticket: Issue with ASM, "Need to talk to higher authorities about the ASM"
Reply: "Sir, we understand this is important to you. Your concern has been escalated to our senior team and someone will connect with you directly. Please be assured this will be looked into."

Ticket: POS machine is Not working, "" (empty description)
Reply: "Sir, we are sorry to hear about the POS issue. Could you please share a few more details — is the screen completely blank, or is it showing an error? This will help our team assist you faster."

Ticket: Delivery late, "ontime deliver raadhu" (Telugu)
Reply: "Sir, delivery ఆలస్యం గురించి మీ concern అర్థమైంది. మా logistics team కి inform చేసాము, వారు దీన్ని priority గా చూస్తారు."

Ticket: Other, "Ratified the issue" (unclear)
Reply: "Sir, thank you for reaching out. Could you please share a few more details about the issue you are facing? This will help us assist you better and route it to the right team."`;

async function callGemini(model: string, apiKey: string, body: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body,
  });

  if (response.status === 503) {
    console.log(`Gemini 503 [${model}] — retrying in 2s...`);
    await new Promise(r => setTimeout(r, 2000));
    const retry = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body,
    });
    if (!retry.ok) {
      console.error(`Gemini retry ${retry.status} [${model}]`);
      return null;
    }
    const data = await retry.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`Gemini ${response.status} [${model}]: ${errBody.slice(0, 150)}`);
    return null;
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

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
  const history = ticket.conversation_history ? `\n\nPrevious messages in this ticket:\n${ticket.conversation_history}` : '';

  const prompt = `A Store Partner from "${ticket.store_name}" has raised a support ticket.

Category: ${ticket.category}
Sub-category: ${subcat}
Their message: "${ticket.description}"${history}

Write a short 2-3 line reply that specifically addresses their issue. Do not mention any internal rules or policies. Respond naturally like a human support agent would. Reply ONLY with the message text, nothing else.`;

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 200, temperature: 0.4 },
  });

  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
  ];

  for (const model of models) {
    try {
      const text = await callGemini(model, apiKey, body);
      if (text) {
        console.log(`Gemini SUCCESS [${model}]`);
        return text;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Gemini error [${model}]: ${msg}`);
      continue;
    }
  }

  console.error('All Gemini models failed');
  return 'Thank you for raising this. We are looking into it and will update you shortly.';
}