'use client';
import ChatInterface from '@/components/chat/ChatInterface';

export default function ChatPageClient() {
  return (
    <div className="p-6 flex flex-col" style={{ height: 'calc(100dvh - 112px)' }}>
      <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Lens AI</h1>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
