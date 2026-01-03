import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export function useAuth(requireAuth = true) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Only redirect on sign-in/sign-out events, not on token refresh
      if (event === 'SIGNED_IN' && !requireAuth) {
        router.push('/');
      } else if (event === 'SIGNED_OUT' && requireAuth) {
        router.push('/login');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);

      // Only redirect once on initial page load
      if (!hasRedirected.current) {
        if (requireAuth && !data.session?.user) {
          router.push('/login');
          hasRedirected.current = true;
        } else if (!requireAuth && data.session?.user) {
          router.push('/');
          hasRedirected.current = true;
        }
      }
    });

    return () => {
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
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  return [isDark, setIsDark] as const;
}
