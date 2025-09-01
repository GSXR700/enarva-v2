import { Mission, Lead, User } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, ArrowRight, User as UserIcon } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';

type MissionWithDetails = Mission & {
  lead: Lead;
  teamLeader: User | null;
  teamMembers: { user: User }[];
};

interface MissionCardProps {
  mission: MissionWithDetails;
}

export function MissionCard({ mission }: MissionCardProps) {
    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            SCHEDULED: 'bg-blue-100 text-blue-800',
            IN_PROGRESS: 'bg-orange-100 text-orange-800',
            COMPLETED: 'bg-green-100 text-green-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (priority: string) => {
        if (priority === 'HIGH' || priority === 'CRITICAL') return 'border-red-500/50 bg-red-500/10';
        return 'border-border';
    }


  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className={`thread-card rounded-2xl overflow-hidden ${getPriorityColor(mission.priority)}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-foreground text-md">{mission.missionNumber}</p>
              <p className="text-sm text-muted-foreground">{mission.lead.firstName} {mission.lead.lastName}</p>
            </div>
            <Badge className={getStatusColor(mission.status)}>{mission.status}</Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <Clock className="w-3 h-3" />
            <span>{formatTime(mission.scheduledDate)} - {formatTime(new Date(new Date(mission.scheduledDate).getTime() + mission.estimatedDuration * 60 * 60 * 1000))}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            <span>{mission.address}</span>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-dashed">
            <div className="flex items-center -space-x-2">
                {mission.teamLeader && (
                    <Avatar className="w-8 h-8 border-2 border-card">
                        <AvatarImage src={mission.teamLeader.image || undefined} />
                        <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                )}
                {mission.teamMembers.slice(0, 2).map(member => (
                    <Avatar key={member.user.id} className="w-8 h-8 border-2 border-card">
                        <AvatarImage src={member.user.image || undefined} />
                        <AvatarFallback>{member.user.name?.[0]}</AvatarFallback>
                    </Avatar>
                ))}
            </div>
            <Button variant="ghost" size="icon" className="rounded-full bg-secondary h-8 w-8">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}