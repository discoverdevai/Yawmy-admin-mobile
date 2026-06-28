// ============================================================
// Temporary local credentials for sign-in (no backend yet).
// The password is mutable so the reset-password flow can update it
// in-session. Replace all of this with a real auth API later.
// ============================================================

const DUMMY_EMAIL = 'shehabgamal623@gmail.com';
let userPassword = 'shehabgamal623';

export const DUMMY_USER = {
  email: DUMMY_EMAIL,
  get password() {
    return userPassword;
  },
};

// Static password-reset verification code.
export const RESET_CODE = '1234';

/** Update the locally stored password (used by the reset-password flow). */
export function setUserPassword(newPassword) {
  userPassword = newPassword;
}

export function isRegisteredEmail(email) {
  return email.trim().toLowerCase() === DUMMY_EMAIL.toLowerCase();
}

export function validateCredentials(email, password) {
  return (
    email.trim().toLowerCase() === DUMMY_EMAIL.toLowerCase() &&
    password === userPassword
  );
}
