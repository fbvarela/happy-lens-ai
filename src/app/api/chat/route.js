import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { SYSTEM_PROMPT } from '@/lib/chat-config';

export const runtime = 'nodejs';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { message, history = [] } = await req.json();
    if (!message?.trim()) {
      return Response.json({ error: 'message required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamText({
            model: groq('llama-3.3-70b-versatile'),
            system: SYSTEM_PROMPT,
            messages: [
              ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: message },
            ],
            maxTokens: 800,
          });
          for await (const chunk of (await result).textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error';
          controller.enqueue(encoder.encode(`\x00ERROR:${msg}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json({ error: 'Chat failed' }, { status: 500 });
  }
}
