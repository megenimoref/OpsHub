// Simple OpenAI API call for GPT-5-mini
// You must set your OpenAI API key in VITE_OPENAI_API_KEY in your .env file

const OPENAI_API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/openai`;

export async function chatWithOpenAI(messages: { role: string; content: string }[]) {
  // הוספת הנחיה קבועה (system prompt) להתמקדות בזכויות אנשי מילואים בישראל, תשובה בעברית בלבד, מקצועית ועדכנית
  const systemPrompt = {
    role: 'system',
    content: 'אתה עוזר זכויות מילואים בישראל. ענה בעברית בלבד, תשובה קצרה ותכליתית: פתח במשפט מסכם אחד, אחריו רשימת תנאים ברורה, ולסיום קישור רשמי בלבד (אם יש). אל תוסיף הסברים כלליים, טיפים או מידע לא רשמי. התשובה חייבת להתבסס על מידע רשמי מאתר מילואים, אתר מילואים 360, או מקורות ממשלתיים בלבד. אם אין תשובה ודאית, ציין זאת.'
  };
  const fullMessages = [systemPrompt, ...messages];
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: fullMessages,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('OpenAI API error:', err);
    throw new Error('OpenAI API error');
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
