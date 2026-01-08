import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export function useAuth(requireAuth = true) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const router = useRouter();
  const hasRedirected = useRef(false);
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Check if this was a session-only login (remember me unchecked)
      // If so, sign out when the page loads after browser restart
      const sessionOnly = sessionStorage.getItem('sessionOnly');
      const rememberMe = localStorage.getItem('rememberMe');

      // If sessionOnly flag is not in sessionStorage but we have a session,
      // it means the browser was restarted and this was a "don't remember me" session
      if (!sessionOnly && !rememberMe) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Sign out because this was a session-only login and browser was restarted
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setLoading(false);
            initialLoadComplete.current = true;
            if (requireAuth) {
              router.push('/login');
              hasRedirected.current = true;
            }
          }
          return;
        }
      }

      // Get the current session
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      setUser(data.session?.user ?? null);
      initialLoadComplete.current = true;
      setLoading(false);

      // Only redirect once on initial page load
      if (!hasRedirected.current) {
        if (requireAuth && !data.session?.user) {
          router.push('/login');
          hasRedirected.current = true;
        }
      }
    };

    // Set up auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);

      // Only set loading to false after initial load is complete
      if (initialLoadComplete.current) {
        setLoading(false);
      }

      // Only redirect on sign-in/sign-out events, not on token refresh
      if (event === 'SIGNED_OUT' && requireAuth) {
        router.push('/login');
      }
    });

    // Initialize auth
    initAuth();

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [requireAuth, router]);

  return { user, loading };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; // Default to dark mode on server
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    // Default to dark mode for new users
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  return [isDark, setIsDark] as const;
}
