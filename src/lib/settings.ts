// Site settings, kept in one place.
// The form endpoint can also be set in Vercel as PUBLIC_FORM_ENDPOINT, so it changes without a commit.
export const SETTINGS = {
  /** New worlds that open this quarter. Leave empty to hide the line. */
  intake: '2',
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
