// app/(administration)/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Lead, Mission, User } from '@prisma/client'
import ClientOnly from '@/components/providers/ClientOnly'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import io from 'socket.io-client'
import { toast } from "sonner"

type DashboardStats = {
  totalLeads: number;
  activeMissions: number;
  totalRevenue: number;
  conversionRate: string;
};

type ActiveMission = Mission & { lead: Lead; teamLeader: User | null };

type DashboardData = {
  stats: DashboardStats;
  recentLeads: Lead[];
  activeMissions: ActiveMission[];
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

    const socket = io();

    socket.on('connect', () => {
      console.log('Dashboard connecté au serveur socket.');
    });

    socket.on('new_lead', (newLead: Lead) => {
      toast.success(`Nouveau lead reçu de ${newLead.firstName} ${newLead.lastName}!`);
      
      // --- CORRECTION TEMPS RÉEL ---
      // Utiliser la mise à jour fonctionnelle pour garantir l'accès à l'état le plus récent
      setDashboardData(prevData => {
        if (!prevData) return null;
        
        const updatedLeads = [newLead, ...prevData.recentLeads].slice(0, 3);
        
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
      socket.disconnect();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'QUALIFIED': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }
  
  const statsCards = [
      { title: 'Leads Actifs', value: dashboardData?.stats.totalLeads.toString() || '0', icon: Users },
      { title: 'Missions en Cours', value: dashboardData?.stats.activeMissions.toString() || '0', icon: Clock },
      { title: 'CA du Mois (Terminé)', value: formatCurrency(dashboardData?.stats.totalRevenue || 0), icon: DollarSign },
      { title: 'Taux de Conversion', value: `${dashboardData?.stats.conversionRate || '0'}%`, icon: TrendingUp },
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
            <Card key={stat.title} className="thread-card">
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
              <div key={lead.id} className="flex items-start gap-3 p-4 rounded-xl bg-background hover:bg-secondary/50 transition-colors">
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
              <div key={mission.id} className="p-4 rounded-xl bg-background border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{mission.lead.firstName} {mission.lead.lastName}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {mission.address}
                    </div>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(mission.status)}`}>{mission.status}</Badge>
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
    </div>
  )
}