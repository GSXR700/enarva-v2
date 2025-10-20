// app/(administration)/page.tsx - ENHANCED ADMIN DASHBOARD WITH APPLE DESIGN
'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  CheckCircle2,
  ArrowRight,
  Activity
} from 'lucide-react'
import { Lead, Mission, User, LeadStatus } from '@prisma/client'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { toast } from 'sonner'
import { usePusherChannel } from '@/hooks/usePusherClient'
import ClientOnly from '@/components/providers/ClientOnly'
import { motion } from 'framer-motion'

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
    NEW: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-600',
    CONTACTED: 'bg-blue-200 dark:bg-blue-800/30 text-blue-900 dark:text-blue-300 border-blue-400 dark:border-blue-500',
    QUALIFIED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-600',
    VISIT_PLANNED: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600',
    QUOTE_SENT: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-400 border-cyan-300 dark:border-cyan-600',
    QUOTE_ACCEPTED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600',
    MISSION_SCHEDULED: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-600',
    LEAD_LOST: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-600',
    COMPLETED: 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600',
  };
  return colors[status] || 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-400';
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
    return (
      <div className="main-content">
        <div className="apple-card p-8 text-center">
          <div className="text-destructive font-medium">Erreur: {error}</div>
        </div>
      </div>
    );
  }
  
  const statsCards = [
    {
      title: 'Leads Actifs',
      value: dashboardData?.stats.totalLeads.toString() || '0',
      icon: Users,
      href: '/leads',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: '+12%'
    },
    {
      title: 'Missions en Cours',
      value: dashboardData?.stats.activeMissions.toString() || '0',
      icon: Clock,
      href: '/missions',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      trend: '+8%'
    },
    {
      title: 'CA du Mois',
      value: formatCurrency(dashboardData?.stats.totalRevenue || 0),
      icon: DollarSign,
      href: '/billing',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      trend: '+23%'
    },
    {
      title: 'Taux de Conversion',
      value: `${dashboardData?.stats.conversionRate || '0'}%`,
      icon: TrendingUp,
      href: '/analytics',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      trend: '+3%'
    },
  ];

  return (
    <div className="main-content space-y-4 md:space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="page-title text-xl sm:text-2xl md:text-3xl">Tableau de Bord</h1>
            <p className="page-subtitle text-xs sm:text-sm">
              Vue d'ensemble de votre activité Enarva
            </p>
          </div>
          <ClientOnly>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </ClientOnly>
        </div>
      </div>

      {/* FIXED: 2 cards per row on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                type: 'spring',
                stiffness: 300,
                damping: 24
              }}
            >
              <Link href={stat.href}>
                <Card className="apple-card group hover:scale-[1.02] transition-transform cursor-pointer h-full">
                  <CardContent className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`w-8 h-8 sm:w-11 sm:h-11 ${stat.bgColor} rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-green-500 bg-green-500/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                        {stat.trend}
                      </span>
                    </div>
                    <div>
                      <p className="text-lg sm:text-2xl font-bold text-foreground leading-none mb-0.5 sm:mb-1 truncate">
                        {stat.value}
                      </p>
                      <p className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">
                        {stat.title}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="apple-card">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Actions Rapides
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'Nouveau Lead', href: '/leads/new', icon: Users },
                { label: 'Créer Devis', href: '/quotes/new', icon: Clock },
                { label: 'Planifier Mission', href: '/missions/new', icon: Calendar },
                { label: 'Voir Analytics', href: '/analytics', icon: TrendingUp },
              ].map((action, index) => {
                const ActionIcon = action.icon
                return (
                  <Link key={action.label} href={action.href}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2 hover:bg-accent/50 hover:border-primary/50 transition-all text-xs sm:text-sm"
                      >
                        <ActionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-[10px] sm:text-xs leading-tight">{action.label}</span>
                      </Button>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="apple-card h-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Leads Récents
                </h3>
                <Link href="/leads">
                  <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2 sm:px-3">
                    Voir tout
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {dashboardData?.recentLeads && dashboardData.recentLeads.length > 0 ? (
                  dashboardData.recentLeads.map((lead, index) => (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      onClick={() => setSelectedLead(lead)}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/50 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-primary">
                            {lead.firstName[0]}{lead.lastName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {lead.company || 'Particulier'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {getChannelIcon(lead.channel)}
                        <Badge className={`${getStatusColor(lead.status)} text-[9px] sm:text-[10px] border-0 px-1.5 sm:px-2 py-0.5`}>
                          {translate(lead.status)}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                    Aucun lead récent
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="apple-card h-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Missions Actives
                </h3>
                <Link href="/missions">
                  <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2 sm:px-3">
                    Voir tout
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {dashboardData?.activeMissions && dashboardData.activeMissions.length > 0 ? (
                  dashboardData.activeMissions.map((mission, index) => {
                    const tasks = mission.tasks || [];
                    const completedTasks = tasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length;
                    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                    return (
                      <motion.div
                        key={mission.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        onClick={() => setSelectedMission(mission)}
                        className="p-2.5 sm:p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer space-y-2 sm:space-y-3 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                                {mission.lead.firstName} {mission.lead.lastName}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {completedTasks}/{tasks.length} tâches
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] whitespace-nowrap px-1.5 sm:px-2 py-0.5">
                            {translate(mission.status)}
                          </Badge>
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] sm:text-xs">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5 sm:h-2" />
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                    Aucune mission active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Détails du Lead</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Informations complètes sur {selectedLead?.firstName} {selectedLead?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-primary">
                      {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{selectedLead.firstName} {selectedLead.lastName}</h3>
                    <Badge className={`${getStatusColor(selectedLead.status)} text-xs mt-1 border-0`}>
                      {translate(selectedLead.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Contact
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                  {selectedLead.email && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline truncate">
                        {selectedLead.email}
                      </a>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-xs sm:text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{selectedLead.address}</span>
                  </div>
                </div>
              </div>

              {(selectedLead.company || selectedLead.channel) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Informations supplémentaires
                    </h4>
                    <div className="space-y-2 pl-6">
                      {selectedLead.company && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{selectedLead.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        {getChannelIcon(selectedLead.channel)}
                        <span className="text-muted-foreground">Canal: {translate(selectedLead.channel)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Créé le {formatDate(selectedLead.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedLead.assignedTo && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Assigné à
                    </h4>
                    <div className="pl-6">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
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

              <Link href={`/leads/${selectedLead.id}`}>
                <Button className="w-full shadow-lg shadow-primary/20" size="lg">
                  Voir la fiche complète
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Détails de la Mission</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Mission pour {selectedMission?.lead.firstName} {selectedMission?.lead.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">Mission #{selectedMission.id.slice(0, 8)}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                      {selectedMission.lead.firstName} {selectedMission.lead.lastName}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {translate(selectedMission.status)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Informations client
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedMission.lead.firstName} {selectedMission.lead.lastName}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs sm:text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{selectedMission.lead.address}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Progression des tâches
                </h4>
                <div className="space-y-3 pl-6">
                  {(() => {
                    const tasks = selectedMission.tasks || [];
                    const completedTasks = tasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length;
                    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
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

              {(selectedMission.scheduledDate || selectedMission.createdAt) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Dates
                    </h4>
                    <div className="space-y-2 pl-6 text-xs sm:text-sm">
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

              <Link href={`/missions/${selectedMission.id}`}>
                <Button className="w-full shadow-lg shadow-primary/20" size="lg">
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