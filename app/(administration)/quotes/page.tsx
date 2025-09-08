// app/(administration)/quotes/page.tsx - FIXED

'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Download, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, translate } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import Link from 'next/link'
import { Quote, Lead } from '@prisma/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Add totalAmount to the type definition, as it's calculated by the API
type QuoteWithLead = Quote & { lead: Lead; totalAmount: number }

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteWithLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithLead | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch('/api/quotes')
        if (!response.ok) {
          throw new Error('Failed to fetch quotes')
        }
        const data = await response.json()
        setQuotes(data)
      } catch (error) {
        toast.error("Impossible de charger la liste des devis.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuotes()
  }, [])

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) {
      return
    }
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete quote')
      }
      setQuotes(quotes.filter(q => q.id !== quoteId))
      toast.success('Devis supprimé avec succès.')
    } catch (error) {
      toast.error('Erreur lors de la suppression du devis.')
    }
  }
  
  const handleDownloadPdf = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`);
      if (!response.ok) {
        throw new Error('PDF generation failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devis-${quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Le devis a été téléchargé.');
    } catch (error) {
      toast.error('Erreur lors du téléchargement du devis.');
    }
  };


  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'SENT': return 'default'
      case 'ACCEPTED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
       <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Devis</h1>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Devis
          </Button>
        </div>
        {/* Pass the required 'title' prop to the skeleton component */}
        <TableSkeleton title="Chargement des devis..." />
      </div>
    )
  }

  return (
    <div className="main-content">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Devis</h1>
        <Link href="/quotes/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Devis
          </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length > 0 ? (
                quotes.map(quote => (
                  <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedQuote(quote)}>
                    <TableCell className="font-medium">
                      {quote.lead.firstName} {quote.lead.lastName}
                    </TableCell>
                    <TableCell>{formatDate(quote.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(quote.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(quote.status)}>
                        {translate(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(quote.id); }}>
                        <Download className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/quotes/${quote.id}/edit`); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Aucun devis trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedQuote && (
        <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Détails du Devis #{selectedQuote.id.substring(0, 8)}</DialogTitle>
              <DialogDescription>
                Pour {selectedQuote.lead.firstName} {selectedQuote.lead.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informations Générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-semibold">Client:</span> {selectedQuote.lead.firstName} {selectedQuote.lead.lastName}</div>
                  <div><span className="font-semibold">Adresse:</span> {selectedQuote.lead.address}</div>
                  <div><span className="font-semibold">Date:</span> {formatDate(selectedQuote.createdAt)}</div>
                  <div>
                    <span className="font-semibold">Statut:</span> 
                    <Badge variant={getStatusVariant(selectedQuote.status)} className="ml-2">
                        {translate(selectedQuote.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Détails de la Prestation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-semibold">Type:</span> <Badge variant="outline">{selectedQuote.type}</Badge></div>
                  <div><span className="font-semibold">Surface:</span> {selectedQuote.surface} m²</div>
                  <div><span className="font-semibold">Propriété:</span> {translate(selectedQuote.propertyType)}</div>
                </CardContent>
              </Card>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => handleDownloadPdf(selectedQuote.id)} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Télécharger en PDF
                </Button>
                <Button variant="outline" onClick={() => router.push(`/quotes/${selectedQuote.id}/edit`)} className="w-full sm:w-auto">
                  <Edit className="mr-2 h-4 w-4" /> Modifier le devis
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}