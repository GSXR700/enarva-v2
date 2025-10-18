// app/(administration)/quotes/[id]/page.tsx
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
  MoreVertical,
  TrendingUp,
  DollarSign,
  Percent,
  Hash,
  Briefcase,
  Home,
  Layers,
  MapPinned,
  Truck,
  ShoppingCart,
  ClipboardList,
  Info
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
import { WaveLoader } from '@/components/pdf/WaveLoader'
import '@/components/pdf/WaveLoader.css'

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
  type?: 'EXPRESS' | 'STANDARD' | 'PREMIUM'
  serviceType?: string
  finalPrice: number
  subTotalHT: number
  vatAmount: number
  totalTTC: number
  surface?: number
  levels?: number
  propertyType?: PropertyType
  productCategory?: string
  deliveryType?: string
  deliveryAddress?: string
  deliveryNotes?: string
  purchaseOrderNumber?: string
  orderedBy?: string
  materials?: {
    marble?: boolean
    parquet?: boolean
    tiles?: boolean
    carpet?: boolean
    concrete?: boolean
    porcelain?: boolean
    cladding?: boolean
    composite_wood?: boolean
    pvc?: boolean
    other?: string
  }
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
    iceNumber?: string
    activitySector?: string
  }
}

const getStatusConfig = (status: QuoteStatus) => {
  const configs: Record<QuoteStatus, {
    color: string;
    icon: React.ComponentType<any>;
    label: string;
  }> = {
    DRAFT: { 
      color: 'bg-muted text-muted-foreground border-border', 
      icon: FileText, 
      label: 'Brouillon'
    },
    SENT: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-600', 
      icon: Clock, 
      label: 'Envoyé'
    },
    ACCEPTED: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-600', 
      icon: CheckCircle, 
      label: 'Accepté'
    },
    REJECTED: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-600', 
      icon: XCircle, 
      label: 'Refusé'
    },
    EXPIRED: { 
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-600', 
      icon: AlertCircle, 
      label: 'Expiré'
    },
    VIEWED: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-600', 
      icon: Clock, 
      label: 'Consulté'
    },
    CANCELLED: { 
      color: 'bg-muted text-muted-foreground border-border', 
      icon: XCircle, 
      label: 'Annulé'
    }
  }
  return configs[status] || configs.DRAFT
}

const getPropertyTypeLabel = (propertyType?: PropertyType | string) => {
  const labels: Record<string, string> = {
    VILLA_SMALL: 'Villa Petite',
    VILLA_MEDIUM: 'Villa Moyenne',
    VILLA_LARGE: 'Villa Grande',
    APARTMENT_SMALL: 'Appt Petit',
    APARTMENT_MEDIUM: 'Appt Moyen',
    APARTMENT_LARGE: 'Appt Grand',
    APARTMENT_MULTI: 'Appt Multi-étages',
    OFFICE: 'Bureau',
    COMMERCIAL: 'Commercial',
    BUILDING: 'Immeuble',
    WAREHOUSE: 'Entrepôt',
    INDUSTRIAL: 'Industriel',
    OTHER: 'Autre'
  }
  return propertyType ? labels[propertyType] || propertyType : 'Non spécifié'
}

const getProductCategoryLabel = (category?: string) => {
  const labels: Record<string, string> = {
    EQUIPMENT: 'Équipement',
    CONSUMABLES: 'Consommables',
    FURNITURE: 'Mobilier',
    ELECTRONICS: 'Électronique',
    DECORATION: 'Décoration',
    TEXTILES: 'Textiles',
    LIGHTING: 'Éclairage',
    STORAGE: 'Rangement',
    KITCHEN_ITEMS: 'Articles de cuisine',
    BATHROOM_ITEMS: 'Articles SDB',
    OFFICE_SUPPLIES: 'Fournitures bureau',
    OTHER: 'Autre'
  }
  return category ? labels[category] || category : 'Non spécifiée'
}

const getDeliveryTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    STANDARD_DELIVERY: 'Livraison standard',
    EXPRESS_DELIVERY: 'Livraison express',
    PICKUP: 'Retrait sur site',
    SCHEDULED_DELIVERY: 'Livraison planifiée',
    WHITE_GLOVE: 'Service premium'
  }
  return type ? labels[type] || type : 'Standard'
}

