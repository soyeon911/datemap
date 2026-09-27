# Data Model

## 저장소 결정

MVP 로컬 DB는 SQLite로 결정합니다.

SQLite를 선택한 이유:

- 데이트 카드, 사진, 키워드처럼 관계가 있는 데이터를 안정적으로 저장할 수 있다.
- 월별, 주별, 장소명, 키워드 검색을 쿼리로 확장하기 좋다.
- React Native + Expo 환경에서 사용할 수 있는 선택지가 있다.
- 서버 동기화 전에도 오프라인 사용성을 제공할 수 있다.

## 보안 전제

- 위치, 사진, 메모는 민감한 개인정보로 취급한다.
- SQLite에는 서비스에 필요한 최소 데이터만 저장한다.
- API 키, 액세스 토큰, 리프레시 토큰은 데이트 기록 테이블에 저장하지 않는다.
- 추후 로그인 도입 시 인증 토큰은 보안 저장소 사용을 검토한다.
- 커플 연동 기능은 사용자별 소유권과 공유 권한을 검증할 수 있게 모델을 확장한다.

## 핵심 엔티티

### DateEntry

데이트 날짜 단위의 기록입니다. 같은 날짜에 여러 장소가 연결될 수 있습니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 데이트 일자 고유 ID |
| `ownerUserId` | string nullable | 로그인 도입 후 소유자 ID |
| `coupleId` | string nullable | 커플 연동 도입 후 공유 공간 ID |
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
| `hashtags` | string[] | 해시태그 |
| `coverPhotoUri` | string nullable | 대표 사진 URI |
| `syncStatus` | string | 로컬/동기화 상태 |
| `createdAt` | string | 생성 시각 |
| `updatedAt` | string | 수정 시각 |

### DatePhoto

장소별 사진입니다. 같은 장소에 여러 장의 사진을 연결합니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 사진 고유 ID |
| `datePlaceId` | string | 연결된 데이트 장소 ID |
| `localUri` | string | 기기 로컬 사진 URI |
| `remoteUrl` | string nullable | 서버 업로드 후 URL |
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

## SQLite 테이블 초안

```sql
CREATE TABLE date_entries (
  id TEXT PRIMARY KEY,
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
  FOREIGN KEY (date_entry_id) REFERENCES date_entries(id)
);

CREATE TABLE date_photos (
  id TEXT PRIMARY KEY,
  date_place_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  remote_url TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (date_place_id) REFERENCES date_places(id)
);
```

## 추후 확장 엔티티

### User

- 로그인 사용자
- 이메일 또는 소셜 로그인 식별자
- 프로필 이름
- 생성일

### Couple

- 커플 공유 공간
- 초대 코드 또는 초대 링크
- 멤버 목록
- 공유 권한

### SyncState

- 로컬 변경 여부
- 서버 동기화 시각
- 충돌 해결 상태
