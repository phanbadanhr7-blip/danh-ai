export function makeId(prefix = 'msg') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
