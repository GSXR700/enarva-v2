'use client'

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user'; // <-- CORRECT HOOK
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mission, Lead, User, Task, TaskStatus } from '@prisma/client';
import { formatDate, formatTime, translate } from '@/lib/utils';
import {
  MapPin,
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  Camera,
  Star,
  ThumbsUp,
  Eye,
  ArrowRight,
  Bell
} from 'lucide-react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import Pusher from 'pusher-js';
import { toast } from 'sonner';

type TaskWithDetails = Task & {
  beforePhotos?: string[];
  afterPhotos?: string[];
  clientApproved?: boolean;
};

type MissionWithDetails = Mission & {
  lead: Lead;
  tasks: TaskWithDetails[];
};

export default function FieldDashboardPage() {
  const currentUser = useCurrentUser(); // <-- USE THE TYPE-SAFE HOOK
  const [myMissions, setMyMissions] = useState<MissionWithDetails[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    if (currentUser?.id) { // <-- FIX: Check for the user ID from our type-safe hook
      try {
        const response = await fetch('/api/missions');
        if (!response.ok) throw new Error("Failed to fetch missions");
        const allMissions: MissionWithDetails[] = await response.json();
        
        const assignedMissions = allMissions.filter(
          mission =>
            mission.teamLeaderId === currentUser.id || // <-- FIX: Use currentUser.id
            (mission.status !== 'COMPLETED' && mission.status !== 'CANCELLED')
        );
        
        setMyMissions(assignedMissions);
      } catch (error) {
        console.error("Failed to fetch missions", error);
        toast.error("Impossible de charger les missions.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser]); // <-- FIX: Dependency array now correctly uses currentUser

  useEffect(() => {
    fetchMissions();

    if (currentUser?.id) { // <-- FIX: Use currentUser
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });

      const channelName = `user-${currentUser.id}`; // <-- FIX: Use currentUser.id for channel name
      const channel = pusher.subscribe(channelName);

      channel.bind('mission-new', (newMission: Mission) => {
        toast.success(`Nouvelle mission assignée: ${newMission.missionNumber}`);
        fetchMissions();
      });

      channel.bind('mission-validation', (data: any) => {
        const message = data.approved
          ? `Mission ${data.missionNumber} approuvée!`
          : `Mission ${data.missionNumber} nécessite des corrections`;
        
        toast(message, {
          description: data.approved ? 'Félicitations!' : data.issuesFound,
          duration: 5000,
        });

        setNotifications(prev => [data, ...prev.slice(0, 4)]);
        fetchMissions();
      });

      return () => {
        pusher.unsubscribe(channelName);
        pusher.disconnect();
      };
    }
  }, [currentUser, fetchMissions]); // <-- FIX: Dependency array now uses currentUser

  const getMissionProgress = (mission: MissionWithDetails) => {
    if (!mission.tasks?.length) return 0;
    const completedTasks = mission.tasks.filter(
      t => t.status === 'COMPLETED' || t.status === 'VALIDATED'
    ).length;
    return Math.round((completedTasks / mission.tasks.length) * 100);
  };

  const getMissionStatusInfo = (mission: MissionWithDetails) => {
    const progress = getMissionProgress(mission);
    const totalTasks = mission.tasks.length;
    const completedTasks = mission.tasks.filter(t =>
      t.status === 'COMPLETED' || t.status === 'VALIDATED'
    ).length;
    const withPhotos = mission.tasks.filter(t =>
      (t.beforePhotos && t.beforePhotos.length > 0) ||
      (t.afterPhotos && t.afterPhotos.length > 0)
    ).length;
    const clientApproved = mission.tasks.filter(t => t.clientApproved).length;

    return {
      progress,
      totalTasks,
      completedTasks,
      withPhotos,
      clientApproved,
      nextAction: getNextAction(mission, progress)
    };
  };

  const getNextAction = (mission: MissionWithDetails, progress: number) => {
    switch (mission.status) {
      case 'SCHEDULED':
        return { text: 'Démarrer la mission', action: 'start', color: 'green' };
      case 'IN_PROGRESS':
        if (progress < 100) {
          return { text: 'Continuer les tâches', action: 'continue', color: 'blue' };
        } else {
          return { text: 'Terminer la mission', action: 'complete', color: 'green' };
        }
      case 'QUALITY_CHECK':
        return { text: 'En attente validation', action: 'waiting', color: 'yellow' };
      case 'CLIENT_VALIDATION':
        return { text: 'Validation client', action: 'client', color: 'purple' };
      case 'COMPLETED':
        return { text: 'Mission terminée', action: 'done', color: 'green' };
      default:
        return { text: 'Voir détails', action: 'view', color: 'gray' };
    }
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
      case 'QUALITY_CHECK': return <Eye className="w-4 h-4" />;
      case 'CLIENT_VALIDATION': return <Star className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return <TableSkeleton title="Chargement de vos missions..." />;
  }

  const activeMissions = myMissions.filter(m =>
    ['SCHEDULED', 'IN_PROGRESS'].includes(m.status)
  );
  const pendingMissions = myMissions.filter(m =>
    ['QUALITY_CHECK', 'CLIENT_VALIDATION'].includes(m.status)
  );
  const completedMissions = myMissions.filter(m =>
    m.status === 'COMPLETED'
  );

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Tableau de Bord Terrain
          </h1>
          <p className="text-muted-foreground mt-1">
            Bonjour {currentUser?.name}, voici vos missions du jour
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="relative">
            <Bell className="w-6 h-6 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {notifications.length}
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missions Actives</p>
                <p className="text-2xl font-bold text-orange-600">{activeMissions.length}</p>
              </div>
              <Play className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Validation</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingMissions.length}</p>
              </div>
              <Eye className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Terminées</p>
                <p className="text-2xl font-bold text-green-600">{completedMissions.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notif, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  notif.approved ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'
                }`}>
                  <p className="font-medium">{notif.message}</p>
                  {notif.issuesFound && (
                    <p className="text-sm text-muted-foreground">{notif.issuesFound}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Missions Actives</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeMissions.map((mission) => {
              const statusInfo = getMissionStatusInfo(mission);
              
              return (
                <Card key={mission.id} className="thread-card hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{mission.missionNumber}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {mission.lead.firstName} {mission.lead.lastName}
                        </p>
                      </div>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(mission.status)}`}>
                        {getStatusIcon(mission.status)}
                        {translate(mission.status as any)}
                      </Badge>
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
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{statusInfo.totalTasks} tâches</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression</span>
                        <span className="font-medium">{statusInfo.progress}%</span>
                      </div>
                      <Progress value={statusInfo.progress} className="h-2" />
                    </div>

                    {/* Task Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>{statusInfo.completedTasks} terminées</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Camera className="w-3 h-3 text-blue-500" />
                        <span>{statusInfo.withPhotos} photos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-green-500" />
                        <span>{statusInfo.clientApproved} validées</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link href={`/missions/${mission.id}/execute`} className="block">
                      <Button
                        className={`w-full ${
                          statusInfo.nextAction.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                          statusInfo.nextAction.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                          'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {statusInfo.nextAction.text}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Validation */}
      {pendingMissions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">En Attente de Validation</h2>
          <div className="space-y-3">
            {pendingMissions.map((mission) => {
              const statusInfo = getMissionStatusInfo(mission);
              
              return (
                <Card key={mission.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium">{mission.missionNumber}</h3>
                            <p className="text-sm text-muted-foreground">
                              {mission.lead.firstName} {mission.lead.lastName}
                            </p>
                          </div>
                          <Badge className={getStatusColor(mission.status)}>
                            {translate(mission.status as any)}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Terminée le {formatDate(mission.actualEndTime || mission.updatedAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{statusInfo.progress}%</div>
                        <div className="text-xs text-muted-foreground">Complétée</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Missions */}
      {myMissions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mission assignée</h3>
            <p className="text-muted-foreground">
              Profitez de ce temps libre! De nouvelles missions vous seront assignées bientôt.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Missions */}
      {completedMissions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Missions Récentes Terminées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedMissions.slice(0, 6).map((mission) => (
              <Card key={mission.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{mission.missionNumber}</h3>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Terminée
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {mission.lead.firstName} {mission.lead.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(mission.actualEndTime || mission.updatedAt)}</span>
                  </div>
                  {mission.clientRating && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">{mission.clientRating}/5</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}