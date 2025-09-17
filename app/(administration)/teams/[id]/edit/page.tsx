'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, 
  Save, 
  ArrowLeft, 
  UserPlus, 
  Trash2, 
  Users, 
  User as UserIcon,
  Search,
  Plus
} from 'lucide-react';

// Validation Schema
const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  onlineStatus: string;
  currentTeam?: {
    id: string;
    name: string;
  } | null;
}

interface TeamMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    onlineStatus: string;
  };
  availability: string;
  specialties: string[];
  experience: string;
  joinedAt: string;
  hourlyRate?: number;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export default function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
  });

  useEffect(() => {
    if (teamId) {
      Promise.all([fetchTeam(), fetchAvailableUsers()]);
    }
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) throw new Error('Failed to fetch team data');
      const data = await response.json();
      setTeam(data);
      reset({
        name: data.name,
        description: data.description || '',
      });
    } catch (error: any) {
      toast.error('Could not load team details');
      router.push('/teams');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`/api/users/available?excludeTeamId=${teamId}&search=${userSearch}`);
      if (!response.ok) throw new Error('Failed to fetch available users');
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching available users:', error);
    }
  };

  const onSubmit = async (data: TeamFormValues) => {
    setIsSaving(true);
    try {
      // Update team information
      const teamUpdateResponse = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });

      if (!teamUpdateResponse.ok) {
        throw new Error('Failed to update team information');
      }

      toast.success('Team updated successfully!');
      router.push(`/teams/${teamId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update team');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user to add');
      return;
    }

    try {
      setIsSaving(true);
      const userIdsArray = Array.from(selectedUserIds);

      for (const userId of userIdsArray) {
        const user = availableUsers.find(u => u.id === userId);
        if (!user) continue;

        const response = await fetch('/api/team-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: user.name,
            email: user.email,
            password: 'temp123456789', // Temporary password - should be changed by user
            role: user.role,
            teamId: teamId,
            specialties: [],
            experience: 'JUNIOR',
            availability: 'AVAILABLE',
            isActive: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to add ${user.name}: ${errorData.message || 'Unknown error'}`);
        }
      }

      toast.success(`Successfully added ${userIdsArray.length} member(s) to the team!`);
      setSelectedUserIds(new Set());
      setShowAddMembers(false);
      fetchTeam(); // Refresh team data
      fetchAvailableUsers(); // Refresh available users
    } catch (error: any) {
      toast.error(error.message || 'Failed to add members');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/team-members/${memberId}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) throw new Error('Failed to remove team member');
      
      toast.success(`${memberName} removed from team`);
      fetchTeam(); // Refresh team data
      fetchAvailableUsers(); // Refresh available users
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'TEAM_LEADER': { color: 'bg-purple-100 text-purple-800', label: 'Team Leader' },
      'TECHNICIAN': { color: 'bg-blue-100 text-blue-800', label: 'Technician' },
      'ADMIN': { color: 'bg-red-100 text-red-800', label: 'Admin' },
      'MANAGER': { color: 'bg-orange-100 text-orange-800', label: 'Manager' },
      'AGENT': { color: 'bg-cyan-100 text-cyan-800', label: 'Agent' },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || { color: 'bg-gray-100 text-gray-800', label: role };
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getAvailabilityBadge = (availability: string) => {
    const availabilityConfig = {
      'AVAILABLE': { color: 'bg-green-100 text-green-800', label: 'Available' },
      'BUSY': { color: 'bg-yellow-100 text-yellow-800', label: 'Busy' },
      'OFF_DUTY': { color: 'bg-gray-100 text-gray-800', label: 'Off Duty' },
      'VACATION': { color: 'bg-blue-100 text-blue-800', label: 'On Vacation' },
    };

    const config = availabilityConfig[availability as keyof typeof availabilityConfig] || { color: 'bg-gray-100 text-gray-800', label: availability };
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Team not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Edit Team</h1>
          <p className="text-muted-foreground mt-1">Update team details and manage members</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Team Information */}
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>Update the team's basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register('description')} rows={3} />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Team Info
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Current Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Team Members ({team.members.length})
              </CardTitle>
              <CardDescription>Manage existing team members</CardDescription>
            </div>
            <Button onClick={() => setShowAddMembers(!showAddMembers)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Members
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {team.members.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No team members yet</p>
              <Button onClick={() => setShowAddMembers(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {team.members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Avatar>
                    <AvatarImage src={member.user.image} />
                    <AvatarFallback>
                      {member.user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{member.user.name}</h4>
                      {getRoleBadge(member.user.role)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{member.user.email}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {member.experience}
                      </Badge>
                      {getAvailabilityBadge(member.availability)}
                      {member.hourlyRate && (
                        <Badge variant="outline" className="text-xs">
                          ${member.hourlyRate}/hr
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Joined</p>
                    <p>{new Date(member.joinedAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id, member.user.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Members Section */}
      {showAddMembers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Members
            </CardTitle>
            <CardDescription>Select users to add to this team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onBlur={fetchAvailableUsers}
                className="pl-10"
              />
            </div>

            {/* Available Users */}
            {filteredAvailableUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No available users found</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedUserIds.has(user.id) ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs">
                          {user.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{user.name}</p>
                          {getRoleBadge(user.role)}
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.currentTeam && (
                          <p className="text-xs text-blue-600">
                            Currently in: {user.currentTeam.name}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          user.onlineStatus === 'ONLINE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {user.onlineStatus}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Add Selected Members Button */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedUserIds.size} user(s) selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedUserIds(new Set());
                        setShowAddMembers(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMembers}
                      disabled={selectedUserIds.size === 0 || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add {selectedUserIds.size} Member(s)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}