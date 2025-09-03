// app/(administration)/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Edit,
  Trash2,
  Plus,
  ListChecks,
  Calendar as CalendarIcon,
  Tag,
  Briefcase,
  Ruler,
  AlertTriangle,
  Star
} from 'lucide-react'
import { formatCurrency, formatDate, translate } from '@/lib/utils'
import { Lead, Mission, User, LeadStatus, PropertyType, UrgencyLevel, MissionStatus } from '@prisma/client'
import ClientOnly from '@/components/providers/ClientOnly'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import Pusher from 'pusher-js';
import { toast } from "sonner"

type LeadWithAssignee = Lead & { assignedTo: User | null };

type DashboardStats = {
  totalLeads: number;
  activeMissions: number;
  totalRevenue: number;
  conversionRate: string;
};

type ActiveMission = Mission & { lead: Lead; teamLeader: User | null };

type DashboardData = {
  stats: DashboardStats;
  recentLeads: LeadWithAssignee[];
  activeMissions: ActiveMission[];
};

const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, string> = {
        NEW: 'bg-blue-100 text-blue-800', 
        QUALIFIED: 'bg-cyan-100 text-cyan-800',
        QUOTE_SENT: 'bg-purple-100 text-purple-800', 
        QUOTE_ACCEPTED: 'bg-indigo-100 text-indigo-800',
        MISSION_SCHEDULED: 'bg-teal-100 text-teal-800', 
        IN_PROGRESS: 'bg-orange-100 text-orange-800',
        COMPLETED: 'bg-green-100 text-green-800', 
        CANCELLED: 'bg-red-100 text-red-800',
        VISIT_PLANNED: 'bg-yellow-100 text-yellow-800',
        ON_VISIT: 'bg-yellow-200 text-yellow-900',
        VISIT_DONE: 'bg-yellow-300 text-yellow-900',
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

      <div className="responsive-grid">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link href={stat.href} key={stat.title}>
              <Card className="thread-card hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className="w-12 h-12 bg-enarva-start/10 rounded-xl flex items-center justify-center">
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
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Leads Récents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <p className="text-sm text-muted-foreground line-clamp-2">{lead.originalMessage}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Missions en Cours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData?.activeMissions.map((mission) => (
              <div key={mission.id} onClick={() => setSelectedMission(mission)} className="p-4 rounded-xl bg-background border cursor-pointer hover:bg-secondary/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{mission.lead.firstName} {mission.lead.lastName}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {mission.address}
                    </div>
                  </div>
                  <Badge className="text-xs bg-orange-100 text-orange-800">{translate('MissionStatus', mission.status)}</Badge>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Chef: {mission.teamLeader?.name || 'N/A'}</span>
                    <span>Prévu le: {formatDate(mission.scheduledDate)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Avatar className="w-12 h-12"><AvatarFallback>{selectedLead.firstName[0]}{selectedLead.lastName[0]}</AvatarFallback></Avatar>
                        <div>
                            <h2 className="text-xl font-semibold">{selectedLead.firstName} {selectedLead.lastName}</h2>
                            <p className="text-sm text-muted-foreground font-normal">{selectedLead.company || translate('LeadType', selectedLead.leadType)}</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Link href={`/missions/new?type=TECHNICAL_VISIT&leadId=${selectedLead.id}`} className="flex-1"><Button className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"><ListChecks/>Planifier Visite</Button></Link>
                        <Link href={`/quotes/new?leadId=${selectedLead.id}`} className="flex-1"><Button className="w-full gap-2 bg-enarva-gradient"><Plus/>Créer un Devis</Button></Link>
                        <Link href={`/leads/${selectedLead.id}/edit`} className="flex-1"><Button variant="outline" className="w-full gap-2"><Edit/>Modifier</Button></Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card><CardHeader><CardTitle className="text-base">Informations de Contact</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
                            <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /><span>{selectedLead.phone}</span></div>
                            <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" /><span>{selectedLead.email || 'Non fourni'}</span></div>
                            <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{selectedLead.address || 'Non fournie'}</span></div>
                        </CardContent></Card>
                        <Card><CardHeader><CardTitle className="text-base">Qualification</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
                            <div className="flex items-center gap-3"><Tag className="w-4 h-4 text-muted-foreground" />Statut: <Badge className={getStatusColor(selectedLead.status)}>{translate('LeadStatus', selectedLead.status)}</Badge></div>
                            <div className="flex items-center gap-3"><Star className="w-4 h-4 text-muted-foreground" />Score: {selectedLead.score || 0}</div>
                            <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4 text-muted-foreground" />Canal: {translate('LeadCanal', selectedLead.channel)}</div>
                            <div className="flex items-center gap-3"><Users className="w-4 h-4 text-muted-foreground" />Assigné à: {selectedLead.assignedTo?.name || 'Personne'}</div>
                        </CardContent></Card>
                    </div>
                    <Card><CardHeader><CardTitle className="text-base">Détails de la Demande</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-semibold text-muted-foreground">Type de bien:</span><p>{selectedLead.propertyType ? translate('PropertyType', selectedLead.propertyType as PropertyType) : 'N/A'}</p></div>
                        <div><span className="font-semibold text-muted-foreground">Surface:</span><p>{selectedLead.estimatedSurface ? `${selectedLead.estimatedSurface}m²` : 'N/A'}</p></div>
                        <div><span className="font-semibold text-muted-foreground">Urgence:</span><p>{translate('UrgencyLevel', selectedLead.urgencyLevel)}</p></div>
                        <div><span className="font-semibold text-muted-foreground">Budget:</span><p>{selectedLead.budgetRange || 'N/A'}</p></div>
                    </CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-base">Message Initial</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground leading-relaxed">{selectedLead.originalMessage || "Aucun message."}</p></CardContent></Card>
                </div>
            </DialogContent>
        </Dialog>
      )}

      {/* Mission Details Modal */}
      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl">Mission {selectedMission.missionNumber}</DialogTitle>
              <DialogDescription>Pour {selectedMission.lead.firstName} {selectedMission.lead.lastName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge className="text-xs bg-orange-100 text-orange-800">{translate('MissionStatus', selectedMission.status)}</Badge>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Chef d'équipe</span>
                    <span>{selectedMission.teamLeader?.name || 'Non assigné'}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Adresse</span>
                    <span>{selectedMission.address}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Date Prévue</span>
                    <span>{formatDate(selectedMission.scheduledDate)}</span>
                </div>
                <div className="flex pt-4 mt-4 border-t">
                    <Link href={`/missions`} className="w-full">
                        <Button variant="outline" className="w-full">Voir toutes les missions</Button>
                    </Link>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}