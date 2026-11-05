// Guards the jest.config.js TZ pin: if this fails, date expectations elsewhere in
// the suite can't be trusted.
describe('test environment time zone', () => {
  it('runs in Asia/Seoul (UTC+9)', () => {
    expect(new Date('2026-11-04T00:00:00').getTimezoneOffset()).toBe(-540);
  });
});
