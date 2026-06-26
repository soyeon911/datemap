# App Architecture

## 앱 방식

DateMap은 모바일 앱으로 시작합니다. 앱 기술 스택은 React Native + Expo를 기본으로 결정합니다.

## 확정 기술 스택

### App

- React Native
- Expo
- TypeScript

### Local Database

- SQLite

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
- 추후 로그인과 커플 연동을 고려해 사용자 ID, 커플 ID, 동기화 상태 필드를 확장 가능한 구조로 둔다.
- 서버 동기화 전까지 로컬 데이터와 사진 URI의 노출 범위를 최소화한다.

## 화면 구조

```text
App
├── MapHome
│   ├── NaverMapView
│   ├── DatePlaceMarkers
│   └── RecentDateCardSheet
├── PlaceSearch
│   ├── SearchInput
│   ├── SearchResultList
│   └── SelectedPlacePreview
├── DateCardEditor
│   ├── DatePicker
│   ├── PhotoPicker
│   ├── MemoInput
│   └── KeywordSelector
├── MonthlyTimeline
│   ├── MonthSelector
│   └── DateCardList
└── DateCardDetail
    ├── PhotoGallery
    ├── PlaceInfo
    └── MemoSection
```

## 데이터 흐름

1. 지도 또는 검색에서 장소를 선택한다.
2. 장소 선택 결과를 데이트 카드 작성 화면으로 넘긴다.
3. 사용자가 사진, 날짜, 메모, 키워드를 입력한다.
4. 로컬 DB에 저장한다.
5. 지도와 월별 목록이 저장된 데이터를 다시 읽어 표시한다.

## 저장소 전략

### MVP

- SQLite 로컬 DB 우선
- 사진은 기기 로컬 URI 저장
- API 없이 오프라인 기록 가능하게 설계
- 민감 데이터는 꼭 필요한 필드만 저장
- DB 스키마는 향후 로그인과 커플 연동을 고려해 확장 가능하게 설계

### 이후

- 로그인 도입
- 서버 DB 동기화
- 이미지 스토리지 업로드
- 커플 공유 데이터 모델 추가
- 사용자별 접근 권한과 커플 공유 권한 검증

## 주요 모듈

- `map`: 지도 표시, 마커, 카메라 이동
- `places`: 장소 검색, 장소 선택
- `dateCards`: 데이트 카드 CRUD
- `media`: 사진 선택과 저장
- `timeline`: 월별/주별 조회
- `search`: 키워드와 텍스트 검색
