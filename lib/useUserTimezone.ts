import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './hooks';
import { getBrowserTimezone } from './timezones';

export function useUserTimezone() {
  const { user } = useAuth(false);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('timezone')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.timezone) {
            setTimezone(data.timezone);
          } else {
            // Fallback to browser timezone if not set
            setTimezone(getBrowserTimezone());
          }
          setLoading(false);
        })
        .catch(() => {
          setTimezone(getBrowserTimezone());
          setLoading(false);
        });
    } else {
      setTimezone(getBrowserTimezone());
      setLoading(false);
    }
  }, [user?.id]);

  return { timezone, loading };
}
