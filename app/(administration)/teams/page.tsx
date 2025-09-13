// app/(administration)/teams/page.tsx - PAGE TEAMS FIXED WITH PROPER AVATARS
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Users, 
  Shield, 
  User as UserIcon, 
  MoreVertical, 
  Edit, 
  Trash2,
  Award,
  Settings,
  Eye,
  UserPlus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

// FIXED Types - Added image property to TeamMember
interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  availability: string;
  specialties: string[];
  experience: string;
  image?: string; // FIXED: Added image property
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
    image?: string; // FIXED: Added image property for team leader
  } | null;
  stats: {
    totalMembers: number;
    availableMembers: number;
    completedMissions: number;
    activeMembers: number;
    inactiveMembers: number;
  };
  membersSummary: TeamMember[];
  missions?: Array<{
    id: string;
    missionNumber: string;
    status: string;
    scheduledDate: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TeamMemberIndividual {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    onlineStatus: string;
    lastSeen?: string;
  };
  team: {
    id: string;
    name: string;
  };
  availability: string;
  specialties: string[];
  experience: string;
  isActive: boolean;
  joinedAt: string;
}

export default function TeamsPage() {
  // State pour les équipes
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  
  // State pour les membres individuels
  const [teamMembers, setTeamMembers] = useState<TeamMemberIndividual[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMemberIndividual[]>([]);
  
  // State UI
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('teams');

  // Fetch teams from API
  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/teams?includeMembers=true');
      if (!response.ok) throw new Error('Impossible de récupérer les équipes.');
      const data = await response.json();
      
      const teamsData = Array.isArray(data.teams) ? data.teams : data.teams || [];
      setTeams(teamsData);
      setFilteredTeams(teamsData);
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des équipes');
      toast.error('Erreur lors du chargement des équipes');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch team members from API
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members');
      if (!response.ok) throw new Error('Impossible de récupérer les membres.');
      const data = await response.json();
      
      const membersData = Array.isArray(data.teamMembers) ? data.teamMembers : data.teamMembers || [];
      setTeamMembers(membersData);
      setFilteredMembers(membersData);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchTeamMembers();
  }, []);

  // Filter teams based on search and filters
  useEffect(() => {
    let filtered = [...teams];

    if (searchQuery) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.teamLeader?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(team => {
        switch (statusFilter) {
          case 'active':
            return team.stats.availableMembers > 0;
          case 'inactive':
            return team.stats.availableMembers === 0;
          case 'has_leader':
            return team.teamLeader !== null;
          case 'no_leader':
            return team.teamLeader === null;
          default:
            return true;
        }
      });
    }

    setFilteredTeams(filtered);
  }, [teams, searchQuery, statusFilter]);

  // Filter team members
  useEffect(() => {
    let filtered = [...teamMembers];

    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.team.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.user.role === roleFilter);
    }

    setFilteredMembers(filtered);
  }, [teamMembers, searchQuery, roleFilter]);

  // Delete team handler
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'équipe "${teamName}" ? Cette action est irréversible.`)) return;

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        toast.error(errorData.details || 'Impossible de supprimer l\'équipe');
        return;
      }
      
      if (response.status !== 204) throw new Error('La suppression a échoué.');
      
      toast.success('Équipe supprimée avec succès.');
      fetchTeams(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Delete team member handler
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${memberName}" ?`)) return;

    try {
      const response = await fetch(`/api/team-members/${memberId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Échec de la suppression.');
      toast.success('Membre supprimé avec succès.');
      fetchTeamMembers(); // Refresh
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Helper functions
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'TECHNICIAN': return <Users className="w-4 h-4 text-blue-600" />;
      case 'ADMIN': return <Settings className="w-4 h-4 text-red-600" />;
      default: return <UserIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return 'bg-purple-100 text-purple-800';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-800';
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MANAGER': return 'bg-orange-100 text-orange-800';
      case 'AGENT': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des équipes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Card className="thread-card">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Erreur de chargement</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchTeams()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Équipes</h1>
          <p className="text-muted-foreground mt-1">Gérez les équipes et leurs membres</p>
        </div>
        <div className="flex gap-2">
          <Link href="/teams/new-team">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Équipe
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Équipes ({teams.length})</TabsTrigger>
          <TabsTrigger value="members">Membres ({teamMembers.length})</TabsTrigger>
        </TabsList>

        {/* Tab Content: Teams */}
        <TabsContent value="teams" className="space-y-6">
          {/* Search and Filters */}
          <Card className="thread-card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Rechercher par nom, description ou chef d'équipe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les équipes</SelectItem>
                    <SelectItem value="active">Équipes actives</SelectItem>
                    <SelectItem value="inactive">Équipes inactives</SelectItem>
                    <SelectItem value="has_leader">Avec chef d'équipe</SelectItem>
                    <SelectItem value="no_leader">Sans chef d'équipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Teams Grid */}
          {filteredTeams.length === 0 ? (
            <Card className="thread-card">
              <CardContent className="pt-6 text-center">
                <Users className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Aucune équipe trouvée' 
                    : 'Aucune équipe créée pour le moment'}
                </p>
                <Link href="/teams/new-team">
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la première équipe
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map((team) => (
                <Card key={team.id} className="thread-card hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {team.description || 'Aucune description'}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/teams/${team.id}`} className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Voir détails
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/teams/${team.id}/edit`} className="flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          className="flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Team Leader FIXED */}
                    {team.teamLeader && (
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage 
                            src={team.teamLeader.image} 
                            alt={team.teamLeader.name}
                          />
                          <AvatarFallback className="bg-purple-200 text-purple-800">
                            {team.teamLeader.name?.charAt(0) || 'L'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-sm">{team.teamLeader.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Chef d'équipe</p>
                        </div>
                        <Badge variant={team.teamLeader.onlineStatus === 'ONLINE' ? 'default' : 'secondary'}>
                          {team.teamLeader.onlineStatus === 'ONLINE' ? 'En ligne' : 'Hors ligne'}
                        </Badge>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Users className="w-4 h-4 text-blue-600 mr-1" />
                          <span className="text-lg font-bold text-blue-600">
                            {team.stats.totalMembers}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Membres</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                          <span className="text-lg font-bold text-green-600">
                            {team.stats.availableMembers}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Disponibles</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Calendar className="w-4 h-4 text-orange-600 mr-1" />
                          <span className="text-lg font-bold text-orange-600">
                            {team.stats.completedMissions}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Missions</p>
                      </div>
                    </div>

                    {/* FIXED Team Members Avatars */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Membres</span>
                        <Link href={`/teams/${team.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Voir tous
                          </Button>
                        </Link>
                      </div>
                      <div className="flex -space-x-2">
                        {team.membersSummary.slice(0, 4).map((member, index) => (
                          <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
                            <AvatarImage 
                              src={member.image} 
                              alt={member.name}
                            />
                            <AvatarFallback className="text-xs">
                              {member.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {team.membersSummary.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{team.membersSummary.length - 4}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/missions/new?teamId=${team.id}`} className="flex-1">
                        <Button size="sm" className="w-full text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          Créer Mission
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Content: Individual Members */}
        <TabsContent value="members" className="space-y-6">
          {/* Filters for Members */}
          <Card className="thread-card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Rechercher par nom, email ou équipe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="TEAM_LEADER">Chef d'équipe</SelectItem>
                    <SelectItem value="TECHNICIAN">Technicien</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Team Members List */}
          {filteredMembers.length === 0 ? (
            <Card className="thread-card">
              <CardContent className="pt-6 text-center">
                <UserIcon className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || roleFilter !== 'all' 
                    ? 'Aucun membre trouvé' 
                    : 'Aucun membre d\'équipe disponible'}
                </p>
                <Link href="/teams/new-member">
                  <Button className="mt-4">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ajouter le premier membre
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="thread-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.user?.image || ''} alt={member.user?.name || ''} />
                        <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{member.user?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {member.user?.email}
                        </p>
                        <p className="text-xs text-blue-600">
                          Équipe: {member.team?.name}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/teams/members/${member.id}/edit`} className="flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteMember(member.id, member.user.name)}
                          className="flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.user?.role || '')}
                      <Badge className={getRoleColor(member.user?.role || '')}>
                        {member.user?.role === 'TEAM_LEADER' ? 'Chef d\'équipe' : 
                         member.user?.role === 'TECHNICIAN' ? 'Technicien' :
                         member.user?.role === 'ADMIN' ? 'Administrateur' :
                         member.user?.role === 'MANAGER' ? 'Manager' :
                         member.user?.role === 'AGENT' ? 'Agent' : 'Inconnu'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          Disponibilité: 
                          <Badge 
                            variant={member.availability === 'AVAILABLE' ? 'default' : 'secondary'}
                            className="ml-2"
                          >
                            {member.availability === 'AVAILABLE' ? 'Disponible' : 'Indisponible'}
                          </Badge>
                        </span>
                      </div>

                      {member.specialties.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">Spécialités:</span>
                        </div>
                      )}

                      {member.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {member.specialties.slice(0, 3).map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {specialty.replace('_', ' ')}
                            </Badge>
                          ))}
                          {member.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}