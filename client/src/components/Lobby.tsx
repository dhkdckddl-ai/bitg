import { useState } from 'react';
import { socketService } from '../socket';
import { RoomListItem } from '../types';

interface Props {
  rooms: RoomListItem[];
  playerId: string;
  nickname: string;
  inviteRoomId?: string | null;
  onNicknameChange: (name: string) => void;
  error: string | null;
  onDismissError: () => void;
  onRefresh: () => void;
}

export default function Lobby({
  rooms,
  playerId,
  nickname,
  inviteRoomId,
  onNicknameChange,
  error,
  onDismissError,
  onRefresh,
}: Props) {
  const [roomName, setRoomName] = useState('');
  const [joinNickname, setJoinNickname] = useState(nickname);
  const [tab, setTab] = useState<'create' | 'join'>(inviteRoomId ? 'join' : 'create');

  const handleCreate = () => {
    if (!nickname.trim() || !roomName.trim()) return;
    onNicknameChange(nickname.trim());
    socketService.createRoom(nickname.trim(), roomName.trim());
  };

  const handleJoin = (roomId: string) => {
    const name = joinNickname.trim() || nickname.trim();
    if (!name) return;
    onNicknameChange(name);
    socketService.joinRoom(roomId, name);
  };

  return (
    <div className="min-h-full bg-[var(--color-bg-primary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-yellow)]">
              <span className="text-lg font-bold text-black">₿</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BitG</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">비트코인 트레이딩 배틀</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            새로고침
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-5xl px-6">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-4 py-3">
            <span className="text-sm text-[var(--color-accent-red)]">{error}</span>
            <button onClick={onDismissError} className="text-[var(--color-accent-red)] hover:opacity-70">✕</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-8">
        {inviteRoomId && (
          <div className="mb-6 rounded-xl border border-[var(--color-accent-yellow)]/40 bg-[var(--color-accent-yellow)]/5 p-4">
            <p className="text-sm font-medium text-[var(--color-accent-yellow)]">친구 초대 링크로 접속했습니다!</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              닉네임을 입력하고 아래 방 목록에서 <strong>{inviteRoomId}</strong> 방에 입장하세요.
            </p>
          </div>
        )}
        <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
          <h2 className="mb-4 text-lg font-semibold">닉네임 설정</h2>
          <input
            type="text"
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder="게임에서 사용할 닉네임"
            maxLength={12}
            className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent-yellow)]"
          />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            닉네임은 로컬에 저장됩니다. 방 생성 및 입장 시 사용됩니다.
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('create')}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
              tab === 'create'
                ? 'bg-[var(--color-accent-yellow)] text-black'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            방 만들기
          </button>
          <button
            onClick={() => setTab('join')}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
              tab === 'join'
                ? 'bg-[var(--color-accent-yellow)] text-black'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            방 입장
          </button>
        </div>

        {tab === 'create' ? (
          <div className="animate-slide-up rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
            <h2 className="mb-4 text-lg font-semibold">새 방 만들기</h2>
            <div className="flex flex-col gap-4 sm:flex-row">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="방 이름"
                maxLength={20}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent-yellow)]"
              />
              <button
                onClick={handleCreate}
                disabled={!nickname.trim() || !roomName.trim()}
                className="rounded-lg bg-[var(--color-accent-yellow)] px-8 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                방 생성
              </button>
            </div>
            <div className="mt-6 rounded-lg bg-[var(--color-bg-tertiary)] p-4">
              <h3 className="mb-2 text-sm font-medium text-[var(--color-accent-yellow)]">게임 규칙</h3>
              <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                <li>• 시작 시드: 1,000만원 / BTC 시작가: 100만원</li>
                <li>• 총 10턴 · 최종 자산 1등 승리</li>
                <li>• 그래프 그리는 동안 다른 플레이어는 동시 배팅</li>
                <li>• 그래프 재생(약 75초) 중 다른 플레이어는 실시간 추가 매수·매도 가능</li>
                <li>• 그래프를 그린 사람은 해당 턴 매매 불가</li>
                <li>• 턴마다 최소 10만원 배팅 필수 (스킵 불가)</li>
                <li>• 잔액 0원 시 탈락 → 관전 모드</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
              <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">입장 닉네임</label>
              <input
                type="text"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                placeholder={nickname || '닉네임 입력'}
                maxLength={12}
                className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent-yellow)]"
              />
            </div>

            {rooms.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
                <p className="text-[var(--color-text-secondary)]">현재 열린 방이 없습니다</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">새 방을 만들어보세요!</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`flex items-center justify-between rounded-xl border p-4 transition ${
                      inviteRoomId === room.id
                        ? 'border-[var(--color-accent-yellow)] bg-[var(--color-accent-yellow)]/5'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        방장: {room.hostNickname} · {room.playerCount}/{room.maxPlayers}명 · ID: {room.id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoin(room.id)}
                        className="rounded-lg bg-[var(--color-accent-green)] px-5 py-2 text-sm font-medium text-white transition hover:brightness-110"
                      >
                        입장
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
