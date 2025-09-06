// app/(administration)/leads/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadStatus, User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeadForm } from '@/components/leads/LeadForm';
import { Plus, Search, Filter, Eye, Edit, Trash2, Download, Phone, Mail, Building2, MapPin } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';

type LeadWithRelations = Lead & { assignedTo?: User | null };

export default function LeadsPage() {
 const [leads, setLeads] = useState<LeadWithRelations[]>([]);
 const [filteredLeads, setFilteredLeads] = useState<LeadWithRelations[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [isDetailsOpen, setIsDetailsOpen] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [statusFilter, setStatusFilter] = useState<string>('ALL');

 useEffect(() => {
   fetchLeads();
 }, []);

 useEffect(() => {
   filterLeads();
 }, [searchTerm, statusFilter, leads]);

 const fetchLeads = async () => {
   setIsLoading(true);
   try {
     const response = await fetch('/api/leads');
     if (!response.ok) throw new Error('Failed to fetch leads');
     const data = await response.json();
     setLeads(data);
     setFilteredLeads(data);
   } catch (error) {
     toast.error('Erreur lors du chargement des leads');
     console.error('Fetch error:', error);
   } finally {
     setIsLoading(false);
   }
 };

 const filterLeads = () => {
   let filtered = leads;

   // Filter by search term
   if (searchTerm) {
     filtered = filtered.filter(lead =>
       lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       lead.phone.includes(searchTerm) ||
       lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
     );
   }

   // Filter by status
   if (statusFilter !== 'ALL') {
     filtered = filtered.filter(lead => lead.status === statusFilter);
   }

   setFilteredLeads(filtered);
 };

 const handleDelete = async (id: string) => {
   if (!confirm('Êtes-vous sûr de vouloir supprimer ce lead?')) return;

   try {
     const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
     if (!response.ok) throw new Error('Failed to delete lead');
     
     toast.success('Lead supprimé avec succès');
     fetchLeads();
   } catch (error) {
     toast.error('Erreur lors de la suppression');
     console.error('Delete error:', error);
   }
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

 const LeadDetailsModal = ({ lead }: { lead: Lead }) => (
   <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
     <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
       <DialogHeader>
         <DialogTitle>Détails du Lead</DialogTitle>
       </DialogHeader>
       
       <Tabs defaultValue="general" className="w-full">
         <TabsList className="grid w-full grid-cols-5">
           <TabsTrigger value="general">Général</TabsTrigger>
           <TabsTrigger value="professional">Pro</TabsTrigger>
           <TabsTrigger value="request">Demande</TabsTrigger>
           <TabsTrigger value="origin">Origine</TabsTrigger>
           <TabsTrigger value="history">Historique</TabsTrigger>
         </TabsList>

         <TabsContent value="general" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Informations Personnelles</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-sm text-muted-foreground">Nom complet</p>
                 <p className="font-medium">{lead.firstName} {lead.lastName}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Téléphone</p>
                 <p className="font-medium flex items-center gap-2">
                   <Phone className="h-4 w-4" />
                   {lead.phone}
                 </p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Email</p>
                 <p className="font-medium flex items-center gap-2">
                   <Mail className="h-4 w-4" />
                   {lead.email || 'Non renseigné'}
                 </p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Adresse</p>
                 <p className="font-medium flex items-center gap-2">
                   <MapPin className="h-4 w-4" />
                   {lead.address || 'Non renseignée'}
                 </p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">GPS</p>
                 <p className="font-medium">{lead.gpsLocation || 'Non renseigné'}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Score</p>
                 <div className="flex items-center gap-2">
                   <div className="w-full bg-gray-200 rounded-full h-2">
                     <div 
                       className="bg-green-600 h-2 rounded-full"
                       style={{ width: `${lead.score || 0}%` }}
                     />
                   </div>
                   <span className="text-sm font-medium">{lead.score || 0}%</span>
                 </div>
               </div>
             </CardContent>
           </Card>
         </TabsContent>

         <TabsContent value="professional" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Informations Professionnelles</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-sm text-muted-foreground">Type de Lead</p>
                 <Badge>{lead.leadType}</Badge>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Société</p>
                 <p className="font-medium flex items-center gap-2">
                   <Building2 className="h-4 w-4" />
                   {lead.company || 'Non renseignée'}
                 </p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">N° ICE</p>
                 <p className="font-medium">{lead.iceNumber || 'Non renseigné'}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Secteur</p>
                 <p className="font-medium">{lead.activitySector || 'Non renseigné'}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Poste</p>
                 <p className="font-medium">{lead.contactPosition || 'Non renseigné'}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Département</p>
                 <p className="font-medium">{lead.department || 'Non renseigné'}</p>
               </div>
             </CardContent>
           </Card>
         </TabsContent>

         <TabsContent value="request" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Détails de la Demande</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-sm text-muted-foreground">Type de Propriété</p>
                   <Badge variant="outline">{lead.propertyType || 'Non défini'}</Badge>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Surface</p>
                   <p className="font-medium">{lead.estimatedSurface ? `${lead.estimatedSurface} m²` : 'Non renseignée'}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Accessibilité</p>
                   <Badge variant={lead.accessibility === 'DIFFICULT' ? 'destructive' : 'default'}>
                     {lead.accessibility || 'EASY'}
                   </Badge>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Urgence</p>
                   <Badge variant={lead.urgencyLevel === 'URGENT' ? 'destructive' : 'secondary'}>
                     {lead.urgencyLevel || 'Non définie'}
                   </Badge>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Budget</p>
                   <p className="font-medium">{lead.budgetRange || 'Non défini'}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Fréquence</p>
                   <Badge>{lead.frequency || 'PONCTUEL'}</Badge>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Type de Contrat</p>
                   <Badge>{lead.contractType || 'INTERVENTION_UNIQUE'}</Badge>
                 </div>
               </div>

               {lead.materials && Object.keys(lead.materials).length > 0 && (
                 <div>
                   <p className="text-sm text-muted-foreground mb-2">Matériaux</p>
                   <div className="flex flex-wrap gap-2">
                     {Object.entries(lead.materials as any).map(([key, value]) => {
                       if (value === true) {
                         return <Badge key={key} variant="outline">{key}</Badge>;
                       } else if (key === 'other' && value) {
                         return <Badge key={key} variant="outline">{value as string}</Badge>;
                       }
                       return null;
                     })}
                   </div>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-2">
                   <input type="checkbox" checked={lead.needsProducts || false} disabled />
                   <label>Besoin de produits</label>
                 </div>
                 <div className="flex items-center gap-2">
                   <input type="checkbox" checked={lead.needsEquipment || false} disabled />
                   <label>Besoin d'équipement</label>
                 </div>
               </div>

               {(lead.needsProducts || lead.needsEquipment) && (
                 <div>
                   <p className="text-sm text-muted-foreground">Fourni par</p>
                   <Badge>{lead.providedBy || 'ENARVA'}</Badge>
                 </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>

         <TabsContent value="origin" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Origine et Acquisition</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-sm text-muted-foreground">Canal</p>
                 <Badge>{lead.channel}</Badge>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Source</p>
                 <p className="font-medium">{lead.source || 'Non renseignée'}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Parrain</p>
                 <p className="font-medium">
                   {lead.hasReferrer ? (lead.referrerContact || 'Oui') : 'Non'}
                 </p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Rôle Enarva</p>
                 <Badge>{lead.enarvaRole || 'PRESTATAIRE_PRINCIPAL'}</Badge>
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Message Original</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="whitespace-pre-wrap">{lead.originalMessage}</p>
             </CardContent>
           </Card>
         </TabsContent>

         <TabsContent value="history" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Historique</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
               <div className="flex justify-between items-center py-2 border-b">
                 <div>
                   <p className="font-medium">Lead créé</p>
                   <p className="text-sm text-muted-foreground">
                     {formatDate(lead.createdAt)}
                   </p>
                 </div>
                 <Badge>{lead.status}</Badge>
               </div>
               {lead.assignedToId !== null && (
                 <div className="flex justify-between items-center py-2">
                   <div>
                     <p className="font-medium">Assigné à</p>
                     <p className="text-sm">{lead.assignedToId}</p>
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>
       </Tabs>

       <div className="flex justify-end gap-2 mt-4">
         <Button
           variant="outline"
           onClick={() => {
             setSelectedLead(lead);
             setIsDetailsOpen(false);
             setIsFormOpen(true);
           }}
         >
           <Edit className="h-4 w-4 mr-2" />
           Modifier
         </Button>
         <Button onClick={() => setIsDetailsOpen(false)}>
           Fermer
         </Button>
       </div>
     </DialogContent>
   </Dialog>
 );

 return (
   <div className="container mx-auto py-6 space-y-6">
     {/* Header */}
     <div className="flex justify-between items-center">
       <div>
         <h1 className="text-3xl font-bold">Gestion des Leads</h1>
         <p className="text-muted-foreground">
           {filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''} trouvé{filteredLeads.length > 1 ? 's' : ''}
         </p>
       </div>
       <div className="flex gap-2">
         <Button onClick={exportToCSV} variant="outline">
           <Download className="h-4 w-4 mr-2" />
           Exporter CSV
         </Button>
         <Button onClick={() => {
           setSelectedLead(null);
           setIsFormOpen(true);
         }}>
           <Plus className="h-4 w-4 mr-2" />
           Nouveau Lead
         </Button>
       </div>
     </div>

     {/* Filters */}
     <Card>
       <CardContent className="pt-6">
         <div className="flex gap-4">
           <div className="flex-1">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
               <Input
                 placeholder="Rechercher par nom, téléphone, email, société..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
             </div>
           </div>
           <select
             className="px-4 py-2 border rounded-md"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
           >
             <option value="ALL">Tous les statuts</option>
             <option value="NEW">Nouveau</option>
            <option value="TO_QUALIFY">À qualifier</option>
            <option value="WAITING_INFO">En attente d'informations</option>
            <option value="QUALIFIED">Qualifié</option>
            <option value="VISIT_PLANNED">Visite planifiée</option>
            <option value="ON_VISIT">En visite</option>
            <option value="VISIT_DONE">Visite terminée</option>
            <option value="QUOTE_SENT">Devis envoyé</option>
            <option value="QUOTE_ACCEPTED">Devis accepté</option>
            <option value="QUOTE_REFUSED">Devis refusé</option>
            <option value="MISSION_SCHEDULED">Mission planifiée</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminé</option>
            <option value="INTERVENTION_PLANNED">Intervention planifiée</option>
            <option value="INTERVENTION_IN_PROGRESS">Intervention en cours</option>
            <option value="INTERVENTION_DONE">Intervention terminée</option>
            <option value="QUALITY_CONTROL">Contrôle qualité</option>
            <option value="CLIENT_TO_CONFIRM_END">Client à confirmer la fin</option>
            <option value="CLIENT_CONFIRMED">Client confirmé</option>
            <option value="DELIVERY_PLANNED">Livraison planifiée</option>
            <option value="DELIVERY_DONE">Livraison terminée</option>
            <option value="SIGNED_DELIVERY_NOTE">Bon de livraison signé</option>
            <option value="PENDING_PAYMENT">Paiement en attente</option>
            <option value="PAID_OFFICIAL">Payé officiellement</option>
            <option value="PAID_CASH">Payé en espèces</option>
            <option value="REFUNDED">Remboursé</option>
            <option value="PENDING_REFUND">Remboursement en attente</option>
            <option value="FOLLOW_UP_SENT">Suivi envoyé</option>
            <option value="UPSELL_IN_PROGRESS">Upsell en cours</option>
            <option value="UPSELL_CONVERTED">Upsell converti</option>
            <option value="REWORK_PLANNED">Retravail planifié</option>
            <option value="REWORK_DONE">Retravail terminé</option>
            <option value="UNDER_WARRANTY">Sous garantie</option>
            <option value="AFTER_SALES_SERVICE">Service après-vente</option>
            <option value="CLIENT_ISSUE">Problème client</option>
            <option value="IN_DISPUTE">En litige</option>
            <option value="CLIENT_PAUSED">Client en pause</option>
            <option value="LEAD_LOST">Lead perdu</option>
            <option value="CANCELLED">Annulé</option>
            <option value="CANCELED_BY_CLIENT">Annulé par le client</option>
            <option value="CANCELED_BY_ENARVA">Annulé par Enarva</option>
            <option value="INTERNAL_REVIEW">Revue interne</option>
            <option value="AWAITING_PARTS">En attente de pièces</option>
            <option value="CONTRACT_SIGNED">Contrat signé</option>
            <option value="UNDER_CONTRACT">Sous contrat</option>
            <option value="SUBCONTRACTED">Sous-traité</option>
            <option value="OUTSOURCED">Externalisé</option>
            <option value="WAITING_THIRD_PARTY">En attente d'un tiers</option>
            <option value="PRODUCT_ONLY">Produit uniquement</option>
            <option value="PRODUCT_SUPPLIER">Fournisseur de produit</option>
            <option value="DELIVERY_ONLY">Livraison uniquement</option>
            <option value="AFFILIATE_LEAD">Lead affilié</option>
            <option value="SUBCONTRACTOR_LEAD">Lead sous-traitant</option>
           </select>
         </div>
       </CardContent>
     </Card>

     {/* Leads Table */}
     <Card>
       <CardContent className="p-0">
         {isLoading ? (
           <div className="p-8 text-center">Chargement...</div>
         ) : filteredLeads.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">
             Aucun lead trouvé
           </div>
         ) : (
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Lead</TableHead>
                   <TableHead>Contact</TableHead>
                   <TableHead>Société</TableHead>
                   <TableHead>Détails Demande</TableHead>
                   <TableHead>Canal</TableHead>
                   <TableHead>Statut</TableHead>
                   <TableHead>Score</TableHead>
                   <TableHead>Assigné</TableHead>
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
                         <Badge variant="outline" className="text-xs">
                           {lead.leadType}
                         </Badge>
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <p className="text-sm">{lead.phone}</p>
                         {lead.email && (
                           <p className="text-xs text-muted-foreground">{lead.email}</p>
                         )}
                       </div>
                     </TableCell>
                     <TableCell>
                       {lead.company ? (
                         <div>
                           <p className="text-sm font-medium">{lead.company}</p>
                           {lead.activitySector && (
                             <p className="text-xs text-muted-foreground">{lead.activitySector}</p>
                           )}
                         </div>
                       ) : (
                         <span className="text-muted-foreground">-</span>
                       )}
                     </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         {lead.propertyType && (
                           <Badge variant="outline" className="text-xs">
                             {lead.propertyType}
                           </Badge>
                         )}
                         {lead.estimatedSurface && (
                           <p className="text-xs">{lead.estimatedSurface} m²</p>
                         )}
                         {lead.urgencyLevel && (
                           <Badge 
                             variant={lead.urgencyLevel === 'URGENT' ? 'destructive' : 'secondary'}
                             className="text-xs"
                           >
                             {lead.urgencyLevel}
                           </Badge>
                         )}
                       </div>
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline">{lead.channel}</Badge>
                     </TableCell>
                     <TableCell>
                       <Badge 
                         variant={
                           lead.status === LeadStatus.COMPLETED ? 'default' :
                           lead.status === LeadStatus.CANCELLED ? 'destructive' :
                           'secondary'
                         }
                       >
                         {lead.status}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <div className="w-12 bg-gray-200 rounded-full h-2">
                           <div 
                             className="bg-green-600 h-2 rounded-full"
                             style={{ width: `${lead.score || 0}%` }}
                           />
                         </div>
                         <span className="text-xs">{lead.score || 0}%</span>
                       </div>
                     </TableCell>
                     <TableCell>
                       {lead.assignedTo ? (
                         <p className="text-sm">{lead.assignedTo.name}</p>
                       ) : (
                         <span className="text-muted-foreground">Non assigné</span>
                       )}
                     </TableCell>
                     <TableCell>
                       <p className="text-sm">{formatDate(lead.createdAt)}</p>
                     </TableCell>
                     <TableCell>
                       <div className="flex gap-1">
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => {
                             setSelectedLead(lead);
                             setIsDetailsOpen(true);
                           }}
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => {
                             setSelectedLead(lead);
                             setIsFormOpen(true);
                           }}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => handleDelete(lead.id)}
                         >
                           <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         )}
       </CardContent>
     </Card>

     {/* Form Dialog */}
     <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
       <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>
             {selectedLead ? 'Modifier le Lead' : 'Nouveau Lead'}
           </DialogTitle>
         </DialogHeader>
         <LeadForm
           lead={selectedLead || undefined}
           onSuccess={() => {
             setIsFormOpen(false);
             fetchLeads();
           }}
           onCancel={() => setIsFormOpen(false)}
         />
       </DialogContent>
     </Dialog>

     {/* Details Modal */}
     {selectedLead && isDetailsOpen && <LeadDetailsModal lead={selectedLead} />}
   </div>
 );
}