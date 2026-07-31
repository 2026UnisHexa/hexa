# Hexa (흥얼)

**허밍 → 악보 변환 + AI 작곡 보조** 웹 앱

브라우저에서 허밍을 녹음하면:

1. 잡음 제거 · 짧은 음 병합 · 조성 보정 후 Basic Pitch로 멜로디 인식 → 악보 렌더링  
2. OpenAI가 코드 진행 3안을 제안  
3. 장르 프리셋(팝/발라드/재즈)으로 반주를 붙여 미리듣기 · MIDI/MusicXML 다운로드  
4. 마켓플레이스에 등록하고 마이페이지에서 관리  

핵심 포지셔닝: **AI 작곡 보조 도구**

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프론트엔드 | React 19 + Vite 8, TypeScript (Vercel 배포) |
| 오디오 녹음 | MediaRecorder + `noiseSuppression` 등 |
| 피치 인식 | `@spotify/basic-pitch` (TensorFlow.js, **브라우저**) |
| 전처리 | 하이패스 · 노이즈 게이트 · 짧은 음 병합 · 조성(키) 스냅 |
| 악보 | MusicXML → OpenSheetMusicDisplay (VexFlow) |
| 재생 | Tone.js Sampler (피아노/기타) · PolySynth fallback |
| 음성→텍스트 | Vercel `api/transcribe` → OpenAI Whisper (`whisper-1`) |
| 코드 제안 | Vercel `api/suggest-chords` → OpenAI GPT-4o mini |
| 가사 생성 | Vercel `api/suggest-lyrics` → OpenAI GPT-4o mini |
| 인증 백엔드 | Render FastAPI (`/signup`, `/login`, `/audio` …) |
| 클라이언트 저장 | `localStorage` (마켓 목록 · 프로필). 작품 음원은 백엔드/Storage |

---

## 사용된 AI 모델

### 오픈소스 — 클라이언트에서 실행

