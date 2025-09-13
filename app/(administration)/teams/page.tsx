// app/(administration)/teams/page.tsx - PAGE TEAMS REDESIGNÉE POUR GESTION DES ÉQUIPES
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

// Types pour les équipes et membres
interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  availability: string;
  specialties: string[];
  experience: string;
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
      const response = await fetch(`/api/teams?id=${teamId}`, {
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
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${memberName}" ? Cette action supprimera également son compte utilisateur.`)) return;

    try {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'DELETE',
      });
      if (response.status !== 204) throw new Error('La suppression a échoué.');
      toast.success('Membre supprimé avec succès.');
      fetchTeamMembers(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Get status badge for teams
  const getTeamStatusBadge = (team: Team) => {
    if (!team.teamLeader) {
      return <Badge variant="destructive">Sans chef</Badge>;
    }
    if (team.stats.availableMembers === 0) {
      return <Badge variant="secondary">Indisponible</Badge>;
    }
    if (team.stats.availableMembers > 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Disponible</Badge>;
    }
    return <Badge variant="outline">Inconnue</Badge>;
  };

  // Get role color for members
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

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return <Shield className="w-4 h-4" />;
      case 'TECHNICIAN': return <Users className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="main-content space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Équipes</h1>
          <p className="text-muted-foreground mt-1">Gérez vos équipes et leurs membres</p>
        </div>
        <div className="flex gap-2">
          <Link href="/teams/new-team">
            <Button className="bg-enarva-gradient rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Équipe
            </Button>
          </Link>
          <Link href="/teams/new-member">
            <Button variant="outline" className="rounded-lg">
              <UserPlus className="w-4 h-4 mr-2" />
              Nouveau Membre
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Équipes ({teams.length})</TabsTrigger>
          <TabsTrigger value="members">Membres Individuels ({teamMembers.length})</TabsTrigger>
        </TabsList>

        {/* Tab Content: Teams */}
        <TabsContent value="teams" className="space-y-6">
          {/* Filters for Teams */}
          <Card className="thread-card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Rechercher par nom d'équipe, description ou chef..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Équipes disponibles</SelectItem>
                    <SelectItem value="inactive">Équipes indisponibles</SelectItem>
                    <SelectItem value="has_leader">Avec chef d'équipe</SelectItem>
                    <SelectItem value="no_leader">Sans chef d'équipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error message */}
          {error && (
            <Card className="thread-card">
              <CardContent className="pt-6 text-center text-red-500">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Teams Grid */}
          {filteredTeams.length === 0 && !error ? (
            <Card className="thread-card">
              <CardContent className="pt-6 text-center">
                <Users className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Aucune équipe trouvée' 
                    : 'Aucune équipe disponible'}
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
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        {getTeamStatusBadge(team)}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/teams/${team.id}/manage-members`} className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Gérer membres
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
                    {/* Team Description */}
                    {team.description && (
                      <p className="text-sm text-muted-foreground">{team.description}</p>
                    )}

                    {/* Team Leader */}
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Chef d'équipe:</span>
                      {team.teamLeader ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{team.teamLeader.name}</span>
                          <Badge 
                            variant={team.teamLeader.availability === 'AVAILABLE' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {team.teamLeader.availability === 'AVAILABLE' ? 'Dispo' : 'Occupé'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-red-500">Non assigné</span>
                      )}
                    </div>

                    {/* Team Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{team.stats.totalMembers}</div>
                        <div className="text-xs text-muted-foreground">Membres</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{team.stats.availableMembers}</div>
                        <div className="text-xs text-muted-foreground">Disponibles</div>
                      </div>
                    </div>

                    {/* Recent Members Preview */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Membres:</span>
                        <Link href={`/teams/${team.id}/manage-members`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Voir tous
                          </Button>
                        </Link>
                      </div>
                      <div className="flex -space-x-2">
                        {team.membersSummary.slice(0, 4).map((member, index) => (
                          <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
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
                        <AvatarFallback>{member.user?.name?.[0] || 'U'}</AvatarFallback>
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
                            {member.availability === 'AVAILABLE' ? 'Disponible' :
                             member.availability === 'BUSY' ? 'Occupé' :
                             member.availability === 'OFF_DUTY' ? 'En repos' :
                             member.availability === 'VACATION' ? 'En congé' : 'Inconnu'}
                          </Badge>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          Expérience: {member.experience === 'JUNIOR' ? 'Junior' :
                                       member.experience === 'INTERMEDIATE' ? 'Intermédiaire' :
                                       member.experience === 'SENIOR' ? 'Senior' :
                                       member.experience === 'EXPERT' ? 'Expert' : 'Inconnu'}
                        </span>
                      </div>

                      {member.specialties && member.specialties.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium">Spécialités:</span>
                          <div className="flex flex-wrap gap-1">
                            {member.specialties.slice(0, 2).map((specialty) => (
                              <Badge key={specialty} variant="outline" className="text-xs">
                                {specialty === 'GENERAL_CLEANING' ? 'Nettoyage général' :
                                 specialty === 'WINDOW_SPECIALIST' ? 'Spécialiste vitres' :
                                 specialty === 'FLOOR_SPECIALIST' ? 'Spécialiste sols' :
                                 specialty === 'LUXURY_SURFACES' ? 'Surfaces luxe' :
                                 specialty === 'EQUIPMENT_HANDLING' ? 'Équipement' :
                                 specialty === 'TEAM_MANAGEMENT' ? 'Gestion équipe' :
                                 specialty === 'QUALITY_CONTROL' ? 'Contrôle qualité' :
                                 specialty === 'DETAIL_FINISHING' ? 'Finitions' : specialty}
                              </Badge>
                            ))}
                            {member.specialties.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.specialties.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {member.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {member.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
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