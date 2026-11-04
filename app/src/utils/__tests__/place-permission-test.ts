import { canEditPlace } from '@/utils/place-permission';

describe('canEditPlace', () => {
  it('allows the owner', () => {
    expect(canEditPlace({ ownerUserId: 'me' }, 'me')).toBe(true);
  });

  it("does not allow the partner's records", () => {
    expect(canEditPlace({ ownerUserId: 'partner' }, 'me')).toBe(false);
  });

  it('allows records with no owner', () => {
    expect(canEditPlace({ ownerUserId: null }, 'me')).toBe(true);
  });

  it('does not allow owned records when signed out', () => {
    expect(canEditPlace({ ownerUserId: 'me' }, undefined)).toBe(false);
  });
});
