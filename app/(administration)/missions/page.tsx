// app/(administration)/missions/page.tsx - FIXED API RESPONSE HANDLING
'use client'

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus,
  Calendar,
  MapPin,
  Clock,
  Users,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  User as UserIcon,
  CheckCircle,
  AlertTriangle,
  Play,
  Filter,
  Search
} from 'lucide-react';
import { Mission, Lead, User, Task, TeamMember, MissionStatus, Priority } from '@prisma/client';
import { formatDate, formatTime, formatCurrency, translate } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

type TaskWithDetails = Task & {
  assignedTo: TeamMember & { user: User };
};

type MissionWithDetails = Mission & {
  lead: Lead;
  teamLeader: User;
  team?: { members: { user: User }[] };
  teamMembers: (TeamMember & { user: User })[];
  tasks: TaskWithDetails[];
  quote?: { finalPrice: number };
  _count: {
    tasks: number;
    qualityChecks: number;
    expenses: number;
  };
};

type TeamMemberWithUser = TeamMember & { user: User };

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const getStatusColor = (status: MissionStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'QUALITY_CHECK': return 'bg-purple-100 text-purple-800';
      case 'CLIENT_VALIDATION': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

export default function MissionsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const router = useRouter();

  const [allMissions, setAllMissions] = useState<MissionWithDetails[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionWithDetails[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState | null>(null);

  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberWithUser[]>([]);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [isTeamSaving, setIsTeamSaving] = useState(false);

  // FIXED: Correct API response handling
  const fetchMissions = useCallback(async () => {
    try {
      console.log('Fetching missions...');
      const response = await fetch('/api/missions');
      if (!response.ok) throw new Error('Impossible de récupérer les missions.');
      
      const responseData = await response.json();
      console.log('API Response:', responseData);
      
      // FIXED: The API returns { missions: [...], total: ..., page: ... }
      // NOT { data: [...] }
      const missions = responseData.missions || [];
      const paginationData = {
        page: responseData.page || 1,
        limit: responseData.limit || 10,
        total: responseData.total || 0,
        totalPages: responseData.totalPages || 1
      };
      
      console.log('Setting missions:', missions);
      setAllMissions(missions);
      setFilteredMissions(missions);
      setPagination(paginationData);
    } catch (err: any) {
      console.error('Error fetching missions:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des missions');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMissions(),
        fetch('/api/team-members').then(res => res.json()).then(data => {
          // Handle team members response structure
          const teamMembers = data.teamMembers || data || [];
          setAllTeamMembers(teamMembers);
        }).catch(err => {
          console.error('Error fetching team members:', err);
          setAllTeamMembers([]);
        })
      ]);
      setIsLoading(false);
    };
    fetchData();
  }, [fetchMissions]);

  useEffect(() => {
    let missions = [...allMissions];
    if (statusFilter !== 'all') missions = missions.filter(mission => mission.status === statusFilter);
    if (priorityFilter !== 'all') missions = missions.filter(mission => mission.priority === priorityFilter);
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        missions = missions.filter(mission =>
            mission.lead?.firstName?.toLowerCase().includes(lowercasedQuery) ||
            mission.lead?.lastName?.toLowerCase().includes(lowercasedQuery) ||
            mission.missionNumber?.toLowerCase().includes(lowercasedQuery) ||
            mission.address?.toLowerCase().includes(lowercasedQuery)
        );
    }
    setFilteredMissions(missions);
  }, [searchQuery, statusFilter, priorityFilter, allMissions]);

  const calculateProgress = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length;
      return Math.round((completedTasks / tasks.length) * 100);
  };

  const handleOpenModal = (mission: MissionWithDetails) => {
    setSelectedMission(mission);
    setSelectedTeamMemberIds(mission.teamMembers.map(tm => tm.id));
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.")) return;
    try {
      const res = await fetch(`/api/missions/${missionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de la suppression');
      toast.success("Mission supprimée avec succès.");
      fetchMissions();
    } catch (error) {
      toast.error("Erreur lors de la suppression de la mission.");
    }
  };

  const updateTeamMembers = async () => {
    if (!selectedMission) return;
    setIsTeamSaving(true);
    try {
      const res = await fetch(`/api/missions/${selectedMission.id}/team`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberIds: selectedTeamMemberIds }),
      });
      if (!res.ok) throw new Error('Échec de la mise à jour');
      toast.success("Équipe mise à jour avec succès.");
      fetchMissions();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de l'équipe.");
    } finally {
      setIsTeamSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Missions</h1>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erreur de chargement</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => {
                setError(null);
                fetchMissions();
              }}>
                Réessayer
              </Button>
            </div>
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Missions</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `${pagination.total} mission(s) au total` : 'Gestion des missions'}
          </p>
        </div>
        <div className="flex gap-2">
          {userRole && ['ADMIN', 'MANAGER', 'AGENT'].includes(userRole) && (
            <Link href="/missions/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Mission
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher missions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SCHEDULED">Programmée</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="QUALITY_CHECK">Contrôle qualité</SelectItem>
                <SelectItem value="CLIENT_VALIDATION">Validation client</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="LOW">Faible</SelectItem>
                <SelectItem value="NORMAL">Normale</SelectItem>
                <SelectItem value="HIGH">Élevée</SelectItem>
                <SelectItem value="CRITICAL">Critique</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}>
              <Filter className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Missions List */}
      {filteredMissions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Aucune mission trouvée'
                  : 'Aucune mission créée'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Commencez par créer votre première mission'}
              </p>
              {userRole && ['ADMIN', 'MANAGER', 'AGENT'].includes(userRole) && (
                <Link href="/missions/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une mission
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMissions.map((mission) => (
            <Card key={mission.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg">{mission.missionNumber}</h3>
                    <p className="text-sm text-muted-foreground">
                      {mission.lead?.firstName} {mission.lead?.lastName}
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
                      <Link href={`/missions/${mission.id}`} className="flex items-center">
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </Link>
                    </DropdownMenuItem>
                    {userRole && ['ADMIN', 'MANAGER', 'AGENT'].includes(userRole) && (
                      <DropdownMenuItem asChild>
                        <Link href={`/missions/${mission.id}/edit`} className="flex items-center">
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleOpenModal(mission)}>
                      <Users className="w-4 h-4 mr-2" />
                      Gérer l'équipe
                    </DropdownMenuItem>
                    {userRole && ['ADMIN', 'MANAGER'].includes(userRole) && (
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteMission(mission.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status and Priority */}
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(mission.status)}>
                    {translate(mission.status)}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(mission.priority)}>
                    {translate(mission.priority)}
                  </Badge>
                </div>

                {/* Mission Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    {mission.address || 'Adresse non spécifiée'}
                  </div>
                  {mission.teamLeader && (
                    <div className="flex items-center text-muted-foreground">
                      <UserIcon className="w-4 h-4 mr-2" />
                      Chef: {mission.teamLeader.name}
                    </div>
                  )}
                </div>

                {/* Progress */}
                {mission.tasks && mission.tasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{calculateProgress(mission.tasks)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${calculateProgress(mission.tasks)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {mission.tasks.filter(t => t.status === 'COMPLETED').length} / {mission.tasks.length} tâches terminées
                    </p>
                  </div>
                )}

                {/* Team Members */}
                {mission.teamMembers && mission.teamMembers.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Équipe</span>
                    <div className="flex -space-x-2">
                      {mission.teamMembers.slice(0, 3).map((member, index) => (
                        <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {mission.teamMembers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">+{mission.teamMembers.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Action */}
                <div className="pt-2">
                  <Link href={`/missions/${mission.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Management Dialog */}
      <Dialog open={!!selectedMission} onOpenChange={(open) => !open && setSelectedMission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Gérer l'équipe - {selectedMission?.missionNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
              {allTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 border rounded">
                  <Checkbox
                    checked={selectedTeamMemberIds.includes(member.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTeamMemberIds([...selectedTeamMemberIds, member.id]);
                      } else {
                        setSelectedTeamMemberIds(selectedTeamMemberIds.filter(id => id !== member.id));
                      }
                    }}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedMission(null)}>
                Annuler
              </Button>
              <Button onClick={updateTeamMembers} disabled={isTeamSaving}>
                {isTeamSaving ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}