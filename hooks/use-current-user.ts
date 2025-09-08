// hooks/use-current-user.ts - FIXED

import { useSession } from "next-auth/react";
// Use 'import type' for type-only imports from declaration files
import type { ExtendedUser } from "@/next-auth.d.ts";

/**
 * A custom hook to access the current user's session data with proper typing.
 * This hook abstracts away the type casting needed for the extended user session.
 *
 * @returns The current user object from the session, or null if not authenticated.
 */
export const useCurrentUser = (): ExtendedUser | null => {
  const { data: session } = useSession();

  // Ensure we have a session and a user before returning
  if (!session?.user) {
    return null;
  }

  // We can safely cast here because our auth config guarantees these properties
  return session.user as ExtendedUser;
};