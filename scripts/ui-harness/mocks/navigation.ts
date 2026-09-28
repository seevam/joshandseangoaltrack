export const useRouter = () => ({ push: (u: string) => { location.hash = u; }, back: () => history.back(), replace: (u: string) => { location.hash = u; } });
export const usePathname = () => (location.hash.slice(1) || '/home');
export const useParams = () => ({});
export const useSearchParams = () => new URLSearchParams();
