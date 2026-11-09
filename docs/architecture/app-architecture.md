# App Architecture

## 앱 방식

DearMap은 모바일 앱으로 시작합니다. 앱 기술 스택은 React Native + Expo를 기본으로 결정합니다.

## 확정 기술 스택

### App

- React Native
- Expo
- TypeScript

### Local Database

- SQLite (`expo-sqlite`)

### Backend

- Supabase: 이메일 코드 인증, Postgres + RLS, Storage
- Vercel 서버리스 함수: 네이버 장소 검색 프록시

### 지도

- `@mj-studio/react-native-naver-map`
- iOS 우선 구현
- Expo Go가 아닌 Expo Development Build 사용
- 네이버 지도 Client ID는 `.env`에서 app config로 주입

## 선택 이유

- 빠르게 모바일 MVP를 만들 수 있다.
- TypeScript 기반으로 데이터 모델과 화면 상태를 명확히 관리할 수 있다.
- 사진 선택, 위치 권한, 로컬 저장 기능을 붙이기 쉽다.
- 추후 웹 또는 백엔드와 타입 계약을 맞추기 좋다.
- SQLite는 데이트 카드, 날짜 필터, 키워드 검색처럼 구조화된 로컬 데이터에 적합하다.

## 보안 기본 원칙

보안은 모든 기능의 선행 조건입니다. 위치, 사진, 메모는 사적인 정보이므로 MVP 단계부터 아래 기준을 지킵니다.

- API 키와 민감 설정은 저장소에 커밋하지 않는다.
- 위치 권한과 사진 권한은 필요한 시점에만 요청한다.
- 권한 거부 상태에서도 앱의 기본 탐색이 가능해야 한다.
- SQLite에는 필요한 데이터만 저장한다.
- 네이버 지도 Client Secret은 모바일 앱 번들에 넣지 않는다.
- 로그인 세션은 암호화해 저장하고, 오류 로그에는 오류 종류만 남긴다.
- 서버는 RLS로 본인과 커플 상대의 기록만 읽게 하고, 본인 기록만 쓰게 한다.

## 화면 구조

```text
AuthGate (로그인 전: 이메일 코드 로그인 화면)
└── AppTabs (네이티브 탭)
    ├── Home (index.tsx)
    │   ├── 방문 지도: 하트 마커, 시/도·시/군/구 묶음 보기 (PlaceGroupModal)
    │   ├── 기간 필터: 프리셋 드롭다운, 캘린더 기간·주차 선택 (PeriodPanel, CalendarPicker)
    │   ├── 저장 기록 카드 목록 (SavedPlaceCard)
    │   ├── 장소 상세 (PlaceDetailModal) → 사진 전체 보기 (FullScreenPhotoModal)
    │   ├── 장소 추가·수정 편집기 (Modal)
    │   ├── 설정·커플 연결 (Modal)
    │   └── 두 기기 충돌 선택 창 (askConflictChoice)
    └── Recommend (recommend.tsx)
```

## 데이터 흐름

### 기록 저장

1. 지도 또는 검색에서 장소를 선택한다. 검색은 Vercel 프록시(`app/api/naver-place-search.js`)를 로그인 세션과 함께 호출한다.
2. 사용자가 사진, 날짜, 한 줄 일기, 해시태그를 입력한다. 해시태그는 중복을 제거한다.
3. 로컬 SQLite에 저장한다. 네트워크를 기다리지 않는다.
4. 지도와 카드 목록이 로컬 데이터를 다시 읽어 표시한다.
5. 뒤에서 Supabase로 업로드한다. 사진은 Storage에, 기록은 Postgres에 올린다.

### 동기화

- pull과 push는 하나의 대기열로 순서대로 실행한다. 같은 SQLite 연결에서 트랜잭션이 겹치지 않게 하기 위해서다.
- pull은 로그인, 커플 정보 로드, 당겨서 새로고침 시점에 실행한다. 실시간 구독은 없다.
- 업로드는 서버 `version`이 마지막으로 읽은 값과 같을 때만 성공한다. 다르면 서버 값을 읽어 칸별로 비교하고, 같은 칸이 충돌하면 선택 창을 보여 준다.
- 자세한 결정 배경은 `docs/decisions/0004-cloud-sync-and-edit-conflicts.md`에 있다.

## 저장소 전략

| 저장소 | 담는 것 | 비고 |
| --- | --- | --- |
| SQLite (`datemap.db`) | 기록, 사진 경로, 동기화 상태 | 오프라인에서도 기록 가능 |
| 앱 문서 폴더 | 선택한 사진 사본 | 사진 원본 대신 앱 내부로 복사 |
| AsyncStorage | 암호화된 로그인 세션 | `enc:v1:` 접두사의 AES-GCM 암호문 |
| SecureStore | 세션 암호화 키 (256비트) | iOS 키체인, Android Keystore |
| Supabase Postgres | 동기화된 기록, 커플 정보 | RLS로 권한 검증 |
| Supabase Storage | 업로드한 사진 (`date-photos`) | 본인 쓰기, 커플 읽기 |

## 플랫폼 분기

- 네이버 지도는 `*.ios.tsx`에서만 네이티브로 그리고, 다른 플랫폼은 기본 파일의 대체 화면을 쓴다.
- 웹에서는 AsyncStorage와 SecureStore를 쓰지 않는다. 웹 정적 빌드가 Node 환경에서 깨지는 것을 막기 위해서다.
- 실제 검증은 iOS 시뮬레이터에서 했다. Android는 네이티브 지도 연동과 실기기 검증이 남아 있다.

## 주요 모듈

| 경로 | 역할 |
| --- | --- |
| `app/src/app/` | 화면 라우트 (`index.tsx` 홈, `recommend.tsx` 추천) |
| `app/src/components/home/` | 홈 화면 컴포넌트 (카드, 상세·사진·기간 모달, 충돌 선택 창) |
| `app/src/components/map/` | 지도 (iOS 네이티브와 대체 화면) |
| `app/src/hooks/` | `useSavedPlaces` → `useDateFilter` → `useMapGrouping` 순서의 조회 파이프라인 |
| `app/src/db/` | SQLite 마이그레이션과 기록 CRUD |
| `app/src/sync/` | Supabase 동기화와 충돌 비교(`date-place-merge.ts`) |
| `app/src/lib/` | Supabase 클라이언트, 인증·커플 컨텍스트, 세션 암호화 저장소 |
| `app/src/services/` | 장소 검색 프록시 호출 |
| `app/src/utils/` | 날짜, 묶음, 사진, 해시태그, 검색 텍스트, 안전한 오류 로그 같은 순수 함수 |
| `app/api/` | Vercel 서버리스 함수 (장소 검색 프록시) |
| `supabase/` | 서버 스키마와 마이그레이션 SQL |

## 테스트와 검증

- jest-expo로 순수 함수, 동기화, 세션 저장소, 프록시를 테스트한다. 시간대는 `Asia/Seoul`로 고정한다.
- 변경마다 `npx tsc --noEmit`, `npm run lint`, `npx jest`를 실행하고, 화면 동작은 시뮬레이터 체크리스트로 확인한다.
- CI에서 자동으로 돌리는 검사는 아직 없다. PR의 체크는 Vercel 배포뿐이다.
