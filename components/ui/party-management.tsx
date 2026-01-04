'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, UserPlus, Users, Trash2, LogOut, Crown, Edit2, X, Check } from 'lucide-react';
import { useParties, type PartyWithMembers, type MemberStats } from '@/lib/useParties';
import { useAuth } from '@/lib/hooks';

export function PartyManagement() {
  const { user, loading: authLoading } = useAuth(false);
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
  } = useParties(!authLoading && !!user, user?.id);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState<{ [key: string]: string }>({});
  const [partyStats, setPartyStats] = useState<{ [key: string]: MemberStats[] }>({});
  const [editingParty, setEditingParty] = useState<{ [key: string]: boolean }>({});
  const [editedName, setEditedName] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');

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
      const stats = await getPartyStats(partyId);
      setPartyStats({ ...partyStats, [partyId]: stats });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  // Load stats for all parties on mount and when parties change
  useEffect(() => {
    parties.forEach((party) => {
      loadPartyStats(party.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties.length]);

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const isPartyCreator = (party: PartyWithMembers): boolean => {
    return party.created_by === user?.id;
  };

  const toggleEditMode = (partyId: string, partyName: string) => {
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

                return (
                  <div key={party.id} className="border border-border rounded-lg p-4 group">
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
                              onClick={() => handleUpdateParty(party.id)}
                              size="sm"
                              variant="ghost"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => toggleEditMode(party.id, party.name)}
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
                                <span title="You created this party">
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {party.members.length} {party.members.length === 1 ? 'member' : 'members'}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                        {isPartyCreator(party) && !isEditing && (
                          <Button
                            onClick={() => toggleEditMode(party.id, party.name)}
                            size="sm"
                            variant="outline"
                            title="Edit party"
                      
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {isPartyCreator(party) ? (
                          <Button
                            onClick={() => handleDeleteParty(party.id)}
                            size="sm"
                            variant="destructive"
                            title="Delete party"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleLeaveParty(party.id)}
                            size="sm"
                            variant="outline"
                            title="Leave party"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Invite Form - Only visible in edit mode */}
                    {isEditing && isPartyCreator(party) && (
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

                    {/* Party Stats - Always visible as bars */}
                    {stats.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-foreground">
                          Study Time (Past 7 Days)
                        </h4>
                        <div className="space-y-3">
                          {stats.map((stat, index) => {
                            const percentage = (stat.total_minutes / maxMinutes) * 100;
                            const isCurrentUser = stat.user_id === user?.id;

                            return (
                              <div key={stat.user_id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-muted-foreground w-6">
                                      #{index + 1}
                                    </span>
                                    <span className="text-foreground font-medium">
                                      {stat.username || stat.email}
                                      {isCurrentUser && (
                                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-primary">
                                      {formatMinutes(stat.total_minutes)}
                                    </span>
                                    {isEditing && isPartyCreator(party) && !isCurrentUser && (
                                      <Button
                                        onClick={() => handleRemoveMember(party.id, stat.user_id)}
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
                                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  />
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
