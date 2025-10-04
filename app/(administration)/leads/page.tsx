// app/(administration)/leads/page.tsx
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
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';
import { useRouter } from 'next/navigation';

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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
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
      <Badge variant="outline" className={`font-semibold ${score >= 80 ? 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200' : score >= 60 ? 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200' : score >= 40 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200' : 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'}`}>
        {score}%
      </Badge>
    );
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      QUALIFIED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      QUOTE_SENT: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      QUOTE_ACCEPTED: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
      COMPLETED: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      CANCELLED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
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
        <DialogHeader><DialogTitle>Détails du Lead</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Informations personnelles</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Nom:</strong> {lead.firstName} {lead.lastName}</p>
                <p><strong>Téléphone:</strong> {lead.phone}</p>
                <p><strong>Email:</strong> {lead.email || 'Non renseigné'}</p>
                <p><strong>Adresse:</strong> {lead.address || 'Non renseignée'}</p>
              </div>
            </div>
            {lead.company && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Informations entreprise</h3>
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
              <h3 className="font-semibold text-lg mb-2">Détails du projet</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Type:</strong> {translate(lead.leadType)}</p>
                <p><strong>Statut:</strong> {translate(lead.status)}</p>
                <p><strong>Score:</strong> {lead.score || 0}%</p>
                <p><strong>Surface:</strong> {lead.estimatedSurface || 'N/A'} m²</p>
                <p><strong>Budget:</strong> {lead.budgetRange || 'Non renseigné'}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Source et timing</h3>
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
            <h3 className="font-semibold text-lg mb-2">Message original</h3>
            <p className="bg-muted p-3 rounded-lg text-sm">{lead.originalMessage}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (error) {
    return (
      <div className="main-content p-4 md:p-6">
        <div className="text-center py-10">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground mb-4">Erreur lors du chargement des leads.</p>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content p-3 md:p-6 space-y-4 md:space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground hidden md:block">Gérez vos prospects et opportunités</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm" className="md:hidden">
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="hidden md:flex">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Lead
          </Button>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 md:h-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[110px] md:w-[140px] h-9 md:h-10">
                    <Filter className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden md:inline"><SelectValue /></span>
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
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1 border rounded-lg p-0.5">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-7 px-2"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-7 px-2"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={exportToCSV} className="h-7">
                  <Download className="w-3 h-3 mr-1" />
                  <span className="hidden md:inline">Export</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-xl md:text-2xl font-bold">{totalLeads}</p>
              </div>
              <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Nouveaux</p>
                <p className="text-xl md:text-2xl font-bold">{leads.filter(l => l.status === 'NEW').length}</p>
              </div>
              <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Qualifiés</p>
                <p className="text-xl md:text-2xl font-bold">{leads.filter(l => l.status === 'QUALIFIED').length}</p>
              </div>
              <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Taux</p>
                <p className="text-xl md:text-2xl font-bold">
                  {totalLeads > 0 ? Math.round((leads.filter(l => l.status === 'COMPLETED').length / totalLeads) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <CardGridSkeleton title="Chargement..." description="Chargement des données" />
      ) : viewMode === 'table' ? (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs md:text-sm">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs md:text-sm">Société</TableHead>
                  <TableHead className="text-xs md:text-sm">Statut</TableHead>
                  <TableHead className="text-xs md:text-sm">Score</TableHead>
                  <TableHead className="hidden md:table-cell text-xs md:text-sm">Date</TableHead>
                  <TableHead className="text-xs md:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50">
                    <TableCell className="py-2 md:py-3">
                      <div className="cursor-pointer" onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}>
                        <p className="font-medium text-xs md:text-sm hover:text-primary">{lead.firstName} {lead.lastName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{lead.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2 md:py-3">
                      {lead.company ? (
                        <div>
                          <p className="font-medium text-xs md:text-sm truncate max-w-[150px]">{lead.company}</p>
                          <p className="text-xs text-muted-foreground">{lead.iceNumber}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Particulier</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 md:py-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}>
                          <SelectTrigger className={`${getStatusColor(lead.status)} text-[10px] md:text-xs h-7 w-auto border-0`}>
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
                    <TableCell className="py-2 md:py-3">
                      {getScoreBadge(lead.score || 0)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2 md:py-3">
                      <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                    </TableCell>
                    <TableCell className="py-2 md:py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}`)} className="text-xs">
                            <Eye className="w-3 h-3 mr-2" />Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="text-xs">
                            <Link href={`/leads/${lead.id}/edit`}><Edit className="w-3 h-3 mr-2" />Modifier</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-red-600 text-xs">
                            <Trash2 className="w-3 h-3 mr-2" />Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredLeads.length === 0 && (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-sm md:text-lg font-medium mb-2">Aucun lead trouvé</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== 'ALL' ? 'Aucun résultat.' : 'Créez votre premier lead.'}
                </p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow border-none cursor-pointer" onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}>
              <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm md:text-base truncate hover:text-primary">{lead.firstName} {lead.lastName}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}>
                      <SelectTrigger className={`${getStatusColor(lead.status)} text-[10px] px-1.5 py-0.5 h-6 w-auto border-0 shrink-0`}>
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
              <CardContent className="space-y-2 md:space-y-3 p-3 md:p-4 pt-0">
                {lead.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm truncate">{lead.company}</span>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm truncate">{lead.address}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm truncate">{lead.email}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-muted-foreground">Score</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 md:w-16 bg-muted rounded-full h-1.5">
                      <div 
                        className={`${getScoreColor(lead.score || 0)} h-1.5 rounded-full transition-all`}
                        style={{ width: `${lead.score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{lead.score || 0}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] md:text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}`); }} className="h-7 w-7 p-0">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" asChild className="h-7 w-7 p-0">
                      <Link href={`/leads/${lead.id}/edit`} onClick={(e) => e.stopPropagation()}><Edit className="w-3 h-3" /></Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredLeads.length === 0 && (
            <div className="col-span-full text-center py-10">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-sm md:text-lg font-medium mb-2">Aucun lead trouvé</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'ALL' ? 'Aucun résultat.' : 'Créez votre premier lead.'}
              </p>
            </div>
          )}
        </div>
      )}

      {totalLeads > limit && (
        <div className="flex justify-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">
            Préc
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(totalLeads / limit) }, (_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(totalLeads / limit) || Math.abs(p - page) <= 1)
              .map((p, index, array) => (
                <React.Fragment key={p}>
                  {index > 0 && array[index - 1] !== p - 1 && (
                    <span className="px-1 text-xs text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(totalLeads / limit), p + 1))} disabled={page >= Math.ceil(totalLeads / limit)} className="h-8">
            Suiv
          </Button>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Créer un nouveau lead</DialogTitle></DialogHeader>
          <LeadForm users={users} onSuccess={() => { setIsFormOpen(false); refetch(); }} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {selectedLead && <LeadDetailsModal lead={selectedLead} />}
    </div>
  );
}