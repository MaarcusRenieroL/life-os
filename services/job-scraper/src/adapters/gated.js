// LinkedIn / WellFound / Naukri require an authenticated session or an official
// API partnership, and their ToS prohibit unauthenticated scraping. Rather than
// try to defeat that, these adapters return nothing and explain what a real
// integration needs. Wire a partner API key or a user-supplied session cookie
// here to enable them.

function gatedAdapter(name, requirement) {
  return async () => {
    return {
      jobs: [],
      note: `${name} not scraped: ${requirement}`,
    };
  };
}

export const linkedin = gatedAdapter(
  'LinkedIn',
  'needs the LinkedIn Talent / Jobs partner API or a user-authorised session cookie',
);
export const wellfound = gatedAdapter(
  'WellFound',
  'needs a logged-in session; use their recruiter API where available',
);
export const naukri = gatedAdapter('Naukri', 'needs a partner API key');
