// Dashboard page for administration area
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate, translate } from '@/lib/utils' 
import { 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  MessageSquare, 
  Mail, 
  Phone,
  MapPin,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2
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
    <div className="main-content space-y-4 sm:space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tableau de Bord</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Vue d'ensemble de votre activité Enarva
          </p>
        </div>
        <ClientOnly>
          <div className="text-xs sm:text-sm text-muted-foreground self-start sm:self-center">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </ClientOnly>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link href={stat.href} key={stat.title}>
              <Card className="thread-card hover:border-primary/50 h-full transition-all active:scale-95">
                <CardContent className="p-3 sm:p-6 h-full flex flex-col justify-between min-h-[100px] sm:min-h-[120px]">
                  <div className="flex flex-col sm:flex-row items-start justify-between w-full gap-2">
                    <div className="flex-1 min-w-0 w-full">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 leading-tight">{stat.title}</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight break-words">{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-enarva-start/10 rounded-xl flex items-center justify-center flex-shrink-0 self-end sm:self-start sm:ml-4">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-enarva-start" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Recent Leads and Active Missions - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Leads */}
        <Card className="thread-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Leads Récents</h3>
              <Link href="/leads">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  Voir tout
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {dashboardData?.recentLeads && dashboardData.recentLeads.length > 0 ? (
                dashboardData.recentLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)} 
                    className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-background hover:bg-secondary/50 transition-all cursor-pointer active:scale-98 border border-transparent hover:border-primary/20"
                  >
                    <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                      <AvatarFallback className="text-xs sm:text-sm">{lead.firstName[0]}{lead.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base text-foreground truncate">{lead.firstName} {lead.lastName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{lead.company || 'Aucune entreprise'}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getChannelIcon(lead.channel)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className={`text-[10px] sm:text-xs ${getStatusColor(lead.status)} whitespace-nowrap`}>
                          {translate(lead.status)}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">Aucun lead récent</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Missions */}
        <Card className="thread-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Missions Actives</h3>
              <Link href="/missions">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  Voir tout
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {dashboardData?.activeMissions && dashboardData.activeMissions.length > 0 ? (
                dashboardData.activeMissions.map((mission) => {
                  const tasks = mission.tasks || [];
                  const completedTasks = tasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length;
                  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                  return (
                    <div
                      key={mission.id}
                      onClick={() => setSelectedMission(mission)}
                      className="p-3 sm:p-4 rounded-xl border hover:bg-secondary/50 transition-all cursor-pointer active:scale-98 hover:border-primary/20 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-sm sm:text-base text-foreground truncate">{mission.lead.firstName} {mission.lead.lastName}</h4>
                        <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                          {translate(mission.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="text-foreground font-medium">{completedTasks}/{tasks.length} tâches • {progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 sm:h-2" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">Aucune mission active</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Dialog - Mobile Optimized */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Détails du Lead</DialogTitle>
            <DialogDescription className="text-sm">
              Informations complètes sur {selectedLead?.firstName} {selectedLead?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 sm:space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-primary">
                      {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{selectedLead.firstName} {selectedLead.lastName}</h3>
                    <Badge className={`${getStatusColor(selectedLead.status)} text-xs mt-1`}>
                      {translate(selectedLead.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline truncate">
                      {selectedLead.email}
                    </a>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{selectedLead.address}</span>
                  </div>
                </div>
              </div>

              {/* Company & Channel */}
              {(selectedLead.company || selectedLead.channel) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Informations supplémentaires
                    </h4>
                    <div className="space-y-2 pl-6">
                      {selectedLead.company && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{selectedLead.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        {getChannelIcon(selectedLead.channel)}
                        <span className="text-muted-foreground">Canal: {translate(selectedLead.channel)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Créé le {formatDate(selectedLead.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Assigned To */}
              {selectedLead.assignedTo && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Assigné à
                    </h4>
                    <div className="pl-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {selectedLead.assignedTo.name?.[0] || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedLead.assignedTo.name || selectedLead.assignedTo.email}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Action Button */}
              <Link href={`/leads/${selectedLead.id}`}>
                <Button className="w-full" size="lg">
                  Voir la fiche complète
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mission Detail Dialog - Mobile Optimized */}
      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Détails de la Mission</DialogTitle>
            <DialogDescription className="text-sm">
              Mission pour {selectedMission?.lead.firstName} {selectedMission?.lead.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mission Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg">Mission #{selectedMission.id.slice(0, 8)}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedMission.lead.firstName} {selectedMission.lead.lastName}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {translate(selectedMission.status)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Client Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Informations client
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedMission.lead.firstName} {selectedMission.lead.lastName}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{selectedMission.lead.address}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tasks Progress */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Progression des tâches
                </h4>
                <div className="space-y-3 pl-6">
                  {(() => {
                    const tasks = selectedMission.tasks || [];
                    const completedTasks = tasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length;
                    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tâches complétées</span>
                          <span className="font-medium">{completedTasks} / {tasks.length}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {progress}% de progression
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Mission Dates */}
              {(selectedMission.scheduledDate || selectedMission.createdAt) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Dates
                    </h4>
                    <div className="space-y-2 pl-6 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Date de création</span>
                        <span>{formatDate(selectedMission.createdAt)}</span>
                      </div>
                      {selectedMission.scheduledDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Date planifiée</span>
                          <span>{formatDate(selectedMission.scheduledDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Action Button */}
              <Link href={`/missions/${selectedMission.id}`}>
                <Button className="w-full" size="lg">
                  Voir la mission complète
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}