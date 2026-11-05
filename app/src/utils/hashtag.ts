export function uniqueHashtags(hashtags: string[]) {
  return [...new Set(hashtags)];
}

export function parseHashtagInput(text: string) {
  return uniqueHashtags(
    text
      .split(/[,\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
  );
}
