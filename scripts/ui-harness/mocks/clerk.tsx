// Stable references, like real Clerk — a fresh object per render re-runs every effect keyed on it.
const USER = { id: 'u', firstName: 'Shivam', fullName: 'Shivam Sahu', username: 'shivam', imageUrl: '', primaryEmailAddress: { emailAddress: 'civamsahu@gmail.com' } };
const STATE = { isLoaded: true, isSignedIn: true, user: USER };
const CLERK = { signOut: () => {} };
export const useUser = () => STATE;
export const useClerk = () => CLERK;
export const SignedIn = ({ children }: { children: React.ReactNode }) => children;
export const UserButton = () => null;
