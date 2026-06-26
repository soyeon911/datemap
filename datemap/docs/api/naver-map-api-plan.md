# Naver Map API Plan

## 목표

네이버 지도 기반으로 사용자가 데이트 장소를 선택하고 저장할 수 있게 합니다.

## 필요한 기능

- 모바일 앱에서 지도 표시
- 현재 위치 표시
- 좌표 기준 마커 표시
- 장소명 검색
- 검색 결과에서 장소명, 주소, 좌표 가져오기
- 주소 또는 좌표 저장
- 좌표를 주소로 변환할 수 있는 구조

## 검토할 API 영역

구현 전에 네이버 공식 문서에서 아래 항목을 확인합니다.

- 모바일 앱용 네이버 지도 SDK
- JavaScript 지도 API 사용 가능 여부
- 장소 검색 또는 지역 검색 API
- Geocoding API
- Reverse Geocoding API
- 검색 API가 Client Secret을 요구하는지 여부
- API 키 발급 방식
- iOS/Android 앱 패키지 등록 방식
- 무료 사용량과 과금 기준

공식 확인 후보:

- [NAVER Cloud Platform Maps](https://www.ncloud.com/product/applicationService/maps)
- [NAVER Maps Android SDK](https://navermaps.github.io/android-map-sdk/guide-ko/)
- [NAVER Maps iOS SDK](https://navermaps.github.io/ios-map-sdk/guide-ko/)
- [React Native Naver Map](https://rnnavermap.mjstudio.net/docs)

## 확정 연동 방식

### React Native Naver Map

MVP는 React Native용 네이버 지도 라이브러리인 `@mj-studio/react-native-naver-map`을 사용합니다.

선택 기준:

- React Native + Expo 환경에서 config plugin을 제공한다.
- TypeScript 타입을 제공한다.
- iOS와 Android 네이티브 네이버 지도 SDK를 감싼다.
- Expo Go가 아니라 Development Build로 실행한다.

현재 설치 버전:

- `@mj-studio/react-native-naver-map`: `2.9.0`
- 네이버 지도 SDK: iOS SDK `3.23.2`, Android SDK `3.23.2`

## 플랫폼 우선순위

iOS를 먼저 구현합니다.

현재 앱 설정:

- iOS Bundle Identifier: `com.datemap`
- Expo scheme: `datemap`

네이버 Cloud Platform의 Maps 애플리케이션에도 같은 Bundle ID를 등록해야 합니다. Bundle ID가 다르면 지도 인증이 실패할 수 있습니다.

## 네이버 Cloud Platform 준비 상태

완료:

- 네이버 Cloud Platform 계정 생성
- Maps 사용 준비
- 결제수단 등록

남은 작업:

- Maps 애플리케이션 생성
- 서비스 환경을 Mobile App으로 설정
- iOS Bundle ID 등록
- Client ID 발급
- 로컬 `.env`에 Client ID 추가

장점:

- 모바일 지도 사용성이 좋다.
- 현재 위치, 마커, 카메라 제어가 자연스럽다.
- 앱 출시 형태와 잘 맞는다.

주의할 점:

- Expo Go에서는 동작하지 않는다.
- `npx expo run:ios` 또는 EAS Development Build가 필요하다.
- Client ID를 앱 config plugin에 주입해야 하므로 실제 값은 `.env`에만 둔다.
- Client Secret은 모바일 앱 번들에 넣지 않는다.

## 장소 저장 흐름

```text
지도 표시
→ 장소명 검색
→ 검색 결과 선택
→ 장소명/주소/좌표 확인
→ 데이트 날짜 선택
→ 사진 여러 장 첨부
→ 한 줄 일기와 해시태그 작성
→ 로컬 DB 저장
→ 지도 마커와 날짜별 장소 목록 갱신
```

지도에서 직접 핀을 선택하는 흐름은 검색 결과가 없거나 사용자가 직접 위치를 지정하려는 경우의 보조 수단입니다.

## API 키 관리 원칙

- API 키를 공개 저장소에 커밋하지 않는다.
- `.env` 또는 네이티브 설정 파일에서 분리한다.
- 클라이언트 노출이 불가피한 키는 도메인, 앱 패키지, 번들 ID 제한을 설정한다.
- 서버가 필요한 API는 백엔드 프록시를 검토한다.
- Expo 설정 파일에 민감 키를 직접 하드코딩하지 않는다.
- `.env.example`에는 키 이름만 남기고 실제 값은 비워 둔다.
- 운영 키와 개발 키를 분리한다.
- 키 유출 시 재발급과 폐기 절차를 문서화한다.
- 장소 검색 API가 Client Secret을 요구하면 모바일 앱에서 직접 호출하지 않는다.
- 검색 API는 백엔드 프록시를 두거나 Secret이 필요 없는 안전한 API만 앱에서 호출한다.

## React Native + Expo 고려사항

- 네이버 지도 네이티브 SDK를 사용하므로 Expo Dev Client가 필요하다.
- Expo Go에서는 동작하지 않는다.
- 네이티브 설정이 필요한 API 키는 iOS bundle identifier와 Android package name 제한을 함께 설정한다.
- 장소 검색 API가 서버 호출을 요구하면 백엔드 프록시를 두고 앱에서는 직접 호출하지 않는다.

## 장소 검색 전략

우선순위:

1. 네이버 Cloud Platform에서 모바일 앱에 안전하게 사용할 수 있는 장소 검색 API가 있는지 확인한다.
2. Client Secret이 필요한 API라면 앱에서 직접 호출하지 않고 백엔드 프록시를 만든다.
3. MVP 초기에는 지도 탭 좌표 저장을 보조 기능으로 유지한다.

현재 앱 구현:

- 앱은 `EXPO_PUBLIC_NAVER_PLACE_SEARCH_ENDPOINT`로 설정된 장소 검색 프록시를 호출한다.
- 프록시는 `query` 파라미터를 받아 네이버 장소 검색 또는 Geocoding 계열 API를 호출하고, 앱에는 정규화된 장소 목록만 반환한다.
- 모바일 앱에는 네이버 Client Secret을 넣지 않는다.
- 프록시가 아직 없으면 장소명 직접 입력과 지도 탭 좌표 선택 흐름을 유지한다.

### Vercel Serverless Function

현재 프록시 구현 위치:

- Vercel Root Directory: `app/`
- Function: `app/api/naver-place-search.js`
- Endpoint: `/api/naver-place-search`

Vercel 환경 변수:

- `NAVER_MAP_CLIENT_ID`: Naver Cloud Platform Maps Client ID
- `NAVER_MAP_CLIENT_SECRET`: Naver Cloud Platform Maps Client Secret
- `NAVER_SEARCH_CLIENT_ID`: 선택 사항, NAVER Developers Local Search Client ID
- `NAVER_SEARCH_CLIENT_SECRET`: 선택 사항, NAVER Developers Local Search Client Secret

앱 환경 변수:

- `EXPO_PUBLIC_NAVER_PLACE_SEARCH_ENDPOINT=https://<vercel-domain>/api/naver-place-search`

동작 방식:

1. `NAVER_SEARCH_CLIENT_ID/SECRET`이 있으면 Local Search로 장소 후보를 찾는다.
2. 후보의 주소를 Naver Cloud Maps Geocoding으로 변환해 위도/경도를 얻는다.
3. Local Search 키가 없으면 Naver Cloud Maps Geocoding만으로 `query`를 검색한다.
4. 앱에는 `id`, `name`, `address`, `latitude`, `longitude`, `category`만 반환한다.

프록시 응답 형식:

```json
{
  "results": [
    {
      "id": "naver-place-id",
      "name": "장소 이름",
      "address": "주소",
      "latitude": 37.5665,
      "longitude": 126.978,
      "category": "카페"
    }
  ]
}
```

저장해야 하는 검색 결과:

- 외부 장소 ID가 있으면 저장
- 장소명
- 주소
- 위도
- 경도
- 카테고리 또는 키워드 후보

## iOS Development Build 실행 흐름

```bash
cd app
cp .env.example .env
# .env에 EXPO_PUBLIC_NAVER_MAP_CLIENT_ID 입력
npm run ios:dev
npm run start:dev-client
```

주의:

- `npm run ios:dev`는 iOS native project를 생성하고 시뮬레이터 또는 기기에 Development Build를 설치한다.
- Client ID가 없거나 Bundle ID가 네이버 콘솔 설정과 다르면 지도가 뜨지 않을 수 있다.
- 처음 빌드 전 Xcode와 CocoaPods 환경이 필요하다.
- iOS CocoaPods 빌드는 한글이 없는 ASCII-only 경로에서 실행하는 것을 권장한다.

## 개인정보 보호 원칙

- 위치 권한은 지도 사용 또는 현재 위치 버튼을 누르는 시점에 요청한다.
- 사용자의 현재 위치를 자동으로 저장하지 않는다.
- 데이트 카드에는 사용자가 명시적으로 저장한 장소 좌표만 저장한다.
- 사진 메타데이터에 위치 정보가 포함될 수 있으므로 업로드 기능을 추가할 때 제거 여부를 검토한다.

## 확인할 질문

- 네이버 지도에서 장소 검색 결과가 어느 API로 제공되는가?
- 장소 검색 결과에 안정적인 장소 ID가 포함되는가?
- 좌표만 저장해도 나중에 충분한가, 장소 ID를 반드시 저장해야 하는가?
- 무료 사용량이 MVP 테스트에 충분한가?
- iOS Bundle ID `com.datemap`이 네이버 콘솔 설정과 일치하는가?
