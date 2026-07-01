import { createContext, useContext, useRef, useState } from 'react';

const ChatContext = createContext(null);

// A default conversation seed used the first time a chat is opened.
const seedThread = () => [
  { id: 's1', mine: false, text: 'Lorem ipsum dolor sit amet consectetur. Vel viverra vivamus non', time: '10:30 AM' },
  { id: 's2', mine: true, text: 'Lorem ipsum dolor sit amet consectetur. Vel viverra vivamus non', time: '10:30 AM', seen: true },
  { id: 's3', mine: false, text: 'Lorem ipsum dolor sit amet consectetur. Vel viverra vivamus non', time: '10:30 AM' },
  { id: 's4', mine: true, text: 'Lorem ipsum dolor sit amet consectetur. Vel viverra vivamus non', time: '10:30 AM', seen: true },
  { id: 's5', mine: false, text: 'Lorem ipsum dolor sit amet consectetur.', time: '10:30 AM' },
];

const nowLabel = () => {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

export function ChatProvider({ children }) {
  const [threads, setThreads] = useState({}); // { [chatId]: Message[] }
  const [reactions, setReactions] = useState({}); // { "chatId::msgId": emoji }
  const nextId = useRef(1);

  const reactionKey = (chatId, msgId) => `${chatId}::${msgId}`;
  const getReaction = (chatId, msgId) => reactions[reactionKey(chatId, msgId)] || null;

  // Set a message's reaction, or clear it if the same emoji is tapped again.
  const setReaction = (chatId, msgId, emoji) =>
    setReactions((r) => {
      const k = reactionKey(chatId, msgId);
      const next = { ...r };
      if (next[k] === emoji) delete next[k];
      else next[k] = emoji;
      return next;
    });

  // Messages for a chat, seeding a default conversation on first access.
  const getThread = (chatId) => threads[chatId] || seedThread();

  const sendMessage = (chatId, text, replyTo = null) => {
    const body = text.trim();
    if (!body) return;
    setThreads((cur) => {
      const existing = cur[chatId] || seedThread();
      const msg = { id: `m${nextId.current++}`, mine: true, text: body, time: nowLabel(), seen: false, replyTo };
      return { ...cur, [chatId]: [...existing, msg] };
    });
  };

  // Append an image or video message (kind: 'image' | 'video').
  const sendMedia = (chatId, uri, kind) => {
    if (!uri) return;
    setThreads((cur) => {
      const existing = cur[chatId] || seedThread();
      const msg = { id: `m${nextId.current++}`, mine: true, type: kind, uri, time: nowLabel(), seen: false };
      return { ...cur, [chatId]: [...existing, msg] };
    });
  };

  // Append a recorded voice message (uri + duration in seconds).
  const sendVoice = (chatId, uri, duration) => {
    if (!uri) return;
    setThreads((cur) => {
      const existing = cur[chatId] || seedThread();
      const msg = {
        id: `m${nextId.current++}`,
        mine: true,
        type: 'voice',
        uri,
        duration,
        time: nowLabel(),
        seen: false,
      };
      return { ...cur, [chatId]: [...existing, msg] };
    });
  };

  return (
    <ChatContext.Provider
      value={{ getThread, sendMessage, sendVoice, sendMedia, getReaction, setReaction }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
}
