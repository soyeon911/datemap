// expo-crypto takes bytes or a base64 string, and TextEncoder/TextDecoder support
// varies across React Native engines, so the conversion is done here directly.
export function utf8Encode(text: string) {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.codePointAt(0)!;

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  return Uint8Array.from(bytes);
}

export function utf8Decode(bytes: Uint8Array) {
  let text = '';
  let index = 0;

  while (index < bytes.length) {
    const first = bytes[index];
    const length = first < 0x80 ? 1 : first < 0xe0 ? 2 : first < 0xf0 ? 3 : 4;
    let code = length === 1 ? first : first & (0xff >> (length + 1));

    for (let offset = 1; offset < length; offset += 1) {
      code = (code << 6) | (bytes[index + offset] & 0x3f);
    }

    text += String.fromCodePoint(code);
    index += length;
  }

  return text;
}
