import { useEffect, useState, useCallback } from 'react';
import { socketService, getRoomIdFromUrl } from './socket';
import { PublicRoomState, RoomListItem, ChatMessage } from './types';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

export default function App() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [currentRoom, setCurrentRoom] = useState<PublicRoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState(() => localStorage.getItem('bitg_nickname') || '');
  const [inviteRoomId] = useState(() => getRoomIdFromUrl());

  useEffect(() => {
    socketService.connect({
      onConnected: ({ playerId: id }) => {
        setPlayerId(id);
        socketService.getRooms();
      },
      onRoomsList: setRooms,
      onRoomJoined: (room) => {
        setCurrentRoom(room);
        setError(null);
        window.history.replaceState({}, '', window.location.pathname);
      },
      onRoomUpdate: setCurrentRoom,
      onRoomDeleted: () => {
        setCurrentRoom(null);
        setChatMessages([]);
        setError('방이 삭제되었습니다');
        socketService.getRooms();
      },
      onRoomLeft: () => {
        setCurrentRoom(null);
        setChatMessages([]);
        socketService.getRooms();
      },
      onError: ({ message }) => setError(message),
      onChatHistory: setChatMessages,
      onChatMessage: (message) => {
        setChatMessages((prev) => [...prev, message].slice(-100));
      },
    });

    return () => socketService.disconnect();
  }, []);

  const handleNicknameChange = useCallback((name: string) => {
    setNickname(name);
    localStorage.setItem('bitg_nickname', name);
  }, []);

  const dismissError = () => setError(null);

  if (!playerId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-accent-yellow)] border-t-transparent" />
        <p className="text-[var(--color-text-secondary)]">서버 연결 중...</p>
        <p className="max-w-md text-xs text-[var(--color-text-secondary)]">
          Render 무료 서버는 첫 접속 시 30~60초 걸릴 수 있습니다.
        </p>
        {error && (
          <div className="max-w-md rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-4 py-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (currentRoom) {
    return (
      <GameRoom
        room={currentRoom}
        playerId={playerId}
        error={error}
        chatMessages={chatMessages}
        onDismissError={dismissError}
        onLeave={() => {
          socketService.leaveRoom(currentRoom.id);
        }}
      />
    );
  }

  return (
    <Lobby
      rooms={rooms}
      playerId={playerId}
      nickname={nickname}
      inviteRoomId={inviteRoomId}
      onNicknameChange={handleNicknameChange}
      error={error}
      onDismissError={dismissError}
      onRefresh={() => socketService.getRooms()}
    />
  );
}
