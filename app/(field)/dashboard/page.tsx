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
  ArrowRight,
  Star,
  Timer,
  Award,
  Activity,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  HeadphonesIcon,
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
      
      // Handle the API response structure correctly
      const allMissions: MissionWithDetails[] = Array.isArray(data) ? 
        data : data.missions || [];
      
      // Filter missions assigned to current user
      const assignedMissions = allMissions.filter(
        mission =>
          mission.teamLeaderId === currentUser.id ||
          (mission.status !== 'COMPLETED' && mission.status !== 'CANCELLED')
      );

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
      return;
    }

    fetchMissions();

    // Setup Pusher for real-time notifications
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
          missionId: data.missionId
        },
        ...prev.slice(0, 4)
      ]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser?.id, fetchMissions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200';
      case 'IN_PROGRESS':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200';
      case 'COMPLETED':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-200';
      case 'QUALITY_CHECK':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-200';
      case 'CLIENT_VALIDATION':
        return 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-200';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Calendar className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Play className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'QUALITY_CHECK':
        return <Eye className="w-4 h-4" />;
      case 'CLIENT_VALIDATION':
        return <ThumbsUp className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getMissionProgress = (mission: MissionWithDetails) => {
    if (!mission.tasks?.length) return 0;
    const completedTasks = mission.tasks.filter(
      task => task.status === 'COMPLETED' || task.status === 'VALIDATED'
    ).length;
    return Math.round((completedTasks / mission.tasks.length) * 100);
  };

  if (isLoading) {
    return <TableSkeleton title="Chargement de votre tableau de bord..." />;
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

  const getTodayMissions = () => {
    const today = new Date();
    return activeMissions.filter(mission => {
      const missionDate = new Date(mission.scheduledDate);
      return missionDate.toDateString() === today.toDateString();
    });
  };

  const todayMissions = getTodayMissions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-4 space-y-6">
      {/* Enhanced Header Section */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 bg-clip-text text-transparent">
              Tableau de Bord Terrain
            </h1>
            <p className="text-gray-600 mt-1">
              Bonjour {currentUser?.name}, voici vos missions du jour
            </p>
          </div>
          {notifications.length > 0 && (
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Bell className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {notifications.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-lg shadow-blue-100/50 hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Missions Actives</p>
                <p className="text-3xl font-bold text-orange-600">{activeMissions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-lg shadow-blue-100/50 hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">En Attente</p>
                <p className="text-3xl font-bold text-blue-600">{pendingMissions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Timer className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-green-50/50 border-0 shadow-lg shadow-green-100/50 hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Terminées</p>
                <p className="text-3xl font-bold text-green-600">{completedMissions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50/50 border-0 shadow-lg shadow-purple-100/50 hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Aujourd'hui</p>
                <p className="text-3xl font-bold text-purple-600">{todayMissions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <Card className="bg-gradient-to-r from-white via-white to-blue-50/30 border-0 shadow-xl shadow-blue-100/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Zap className="w-6 h-6 text-blue-600" />
            Actions Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/missions" className="block">
              <Button className="w-full h-auto p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 text-gray-900 hover:text-blue-600 transform hover:-translate-y-1">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold">
                    Toutes les Missions
                  </span>
                </div>
              </Button>
            </Link>

            <Link href="/profile" className="block">
              <Button className="w-full h-auto p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 text-gray-900 hover:text-green-600 transform hover:-translate-y-1">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold">
                    Mon Profil
                  </span>
                </div>
              </Button>
            </Link>

            <Link href="/field-reports" className="block">
              <Button className="w-full h-auto p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 text-gray-900 hover:text-purple-600 transform hover:-translate-y-1">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold">
                    Mes Rapports
                  </span>
                </div>
              </Button>
            </Link>

            <Link href="/help" className="block">
              <Button className="w-full h-auto p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 text-gray-900 hover:text-red-600 transform hover:-translate-y-1">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                    <HeadphonesIcon className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold">
                    Support
                  </span>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Today's Missions */}
      {todayMissions.length > 0 && (
        <Card className="bg-gradient-to-r from-white via-white to-orange-50/30 border-0 shadow-xl shadow-orange-100/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Star className="w-6 h-6 text-orange-600" />
              Missions d'Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayMissions.map((mission) => {
                const progress = getMissionProgress(mission);
                return (
                  <Card key={mission.id} className="group relative overflow-hidden bg-gradient-to-r from-white to-orange-50/50 border border-orange-200 shadow-lg hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {mission.missionNumber}
                          </h4>
                          <p className="text-gray-600 font-medium">
                            {mission.lead.firstName} {mission.lead.lastName}
                          </p>
                        </div>
                        <Badge className={`flex items-center gap-1 ${getStatusColor(mission.status)} shadow-lg`}>
                          {getStatusIcon(mission.status)}
                          {translate(mission.status as any)}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-3 text-gray-600">
                          <MapPin className="w-5 h-5 text-orange-500" />
                          <span className="font-medium truncate">{mission.lead.address}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <Clock className="w-5 h-5 text-orange-500" />
                          <span className="font-medium">
                            {formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}
                          </span>
                        </div>
                        {mission.tasks?.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                              <span>Progression</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {mission.status === 'SCHEDULED' && currentUser?.role === 'TEAM_LEADER' && (
                          <Link href={`/missions/${mission.id}/execute`} className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-200 hover:shadow-xl transition-all duration-300">
                              <Play className="w-4 h-4 mr-2" />
                              Démarrer Mission
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                        {mission.status === 'IN_PROGRESS' && (
                          <Link href={`/missions/${mission.id}/execute`} className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-300">
                              <Pause className="w-4 h-4 mr-2" />
                              Continuer Mission
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                        <Link href={`/missions/${mission.id}`} className="flex-1">
                          <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-300">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir Détails
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <Card className="bg-gradient-to-r from-white via-white to-blue-50/30 border-0 shadow-xl shadow-blue-100/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <Activity className="w-6 h-6 text-blue-600" />
                Missions Actives
              </CardTitle>
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full shadow-lg">
                {activeMissions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeMissions.map((mission) => {
                const progress = getMissionProgress(mission);
                return (
                  <Card key={mission.id} className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 border border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {mission.missionNumber}
                          </h4>
                          <p className="text-gray-600 font-medium">
                            {mission.lead.firstName} {mission.lead.lastName}
                          </p>
                        </div>
                        <Badge className={`flex items-center gap-1 ${getStatusColor(mission.status)} shadow-lg`}>
                          {getStatusIcon(mission.status)}
                          {translate(mission.status as any)}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-3 text-gray-600">
                          <MapPin className="w-5 h-5 text-blue-500" />
                          <span className="font-medium truncate">{mission.lead.address}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <span className="font-medium">{formatDate(mission.scheduledDate)}</span>
                        </div>
                        {mission.tasks?.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                              <span>Progression</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-sm text-gray-600">
                              {mission.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length} / {mission.tasks.length} tâches terminées
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {mission.status === 'SCHEDULED' && currentUser?.role === 'TEAM_LEADER' && (
                          <Link href={`/missions/${mission.id}/execute`} className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-200 hover:shadow-xl transition-all duration-300">
                              <Play className="w-4 h-4 mr-2" />
                              Démarrer
                            </Button>
                          </Link>
                        )}
                        {mission.status === 'IN_PROGRESS' && (
                          <Link href={`/missions/${mission.id}/execute`} className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-300">
                              <Pause className="w-4 h-4 mr-2" />
                              Continuer
                            </Button>
                          </Link>
                        )}
                        <Link href={`/missions/${mission.id}`} className="flex-1">
                          <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-300">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir Détails
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Missions */}
      {pendingMissions.length > 0 && (
        <Card className="bg-gradient-to-r from-white via-white to-purple-50/30 border-0 shadow-xl shadow-purple-100/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <Timer className="w-6 h-6 text-purple-600" />
                Missions en Attente
              </CardTitle>
              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full shadow-lg">
                {pendingMissions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingMissions.map((mission) => {
                const progress = getMissionProgress(mission);
                return (
                  <Card key={mission.id} className="group relative overflow-hidden bg-gradient-to-r from-white to-purple-50/50 border border-purple-200 shadow-lg hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {mission.missionNumber}
                          </h4>
                          <p className="text-gray-600 font-medium mb-2">
                            {mission.lead.firstName} {mission.lead.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-purple-600">
                            <Clock className="w-4 h-4" />
                            {formatDate(mission.scheduledDate)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge className={`flex items-center gap-1 mb-2 ${getStatusColor(mission.status)} shadow-lg`}>
                            {getStatusIcon(mission.status)}
                            {translate(mission.status as any)}
                          </Badge>
                          <div className="flex gap-2">
                            <Link href={`/missions/${mission.id}`}>
                              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg">
                                <Eye className="w-4 h-4 mr-2" />
                                Voir
                              </Button>
                            </Link>
                            {(mission.status === 'QUALITY_CHECK' || mission.status === 'CLIENT_VALIDATION') && currentUser?.role === 'TEAM_LEADER' && (
                              <Link href={`/missions/${mission.id}/validate`}>
                                <Button size="sm" variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {mission.tasks?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <div className="flex items-center justify-between text-sm font-medium text-purple-700 mb-2">
                            <span>Progression</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Missions State */}
      {myMissions.length === 0 && (
        <Card className="bg-gradient-to-br from-white via-gray-50 to-blue-50/50 border-0 shadow-xl text-center py-16">
          <CardContent>
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Aucune mission assignée
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Vous n'avez actuellement aucune mission assignée.<br />
                  Contactez votre responsable pour plus d'informations.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/help">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-200 px-8">
                    <HeadphonesIcon className="w-4 h-4 mr-2" />
                    Contacter le Support
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => fetchMissions()}
                  className="border-2 border-gray-300 hover:bg-gray-50 px-8"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      {completedMissions.length > 0 && (
        <Card className="bg-gradient-to-r from-white via-white to-green-50/30 border-0 shadow-xl shadow-green-100/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Résumé des Performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-green-600 mb-1">{completedMissions.length}</p>
                <p className="text-sm font-medium text-green-700">Missions Terminées</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-1">
                  {Math.round((completedMissions.length / Math.max(myMissions.length, 1)) * 100)}%
                </p>
                <p className="text-sm font-medium text-blue-700">Taux de Réussite</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-purple-600 mb-1">4.8</p>
                <p className="text-sm font-medium text-purple-700">Note Moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Buttons for Mobile */}
      {currentUser?.role === 'TEAM_LEADER' && activeMissions.length > 0 && (
        <div className="fixed bottom-6 right-6 lg:hidden">
          <Link href="/missions">
            <Button className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-2xl shadow-blue-300 hover:shadow-blue-400 transition-all duration-300 transform hover:scale-110">
              <Calendar className="w-8 h-8 text-white" />
            </Button>
          </Link>
        </div>
      )}

      {todayMissions.length > 0 && (
        <div className="fixed bottom-24 right-6 lg:hidden">
          <Link href={todayMissions[0]?.id ? `/missions/${todayMissions[0].id}/execute` : '#'}>
            <Button className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-2xl shadow-green-300 hover:shadow-green-400 transition-all duration-300 transform hover:scale-110">
              <Play className="w-6 h-6 text-white" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}