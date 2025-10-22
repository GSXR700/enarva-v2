// app/(administration)/quotes/page.tsx
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
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Loader2
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { WaveLoader } from '@/components/pdf/WaveLoader'
import '@/components/pdf/WaveLoader.css'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

const getStatusConfig = (status: QuoteStatus) => {
  const configs: Record<QuoteStatus, {
    color: string;
    icon: React.ComponentType<any>;
    label: string;
    priority: number;
  }> = {
    DRAFT: { 
      color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600', 
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
      color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600', 
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
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL')
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

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

  useEffect(() => {
    let filtered = quotes

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }

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

  const handleDownload = async (quoteId: string, quoteNumber: string) => {
    setDownloadingQuoteId(quoteId)
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${quoteNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF téléchargé avec succès')
      } else {
        toast.error('Erreur lors du téléchargement du PDF')
      }
    } catch (error) {
      console.error('Error downloading quote:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    } finally {
      setDownloadingQuoteId(null)
    }
  }

  const handleDelete = async (quoteId: string, quoteNumber: string) => {
    if (!isAdmin) {
      toast.error('Action non autorisée')
      return
    }

    setDeletingQuoteId(quoteId)
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Devis ${quoteNumber} supprimé avec succès`)
        setQuotes(quotes.filter(q => q.id !== quoteId))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression du devis')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('Erreur lors de la suppression du devis')
    } finally {
      setDeletingQuoteId(null)
    }
  }

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus, quoteNumber: string) => {
    setUpdatingStatusId(quoteId)
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        await response.json()
        toast.success(`Statut du devis ${quoteNumber} mis à jour`)
        setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
      } else {
        toast.error('Erreur lors de la mise à jour du statut')
      }
    } catch (error) {
      console.error('Error updating quote status:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const statusOptions: Array<{ value: QuoteStatus | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'SENT', label: 'Envoyé' },
    { value: 'VIEWED', label: 'Consulté' },
    { value: 'ACCEPTED', label: 'Accepté' },
    { value: 'REJECTED', label: 'Refusé' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'CANCELLED', label: 'Annulé' },
  ]

  const availableStatusChanges: QuoteStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des devis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {downloadingQuoteId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <WaveLoader isLoading={true} />
        </div>
      )}

      <div className="max-w-[95vw] md:max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Devis</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gérez et suivez tous vos devis
              </p>
            </div>
          </div>
          <Link href="/quotes/new">
            <Button className="shadow-lg shadow-primary/20 rounded-xl w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Devis
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="apple-card border-l-4 border-l-primary">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par numéro, client, entreprise ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl min-w-[180px] justify-start">
                      <Filter className="w-4 h-4 mr-2" />
                      {statusOptions.find(s => s.value === statusFilter)?.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    {statusOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setStatusFilter(option.value)}
                        className="cursor-pointer"
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {filteredQuotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="apple-card">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || statusFilter !== 'ALL' ? 'Aucun devis trouvé' : 'Aucun devis'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Essayez de modifier vos filtres de recherche'
                    : 'Commencez par créer votre premier devis'}
                </p>
                <Link href="/quotes/new">
                  <Button className="shadow-lg shadow-primary/20 rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un devis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3 md:gap-4">
              {filteredQuotes.map((quote, index) => {
                const statusConfig = getStatusConfig(quote.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="apple-card hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <Link 
                                href={`/quotes/${quote.id}`}
                                className="font-semibold text-base hover:text-primary transition-colors line-clamp-1"
                              >
                                {quote.quoteNumber}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(quote.createdAt)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[200px]">
                                <DropdownMenuItem asChild>
                                  <Link href={`/quotes/${quote.id}`} className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Voir le devis
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDownload(quote.id, quote.quoteNumber)}
                                  disabled={downloadingQuoteId === quote.id}
                                  className="cursor-pointer"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Télécharger PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/quotes/${quote.id}/edit`} className="cursor-pointer">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Modifier
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs">Changer le statut</DropdownMenuLabel>
                                {availableStatusChanges.map((status) => {
                                  const config = getStatusConfig(status)
                                  const Icon = config.icon
                                  return (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={() => handleStatusChange(quote.id, status, quote.quoteNumber)}
                                      disabled={updatingStatusId === quote.id || quote.status === status}
                                      className="cursor-pointer"
                                    >
                                      <Icon className="w-4 h-4 mr-2" />
                                      {config.label}
                                    </DropdownMenuItem>
                                  )
                                })}
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem 
                                          onSelect={(e) => e.preventDefault()}
                                          className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Supprimer
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                          <AlertDialogDescription className="text-xs sm:text-sm">
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
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <Badge className={`${statusConfig.color} border text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10">
                                  {quote.lead.firstName[0]}{quote.lead.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm line-clamp-1">
                                  {quote.lead.firstName} {quote.lead.lastName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs h-5">
                                    {quote.lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs h-5">
                                    {quote.businessType === 'SERVICE' ? 'Service' : 'Produit'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {quote.lead.company && (
                              <div className="text-xs text-muted-foreground ml-10 line-clamp-1">
                                {quote.lead.company}
                              </div>
                            )}
                            
                            <div className="text-xs text-muted-foreground ml-10">
                              {quote.lead.phone}
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <div>
                                <div className="text-lg font-bold text-primary">
                                  {formatCurrency(quote.finalPrice)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Expire le {formatDate(quote.expiresAt)}
                                </div>
                              </div>
                              <Link href={`/quotes/${quote.id}`}>
                                <Button size="sm" variant="outline" className="rounded-lg">
                                  Voir
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="hidden lg:block"
            >
              <Card className="apple-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Liste des Devis ({filteredQuotes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-sm">Devis</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Client</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Montant</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                          <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQuotes.map((quote, index) => {
                          const statusConfig = getStatusConfig(quote.status)
                          const StatusIcon = statusConfig.icon
                          
                          return (
                            <motion.tr 
                              key={quote.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.03 }}
                              className="border-b hover:bg-muted/50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <Link 
                                  href={`/quotes/${quote.id}`}
                                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                                >
                                  {quote.quoteNumber}
                                </Link>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {formatDate(quote.createdAt)}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10">
                                      {quote.lead.firstName[0]}{quote.lead.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">
                                      {quote.lead.firstName} {quote.lead.lastName}
                                    </div>
                                    {quote.lead.company && (
                                      <div className="text-sm text-muted-foreground line-clamp-1">
                                        {quote.lead.company}
                                      </div>
                                    )}
                                    <div className="text-sm text-muted-foreground">
                                      {quote.lead.phone}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs mt-2">
                                  {quote.lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <Badge variant="outline" className="rounded-lg">
                                  {quote.businessType === 'SERVICE' ? 'Service' : 'Produit'}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-primary text-lg">
                                  {formatCurrency(quote.finalPrice)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Expire le {formatDate(quote.expiresAt)}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className={`${statusConfig.color} border px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer`}>
                                      <StatusIcon className="w-4 h-4" />
                                      {statusConfig.label}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-[180px]">
                                    <DropdownMenuLabel className="text-xs">Changer le statut</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {availableStatusChanges.map((status) => {
                                      const config = getStatusConfig(status)
                                      const Icon = config.icon
                                      return (
                                        <DropdownMenuItem
                                          key={status}
                                          onClick={() => handleStatusChange(quote.id, status, quote.quoteNumber)}
                                          disabled={updatingStatusId === quote.id || quote.status === status}
                                          className="cursor-pointer"
                                        >
                                          <Icon className="w-4 h-4 mr-2" />
                                          {config.label}
                                        </DropdownMenuItem>
                                      )
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-end gap-1">
                                  <Link href={`/quotes/${quote.id}`}>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/10" title="Voir le devis">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 hover:bg-primary/10"
                                    onClick={() => handleDownload(quote.id, quote.quoteNumber)}
                                    disabled={downloadingQuoteId === quote.id}
                                    title="Télécharger le PDF"
                                  >
                                    {downloadingQuoteId === quote.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Link href={`/quotes/${quote.id}/edit`}>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/10" title="Modifier le devis">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  {isAdmin && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          title="Supprimer le devis"
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
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
