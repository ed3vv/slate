'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, UserPlus, Users, Trash2, LogOut, Crown, Edit2, X, Check, Circle } from 'lucide-react';
import { useParties, type PartyWithMembers, type MemberStats, type MemberStatus } from '@/lib/useParties';
import { useAuth } from '@/lib/hooks';
import { supabase } from '@/lib/supabaseClient';
import { usePathname, useRouter } from 'next/navigation';
import { useUserTimezone } from '@/lib/useUserTimezone';

export function PartyManagement() {
  const { user, loading: authLoading } = useAuth(false);
  const { timezone } = useUserTimezone();
  const {
    parties,
    loading,
    createParty,
    updateParty,
    inviteMemberByEmail,
    removeMember,
    leaveParty,
    deleteParty,
    getPartyStats,
    getPartyStatuses,
    getPartyOwnerTimezone,
  } = useParties(!authLoading && !!user, user?.id);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState<{ [key: string]: string }>({});
  const [partyStats, setPartyStats] = useState<{ [key: string]: MemberStats[] }>({});
  const [partyStatuses, setPartyStatuses] = useState<{ [key: string]: MemberStatus[] }>({});
  const [editingParty, setEditingParty] = useState<{ [key: string]: boolean }>({});
  const [editedName, setEditedName] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [ownerTimezones, setOwnerTimezones] = useState<{ [key: string]: string }>({});
  const pathname = usePathname();
  const router = useRouter();

  const handleCreateParty = async () => {
    if (!newPartyName.trim()) {
      setError('Please enter a party name');
      return;
    }
    try {
      setError('');
      await createParty(newPartyName);
      setNewPartyName('');
      setShowCreateForm(false);
    } catch (e: any) {
      setError(e.message || 'Failed to create party');
    }
  };

  const handleUpdateParty = async (partyId: string) => {
    const name = editedName[partyId]?.trim();
    if (!name) {
      setError('Please enter a party name');
      return;
    }
    try {
      setError('');
      await updateParty(partyId, name);
      setEditingParty({ ...editingParty, [partyId]: false });
    } catch (e: any) {
      setError(e.message || 'Failed to update party');
    }
  };

  const handleInviteMember = async (partyId: string) => {
    const email = inviteEmail[partyId]?.trim();
    if (!email) {
      setError('Please enter an email or username');
      return;
    }

    try {
      setError('');
      await inviteMemberByEmail(partyId, email);
      setInviteEmail({ ...inviteEmail, [partyId]: '' });
    } catch (e: any) {
      setError(e.message || 'Failed to invite member');
    }
  };

  const handleRemoveMember = async (partyId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      setError('');
      await removeMember(partyId, userId);
      // Refresh stats after removing member
      loadPartyStats(partyId);
    } catch (e: any) {
      setError(e.message || 'Failed to remove member');
    }
  };

  const handleLeaveParty = async (partyId: string) => {
    if (!confirm('Are you sure you want to leave this party?')) return;
    try {
      setError('');
      await leaveParty(partyId);
    } catch (e: any) {
      setError(e.message || 'Failed to leave party');
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    if (!confirm('Are you sure you want to delete this party? This action cannot be undone.')) return;
    try {
      setError('');
      await deleteParty(partyId);
    } catch (e: any) {
      setError(e.message || 'Failed to delete party');
    }
  };

  const loadPartyStats = async (partyId: string) => {
    try {
      const stats = await getPartyStats(partyId, timezone);
      setPartyStats(prev => ({ ...prev, [partyId]: stats }));
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadPartyStatuses = async (partyId: string) => {
    try {
      const statuses = await getPartyStatuses(partyId);
      setPartyStatuses(prev => ({ ...prev, [partyId]: statuses }));
    } catch (e) {
      console.error('Failed to load statuses:', e);
    }
  };

  const loadOwnerTimezone = async (partyId: string, ownerId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('user_id', ownerId)
        .single();

      if (data?.timezone) {
        setOwnerTimezones(prev => ({ ...prev, [partyId]: data.timezone }));
      }
    } catch (e) {
      console.error('Failed to load owner timezone:', e);
    }
  };

  const getTimeUntilReset = (ownerId: string) => {
    // Find the party with this owner
    const party = parties.find(p => p.created_by === ownerId);
    if (!party) return '';

    const ownerTz = ownerTimezones[party.id] || timezone;
    const now = new Date();

    // Get current date/time in owner's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ownerTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

    const year = parseInt(getPart('year'));
    const month = parseInt(getPart('month')) - 1;
    const day = parseInt(getPart('day'));
    const hour = parseInt(getPart('hour'));
    const minute = parseInt(getPart('minute'));
    const second = parseInt(getPart('second'));

    // Create a date representing "now" in owner's timezone
    const nowInTz = new Date(year, month, day, hour, minute, second);
    const dayOfWeek = nowInTz.getDay();

    // Calculate next Sunday at midnight in owner's timezone
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(year, month, day + daysUntilSunday, 0, 0, 0);

    const diff = nextSunday.getTime() - nowInTz.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days >= 1) {
      return `${days} day${days !== 1 ? 's' : ''} until reset`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} until reset`;
    }
  };

  // Load stats for all parties on mount and when parties change
  useEffect(() => {
    parties.forEach((party) => {
      loadPartyStats(party.id);
      loadPartyStatuses(party.id);
      loadOwnerTimezone(party.id, party.created_by);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties.length]);

  // Subscribe to real-time status updates
  useEffect(() => {
    if (parties.length === 0) return;

    // Get all unique user IDs from all parties
    const allUserIds = new Set<string>();
    parties.forEach(party => {
      party.members.forEach(member => {
        allUserIds.add(member.user_id);
      });
    });

    if (allUserIds.size === 0) return;

    // Subscribe to status changes
    const channel = supabase
      .channel('user_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=in.(${Array.from(allUserIds).join(',')})`,
        },
        () => {
          // Reload statuses for all parties when any status changes
          parties.forEach(party => {
            loadPartyStatuses(party.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parties]);

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserStatus = (userId: string, partyId: string): MemberStatus | null => {
    const statuses = partyStatuses[partyId] || [];
    return statuses.find(s => s.user_id === userId) || null;
  };

  const isPartyCreator = (party: PartyWithMembers): boolean => {
    return party.created_by === user?.id;
  };

  const isPartyPage = (partyId: string) => pathname === `/analytics/${partyId}`;
  const isRootAnalytics = pathname === '/analytics';

  const toggleEditMode = (partyId: string, partyName: string) => {
    if (!isPartyPage(partyId)) return;
    const isEditing = !editingParty[partyId];
    setEditingParty({ ...editingParty, [partyId]: isEditing });
    if (isEditing) {
      setEditedName({ ...editedName, [partyId]: partyName });
    }
  };

  if (loading) {
    return (
      <Card className="bg-card text-foreground">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading parties...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card text-foreground">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Study Parties
            </CardTitle>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Party
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          {showCreateForm && (
            <div className="mb-6 p-4 bg-secondary rounded-lg">
              <h3 className="text-sm font-medium mb-3 text-foreground">Create New Party</h3>
              <div className="flex gap-2">
                <Input
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Party name..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateParty()}
                />
                <Button onClick={handleCreateParty} size="sm">
                  Create
                </Button>
                <Button onClick={() => setShowCreateForm(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {parties.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No parties yet. Create one to study with friends!
            </p>
          ) : (
            <div className="space-y-4">
              {parties.map((party) => {
                const stats = partyStats[party.id] || [];
                const rawMaxMinutes = Math.max(...stats.map((s) => s.total_minutes), 1);
                const maxMinutes = Math.ceil(rawMaxMinutes / 60) * 60;
                const isEditing = editingParty[party.id];
                const onPartyPage = isPartyPage(party.id);

                return (
                  <div
                    key={party.id}
                    className="border border-border rounded-lg p-4 group cursor-pointer hover:border-primary/60 transition-colors"
                    onClick={() => router.push(`/analytics/${party.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/analytics/${party.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editedName[party.id] ?? party.name}
                              onChange={(e) =>
                                setEditedName({ ...editedName, [party.id]: e.target.value })
                              }
                              className="max-w-xs"
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateParty(party.id)}
                            />
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleUpdateParty(party.id); }}
                              size="sm"
                              variant="ghost"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={(e) => { e.stopPropagation(); toggleEditMode(party.id, party.name); }}
                              size="sm"
                              variant="ghost"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                              {party.name}
                              {isPartyCreator(party) && (
                                <span title="party owner">
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {party.members.length} {party.members.length === 1 ? 'member' : 'members'} · This Week
                            </p>
                          </>
                        )}
                      </div>
                      {onPartyPage && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">

                          <p className="flex text-xs mr-4 text-muted-foreground">
                            {getTimeUntilReset(party.created_by)}
                          </p>
                          {isPartyCreator(party) && !isEditing && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); toggleEditMode(party.id, party.name); }}
                              size="sm"
                              variant="outline"
                              title="Edit party"
                      
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {isPartyCreator(party) ? (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleDeleteParty(party.id); }}
                              size="sm"
                              variant="destructive"
                              title="Delete party"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleLeaveParty(party.id); }}
                              size="sm"
                              variant="outline"
                              title="Leave party"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Invite Form - Only visible in edit mode */}
                    {isEditing && isPartyCreator(party) && onPartyPage && (
                      <div className="mb-4 p-3 bg-secondary rounded-lg">
                        <h4 className="text-sm font-medium mb-2 text-foreground">Invite Member</h4>
                        <div className="flex gap-2">
                          <Input
                            value={inviteEmail[party.id] || ''}
                            onChange={(e) =>
                              setInviteEmail({ ...inviteEmail, [party.id]: e.target.value })
                            }
                            placeholder="Enter email or username..."
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleInviteMember(party.id)}
                          />
                          <Button onClick={() => handleInviteMember(party.id)} size="sm">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Party Stats - Always show bars */}
                    {stats.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-foreground">
                          Study Time (Past 7 Days)
                        </h4>
                        <div className="space-y-3">
                          {stats.map((stat, index) => {
                            const isCurrentUser = stat.user_id === user?.id;
                            const status = getUserStatus(stat.user_id, party.id);
                            const isActive = status?.is_active || false;
                            const baseSeconds = status?.current_seconds || 0;
                            const lastUpdated = (status as any)?.last_updated
                              ? new Date((status as any).last_updated).getTime()
                              : 0;
                            const driftSeconds = isActive && lastUpdated ? Math.max(0, (Date.now() - lastUpdated) / 1000) : 0;
                            const liveSeconds = Math.round(baseSeconds + driftSeconds);
                            const currentMinutes = liveSeconds / 60;
                            const isPaused = !isActive && baseSeconds > 0; // Paused state: timer exists but not running

                            const savedPercentage = (stat.total_minutes / maxMinutes) * 100;
                            const activePercentage = (currentMinutes / maxMinutes) * 100;


                            return (
                              <div key={stat.user_id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-muted-foreground w-6">
                                      #{index + 1}
                                    </span>
                                    <div title={isActive ? 'Active' : isPaused ? 'Paused' : 'Offline'}>
                                      <Circle
                                        className={`h-2 w-2 ${
                                          isActive
                                            ? 'fill-green-500 text-green-500'
                                            : isPaused
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'fill-gray-400 text-gray-400'
                                        }`}
                                      />
                                    </div>
                                    <span className="text-foreground font-medium">
                                      {stat.username || stat.email}
                                      {isCurrentUser && (
                                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                      )}
                                    </span>
                                    {!isCurrentUser && liveSeconds > 0 && (
                                      <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                                        {formatTime(liveSeconds)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-primary">
                                      {formatMinutes(stat.total_minutes)}
                                    </span>
                                    {isEditing && isPartyCreator(party) && !isCurrentUser && onPartyPage && (
                                      <Button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveMember(party.id, stat.user_id); }}
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 hover:text-destructive"
                                        title="Remove member"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
                                  {/* Base bar - 7 day saved total */}
                                  <div
                                    className={`h-full transition-all duration-300`}
                                    style={{
                                      width: `${savedPercentage}%`,
                                      backgroundColor: isPaused
                                        ? (isCurrentUser ? 'rgba(234, 179, 8, 0.9)' : 'rgba(234, 179, 8, 0.5)') // Yellow for paused
                                        : isActive
                                        ? (isCurrentUser ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.5)') // Green for active
                                        : (isCurrentUser ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)') // Primary for inactive
                                    }}
                                  />
                                  {/* Active/Paused session bar - striped extension showing current session */}
                                  {liveSeconds > 0 && (
                                    <div
                                      className={`absolute top-0 h-full transition-all duration-300 bg-striped`}
                                      style={{
                                        left: `${savedPercentage}%`,
                                        width: `${Math.min(activePercentage, 100 - savedPercentage)}%`,
                                        backgroundColor: isPaused
                                          ? (isCurrentUser ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.25)') // Yellow striped for paused
                                          : (isCurrentUser ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.25)') // Green striped for active
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {stats.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No study sessions recorded in the past 7 days
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
