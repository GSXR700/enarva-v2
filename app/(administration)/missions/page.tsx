// app/(administration)/missions/page.tsx - APPLE DESIGN TEMPLATE
'use client'

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  CheckCircle,
  Play,
  Search,
  AlertCircle,
  Target,
  Briefcase
} from 'lucide-react';
import { Mission, Lead, User, Task, TeamMember, MissionStatus, Priority } from '@prisma/client';
import { formatDate, translate } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { motion } from 'framer-motion';

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

  const fetchMissions = useCallback(async () => {
    try {
      const response = await fetch('/api/missions?limit=50');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      const missions = responseData.missions || [];
      const paginationData = {
        page: responseData.page || 1,
        limit: responseData.limit || 10,
        total: responseData.total || 0,
        totalPages: responseData.totalPages || 1
      };
      
      setAllMissions(missions);
      setFilteredMissions(missions);
      setPagination(paginationData);
    } catch (err: any) {
      console.error('Error fetching missions:', err);
      toast.error('Erreur lors du chargement des missions');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMissions(),
        fetch('/api/team-members').then(res => res.json()).then(data => {
          const teamMembers = data.teamMembers || data || [];
          setAllTeamMembers(teamMembers);
        }).catch(() => {
          console.error('Error fetching team members');
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
      await fetchMissions();
    } catch (error: any) {
      console.error('Error deleting mission:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la mission');
    }
  };

  const handleTeamAssignment = async () => {
    if (!selectedMission || selectedTeamMemberIds.length === 0) {
      toast.error('Veuillez sélectionner au moins un membre d\'équipe');
      return;
    }

    try {
      const response = await fetch(`/api/missions/${selectedMission.id}/assign-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberIds: selectedTeamMemberIds })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'assignation');

      toast.success('Équipe assignée avec succès');
      setSelectedMission(null);
      setSelectedTeamMemberIds([]);
      await fetchMissions();
    } catch (error) {
      console.error('Error assigning team:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipe');
    }
  };

  const getStatusColor = (status: MissionStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'QUALITY_CHECK': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'CLIENT_VALIDATION': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return <TableSkeleton title="Missions" />;
  }

  // Stats calculations
  const scheduledCount = allMissions.filter(m => m.status === 'SCHEDULED').length;
  const inProgressCount = allMissions.filter(m => m.status === 'IN_PROGRESS').length;
  const completedCount = allMissions.filter(m => m.status === 'COMPLETED').length;
  const urgentCount = allMissions.filter(m => m.priority === 'CRITICAL' || m.priority === 'HIGH').length;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[95vw] md:max-w-[1400px] mx-auto space-y-6">
        
        {/* Header - Apple Style */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-sm">
              <Briefcase className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                Missions
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-semibold">
                  {allMissions.length}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestion et suivi des missions
              </p>
            </div>
          </div>
          <Link href="/missions/new" className="hidden sm:block">
            <Button className="gap-2 h-11 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4" />
              Nouvelle Mission
            </Button>
          </Link>
        </motion.div>

        {/* Stats Cards - Apple Style with Animations */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-blue-500">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Planifiées</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{scheduledCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>À venir</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-sm">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-yellow-500">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">En Cours</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{inProgressCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Play className="w-3 h-3" />
                      <span>Actives</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 backdrop-blur-sm">
                    <Target className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-green-500">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Terminées</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{completedCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3" />
                      <span>Complètes</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-red-500">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Urgentes</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{urgentCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="w-3 h-3" />
                      <span>Prioritaires</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-sm">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters Bar - Apple Style Sticky */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 -mx-4 md:-mx-6 px-4 md:px-6 py-4 border-y"
        >
          <Card className="apple-card border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par client, numéro, adresse..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-border/50 focus-visible:ring-2"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-[160px] rounded-xl">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="SCHEDULED">Planifiées</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="QUALITY_CHECK">Contrôle qualité</SelectItem>
                      <SelectItem value="CLIENT_VALIDATION">Validation client</SelectItem>
                      <SelectItem value="COMPLETED">Terminées</SelectItem>
                      <SelectItem value="CANCELLED">Annulées</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-11 w-[150px] rounded-xl">
                      <SelectValue placeholder="Priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes priorités</SelectItem>
                      <SelectItem value="LOW">Basse</SelectItem>
                      <SelectItem value="NORMAL">Normale</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="CRITICAL">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Missions Grid */}
        {filteredMissions.length === 0 ? (
          <Card className="apple-card">
            <CardContent className="text-center py-12">
              <Briefcase className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune mission trouvée</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Aucun résultat pour ces critères.'
                  : 'Créez votre première mission pour commencer.'}
              </p>
              <Button onClick={() => window.location.href = '/missions/new'} className="gap-2">
                <Plus className="w-4 h-4" />
                Créer une mission
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {filteredMissions.map((mission, index) => {
              const progress = calculateProgress(mission.tasks || []);
              
              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="apple-card group cursor-pointer h-full" onClick={() => window.location.href = `/missions/${mission.id}`}>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold mb-1">
                            {mission.lead.firstName} {mission.lead.lastName}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground font-mono">
                            {mission.missionNumber}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/missions/${mission.id}`; }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/missions/${mission.id}/edit`; }}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedMission(mission); }}>
                                  <Users className="w-4 h-4 mr-2" />
                                  Assigner équipe
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMission(mission.id); }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(mission.status)}>
                          {translate(mission.status)}
                        </Badge>
                        <Badge className={getPriorityColor(mission.priority)}>
                          {translate(mission.priority)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 p-5 pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{mission.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>{formatDate(mission.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>{mission.estimatedDuration / 60}h estimées</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {mission.tasks && mission.tasks.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-medium">Progression</span>
                            <span className="text-xs font-semibold">{progress}%</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                            <motion.div 
                              className={`h-2 rounded-full ${
                                progress === 100 ? 'bg-green-500' :
                                progress >= 50 ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {mission.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length}/{mission.tasks.length} tâches
                          </p>
                        </div>
                      )}

                      {/* Team Leader */}
                      {mission.teamLeader && (
                        <div className="flex items-center gap-2 pt-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={mission.teamLeader.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {mission.teamLeader.name?.split(' ').map(n => n[0]).join('') || 'TL'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{mission.teamLeader.name}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/missions/${mission.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-9 rounded-lg">
                            <Eye className="w-4 h-4 mr-2" />
                            Détails
                          </Button>
                        </Link>
                        {mission.status === 'SCHEDULED' && (
                          <Link href={`/missions/${mission.id}/execute`}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 px-4 rounded-lg">
                              <Play className="w-4 h-4 mr-2" />
                              Démarrer
                            </Button>
                          </Link>
                        )}
                        {mission.status === 'IN_PROGRESS' && (
                          <Link href={`/missions/${mission.id}/execute`}>
                            <Button size="sm" variant="outline" className="h-9 px-4 rounded-lg">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Continuer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Mission Assignment Modal */}
        {selectedMission && (
          <Dialog open={!!selectedMission} onOpenChange={(open) => !open && setSelectedMission(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto apple-card">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  Assigner l'équipe - {selectedMission.missionNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3 text-base">Informations de la mission</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-xl">
                    <div>
                      <span className="text-muted-foreground block mb-1">Client:</span>
                      <p className="font-medium">{selectedMission.lead.firstName} {selectedMission.lead.lastName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Date:</span>
                      <p className="font-medium">{formatDate(selectedMission.scheduledDate)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block mb-1">Adresse:</span>
                      <p className="font-medium">{selectedMission.address}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-base">
                    Membres d'équipe disponibles ({allTeamMembers.length})
                  </h4>
                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded-xl p-3 bg-muted/10">
                    {allTeamMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (selectedTeamMemberIds.includes(member.id)) {
                            setSelectedTeamMemberIds(selectedTeamMemberIds.filter(id => id !== member.id));
                          } else {
                            setSelectedTeamMemberIds([...selectedTeamMemberIds, member.id]);
                          }
                        }}
                      >
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
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                            {member.name?.split(' ').map(n => n[0]).join('') || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{translate(member.role)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedMission(null)} className="rounded-xl">
                    Annuler
                  </Button>
                  <Button onClick={handleTeamAssignment} className="rounded-xl">
                    <Users className="w-4 h-4 mr-2" />
                    Assigner ({selectedTeamMemberIds.length})
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Pagination - Apple Style */}
        {pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center items-center gap-2 flex-wrap"
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toast.info('Navigation en cours de développement')}
              disabled={pagination.page <= 1} 
              className="h-9 px-4 rounded-full"
            >
              Précédent
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={pagination.page === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => toast.info('Navigation en cours de développement')}
                  className={`h-9 w-9 p-0 rounded-full ${pagination.page === p ? 'shadow-lg shadow-primary/20' : ''}`}
                >
                  {p}
                </Button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toast.info('Navigation en cours de développement')}
              disabled={pagination.page >= pagination.totalPages} 
              className="h-9 px-4 rounded-full"
            >
              Suivant
            </Button>
          </motion.div>
        )}

        {/* Floating Add Button - Mobile Only */}
        <div className="sm:hidden fixed bottom-6 right-6 z-50">
          <Link href="/missions/new">
            <Button 
              size="icon"
              className="h-16 w-16 rounded-full shadow-2xl shadow-primary/30 p-0"
            >
              <Plus className="w-7 h-7" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
