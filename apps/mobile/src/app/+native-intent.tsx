// A lifeos://setup?... link carries the server and Access token for the session provider to read
// (see lib/session.tsx). It is not a page, so send the router to the home screen instead of "Unmatched Route".
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return /^(lifeos:\/\/)?\/?setup(\?|$)/.test(path) ? '/' : path;
}
