'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Download, 
  Edit, 
  Trash2, 
  PlusCircle, 
  FileText, 
  User, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QuoteStatus } from '@prisma/client'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Quote {
  id: string
  quoteNumber: string
  status: QuoteStatus
  finalPrice: number
  createdAt: string
  expiresAt: string
  lead: {
    id: string
    firstName: string
    lastName: string
    company?: string
    leadType: string
  }
}

// Status color helpers
const getStatusColor = (status: QuoteStatus) => {
  switch (status) {
    case 'DRAFT': return 'bg-gray-100 text-gray-800'
    case 'SENT': return 'bg-blue-100 text-blue-800'
    case 'ACCEPTED': return 'bg-green-100 text-green-800'
    case 'REJECTED': return 'bg-red-100 text-red-800'
    case 'EXPIRED': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusIcon = (status: QuoteStatus) => {
  switch (status) {
    case 'DRAFT': return <FileText className="w-4 h-4" />
    case 'SENT': return <Clock className="w-4 h-4" />
    case 'ACCEPTED': return <CheckCircle className="w-4 h-4" />
    case 'REJECTED': return <XCircle className="w-4 h-4" />
    case 'EXPIRED': return <AlertCircle className="w-4 h-4" />
    default: return <FileText className="w-4 h-4" />
  }
}

const translate = (status: QuoteStatus) => {
  switch (status) {
    case 'DRAFT': return 'Brouillon'
    case 'SENT': return 'Envoyé'
    case 'ACCEPTED': return 'Accepté'
    case 'REJECTED': return 'Refusé'
    case 'EXPIRED': return 'Expiré'
    default: return status
  }
}

export default function QuotesPage() {
  const { data: session } = useSession()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null)

  // Check if user is admin (required for delete)
  const isAdmin = session?.user && (session.user as any).role === 'ADMIN'

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
      } else {
        toast.error('Erreur lors du chargement des devis')
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      toast.error('Erreur lors du chargement des devis')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  // Handle PDF download
  const handleDownload = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `devis-${quoteId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF téléchargé avec succès')
      } else {
        toast.error('Erreur lors du téléchargement du PDF')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    }
  }

  // Handle quote deletion
  const handleDelete = async (quoteId: string, quoteNumber: string) => {
    if (!isAdmin) {
      toast.error('Seuls les administrateurs peuvent supprimer des devis')
      return
    }

    setDeletingQuoteId(quoteId)
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove the quote from local state
        setQuotes(current => current.filter(quote => quote.id !== quoteId))
        toast.success(`Devis ${quoteNumber} supprimé avec succès`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du devis')
    } finally {
      setDeletingQuoteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devis</h1>
          <p className="text-gray-600">Gérez tous vos devis et propositions commerciales</p>
        </div>
        <Link href="/quotes/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau Devis
          </Button>
        </Link>
      </div>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Liste des Devis ({quotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length > 0 ? (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link 
                        href={`/quotes/${quote.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {quote.quoteNumber}
                      </Link>
                      <div className="text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatDate(quote.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {quote.lead.firstName} {quote.lead.lastName}
                          </div>
                          {quote.lead.company && (
                            <div className="text-xs text-gray-500">
                              {quote.lead.company}
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs mt-1">
                            {quote.lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(quote.finalPrice)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expire le {formatDate(quote.expiresAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(quote.status)}
                          {translate(quote.status)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(quote.id)}
                          title="Télécharger le PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link href={`/quotes/${quote.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Modifier le devis"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        {/* Delete Button with Confirmation Dialog */}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Supprimer le devis"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={deletingQuoteId === quote.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer le devis <strong>{quote.quoteNumber}</strong> ?
                                  <br />
                                  Client: {quote.lead.firstName} {quote.lead.lastName}
                                  <br />
                                  Montant: {formatCurrency(quote.finalPrice)}
                                  <br /><br />
                                  <span className="text-red-600 font-medium">
                                    Cette action est irréversible.
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deletingQuoteId === quote.id}
                                >
                                  {deletingQuoteId === quote.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                      Suppression...
                                    </>
                                  ) : (
                                    'Supprimer'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        
                        {/* Show disabled delete button for non-admins */}
                        {!isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Seuls les administrateurs peuvent supprimer des devis"
                            className="text-gray-400 cursor-not-allowed"
                            disabled
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium">Aucun devis trouvé</p>
                      <p className="text-sm mt-1">
                        Commencez par créer votre premier devis
                      </p>
                      <Link href="/quotes/new" className="mt-4 inline-block">
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Créer un devis
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}