export default function QuoteDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

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

  const handleDownload = async () => {
    if (!quote) return
    
    setIsGeneratingPdf(true)
    
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
    } finally {
      setIsGeneratingPdf(false)
    }
  }

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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Devis introuvable</h3>
            <p className="text-muted-foreground mb-6">Le devis demandé n'existe pas ou a été supprimé.</p>
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
  const isServiceQuote = quote.businessType === 'SERVICE'
  const isProductQuote = quote.businessType === 'PRODUCT'

  // Calculate metrics
  const marginRate = quote.subTotalHT > 0 ? ((quote.finalPrice - quote.subTotalHT) / quote.subTotalHT * 100).toFixed(1) : '0'
  const averageItemValue = quote.lineItems.length > 0 ? (quote.subTotalHT / quote.lineItems.length) : 0

  return (
    <div className="min-h-screen bg-background">
      <WaveLoader 
        isLoading={isGeneratingPdf}
        documentTitle="Téléchargement de votre devis"
      />

      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 mx-3 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{quote.quoteNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusConfig.color} text-xs border`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {isServiceQuote && <Wrench className="h-3 w-3 text-muted-foreground" />}
              {isProductQuote && <Package className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload} disabled={isGeneratingPdf}>
                <Download className="mr-2 h-4 w-4" />
                PDF
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
                        Supprimer définitivement le devis <strong>{quote.quoteNumber}</strong> ?
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90"
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
      <div className="hidden lg:block bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="h-10 w-10 p-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{quote.quoteNumber}</h1>
                  <Badge className={`${statusConfig.color} border`}>
                    <StatusIcon className="w-4 h-4 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  {isServiceQuote && (
                    <Badge variant="outline" className="border-blue-300 dark:border-blue-600">
                      <Wrench className="w-3 h-3 mr-1" />
                      Service
                    </Badge>
                  )}
                  {isProductQuote && (
                    <Badge variant="outline" className="border-purple-300 dark:border-purple-600">
                      <Package className="w-3 h-3 mr-1" />
                      Produit
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Créé le {formatDate(quote.createdAt)} • Expire le {formatDate(quote.expiresAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isGeneratingPdf}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              
              <Link href={`/quotes/${quoteId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </Link>

              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>

              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
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
                        <span className="text-destructive font-medium">
                          Cette action est irréversible.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90"
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
      <div className="max-w-7xl mx-auto p-3 lg:p-6 space-y-4 lg:space-y-6">
        {/* Key Metrics - Power BI Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Total Amount */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <TrendingUp className="h-4 w-4 text-primary/60" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-primary mb-1">
                {formatCurrency(quote.finalPrice)}
              </div>
              <p className="text-xs text-muted-foreground">Montant Total TTC</p>
            </CardContent>
          </Card>

          {/* Margin Rate */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Percent className="h-5 w-5 text-green-600 dark:text-green-500" />
                <Info className="h-4 w-4 text-green-600/60 dark:text-green-500/60" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-500 mb-1">
                {marginRate}%
              </div>
              <p className="text-xs text-muted-foreground">Taux de Marge</p>
            </CardContent>
          </Card>

          {/* Items Count */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Hash className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                <ClipboardList className="h-4 w-4 text-blue-600/60 dark:text-blue-500/60" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-500 mb-1">
                {quote.lineItems.length}
              </div>
              <p className="text-xs text-muted-foreground">{isServiceQuote ? 'Services' : 'Produits'}</p>
            </CardContent>
          </Card>

          {/* Average Item Value */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                <TrendingUp className="h-4 w-4 text-purple-600/60 dark:text-purple-500/60" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-purple-600 dark:text-purple-500 mb-1">
                {formatCurrency(averageItemValue)}
              </div>
              <p className="text-xs text-muted-foreground">Valeur Moyenne</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Client Information - Full Width on Mobile */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <User className="h-5 w-5" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Client Name & Type */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {quote.lead.firstName} {quote.lead.lastName}
                    </h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {quote.lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'}
                      </Badge>
                      {quote.lead.company && (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30">
                          <Building className="h-3 w-3 mr-1" />
                          B2B
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quote.lead.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Entreprise</p>
                        <p className="font-medium text-sm truncate">{quote.lead.company}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <a href={`tel:${quote.lead.phone}`} className="font-medium text-sm text-primary hover:underline">
                        {quote.lead.phone}
                      </a>
                    </div>
                  </div>

                  {quote.lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a href={`mailto:${quote.lead.email}`} className="font-medium text-sm text-primary hover:underline truncate block">
                          {quote.lead.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {quote.lead.iceNumber && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">ICE</p>
                        <p className="font-medium text-sm">{quote.lead.iceNumber}</p>
                      </div>
                    </div>
                  )}

                  {quote.lead.activitySector && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Secteur</p>
                        <p className="font-medium text-sm truncate">{quote.lead.activitySector}</p>
                      </div>
                    </div>
                  )}

                  {quote.lead.address && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Adresse</p>
                        <p className="font-medium text-sm">{quote.lead.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <FileText className="h-5 w-5" />
                Résumé Financier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">MONTANT TOTAL</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(quote.finalPrice)}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span className="font-medium">{formatCurrency(quote.subTotalHT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA (20%)</span>
                    <span className="font-medium">{formatCurrency(quote.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t border-border">
                    <span>Total TTC</span>
                    <span>{formatCurrency(quote.totalTTC)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Expire le</span>
                  </div>
                  <p className="font-medium text-sm">{formatDate(quote.expiresAt)}</p>
                </div>

                {quote.type && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type de Devis</p>
                      <Badge variant="outline" className="text-xs">
                        {quote.type}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service/Product Specific Details */}
        {isServiceQuote && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Service Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Wrench className="h-5 w-5" />
                  Détails du Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.serviceType && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-muted-foreground">Type de Service</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-600">
                        {quote.serviceType}
                      </Badge>
                    </div>
                  )}

                  {quote.propertyType && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-muted-foreground">Type de Bien</span>
                      </div>
                      <span className="text-sm font-medium">{getPropertyTypeLabel(quote.propertyType)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {quote.surface && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPinned className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Surface</span>
                        </div>
                        <p className="text-lg font-bold">{quote.surface} m²</p>
                      </div>
                    )}

                    {quote.levels && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Niveaux</span>
                        </div>
                        <p className="text-lg font-bold">{quote.levels}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials Selection */}
            {quote.materials && Object.values(quote.materials).some(v => v) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Package className="h-5 w-5" />
                    Matériaux Présents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {quote.materials.marble && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>💎</span>
                        <span className="truncate">Marbre</span>
                      </div>
                    )}
                    {quote.materials.parquet && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🪵</span>
                        <span className="truncate">Parquet</span>
                      </div>
                    )}
                    {quote.materials.tiles && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🧱</span>
                        <span className="truncate">Carrelage</span>
                      </div>
                    )}
                    {quote.materials.carpet && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🧵</span>
                        <span className="truncate">Moquette</span>
                      </div>
                    )}
                    {quote.materials.concrete && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🏗️</span>
                        <span className="truncate">Béton</span>
                      </div>
                    )}
                    {quote.materials.porcelain && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🏺</span>
                        <span className="truncate">Porcelaine</span>
                      </div>
                    )}
                    {quote.materials.cladding && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🏠</span>
                        <span className="truncate">Bardage</span>
                      </div>
                    )}
                    {quote.materials.composite_wood && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>🌳</span>
                        <span className="truncate">Bois comp.</span>
                      </div>
                    )}
                    {quote.materials.pvc && (
                      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded text-xs">
                        <span>📦</span>
                        <span className="truncate">PVC</span>
                      </div>
                    )}
                  </div>
                  {quote.materials.other && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <span className="text-muted-foreground">Autres: </span>
                      <span className="font-medium">{quote.materials.other}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {isProductQuote && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Product Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Package className="h-5 w-5" />
                  Détails Produit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.productCategory && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-muted-foreground">Catégorie</span>
                      </div>
                      <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-600">
                        {getProductCategoryLabel(quote.productCategory)}
                      </Badge>
                    </div>
                  )}

                  {quote.deliveryType && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-muted-foreground">Livraison</span>
                      </div>
                      <span className="text-sm font-medium">{getDeliveryTypeLabel(quote.deliveryType)}</span>
                    </div>
                  )}

                  {quote.deliveryAddress && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Adresse de livraison</span>
                      </div>
                      <p className="text-sm font-medium">{quote.deliveryAddress}</p>
                    </div>
                  )}

                  {quote.deliveryNotes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Notes de livraison</span>
                      </div>
                      <p className="text-sm">{quote.deliveryNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Purchase Order Info (B2B) */}
            {(quote.purchaseOrderNumber || quote.orderedBy) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <FileText className="h-5 w-5" />
                    Bon de Commande
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quote.purchaseOrderNumber && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-1">
                          <Hash className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-muted-foreground">Numéro BC</span>
                        </div>
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">{quote.purchaseOrderNumber}</p>
                      </div>
                    )}

                    {quote.orderedBy && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Commandé par</span>
                        </div>
                        <p className="text-sm font-medium">{quote.orderedBy}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Line Items - Enhanced for Mobile */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <ClipboardList className="h-5 w-5" />
                {isServiceQuote ? 'Services' : 'Produits'} ({quote.lineItems.length})
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Total: {formatCurrency(quote.subTotalHT)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {quote.lineItems && quote.lineItems.length > 0 ? (
              <div className="space-y-3">
                {/* Mobile: Card Layout */}
                <div className="lg:hidden space-y-3">
                  {quote.lineItems.map((item, index) => (
                    <div key={item.id || index} className="border border-border rounded-lg p-3 bg-gradient-to-br from-muted/30 to-muted/10">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">{item.description}</h4>
                          {item.detail && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.detail}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Qté</p>
                          <p className="font-bold text-sm">{item.quantity}</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Prix U.</p>
                          <p className="font-bold text-sm">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Total</p>
                          <p className="font-bold text-sm text-primary">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left py-3 px-2 font-semibold text-sm">#</th>
                        <th className="text-left py-3 px-2 font-semibold text-sm">Description</th>
                        <th className="text-center py-3 px-2 font-semibold text-sm">Quantité</th>
                        <th className="text-right py-3 px-2 font-semibold text-sm">Prix Unit.</th>
                        <th className="text-right py-3 px-2 font-semibold text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.lineItems.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-2">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                          </td>
                          <td className="py-4 px-2">
                            <div className="font-medium text-sm">{item.description}</div>
                            {item.detail && (
                              <div className="text-xs text-muted-foreground mt-1">{item.detail}</div>
                            )}
                          </td>
                          <td className="py-4 px-2 text-center font-medium text-sm">{item.quantity}</td>
                          <td className="py-4 px-2 text-right font-medium text-sm">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-4 px-2 text-right font-bold text-sm text-primary">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td colSpan={4} className="py-4 px-2 text-right">TOTAL HT:</td>
                        <td className="py-4 px-2 text-right text-primary">{formatCurrency(quote.subTotalHT)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium mb-2">Aucun détail disponible</p>
                <p className="text-sm">Ce devis ne contient aucun élément</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Mobile Only */}
        <div className="lg:hidden grid grid-cols-1 gap-3 pb-6">
          <Button 
            onClick={handleDownload} 
            disabled={isGeneratingPdf} 
            size="lg"
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Download className="h-5 w-5 mr-2" />
            Télécharger le PDF
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/quotes/${quoteId}/edit`} className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                <Edit className="h-5 w-5 mr-2" />
                Modifier
              </Button>
            </Link>
            
            <Button variant="outline" size="lg" className="w-full">
              <Share2 className="h-5 w-5 mr-2" />
              Partager
            </Button>
          </div>
        </div>

        {/* Desktop Bottom Spacing */}
        <div className="hidden lg:block h-8"></div>
      </div>
    </div>
  )
}