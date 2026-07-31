# Hexa

**허밍 → 악보 변환 + AI 작곡 보조** 웹사이트

사용자가 브라우저에서 허밍을 녹음하면:

1. Basic Pitch(오디오→MIDI 변환 모델)로 멜로디를 인식해서 악보로 렌더링
2. 인식된 멜로디를 바탕으로 OpenAI API가 코드 진행을 제안
3. 사용자가 선택한 장르 프리셋에 따라 반주를 붙여 결과물을 완성

핵심 포지셔닝: **AI 작곡 보조 도구** (에이전트/작곡가라고 과장하지 않는다)

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프론트엔드 | React (Vite), 배포는 Vercel/Netlify |
| 오디오 녹음 | 브라우저 MediaRecorder API |
| 피치/MIDI 인식 | `@spotify/basic-pitch` (TensorFlow.js, 클라이언트 사이드) |
| 악보 렌더링 | VexFlow 또는 OpenSheetMusicDisplay (MusicXML 변환 후 표시) |
| 코드 진행 제안 | OpenAI API (멜로디 요약 → **JSON 배열만** 응답), Tone.js로 카드별 미리듣기 |
| 코드 재생 | Tone.js `Sampler` + 피아노 샘플 (불가 시 `PolySynth` fallback) |
| 자동 반주 (선택) | Magenta.js MusicVAE — 시간 남으면 추가, 필수 아님 |
| 상태 저장 | DB 없이 `localStorage`만 사용 (세션 간 결과물 저장 필요 시) |

---

## 스코프 (반드시 지킬 것)

### 포함 (MVP)

- [ ] 마이크로 허밍 녹음 (녹음 시작/정지 UI)
- [ ] Basic Pitch로 MIDI 변환
- [ ] MIDI → MusicXML 변환 후 오선보로 시각화
- [ ] 인식된 멜로디 재생 (MIDI 사운드폰트로 미리듣기)
- [ ] OpenAI API로 코드 진행 제안 3개 옵션 (**JSON 배열** 응답, 카드 UI + ▶ 재생)
- [ ] 장르 프리셋(발라드/재즈/팝 등) 선택 시 미리 정의된 반주 스타일 적용
- [ ] 결과 MIDI/MusicXML 다운로드 기능
- [ ] **(더미) 악보 판매 화면** — "마켓플레이스에 등록" 버튼 → 가격 입력 → "등록 완료" 모달만 표시. 실제 결제/서버 연동 없음. 20~30분 이내로 끝낼 것

### 명시적으로 제외 (하지 말 것)

| 하지 말 것 | 이유 |
|------------|------|
| **실제** 결제 연동 (Stripe 등) | 저작권 리스크 + 스코프 폭발. 더미 UI로만 표현 |
| 회원가입/로그인/서버 DB | `localStorage`로 충분 |
| 완전 자동 "AI 작곡" (반주까지 100% AI 생성) | 시간 남으면 Magenta.js 시도, 안 되면 프리셋으로 대체 |
| "에이전트"라는 이름의 과장된 오케스트레이션 | 실제 판단 로직 없이 버즈워드만 붙이지 않는다 |

### 발표 시 주의

- 판매 화면은 데모 시 **"이 부분은 컨셉 데모이며, 실제 결제는 Stripe 연동으로 확장 가능합니다"**라고 명확히 언급할 것. 진짜 결제인 것처럼 숨기지 않는다
- 저작권 질문 대비 답변: "실제 서비스라면 사용자의 창작 여부를 검증하는 단계가 추가로 필요하며, 이는 향후 로드맵입니다"

---

## 프로젝트 구조

