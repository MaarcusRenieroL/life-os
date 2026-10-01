/** Which module owns which part of the app, so a module that is switched off disappears from the
 * sidebar and Home and its pages explain themselves instead of silently still working. */
const ROUTE_MODULES: { prefix: string; code: string }[] = [
  { prefix: '/tasks', code: 'TK' },
  { prefix: '/calendar', code: 'CL' },
  { prefix: '/jobs', code: 'JT' },
  { prefix: '/notes', code: 'NT' },
  { prefix: '/vault', code: 'PM' },
  { prefix: '/finance', code: 'FN' },
  { prefix: '/habits', code: 'HB' },
  { prefix: '/goals', code: 'GL' },
  { prefix: '/workouts', code: 'WK' },
  { prefix: '/analytics', code: 'AN' },
];

/** The module code a path belongs to, or null for always-on pages (Home, Today, Email, Settings...). */
export function moduleForPath(path: string): string | null {
  const hit = ROUTE_MODULES.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? hit.code : null;
}
