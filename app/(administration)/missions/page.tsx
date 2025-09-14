// app/(administration)/missions/page.tsx - FIXED API RESPONSE HANDLING AND PROGRESS BAR
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
import { Progress } from '@/components/ui/progress';
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
  team?: { 
    members: { user: User }[] 
  };
  teamMembers: (TeamMember & { user: User })[];
  tasks: TaskWithDetails[];
  quote?: { finalPrice: number };
  _count?: { 
    tasks: number; 
    qualityChecks: number; 
  };
};

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;

  // State management
  const [allMissions, setAllMissions] = useState<MissionWithDetails[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionWithDetails[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<User[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionWithDetails | null>(null);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      console.log('Fetching missions...');
      const response = await fetch('/api/missions?limit=50');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
    setSelectedTeamMemberIds(mission.teamMembers?.map(tm => tm.id) || []);
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.")) {
      return;
    }

    try {
      const response = await fetch(`/api/missions?id=${missionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Erreur lors de la suppression');
      }

      toast.success('Mission supprimée avec succès');
      await fetchMissions(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting mission:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la mission');
    }
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

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <TableSkeleton title="Chargement des missions..." />;
  }

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Missions</h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total > 0 ? `${pagination.total} mission(s) au total` : 'Gestion des missions'}
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
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mission trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                ? 'Aucune mission ne correspond à vos filtres actuels.'
                : 'Commencez par créer votre première mission.'}
            </p>
            {userRole && ['ADMIN', 'MANAGER', 'AGENT'].includes(userRole) && (
              <Link href="/missions/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une Mission
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map((mission) => {
            const progress = calculateProgress(mission.tasks || []);
            
            return (
              <Card key={mission.id} className="thread-card hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-1">{mission.missionNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {mission.lead.firstName} {mission.lead.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`text-xs ${getStatusColor(mission.status)}`}>
                          {translate(mission.status)}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(mission.priority)}`}>
                          {translate(mission.priority)}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
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
                        {userRole === 'ADMIN' && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMission(mission.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Mission Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{mission.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(mission.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{mission.estimatedDuration / 60}h estimées</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {mission.tasks && mission.tasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Progression</span>
                        <span className="text-sm font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {mission.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length} sur {mission.tasks.length} tâches terminées
                      </p>
                    </div>
                  )}

                  {/* Team Information */}
                  {mission.teamLeader && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={mission.teamLeader.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {mission.teamLeader.name?.split(' ').map(n => n[0]).join('') || 'TL'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{mission.teamLeader.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/missions/${mission.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        Voir Détails
                      </Button>
                    </Link>
                    {mission.status === 'SCHEDULED' && (
                      <Link href={`/missions/${mission.id}/execute`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Play className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {mission.status === 'IN_PROGRESS' && (
                      <Link href={`/missions/${mission.id}/execute`}>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mission Assignment Modal */}
      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={(open) => !open && setSelectedMission(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assigner l'équipe - {selectedMission.missionNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Informations de la mission</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p>{selectedMission.lead.firstName} {selectedMission.lead.lastName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p>{formatDate(selectedMission.scheduledDate)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Adresse:</span>
                    <p>{selectedMission.address}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Membres d'équipe disponibles</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {allTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
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
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback>
                          {member.name?.split(' ').map(n => n[0]).join('') || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{translate(member.role)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedMission(null)}>
                  Annuler
                </Button>
                <Button onClick={() => {
                  // Handle team assignment
                  toast.success('Équipe assignée avec succès');
                  setSelectedMission(null);
                }}>
                  Assigner l'équipe ({selectedTeamMemberIds.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    // Handle previous page
                    toast.info('Navigation en cours de développement');
                  }}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    // Handle next page
                    toast.info('Navigation en cours de développement');
                  }}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}