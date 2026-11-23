# 운동 일지 — 작업 규칙

아이폰 홈 화면에 추가해서 쓰는 개인 운동 기록 PWA. 서버 없음, 기록은 폰의 IndexedDB에만 저장.
기능 목록·아이폰 문제 이력·미결 사항은 `HANDOFF.md`를 먼저 읽는다.

## 명령어

```bash
npm ci              # 설치
npm run dev         # 개발 서버 (src/index.html)
npm run check       # 타입 검사 + 단위 테스트 + 빌드  ← 커밋 전에 항상
npm run e2e         # 빌드 후 화면 테스트(Playwright, 아이폰 크기 Chromium)
```

## 구조 (의존 방향: 위 → 아래만 import)

```
src/features/*   화면별 기능 (home, workout, routine, library, history, body, settings, exercises)
src/app/         뼈대: App.tsx(탭바·미니바), router.ts(해시 라우터), routes.ts(화면 등록표)
src/ui/          공용 컴포넌트 (시트·대화상자·토스트·차트·칩·썸네일) — 데이터 변경 코드 없음
src/store/       상태(@preact/signals) + 변경 함수(actions). 모든 저장은 여기서만
src/services/    브라우저 기능: 시계, 휴식 타이머, 소리, 알림, 화면 켜짐, 뷰포트 보정, 파일, SW
src/data/        저장소(IndexedDB / 메모리) + 읽기·마이그레이션 적용
src/domain/      순수 로직과 타입 (DOM 없음 → tests/unit 에서 테스트)
src/lib/         형식·숫자·id 도우미
```

- `domain/`은 DOM·store를 import하지 않는다. 계산·변환 로직은 여기에 순수 함수로 두고 테스트한다.
- 화면 코드는 `@/store`(index.ts)만 통해 상태를 읽고 바꾼다. 배열·객체를 직접 고치지 말고 actions(새 객체로 교체)를 쓴다.
- 저장은 `store/core.ts`의 `track()` 줄에 순서대로 들어간다. 새 저장 함수도 `track(() => repo.xxx())` 형태로.
- 시트는 `openSheet()` / `confirmSheet()` / `promptSheet()` / `choiceSheet()` (Promise로 결과 반환).

## 기능 추가 방법

- **새 화면**: `src/features/<이름>/<Name>Page.tsx` 작성 → `src/app/routes.ts`에 한 줄 추가 (탭이면 `TABS`에도).
- **기록에 새 필드**: `domain/types.ts`에 선택 필드(`?`)로 추가 → `domain/normalize.ts`에서 기본값 처리 → 테스트.
  기존 기록을 변환해야 하면 `domain/migrations.ts`에 단계 추가(+ `tests/unit/data.test.ts`에 이전→새 형식 테스트).
- **새 설정**: `Settings` 타입 + `DEFAULT_SETTINGS`에 추가하면 저장·백업·복원이 자동으로 따라온다.
- **새 저장소(store) 종류**가 필요하면 `data/schema.ts`의 `DB_VERSION`을 올려야 한다 — 되돌리기가 어려우니 사용자와 상의.

## 데이터 호환 (깨면 사용자 기록이 사라짐)

- IndexedDB 이름 `workout-log`, 버전 1, 저장소 `exercises/routines/sessions/body/images/meta` 유지.
- 필드 이름 변경·삭제 금지. 기본 운동 id(`seed-0`…) 변경 금지. 휴식 타이머 localStorage 키 `workout-log-rest` 유지.
- 백업 파일 형식 `{ app:'workout-log', version:1, schema, data }` — 이전 앱(v1.x)도 읽을 수 있게 `version`은 1 유지.
- 기록에는 운동 이름·부위·장비·종류를 저장 시점 값으로 복사해 둔다(이름을 바꿔도 과거 기록 표기 유지).
- 호환 확인용 픽스처: `tests/fixtures/v1-backup.json` (이전 앱 v1.0.6이 실제로 만든 백업).

## 배포

- **작업 순서(사용자 결정, 반드시 지킴)**:
  1. 피그마 디자인 먼저 반영 → 2. 앱 코드 반영(작업 브랜치에만 커밋·푸시) → 3. `npm run check`·`npm run e2e` 통과
  → 4. **사용자에게 결과(앱 스크린샷 등)를 보여 주고 배포해도 되는지 확인받기** → 5. 승인받은 뒤에만 main에 푸시(=배포).
- main 푸시는 PR 없이 바로 해도 되지만, 4번 확인 없이는 절대 하지 않는다.
- `main`에 푸시 → GitHub Actions(`.github/workflows/deploy.yml`)가 검사 후 `dist/`를 GitHub Pages에 배포.
  (저장소 Settings → Pages → Source = **GitHub Actions** 이어야 함)
- 서비스 워커(`sw.js`)는 빌드 때 자동 생성, 버전도 파일 해시로 자동. 손으로 올릴 필요 없음.
- 설정 화면에 보이는 버전은 `package.json`의 `version` — 기능을 바꿔 배포할 때 올린다.
- 새 버전이 배포되면 앱에 "새 버전이 준비됐어요 → 새로고침" 안내가 뜬다.
- 저장소 맨 위에 `index.html`을 두지 않는다(진입 페이지는 `src/index.html`). Pages 설정이 예전 방식이어도 폰의 앱이 깨진 화면을 캐시하지 않게 하려는 것.

## 브랜드(아이콘·스플래시)

- 앱 아이콘·이름 픽셀아트 원본: `src/brand/pixelArt.ts`. 고친 뒤 `npm run icons`로 PNG를 다시 만들고 커밋.
- 스플래시는 `build/splash-plugin.ts`가 빌드 때 `src/index.html`의 `<!--splash-->` 자리에 넣고, `services/splash.ts`가 최소 0.8초 뒤 숨김.
- 디자인 작업 순서: 피그마(`00 브랜드`, `01 화면 플로우`)를 먼저 고치고 → 코드 반영.

## 아이폰 주의

- 하단 탭바·안전영역 보정(`services/viewport.ts`, `styles/layout.css`)은 실기기 스크린샷으로만 확인 가능. 바꿀 땐 사용자에게 확인 요청.
- 소리: 기본 'mix'(WebAudio + audioSession ambient)로 다른 앱 음악을 끊지 않게 함.
- iOS 15 대응: `structuredClone` 대신 `lib/clone.ts`, 빌드 타깃 safari15.

## 사용자 선호

- 한국어, 짧고 쉬운 설명. 확인되지 않은 것은 "추정"이라고 밝힌다.
- 공개 저장소: 개인 정보(이메일 등)를 파일·커밋에 넣지 않는다.
- 다른 앱의 이름·로고·고유 디자인·콘텐츠는 복제하지 않는다.
