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

// Whether the invitation link is still valid. In production this is derived
// from the signed token's expiry returned by the backend when the deep link
// opens the app. Flip to `false` to preview the "Invitation Expired" screen.
export const INVITATION_VALID = true;

// Where the "Contact Admin" action on the expired screen writes to.
export const SUPPORT_EMAIL = 'support@yawmycare.com';
