# Phase 1 Expo SQLite Setup

## 목표

React Native + Expo 앱 프로젝트를 만들고, SQLite 기반 로컬 저장소와 보안 기본 설정을 먼저 준비합니다.

## 현재 작업 폴더 확인

현재 `datemap/datemap` 폴더에는 Python 가상환경 파일이 있습니다.

```text
bin/
include/
lib/
pyvenv.cfg
```

또한 `.gitignore`가 가상환경 기준으로 전체 파일을 무시하도록 되어 있습니다. 그래서 실제 Expo 앱을 생성하기 전에 아래 중 하나를 선택해야 합니다.

## 프로젝트 위치 선택

### Option A: 현재 폴더 안에 `app` 하위 폴더 생성

```text
datemap/
├── docs/
└── app/
```

장점:

- 현재 문서 폴더를 그대로 유지할 수 있다.
- 기존 가상환경 파일과 앱 파일을 분리할 수 있다.

주의할 점:

- `.gitignore`에서 `app/`도 추적 가능하게 예외 처리해야 한다.
- 나중에 가상환경 파일을 정리할지 결정해야 한다.

### Option B: 깨끗한 새 프로젝트 루트로 재구성

```text
datemap/
├── docs/
├── app/
└── README.md
```

장점:

- 장기적으로 가장 깔끔하다.
- Git 추적과 앱 빌드 구성이 단순해진다.

주의할 점:

- 현재 폴더 구조를 옮기거나 새로 잡아야 한다.

## 실제 생성 위치

Expo 앱은 아래 위치에 생성했습니다.

```text
datemap/
├── app/
└── datemap/
    └── docs/
```

문서는 `datemap/datemap/docs`에 있고, 앱 코드는 `datemap/app`에 있습니다.

## 권장 방향

앱 구현을 시작하기 전에 깨끗한 프로젝트 루트를 만드는 것을 권장합니다. 지금 바로 진행한다면 현재 폴더 아래 `app/`에 Expo 프로젝트를 만들고, 이후 폴더 구조를 정리하는 방식이 현실적입니다.

## Expo 프로젝트 생성

공식 Expo 문서 확인일: 2026-06-26

참고:

