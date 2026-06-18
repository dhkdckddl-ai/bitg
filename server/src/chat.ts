import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
}

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 200;

const roomChats = new Map<string, ChatMessage[]>();

export function getChatHistory(roomId: string): ChatMessage[] {
  return [...(roomChats.get(roomId) ?? [])];
}

export function addChatMessage(
  roomId: string,
  playerId: string,
  nickname: string,
  rawMessage: string
): ChatMessage | null {
  const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return null;

  const entry: ChatMessage = {
    id: uuidv4(),
    playerId,
    nickname,
    message,
    timestamp: Date.now(),
  };

  const history = roomChats.get(roomId) ?? [];
  history.push(entry);
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }
  roomChats.set(roomId, history);
  return entry;
}

export function clearRoomChat(roomId: string): void {
  roomChats.delete(roomId);
}
