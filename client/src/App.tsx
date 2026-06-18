import { useEffect, useState, useCallback } from 'react';
import { socketService, getRoomIdFromUrl } from './socket';
import { PublicRoomState, RoomListItem } from './types';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

export default function App() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [currentRoom, setCurrentRoom] = useState<PublicRoomState | null>(null);
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
        setError('방이 삭제되었습니다');
        socketService.getRooms();
      },
      onRoomLeft: () => {
        setCurrentRoom(null);
        socketService.getRooms();
      },
      onError: ({ message }) => setError(message),
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
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-accent-yellow)] border-t-transparent" />
          <p className="text-[var(--color-text-secondary)]">서버 연결 중...</p>
        </div>
      </div>
    );
  }

  if (currentRoom) {
    return (
      <GameRoom
        room={currentRoom}
        playerId={playerId}
        error={error}
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
