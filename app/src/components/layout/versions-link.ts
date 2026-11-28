/** The repo README's account of the versions. */
export const VERSIONS_README = "https://github.com/nitzpo/sl5#versions";

/**
 * Where the header's "Versions" goes. The Pages deploy builds each version
 * under its own prefix (`/sl5/v2/`), and the version picker is that prefix's
 * parent. Anywhere else — `npm run dev` and `npm run preview` serve the app at
 * `/sl5/` — the parent is the server root, a 404, so the link goes to the
 * README's Versions section instead.
 */
export function versionsHref(base: string): string {
  return /\/v\d+\/$/.test(base) ? `${base}../` : VERSIONS_README;
}
