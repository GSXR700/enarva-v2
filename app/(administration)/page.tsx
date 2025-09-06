// app/(administration)/page.tsx - FULLY FIXED VERSION
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
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'
import { Lead, Mission, User, LeadStatus } from '@prisma/client'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { toast } from 'sonner'
import Pusher from 'pusher-js'
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
        // PHASE 1: Nouveau & Premier Contact
        NEW: 'bg-blue-100 text-blue-800',
        NEW_CONTACT: 'bg-blue-200 text-blue-900',
        FOLLOW_UP_NEEDED: 'bg-yellow-100 text-yellow-800',
        CONTACTED: 'bg-blue-300 text-blue-900',
        CALLBACK_REQUESTED: 'bg-yellow-200 text-yellow-900',
        
        // PHASE 2: Qualification & Évaluation
        QUALIFIED: 'bg-green-100 text-green-800',
        QUALIFIED_HIGH: 'bg-green-200 text-green-900',
        QUALIFIED_MEDIUM: 'bg-yellow-300 text-yellow-900',
        QUALIFIED_LOW: 'bg-orange-100 text-orange-800',
        NEEDS_ASSESSMENT: 'bg-purple-100 text-purple-800',
        EVALUATING: 'bg-purple-200 text-purple-900',
        INTERESTED: 'bg-green-300 text-green-900',
        NOT_INTERESTED: 'bg-red-100 text-red-800',
        HOT: 'bg-red-200 text-red-900',
        WARM: 'bg-orange-200 text-orange-900',
        COLD: 'bg-gray-200 text-gray-800',

        // PHASE 3: Visite & Devis
        VISIT_SCHEDULED: 'bg-indigo-100 text-indigo-800',
        VISIT_PLANNED: 'bg-indigo-200 text-indigo-900',
        VISIT_DONE: 'bg-indigo-300 text-indigo-900',
        VISIT_RESCHEDULED: 'bg-orange-300 text-orange-900',
        QUOTE_REQUESTED: 'bg-cyan-100 text-cyan-800',
        QUOTE_PENDING: 'bg-cyan-200 text-cyan-900',
        QUOTE_SENT: 'bg-cyan-300 text-cyan-900',
        QUOTE_REVIEWED: 'bg-teal-100 text-teal-800',
        QUOTE_FOLLOW_UP: 'bg-teal-200 text-teal-900',

        // PHASE 4: Négociation & Décision  
        NEGOTIATING: 'bg-amber-100 text-amber-800',
        BUDGET_REVIEW: 'bg-amber-200 text-amber-900',
        DECISION_PENDING: 'bg-purple-300 text-purple-900',
        PROPOSAL_REVIEW: 'bg-violet-100 text-violet-800',
        FINAL_DECISION: 'bg-violet-200 text-violet-900',

        // PHASE 5: Acceptation & Signature
        QUOTE_ACCEPTED: 'bg-emerald-100 text-emerald-800',
        READY_TO_SIGN: 'bg-emerald-200 text-emerald-900',
        CONTRACT_PENDING: 'bg-emerald-300 text-emerald-900',
        SIGNED: 'bg-emerald-400 text-white',

        // PHASE 6: Exécution & Suivi
        MISSION_SCHEDULED: 'bg-sky-100 text-sky-800',
        IN_PROGRESS: 'bg-sky-200 text-sky-900',
        WORK_STARTED: 'bg-sky-300 text-sky-900',
        WORK_IN_PROGRESS: 'bg-sky-400 text-white',
        WORK_COMPLETED: 'bg-green-400 text-white',
        VALIDATION_PENDING: 'bg-lime-100 text-lime-800',
        VALIDATED: 'bg-lime-200 text-lime-900',
        INVOICED: 'bg-stone-100 text-stone-800',
        PAID: 'bg-green-500 text-white',
        FOLLOW_UP_SCHEDULED: 'bg-slate-100 text-slate-800',
        REWORK_NEEDED: 'bg-red-300 text-red-900',
        REWORK_SCHEDULED: 'bg-red-100 text-red-800',
        REWORK_IN_PROGRESS: 'bg-orange-400 text-white',
        REWORK_DONE: 'bg-green-600 text-white',
        UNDER_WARRANTY: 'bg-blue-400 text-white',
        AFTER_SALES_SERVICE: 'bg-blue-500 text-white',
        CLIENT_ISSUE: 'bg-red-200 text-red-900',
        IN_DISPUTE: 'bg-red-300 text-red-900',
        CLIENT_PAUSED: 'bg-gray-300 text-gray-800',
        LEAD_LOST: 'bg-red-400 text-white',
        CANCELLED: 'bg-red-200 text-red-900',
        CANCELED_BY_CLIENT: 'bg-red-200 text-red-900',
        CANCELED_BY_ENARVA: 'bg-red-200 text-red-900',
        INTERNAL_REVIEW: 'bg-yellow-50 text-yellow-700',
        AWAITING_PARTS: 'bg-gray-200 text-gray-800',

        // PHASE 7: Contrats / Sous-traitance
        CONTRACT_SIGNED: 'bg-emerald-100 text-emerald-800',
        UNDER_CONTRACT: 'bg-emerald-200 text-emerald-900',
        SUBCONTRACTED: 'bg-gray-300 text-gray-900',
        OUTSOURCED: 'bg-gray-400 text-gray-900',
        WAITING_THIRD_PARTY: 'bg-yellow-100 text-yellow-800',

        // PHASE 8: Produits / Leads externes
        PRODUCT_ONLY: 'bg-stone-200 text-stone-800',
        PRODUCT_SUPPLIER: 'bg-stone-300 text-stone-900',
        DELIVERY_ONLY: 'bg-sky-200 text-sky-900',
        AFFILIATE_LEAD: 'bg-rose-100 text-rose-800',
        SUBCONTRACTOR_LEAD: 'bg-rose-200 text-rose-900',

        // Additional common statuses
        COMPLETED: 'bg-green-500 text-white',
        TO_QUALIFY: 'bg-yellow-100 text-yellow-800',
        WAITING_INFO: 'bg-yellow-200 text-yellow-900',
        ON_VISIT: 'bg-indigo-200 text-indigo-900',
        QUOTE_REFUSED: 'bg-red-100 text-red-800',
        INTERVENTION_PLANNED: 'bg-sky-100 text-sky-800',
        INTERVENTION_IN_PROGRESS: 'bg-sky-300 text-sky-900',
        INTERVENTION_DONE: 'bg-green-300 text-green-900',
        QUALITY_CONTROL: 'bg-amber-100 text-amber-800',
        CLIENT_TO_CONFIRM_END: 'bg-purple-100 text-purple-800',
        CLIENT_CONFIRMED: 'bg-green-200 text-green-900',
        DELIVERY_PLANNED: 'bg-blue-100 text-blue-800',
        DELIVERY_DONE: 'bg-blue-200 text-blue-900',
        SIGNED_DELIVERY_NOTE: 'bg-blue-300 text-blue-900',
        PENDING_PAYMENT: 'bg-orange-100 text-orange-800',
        PAID_OFFICIAL: 'bg-green-400 text-white',
        PAID_CASH: 'bg-green-300 text-green-900',
        REFUNDED: 'bg-gray-300 text-gray-800',
        PENDING_REFUND: 'bg-gray-200 text-gray-800',
        FOLLOW_UP_SENT: 'bg-yellow-100 text-yellow-800',
        UPSELL_IN_PROGRESS: 'bg-purple-200 text-purple-900',
        UPSELL_CONVERTED: 'bg-purple-300 text-purple-900',
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

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe('leads-channel');

    channel.bind('new-lead', (newLead: Lead) => {
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
    });

    return () => {
      pusher.unsubscribe('leads-channel');
      pusher.disconnect();
    };
  }, []);

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

      {/* ✅ FIXED: Equal height cards with consistent structure */}
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
                        {translate('LeadStatus', lead.status)}
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
                const completedTasks = mission.tasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length;
                const progress = mission.tasks.length > 0 ? Math.round((completedTasks / mission.tasks.length) * 100) : 0;

                return (
                  <div
                    key={mission.id}
                    onClick={() => setSelectedMission(mission)}
                    className="p-4 rounded-xl border hover:bg-secondary/50 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{mission.lead.firstName} {mission.lead.lastName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {translate('MissionStatus', mission.status)}
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
                  <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                  <p className="text-foreground">{selectedLead.firstName} {selectedLead.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entreprise</label>
                  <p className="text-foreground">{selectedLead.company || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                  <p className="text-foreground">{selectedLead.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground">{selectedLead.email || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                  <p className="text-foreground">{selectedLead.address || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <Badge className={`text-xs ${getStatusColor(selectedLead.status)}`}>
                    {translate('LeadStatus', selectedLead.status)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Score</label>
                  <p className="text-foreground">{selectedLead.score || 0}/100</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Canal</label>
                  <p className="text-foreground">{translate('LeadCanal', selectedLead.channel)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type de propriété</label>
                  <p className="text-foreground">{selectedLead.propertyType ? translate('PropertyType', selectedLead.propertyType) : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Surface estimée</label>
                  <p className="text-foreground">{selectedLead.estimatedSurface ? `${selectedLead.estimatedSurface}m²` : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Urgence</label>
                  <p className="text-foreground">{selectedLead.urgencyLevel ? translate('UrgencyLevel', selectedLead.urgencyLevel) : 'N/A'}</p>
                </div>
              </div>
              {selectedLead.originalMessage && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message original</label>
                  <p className="text-foreground mt-1">{selectedLead.originalMessage}</p>
                </div>
              )}
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
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <p className="text-foreground">{selectedMission.lead.firstName} {selectedMission.lead.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <Badge variant="outline" className="text-xs">
                    {translate('MissionStatus', selectedMission.status)}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse
                  </label>
                  <p className="text-foreground">{selectedMission.lead.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date prévue
                  </label>
                  <p className="text-foreground">{formatDate(selectedMission.scheduledDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Durée estimée</label>
                  <p className="text-foreground">{selectedMission.estimatedDuration}h</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tâches ({selectedMission.tasks.length})</label>
                <div className="mt-2 space-y-2">
                  {selectedMission.tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm">Tâche {index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {translate('TaskStatus', task.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}