import { useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useUserProfile(userId?: string, email?: string) {
  useEffect(() => {
    const createOrUpdateProfile = async () => {
      if (!userId || !email) return;

      try {
        // Check if there's a pending username from signup
        const pendingUsername = sessionStorage.getItem('pendingUsername');

        // Check if user already has a profile
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('user_id', userId)
          .maybeSingle();

        const profileData: any = {
          user_id: userId,
          email: email,
          updated_at: new Date().toISOString(),
        };

        // Add username if pending and profile doesn't have one
        if (pendingUsername && !existingProfile?.username) {
          profileData.username = pendingUsername.toLowerCase();
          sessionStorage.removeItem('pendingUsername');
        }

        // Try to upsert the profile (insert or update)
        const { error } = await supabase
          .from('user_profiles')
          .upsert(profileData, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error creating/updating user profile:', error);
        }
      } catch (e) {
        console.error('Profile upsert error:', e);
      }
    };

    createOrUpdateProfile();
  }, [userId, email]);
}
