'use client'

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mission, Lead, Task } from '@prisma/client';
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
  ThumbsUp,
  Eye,
  Bell,
  Pause
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
  const currentUser = useCurrentUser();
  const [myMissions, setMyMissions] = useState<MissionWithDetails[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    if (!currentUser?.id) {
      console.log('No current user ID available');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/missions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch missions');
      }
      
      const data = await response.json();
      
      // FIX: Handle the API response structure correctly
      // The API returns { missions: [...], total: ..., page: ... }
      const allMissions: MissionWithDetails[] = Array.isArray(data) ? data : data.missions || [];
      
      console.log('Fetched missions:', allMissions);
      console.log('Current user ID:', currentUser.id);

      // Filter missions assigned to current user or that need attention
      const assignedMissions = allMissions.filter(
        mission =>
          mission.teamLeaderId === currentUser.id || // FIX: Use currentUser.id
          (mission.status !== 'COMPLETED' && mission.status !== 'CANCELLED')
      );

      console.log('Assigned missions:', assignedMissions);
      setMyMissions(assignedMissions);
      
    } catch (error) {
      console.error('Error fetching missions:', error);
      toast.error('Erreur lors de la récupération des missions');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      fetchMissions();
      return; // Quitte tôt si l'utilisateur n'est pas là
    }

    fetchMissions();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channelName = `user-${currentUser.id}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('mission-new', (newMission: Mission) => {
      toast.success(`Nouvelle mission assignée: ${newMission.missionNumber}`);
      fetchMissions();
    });

    channel.bind('mission-validation', (data: any) => {
      const message = data.approved
        ? `Mission ${data.missionNumber} validée !`
        : `Mission ${data.missionNumber} nécessite des corrections`;
      
      toast.info(message);
      
      setNotifications(prev => [
        {
          id: Date.now(),
          type: data.approved ? 'success' : 'warning',
          message,
          missionNumber: data.missionNumber,
          issuesFound: data.issuesFound || null,
          timestamp: new Date()
        },
        ...prev.slice(0, 4)
      ]);
      
      fetchMissions();
    });

    // La fonction de nettoyage est maintenant toujours retournée
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [currentUser?.id, fetchMissions]);

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return <Calendar className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Play className="w-4 h-4" />;
      case 'QUALITY_CHECK': return <Eye className="w-4 h-4" />;
      case 'CLIENT_VALIDATION': return <ThumbsUp className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getMissionStatusInfo = (mission: MissionWithDetails) => {
    if (!mission.tasks || mission.tasks.length === 0) {
      return { completedTasks: 0, totalTasks: 0, progress: 0 };
    }

    const totalTasks = mission.tasks.length;
    const completedTasks = mission.tasks.filter(task => 
      task.status === 'COMPLETED' || task.status === 'VALIDATED'
    ).length;
    const progress = Math.round((completedTasks / totalTasks) * 100);

    return { completedTasks, totalTasks, progress };
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
              <div className="p-2 bg-orange-100 rounded-lg">
                <Play className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold text-blue-600">{pendingMissions.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
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
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
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
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className={`p-3 rounded-lg border-l-4 ${
                  notif.type === 'success' 
                    ? 'border-l-green-500 bg-green-50' 
                    : 'border-l-orange-500 bg-orange-50'
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
                        <span>{statusInfo.completedTasks}/{statusInfo.totalTasks}</span>
                      </div>
                      <Progress value={statusInfo.progress} className="w-full" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {mission.status === 'SCHEDULED' && (
                        <Link href={`/missions/${mission.id}/execute`} className="flex-1">
                          <Button size="sm" className="w-full">
                            <Play className="w-4 h-4 mr-2" />
                            Démarrer
                          </Button>
                        </Link>
                      )}
                      {mission.status === 'IN_PROGRESS' && (
                        <Link href={`/missions/${mission.id}/execute`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Pause className="w-4 h-4 mr-2" />
                            Continuer
                          </Button>
                        </Link>
                      )}
                      <Link href={`/missions/${mission.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Missions */}
      {pendingMissions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Missions en Attente de Validation</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingMissions.map((mission) => {
              
              return (
                <Card key={mission.id} className="thread-card">
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
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{mission.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDate(mission.scheduledDate)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/missions/${mission.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          Voir Détails
                        </Button>
                      </Link>
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
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mission assignée</h3>
            <p className="text-muted-foreground mb-4">
              Vous n'avez actuellement aucune mission assignée. Contactez votre responsable pour plus d'informations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/missions">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span className="text-sm">Toutes les Missions</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="w-6 h-6" />
                <span className="text-sm">Mon Profil</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Camera className="w-6 h-6" />
                <span className="text-sm">Mes Rapports</span>
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <AlertTriangle className="w-6 h-6" />
                <span className="text-sm">Support</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}