import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './hooks';
import { getBrowserTimezone } from './timezones';

export function useUserTimezone() {
  const { user } = useAuth(false);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimezone = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('timezone')
            .eq('user_id', user.id)
            .single();

          if (data?.timezone) {
            setTimezone(data.timezone);
          } else {
            // Fallback to browser timezone if not set
            setTimezone(getBrowserTimezone());
          }
        } catch {
          setTimezone(getBrowserTimezone());
        }
      } else {
        setTimezone(getBrowserTimezone());
      }
      setLoading(false);
    };

    fetchTimezone();
  }, [user?.id]);

  return { timezone, loading };
}
