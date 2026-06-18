import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  currentPlayerId: string;
  onSend: (message: string) => void;
}

export default function ChatPanel({ messages, currentPlayerId, onSend }: Props) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg transition hover:border-[var(--color-accent-yellow)] hover:bg-[var(--color-bg-hover)]"
        title="채팅 열기"
      >
        <span className="text-xl">💬</span>
        {messages.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-yellow)] text-[9px] font-bold text-black">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-80 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-semibold">💬 채팅</span>
        <button
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-hover)]"
        >
          닫기
        </button>
      </div>

      <div ref={listRef} className="flex h-52 flex-col gap-2 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-text-secondary)]">
            메시지를 입력해 대화를 시작하세요
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.playerId === currentPlayerId;
            return (
              <div key={msg.id} className={`text-xs ${isMe ? 'text-right' : ''}`}>
                <span className={`font-semibold ${isMe ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-accent-blue)]'}`}>
                  {msg.nickname}
                </span>
                <span className="ml-1.5 text-[10px] text-[var(--color-text-secondary)]">
                  {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="mt-0.5 break-words text-[var(--color-text-primary)]">{msg.message}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 border-t border-[var(--color-border)] p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="메시지 입력..."
          maxLength={200}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-xs outline-none focus:border-[var(--color-accent-yellow)]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="rounded-lg bg-[var(--color-accent-yellow)] px-3 py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </div>
  );
}
