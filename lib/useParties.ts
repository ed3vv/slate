import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";



export type Party = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PartyMember = {
  id: string;
  party_id: string;
  user_id: string;
  email: string;
  username?: string;
  joined_at: string;
};

export type PartyWithMembers = Party & {
  members: PartyMember[];
};

export type MemberStats = {
  user_id: string;
  email: string;
  username?: string;
  total_minutes: number;
};

export type PartyDailySeries = {
  labels: string[];
  series: Array<{
    user_id: string;
    label: string;
    data: number[]; // minutes per day
  }>;
};

export type MemberStatus = {
  user_id: string;
  is_active: boolean;
  current_seconds: number;
  last_updated: string;
};

export function useParties(enabled: boolean = true, userKey?: string) {
  const [parties, setParties] = useState<PartyWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userKey || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      // Get all parties the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from("party_members")
        .select("party_id")
        .eq("user_id", userKey);

      if (memberError) throw memberError;

      const partyIds = (memberData || []).map((m) => m.party_id);

      if (partyIds.length === 0) {
        setParties([]);
        setLoading(false);
        return;
      }

      // Get party details
      const { data: partyData, error: partyError } = await supabase
        .from("parties")
        .select("*")
        .in("id", partyIds)
        .order("created_at", { ascending: false });

      if (partyError) throw partyError;

      // Get all members for these parties
      const { data: allMembers, error: allMembersError } = await supabase
        .from("party_members")
        .select("*")
        .in("party_id", partyIds);

      if (allMembersError) throw allMembersError;

      // Combine data
      const partiesWithMembers: PartyWithMembers[] = (partyData || []).map((party) => ({
        ...party,
        members: (allMembers || []).filter((m) => m.party_id === party.id),
      }));

      setParties(partiesWithMembers);
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      console.error("Parties error:", e);
    } finally {
      setLoading(false);
    }
  }, [userKey, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createParty = useCallback(
    async (name: string) => {
      if (!userKey) return;
      try {
        // Get user's email and username for adding as first member
        const { data: { user: authUser } } = await supabase.auth.getUser();

        // Get user profile for username
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("user_id", userKey)
          .single();

        // Create party
        const { data: party, error: partyError } = await supabase
          .from("parties")
          .insert({
            name,
            created_by: userKey,
          })
          .select()
          .single();

        if (partyError) {
          console.error("Party creation failed:", partyError);
          throw partyError;
        }

        // Add creator as first member
        const { error: memberError } = await supabase
          .from("party_members")
          .insert({
            party_id: party.id,
            user_id: userKey,
            email: authUser?.email || "",
            username: userProfile?.username,
          });

        if (memberError) {
          console.error("Member creation failed:", memberError);
          throw memberError;
        }

        await refresh();
        return party.id;
      } catch (e: any) {
        const errorMsg = e?.message || e?.details || JSON.stringify(e);
        setError(errorMsg);
        console.error("Create party error:", e);
        throw e;
      }
    },
    [userKey, refresh]
  );

  const inviteMemberByEmail = useCallback(
    async (partyId: string, emailOrUsername: string) => {
      if (!userKey) return;
      try {
        // Check current member count
        const { data: currentMembers, error: countError } = await supabase
          .from("party_members")
          .select("user_id")
          .eq("party_id", partyId);

        if (countError) throw countError;

        if (currentMembers && currentMembers.length >= 10) {
          throw new Error("Party is full. Maximum 10 members allowed.");
        }

        const input = emailOrUsername.trim().toLowerCase();

        // Look up user by email or username
        let profile;
        if (input.includes('@')) {
          // Looks like an email
          const { data } = await supabase
            .from("user_profiles")
            .select("user_id, email, username")
            .eq("email", input)
            .maybeSingle();
          profile = data;
        } else {
          // Looks like a username
          const { data } = await supabase
            .from("user_profiles")
            .select("user_id, email, username")
            .eq("username", input)
            .maybeSingle();
          profile = data;
        }

        if (!profile) {
          throw new Error("User not found. They need to sign up first.");
        }

        // Add member to party
        const { error: memberError } = await supabase
          .from("party_members")
          .insert({
            party_id: partyId,
            user_id: profile.user_id,
            email: profile.email,
            username: profile.username,
          });

        if (memberError) {
          if (memberError.code === "23505") {
            throw new Error("This user is already in the party");
          }
          throw memberError;
        }

        await refresh();
      } catch (e: any) {
        setError(e?.message || JSON.stringify(e));
        console.error("Invite member error:", e);
        throw e;
      }
    },
    [userKey, refresh]
  );

  const removeMember = useCallback(
    async (partyId: string, userId: string) => {
      if (!userKey) return;
      try {
        const { error } = await supabase
          .from("party_members")
          .delete()
          .eq("party_id", partyId)
          .eq("user_id", userId);

        if (error) throw error;
        await refresh();
      } catch (e: any) {
        setError(e?.message || JSON.stringify(e));
        throw e;
      }
    },
    [userKey, refresh]
  );

  const leaveParty = useCallback(
    async (partyId: string) => {
      if (!userKey) return;
      await removeMember(partyId, userKey);
    },
    [userKey, removeMember]
  );

  const updateParty = useCallback(
    async (partyId: string, name: string) => {
      if (!userKey) return;
      try {
        const { error } = await supabase
          .from("parties")
          .update({ name })
          .eq("id", partyId)
          .eq("created_by", userKey);

        if (error) throw error;
        await refresh();
      } catch (e: any) {
        setError(e?.message || JSON.stringify(e));
        throw e;
      }
    },
    [userKey, refresh]
  );

  const deleteParty = useCallback(
    async (partyId: string) => {
      if (!userKey) return;
      try {
        const { error } = await supabase
          .from("parties")
          .delete()
          .eq("id", partyId)
          .eq("created_by", userKey);

        if (error) throw error;
        await refresh();
      } catch (e: any) {
        setError(e?.message || JSON.stringify(e));
        throw e;
      }
    },
    [userKey, refresh]
  );

  const getPartyStats = useCallback(
    async (partyId: string): Promise<MemberStats[]> => {
      if (!userKey) return [];
      try {
        // Get party members
        const { data: members, error: membersError } = await supabase
          .from("party_members")
          .select("user_id, email, username")
          .eq("party_id", partyId);

        if (membersError) throw membersError;
        if (!members || members.length === 0) return [];

        // Get focus sessions for the past 7 days for all members
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        const userIds = members.map((m) => m.user_id);

        const { data: sessions, error: sessionsError } = await supabase
          .from("focus_sessions")
          .select("user_id, duration, date")
          .in("user_id", userIds)
          .gte("date", sevenDaysAgoStr);

        if (sessionsError) throw sessionsError;

        // Calculate total minutes per user
        const stats: MemberStats[] = members.map((member) => {
          const userSessions = (sessions || []).filter(
            (s) => s.user_id === member.user_id
          );
          const totalSeconds = userSessions.reduce(
            (sum, session) => sum + (session.duration || 0),
            0
          );

          const rawTotalMinutes = totalSeconds / 60
          const totalMinutes = Math.round(rawTotalMinutes)

          return {
            user_id: member.user_id,
            email: member.email,
            username: member.username,
            total_minutes: totalMinutes,
          };
        });

        // Sort by total minutes descending
        stats.sort((a, b) => b.total_minutes - a.total_minutes);

        return stats;
      } catch (e: any) {
        console.error("Get party stats error:", e);
        return [];
      }
    },
    [userKey]
  );

  const getPartyStatuses = useCallback(
    async (partyId: string): Promise<MemberStatus[]> => {
      if (!userKey) return [];
      try {
        // Get party members
        const { data: members, error: membersError } = await supabase
          .from("party_members")
          .select("user_id")
          .eq("party_id", partyId);

        if (membersError) throw membersError;
        if (!members || members.length === 0) return [];

        const userIds = members.map((m) => m.user_id);

        // Get current statuses
        const { data: statuses, error: statusesError } = await supabase
          .from("user_status")
          .select("user_id, is_active, current_seconds, last_updated")
          .in("user_id", userIds);

        if (statusesError) throw statusesError;

        return statuses || [];
      } catch (e: any) {
        console.error("Get party statuses error:", e);
        return [];
      }
    },
    [userKey]
  );

  const getPartyDailySeries = useCallback(
    async (partyId: string, days: number = 7): Promise<PartyDailySeries> => {
      if (!userKey) return { labels: [], series: [] };
      try {
        const { data: members, error: membersError } = await supabase
          .from("party_members")
          .select("user_id, email, username")
          .eq("party_id", partyId);

        if (membersError) throw membersError;
        if (!members || members.length === 0) return { labels: [], series: [] };

        const userIds = members.map((m) => m.user_id);

        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        const startStr = start.toISOString().split("T")[0];

        const { data: sessions, error: sessionsError } = await supabase
          .from("focus_sessions")
          .select("user_id, duration, date")
          .in("user_id", userIds)
          .gte("date", startStr);

        if (sessionsError) throw sessionsError;

        const labels: string[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          labels.push(d.toISOString().split("T")[0]);
        }

        const series = members.map((member) => {
          const userSessions = (sessions || []).filter(
            (s) => s.user_id === member.user_id
          );
          const dailyTotals = labels.map((label) => {
            const totalSeconds = userSessions
              .filter((s) => s.date === label)
              .reduce((sum, s) => sum + (s.duration || 0), 0);
            return Math.round(totalSeconds / 60);
          });

          return {
            user_id: member.user_id,
            label: member.username || member.email,
            data: dailyTotals,
          };
        });

        return { labels, series };
      } catch (e: any) {
        console.error("Get party daily series error:", e);
        return { labels: [], series: [] };
      }
    },
    [userKey]
  );

  return {
    parties,
    loading,
    error,
    refresh,
    createParty,
    updateParty,
    inviteMemberByEmail,
    removeMember,
    leaveParty,
    deleteParty,
    getPartyStats,
    getPartyStatuses,
    getPartyDailySeries,
  };
}
