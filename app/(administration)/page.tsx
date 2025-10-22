// app/(administration)/page.tsx - APPLE DESIGN TEMPLATE DASHBOARD
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
  Activity,
  Briefcase
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
    NEW: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    CONTACTED: 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-300',
    QUALIFIED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    VISIT_PLANNED: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200',
    QUOTE_SENT: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-200',
    QUOTE_ACCEPTED: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
    MISSION_SCHEDULED: 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200',
    LEAD_LOST: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    COMPLETED: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };
  return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
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
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-[95vw] md:max-w-[1400px] mx-auto">
          <Card className="apple-card border-red-200 dark:border-red-800">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Activity className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
      borderColor: 'border-l-blue-500',
      trend: '+12%'
    },
    {
      title: 'Missions en Cours',
      value: dashboardData?.stats.activeMissions.toString() || '0',
      icon: Briefcase,
      href: '/missions',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-gradient-to-br from-purple-500/10 to-purple-500/5',
      borderColor: 'border-l-purple-500',
      trend: '+8%'
    },
    {
      title: 'CA du Mois',
      value: formatCurrency(dashboardData?.stats.totalRevenue || 0),
      icon: DollarSign,
      href: '/billing',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
      borderColor: 'border-l-emerald-500',
      trend: '+23%'
    },
    {
      title: 'Taux de Conversion',
      value: `${dashboardData?.stats.conversionRate || '0'}%`,
      icon: TrendingUp,
      href: '/analytics',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-gradient-to-br from-indigo-500/10 to-indigo-500/5',
      borderColor: 'border-l-indigo-500',
      trend: '+3%'
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[95vw] md:max-w-[1400px] mx-auto space-y-6">
        
        {/* Header - Apple Style */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Tableau de Bord
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vue d'ensemble de votre activité Enarva
              </p>
            </div>
          </div>
          <ClientOnly>
            <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </ClientOnly>
        </motion.div>

        {/* Stats Cards - Mobile Optimized (2 columns on mobile, 4 on desktop) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <Link href={stat.href}>
                  <Card className={`apple-card group relative overflow-hidden border-l-4 ${stat.borderColor} cursor-pointer h-full`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="p-3 md:p-5 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1 md:mb-2">
                            {stat.title}
                          </p>
                          <p className={`text-lg md:text-2xl font-bold ${stat.color} mb-0.5 md:mb-1`}>
                            {stat.value}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] md:text-xs text-green-600 dark:text-green-400">
                            <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span className="hidden sm:inline">{stat.trend} ce mois</span>
                            <span className="sm:hidden">{stat.trend}</span>
                          </div>
                        </div>
                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.bgColor} backdrop-blur-sm`}>
                          <Icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Recent Leads & Active Missions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        >
          {/* Recent Leads Card */}
          <Card className="apple-card">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold">Leads Récents</h2>
                </div>
                <Link href="/leads">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs md:text-sm rounded-xl">
                    Voir tout
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {dashboardData?.recentLeads && dashboardData.recentLeads.length > 0 ? (
                  dashboardData.recentLeads.slice(0, 5).map((lead, index) => (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedLead(lead)}
                      className="p-3 md:p-4 rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer border border-border/50 hover:border-border group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Avatar className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                            <AvatarFallback className="text-sm md:text-base bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                              {lead.firstName[0]}{lead.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base truncate">
                              {lead.firstName} {lead.lastName}
                            </p>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {lead.company || 'Particulier'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 md:mt-2">
                              {getChannelIcon(lead.channel)}
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {translate(lead.channel)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge className={`${getStatusColor(lead.status)} text-[10px] md:text-xs px-2 py-0.5`}>
                            {translate(lead.status)}
                          </Badge>
                          <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(lead.createdAt)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 md:py-12">
                    <Users className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/50 mx-auto mb-3 md:mb-4" />
                    <p className="text-sm md:text-base text-muted-foreground">Aucun lead récent</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Missions Card */}
          <Card className="apple-card">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold">Missions Actives</h2>
                </div>
                <Link href="/missions">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs md:text-sm rounded-xl">
                    Voir tout
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {dashboardData?.activeMissions && dashboardData.activeMissions.length > 0 ? (
                  dashboardData.activeMissions.slice(0, 5).map((mission, index) => {
                    const completedTasks = mission.tasks?.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length || 0;
                    const totalTasks = mission.tasks?.length || 0;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                      <motion.div
                        key={mission.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedMission(mission)}
                        className="p-3 md:p-4 rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer border border-border/50 hover:border-border group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm md:text-base truncate">
                                {mission.lead.firstName} {mission.lead.lastName}
                              </p>
                              <p className="text-xs md:text-sm text-muted-foreground truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {mission.lead.address}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] md:text-xs whitespace-nowrap">
                              {translate(mission.status)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progression</span>
                              <span className="font-semibold">{progress}%</span>
                            </div>
                            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                              <motion.div 
                                className={`h-2 rounded-full ${
                                  progress === 100 ? 'bg-green-500' :
                                  progress >= 50 ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">
                              {completedTasks}/{totalTasks} tâches complétées
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 md:py-12">
                    <Briefcase className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/50 mx-auto mb-3 md:mb-4" />
                    <p className="text-sm md:text-base text-muted-foreground">Aucune mission active</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto apple-card">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Détails du Lead</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Informations complètes sur ce lead
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 flex-shrink-0">
                    <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                      {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {selectedLead.company || 'Particulier'}
                    </p>
                    <Badge className={`${getStatusColor(selectedLead.status)} mt-2 text-xs`}>
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
                <Button className="w-full shadow-lg shadow-primary/20 rounded-xl" size="lg">
                  Voir la fiche complète
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mission Details Dialog */}
      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto apple-card">
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
                <Button className="w-full shadow-lg shadow-primary/20 rounded-xl" size="lg">
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