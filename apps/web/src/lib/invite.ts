const KEY = 'istighfar.invite';

export function saveInviteToken(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function readInviteToken(): string | null {
  return sessionStorage.getItem(KEY);
}

export function clearInviteToken() {
  sessionStorage.removeItem(KEY);
}
