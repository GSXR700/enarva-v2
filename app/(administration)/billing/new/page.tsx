// app/(administration)/billing/new/page.tsx - COMPLETE REDESIGN WITH QUOTES
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
//import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Search, CheckCircle2, Send, Package, Wrench } from 'lucide-react'
import { Quote, Lead } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type QuoteWithLead = Quote & { 
  lead: Lead;
};

export default function NewInvoicePage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteWithLead[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteWithLead[]>([])
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithLead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACCEPTED' | 'SENT'>('ALL')

  useEffect(() => {
    fetchQuotes()
  }, [])

  useEffect(() => {
    filterQuotesList()
  }, [quotes, searchTerm, filterStatus])

  const fetchQuotes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/quotes')
      if (!response.ok) throw new Error('Erreur lors du chargement des devis')
      
      const allQuotes = await response.json()
      
      // Filter only ACCEPTED and SENT quotes
      const eligibleQuotes = allQuotes.filter((q: QuoteWithLead) => 
        q.status === 'ACCEPTED' || q.status === 'SENT'
      )
      
      setQuotes(eligibleQuotes)
    } catch (err: any) {
      setError(`Erreur: ${err.message}`)
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filterQuotesList = () => {
    let filtered = [...quotes]
    
    // Filter by status
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(q => q.status === filterStatus)
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q => 
        q.quoteNumber?.toLowerCase().includes(term) ||
        q.lead.firstName.toLowerCase().includes(term) ||
        q.lead.lastName.toLowerCase().includes(term) ||
        q.lead.company?.toLowerCase().includes(term)
      )
    }
    
    setFilteredQuotes(filtered)
  }

  const handleSelectQuote = (quote: QuoteWithLead) => {
    setSelectedQuote(quote)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedQuote) {
      setError('Veuillez sélectionner un devis')
      toast.error('Veuillez sélectionner un devis')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/invoices/from-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: selectedQuote.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(data.message || 'Une facture existe déjà pour ce devis')
          setError(data.message || 'Une facture existe déjà pour ce devis')
        } else {
          throw new Error(data.message || 'Erreur lors de la création de la facture')
        }
        return
      }
      
      toast.success('Facture créée avec succès !')
      router.push('/billing')
      
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la création'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      ACCEPTED: {
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: 'Accepté'
      },
      SENT: {
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: <Send className="w-3 h-3" />,
        label: 'Envoyé'
      }
    }
    
    const statusConfig = config[status as keyof typeof config] || config.SENT
    
    return (
      <Badge className={`${statusConfig.className} gap-1`}>
        {statusConfig.icon}
        {statusConfig.label}
      </Badge>
    )
  }

  const getBusinessTypeBadge = (type: string) => {
    return type === 'SERVICE' ? (
      <Badge variant="outline" className="gap-1">
        <Wrench className="w-3 h-3" />
        Service
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <Package className="w-3 h-3" />
        Produit
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/billing">
            <Button variant="outline" size="icon" className="shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Créer une Facture
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Générez une facture à partir d'un devis accepté ou envoyé
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Total Devis</p>
                  <p className="text-2xl font-bold mt-1">{quotes.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Acceptés</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600">
                    {quotes.filter(q => q.status === 'ACCEPTED').length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Envoyés</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600">
                    {quotes.filter(q => q.status === 'SENT').length}
                  </p>
                </div>
                <Send className="w-8 h-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Montant Total</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">
                    {formatCurrency(quotes.reduce((sum, q) => sum + Number(q.finalPrice), 0))}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Quote Selection */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Sélectionner un Devis
                </CardTitle>
                <CardDescription>
                  Choisissez parmi les devis acceptés ou envoyés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, entreprise, n° devis..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('ALL')}
                      className="flex-1 sm:flex-none"
                    >
                      Tous
                    </Button>
                    <Button
                      variant={filterStatus === 'ACCEPTED' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('ACCEPTED')}
                      className="flex-1 sm:flex-none"
                    >
                      Acceptés
                    </Button>
                    <Button
                      variant={filterStatus === 'SENT' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('SENT')}
                      className="flex-1 sm:flex-none"
                    >
                      Envoyés
                    </Button>
                  </div>
                </div>

                {/* Quotes List */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-sm font-medium">Aucun devis disponible</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {searchTerm || filterStatus !== 'ALL' 
                        ? 'Aucun résultat ne correspond à votre recherche'
                        : 'Il n\'y a aucun devis accepté ou envoyé pour le moment'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {filteredQuotes.map((quote) => (
                      <div
                        key={quote.id}
                        onClick={() => handleSelectQuote(quote)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedQuote?.id === quote.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-semibold text-sm">
                                {quote.quoteNumber || 'N/A'}
                              </span>
                              {getStatusBadge(quote.status)}
                              {getBusinessTypeBadge(quote.businessType)}
                            </div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {quote.lead.firstName} {quote.lead.lastName}
                            </p>
                            {quote.lead.company && (
                              <p className="text-xs text-muted-foreground truncate">
                                {quote.lead.company}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Créé le {formatDate(quote.createdAt)}
                            </p>
                          </div>
                          <div className="text-right sm:text-left">
                            <p className="text-xl font-bold text-blue-600">
                              {formatCurrency(Number(quote.finalPrice))}
                            </p>
                            <p className="text-xs text-muted-foreground">TTC</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Invoice Preview */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Aperçu de la Facture</CardTitle>
                <CardDescription>
                  {selectedQuote ? 'Vérifiez les détails' : 'Sélectionnez un devis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedQuote ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
                        Informations Client
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nom:</span>
                          <strong className="text-right">
                            {selectedQuote.lead.firstName} {selectedQuote.lead.lastName}
                          </strong>
                        </div>
                        {selectedQuote.lead.company && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Entreprise:</span>
                            <strong className="text-right">{selectedQuote.lead.company}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Téléphone:</span>
                          <strong className="text-right">{selectedQuote.lead.phone}</strong>
                        </div>
                        {selectedQuote.lead.email && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <strong className="text-right truncate max-w-[180px]">
                              {selectedQuote.lead.email}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                      <h3 className="font-semibold mb-3">Détails du Devis</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">N° Devis:</span>
                          <strong>{selectedQuote.quoteNumber || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <div>{getBusinessTypeBadge(selectedQuote.businessType)}</div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date création:</span>
                          <strong>{formatDate(selectedQuote.createdAt)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Statut:</span>
                          <div>{getStatusBadge(selectedQuote.status)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sous-total HT:</span>
                          <strong>{formatCurrency(Number(selectedQuote.subTotalHT))}</strong>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">TVA:</span>
                          <strong>{formatCurrency(Number(selectedQuote.vatAmount))}</strong>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />
                        <div className="flex justify-between items-center pt-2">
                          <span className="font-semibold text-base">Total TTC:</span>
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(Number(selectedQuote.finalPrice))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                        disabled={isSubmitting || !selectedQuote}
                        size="lg"
                      >
                        <FileText className="w-5 h-5" />
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Génération...
                          </>
                        ) : (
                          'Générer la Facture'
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-16 w-16 text-muted-foreground opacity-30" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Sélectionnez un devis pour voir l'aperçu
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}