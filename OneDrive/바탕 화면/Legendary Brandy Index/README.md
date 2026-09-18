# Legendary Brandy Index

2주(격주) 주기로 글로벌 브랜디·코냑 시세 변동을 보여주는 **정적 PWA 프런트엔드 + Netlify Functions 백엔드**.
프런트엔드는 빌드 도구 없이 `index.html` 하나로 동작하며, 시세 데이터는 Netlify Functions API에서 가져옵니다
(API가 없으면 하드코딩된 폴백 데이터로 동작).

```
Legendary Brandy Index/
├─ index.html              # 앱 전체 (마크업 + 스타일 + 로직, API에서 시세 fetch)
├─ admin.html              # 관리자용 시세 갱신 페이지 (2주 주기 입력)
├─ contact.html            # 제휴 문의 폼 (Formspree 연동)
├─ landing.html            # 소개 페이지
├─ netlify/functions/
│  └─ prices.js            # 시세 조회(GET)·갱신(POST, 관리자 인증) API
├─ netlify.toml            # Netlify 빌드/함수 설정
├─ manifest.webmanifest    # PWA 설치 정보
├─ sw.js                   # 서비스워커 (오프라인 캐시)
├─ icons/                  # 앱 아이콘 (192 / 512 / maskable)
├─ package.json            # 로컬 서버·배포 스크립트, 백엔드 의존성
└─ README.md
```

---

## 1. 로컬에서 실행

### 방법 A — 그냥 열기 (가장 빠름)

`index.html` 더블클릭. 단, `file://` 로 열면 **서비스워커(오프라인)만 비활성**되고 나머지는 정상 동작합니다.

### 방법 B — 로컬 서버 (PWA까지 테스트하려면 권장)

Node.js가 설치돼 있으면 폴더에서:

```bash
npx serve .
```

출력되는 `http://localhost:3000` 접속. (파이썬만 있다면 `python -m http.server 5173`)

> 서비스워커·`manifest`는 `http://localhost` 또는 `https://` 에서만 등록됩니다.

---

## 2. 웹사이트로 배포 (무료)

정적 파일만 올리면 끝. 셋 중 아무거나:

| 서비스 | 방법 |
|---|---|
| **Netlify** | netlify.com → "Add new site" → 이 폴더를 드래그&드롭 |
| **Vercel** | `npx vercel` 실행 후 폴더 지정 |
| **GitHub Pages** | 레포에 push → Settings → Pages → Branch `main` / `/root` |
| **Surge** | `npx surge .` (스크립트: `npm run deploy:surge`) |

배포 후 주소를 휴대폰에서 열면 아래 3번(모바일 앱)이 바로 됩니다.

---

## 3. 모바일 앱으로 만들기

### 방법 A — PWA 설치 (스토어 심사 없이 즉시)

1. 배포된 `https://` 주소를 휴대폰 브라우저로 접속
2. **Android/Chrome**: 메뉴 → "앱 설치" / "홈 화면에 추가"
   **iOS/Safari**: 공유 → "홈 화면에 추가"
3. 홈 화면 아이콘으로 실행 → 주소창 없는 전체화면 앱처럼 동작, 오프라인도 가능

### 방법 B — 스토어 배포용 네이티브 래핑 (Capacitor)

Play스토어/앱스토어에 올리려면 WebView로 감쌉니다.

```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android @capacitor/ios
npx cap init "Legendary Brandy Index" com.example.brandyindex --web-dir=.
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Android Studio에서 빌드/서명 후 업로드
npx cap open ios       # Xcode에서 빌드 (macOS 필요)
```

- `--web-dir=.` : 현재 폴더(index.html 위치)를 웹 자산으로 사용
- 코드 수정 후 매번 `npx cap sync`
- 아이콘/스플래시는 `@capacitor/assets` 로 `icons/icon-512.png` 에서 자동 생성 가능

### 방법 C — PWA를 그대로 스토어에 (PWABuilder)

`https://www.pwabuilder.com` 에 배포 주소 입력 → Android(.aab) / iOS 패키지 자동 생성.

---

## 4. 데스크톱 앱으로 만들기

