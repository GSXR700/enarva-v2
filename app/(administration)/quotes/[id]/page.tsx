'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Check, 
  X, 
  Clock,
  User,
  MapPin,
  Calendar,
  FileText,
  Share2,
  Eye,
  Printer
} from 'lucide-react'
import { formatCurrency, formatDate, translate } from '@/lib/utils'
import { Quote, Lead, QuoteStatus } from '@prisma/client'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import Link from 'next/link'

type QuoteWithLead = Quote & { 
  lead: Lead;
}

interface QuoteLineItem {
  id: string;
  designation: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export default function QuoteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<QuoteWithLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`)
      if (!response.ok) throw new Error('Quote not found')
      const data = await response.json()
      setQuote(data)
    } catch (error) {
      toast.error('Impossible de charger le devis')
      router.push('/quotes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
  }, [quoteId])

  const handleStatusUpdate = async (newStatus: QuoteStatus) => {
    if (!quote) return
    
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Update failed')
      
      const updatedQuote = await response.json()
      setQuote(updatedQuote)
      
      if (newStatus === 'ACCEPTED') {
        toast.success('Devis accepté ! Une facture sera générée.')
      } else if (newStatus === 'REJECTED') {
        toast.success('Devis marqué comme rejeté.')
      } else {
        toast.success('Statut mis à jour avec succès.')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Devis-${quote?.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Devis téléchargé avec succès')
    } catch (error) {
      toast.error('Erreur lors du téléchargement')
    }
  }

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
      case 'SENT': return <Eye className="w-4 h-4" />
      case 'ACCEPTED': return <Check className="w-4 h-4" />
      case 'REJECTED': return <X className="w-4 h-4" />
      case 'EXPIRED': return <Clock className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <TableSkeleton 
          title="Chargement du devis..."
          description="Veuillez patienter pendant le chargement des détails du devis."
        />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Devis introuvable</h3>
              <p className="text-gray-600 mb-4">Le devis demandé n'existe pas ou a été supprimé.</p>
              <Link href="/quotes">
                <Button>Retour aux devis</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Safe parsing of lineItems with proper type checking
  const parseLineItems = (items: any): QuoteLineItem[] => {
    if (!items) return []
    
    try {
      // If items is already an array
      if (Array.isArray(items)) {
        return items.filter((item): item is QuoteLineItem => {
          return item && 
                 typeof item === 'object' && 
                 typeof item.id === 'string' &&
                 typeof item.designation === 'string' &&
                 typeof item.quantity === 'number' &&
                 typeof item.unitPrice === 'number' &&
                 typeof item.totalPrice === 'number'
        })
      }
      
      // If items is a JSON string, parse it
      if (typeof items === 'string') {
        const parsed = JSON.parse(items)
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is QuoteLineItem => {
            return item && 
                   typeof item === 'object' && 
                   typeof item.id === 'string' &&
                   typeof item.designation === 'string' &&
                   typeof item.quantity === 'number' &&
                   typeof item.unitPrice === 'number' &&
                   typeof item.totalPrice === 'number'
          })
        }
      }
      
      return []
    } catch (error) {
      console.error('Error parsing line items:', error)
      return []
    }
  }

  const lineItems = parseLineItems(quote.lineItems)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile & Desktop */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 mx-3">
              <h1 className="text-lg font-bold truncate">{quote.quoteNumber}</h1>
              <div className="flex items-center gap-2">
                {getStatusIcon(quote.status)}
                <Badge className={`text-xs ${getStatusColor(quote.status)}`}>
                  {translate(quote.status)}
                </Badge>
              </div>
            </div>

            {/* Mobile Action Buttons - Icons Only */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-10 w-10 p-0 rounded-full"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Link href={`/quotes/${quoteId}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-full"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
                <p className="text-gray-600">Créé le {formatDate(quote.createdAt)}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(quote.status)}
                <Badge className={getStatusColor(quote.status)}>
                  {translate(quote.status)}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              
              <Link href={`/quotes/${quoteId}/edit`}>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              </Link>

              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-4 space-y-6">
        {/* Status Actions - Mobile Only */}
        {quote.status === 'SENT' && (
          <div className="lg:hidden space-y-3">
            <Button
              onClick={() => handleStatusUpdate('ACCEPTED')}
              disabled={isUpdating}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Accepter le devis
            </Button>
            <Button
              onClick={() => handleStatusUpdate('REJECTED')}
              disabled={isUpdating}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Rejeter le devis
            </Button>
          </div>
        )}

        {/* Client Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Informations Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {quote.lead.firstName} {quote.lead.lastName}
                </h3>
                <p className="text-gray-600">{quote.lead.phone}</p>
                {quote.lead.email && (
                  <p className="text-gray-600">{quote.lead.email}</p>
                )}
                {quote.lead.company && (
                  <p className="text-sm text-gray-500">
                    <strong>Société:</strong> {quote.lead.company}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                {quote.lead.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{quote.lead.address}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    <strong>Validité:</strong> {formatDate(quote.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Détails du Devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Business Type Badge */}
            <div className="mb-4">
              <Badge variant="outline" className="text-sm">
                {quote.businessType === 'SERVICE' ? 'Prestation de Service' : 'Vente de Produits'}
              </Badge>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Éléments du devis</h4>
              
              {lineItems.length > 0 ? (
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={item.id || index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <h5 className="font-medium text-gray-900">{item.designation}</h5>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Quantité</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        
                        <div className="text-center md:text-right">
                          <p className="text-sm text-gray-500">Prix unitaire</p>
                          <p className="font-medium">{formatCurrency(item.unitPrice)} MAD</p>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total ligne</span>
                        <span className="font-semibold text-lg">
                          {formatCurrency(item.totalPrice)} MAD
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Aucun élément dans ce devis</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sous-total HT</span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(quote.subTotalHT.toString()))} MAD
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">TVA (20%)</span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(quote.vatAmount.toString()))} MAD
                </span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total TTC</span>
                <span className="font-bold text-xl text-blue-600">
                  {formatCurrency(parseFloat(quote.totalTTC.toString()))} MAD
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Actions - Desktop */}
        {quote.status === 'SENT' && (
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  onClick={() => handleStatusUpdate('ACCEPTED')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accepter le devis
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('REJECTED')}
                  disabled={isUpdating}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Rejeter le devis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations supplémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type de devis:</span>
                <span className="ml-2 font-medium">
                  {quote.type ? translate(quote.type) : 'Standard'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-500">Date de création:</span>
                <span className="ml-2 font-medium">{formatDate(quote.createdAt)}</span>
              </div>
              
              <div>
                <span className="text-gray-500">Dernière modification:</span>
                <span className="ml-2 font-medium">{formatDate(quote.updatedAt)}</span>
              </div>
              
              <div>
                <span className="text-gray-500">Date d'expiration:</span>
                <span className="ml-2 font-medium">{formatDate(quote.expiresAt)}</span>
              </div>
              
              {quote.surface && (
                <div>
                  <span className="text-gray-500">Surface:</span>
                  <span className="ml-2 font-medium">{quote.surface} m²</span>
                </div>
              )}
              
              {quote.levels && (
                <div>
                  <span className="text-gray-500">Niveaux:</span>
                  <span className="ml-2 font-medium">{quote.levels}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}