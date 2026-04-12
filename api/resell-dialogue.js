export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.OPENAI_API_KEY) return res.json({ text: 'Hmm...' });

  const { botPersonality, itemName, mode, offerAmount, round } = req.body;

  const prompts = {
    offer:   `You want to buy the "${itemName}" for ${offerAmount} coins. Say so in character.`,
    ask:     `You want to know the price of "${itemName}". Ask in character.`,
    counter: `The seller wants ${offerAmount} coins for "${itemName}". Counter with a lower amount. Round ${round} of 3.`,
    accept:  `You just agreed to buy "${itemName}" for ${offerAmount} coins. React happily in character.`,
    reject:  `The price for "${itemName}" is too high. Say you're walking away.`,
    walk:    `You ran out of patience. Say you're leaving — brief, one sentence.`,
    browse:  `You just walked into a shop looking for "${itemName}". Ask if they have it — in character, under 12 words.`,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `${botPersonality} You are in a kids market stall game. Keep ALL responses family-friendly and under 15 words.` },
          { role: 'user', content: prompts[mode] ?? 'Say something in character.' },
        ],
        max_tokens: 60,
      }),
    });
    const data = await response.json();
    res.json({ text: data.choices?.[0]?.message?.content ?? 'Hmm...' });
  } catch {
    res.json({ text: 'Hmm...' });
  }
}
