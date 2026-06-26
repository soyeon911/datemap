# DearMap Documentation

DearMap은 데이트한 장소를 지도 위에 저장하고, 사진과 메모를 함께 카드로 남기는 모바일 앱입니다.

현재 문서는 첫 번째 구현 범위인 데이트 지도 기능을 중심으로 정리합니다. 검색, 월별/주별 회고, 키워드 필터링은 후속 기능으로 분리합니다.

## 문서 구조

| 경로 | 목적 |
| --- | --- |
| `product/product-brief.md` | 서비스 목표, 사용자, 핵심 가치 |
| `product/roadmap.md` | 단계별 개발 범위와 우선순위 |
| `features/date-map-mvp.md` | 첫 번째 구현 기능인 데이트 지도 MVP 상세 |
| `features/search-and-timeline.md` | 주별, 월별, 장소명, 키워드 검색 계획 |
| `architecture/app-architecture.md` | 앱 구조, 화면 흐름, 확정 기술 스택 |
| `architecture/data-model.md` | 장소, 데이트 기록, 사진, 태그 데이터 모델 |
| `api/naver-map-api-plan.md` | 네이버 지도 API 연동 계획과 확인할 사항 |
| `security/security-principles.md` | 보안 우선 원칙, 권한, 키 관리, 향후 로그인/커플 연동 기준 |
| `implementation/phase-1-expo-sqlite-setup.md` | React Native + Expo 프로젝트 생성과 SQLite 초기 설정 계획 |
| `decisions/0001-app-first-date-map.md` | 첫 번째 제품 의사결정 기록 |
| `decisions/0002-tech-stack-and-security.md` | React Native + Expo, SQLite, 보안 우선 결정 |
| `decisions/0003-ios-first-naver-map.md` | iOS 우선 네이버 지도 연동 결정 |

## 현재 우선순위

1. React Native + Expo 앱 프로젝트 생성
2. SQLite 로컬 DB 구조 준비
3. 보안 기준을 반영한 환경 변수와 API 키 관리 방식 정리
4. iOS Development Build 준비
5. 네이버 지도 Client ID를 로컬 `.env`에 설정
6. 네이버 지도 표시
7. 지도에서 장소 선택 또는 검색
8. 선택한 장소에 사진과 메모 저장
9. 저장된 장소를 카드 목록과 지도 마커로 확인
10. 월별 보기의 기본 구조 준비

## 이번 MVP에서 하지 않는 것

- 커플 계정 공유
- 채팅, 일정 초대, 알림
- 자동 데이트 추천
- 복잡한 통계 화면
- 전체 검색 고도화
- 장소 리뷰/평점 수집

## 문서 작성 원칙

- 먼저 만들 기능과 나중에 만들 기능을 분리한다.
- 화면, 데이터, API 의존성을 같은 이름으로 맞춘다.
- 보안과 개인정보 보호는 모든 기능의 기본 요구사항으로 본다.
- 외부 API는 구현 전에 공식 문서를 다시 확인한다.
- 기능 요구사항은 사용자 행동 기준으로 적는다.
