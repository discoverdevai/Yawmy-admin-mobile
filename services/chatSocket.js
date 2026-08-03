// ============================================================
// Chat realtime — STOMP over the backend's /ws-chat endpoint.
//
// Two subscriptions, two jobs:
//   /topic/threads/{id}  — the conversation currently on screen
//   /user/queue/chat     — everything else, so the chat list can move a row to
//                          the top and bump its badge without that conversation
//                          being open. Topics are per-thread, so a list screen
//                          would otherwise need one subscription per row.
//
// The socket only ever *receives*. Sending goes over REST, which persists the
// message and then broadcasts it — so a message cannot be delivered to others
// without having been saved, and there is no second write path to keep correct.
// ============================================================

import { Client } from '@stomp/stompjs';
import { BASE_URL, getAccessToken, refreshAccessToken } from '../config/api';

// "https://host/api" → "wss://host/ws-chat"
function buildWsUrl(token) {
  const origin = BASE_URL.replace(/\/api\/?$/, '');
  const ws = origin.replace(/^http/, 'ws');
  // The handshake is a plain GET the WebSocket API builds itself, so there is no
  // way to set an Authorization header on it — the backend reads the token from
  // the query string instead (WebSocketConfig.JwtHandshakeInterceptor).
  return `${ws}/ws-chat?access_token=${encodeURIComponent(token)}`;
}

/**
 * Open a chat socket.
 *
 * @param {object} params
 * @param {(msg: object) => void} [params.onThreadMessage] a message in the subscribed thread
 * @param {(msg: object) => void} [params.onInboxMessage]  a message in any thread I'm in
 * @param {(connected: boolean) => void} [params.onConnectionChange]
 * @returns {{ subscribeToThread, unsubscribeFromThread, disconnect, isConnected }}
 */
export function connectChatSocket({
  onThreadMessage,
  onInboxMessage,
  onConnectionChange,
} = {}) {
  let client = null;
  let threadSub = null;
  let inboxSub = null;
  let currentThreadId = null;
  let disposed = false;

  const parse = (frame, handler) => {
    try {
      handler?.(JSON.parse(frame.body));
    } catch (e) {
      console.warn('[chatSocket] unreadable frame:', e.message);
    }
  };

  function build(token) {
    const stomp = new Client({
      brokerURL: buildWsUrl(token),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {}, // switch to console.log when diagnosing
    });

    stomp.onConnect = () => {
      onConnectionChange?.(true);
      inboxSub = stomp.subscribe('/user/queue/chat', (f) => parse(f, onInboxMessage));
      // Reconnects land here too, so a thread opened before the drop is
      // resubscribed without the screen having to notice the socket bounced.
      if (currentThreadId) {
        threadSub = stomp.subscribe(`/topic/threads/${currentThreadId}`, (f) =>
          parse(f, onThreadMessage)
        );
      }
    };

    stomp.onWebSocketClose = () => {
      threadSub = null;
      inboxSub = null;
      onConnectionChange?.(false);
    };

    // A rejected handshake means the token expired while the socket was open.
    // One refresh and one rebuild; if that fails, the REST layer's own 401
    // handling will end the session on the next request.
    stomp.onWebSocketError = async () => {
      onConnectionChange?.(false);
      if (disposed) return;
      const fresh = await refreshAccessToken();
      if (fresh && !disposed) {
        try {
          stomp.deactivate();
        } catch {
          /* already down */
        }
        client = build(fresh);
        client.activate();
      }
    };

    stomp.onStompError = (frame) => {
      console.warn('[chatSocket] STOMP error:', frame.headers?.message);
    };

    return stomp;
  }

  const token = getAccessToken();
  if (token) {
    client = build(token);
    client.activate();
  } else {
    // No session yet. The screens fall back to polling, so this is quiet rather
    // than fatal — signing in and reopening the screen builds a socket.
    onConnectionChange?.(false);
  }

  return {
    /** Listen to one conversation. Replaces any previous thread subscription. */
    subscribeToThread(threadId) {
      currentThreadId = threadId;
      if (!client?.connected || !threadId) return;
      threadSub?.unsubscribe();
      threadSub = client.subscribe(`/topic/threads/${threadId}`, (f) => parse(f, onThreadMessage));
    },

    unsubscribeFromThread() {
      currentThreadId = null;
      try {
        threadSub?.unsubscribe();
      } catch {
        /* socket already gone */
      }
      threadSub = null;
    },

    disconnect() {
      disposed = true;
      try {
        threadSub?.unsubscribe();
        inboxSub?.unsubscribe();
        client?.deactivate();
      } catch {
        /* nothing to close */
      }
      client = null;
    },

    isConnected() {
      return !!client?.connected;
    },
  };
}
