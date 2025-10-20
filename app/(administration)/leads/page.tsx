// app/(administration)/leads/page.tsx - ENHANCED WITH APPLE DESIGN
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lead, LeadStatus, User } from '@prisma/client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { LeadForm } from '@/components/leads/LeadForm';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { usePusherChannel } from '@/hooks/usePusherClient';
import { Plus, Search, Eye, Edit, Trash2, Download, Phone, Mail, Building2, MapPin, MoreVertical, Users, CheckCircle, AlertTriangle, Star, List, Grid3x3, TrendingUp, Filter } from 'lucide-react';
import { formatDate, translate } from '@/lib/utils';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type LeadWithRelations = Lead & { assignedTo?: User | null };

interface LeadsResponse {
  leads: LeadWithRelations[];
  total: number;
  totalPages?: number;
}

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<Array<{id: string, name: string}>>([]);
  const limit = 20;

  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          const userList = data.users || data;
          if (Array.isArray(userList)) {
            setUsers(userList.map((user: User) => ({
              id: user.id,
              name: user.name || user.email || 'Utilisateur sans nom'
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  usePusherChannel('leads-channel', {
    'new-lead': (newLead: any) => {
      console.log('Leads page: New lead received via Pusher:', newLead);
      toast.success(`Nouveau lead reçu de ${newLead.firstName} ${newLead.lastName}!`);
      
      queryClient.setQueryData(['leads', page, limit, statusFilter, searchTerm], (oldData: LeadsResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          leads: [newLead, ...oldData.leads],
          total: oldData.total + 1,
          totalPages: Math.ceil((oldData.total + 1) / limit)
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },

    'lead-updated': (updatedLead: any) => {
      console.log('Leads page: Lead updated via Pusher:', updatedLead);
      toast.success(`Lead ${updatedLead.firstName} ${updatedLead.lastName} mis à jour!`);
      
      queryClient.setQueryData(['leads', page, limit, statusFilter, searchTerm], (oldData: LeadsResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          leads: oldData.leads.map(lead =>
            lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
          )
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },

    'lead-status-changed': (data: any) => {
      console.log('Leads page: Lead status changed via Pusher:', data);
      toast.info(`Statut du lead ${data.firstName} ${data.lastName} changé vers ${translate(data.newStatus)}`);
      
      queryClient.setQueryData(['leads', page, limit, statusFilter, searchTerm], (oldData: LeadsResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          leads: oldData.leads.map(lead =>
            lead.id === data.id ? { ...lead, status: data.newStatus } : lead
          )
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },

    'lead-assigned': (data: any) => {
      console.log('Leads page: Lead assigned via Pusher:', data);
      const message = data.newAssignedToId 
        ? `Lead ${data.firstName} ${data.lastName} assigné`
        : `Assignation du lead ${data.firstName} ${data.lastName} supprimée`;
      toast.info(message);
      
      queryClient.setQueryData(['leads', page, limit, statusFilter, searchTerm], (oldData: LeadsResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          leads: oldData.leads.map(lead =>
            lead.id === data.id ? { ...lead, assignedToId: data.newAssignedToId } : lead
          )
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },

    'lead-deleted': (data: any) => {
      console.log('Leads page: Lead deleted via Pusher:', data);
      toast.error(`Lead ${data.firstName} ${data.lastName} supprimé`);
      
      queryClient.setQueryData(['leads', page, limit, statusFilter, searchTerm], (oldData: LeadsResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          leads: oldData.leads.filter(lead => lead.id !== data.id),
          total: Math.max(0, oldData.total - 1),
          totalPages: Math.ceil(Math.max(0, oldData.total - 1) / limit)
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const {
    data: leadsData,
    isLoading,
    error,
    refetch
  } = useQuery<LeadsResponse>({
    queryKey: ['leads', page, limit, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/leads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateStatusMutation = useOptimisticMutation<void, { id: string; status: LeadStatus }>({
    queryKey: ['leads', page, limit, statusFilter, searchTerm],
    mutationFn: async ({ id, status }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
    },
    optimisticUpdate: (oldData: LeadsResponse, { id, status }) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        leads: oldData.leads.map(lead =>
          lead.id === id ? { ...lead, status } : lead
        )
      };
    },
    successMessage: 'Statut mis à jour',
    errorMessage: 'Erreur lors de la mise à jour'
  });

  const deleteMutation = useOptimisticMutation<void, string>({
    queryKey: ['leads', page, limit, statusFilter, searchTerm],
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete lead');
    },
    optimisticUpdate: (oldData: LeadsResponse, id: string) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        leads: oldData.leads.filter(lead => lead.id !== id),
        total: oldData.total - 1
      };
    },
    successMessage: 'Lead supprimé',
    errorMessage: 'Erreur suppression'
  });

  const leads = leadsData?.leads || [];
  const totalLeads = leadsData?.total || 0;

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    return leads.filter(lead =>
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce lead?')) return;
    deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Prénom', 'Nom', 'Téléphone', 'Email', 'Société', 'Type', 'Statut', 'Score', 'Date'];
    const rows = filteredLeads.map(lead => [
      lead.id, lead.firstName, lead.lastName, lead.phone, lead.email || '',
      lead.company || '', lead.leadType, lead.status, lead.score || '', formatDate(lead.createdAt)
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreBadge = (score: number) => {
    return (
      <Badge variant="outline" className={`font-semibold ${score >= 80 ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-600' : score >= 60 ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-600' : score >= 40 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600' : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-600'}`}>
        {score}%
      </Badge>
    );
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-600',
      QUALIFIED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-600',
      QUOTE_SENT: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600',
      QUOTE_ACCEPTED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600',
      COMPLETED: 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600',
      CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-600',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-400';
  };

  const getStatusIcon = (status: LeadStatus) => {
    const icons: Record<string, any> = {
      NEW: Star, QUALIFIED: CheckCircle, QUOTE_SENT: Mail,
      QUOTE_ACCEPTED: CheckCircle, COMPLETED: CheckCircle, CANCELLED: AlertTriangle
    };
    const Icon = icons[status] || Star;
    return <Icon className="w-3 h-3" />;
  };

  const LeadDetailsModal = ({ lead }: { lead: Lead }) => (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-semibold">Détails du Lead</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Informations personnelles
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Nom:</strong> {lead.firstName} {lead.lastName}</p>
                <p><strong>Téléphone:</strong> {lead.phone}</p>
                <p><strong>Email:</strong> {lead.email || 'Non renseigné'}</p>
                <p><strong>Adresse:</strong> {lead.address || 'Non renseignée'}</p>
              </div>
            </div>
            {lead.company && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Informations entreprise
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Société:</strong> {lead.company}</p>
                  <p><strong>ICE:</strong> {lead.iceNumber || 'Non renseigné'}</p>
                  <p><strong>Secteur:</strong> {lead.activitySector || 'Non renseigné'}</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Détails du projet
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Type:</strong> {translate(lead.leadType)}</p>
                <p><strong>Statut:</strong> {translate(lead.status)}</p>
                <p><strong>Score:</strong> {lead.score || 0}%</p>
                <p><strong>Surface:</strong> {lead.estimatedSurface || 'N/A'} m²</p>
                <p><strong>Budget:</strong> {lead.budgetRange || 'Non renseigné'}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Source et timing
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Canal:</strong> {translate(lead.channel)}</p>
                <p><strong>Urgence:</strong> {translate(lead.urgencyLevel || 'NORMAL')}</p>
                <p><strong>Créé le:</strong> {formatDate(lead.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
        {lead.originalMessage && (
          <div className="mt-6">
            <h3 className="font-semibold text-lg mb-3">Message original</h3>
            <p className="bg-muted/50 p-4 rounded-lg text-sm">{lead.originalMessage}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (error) {
    return (
      <div className="main-content">
        <div className="apple-card p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground mb-4">Erreur lors du chargement des leads.</p>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageSkeleton showHeader showStats statsCount={4} showCards cardsCount={9} />;
  }

  return (
    <div className="main-content space-y-6 animate-fade-in">
      {/* Page Header - Apple Style */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Leads</h1>
            <p className="page-subtitle">
              Gérez et suivez vos prospects et opportunités
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="btn-mobile-icon gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            <span>Nouveau Lead</span>
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar - Apple Style */}
      <Card className="apple-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-accent/30 border-none rounded-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-accent/30 border-none rounded-full">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="NEW">Nouveaux</SelectItem>
                  <SelectItem value="QUALIFIED">Qualifiés</SelectItem>
                  <SelectItem value="QUOTE_SENT">Devis envoyés</SelectItem>
                  <SelectItem value="QUOTE_ACCEPTED">Acceptés</SelectItem>
                  <SelectItem value="COMPLETED">Terminés</SelectItem>
                  <SelectItem value="CANCELLED">Annulés</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 border border-border/50 rounded-full p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3 rounded-full"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3 rounded-full"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={exportToCSV} className="btn-mobile-icon gap-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Apple Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total',
            value: totalLeads,
            icon: Users,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
          },
          {
            label: 'Nouveaux',
            value: leads.filter(l => l.status === 'NEW').length,
            icon: Star,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10'
          },
          {
            label: 'Qualifiés',
            value: leads.filter(l => l.status === 'QUALIFIED').length,
            icon: CheckCircle,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10'
          },
          {
            label: 'Taux',
            value: totalLeads > 0 ? `${Math.round((leads.filter(l => l.status === 'COMPLETED').length / totalLeads) * 100)}%` : '0%',
            icon: TrendingUp,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="apple-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-11 h-11 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Leads Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="apple-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="text-xs md:text-sm font-semibold">Contact</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs md:text-sm font-semibold">Société</TableHead>
                      <TableHead className="text-xs md:text-sm font-semibold">Statut</TableHead>
                      <TableHead className="text-xs md:text-sm font-semibold">Score</TableHead>
                      <TableHead className="hidden md:table-cell text-xs md:text-sm font-semibold">Date</TableHead>
                      <TableHead className="text-xs md:text-sm font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead, index) => (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-accent/30 border-b border-border/30 transition-colors"
                      >
                        <TableCell className="py-3">
                          <div className="cursor-pointer" onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}>
                            <p className="font-medium text-sm hover:text-primary transition-colors">{lead.firstName} {lead.lastName}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Phone className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{lead.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-3">
                          {lead.company ? (
                            <div>
                              <p className="font-medium text-sm truncate max-w-[150px]">{lead.company}</p>
                              <p className="text-xs text-muted-foreground">{lead.iceNumber}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Particulier</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}>
                              <SelectTrigger className={`${getStatusColor(lead.status)} text-xs h-8 w-auto border-0 rounded-full`}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(lead.status)}
                                  <span className="hidden md:inline">{translate(lead.status)}</span>
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NEW">Nouveau</SelectItem>
                                <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                                <SelectItem value="QUOTE_SENT">Devis envoyé</SelectItem>
                                <SelectItem value="QUOTE_ACCEPTED">Accepté</SelectItem>
                                <SelectItem value="COMPLETED">Terminé</SelectItem>
                                <SelectItem value="CANCELLED">Annulé</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {getScoreBadge(lead.score || 0)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-3">
                          <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/50">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}`)} className="text-xs cursor-pointer">
                                <Eye className="w-3 h-3 mr-2" />Voir
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                                <Link href={`/leads/${lead.id}/edit`}><Edit className="w-3 h-3 mr-2" />Modifier</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-red-600 text-xs cursor-pointer">
                                <Trash2 className="w-3 h-3 mr-2" />Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
                {filteredLeads.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucun lead trouvé</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || statusFilter !== 'ALL' ? 'Aucun résultat pour ces critères.' : 'Créez votre premier lead pour commencer.'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredLeads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="apple-card group hover:scale-[1.02] transition-all cursor-pointer" 
                  onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}
                >
                  <CardHeader className="pb-3 p-5">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate hover:text-primary transition-colors">
                          {lead.firstName} {lead.lastName}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}>
                          <SelectTrigger className={`${getStatusColor(lead.status)} text-[10px] px-2 py-1 h-7 w-auto border-0 rounded-full shrink-0`}>
                            <SelectValue>{translate(lead.status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">Nouveau</SelectItem>
                            <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                            <SelectItem value="QUOTE_SENT">Devis envoyé</SelectItem>
                            <SelectItem value="QUOTE_ACCEPTED">Accepté</SelectItem>
                            <SelectItem value="COMPLETED">Terminé</SelectItem>
                            <SelectItem value="CANCELLED">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5 pt-0">
                    {lead.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{lead.company}</span>
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{lead.address}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{lead.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-muted-foreground font-medium">Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted/50 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            className={`h-2 rounded-full ${getScoreColor(lead.score || 0)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${lead.score || 0}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                        <span className="text-xs font-semibold min-w-[2.5rem] text-right">{lead.score || 0}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}`); }} 
                          className="h-8 w-8 p-0 hover:bg-accent/50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild 
                          className="h-8 w-8 p-0 hover:bg-accent/50"
                        >
                          <Link href={`/leads/${lead.id}/edit`} onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filteredLeads.length === 0 && (
              <div className="col-span-full">
                <Card className="apple-card">
                  <CardContent className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucun lead trouvé</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== 'ALL' ? 'Aucun résultat pour ces critères.' : 'Créez votre premier lead pour commencer.'}
                    </p>
                    <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Créer un lead
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination - Apple Style */}
      {totalLeads > limit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center items-center gap-2 flex-wrap"
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1} 
            className="h-9 px-4 rounded-full"
          >
            Précédent
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(totalLeads / limit) }, (_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(totalLeads / limit) || Math.abs(p - page) <= 1)
              .map((p, index, array) => (
                <React.Fragment key={p}>
                  {index > 0 && array[index - 1] !== p - 1 && (
                    <span className="px-2 text-sm text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className={`h-9 w-9 p-0 rounded-full ${page === p ? 'shadow-lg shadow-primary/20' : ''}`}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.min(Math.ceil(totalLeads / limit), p + 1))} 
            disabled={page >= Math.ceil(totalLeads / limit)} 
            className="h-9 px-4 rounded-full"
          >
            Suivant
          </Button>
        </motion.div>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Créer un nouveau lead</DialogTitle>
          </DialogHeader>
          <LeadForm 
            users={users} 
            onSuccess={() => { 
              setIsFormOpen(false); 
              refetch(); 
              toast.success('Lead créé avec succès!');
            }} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Lead Details Modal */}
      {selectedLead && <LeadDetailsModal lead={selectedLead} />}
    </div>
  );
}