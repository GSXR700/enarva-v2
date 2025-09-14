'use client'

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Clock,
  MapPin,
  User,
  Users,
  Eye,
  Play,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { Mission, Lead, User as UserType, Task } from '@prisma/client';
import { formatTime, translate } from '@/lib/utils';
import { motion } from 'framer-motion';

type MissionWithDetails = Mission & {
  lead: Lead;
  teamLeader: UserType | null;
  teamMembers: { user: UserType }[];
  tasks?: Task[];
};

interface MissionCardProps {
  mission: MissionWithDetails;
}

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

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'LOW': return 'bg-gray-100 text-gray-600';
    case 'NORMAL': return 'bg-blue-100 text-blue-600';
    case 'HIGH': return 'bg-orange-100 text-orange-600';
    case 'CRITICAL': return 'bg-red-100 text-red-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const calculateProgress = (tasks: Task[]) => {
  if (!tasks || tasks.length === 0) return 0;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

export function MissionCard({ mission }: MissionCardProps) {
  const progress = calculateProgress(mission.tasks || []);
  const scheduledTime = formatTime(mission.scheduledDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="thread-card hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {mission.missionNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground mb-2">
                {mission.lead.firstName} {mission.lead.lastName}
              </p>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${getStatusColor(mission.status)}`}>
                  {translate(mission.status)}
                </Badge>
                <Badge className={`text-xs ${getPriorityColor(mission.priority)}`}>
                  {translate(mission.priority)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                {scheduledTime}
              </div>
              <div className="text-sm text-muted-foreground">
                {mission.estimatedDuration / 60}h
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{mission.address}</span>
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
          <div className="flex items-center gap-2">
            {mission.teamLeader ? (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Avatar className="w-6 h-6">
                  <AvatarImage src={mission.teamLeader.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {mission.teamLeader.name?.split(' ').map(n => n[0]).join('') || 'TL'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{mission.teamLeader.name}</p>
                  <p className="text-xs text-muted-foreground">Chef d'équipe</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Aucune équipe assignée</span>
              </div>
            )}
          </div>

          {/* Team Members */}
          {mission.teamMembers && mission.teamMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Équipe:</span>
              <div className="flex -space-x-2">
                {mission.teamMembers.slice(0, 3).map((member) => (
                  <Avatar key={member.user.id} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.user.name?.split(' ').map(n => n[0]).join('') || 'M'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {mission.teamMembers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      +{mission.teamMembers.length - 3}
                    </span>
                  </div>
                )}
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
                  <Play className="w-4 h-4 mr-1" />
                  Démarrer
                </Button>
              </Link>
            )}
            
            {mission.status === 'IN_PROGRESS' && (
              <Link href={`/missions/${mission.id}/execute`}>
                <Button size="sm" variant="outline">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Continuer
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}