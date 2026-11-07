# Data Model

## 저장소 결정

기록은 기기의 SQLite에 먼저 저장하고, 로그인 후 Supabase(Postgres)와 동기화합니다. 로컬 스키마는 `app/src/db/migrations.ts`(현재 버전 4), 서버 스키마는 `supabase/schema.sql`과 `supabase/migrations/`가 기준입니다.

SQLite를 선택한 이유:

- 데이트 카드, 사진, 키워드처럼 관계가 있는 데이터를 안정적으로 저장할 수 있다.
- 월별, 주별, 장소명, 키워드 검색을 쿼리로 확장하기 좋다.
- React Native + Expo 환경에서 사용할 수 있는 선택지가 있다.
- 서버 동기화 전에도 오프라인 사용성을 제공할 수 있다.

## 보안 전제

- 위치, 사진, 메모는 민감한 개인정보로 취급한다.
- SQLite에는 서비스에 필요한 최소 데이터만 저장한다.
- API 키, 액세스 토큰, 리프레시 토큰은 데이트 기록 테이블에 저장하지 않는다.
- 로그인 세션은 데이트 기록 테이블이 아니라 암호화 저장소에 둔다 (`docs/decisions/0005-session-encryption-and-safe-logs.md`).
- 서버의 모든 기록 테이블은 RLS로 본인 기록과 커플 상대 기록만 읽고, 본인 기록만 쓰게 한다.

## 핵심 엔티티

### DateEntry

데이트 날짜 단위의 기록입니다. 같은 날짜에 여러 장소가 연결될 수 있습니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 데이트 일자 고유 ID |
| `ownerUserId` | string nullable | 소유자 ID. 로그인 전 기록은 `null` |
| `coupleId` | string nullable | 커플 공유 공간 ID |
| `date` | string | 데이트 날짜, ISO 날짜 |
| `year` | number | 검색 최적화용 연도 |
| `month` | number | 검색 최적화용 월 |
| `weekOfYear` | number | 주별 검색용 주차 |
| `summary` | string nullable | 해당 날짜의 요약 |
| `createdAt` | string | 생성 시각 |
| `updatedAt` | string | 수정 시각 |

### DatePlace

데이트 날짜에 연결된 장소 기록입니다. 같은 `DateEntry`에 여러 `DatePlace`가 연결될 수 있습니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 데이트 장소 고유 ID |
| `dateEntryId` | string | 연결된 데이트 일자 ID |
| `placeId` | string nullable | 외부 장소 ID가 있을 때 저장 |
| `placeName` | string | 장소명 |
| `address` | string nullable | 도로명 또는 지번 주소 |
| `latitude` | number | 위도 |
| `longitude` | number | 경도 |
| `oneLineDiary` | string nullable | 한 줄 일기 |
| `hashtags` | string[] | 해시태그. 입력과 읽기 모두에서 중복을 제거하고 처음 순서를 유지 |
| `coverPhotoUri` | string nullable | 대표 사진 URI |
| `syncStatus` | string | `local_only`(업로드 전) 또는 `synced` |
| `ownerUserId` | string nullable | 소유자 ID. 수정·삭제 권한 판단에 사용 |
| `coupleId` | string nullable | 커플 공유 공간 ID |
| `serverVersion` | number nullable | 마지막으로 읽은 서버 `version`. 업로드 조건에 사용 |
| `syncedFieldsJson` | string nullable | 마지막 동기화 시점의 값. 충돌 시 3-way 비교의 기준 |
| `createdAt` | string | 생성 시각 |
| `updatedAt` | string | 수정 시각 |

### DatePhoto

장소별 사진입니다. 같은 장소에 여러 장의 사진을 연결합니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 사진 고유 ID |
| `datePlaceId` | string | 연결된 데이트 장소 ID |
| `localUri` | string | 기기 로컬 사진 URI |
| `remoteUrl` | string nullable | 업로드 후 Supabase Storage 경로 (`date-photos` 버킷) |
| `sortOrder` | number | 표시 순서 |
| `createdAt` | string | 생성 시각 |

### Keyword

초기에는 문자열 배열로 시작할 수 있지만, 사용량이 늘면 별도 테이블로 분리합니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 키워드 고유 ID |
| `name` | string | 키워드 이름 |
| `color` | string nullable | UI 표시 색상 |
| `createdAt` | string | 생성 시각 |

## 예시 JSON

