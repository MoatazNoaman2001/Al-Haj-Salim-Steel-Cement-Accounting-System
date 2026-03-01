"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/types/database";

interface UserContextValue {
  userId: string;
  profile: Profile;
  isAdmin: boolean;
}

export const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export function useIsAdmin() {
  const { isAdmin } = useUser();
  return isAdmin;
}
