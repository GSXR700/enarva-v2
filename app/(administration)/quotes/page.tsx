// app/(administration)/quotes/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogDescription
} from '@/components/ui/dialog'
import {
  Plus,
  FileText,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Edit,
  Calendar
} from 'lucide-react'
import { formatCurrency, formatDate, translate } from '@/lib/utils'
import { Quote, Lead, QuoteStatus, QuoteType, PropertyType } from '@prisma/client'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { toast } from 'sonner'

type QuoteWithLead = Quote & { lead: Lead };

const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'VIEWED': return 'bg-purple-100 text-purple-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'EXPIRED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="w-4 h-4" />;
      case 'SENT': return <Send className="w-4 h-4" />;
      case 'VIEWED': return <Eye className="w-4 h-4" />;
      case 'ACCEPTED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      case 'EXPIRED': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
      case 'EXPRESS': return 'bg-green-100 text-green-800';
      case 'STANDARD': return 'bg-blue-100 text-blue-800';
      case 'PREMIUM': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

export default function QuotesPage() {
  const router = useRouter();
  const [allQuotes, setAllQuotes] = useState<QuoteWithLead[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteWithLead[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithLead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/quotes');
      if (!response.ok) throw new Error('Impossible de récupérer les devis.');
      const data = await response.json();
      setAllQuotes(data);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        await fetchQuotes();
        setIsLoading(false);
    }
    loadData();
  }, [fetchQuotes]);

  useEffect(() => {
    let quotes = [...allQuotes];
    if (statusFilter !== 'all') {
      quotes = quotes.filter(quote => quote.status === statusFilter);
    }
     if (typeFilter !== 'all') {
      quotes = quotes.filter(quote => quote.type === typeFilter);
    }
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      quotes = quotes.filter(quote =>
        quote.lead.firstName.toLowerCase().includes(lowercasedQuery) ||
        quote.lead.lastName.toLowerCase().includes(lowercasedQuery) ||
        (quote.lead.company && quote.lead.company.toLowerCase().includes(lowercasedQuery)) ||
        quote.quoteNumber.toLowerCase().includes(lowercasedQuery)
      );
    }
    setFilteredQuotes(quotes);
  }, [searchQuery, statusFilter, typeFilter, allQuotes]);

  const handleStatusUpdate = async (quoteId: string, status: QuoteStatus) => {
    try {
        const response = await fetch(`/api/quotes/${quoteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error("La mise à jour du statut a échoué.");
        toast.success("Statut du devis mis à jour !");
        setSelectedQuote(null);
        fetchQuotes(); // Recharger les données pour refléter le changement
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  if (isLoading) return <CardGridSkeleton title="Gestion des Devis" description="Chargement des devis..." />;
  if (error) return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Devis</h1>
          <p className="text-muted-foreground mt-1">
            {allQuotes.length} devis • {allQuotes.filter(q => q.status === 'SENT').length} envoyés • {allQuotes.filter(q => q.status === 'ACCEPTED').length} acceptés
          </p>
        </div>
        <Link href="/quotes/new"><Button className="gap-2 bg-enarva-gradient rounded-lg"><Plus />Nouveau Devis</Button></Link>
      </div>

      <Card className="thread-card">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <Input placeholder="Rechercher par client, entreprise, numéro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-background flex-1 min-w-[250px]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="SENT">Envoyé</SelectItem>
                <SelectItem value="VIEWED">Consulté</SelectItem>
                <SelectItem value="ACCEPTED">Accepté</SelectItem>
                <SelectItem value="REJECTED">Refusé</SelectItem>
                <SelectItem value="EXPIRED">Expiré</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="EXPRESS">Express</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
              </SelectContent>
            </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredQuotes.map((quote) => (
          <div key={quote.id} onClick={() => setSelectedQuote(quote)} className="cursor-pointer">
            <Card className="thread-card hover:shadow-md transition-all h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{quote.quoteNumber}</CardTitle>
                  <div className="text-lg font-bold text-enarva-start">{formatCurrency(Number(quote.finalPrice))}</div>
                </div>
                <p className="text-sm text-muted-foreground pt-1">{quote.lead.firstName} {quote.lead.lastName} {quote.lead.company ? `(${quote.lead.company})` : ''}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`status-badge ${getStatusColor(quote.status)} flex items-center gap-1`}>{getStatusIcon(quote.status)}{quote.status}</Badge>
                  <Badge className={`status-badge ${getTypeColor(quote.type)}`}>{quote.type}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">Créé le: {formatDate(quote.createdAt)}</div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      
      {selectedQuote && (
           <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
              <DialogContent className="max-w-2xl">
                  <DialogHeader>
                      <DialogTitle className="text-2xl">{selectedQuote.quoteNumber}</DialogTitle>
                      <DialogDescription>Détails du devis pour {selectedQuote.lead.firstName} {selectedQuote.lead.lastName}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center text-lg">
                        <span className="text-muted-foreground">Montant Total</span>
                        <span className="font-bold text-2xl text-enarva-start">{formatCurrency(Number(selectedQuote.finalPrice))}</span>
                    </div>
                    <Card className="bg-secondary">
                        <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
                             <div><span className="font-semibold">Statut:</span> <Badge className={getStatusColor(selectedQuote.status)}>{selectedQuote.status}</Badge></div>
                             <div><span className="font-semibold">Type:</span> <Badge variant="outline">{selectedQuote.type}</Badge></div>
                             <div><span className="font-semibold">Surface:</span> {selectedQuote.surface} m²</div>
                             <div><span className="font-semibold">Propriété:</span> {translate('PropertyType', selectedQuote.propertyType)}</div>
                        </CardContent>
                    </Card>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {selectedQuote.status === 'ACCEPTED' && <Link href={`/missions/new?quoteId=${selectedQuote.id}`} className="flex-1"><Button className="w-full gap-2"><Calendar />Planifier Mission</Button></Link>}
                        <Link href={`/quotes/${selectedQuote.id}/edit`} className="flex-1"><Button variant="outline" className="w-full gap-2"><Edit />Modifier</Button></Link>
                        <Button 
  variant="outline" 
  className="flex-1 gap-2"
  onClick={() => {
    window.open(`/api/quotes/${selectedQuote.id}/download`, '_blank');
  }}
>
  <Download className="w-4 h-4" />
  Télécharger PDF
</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                        <p className="text-sm font-medium mr-2">Changer le statut:</p>
                        {selectedQuote.status !== 'SENT' && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(selectedQuote.id, 'SENT')}>Envoyé</Button>}
                        {selectedQuote.status !== 'ACCEPTED' && <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleStatusUpdate(selectedQuote.id, 'ACCEPTED')}>Accepté</Button>}
                        {selectedQuote.status !== 'REJECTED' && <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleStatusUpdate(selectedQuote.id, 'REJECTED')}>Refusé</Button>}
                    </div>
                  </div>
              </DialogContent>
           </Dialog>
      )}
    </div>
  )
}