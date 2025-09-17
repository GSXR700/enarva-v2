'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Shield, 
  User as UserIcon,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { TeamDetailSkeleton } from '@/components/skeletons/TeamsSkeleton';

// Types
interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  availability: string;
  specialties: string[];
  experience: string;
  joinedAt: string;
  hourlyRate?: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    onlineStatus: string;
    lastSeen?: string;
  };
}

interface Mission {
  id: string;
  missionNumber: string;
  status: string;
  scheduledDate: string;
  lead: {
    firstName: string;
    lastName: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string;
  teamLeader: {
    id: string;
    name: string;
    email: string;
    onlineStatus: string;
    availability: string;
  } | null;
  stats: {
    totalMembers: number;
    availableMembers: number;
    completedMissions: number;
    activeMembers: number;
    inactiveMembers: number;
  };
  members: TeamMember[];
  missions?: Mission[];
  createdAt: string;
  updatedAt: string;
}

export default function TeamViewPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchTeam();
    }
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch team details');
      }
      const data = await response.json();
      setTeam(data);
    } catch (error: any) {
      setError(error.message || 'Error loading team details');
      toast.error('Failed to load team details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    
    if (!confirm(`Are you sure you want to delete team "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        toast.error(errorData.details || 'Cannot delete team');
        return;
      }
      
      if (response.status !== 204) {
        throw new Error('Failed to delete team');
      }
      
      toast.success('Team deleted successfully');
      router.push('/teams');
    } catch (error: any) {
      toast.error(error.message || 'Error deleting team');
    }
  };

  // Helper functions
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'SCHEDULED': { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      'IN_PROGRESS': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
      'QUALITY_CHECK': { color: 'bg-orange-100 text-orange-800', label: 'Quality Check' },
      'CLIENT_VALIDATION': { color: 'bg-purple-100 text-purple-800', label: 'Client Validation' },
      'COMPLETED': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <TeamDetailSkeleton />;
  }

  if (error || !team) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Teams
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Team Not Found</h3>
              <p className="text-gray-500 mb-4">{error || 'The requested team could not be found.'}</p>
              <Button onClick={() => router.push('/teams')}>
                Return to Teams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Teams
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{team.name}</h1>
            <p className="text-muted-foreground mt-1">
              {team.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/teams/${teamId}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Team
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDeleteTeam}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{team.stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{team.stats.availableMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed Missions</p>
                <p className="text-2xl font-bold">{team.stats.completedMissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{team.stats.activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Leader Section */}
      {team.teamLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Team Leader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {team.teamLeader.name?.charAt(0) || 'TL'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium">{team.teamLeader.name}</h4>
                <p className="text-sm text-muted-foreground">{team.teamLeader.email}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={
                  team.teamLeader.onlineStatus === 'ONLINE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }>
                  {team.teamLeader.onlineStatus}
                </Badge>
                {getAvailabilityBadge(team.teamLeader.availability)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({team.members.length})
              </CardTitle>
              <Link href={`/teams/${teamId}/edit`}>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Manage Members
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {team.members.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No team members yet</p>
                <Link href={`/teams/${teamId}/edit`}>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Members
                  </Button>
                </Link>
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
                      <div className="flex items-center gap-2 text-sm">
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
                      {member.specialties.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {member.specialties.slice(0, 3).map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty.replace('_', ' ')}
                            </Badge>
                          ))}
                          {member.specialties.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{member.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Joined</p>
                      <p>{new Date(member.joinedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Missions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Missions ({team.missions?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!team.missions || team.missions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No missions assigned yet</p>
                <Link href={`/missions/new?teamId=${teamId}`}>
                  <Button>
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Mission
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {team.missions.map((mission) => (
                  <div key={mission.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{mission.missionNumber}</h4>
                        {getStatusBadge(mission.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Client: {mission.lead.firstName} {mission.lead.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Scheduled: {new Date(mission.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/missions/${mission.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
                {team.missions.length >= 10 && (
                  <div className="text-center pt-4">
                    <Link href={`/missions?teamId=${teamId}`}>
                      <Button variant="outline">
                        View All Missions
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Basic Details</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Team Name:</dt>
                  <dd className="text-sm font-medium">{team.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Description:</dt>
                  <dd className="text-sm">{team.description || 'No description'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Created:</dt>
                  <dd className="text-sm">{new Date(team.createdAt).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Last Updated:</dt>
                  <dd className="text-sm">{new Date(team.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="font-medium mb-2">Team Statistics</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Total Members:</dt>
                  <dd className="text-sm font-medium">{team.stats.totalMembers}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Available Members:</dt>
                  <dd className="text-sm font-medium">{team.stats.availableMembers}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Active Members:</dt>
                  <dd className="text-sm font-medium">{team.stats.activeMembers}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Completed Missions:</dt>
                  <dd className="text-sm font-medium">{team.stats.completedMissions}</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}