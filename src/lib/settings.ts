// Site settings, kept in one place.
// The form endpoint can also be set in Vercel as PUBLIC_FORM_ENDPOINT, so it changes without a commit.
export const SETTINGS = {
  /** New worlds that open this quarter. The line hides after `until` (the end of that day, Toronto time); set the next quarter and count by hand. An empty count hides it. */
  intake: { count: '2', quarter: 'Q4 2026', until: '2026-12-31' },
  /** The postal address printed under each email form (CASL). Empty hides the line. Never a phone number. */
  mailingAddress: '',
  /** Where the score quiz and the sigil page send leads (Formspree). Submissions arrive by email at the Formspree account's address. Empty hides both forms. */
  /** Social profiles. Paste the full URL; an empty one stays hidden everywhere (footer icons and search-engine sameAs). */
  social: {
    youtube: '',
    instagram: '',
    facebook: '',
    linkedin: '',
  },
  formEndpoint: (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined)?.trim() || 'https://formspree.io/f/mljdykov',
};
