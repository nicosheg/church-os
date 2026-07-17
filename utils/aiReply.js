import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateReply(firstName, userSpeech, intent, turn) {
  const systemPrompt = `
You are Grace, a warm, empathetic AI assistant from a church.
Your ONLY role: check on a member who missed service, offer prayer, and ask if they want a pastor to contact them.
Keep responses under 25 words. Be kind and brief.
Today you are speaking to ${firstName}.
The member just said: "${userSpeech}"
Intent: ${intent}
Turn: ${turn}
Respond with exactly what Grace should say next.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'What should Grace say?' }
      ],
      max_tokens: 60,
      temperature: 0.7,
    });
    return completion.choices[0].message.content.trim();
  } catch (e) {
    // Fallback to simple reply
    const fallback = {
      sick: `I'm sorry to hear that. We'll pray for your recovery. Would you like a pastor to contact you?`,
      traveling: `Thank you for letting us know. Safe travels. We look forward to seeing you when you return.`,
      prayer_request: `We'd be honored to pray with you. I'll let the prayer team know.`,
      visit_request: `Certainly. I'll have someone reach out to you.`,
      default: `Thank you for sharing. Is there anything else we can pray about?`
    };
    return fallback[intent] || fallback.default;
  }
         }