- [Expo Create a project](https://docs.expo.dev/get-started/create-a-project/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)

공식 문서 기준 프로젝트 생성 명령:

```bash
npx create-expo-app@latest --template default@sdk-56 app
```

SDK 버전은 Expo 공식 문서 변경에 따라 달라질 수 있으므로 실행 직전에 다시 확인합니다.

## 초기 설치 후보

```bash
cd app
npx expo install expo-sqlite
npx expo install expo-location
npx expo install expo-image-picker
npx expo install expo-secure-store
```

각 패키지 목적:

- `expo-sqlite`: 데이트 카드 로컬 저장
- `expo-location`: 현재 위치 권한과 좌표 확인
- `expo-image-picker`: 대표 사진 선택
- `expo-secure-store`: 추후 로그인 토큰 저장 후보

## 보안 파일 기준

앱 생성 직후 아래 파일을 준비합니다.

```text
app/.env.example
app/.gitignore
```

`.env.example`에는 실제 키를 넣지 않습니다.

```bash
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=
```

주의:

- 클라이언트에서 필요한 공개 설정과 서버에서만 써야 하는 비밀 값을 구분한다.
- 비밀 키가 필요한 API는 앱에서 직접 호출하지 않고 백엔드 프록시를 검토한다.
- `NAVER_MAP_CLIENT_SECRET`처럼 서버 전용이어야 하는 값은 앱 폴더의 `.env`에도 넣지 않는다.

## SQLite 초기 작업

1. `src/db/database.ts` 생성
2. SQLite DB 열기 함수 작성
3. `date_entries`, `date_places`, `date_photos` 테이블 마이그레이션 작성
4. prepared statement 또는 parameter binding 사용
5. 위치, 메모, 사진 URI를 로그에 출력하지 않도록 규칙 추가

## 첫 구현 순서

1. Expo 앱 프로젝트 생성 - 완료
2. TypeScript 기본 구조 정리 - 완료
3. 보안용 `.env.example`과 `.gitignore` 정리 - 완료
4. SQLite 설치와 DB 초기화 - 완료
5. 날짜, 장소, 사진 테이블 생성 - 완료
6. 임시 홈 화면에서 DB 연결 상태 표시 - 완료
7. 지도 연동 방식 검증 - 다음 단계

## 완료 기준

- Expo 앱이 로컬에서 실행된다. - 완료
- SQLite DB가 생성된다. - 완료
- `date_entries`, `date_places`, `date_photos` 테이블이 만들어진다. - 완료
- 실제 API 키가 저장소에 포함되지 않는다. - 완료
- 권한 요청은 기능 사용 시점으로 미뤄져 있다. - 진행 중

## 현재 검증 결과

- `npx tsc --noEmit` 통과
- `npm run lint` 통과
- Expo web dev server 실행: `http://localhost:8081`
- `npm audit` 결과 중간 수준 취약점이 남아 있음
- ASCII-only 경로 `/Users/soyeon/develop/datemap`에서 iOS 빌드 재시도 가능 상태
- 지도 탭 좌표 선택과 SQLite 임시 카드 저장 흐름 구현 완료

남은 audit 항목은 Expo SDK 56 내부 의존성의 `uuid` 경로에서 발생합니다. `npm audit fix --force`는 Expo 패키지를 호환되지 않는 버전으로 변경할 수 있어 적용하지 않았습니다. Expo SDK 패치 버전이 나오는지 확인하면서 추적합니다.

## 네이버 지도 iOS 연결 상태

결정:

- React Native 네이버 지도 라이브러리 사용
- iOS 우선 구현
- Expo Go 대신 Development Build 사용

설치 완료:

- `@mj-studio/react-native-naver-map`
- `expo-build-properties`

앱 설정 완료:

- `ios.bundleIdentifier`: ``
- `@mj-studio/react-native-naver-map` config plugin 연결
- `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`를 `app.config.js`에서 주입
- iOS 전용 `DateMapView`에서 `NaverMapView` 사용

다음 실행 전 필요:

- 네이버 Cloud Platform Maps 애플리케이션에 Bundle ID `` 등록
- 로컬 `app/.env`에 `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` 입력
- Xcode 및 iOS Simulator 준비

실행 명령:

```bash
cd app
npm run ios:dev
npm run start:dev-client
```

## 지도 MVP 현재 상태

완료:

- iOS에서 `NaverMapView` 표시
- 지도 탭 시 선택 좌표 저장
- 선택 좌표 마커 표시
- 선택 좌표를 `date_places` 테이블에 임시 데이트 장소로 저장
- 저장 후 카드 개수 갱신

아직 하지 않은 것:

- 장소명 검색
- 주소 변환
- 사진 첨부
- 메모 입력 화면
- 저장된 카드 목록 표시

## iOS 빌드 경로 주의사항

현재 로컬 원본 경로에는 한글 디렉터리명이 포함되어 있습니다.

```text
/Users/soyeon/Desktop/코딩공부/datemap/app
```

React Native 0.85, CocoaPods, Hermes podspec 조합에서 한글 경로가 포함되면 `pod install` 중 문자열 인코딩 오류가 발생할 수 있습니다.

확인한 오류:

- `React-Core-prebuilt` pod validation 실패
- `hermes-engine.podspec`의 `incompatible character encodings: BINARY (ASCII-8BIT) and UTF-8`

적용한 설정:

- `expo-build-properties`의 `ios.buildReactNativeFromSource: true`

검증 결과:

- `/private/tmp/datemap-build`처럼 ASCII-only 경로에서는 `npx expo prebuild --platform ios --clean`과 `pod install`이 통과함
- Hermes 기본 설정에서도 ASCII-only 경로에서는 통과함

권장:

- iOS 네이티브 빌드는 한글, 공백, 특수문자가 없는 경로에서 진행한다.
- 예: `/Users/soyeon/Desktop/datemap/app`
- 현재 경로를 유지해야 한다면 Expo web/문서 작업은 가능하지만, iOS CocoaPods 빌드는 계속 실패할 수 있다.