```
hexa/
├── public/
│   └── (사운드폰트, 피아노 샘플, Basic Pitch 모델 에셋 등)
├── src/
│   ├── main.tsx                 # 앱 진입점
│   ├── App.tsx                  # 메인 플로우 오케스트레이션
│   ├── index.css
│   │
│   ├── components/
│   │   ├── Recorder/            # 허밍 녹음 UI
│   │   │   ├── Recorder.tsx     # 시작/정지, 마이크 안내
│   │   │   └── RecorderStatus.tsx
│   │   ├── ScoreView/           # 오선보 렌더링
│   │   │   └── ScoreView.tsx
│   │   ├── Playback/            # 멜로디·반주 미리듣기
│   │   │   └── PlaybackControls.tsx
│   │   ├── ChordSuggestions/    # OpenAI 코드 진행 카드 (3옵션 + ▶ 재생)
│   │   │   ├── ChordSuggestions.tsx
│   │   │   └── ChordCard.tsx    # label, chords 표시 + ▶ 버튼
│   │   ├── GenrePreset/         # 발라드/재즈/팝 등 장르 선택
│   │   │   └── GenrePreset.tsx
│   │   ├── Download/            # MIDI / MusicXML 다운로드
│   │   │   └── DownloadButtons.tsx
│   │   ├── Marketplace/         # (더미) 악보 판매·등록 UI
│   │   │   ├── ListForSaleButton.tsx   # "마켓플레이스에 등록"
│   │   │   ├── PriceInputModal.tsx     # 가격 입력
│   │   │   └── ListingSuccessModal.tsx # "등록 완료" (결제/서버 없음)
│   │   └── common/
│   │       ├── LoadingState.tsx
│   │       └── ErrorMessage.tsx
│   │
│   ├── hooks/
│   │   ├── useRecorder.ts       # MediaRecorder 래퍼
│   │   ├── useBasicPitch.ts     # 모델 로드·추론
│   │   ├── usePlayback.ts       # Tone.js 등 MIDI 재생
│   │   ├── useChordPlayback.ts  # 코드 진행 순서 재생 (Sampler/PolySynth)
│   │   └── useLocalStorage.ts   # 세션 간 결과 저장
│   │
│   ├── lib/
│   │   ├── basicPitch.ts        # @spotify/basic-pitch 연동
│   │   ├── midiToMusicXml.ts    # MIDI → MusicXML 변환
│   │   ├── claude.ts            # OpenAI API + JSON 파싱 + fallback
│   │   ├── chordFallback.ts     # 하드코딩 fallback (예: C-Am-F-G)
│   │   ├── chordPlayback.ts     # Tone.js Sampler/PolySynth로 코드 연주
│   │   ├── accompaniment.ts     # 장르 프리셋 → 반주 매핑
│   │   ├── presets/             # 미리 정의된 반주 패턴
│   │   │   ├── ballad.ts
│   │   │   ├── jazz.ts
│   │   │   └── pop.ts
│   │   └── storage.ts           # localStorage 헬퍼
│   │
│   ├── types/
│   │   ├── midi.ts              # Note, Melody 등
│   │   ├── chord.ts             # ChordSuggestion, ChordVoicing
│   │   └── genre.ts             # GenrePreset
│   │
│   └── utils/
│       └── melodySummary.ts     # MIDI → OpenAI 프롬프트용 텍스트 요약
│
├── api/
│   └── suggest-chords.js        # Vercel 서버리스 — OpenAI 호출 (키는 서버만)
├── .env.example                 # OPENAI_API_KEY (VITE_ 접두사 금지)
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

### 컴포넌트 · 모듈 역할

| 이름 | 역할 |
|------|------|
| `Recorder` | MediaRecorder로 허밍 캡처, 단음·마이크 안내 |
| `useBasicPitch` / `basicPitch` | 오디오 → MIDI 노트 배열 |
| `ScoreView` | MusicXML 기반 오선보 표시 (VexFlow / OSMD) |
| `PlaybackControls` | 멜로디(+반주) MIDI 미리듣기 |
| `ChordSuggestions` / `ChordCard` | JSON 제안 3개를 카드로 표시·선택, 각 카드에 ▶ 재생 |
| `api/suggest-chords` | 서버에서만 OpenAI 호출 (`OPENAI_API_KEY`). 프론트는 `/api/suggest-chords`만 fetch |
| `claude` + `chordFallback` | 서버 응답 JSON 파싱, 실패 시 C-Am-F-G 등 fallback (키 없음) |
| `chordPlayback` / `useChordPlayback` | Tone.js Sampler(피아노) 우선, 불가 시 PolySynth로 코드 진행 순차 재생 |
| `GenrePreset` | 발라드/재즈/팝 등 반주 스타일 선택 |
| `accompaniment` + `presets/*` | 코드 진행에 프리셋 보이싱·리듬 매핑 |
| `DownloadButtons` | MIDI / MusicXML 파일 다운로드 |
| `Marketplace/*` | 더미 등록 UI만 (가격 입력 → 완료 모달, 결제/서버 없음) |
| `melodySummary` | 예: `C4-E4-G4-A4, 4/4, tempo ~90` 형태로 요약 |

### 메인 유저 플로우 (`App.tsx`)

```
녹음 → Basic Pitch(MIDI) → 악보 렌더 + 미리듣기
                         → OpenAI 코드 제안 3개 선택
                         → 장르 프리셋 반주 적용
                         → 합주 재생 / MIDI·MusicXML 다운로드
                         → (더미) 마켓플레이스 등록
```

---

## 코드 진행 제안 (OpenAI API)

### 응답 형식

프롬프트에 **「반드시 JSON만 출력, 다른 설명 텍스트 없이」** 를 명시한다. 텍스트 설명이 아니라 JSON 배열만 받는다.

각 항목 스키마:

```ts
{
  label: string
  chords: { name: string; notes: string[] }[]
}
```

예시:

```json
[
  {
    "label": "안정적인 팝 진행",
    "chords": [
      { "name": "C", "notes": ["C4", "E4", "G4"] },
      { "name": "Am", "notes": ["A3", "C4", "E4"] },
      { "name": "F", "notes": ["F3", "A3", "C4"] },
      { "name": "G", "notes": ["G3", "B3", "D4"] }
    ]
  }
]
```

### 파싱 & fallback

- `JSON.parse`는 **try-catch**로 감싼다.
- 파싱 실패·스키마 불일치·API 오류 시 하드코딩된 fallback 코드 진행(예: **C–Am–F–G**)을 카드에 표시한다.
- 데모 중 에러로 화면이 멈추지 않게 하는 것이 우선이다.

### 카드별 재생 (▶)

- 코드 진행 카드 3개 각각에 재생 버튼(▶)을 둔다.
- 클릭 시 해당 `chords`를 **순서대로** 재생한다.
- Tone.js: 가능하면 **`Sampler` + 피아노 샘플**, 불가 시 **`PolySynth`** fallback.

---

## 빌드 순서 (총 15시간 가이드)

| 시간 | 단계 | 내용 |
|------|------|------|
| 1h | 프로젝트 셋업 | Vite + React, 기본 레이아웃, Vercel/Netlify 배포 URL 확보 |
| 3h | 녹음 → Basic Pitch | MediaRecorder → 모델 추론 → MIDI 노트 콘솔 확인 (조용/시끄러운 환경 테스트) |
| 3h | 악보 렌더링 | MIDI → MusicXML → VexFlow/OSMD, Tone.js 미리듣기 |
| 2h | OpenAI API | JSON 전용 프롬프트 → 파싱/fallback → 카드 UI + ▶ (Sampler/PolySynth) |
| 2h | 장르 프리셋 반주 | 3~4개 패턴을 선택 코드에 매핑, 멜로디+반주 동시 재생 |
| 2h | UI/UX | 로딩·에러 안내, MIDI/MusicXML 다운로드, **더미 판매 화면 (20~30분, 오버되면 스킵)** |
| 2h | 버퍼 + 데모 | 실환경 리허설; 여유 시 Magenta.js, 아니면 스킵 |

---

## 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| 시끄러운 데모 현장에서 인식 정확도 하락 | 마이크 가까이 녹음 안내 UI, 가능하면 조용한 자리에서 데모 |
| Basic Pitch가 화음/노이즈에 오작동 | **단음 허밍만 지원**한다고 명확히 안내 |
| OpenAI 응답이 JSON이 아니거나 파싱 실패 | try-catch + 하드코딩 fallback (C–Am–F–G). 데모 화면 중단 금지 |
| OpenAI 코드 진행이 음악적으로 이상함 | 프롬프트에 다이아토닉 코드 등 음악 이론 제약 명시 |
| `/api/suggest-chords`에 rate limit 없음 (MVP) | 남용·비용 폭주 가능. 데모 후 Vercel KV/Upstash 등으로 제한 추가 예정. 지금은 구현하지 않음 |
| 시간 부족 | Magenta.js 자동 반주 → 장르 프리셋 다양화 → UI 폴리싱 순으로 쳐냄. **핵심(녹음→악보→코드 제안)은 반드시 완성** |

---

## 데모 스크립트

1. "허밍만 하면 AI가 악보로 만들어줍니다" → 마이크에 짧게 허밍
2. 실시간으로 오선보 렌더링되는 화면 보여주기
3. "이 멜로디에 OpenAI가 코드 진행을 제안해줍니다" → 3개 옵션 + ▶로 미리듣기
4. 장르 선택 후 반주 붙은 결과 재생
5. "완성된 악보는 마켓플레이스에 등록해서 판매할 수도 있습니다" → 더미 등록 화면을 보여주며 **"지금은 컨셉 데모이고, 실제로는 Stripe 연동과 창작 검증 단계가 필요합니다"**라고 명확히 언급
6. 다운로드 버튼으로 마무리

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY만 설정 (VITE_ 접두사 금지)
npm run dev
```

Vercel 배포 시 Project Settings → Environment Variables에 `OPENAI_API_KEY`를 등록한다.  
코드 진행 제안은 `api/suggest-chords` 서버리스 함수를 통하며, 브라우저에는 API 키가 내려가지 않는다. (서버 DB 없음)

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
| [OpenAI Node SDK](https://github.com/openai/openai-node) (`openai`) | 서버사이드 코드 진행 제안 API 클라이언트 | MIT |
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

> OpenAI API 자체는 상용 서비스이며, 위 표의 `openai` 패키지는 API 호출용 **오픈 소스 SDK**입니다.
