# DearMap Documentation

DearMap은 데이트한 장소를 지도 위에 저장하고, 사진과 메모를 함께 카드로 남기는 모바일 앱입니다.

## 현재 구현 상태

| 영역 | 구현된 내용 |
| --- | --- |
| 기록 | 네이버 지도 위 장소 선택·검색, 날짜별 여러 장소, 사진 여러 장, 한 줄 일기, 해시태그 (중복 자동 제거) |
| 조회 | 지도 하트 마커, 시/도·시/군/구 묶음 보기, 기간·주차 필터, 저장 기록 카드 |
| 계정 | Supabase 이메일 6자리 코드 로그인. 세션은 기기에 암호화해 저장 |
| 공유 | 초대 코드 기반 커플 연결. 상대 기록은 보기만 가능 (RLS로 수정 차단) |
| 동기화 | 로컬 SQLite 우선 저장 후 Supabase 업로드. 두 기기가 같은 기록을 고치면 다른 칸은 자동으로 합치고, 같은 칸은 선택 창 표시 |
| 검색 프록시 | Vercel 함수. 로그인 세션을 검증하고, 네이버 Client Secret은 서버에만 둠 |

플랫폼은 iOS를 우선 검증했습니다. Android는 네이티브 지도 연동과 실기기 검증이 남아 있습니다.

남은 문제는 `docs/known-issues.md`에 확인 방법(실행 확인 / 코드 추정)과 함께 정리합니다.

## 문서 구조

| 경로 | 목적 |
| --- | --- |
| `docs/product/product-brief.md` | 서비스 목표, 사용자, 핵심 가치 |
| `docs/product/roadmap.md` | 단계별 개발 범위와 진행 상태 |
| `docs/features/date-map-mvp.md` | 데이트 지도 기능 상세 |
| `docs/features/search-and-timeline.md` | 주별, 월별, 장소명, 키워드 검색 계획 |
| `docs/architecture/app-architecture.md` | 앱 구조, 저장·동기화 흐름, 기술 스택 |
| `docs/architecture/data-model.md` | 로컬 SQLite와 Supabase 데이터 모델 |
| `docs/api/naver-map-api-plan.md` | 네이버 지도 API와 검색 프록시 |
| `docs/security/security-principles.md` | 권한, 키 관리, 세션 저장, 로그, 커플 공유 기준 |
| `docs/known-issues.md` | 해결한 문제와 남은 문제 |
| `docs/implementation/phase-1-expo-sqlite-setup.md` | 초기 프로젝트 생성 계획 (작성 당시 기준) |
| `docs/decisions/0001-app-first-date-map.md` | 앱 우선, 지도 기록부터 시작 |
| `docs/decisions/0002-tech-stack-and-security.md` | React Native + Expo, SQLite, 보안 우선 |
| `docs/decisions/0003-ios-first-naver-map.md` | iOS 우선 네이버 지도 연동 |
| `docs/decisions/0004-cloud-sync-and-edit-conflicts.md` | 동기화 대기열과 버전 기반 충돌 처리 |
| `docs/decisions/0005-session-encryption-and-safe-logs.md` | 세션 암호화와 허용 목록 방식의 오류 로그 |
| `docs/decisions/0006-email-otp-delivery.md` | 이메일 코드 발송용 Custom SMTP |

## 배포 순서 주의

- 서버 스키마를 바꾸는 기능은 `supabase/migrations`의 SQL을 앱보다 먼저 적용합니다.
- 네이티브 모듈을 추가한 변경(예: `expo-crypto`)은 앱 재빌드가 필요합니다.
- `main` 머지는 Vercel 운영 배포로 이어지고, 환경 변수는 새 배포부터 적용됩니다.

## 아직 하지 않는 것

- 채팅, 일정 초대, 알림
- 자동 데이트 추천
- 복잡한 통계 화면
- 전체 검색 고도화
- 장소 리뷰/평점 수집
- 실시간 동기화와 오프라인 업로드 자동 재시도

## 문서 작성 원칙

- 먼저 만들 기능과 나중에 만들 기능을 분리한다.
- 화면, 데이터, API 의존성을 같은 이름으로 맞춘다.
- 보안과 개인정보 보호는 모든 기능의 기본 요구사항으로 본다.
- 외부 API는 구현 전에 공식 문서를 다시 확인한다.
- 기능 요구사항은 사용자 행동 기준으로 적는다.
