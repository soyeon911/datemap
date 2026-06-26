# Decision 0003: iOS-first Naver Map Integration

## 상태

Accepted

## 날짜

2026-06-26

## 결정

DateMap의 첫 지도 구현은 iOS를 우선으로 진행합니다. 지도 연동은 React Native용 네이버 지도 라이브러리 `@mj-studio/react-native-naver-map`을 사용합니다.

## 이유

- 네이버 지도 경험은 네이티브 SDK 기반이 가장 자연스럽다.
- 해당 라이브러리는 React Native + Expo config plugin을 제공한다.
- TypeScript 기반 앱 구조와 잘 맞는다.
- Expo Go 대신 Development Build를 사용하면 iOS 네이티브 SDK 연동을 검증할 수 있다.

## 현재 전제

- 네이버 Cloud Platform 계정 생성 완료
- Maps 사용 준비 완료
- 결제수단 등록 완료
- iOS 우선 개발

## 앱 설정

- iOS Bundle Identifier: `com.datemap`
- 네이버 지도 Client ID 환경변수: `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`
- Client Secret은 앱에 포함하지 않는다.

## 영향

- Expo Go에서는 지도 화면을 검증하지 않는다.
- iOS Development Build가 필요하다.
- 네이버 콘솔의 Bundle ID와 앱 설정의 Bundle ID가 반드시 일치해야 한다.
- Android는 후순위지만 `expo-build-properties`에 네이버 Maven repository 설정을 준비해 둔다.
