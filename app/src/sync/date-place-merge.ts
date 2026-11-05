export type SyncedFields = {
  dateEntryId: string;
  placeId: string | null;
  placeName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  oneLineDiary: string | null;
  hashtags: string[];
};

// A place's id, name, address and coordinates only make sense together, so they
// count as one choice instead of being merged field by field.
const FIELD_GROUPS = {
  date: ['dateEntryId'],
  place: ['placeId', 'placeName', 'address', 'latitude', 'longitude'],
  diary: ['oneLineDiary'],
  hashtags: ['hashtags'],
} as const satisfies Record<string, readonly (keyof SyncedFields)[]>;

export type FieldGroup = keyof typeof FIELD_GROUPS;

const GROUP_NAMES = Object.keys(FIELD_GROUPS) as FieldGroup[];

function readGroup(fields: SyncedFields, group: FieldGroup) {
  return JSON.stringify(FIELD_GROUPS[group].map((key) => fields[key]));
}

export function copyGroups(target: SyncedFields, source: SyncedFields, groups: FieldGroup[]): SyncedFields {
  const next = { ...target };

  for (const group of groups) {
    for (const key of FIELD_GROUPS[group]) {
      Object.assign(next, { [key]: source[key] });
    }
  }

  return next;
}

// Three-way merge: `base` is what this device last synced, so comparing against it
// shows who changed what. With no base there is no way to tell, so any difference
// goes to the person rather than being guessed at.
export function mergeSyncedFields(base: SyncedFields | null, mine: SyncedFields, theirs: SyncedFields) {
  const conflicts: FieldGroup[] = [];
  const takeTheirs: FieldGroup[] = [];

  for (const group of GROUP_NAMES) {
    const mineValue = readGroup(mine, group);
    const theirValue = readGroup(theirs, group);

    if (mineValue === theirValue) {
      continue;
    }

    if (!base) {
      conflicts.push(group);
      continue;
    }

    const baseValue = readGroup(base, group);

    if (mineValue === baseValue) {
      takeTheirs.push(group);
    } else if (theirValue !== baseValue) {
      conflicts.push(group);
    }
  }

  return { merged: copyGroups(mine, theirs, takeTheirs), conflicts };
}

const GROUP_LABELS: Record<FieldGroup, string> = {
  date: '날짜',
  place: '장소',
  diary: '일기',
  hashtags: '해시태그',
};

const EMPTY_VALUE = '(없음)';

function describeGroup(fields: SyncedFields, group: FieldGroup) {
  switch (group) {
    case 'date':
      return fields.dateEntryId.replace(/^entry_/, '');
    case 'place':
      return fields.placeName;
    case 'diary':
      return fields.oneLineDiary || EMPTY_VALUE;
    case 'hashtags':
      return fields.hashtags.map((tag) => `#${tag}`).join(' ') || EMPTY_VALUE;
  }
}

export function describeConflict(groups: FieldGroup[], mine: SyncedFields, theirs: SyncedFields) {
  return groups
    .map(
      (group) =>
        `${GROUP_LABELS[group]}\n내 수정: ${describeGroup(mine, group)}\n다른 기기: ${describeGroup(theirs, group)}`
    )
    .join('\n\n');
}

export function parseSyncedFields(json: string | null): SyncedFields | null {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as SyncedFields;
  } catch {
    return null;
  }
}
