import { describe, expect, it } from 'vitest';
import { isAuthSubmitDisabled, MIN_REGISTER_PASSWORD_LENGTH } from './AuthDialog';

/**
 * #365: the register form stated an 8-character password minimum ("Use at
 * least 8 characters.") but the submit button's disabled condition never
 * checked length, so a 2-character password could be submitted. This covers
 * the extracted `isAuthSubmitDisabled` — the single source of truth the
 * submit button and the form's `onSubmit` both call — for both modes.
 */
describe('isAuthSubmitDisabled', () => {
  it('keeps the register button disabled below the stated minimum', () => {
    expect(
      isAuthSubmitDisabled({
        mode: 'register',
        email: 'a@example.com',
        password: '1234567', // 7 chars, one short of the minimum
        submitting: false,
      }),
    ).toBe(true);
  });

  it('enables the register button once the password reaches the stated minimum', () => {
    expect(MIN_REGISTER_PASSWORD_LENGTH).toBe(8);
    expect(
      isAuthSubmitDisabled({
        mode: 'register',
        email: 'a@example.com',
        password: '12345678', // exactly 8 chars
        submitting: false,
      }),
    ).toBe(false);
  });

  it('keeps the register button enabled comfortably above the minimum', () => {
    expect(
      isAuthSubmitDisabled({
        mode: 'register',
        email: 'a@example.com',
        password: 'a-much-longer-password',
        submitting: false,
      }),
    ).toBe(false);
  });

  it('does not apply the 8-character minimum in login mode', () => {
    expect(
      isAuthSubmitDisabled({
        mode: 'login',
        email: 'a@example.com',
        password: 'ab', // 2 chars — fine for an existing password
        submitting: false,
      }),
    ).toBe(false);
  });

  it('still disables login when the password is empty', () => {
    expect(
      isAuthSubmitDisabled({
        mode: 'login',
        email: 'a@example.com',
        password: '',
        submitting: false,
      }),
    ).toBe(true);
  });

  it('disables both modes while submitting or with no email', () => {
    expect(
      isAuthSubmitDisabled({
        mode: 'login',
        email: 'a@example.com',
        password: 'ab',
        submitting: true,
      }),
    ).toBe(true);
    expect(
      isAuthSubmitDisabled({
        mode: 'register',
        email: '   ',
        password: '12345678',
        submitting: false,
      }),
    ).toBe(true);
  });
});
