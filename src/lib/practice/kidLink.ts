// Maps a device-local avatar profile (userStorage) to a cloud kid under the
// signed-in parent's account, so real practice can be logged to the right kid.

const KEY = 'tth_kid_links';
type LinkMap = Record<string, string>; // localProfileId -> cloudKidId

function read(): LinkMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as LinkMap;
  } catch {
    return {};
  }
}
function write(m: LinkMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function getLink(localId: string): string | null {
  return read()[localId] ?? null;
}
export function setLink(localId: string, cloudKidId: string): void {
  const m = read();
  m[localId] = cloudKidId;
  write(m);
}
export function clearLink(localId: string): void {
  const m = read();
  delete m[localId];
  write(m);
}
export function getAllLinks(): LinkMap {
  return read();
}
