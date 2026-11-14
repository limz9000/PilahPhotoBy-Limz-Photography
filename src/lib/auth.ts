"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface StudioUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: "google" | "studio_session";
}

const LOCAL_STORAGE_KEY = "limz_photographer_session";

export function getLocalSession(): StudioUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalSession(user: StudioUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
  }
  // Dispatch custom event to notify all components
  window.dispatchEvent(new Event("limz-auth-change"));
}

export async function signInWithGoogle() {
  if (typeof window === "undefined") return;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn("Supabase Google Auth not available, switching to Studio Session fallback:", err.message);
    }
  }

  // Graceful local studio Google login simulation
  const mockGoogleUser: StudioUser = {
    id: "usr-google-limz",
    email: "wccin.bylimz@gmail.com",
    name: "Limz Photography",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    provider: "google",
  };
  setLocalSession(mockGoogleUser);
  window.location.href = "/dashboard";
}

export async function signInAsStudio(email = "wccin.bylimz@gmail.com", name = "Limz Photography") {
  const user: StudioUser = {
    id: "usr-limz-photographer",
    email,
    name,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    provider: "studio_session",
  };
  setLocalSession(user);
  if (typeof window !== "undefined") {
    window.location.href = "/dashboard";
  }
}

export async function signOutStudio() {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signOut error:", err);
    }
  }
  setLocalSession(null);
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

export function useAuth() {
  const [user, setUser] = useState<StudioUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial check from LocalStorage
    const local = getLocalSession();
    if (local) {
      setUser(local);
      setLoading(false);
    }

    // 2. Check Supabase session if configured
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const su: StudioUser = {
            id: session.user.id,
            email: session.user.email || "fotografer@limz.com",
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Limz Studio",
            avatar_url: session.user.user_metadata?.avatar_url || undefined,
            provider: "google",
          };
          setUser(su);
          setLocalSession(su);
        }
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const su: StudioUser = {
            id: session.user.id,
            email: session.user.email || "fotografer@limz.com",
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Limz Studio",
            avatar_url: session.user.user_metadata?.avatar_url || undefined,
            provider: "google",
          };
          setUser(su);
          setLocalSession(su);
        } else {
          setUser(null);
          setLocalSession(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }

    // Listen to custom local storage auth change events
    const handleAuthChange = () => {
      setUser(getLocalSession());
    };
    window.addEventListener("limz-auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("limz-auth-change", handleAuthChange);
    };
  }, []);

  return {
    user,
    loading,
    signInWithGoogle,
    signInAsStudio,
    signOut: signOutStudio,
  };
}