### Tauri (가볍고 권장, Rust 툴체인 필요)

```bash
npm create tauri-app@latest
# frontend: "Vanilla", dev/build 명령은 없음(정적), dist 폴더를 이 폴더로 지정
npx tauri build
```

`src-tauri/tauri.conf.json` 의 `build.frontendDist` 를 `"../"` (이 폴더)로 설정하면 그대로 패키징됩니다.

### Electron (간단)

```bash
npm i -D electron
```

`main.js`:

```js
const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1360, height: 900 });
  win.loadFile('index.html');
});
```

`npx electron .` 로 실행, `electron-builder` 로 설치파일 생성.

---

## 5. 백엔드 (Netlify Functions + Blobs)

시세 데이터는 더 이상 하드코딩/시뮬레이션이 아니라, `netlify/functions/prices.js` 가 제공하는
API에서 가져옵니다. 저장소는 [Netlify Blobs](https://docs.netlify.com/blobs/overview/)를 사용하므로
별도 DB 계정 없이 Netlify에 배포하면 바로 동작합니다.

### 5.1 API

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/.netlify/functions/prices` | 전체 시세 목록 + 마지막 갱신 시각 조회 (인증 불필요) |
| `POST` | `/.netlify/functions/prices` | 시세 갱신/브랜드 추가·삭제 (관리자 토큰 필요) |

`GET` 응답 예시:

```json
{
  "updatedAt": "2026-09-18T09:00:00.000Z",
  "items": [
    { "id": "hennessy-xo", "name": "Hennessy XO", "category": "Cognac", "price": 285, "twoWeeksAgoPrice": 279, "history": [268,272,271,276,279,285] }
  ]
}
```

`POST` 요청은 `Authorization: Bearer <ADMIN_TOKEN>` 헤더가 필요하며, 바디는 다음을 조합할 수 있습니다.

```json
{
  "updates": { "hennessy-xo": 292 },
  "add": [{ "id": "hine-antique", "name": "Hine Antique", "category": "Cognac", "price": 210 }],
  "remove": ["torres-10"]
}
```

- `updates`: 해당 id의 현재 `price`를 `twoWeeksAgoPrice`로 밀어내고, 새 가격을 `history`에 누적 반영합니다(2주 주기 갱신).
- `add`: 새 브랜드를 추가합니다.
- `remove`: id로 브랜드를 제거합니다.

### 5.2 관리자 페이지

`admin.html`에서 Admin Token을 입력하면 현재 시세 목록을 불러와 가격을 일괄 수정하거나 새 브랜드를 추가할 수 있습니다.
검색엔진에는 노출되지 않지만(`noindex`) 별도 로그인 화면은 없으므로 URL과 토큰을 외부에 공유하지 마세요.

### 5.3 배포 & 환경변수 설정 (Netlify)

1. Netlify에 이 저장소를 연결해 배포합니다 (`netlify.toml`이 함수 경로를 자동 인식).
2. Netlify 대시보드 → Site configuration → Environment variables 에서 `ADMIN_TOKEN` 값을 설정합니다
   (예: 임의의 긴 랜덤 문자열). 이 토큰이 없으면 `POST` 요청은 항상 401을 반환합니다.
3. 최초 배포 후 `GET /.netlify/functions/prices` 호출 시 자동으로 시드 데이터가 채워집니다.

### 5.4 로컬 개발

```bash
npm install
npx netlify dev
```

`netlify dev`는 정적 파일과 `netlify/functions`를 함께 로컬에서 서빙합니다. `ADMIN_TOKEN`은
`.env` 파일에 넣어 사용하세요 (`.gitignore`에 포함되어 커밋되지 않습니다).

> Functions 없이 `npx serve .` 로만 열면 `index.html`은 API 호출이 실패해 하드코딩된 폴백 데이터로 표시됩니다.

---

## 참고

표기 시세는 글로벌 리테일·옥션·2차 거래 공개 자료를 종합한 **추정 참고가**이며 투자·매매 권유가 아닙니다.
환율 1 USD = 1,390 KRW 고정 적용 (`index.html` 의 `USD_KRW_RATE`).
