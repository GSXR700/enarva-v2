// Dashboard page for administration area
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate, translate } from '@/lib/utils' 
import { 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  MessageSquare, 
  Mail, 
  Phone
} from 'lucide-react'
import { Lead, Mission, User, LeadStatus } from '@prisma/client'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { toast } from 'sonner'
import { usePusherChannel } from '@/hooks/usePusherClient'
import ClientOnly from '@/components/providers/ClientOnly'

type LeadWithAssignee = Lead & { assignedTo?: User | null };

type ActiveMission = Mission & {
  lead: { firstName: string; lastName: string; address: string };
  tasks: { id: string; status: string }[];
};

type DashboardData = {
  stats: {
    totalLeads: number;
    activeMissions: number;
    totalRevenue: number;
    conversionRate: string;
  };
  recentLeads: LeadWithAssignee[];
  activeMissions: ActiveMission[];
};

const getStatusColor = (status: LeadStatus) => {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    CONTACTED: 'bg-blue-300 text-blue-900',
    QUALIFIED: 'bg-green-100 text-green-800',
    VISIT_PLANNED: 'bg-indigo-200 text-indigo-900',
    QUOTE_SENT: 'bg-cyan-300 text-cyan-900',
    QUOTE_ACCEPTED: 'bg-emerald-100 text-emerald-800',
    MISSION_SCHEDULED: 'bg-sky-100 text-sky-800',
    LEAD_LOST: 'bg-red-400 text-white',
    COMPLETED: 'bg-green-500 text-white',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithAssignee | null>(null);
  const [selectedMission, setSelectedMission] = useState<ActiveMission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Impossible de charger les données du tableau de bord.');
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Real-time updates with Pusher using centralized hook
  usePusherChannel('leads-channel', {
    'new-lead': (newLead: Lead) => {
      console.log('Dashboard: New lead received via Pusher:', newLead);
      toast.success(`Nouveau lead reçu de ${newLead.firstName} ${newLead.lastName}!`);
      setDashboardData(prevData => {
        if (!prevData) return null;
        const updatedLeads = [newLead as LeadWithAssignee, ...prevData.recentLeads].slice(0, 3);
        return {
          ...prevData,
          stats: {
            ...prevData.stats,
            totalLeads: prevData.stats.totalLeads + 1,
          },
          recentLeads: updatedLeads,
        };
      });
    }
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'EMAIL': return <Mail className="w-4 h-4 text-blue-600" />;
      case 'PHONE': return <Phone className="w-4 h-4 text-orange-600" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }
  
  const statsCards = [
    { title: 'Leads Actifs', value: dashboardData?.stats.totalLeads.toString() || '0', icon: Users, href: '/leads' },
    { title: 'Missions en Cours', value: dashboardData?.stats.activeMissions.toString() || '0', icon: Clock, href: '/missions' },
    { title: 'CA du Mois (Terminé)', value: formatCurrency(dashboardData?.stats.totalRevenue || 0), icon: DollarSign, href: '/billing' },
    { title: 'Taux de Conversion', value: `${dashboardData?.stats.conversionRate || '0'}%`, icon: TrendingUp, href: '/analytics' },
  ];

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tableau de Bord</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de votre activité Enarva
          </p>
        </div>
        <ClientOnly>
          <div className="text-sm text-muted-foreground self-start sm:self-center">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </ClientOnly>
      </div>

      <div className="responsive-grid">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link href={stat.href} key={stat.title}>
              <Card className="thread-card hover:border-primary/50 h-full">
                <CardContent className="p-6 h-full flex flex-col justify-between min-h-[120px]">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-2 leading-tight">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground leading-tight break-words">{stat.value}</p>
                    </div>
                    <div className="w-12 h-12 bg-enarva-start/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-4">
                      <Icon className="w-6 h-6 text-enarva-start" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="thread-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Leads Récents</h3>
            <div className="space-y-4">
              {dashboardData?.recentLeads.map((lead) => (
                <div key={lead.id} onClick={() => setSelectedLead(lead)} className="flex items-start gap-3 p-4 rounded-xl bg-background hover:bg-secondary/50 transition-colors cursor-pointer">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{lead.firstName[0]}{lead.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{lead.firstName} {lead.lastName}</p>
                        <p className="text-sm text-muted-foreground">{lead.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(lead.channel)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${getStatusColor(lead.status)}`}>
                        {translate(lead.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )) || <p className="text-center text-muted-foreground py-4">Aucun lead récent</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Missions Actives</h3>
            <div className="space-y-4">
              {dashboardData?.activeMissions.map((mission) => {
                const tasks = mission.tasks || [];
                const completedTasks = tasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length;
                const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                return (
                  <div
                    key={mission.id}
                    onClick={() => setSelectedMission(mission)}
                    className="p-4 rounded-xl border hover:bg-secondary/50 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{mission.lead.firstName} {mission.lead.lastName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {translate(mission.status)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="text-foreground font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                );
              }) || <p className="text-center text-muted-foreground py-4">Aucune mission active</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du Lead</DialogTitle>
            <DialogDescription>
              Informations complètes sur {selectedLead?.firstName} {selectedLead?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Contact</h4>
                  <p>{selectedLead.phone}</p>
                  <p>{selectedLead.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Statut</h4>
                  <Badge className={getStatusColor(selectedLead.status)}>
                    {translate(selectedLead.status)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mission Detail Dialog */}
      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la Mission</DialogTitle>
            <DialogDescription>
              Mission pour {selectedMission?.lead.firstName} {selectedMission?.lead.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Client</h4>
                  <p>{selectedMission.lead.firstName} {selectedMission.lead.lastName}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Adresse</h4>
                  <p>{selectedMission.lead.address}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}