```json
{
  "id": "entry_20260626",
  "ownerUserId": null,
  "coupleId": null,
  "date": "2026-06-26",
  "year": 2026,
  "month": 6,
  "weekOfYear": 26,
  "places": [
    {
      "id": "place_20260626_001",
      "placeName": "성수동 카페",
      "address": "서울 성동구 ...",
      "latitude": 37.5446,
      "longitude": 127.0557,
      "oneLineDiary": "비 오는 날 갔던 카페. 창가 자리가 좋았다.",
      "hashtags": ["카페", "성수", "비오는날"],
      "photos": [
        {
          "id": "photo_001",
          "localUri": "file:///local/photo-1.jpg",
          "sortOrder": 1
        },
        {
          "id": "photo_002",
          "localUri": "file:///local/photo-2.jpg",
          "sortOrder": 2
        }
      ]
    }
  ],
  "createdAt": "2026-06-26T10:00:00.000Z",
  "updatedAt": "2026-06-26T10:00:00.000Z"
}
```

## 검색을 위한 파생 필드

검색 기능을 나중에 붙일 때 아래 값을 미리 만들어 두면 편합니다.

- `normalizedSearchText`: 장소명, 주소, 한 줄 일기, 해시태그를 소문자/공백 정리해서 합친 문자열
- `yearMonth`: `2026-06` 형식의 월별 조회 키
- `geoHash`: 지도 반경 검색을 위한 위치 인덱스 후보

## SQLite 테이블 (현재 버전 4)

`date_cards`(버전 1)는 초기 구조로 남아 있고, 현재 화면과 동기화는 아래 세 테이블을 씁니다.

```sql
CREATE TABLE date_entries (
  id TEXT PRIMARY KEY,               -- entry_YYYY-MM-DD
  owner_user_id TEXT,
  couple_id TEXT,
  date TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week_of_year INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE date_places (
  id TEXT PRIMARY KEY,
  date_entry_id TEXT NOT NULL,
  place_id TEXT,
  place_name TEXT NOT NULL,
  address TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  one_line_diary TEXT,
  hashtags_json TEXT NOT NULL DEFAULT '[]',
  cover_photo_uri TEXT,
  normalized_search_text TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local_only',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  owner_user_id TEXT,                -- 버전 3
  couple_id TEXT,                    -- 버전 3
  server_version INTEGER,            -- 버전 4
  synced_fields_json TEXT,           -- 버전 4
  FOREIGN KEY (date_entry_id) REFERENCES date_entries(id)
);

CREATE TABLE date_photos (
  id TEXT PRIMARY KEY,
  date_place_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,           -- 다른 기기에서 받은 사진은 내려받기 전까지 ''
  remote_url TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (date_place_id) REFERENCES date_places(id)
);
```

## Supabase 테이블

| 테이블 | 키 | 비고 |
| --- | --- | --- |
| `couples` | `id` (uuid) | 초대 코드(`invite_code`), 소유자와 파트너 |
| `date_entries` | `(user_id, id)` | 로컬 ID가 사용자별로만 고유해 복합 키 사용 |
| `date_places` | `(user_id, id)` | `version` 포함. 내용 칸이 바뀌면 트리거가 1 올림 |
| `date_photos` | `(user_id, id)` | `storage_path`로 Storage 파일을 가리킴 |

- **RLS:** 읽기는 본인 또는 같은 커플, 쓰기·수정·삭제는 본인(`auth.uid() = user_id`)만 허용합니다.
- **버전 트리거:** `date_entry_id`, 장소 정보, `one_line_diary`, `hashtags`가 바뀔 때만 올립니다. `couple_id`와 `cover_photo_path`는 제외합니다. 이유는 `docs/decisions/0004-cloud-sync-and-edit-conflicts.md`에 있습니다.

## 동기화 상태 흐름

1. 저장·수정하면 로컬 행이 `local_only`가 된다.
2. 업로드가 `server_version`과 같은 버전에서만 성공하면 `synced`가 되고, 새 버전과 동기화 값을 기록한다.
3. 버전이 다르면 서버 값을 읽어 `synced_fields_json`을 기준으로 비교한다. 다른 칸은 합치고, 같은 칸이면 사용자가 고른다.
4. pull은 `synced` 행만 덮어쓴다. 업로드 전 수정은 지키기 위해서다.

## 추후 확장 엔티티

`User`(Supabase Auth), `Couple`(`couples` 테이블), 동기화 상태(`sync_status`, `server_version`, `synced_fields_json`)는 구현되었습니다. 남은 확장 후보는 아래와 같습니다.

- **Keyword 테이블:** 해시태그 사용량이 늘면 문자열 배열에서 분리
- **삭제 표시(`deleted_at`):** 다른 기기의 삭제를 반영하기 위해 필요 (known-issues Y-3)
- **사진 비교:** 사진 ID를 유지하도록 바꾼 뒤 충돌 비교 대상에 추가 (known-issues Y-4, Y-7)
