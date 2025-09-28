'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  DollarSign
} from 'lucide-react';
import { Mission, Lead, User as UserType, Task, TaskStatus, MissionStatus } from '@prisma/client';
import { formatDate, formatTime, formatCurrency, translate } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { useSession } from 'next-auth/react';

type TaskWithDetails = Task & {
  assignedTo: {
    user: UserType;
  } | null;
};

type TeamMember = {
  user: UserType;
};

type MissionWithDetails = Mission & {
  lead: Lead;
  teamLeader: UserType | null;
  team: {
    members: TeamMember[];
  } | null;
  tasks: TaskWithDetails[];
  expenses: any[];
  fieldReport: any | null;
  inventoryUsed: any[];
  quote: {
    finalPrice: number;
  } | null;
  quoteId: string | null;
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

const getTaskStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'ASSIGNED': return 'bg-gray-100 text-gray-800';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'VALIDATED': return 'bg-green-600 text-white';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const missionId = params.id as string;

  const [mission, setMission] = useState<MissionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (missionId) {
      fetchMission();
    }
  }, [missionId]);

  const fetchMission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/missions/${missionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Mission non trouvée');
        }
        throw new Error('Erreur lors du chargement de la mission');
      }
      
      const data = await response.json();
      setMission(data);
    } catch (err: any) {
      console.error('Error fetching mission:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (tasks: TaskWithDetails[]) => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const handleDeleteMission = async () => {
    if (!mission) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la mission ${mission.missionNumber} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/missions?id=${mission.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de la mission');
      }

      toast.success('Mission supprimée avec succès');
      router.push('/missions');
    } catch (error: any) {
      console.error('Error deleting mission:', error);
      toast.error(error.message || 'Erreur lors de la suppression de la mission');
    }
  };

  const handleStatusUpdate = async (newStatus: MissionStatus) => {
    if (!mission) return;

    try {
      const response = await fetch(`/api/missions/${mission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      await fetchMission();
      toast.success('Statut mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  if (isLoading) {
    return <TableSkeleton title="Chargement de la mission..." />;
  }

  if (error || !mission) {
    return (
      <div className="main-content">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/missions" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
              Retour aux missions
          </Link>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erreur</h3>
            <p className="text-muted-foreground mb-4">{error || 'Mission non trouvée'}</p>
            <Link href="/missions">
              <Button>Retour aux missions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress(mission.tasks);
  const userRole = (session?.user as any)?.role;
  const canEdit = userRole && ['ADMIN', 'MANAGER', 'AGENT'].includes(userRole);
  const canDelete = userRole === 'ADMIN';

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/missions" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Retour aux missions
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/missions/${mission.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </Link>
          )}
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusUpdate('IN_PROGRESS')}>
                      <Play className="w-4 h-4 mr-2" />
                      Démarrer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusUpdate('COMPLETED')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Terminer
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={handleDeleteMission} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mission Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Mission {mission.missionNumber}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {mission.lead.firstName} {mission.lead.lastName}
              </p>
            </div>
            <Badge className={`px-3 py-1 ${getStatusColor(mission.status)}`}>
              {translate(mission.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mission Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Adresse</p>
                <p className="text-sm text-muted-foreground">{mission.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date prévue</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Durée estimée</p>
                <p className="text-sm text-muted-foreground">{mission.estimatedDuration / 60}h</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progression des tâches</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {mission.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length} sur {mission.tasks.length} tâches terminées
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Link href={`/missions/${mission.id}/execute`}>
              <Button variant="outline" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Exécuter Mission
              </Button>
            </Link>
            {mission.quoteId && (
              <Link href={`/quotes/${mission.quoteId}`}>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Voir Devis
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Tâches ({mission.tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mission.tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune tâche assignée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mission.tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={`border-l-4 p-4 rounded-lg ${
                        task.status === 'VALIDATED' ? 'border-l-green-500 bg-green-50/50' :
                        task.status === 'COMPLETED' ? 'border-l-blue-500 bg-blue-50/50' :
                        task.status === 'IN_PROGRESS' ? 'border-l-orange-500 bg-orange-50/50' :
                        task.status === 'REJECTED' ? 'border-l-red-500 bg-red-50/50' :
                        'border-l-gray-300 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {index + 1}. {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <Badge className={`text-xs ${getTaskStatusColor(task.status)}`}>
                              {translate(task.status)}
                            </Badge>
                            {task.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {task.assignedTo.user.name}
                                </span>
                              </div>
                            )}
                            {task.estimatedTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {task.estimatedTime}min
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          {mission.quote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Informations Financières
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Montant du devis</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(mission.quote.finalPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Dépenses</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(mission.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Nom</p>
                <p className="text-sm text-muted-foreground">
                  {mission.lead.firstName} {mission.lead.lastName}
                </p>
              </div>
              {mission.lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={`tel:${mission.lead.phone}`} 
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {mission.lead.phone}
                  </a>
                </div>
              )}
              {mission.lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${mission.lead.email}`} 
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {mission.lead.email}
                  </a>
                </div>
              )}
              {mission.lead.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">{mission.lead.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Information */}
          <Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Users className="w-5 h-5" />
      Équipe Assignée
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Team Leader - Display separately */}
    {mission.teamLeader && (
      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border">
        <Avatar className="w-8 h-8">
          <AvatarImage src={mission.teamLeader.image || undefined} />
          <AvatarFallback>
            {mission.teamLeader.name?.split(' ').map(n => n[0]).join('') || 'TL'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-medium">{mission.teamLeader.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">Chef d'équipe</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Leader
        </Badge>
      </div>
    )}

    {/* Team Members - EXCLUDE TEAM LEADER */}
    {mission.team?.members
      .filter((member) => member.user.id !== mission.teamLeader?.id)
      .map((member) => (
        <div key={member.user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
          <Avatar className="w-8 h-8">
            <AvatarImage src={member.user.image || undefined} />
            <AvatarFallback>
              {member.user.name?.split(' ').map(n => n[0]).join('') || 'M'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{member.user.name}</p>
            <p className="text-xs text-muted-foreground">
              {translate(member.user.role)}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Membre
          </Badge>
        </div>
      ))}

    {/* No Team Assigned State */}
    {!mission.teamLeader && (!mission.team?.members || mission.team.members.length === 0) && (
      <div className="text-center py-6">
        <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-muted-foreground">Aucune équipe assignée</p>
      </div>
    )}

    {/* Team Stats */}
    {(mission.teamLeader || (mission.team?.members && mission.team.members.length > 0)) && (
      <div className="pt-3 border-t">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total membres:</span>
            <span className="ml-1 font-medium">
              {(mission.teamLeader ? 1 : 0) + (mission.team?.members?.filter(m => m.user.id !== mission.teamLeader?.id).length || 0)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Rôles:</span>
            <span className="ml-1 font-medium">
              {mission.teamLeader && mission.team?.members && mission.team.members.length > 1 ? 'Mixte' : 
               mission.teamLeader ? 'Leadership' : 'Équipe'}
            </span>
          </div>
        </div>
      </div>
    )}
  </CardContent>
</Card>

          {/* Mission Notes */}
          {mission.accessNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes d'Accès
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {mission.accessNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}