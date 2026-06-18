# BitG - 비트코인 트레이딩 배틀 게임

친구 4~5명과 온라인으로 플레이하는 멀티플레이어 게임입니다.

## ⚠️ 중요: Netlify만으로는 안 됩니다

| 역할 | 호스팅 | 이유 |
|------|--------|------|
| **게임 화면** | **Netlify** | HTML/React 정적 파일 |
| **게임 서버** | **Render** (무료) | 실시간 멀티플레이어(WebSocket) |

Netlify는 **웹페이지만** 올릴 수 있습니다.  
친구들과 실시간으로 연결하려면 **서버가 24시간 켜져 있어야** 하므로 Render에 서버를 따로 배포합니다.

---

## 배포 순서 (최초 1회)

### 1단계: GitHub에 코드 올리기

1. https://github.com 에서 새 저장소(repository) 생성
2. 이 `bitg` 폴더를 GitHub에 push

### 2단계: 게임 서버 배포 (Render)

1. https://render.com 가입 (GitHub 연동)
2. **New → Blueprint** 또는 **New → Web Service**
3. GitHub 저장소 연결
4. `render.yaml`이 있으면 자동 설정됨. 없으면 수동 설정:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. **Environment Variables** 추가:
   ```
   CLIENT_ORIGIN = https://your-site.netlify.app
   ```
   (Netlify 주소는 3단계 후 알게 되므로, 일단 `*` 로 두었다가 나중에 수정해도 됩니다)
6. 배포 완료 후 서버 URL 확인  
   예: `https://bitg-server.onrender.com`

### 3단계: 게임 화면 배포 (Netlify)

1. https://app.netlify.com 가입 (GitHub 연동)
2. **Add new site → Import an existing project**
3. GitHub 저장소 선택
4. 빌드 설정 (netlify.toml이 자동 적용됨):
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
5. **Environment Variables** 추가:
   ```
   VITE_SOCKET_URL = https://bitg-server.onrender.com
   ```
   (2단계에서 받은 Render 서버 주소)
6. **Deploy** 클릭
7. Netlify URL 확인  
   예: `https://bitg-game.netlify.app`

### 4단계: Render CORS 설정 업데이트

Render 대시보드 → Environment Variables:

```
CLIENT_ORIGIN = https://bitg-game.netlify.app
```

저장 후 서버가 재시작됩니다.

---

## 친구들과 플레이하는 방법

1. **방장**: Netlify URL 접속 → 닉네임 설정 → 방 만들기
2. **방장**: **「친구 초대」** 버튼 클릭 → 링크 복사
3. **친구들**: 카톡/디스코드로 받은 링크 클릭 → 닉네임 입력 → 입장
4. **방장**: 2명 이상 모이면 **「게임 시작」**

최대 **8명**까지 한 방에 입장 가능 (4~5명 플레이에 충분).

### 초대 링크 예시

```
https://bitg-game.netlify.app/?room=a1b2c3d4
```

친구는 이 링크만 열면 해당 방으로 바로 입장할 수 있습니다.

---

## 로컬 개발 (선택)

```bash
npm run install:all
npm run dev
```

- 화면: http://localhost:5173
- 서버: http://localhost:3001

---

## 게임 규칙

- 시작 시드: 1,000만원 / BTC 시작가: 100만원
- 턴마다 한 명이 ±50% 범위 내 24시간 그래프를 그림
- 나머지는 롱/숏/레버리지(최대 100배) 배팅 (최소 10만원)
- 10%~100% 부분 매도, 청산, 0원 탈락(관전)

---

## Render 무료 플랜 참고

- 15분간 접속 없으면 서버가 **잠들 수 있음**
- 첫 접속 시 30초~1분 정도 깨어나는 시간 필요
- 친구들에게 "첫 접속은 조금 느릴 수 있다"고 안내

유료 플랜($7/월)을 쓰면 항상 켜져 있습니다.

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| 서버 연결 안 됨 | Netlify `VITE_SOCKET_URL` 확인, Render 서버 실행 중인지 확인 |
| CORS 오류 | Render `CLIENT_ORIGIN`에 Netlify URL 정확히 입력 |
| 방이 안 보임 | 새로고침, Render 서버 깨우기 (URL 직접 접속) |
| 재접속 시 게임 복구 | 같은 브라우저 사용 (playerId 자동 저장) |
