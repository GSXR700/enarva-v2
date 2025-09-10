'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Search, Plus, Edit, Trash2, Filter, Calendar, MapPin, Users, Clock, Eye } from 'lucide-react'
import { Mission, Lead, User, Task, TeamMember, MissionStatus } from '@prisma/client'
import { formatDate, formatTime, translate } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type MissionWithDetails = Mission & { 
  lead: Lead; 
  tasks: Task[];
  teamMembers: TeamMember[];
  teamLeader?: User;
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

  const fetchMissions = useCallback(async () => {
    try {
      const response = await fetch('/api/missions');
      if (!response.ok) throw new Error('Impossible de récupérer les missions.');
      const responseData = await response.json();
      setAllMissions(responseData.data || []);
      setFilteredMissions(responseData.data || []);
      setPagination(responseData.pagination);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMissions(),
        fetch('/api/team-members').then(res => res.json()).then(setAllTeamMembers)
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
            mission.lead.firstName.toLowerCase().includes(lowercasedQuery) ||
            mission.lead.lastName.toLowerCase().includes(lowercasedQuery) ||
            mission.missionNumber.toLowerCase().includes(lowercasedQuery) ||
            mission.address.toLowerCase().includes(lowercasedQuery)
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

  if (isLoading) return <TableSkeleton title="Missions" />;
  if (error) return <div className="main-content text-center p-10 text-red-500">{error}</div>;

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Missions</h1>
          <p className="text-muted-foreground mt-1">Gérez toutes les missions et interventions.</p>
        </div>
        {userRole && ['ADMIN', 'MANAGER'].includes(userRole) && (
          <Link href="/missions/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle Mission
            </Button>
          </Link>
        )}
      </div>

      <Card className="thread-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Recherche</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Nom, mission, adresse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="QUALITY_CHECK">Contrôle Qualité</SelectItem>
                <SelectItem value="CLIENT_VALIDATION">Validation Client</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priorité</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                <SelectItem value="LOW">Faible</SelectItem>
                <SelectItem value="NORMAL">Normale</SelectItem>
                <SelectItem value="HIGH">Élevée</SelectItem>
                <SelectItem value="CRITICAL">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setPriorityFilter('all'); }}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMissions.map((mission) => (
          <Card key={mission.id} className="thread-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenModal(mission)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{mission.missionNumber}</CardTitle>
                <Badge className={getStatusColor(mission.status)}>
                  {translate(mission.status)}
                </Badge>
              </div>
              <CardDescription>
                {mission.lead.firstName} {mission.lead.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {mission.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {mission.teamMembers.length} membre(s) assigné(s)
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Progression</span>
                  <span>{calculateProgress(mission.tasks)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${calculateProgress(mission.tasks)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Badge className={getPriorityColor(mission.priority)}>
                  {mission.priority}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/missions/${mission.id}/edit`); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenModal(mission); }}>
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMissions.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Aucune mission trouvée.</p>
        </div>
      )}

      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        {selectedMission && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedMission.missionNumber}</DialogTitle>
              <CardDescription>Pour {selectedMission.lead.firstName} {selectedMission.lead.lastName}</CardDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex gap-2">
                <Link href={`/missions/${selectedMission.id}/edit`} className="flex-1">
                  <Button variant="outline" className="w-full"><Edit className="w-4 h-4 mr-2"/>Modifier</Button>
                </Link>
                <Button variant="destructive" className="flex-1" onClick={() => handleDeleteMission(selectedMission.id)}><Trash2 className="w-4 h-4 mr-2"/>Supprimer</Button>
              </div>

              <Card>
                <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
                   <div><span className="font-semibold">Statut:</span> <Badge className={getStatusColor(selectedMission.status)}>{translate(selectedMission.status)}</Badge></div>
                   <div><span className="font-semibold">Priorité:</span> <Badge className={getPriorityColor(selectedMission.priority)}>{selectedMission.priority}</Badge></div>
                   <div><span className="font-semibold">Date:</span> {formatDate(selectedMission.scheduledDate)}</div>
                   <div><span className="font-semibold">Heure:</span> {formatTime(selectedMission.scheduledDate)}</div>
                   <div className="col-span-2"><span className="font-semibold">Adresse:</span> {selectedMission.address}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Équipe Assignée</CardTitle>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Gérer</Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                      <DropdownMenuLabel>Ajouter/Retirer des membres</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allTeamMembers.filter(tm => tm.user.role === 'TECHNICIAN').map(member => (
                        <DropdownMenuCheckboxItem 
                          key={member.id} 
                          checked={selectedTeamMemberIds.includes(member.id)} 
                          onCheckedChange={(checked) => {
                            setSelectedTeamMemberIds(prev => checked ? [...prev, member.id] : prev.filter(id => id !== member.id));
                          }}
                        >
                          {member.user.name || 'Sans nom'}
                        </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="p-2">
                        <Button size="sm" onClick={updateTeamMembers} disabled={isTeamSaving} className="w-full">
                          {isTeamSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {selectedMission.teamMembers.length > 0 ? (
                      selectedMission.teamMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{(member as TeamMember & { user: User }).user.name || 'Sans nom'}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Aucun membre assigné</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tâches ({selectedMission.tasks.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {selectedMission.tasks.length > 0 ? (
                      selectedMission.tasks.map((task, index) => (
                        <div key={task.id} className="flex items-center justify-between">
                          <span className="text-sm">{index + 1}. {task.title}</span>
                          <Badge className={task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                            {translate(task.status)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Aucune tâche définie</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}