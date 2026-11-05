type SearchableFields = {
  placeName: string;
  address?: string | null;
  oneLineDiary?: string | null;
  hashtags: string[];
};

export function buildSearchText({ placeName, address, oneLineDiary, hashtags }: SearchableFields) {
  return [placeName, address, oneLineDiary, ...hashtags].filter(Boolean).join(' ').trim().toLowerCase();
}
