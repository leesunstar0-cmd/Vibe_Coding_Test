# Legendary Brandy Index

2주(격주) 주기로 글로벌 브랜디·코냑 시세 변동을 보여주는 **단일 파일 정적 웹앱 + PWA**.
빌드 도구가 필요 없습니다. `index.html` 하나에 HTML·CSS·JS가 모두 들어 있습니다.

```
Legendary Brandy Index/
├─ index.html              # 앱 전체 (마크업 + 스타일 + 로직)
├─ manifest.webmanifest    # PWA 설치 정보
├─ sw.js                   # 서비스워커 (오프라인 캐시)
├─ icons/                  # 앱 아이콘 (192 / 512 / maskable)
├─ package.json            # 로컬 서버·배포 스크립트
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

## 5. "실시간" 시세를 진짜 데이터로 바꾸기

현재 `index.html` 안의 흐름:

- `brandyData` 배열 = 하드코딩된 2026-09-02 기준 추정가 (`price`, `twoWeeksAgoPrice`, `history`)
- `startLivePriceUpdates()` = 6초마다 가격을 무작위로 흔드는 **시뮬레이션**

실데이터로 교체하려면:

1. 가격 소스를 정한다 (자체 스프레드시트 CSV, 사내 API, wine-searcher 등 스크래핑 백엔드).
2. `startLivePriceUpdates()` 를 폴링 함수로 교체:

```js
async function refreshPrices() {
  const res = await fetch('https://your-api.example.com/brandy-prices');
  const rows = await res.json(); // [{ id, price, twoWeeksAgoPrice, history }, ...]
  rows.forEach(r => {
    const item = brandyData.find(b => b.id === r.id);
    if (!item) return;
    Object.assign(item, r);
  });
  processData(); initTicker(); renderMarketOverview();
}
setInterval(refreshPrices, 10 * 60 * 1000); // 10분마다
refreshPrices();
```

3. 브라우저 CORS 때문에 외부 사이트 직접 호출은 대개 막힙니다 → 작은 프록시/크론 백엔드
   (Cloudflare Workers, Vercel Cron, Google Apps Script)에서 하루 1~2회 수집해 JSON으로 서빙하세요.
4. `sw.js` 의 `CACHE` 버전을 올려 배포 시 캐시를 갱신합니다.

---

## 참고

표기 시세는 글로벌 리테일·옥션·2차 거래 공개 자료를 종합한 **추정 참고가**이며 투자·매매 권유가 아닙니다.
환율 1 USD = 1,390 KRW 고정 적용 (`index.html` 의 `USD_KRW_RATE`).
