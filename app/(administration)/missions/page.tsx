// app/(administration)/missions/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, MapPin, Clock, Users, CheckSquare, AlertTriangle, Play, CheckCircle, Calendar, Phone, MessageSquare, Camera, Star, ThumbsUp, ThumbsDown, Edit, Trash2, Shield, User as UserIcon
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime, getRelativeTime, translate } from '@/lib/utils'
import { Mission, Lead, User, Quote, Task, TeamMember } from '@prisma/client'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

type TeamMemberWithUser = TeamMember & { user: User };
type MissionWithDetails = Mission & {
  lead: Lead;
  quote: Quote | null;
  teamLeader: User | null;
  teamMembers: TeamMemberWithUser[];
  tasks: Task[];
};

const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800';
      case 'QUALITY_CHECK': return 'bg-yellow-100 text-yellow-800';
      case 'CLIENT_VALIDATION': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return <Calendar className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Play className="w-4 h-4" />;
      case 'QUALITY_CHECK': return <CheckSquare className="w-4 h-4" />;
      case 'CLIENT_VALIDATION': return <Star className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

export default function MissionsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const router = useRouter();

  const [allMissions, setAllMissions] = useState<MissionWithDetails[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionWithDetails[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberWithUser[]>([]);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [isTeamSaving, setIsTeamSaving] = useState(false);
  
  const fetchMissions = useCallback(async () => {
    try {
      const response = await fetch('/api/missions');
      if (!response.ok) throw new Error('Impossible de récupérer les missions.');
      const data = await response.json();
      setAllMissions(data);
      setFilteredMissions(data);
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
      setSelectedMission(null);
      fetchMissions(); // Refresh the list
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTeamUpdate = async () => {
    if (!selectedMission) return;
    setIsTeamSaving(true);
    try {
      const res = await fetch(`/api/missions/${selectedMission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberIds: selectedTeamMemberIds })
      });
      if (!res.ok) throw new Error("Échec de la mise à jour de l'équipe");
      const updatedMission = await res.json();
      setSelectedMission(updatedMission); // Update mission state with new team
      toast.success("Équipe mise à jour !");
      fetchMissions(); // Refresh the main list
    } catch(e: any) {
      toast.error(e.message);
    } finally {
      setIsTeamSaving(false);
    }
  }

  if (isLoading) return <CardGridSkeleton title="Gestion des Missions" description="Chargement des missions..." />;
  if (error) return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Missions</h1>
          <p className="text-muted-foreground mt-1">
            {allMissions.length} missions • {allMissions.filter(m => m.status === 'IN_PROGRESS').length} en cours • {allMissions.filter(m => m.status === 'COMPLETED').length} terminées
          </p>
        </div>
        {(userRole === 'ADMIN' || userRole === 'TEAM_LEADER') && (
            <Link href="/missions/new"><Button className="gap-2 bg-enarva-gradient rounded-lg"><Plus/>Mission</Button></Link>
        )}
      </div>

      <Card className="thread-card">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <Input placeholder="Rechercher par client, adresse, numéro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-background flex-1 min-w-[250px]"/>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="SCHEDULED">Planifiée</SelectItem><SelectItem value="IN_PROGRESS">En cours</SelectItem><SelectItem value="COMPLETED">Terminée</SelectItem></SelectContent></Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Priorité" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes priorités</SelectItem><SelectItem value="LOW">Faible</SelectItem><SelectItem value="NORMAL">Normale</SelectItem><SelectItem value="HIGH">Élevée</SelectItem><SelectItem value="CRITICAL">Critique</SelectItem></SelectContent></Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMissions.map((mission) => {
          const progress = calculateProgress(mission.tasks);
          return (
            <Card key={mission.id} onClick={() => handleOpenModal(mission)} className="thread-card cursor-pointer hover:shadow-lg transition-all flex flex-col">
                <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{mission.missionNumber}</h3>
                      <p className="text-sm text-muted-foreground">{mission.lead.firstName} {mission.lead.lastName}</p>
                    </div>
                    <div className="text-lg font-bold text-enarva-start">{mission.quote ? formatCurrency(Number(mission.quote.finalPrice)) : 'N/A'}</div>
                  </div>
                   <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={`status-badge ${getStatusColor(mission.status)} flex items-center gap-1`}>{getStatusIcon(mission.status)}{translate('MissionStatus', mission.status)}</Badge>
                        <Badge className={`status-badge ${getPriorityColor(mission.priority)}`}>{mission.priority}</Badge>
                   </div>
                  <div className="text-sm text-muted-foreground space-y-2 mt-auto pt-4 border-t">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /><span className="line-clamp-1">{mission.address}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 flex-shrink-0" /><span>{formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}</span></div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-muted-foreground">Progression</span><span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2"><div className="bg-enarva-start h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
                  </div>
                </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
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
                   <div><span className="font-semibold">Statut:</span> <Badge className={getStatusColor(selectedMission.status)}>{translate('MissionStatus', selectedMission.status)}</Badge></div>
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
                        <DropdownMenuCheckboxItem key={member.id} checked={selectedTeamMemberIds.includes(member.id)} onCheckedChange={(checked) => {
                          setSelectedTeamMemberIds(prev => checked ? [...prev, member.id] : prev.filter(id => id !== member.id))
                        }}>
                          {member.firstName} {member.lastName}
                        </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleTeamUpdate} disabled={isTeamSaving}>
                        {isTeamSaving ? 'Sauvegarde...' : 'Sauvegarder l\'équipe'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-3">
                    {selectedMission.teamLeader && <div className="flex items-center gap-3"><Avatar><AvatarImage src={selectedMission.teamLeader.image || undefined} /><AvatarFallback><Shield/></AvatarFallback></Avatar><div><p className="font-semibold">{selectedMission.teamLeader.name}</p><p className="text-xs text-muted-foreground">Chef d'équipe</p></div></div>}
                    {selectedMission.teamMembers.map(member => (
                       <div key={member.id} className="flex items-center gap-3"><Avatar><AvatarImage src={member.user.image || undefined} /><AvatarFallback><UserIcon/></AvatarFallback></Avatar><div><p>{member.firstName} {member.lastName}</p><p className="text-xs text-muted-foreground">Technicien</p></div></div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}