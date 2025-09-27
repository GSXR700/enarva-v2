'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Download, 
  Edit, 
  Trash2, 
  Plus, 
  FileText, 
  User, 
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Eye
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Quote {
  id: string
  quoteNumber: string
  status: QuoteStatus
  finalPrice: number
  createdAt: string
  expiresAt: string
  businessType: 'SERVICE' | 'PRODUCT'
  lead: {
    id: string
    firstName: string
    lastName: string
    company?: string
    leadType: string
    phone: string
  }
}

// Status configurations with dark mode support
const getStatusConfig = (status: QuoteStatus) => {
  const configs: Record<QuoteStatus, {
    color: string;
    icon: React.ComponentType<any>;
    label: string;
    priority: number;
  }> = {
    DRAFT: { 
      color: 'bg-muted text-muted-foreground border-border', 
      icon: FileText, 
      label: 'Brouillon',
      priority: 1
    },
    SENT: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-600', 
      icon: Clock, 
      label: 'Envoyé',
      priority: 2
    },
    ACCEPTED: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-600', 
      icon: CheckCircle, 
      label: 'Accepté',
      priority: 4
    },
    REJECTED: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-600', 
      icon: XCircle, 
      label: 'Refusé',
      priority: 3
    },
    EXPIRED: { 
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-600', 
      icon: AlertCircle, 
      label: 'Expiré',
      priority: 5
    },
    VIEWED: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-600', 
      icon: Eye, 
      label: 'Consulté',
      priority: 2
    },
    CANCELLED: { 
      color: 'bg-muted text-muted-foreground border-border', 
      icon: XCircle, 
      label: 'Annulé',
      priority: 6
    }
  }
  return configs[status] || configs.DRAFT
}

export default function QuotesPage() {
  const { data: session } = useSession()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL')

  // Check if user is admin
  const isAdmin = session?.user && (session.user as any).role === 'ADMIN'

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
        setFilteredQuotes(data)
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

  // Filter and search functionality
  useEffect(() => {
    let filtered = quotes

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(quote => 
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${quote.lead.firstName} ${quote.lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.lead.phone.includes(searchTerm)
      )
    }

    setFilteredQuotes(filtered)
  }, [quotes, statusFilter, searchTerm])

  // Handle PDF download
  const handleDownload = async (quoteId: string, quoteNumber: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `devis-${quoteNumber}.pdf`
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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Devis</h1>
            <p className="text-sm text-muted-foreground">{filteredQuotes.length} devis</p>
          </div>
          <Link href="/quotes/new">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau
            </Button>
          </Link>
        </div>

        {/* Mobile Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un devis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter('ALL')}>
                Tous les statuts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('DRAFT')}>
                Brouillons
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('SENT')}>
                Envoyés
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('ACCEPTED')}>
                Acceptés
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('REJECTED')}>
                Refusés
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('EXPIRED')}>
                Expirés
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Devis</h1>
              <p className="text-muted-foreground mt-1">Gérez vos devis et propositions commerciales</p>
            </div>
            <Link href="/quotes/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Devis
              </Button>
            </Link>
          </div>

          {/* Desktop Search & Filter */}
          <div className="flex gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro, client, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrer par statut
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter('ALL')}>
                  Tous les statuts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('DRAFT')}>
                  Brouillons
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('SENT')}>
                  Envoyés
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('ACCEPTED')}>
                  Acceptés
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('REJECTED')}>
                  Refusés
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('EXPIRED')}>
                  Expirés
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm || statusFilter !== 'ALL' ? 'Aucun devis trouvé' : 'Aucun devis'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Essayez de modifier vos critères de recherche' 
                    : 'Commencez par créer votre premier devis'
                  }
                </p>
                {!searchTerm && statusFilter === 'ALL' && (
                  <Link href="/quotes/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Créer un devis
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            {/* Mobile Quote Cards */}
            <div className="lg:hidden space-y-3">
              {filteredQuotes.map((quote) => {
                const statusConfig = getStatusConfig(quote.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <Card key={quote.id}>
                    <CardContent className="p-4">
                      {/* Quote Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <Link 
                            href={`/quotes/${quote.id}`}
                            className="font-semibold text-primary hover:text-primary/80 text-sm"
                          >
                            {quote.quoteNumber}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${statusConfig.color} text-xs border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {quote.businessType === 'SERVICE' ? 'Service' : 'Produit'}
                            </Badge>
                          </div>
                        </div>

                        {/* Mobile Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/quotes/${quote.id}`} className="flex items-center">
                                <Eye className="mr-2 h-4 w-4" />
                                Voir
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDownload(quote.id, quote.quoteNumber)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/quotes/${quote.id}/edit`} className="flex items-center">
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </Link>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Supprimer le devis <strong>{quote.quoteNumber}</strong> ?
                                      <br />Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Client Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">
                            {quote.lead.firstName} {quote.lead.lastName}
                          </span>
                        </div>
                        
                        {quote.lead.company && (
                          <div className="text-xs text-muted-foreground ml-6">
                            {quote.lead.company}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground ml-6">
                          {quote.lead.phone}
                        </div>

                        {/* Amount and Date */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                          <div>
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(quote.finalPrice)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Expire le {formatDate(quote.expiresAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              Créé le
                            </div>
                            <div className="text-xs font-medium text-foreground">
                              {formatDate(quote.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Liste des Devis ({filteredQuotes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-foreground">Devis</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Client</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Montant</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Statut</th>
                          <th className="text-right py-3 px-4 font-medium text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQuotes.map((quote) => {
                          const statusConfig = getStatusConfig(quote.status)
                          const StatusIcon = statusConfig.icon
                          
                          return (
                            <tr key={quote.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-4 px-4">
                                <Link 
                                  href={`/quotes/${quote.id}`}
                                  className="font-medium text-primary hover:text-primary/80"
                                >
                                  {quote.quoteNumber}
                                </Link>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {formatDate(quote.createdAt)}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-foreground">
                                  {quote.lead.firstName} {quote.lead.lastName}
                                </div>
                                {quote.lead.company && (
                                  <div className="text-sm text-muted-foreground">
                                    {quote.lead.company}
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  {quote.lead.phone}
                                </div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {quote.lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <Badge variant="outline">
                                  {quote.businessType === 'SERVICE' ? 'Service' : 'Produit'}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-semibold text-primary">
                                  {formatCurrency(quote.finalPrice)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Expire le {formatDate(quote.expiresAt)}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge className={`${statusConfig.color} border`}>
                                  <StatusIcon className="w-4 h-4 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Link href={`/quotes/${quote.id}`}>
                                    <Button variant="ghost" size="sm" title="Voir le devis">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(quote.id, quote.quoteNumber)}
                                    title="Télécharger le PDF"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Link href={`/quotes/${quote.id}/edit`}>
                                    <Button variant="ghost" size="sm" title="Modifier le devis">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  {isAdmin && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Supprimer le devis"
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                                            <span className="text-destructive font-medium">
                                              Cette action est irréversible.
                                            </span>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                                            className="bg-destructive hover:bg-destructive/90"
                                            disabled={deletingQuoteId === quote.id}
                                          >
                                            {deletingQuoteId === quote.id ? 'Suppression...' : 'Supprimer'}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}