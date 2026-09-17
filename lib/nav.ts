/**
 * Whether a nav entry should read as active for the page you are on.
 *
 * An exact match is wrong for anything with children: standing on
 * /goals/abc is still standing in Goals, and the tab went dark the moment you
 * opened a goal. Section roots match their whole subtree; /home is exact
 * because it has none.
 */
export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
