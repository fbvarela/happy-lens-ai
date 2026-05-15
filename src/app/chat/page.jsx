import { Suspense } from 'react';
import ChatPageClient from './ChatPageClient';

export const metadata = { title: 'Lens AI' };

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageClient />
    </Suspense>
  );
}
