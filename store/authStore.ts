"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  displayName: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  setUser: (user) => set({ user, initialized: true }),
  displayName: () => {
    const user = get().user;
    const meta = (user?.user_metadata ?? {}) as { name?: string };
    if (meta.name) return meta.name;
    const email = user?.email ?? "";
    const prefix = email.split("@")[0];
    return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "there";
  },
}));
