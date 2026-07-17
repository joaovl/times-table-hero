export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Deliberately simple: one @, a dot in the domain, no spaces. Real delivery is
// the ultimate validator; we only guard against obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