| 이름 | 용도 | 실행 | 라이선스 |
|------|------|------|----------|
| [Spotify Basic Pitch](https://github.com/spotify/basic-pitch) (`@spotify/basic-pitch`) | 허밍 음성 → 음높이 · MIDI 노트 | 브라우저, TensorFlow.js | Apache-2.0 |

### 모델은 오픈소스, 사용 방식은 상용 API

| 이름 | 용도 | 이 프로젝트에서의 사용 | 참고 |
|------|------|------------------------|------|
| [OpenAI Whisper](https://github.com/openai/whisper) (`whisper-1`) | 음성 메모 → 텍스트 | **로컬 오픈소스 추론이 아니라** OpenAI API 호출 (Vercel `api/transcribe`) | 코드·가중치는 MIT로 공개됐으나, 여기선 상용 API |

### 상용 API — 서버에서만 호출 (키 미노출)

| 이름 | 용도 | 실행 |
|------|------|------|
| OpenAI GPT-4o mini | 멜로디에 맞는 코드 진행 추천 · 가사 생성 · Whisper 인식 결과 교정 | Vercel serverless (`suggest-chords`, `suggest-lyrics`, `transcribe`) |

> OpenAI API 자체는 상용 서비스입니다. 아래 표의 `openai` npm 패키지는 API 호출용 **오픈 소스 SDK**(MIT)입니다.

---

## 현재 구현 범위 (MVP)

### 포함

- [x] 허밍 녹음 (시작/정지)
- [x] Basic Pitch MIDI 변환 + 잡음 제거 · 노트 병합 · 조성 보정
- [x] 오선보 표시 · 멜로디 미리듣기
- [x] OpenAI 코드 진행 3옵션 + 미리듣기 + fallback
- [x] 장르 프리셋 반주 (멜로디 길이에 맞춘 소프트 · 낮은 음역)
- [x] step 2 원본 / step 5 코드+장르 반영 MIDI·MusicXML 다운로드
- [x] 마켓플레이스 (localStorage 등록 · 더미 · 합성 미리듣기)
- [x] 마이페이지 (프로필 · 내 작품 · 로그아웃)
- [x] 로그인/회원가입 UI → Render 백엔드

### 제외 / 한계

| 항목 | 상태 |
|------|------|
| JWT · 세션 토큰 | **없음**. 로그인 성공 시 `login_id`만 localStorage에 저장 |
| 실제 결제 (Stripe 등) | 없음 |
| 마켓 작품의 실제 녹음/MIDI 서버 저장 | 없음 (메타데이터 + 합성 미리듣기) |
| 앱 강제 로그인 게이트 | 없음 (`/`는 비로그인 접근 가능) |

---

## 인증 방식

토큰 기반이 **아닙니다**.

1. `POST {VITE_API_BASE_URL}/signup` · `/login` 에 `login_id` + `password`  
2. 응답 `AuthResponse`: `{ success, message, login_id }` — **token 필드 없음**  
3. 프론트는 `login_id`를 `localStorage` (`hexa:auth-login-id`)에 저장해 마이페이지 표시용으로만 사용  
4. 이후 API에 `Authorization` 헤더를 붙이지 않음  

Swagger: [https://hexa-backend-68mi.onrender.com/docs](https://hexa-backend-68mi.onrender.com/docs)

> `VITE_API_BASE_URL` 끝에 `/`를 붙이면 `//signup` 404가 납니다. trailing slash 없이 설정하세요.

---

## 메인 유저 플로우

```
홈 → 새로 만들기
  step1 녹음
  → 잡음 제거 → Basic Pitch → 짧은 음 병합 → 조성 보정
  step2 악보 확인 (+ 원본 MIDI/MusicXML 다운로드)
  step3 코드 진행 선택
  step4 장르 선택 + 멜로디/반주 미리듣기
  step5 코드+장르 반영 다운로드 · 마켓 등록

홈 → 마켓플레이스 (내가 올린 것 / 둘러보기 · 데모 미리듣기)
홈 → 마이페이지 (프로필 · 내 작품 · 로그아웃)
```

---

## 프로젝트 구조 (요약)

```
hexa/
├── public/basic-pitch-model/   # Basic Pitch TF.js 모델
├── api/suggest-chords.js       # Vercel 서버리스 — OpenAI 호출
├── src/
│   ├── App.tsx                 # 홈 / 생성 5단계 / 마켓 / 마이페이지
│   ├── components/
│   │   ├── Page/AuthPage.tsx
│   │   ├── Home/ · layout/ · Recorder/ · ScoreView/
│   │   ├── ChordSuggestions/ · GenrePreset/ · Playback/
│   │   ├── Download/ · Marketplace/ · MyPage/
│   ├── hooks/                  # useRecorder, useBasicPitch, usePlayback…
│   ├── lib/
│   │   ├── audioClean.ts       # 잡음 제거
│   │   ├── mergeNotes.ts       # 짧은 음 병합
│   │   ├── keyCorrection.ts    # 조성 추정·스케일 스냅
│   │   ├── basicPitch.ts · accompaniment.ts · midiDownload.ts…
│   │   └── listingPreview.ts   # 마켓 데모 미리듣기
│   └── types/
├── .env.example
└── README.md
```

---

## 오디오 파이프라인

```
MediaRecorder
  → denoise (하이패스 · 노이즈 게이트 · 정규화)
  → Basic Pitch
  → mergeShortNotes (같은 음·짧은 간격 병합, 초단음 제거)
  → correctMelodyToKey (조성 추정 · 스케일 밖 보정)
  → 악보 / 재생 / 코드 제안 / 다운로드
```

---

## 코드 진행 제안 (OpenAI)

- 프론트는 `/api/suggest-chords`만 호출 (키 미노출)
- 응답: `{ label, chords: [{ name, notes }] }[]` (최대 3)
- 파싱 실패 시 `chordFallback` (C–Am–F–G 등)

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local
# OPENAI_API_KEY=...
# VITE_API_BASE_URL=https://hexa-backend-68mi.onrender.com   # trailing slash 금지
npm run dev
```

- 앱: `http://localhost:5173/`
- 로그인 UI: `http://localhost:5173/login`

Vercel에는 `OPENAI_API_KEY`, `VITE_API_BASE_URL`을 등록한다.

---

## 데모 포인트

1. 허밍 녹음 → 악보 (병합·조성 보정 안내 확인)
2. 코드 3안 + 장르 반주 미리듣기
3. step 5에서 코드+장르 반영 파일 다운로드 · 마켓 등록
4. 마켓 카드 **미리듣기** (합성 데모)
5. 마이페이지에서 내 작품·프로필

판매/마켓은 **컨셉 데모**이며 실제 결제·서버 음원 저장은 없습니다.

---

## 사용된 오픈 소스

이 프로젝트는 아래 오픈 소스에 의존합니다. (라이선스는 각 저장소 기준)

### 런타임 / 핵심 라이브러리

| 이름 | 용도 | 링크 |
|------|------|------|
| [React](https://react.dev/) | UI | [facebook/react](https://github.com/facebook/react) |
| [Vite](https://vite.dev/) | 빌드·개발 서버 | [vitejs/vite](https://github.com/vitejs/vite) |
| [TypeScript](https://www.typescriptlang.org/) | 타입 시스템 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| [@spotify/basic-pitch](https://github.com/spotify/basic-pitch) | 허밍 → MIDI 피치 인식 (TensorFlow.js) | Apache-2.0 |
| [Tone.js](https://tonejs.github.io/) (`tone`) | 멜로디·반주 재생, Sampler | [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) |
| [@tonejs/midi](https://github.com/Tonejs/Midi) | MIDI 파일 생성·다운로드 | MIT |
| [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) | MusicXML 오선보 렌더링 | [opensheetmusicdisplay/opensheetmusicdisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) |
| [VexFlow](https://www.vexflow.com/) | OSMD 의존 (악보 렌더링 엔진) | [vexflow/vexflow](https://github.com/vexflow/vexflow) |
| [OpenAI Node SDK](https://github.com/openai/openai-node) (`openai`) | Whisper · GPT-4o mini 서버 호출용 SDK | MIT |
| [TensorFlow.js](https://www.tensorflow.org/js) | Basic Pitch 모델 추론 (basic-pitch 의존) | Apache-2.0 |

### 개발 도구

| 이름 | 용도 | 링크 |
|------|------|------|
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | Vite React 플러그인 | MIT |
| [oxlint](https://github.com/oxc-project/oxc) | 린트 | MIT |
| [@types/react](https://github.com/DefinitelyTyped/DefinitelyTyped) / `@types/react-dom` / `@types/node` | TypeScript 타입 정의 | MIT |

### 에셋 · 폰트 · 샘플

| 이름 | 용도 | 링크 / 출처 |
|------|------|-------------|
| [Pretendard](https://github.com/orioncactus/pretendard) | UI 폰트 (CDN) | SIL OFL |
| [Salamander Grand Piano](https://tonejs.github.io/audio/salamander/) | Tone.js 피아노 Sampler 샘플 | Tone.js 데모 샘플 (원본: Salamander piano, CC BY 3.0) |
| [tonejs-instruments (guitar-acoustic)](https://github.com/nbrosowsky/tonejs-instruments) | 어쿠스틱 기타 Sampler 샘플 | 샘플셋 출처 저장소 라이선스 참고 |

### 알고리즘 · 참고

| 이름 | 용도 |
|------|------|
| Krumhansl–Kessler key profiles | 조성(키) 추정에 사용한 피치 클래스 프로파일 (학술 공개 프로파일) |
