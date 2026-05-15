'use client';

import { useState, useRef, useEffect } from 'react';
import { SUGGESTED_QUESTIONS } from '@/lib/chat-config';

function pickSuggestions(n = 4) {
  return [...SUGGESTED_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, n);
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [suggestions] = useState(() => pickSuggestions(4));
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    if (!text.trim() || streaming) return;
    const history = messages.slice(-10);
    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok || !res.body) throw new Error('Chat request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.startsWith('\x00ERROR:')) throw new Error(chunk.slice(7));
        full += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: full };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-96">
      <div className="flex-1 overflow-y-auto mb-4 pr-1 space-y-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ask me anything about photography:</p>
            <div className="grid gap-2">
              {suggestions.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm rounded-lg px-4 py-2 w-full transition-colors"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--cream)';
                    e.currentTarget.style.borderColor = 'var(--bark-light)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.borderColor = 'var(--line)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] px-4 py-3 text-sm leading-relaxed rounded-2xl"
              style={msg.role === 'user'
                ? {
                    background: 'var(--bark)',
                    color: '#fff',
                    borderBottomRightRadius: '0.25rem',
                  }
                : {
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--line)',
                    borderBottomLeftRadius: '0.25rem',
                  }
              }
            >
              {!msg.content && streaming && msg.role === 'assistant' ? (
                <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Thinking…</span>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={e => { e.preventDefault(); sendMessage(input); }}
        className="flex gap-2"
        noValidate
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about photography…"
          disabled={streaming}
          aria-label="Chat message"
          className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none disabled:opacity-50"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            fontSize: '1rem',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--bark)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Send message"
          className="px-4 py-3 text-sm font-medium rounded-lg transition-colors min-w-11 min-h-11"
          style={{
            background: streaming || !input.trim() ? 'var(--line)' : 'var(--bark)',
            color: streaming || !input.trim() ? 'var(--text-muted)' : '#fff',
            border: 'none',
            cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
