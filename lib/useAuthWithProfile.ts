import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserWithProfile = {
  user: SupabaseUser;
  username: string | null;
};

export function useAuthWithProfile(requireAuth = true) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserWithProfile | null>(null);
  const router = useRouter();
  const hasRedirected = useRef(false);

  const fetchProfile = async (user: SupabaseUser) => {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    setData({
      user,
      username: profileData?.username || null,
    });
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setData(null);
      }
      setLoading(false);

      // Only redirect on sign-in/sign-out events, not on token refresh
      if (event === 'SIGNED_IN' && !requireAuth) {
        // Redirect to last visited route or default to /subjects
        const lastRoute = localStorage.getItem('lastVisitedRoute');
        router.push(lastRoute && lastRoute !== '/login' ? lastRoute : '/subjects');
      } else if (event === 'SIGNED_OUT' && requireAuth) {
        router.push('/login');
      }
    });

    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (sessionData.session?.user) {
        await fetchProfile(sessionData.session.user);
      } else {
        setData(null);
      }
      setLoading(false);

      // Only redirect once on initial page load
      if (!hasRedirected.current) {
        if (requireAuth && !sessionData.session?.user) {
          router.push('/login');
          hasRedirected.current = true;
        }
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [requireAuth, router]);

  return { data, loading };
}
