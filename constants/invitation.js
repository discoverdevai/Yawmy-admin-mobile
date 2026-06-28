// ============================================================
// Invitation bypass (temporary)
//
// In the real flow the admin receives an invitation email with a link that
// carries a signed token + expiration. Opening that link deep-links into the
// app and lands on the invitation-validation (Welcome) screen.
//
// For now that step is bypassed: the invited email and nursery name are
// hard-coded here so we can build the post-invite screens. Replace this with
// the token parsed from the deep-link query params once the backend is ready.
// ============================================================

export const INVITED_EMAIL = 'shehabgamal123@gmail.com';

export const NURSERY_NAME = '[Nursery Name]';
