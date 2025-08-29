// app/(administration)/missions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, MapPin, Clock, Users, CheckSquare, AlertTriangle, Play, CheckCircle, Calendar, Phone, MessageSquare, Camera, Star, ThumbsUp, ThumbsDown
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime, getRelativeTime } from '@/lib/utils'
import { Mission, Lead, User, Quote, Task, TeamMember } from '@prisma/client'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'

type MissionWithDetails = Mission & {
  lead: Lead;
  quote: Quote | null; // --- MODIFICATION 1: Allow quote to be null ---
  teamLeader: User | null;
  teamMembers: TeamMember[];
  tasks: Task[];
};

export default function MissionsPage() {
  const [allMissions, setAllMissions] = useState<MissionWithDetails[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionWithDetails[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/missions');
        if (!response.ok) throw new Error('Impossible de récupérer les missions.');
        const data = await response.json();
        setAllMissions(data);
        setFilteredMissions(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMissions();
  }, []);

  useEffect(() => {
    let missions = [...allMissions];
    if (statusFilter !== 'all') {
      missions = missions.filter(mission => mission.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      missions = missions.filter(mission => mission.priority === priorityFilter);
    }
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
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'VALIDATED': return 'bg-green-600 text-white';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (isLoading) {
    return <CardGridSkeleton title="Gestion des Missions" description="Chargement des missions..." />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  const getTasksSummary = (tasks: Task[]) => {
      const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length;
      const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const assigned = tasks.filter(t => t.status === 'ASSIGNED').length;
      return { completed, inProgress, assigned };
  };

  const calculateProgress = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length;
      return Math.round((completedTasks / tasks.length) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Missions</h1>
          <p className="text-muted-foreground mt-1">
            {allMissions.length} missions • {allMissions.filter(m => m.status === 'IN_PROGRESS').length} en cours • {allMissions.filter(m => m.status === 'COMPLETED').length} terminées
          </p>
        </div>
        <Link href="/missions/new">
            <Button className="gap-2 bg-enarva-gradient rounded-lg">
                <Plus className="w-4 h-4" />
                Nouvelle Mission
            </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Rechercher par client, adresse, numéro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="LOW">Faible</SelectItem>
                <SelectItem value="NORMAL">Normale</SelectItem>
                <SelectItem value="HIGH">Élevée</SelectItem>
                <SelectItem value="CRITICAL">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMissions.map((mission) => {
          const tasksSummary = getTasksSummary(mission.tasks);
          const progress = calculateProgress(mission.tasks);

          return (
            <div key={mission.id} onClick={() => setSelectedMission(mission)}>
              <Card className="thread-card cursor-pointer hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">{mission.missionNumber}</h3>
                        <Badge className={`status-badge ${getStatusColor(mission.status)} flex items-center gap-1`}>{getStatusIcon(mission.status)}{mission.status}</Badge>
                        <Badge className={`status-badge ${getPriorityColor(mission.priority)}`}>{mission.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-8 h-8"><AvatarFallback>{mission.lead.firstName[0]}{mission.lead.lastName[0]}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium text-sm">{mission.lead.firstName} {mission.lead.lastName}</p>
                          <p className="text-xs text-muted-foreground">{mission.lead.company}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* --- MODIFICATION 2: Conditionally render the price --- */}
                      <div className="text-lg font-bold text-enarva-start">
                        {mission.quote ? formatCurrency(Number(mission.quote.finalPrice)) : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">{mission.address}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{mission.teamLeader?.name}</span>
                      <span className="text-xs text-muted-foreground">+ {mission.teamMembers.length} membres</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />{formatTime(mission.scheduledDate)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-enarva-start h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs">
                    {tasksSummary.completed > 0 && <span className="text-green-600">✓ {tasksSummary.completed} terminées</span>}
                    {tasksSummary.inProgress > 0 && <span className="text-blue-600">⏳ {tasksSummary.inProgress} en cours</span>}
                    {tasksSummary.assigned > 0 && <span className="text-gray-600">📋 {tasksSummary.assigned} assignées</span>}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <CheckSquare className="w-6 h-6 text-enarva-start" />
                <div>
                  <span className="text-xl">{selectedMission.missionNumber}</span>
                  <p className="text-sm text-muted-foreground font-normal">{selectedMission.lead.firstName} {selectedMission.lead.lastName} • {selectedMission.lead.company}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-6">
              {/* Le reste de votre modale détaillée reste ici */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}