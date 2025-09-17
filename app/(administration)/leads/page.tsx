'use client';

'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Search, Eye, Edit, Trash2, Download, Phone, Mail, Building2, MapPin, MoreVertical, Users, Calendar, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { formatDate, translate } from '@/lib/utils';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';


type LeadWithRelations = Lead & { assignedTo?: User | null };

interface LeadsResponse {
  leads: LeadWithRelations[];
  total: number;
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

  // Fetch users for the LeadForm
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

  // Real-time updates with Pusher
  usePusherChannel('leads-channel', {
    'new-lead': (newLead: any) => {
      console.log('Leads page: New lead received via Pusher:', newLead);
      
      toast.success(`Nouveau lead reçu de ${newLead.firstName} ${newLead.lastName}!`);
      
      // Update the query cache to show the new lead
      queryClient.setQueryData(['leads', page, limit, statusFilter, searchTerm], (oldData: LeadsResponse | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          leads: [newLead, ...oldData.leads],
          total: oldData.total + 1,
          totalPages: Math.ceil((oldData.total + 1) / limit)
        };
      });

      // If we're on a different page or filter, also invalidate to refresh counts
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  // Fetch leads with React Query
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Optimistic mutation for status updates
  const statusUpdateMutation = useOptimisticMutation<LeadWithRelations, { id: string; status: LeadStatus }>({
    queryKey: ['leads', page, limit, statusFilter, searchTerm],
    mutationFn: async ({ id, status }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
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
    successMessage: 'Statut mis à jour avec succès',
    errorMessage: 'Erreur lors de la mise à jour du statut'
  });

  // Optimistic mutation for lead assignment
  

  // Optimistic mutation for lead deletion
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
    successMessage: 'Lead supprimé avec succès',
    errorMessage: 'Erreur lors de la suppression'
  });

  const leads = leadsData?.leads || [];
  const totalLeads = leadsData?.total || 0;

  // Filter leads locally for search
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

  const handleStatusUpdate = (leadId: string, newStatus: LeadStatus) => {
    statusUpdateMutation.mutate({ id: leadId, status: newStatus });
  };

  

  const handleDelete = (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lead?')) return;
    deleteMutation.mutate(id);
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Prénom', 'Nom', 'Téléphone', 'Email', 'Société', 'ICE',
      'Type', 'Statut', 'Score', 'Surface', 'Budget', 'Canal',
      'Assigné à', 'Date création'
    ];
    
    const rows = filteredLeads.map(lead => [
      lead.id,
      lead.firstName,
      lead.lastName,
      lead.phone,
      lead.email || '',
      lead.company || '',
      lead.iceNumber || '',
      lead.leadType,
      lead.status,
      lead.score || '',
      lead.estimatedSurface || '',
      lead.budgetRange || '',
      lead.channel,
      lead.assignedTo?.name || '',
      formatDate(lead.createdAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'QUALIFIED': return 'bg-green-100 text-green-800';
      case 'QUOTE_SENT': return 'bg-yellow-100 text-yellow-800';
      case 'QUOTE_ACCEPTED': return 'bg-emerald-100 text-emerald-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: LeadStatus) => {
    switch (status) {
      case 'NEW': return <Star className="w-4 h-4" />;
      case 'QUALIFIED': return <CheckCircle className="w-4 h-4" />;
      case 'QUOTE_SENT': return <Mail className="w-4 h-4" />;
      case 'QUOTE_ACCEPTED': return <CheckCircle className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const LeadDetailsModal = ({ lead }: { lead: Lead }) => (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du Lead</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Informations personnelles</h3>
              <div className="space-y-2">
                <p><strong>Nom:</strong> {lead.firstName} {lead.lastName}</p>
                <p><strong>Téléphone:</strong> {lead.phone}</p>
                <p><strong>Email:</strong> {lead.email || 'Non renseigné'}</p>
                <p><strong>Adresse:</strong> {lead.address || 'Non renseignée'}</p>
              </div>
            </div>
            
            {lead.company && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Informations entreprise</h3>
                <div className="space-y-2">
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
              <div className="space-y-2">
                <p><strong>Type:</strong> {translate(lead.leadType)}</p>
                <p><strong>Statut:</strong> {translate(lead.status)}</p>
                <p><strong>Score:</strong> {lead.score || 0}%</p>
                <p><strong>Surface estimée:</strong> {lead.estimatedSurface || 'Non renseignée'} m²</p>
                <p><strong>Budget:</strong> {lead.budgetRange || 'Non renseigné'}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Source et timing</h3>
              <div className="space-y-2">
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
            <p className="bg-gray-50 p-3 rounded-lg">{lead.originalMessage}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (error) {
    return (
      <div className="main-content p-6">
        <div className="text-center py-10">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">Une erreur est survenue lors du chargement des leads.</p>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Gérez vos prospects et opportunités commerciales</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Lead
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom, téléphone, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="NEW">Nouveaux</SelectItem>
                <SelectItem value="QUALIFIED">Qualifiés</SelectItem>
                <SelectItem value="QUOTE_SENT">Devis envoyés</SelectItem>
                <SelectItem value="QUOTE_ACCEPTED">Devis acceptés</SelectItem>
                <SelectItem value="COMPLETED">Terminés</SelectItem>
                <SelectItem value="CANCELLED">Annulés</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cartes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouveaux</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'NEW').length}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Qualifiés</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'QUALIFIED').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion</p>
                <p className="text-2xl font-bold">
                  {totalLeads > 0 ? Math.round((leads.filter(l => l.status === 'COMPLETED').length / totalLeads) * 100) : 0}%
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <CardGridSkeleton title="Chargement des leads..." description="Veuillez patienter pendant le chargement des données." />
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                          {lead.email && (
                            <>
                              <Mail className="w-3 h-3 ml-2" />
                              {lead.email}
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {lead.company ? (
                        <div>
                          <p className="font-medium">{lead.company}</p>
                          <p className="text-sm text-gray-600">{lead.iceNumber}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Particulier</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {translate(lead.leadType)}
                        </Badge>
                        {lead.urgencyLevel && lead.urgencyLevel !== 'NORMAL' && (
                          <Badge 
                            variant={lead.urgencyLevel === 'IMMEDIATE' || lead.urgencyLevel === 'HIGH_URGENT' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {translate(lead.urgencyLevel)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">{translate(lead.channel)}</Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Select 
                        value={lead.status} 
                        onValueChange={(value) => handleStatusUpdate(lead.id, value as LeadStatus)}
                      >
                        <SelectTrigger className="w-40">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(lead.status)}
                            <Badge variant="outline" className={getStatusColor(lead.status)}>
                              {translate(lead.status)}
                            </Badge>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">Nouveau</SelectItem>
                          <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                          <SelectItem value="QUOTE_SENT">Devis envoyé</SelectItem>
                          <SelectItem value="QUOTE_ACCEPTED">Devis accepté</SelectItem>
                          <SelectItem value="COMPLETED">Terminé</SelectItem>
                          <SelectItem value="CANCELLED">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${lead.score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{lead.score || 0}%</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {lead.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {lead.assignedTo.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm">{lead.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Non assigné</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-gray-600">{formatDate(lead.createdAt)}</span>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedLead(lead);
                            setIsDetailsOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/leads/${lead.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(lead.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
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
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lead trouvé</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Aucun lead ne correspond à vos critères de recherche.'
                    : 'Commencez par créer votre premier lead.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Cards view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{lead.firstName} {lead.lastName}</CardTitle>
                    <p className="text-sm text-gray-600">{lead.phone}</p>
                  </div>
                  <Badge className={getStatusColor(lead.status)}>
                    {translate(lead.status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {lead.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{lead.company}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{lead.address || 'Adresse non renseignée'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Score de qualification</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${lead.score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{lead.score || 0}%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500">{formatDate(lead.createdAt)}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/leads/${lead.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredLeads.length === 0 && (
            <div className="col-span-full text-center py-10">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lead trouvé</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Aucun lead ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier lead.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalLeads > limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.ceil(totalLeads / limit) }, (_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(totalLeads / limit) || Math.abs(p - page) <= 2)
              .map((p, index, array) => (
                <>
                  {index > 0 && array[index - 1] !== p - 1 && (
                    <span key={`ellipsis-${p}`} className="px-2">...</span>
                  )}
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </>
              ))}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(Math.ceil(totalLeads / limit), p + 1))}
            disabled={page >= Math.ceil(totalLeads / limit)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau lead</DialogTitle>
          </DialogHeader>
          <LeadForm 
            users={users}
            onSuccess={() => {
              setIsFormOpen(false);
              refetch();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {selectedLead && <LeadDetailsModal lead={selectedLead} />}
    </div>
  );
}