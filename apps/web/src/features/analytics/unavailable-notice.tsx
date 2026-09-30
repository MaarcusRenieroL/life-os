/** Shown when a module didn't answer, so a zero on the page isn't mistaken for "nothing happened". */
export function UnavailableNotice({ modules }: { modules: string[] }) {
  if (modules.length === 0) return null;
  return (
    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      No data from {modules.join(', ')} right now - numbers involving {modules.length === 1 ? 'it' : 'them'} show as zero.
    </p>
  );
}
