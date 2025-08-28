// app/(administration)/leads/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Phone, Mail, MessageSquare, Plus, Edit, Trash2, Building, Ruler,
  AlertTriangle, Clock, Star, Users, Briefcase, Tag, MapPin, Eye, CheckCircle
} from 'lucide-react'
import { formatDate, translate, translations } from '@/lib/utils'
import { Lead, LeadStatus, LeadCanal, UrgencyLevel, User, PropertyType, LeadType } from '@prisma/client'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import io from 'socket.io-client'
import { toast } from 'sonner'

// Type étendu pour inclure l'utilisateur assigné, correspondant à la requête API
type LeadWithAssignee = Lead & { assignedTo: User | null };

// Logique des couleurs de statut
const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, string> = {
        NEW: 'bg-blue-100 text-blue-800', QUALIFIED: 'bg-cyan-100 text-cyan-800',
        QUOTE_SENT: 'bg-purple-100 text-purple-800', QUOTE_ACCEPTED: 'bg-indigo-100 text-indigo-800',
        MISSION_SCHEDULED: 'bg-teal-100 text-teal-800', IN_PROGRESS: 'bg-orange-100 text-orange-800',
        COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

const getUrgencyIcon = (urgency: UrgencyLevel | null) => {
  switch (urgency) {
    case 'IMMEDIATE': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    case 'HIGH_URGENT': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    default: return <Clock className="w-4 h-4 text-blue-600" />;
  }
}

const getScoreColor = (score: number | null) => {
  if (score === null) return 'text-gray-400';
  if (score >= 8) return 'text-green-600'
  if (score >= 5) return 'text-yellow-600'
  return 'text-red-600'
}


export default function LeadsPage() {
  const router = useRouter();
  const [allLeads, setAllLeads] = useState<LeadWithAssignee[]>([])
  const [filteredLeads, setFilteredLeads] = useState<LeadWithAssignee[]>([])
  const [selectedLead, setSelectedLead] = useState<LeadWithAssignee | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch('/api/leads')
      if (!response.ok) throw new Error('Impossible de récupérer les leads.')
      const data = await response.json()
      setAllLeads(data)
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    const initialFetch = async () => {
        setIsLoading(true);
        await fetchLeads();
        setIsLoading(false);
    }
    initialFetch();

    const socket = io();
    socket.on('new_lead', (newLead: LeadWithAssignee) => {
      toast.info(`Nouveau lead reçu : ${newLead.firstName}`);
      setAllLeads(prev => [newLead, ...prev]);
    });

    return () => { socket.disconnect() };
  }, [fetchLeads])

  useEffect(() => {
    let leads = [...allLeads]
    if (statusFilter !== 'all') leads = leads.filter(lead => lead.status === statusFilter)
    if (channelFilter !== 'all') leads = leads.filter(lead => lead.channel === channelFilter)
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase()
      leads = leads.filter(lead =>
        lead.firstName.toLowerCase().includes(lowercasedQuery) ||
        lead.lastName.toLowerCase().includes(lowercasedQuery) ||
        (lead.company && lead.company.toLowerCase().includes(lowercasedQuery)) ||
        (lead.email && lead.email.toLowerCase().includes(lowercasedQuery))
      )
    }
    setFilteredLeads(leads)
  }, [searchQuery, statusFilter, channelFilter, allLeads])

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteMany = async () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} lead(s) ?`)) {
        try {
            const response = await fetch('/api/leads/delete-many', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (!response.ok) throw new Error("La suppression a échoué.");
            setAllLeads(prev => prev.filter(lead => !selectedIds.includes(lead.id)));
            setSelectedIds([]);
            toast.success(`${selectedIds.length} lead(s) ont été supprimés.`);
        } catch (err) {
            toast.error("Une erreur est survenue lors de la suppression.");
        }
    }
  };
  
  const handleDeleteOne = async (id: string) => {
    if(confirm('Êtes-vous sûr de vouloir supprimer ce lead ?')) {
        try {
            const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("La suppression a échoué.");
            setAllLeads(prev => prev.filter(lead => lead.id !== id));
            setSelectedLead(null);
            toast.success("Lead supprimé avec succès.");
        } catch (err) {
            toast.error("Une erreur est survenue lors de la suppression.");
        }
    }
  }

  if (isLoading) return <CardGridSkeleton title="Gestion des Leads" description="Chargement des prospects..." />;
  if (error) return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;

  return (
    <div className="main-content space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Leads</h1>
                <p className="text-muted-foreground mt-1">{allLeads.length} leads • {allLeads.filter(l => l.status === 'NEW').length} nouveaux</p>
            </div>
            {selectedIds.length > 0 ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedIds.length} sélectionné(s)</span>
                    <Button variant="destructive" size="sm" onClick={handleDeleteMany}><Trash2 className="w-4 h-4 mr-2" /> Supprimer</Button>
                </div>
            ) : (
                <Link href="/leads/new"><Button className="gap-2 bg-enarva-gradient rounded-lg"><Plus/>Nouveau Lead</Button></Link>
            )}
        </div>

        <Card className="thread-card">
            <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-full sm:min-w-64"><Input placeholder="Rechercher par nom, entreprise..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-background"/></div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
                        <SelectContent>{Object.entries(translations.LeadStatus).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={channelFilter} onValueChange={setChannelFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Canal" /></SelectTrigger>
                        <SelectContent>{Object.entries(translations.LeadCanal).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        {/* --- NOUVEAU DESIGN DE LA GRILLE DE LEADS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
            <Card key={lead.id} className="thread-card relative transition-all hover:shadow-lg flex flex-col">
                <div className="absolute top-4 left-4 z-10"><Checkbox id={`select-${lead.id}`} checked={selectedIds.includes(lead.id)} onCheckedChange={() => handleSelect(lead.id)} /></div>
                <div onClick={() => setSelectedLead(lead)} className="cursor-pointer p-6 flex flex-col flex-grow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 pl-8">
                            <Avatar className="w-12 h-12"><AvatarFallback>{lead.firstName[0]}{lead.lastName[0]}</AvatarFallback></Avatar>
                            <div>
                                <h3 className="font-semibold text-foreground">{lead.firstName} {lead.lastName}</h3>
                                <p className="text-sm text-muted-foreground">{lead.company || translate('LeadType', lead.leadType)}</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-bold ${getScoreColor(lead.score)}`}><Star className="w-4 h-4 fill-current" />{lead.score || 0}</div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10 flex-grow">{lead.originalMessage}</p>
                    <div className="space-y-3 text-xs text-muted-foreground mt-auto">
                        <div className="flex flex-wrap gap-2">
                            <Badge className={`text-xs ${getStatusColor(lead.status)}`}>{translate('LeadStatus', lead.status)}</Badge>
                            <Badge variant="outline">{translate('LeadCanal', lead.channel)}</Badge>
                            {lead.urgencyLevel && <Badge variant="outline" className="flex items-center gap-1">{getUrgencyIcon(lead.urgencyLevel)} {translate('UrgencyLevel', lead.urgencyLevel)}</Badge>}
                        </div>
                        <div className="flex justify-between items-center border-t pt-3">
                            <span className="flex items-center gap-1" title="Agent Assigné"><Users className="w-4 h-4"/> {lead.assignedTo?.name || 'Non assigné'}</span>
                            <span className="flex items-center gap-1" title="Date de création"><Clock className="w-4 h-4"/> {formatDate(lead.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </Card>
            ))}
        </div>

        {!isLoading && filteredLeads.length === 0 && (
            <Card className="thread-card col-span-full"><CardContent className="p-12 text-center">
                <Eye className="w-16 h-16 bg-muted rounded-full p-4 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun lead trouvé</h3>
                <p className="text-muted-foreground">Vos critères de recherche ne correspondent à aucun lead.</p>
            </CardContent></Card>
        )}

        {/* --- NOUVEAU DESIGN DE LA MODALE DE DÉTAILS --- */}
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
                        <Link href={`/quotes/new?leadId=${selectedLead.id}`} className="flex-1"><Button className="w-full gap-2 bg-enarva-gradient"><Plus className="w-4 h-4"/>Créer un Devis</Button></Link>
                        <Link href={`/leads/${selectedLead.id}/edit`} className="flex-1"><Button variant="outline" className="w-full gap-2"><Edit/>Modifier</Button></Link>
                        <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleDeleteOne(selectedLead.id)}><Trash2/>Supprimer</Button>
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

                    {selectedLead.leadType !== 'PARTICULIER' && (
                        <Card>
                            <CardHeader><CardTitle className="text-base">Détails Professionnels</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="font-semibold text-muted-foreground">Entreprise:</span><p>{selectedLead.company}</p></div>
                                <div><span className="font-semibold text-muted-foreground">ICE:</span><p>{selectedLead.iceNumber}</p></div>
                                <div><span className="font-semibold text-muted-foreground">Secteur:</span><p>{selectedLead.activitySector || 'N/A'}</p></div>
                                <div><span className="font-semibold text-muted-foreground">Fonction:</span><p>{selectedLead.contactPosition || 'N/A'}</p></div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle className="text-base">Détails de la Demande</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="font-semibold text-muted-foreground">Type de bien:</span><p>{selectedLead.propertyType ? translate('PropertyType', selectedLead.propertyType as PropertyType) : 'N/A'}</p></div>
                            <div><span className="font-semibold text-muted-foreground">Surface:</span><p>{selectedLead.estimatedSurface ? `${selectedLead.estimatedSurface}m²` : 'N/A'}</p></div>
                            <div><span className="font-semibold text-muted-foreground">Urgence:</span><p>{translate('UrgencyLevel', selectedLead.urgencyLevel)}</p></div>
                            <div><span className="font-semibold text-muted-foreground">Budget:</span><p>{selectedLead.budgetRange || 'N/A'}</p></div>
                        </CardContent>
                    </Card>

                    <Card><CardHeader><CardTitle className="text-base">Message Initial & Notes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground leading-relaxed">{selectedLead.originalMessage || "Aucun message."}</p></CardContent></Card>
                </div>
            </DialogContent>
            </Dialog>
        )}
    </div>
  )
}
