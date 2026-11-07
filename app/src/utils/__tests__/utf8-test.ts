import { utf8Decode, utf8Encode } from '@/utils/utf8';

describe('utf8', () => {
  it.each([
    ['ascii', '{"access_token":"abc"}'],
    ['korean', '데이트 기록'],
    ['emoji', '하트 💕 마커'],
    ['empty', ''],
  ])('round-trips %s text', (_, text) => {
    expect(utf8Decode(utf8Encode(text))).toBe(text);
  });

  it('matches the standard encoder', () => {
    const text = 'Seoul 서울 🗺️';

    expect(Array.from(utf8Encode(text))).toEqual(Array.from(new TextEncoder().encode(text)));
  });
});
