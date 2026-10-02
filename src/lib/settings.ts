// Site settings, kept in one place.
// The form endpoint can also be set in Vercel as PUBLIC_FORM_ENDPOINT, so it changes without a commit.
export const SETTINGS = {
  /** New worlds that open this quarter. Leave empty to hide the line. */
  intake: '2',
  /** Where the score quiz and the sigil page send leads (Formspree, Basin or similar). Leave empty to hide both forms. */
  formEndpoint: (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined)?.trim() || '',
};
