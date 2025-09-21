'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Trash2, 
  FileText, 
  User, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Building,
  Package,
  Wrench,
  Share2,
  MoreVertical
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QuoteStatus, PropertyType } from '@prisma/client'
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

interface QuoteLineItem {
  id: string
  description: string
  detail?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Quote {
  id: string
  quoteNumber: string
  status: QuoteStatus
  businessType: 'SERVICE' | 'PRODUCT'
  finalPrice: number
  subTotalHT: number
  vatAmount: number
  totalTTC: number
  surface?: number
  levels?: number
  propertyType?: PropertyType
  lineItems: QuoteLineItem[]
  createdAt: string
  expiresAt: string
  lead: {
    id: string
    firstName: string
    lastName: string
    company?: string
    leadType: string
    phone: string
    email?: string
    address?: string
  }
}

// Status configurations
const getStatusConfig = (status: QuoteStatus) => {
  const configs: Record<QuoteStatus, {
    color: string;
    icon: React.ComponentType<any>;
    label: string;
  }> = {
    DRAFT: { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: FileText, 
      label: 'Brouillon'
    },
    SENT: { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: Clock, 
      label: 'Envoyé'
    },
    ACCEPTED: { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CheckCircle, 
      label: 'Accepté'
    },
    REJECTED: { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: XCircle, 
      label: 'Refusé'
    },
    EXPIRED: { 
      color: 'bg-orange-100 text-orange-800 border-orange-200', 
      icon: AlertCircle, 
      label: 'Expiré'
    },
    VIEWED: { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: Clock, 
      label: 'Consulté'
    },
    CANCELLED: { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: XCircle, 
      label: 'Annulé'
    }
  }
  return configs[status] || configs.DRAFT
}

export default function QuoteDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if user is admin
  const isAdmin = session?.user && (session.user as any).role === 'ADMIN'

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`)
      if (response.ok) {
        const data = await response.json()
        setQuote(data)
      } else {
        toast.error('Devis introuvable')
        router.push('/quotes')
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
      toast.error('Erreur lors du chargement du devis')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
  }, [quoteId])

  // Handle PDF download
  const handleDownload = async () => {
    if (!quote) return
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `devis-${quote.quoteNumber}.pdf`
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
  const handleDelete = async () => {
    if (!quote || !isAdmin) return

    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Devis ${quote.quoteNumber} supprimé avec succès`)
        router.push('/quotes')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du devis')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Devis introuvable</h3>
            <p className="text-gray-600 mb-6">Le devis demandé n'existe pas ou a été supprimé.</p>
            <Button onClick={() => router.push('/quotes')}>
              Retour aux devis
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusConfig = getStatusConfig(quote.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 mx-3 text-center">
            <h1 className="text-lg font-bold truncate">{quote.quoteNumber}</h1>
            <Badge className={`${statusConfig.color} text-xs border mt-1`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Mobile Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/quotes/${quoteId}/edit`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                Partager
              </DropdownMenuItem>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>
                        Supprimer définitivement le devis <strong>{quote.quoteNumber}</strong> ?
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
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
                <h1 className="text-3xl font-bold">{quote.quoteNumber}</h1>
                <p className="text-gray-600">Créé le {formatDate(quote.createdAt)}</p>
              </div>
              
              <Badge className={`${statusConfig.color} border`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusConfig.label}
              </Badge>
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
                <Share2 className="h-4 w-4" />
                Partager
              </Button>

              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
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
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Quote Overview - Mobile Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Client Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Nom complet</div>
                  <div className="font-medium">
                    {quote.lead.firstName} {quote.lead.lastName}
                  </div>
                </div>
                
                {quote.lead.company && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Entreprise</div>
                    <div className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      {quote.lead.company}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm text-gray-500 mb-1">Téléphone</div>
                  <div className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${quote.lead.phone}`} className="text-blue-600 hover:text-blue-800">
                      {quote.lead.phone}
                    </a>
                  </div>
                </div>
                
                {quote.lead.email && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Email</div>
                    <div className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${quote.lead.email}`} className="text-blue-600 hover:text-blue-800">
                        {quote.lead.email}
                      </a>
                    </div>
                  </div>
                )}
                
                {quote.lead.address && (
                  <div className="sm:col-span-2">
                    <div className="text-sm text-gray-500 mb-1">Adresse</div>
                    <div className="font-medium flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      {quote.lead.address}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Badge variant="outline">
                  {quote.lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
                </Badge>
                <Badge variant="outline">
                  {quote.businessType === 'SERVICE' ? (
                    <><Wrench className="h-3 w-3 mr-1" />Service</>
                  ) : (
                    <><Package className="h-3 w-3 mr-1" />Produit</>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Résumé du Devis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Montant Total</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(quote.finalPrice)}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total HT</span>
                  <span>{formatCurrency(quote.subTotalHT)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA (20%)</span>
                  <span>{formatCurrency(quote.vatAmount)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total TTC</span>
                  <span>{formatCurrency(quote.totalTTC)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Expire le</span>
                </div>
                <div className="font-medium">
                  {formatDate(quote.expiresAt)}
                </div>
              </div>

              {quote.businessType === 'SERVICE' && (quote.surface || quote.levels) && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {quote.surface && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Surface</span>
                        <span>{quote.surface} m²</span>
                      </div>
                    )}
                    {quote.levels && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Niveaux</span>
                        <span>{quote.levels}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Détails du Devis</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.lineItems && quote.lineItems.length > 0 ? (
              <div className="space-y-4">
                {/* Mobile: Card Layout */}
                <div className="lg:hidden space-y-3">
                  {quote.lineItems.map((item, index) => (
                    <div key={item.id || index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="font-medium mb-2">{item.description}</div>
                      {item.detail && (
                        <div className="text-sm text-gray-600 mb-3">{item.detail}</div>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Qté:</span>
                          <div className="font-medium">{item.quantity}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Prix unit.:</span>
                          <div className="font-medium">{formatCurrency(item.unitPrice)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <div className="font-bold text-green-600">{formatCurrency(item.totalPrice)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium text-gray-900">Description</th>
                        <th className="text-center py-3 font-medium text-gray-900">Quantité</th>
                        <th className="text-right py-3 font-medium text-gray-900">Prix Unitaire</th>
                        <th className="text-right py-3 font-medium text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.lineItems.map((item, index) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-4">
                            <div className="font-medium">{item.description}</div>
                            {item.detail && (
                              <div className="text-sm text-gray-600 mt-1">{item.detail}</div>
                            )}
                          </td>
                          <td className="py-4 text-center">{item.quantity}</td>
                          <td className="py-4 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-4 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Aucun détail disponible pour ce devis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Mobile */}
        <div className="lg:hidden grid grid-cols-1 gap-3">
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Télécharger le PDF
          </Button>
          <Link href={`/quotes/${quoteId}/edit`}>
            <Button variant="outline" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Modifier le Devis
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}