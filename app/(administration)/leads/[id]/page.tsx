// app/(administration)/leads/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Calendar,
  Edit,
  Trash2,
  FileText,
  ClipboardList,
  User,
  Users,
  Package,
  DollarSign,
  Clock,
  Target,
  AlertCircle,
  Activity,
  Plus,
  Loader2,
  Eye,
  Briefcase
} from 'lucide-react'
import { Lead, Quote, Mission, Activity as ActivityType, User as UserType, LeadStatus, QuoteStatus, ServiceType } from '@prisma/client'
import { formatDate, formatCurrency, translate } from '@/lib/utils'
import { toast } from 'sonner'
import { usePusherChannel } from '@/hooks/usePusherClient'
import { LeadTimeline } from '@/components/leads/LeadTimeLine'

type LeadWithRelations = Lead & {
  assignedTo?: UserType | null
  quotes: Quote[]
  missions: (Mission & {
    teamLeader?: UserType | null
    quote?: Quote | null
  })[]
  activities: (ActivityType & {
    user: {
      name: string | null
      role: string
    }
  })[]
}

 // Translation helper for ServiceType
const translateServiceType = (serviceType: ServiceType): string => {
  const translations: Record<ServiceType, string> = {
    GRAND_MENAGE: 'Grand Ménage',
    NETTOYAGE_FIN_CHANTIER: 'Nettoyage de Fin-Chantier',
    NETTOYAGE_CANAPES_MATELAS: 'Nettoyage des Canapés & Matelas',
    NETTOYAGE_TAPIS_MOQUETTES: 'Nettoyage des Tapis & Moquettes',
    NETTOYAGE_VITRES: 'Nettoyage des Vitres',
    TRAITEMENT_SOL: 'Traitement de Sol',
    NETTOYAGE_FOURS: 'Nettoyage des Fours',
    ENTRETIEN_JARDIN: 'Entretien de Jardin',
    ENTRETIEN_PISCINE: 'Entretien de Piscine',
    NETTOYAGE_FACADE: 'Nettoyage de Façade',
    DESINFECTION_SANITAIRE: 'Désinfection Sanitaire',
    NETTOYAGE_BUREAUX: 'Nettoyage de Bureaux',
    ENTRETIEN_REGULIER: 'Entretien Régulier',
    CRISTALLISATION_MARBRE: 'Cristallisation de Marbre',
    VITRIFICATION_PARQUET: 'Vitrification de Parquet',
    DECAPAGE_SOL: 'Décapage de Sol',
    LUSTRAGE_MARBRE: 'Lustrage de Marbre',
    POLISSAGE_BETON: 'Polissage de Béton',
    RENOVATION_SOL: 'Rénovation de Sol',
    TRAITEMENT_ANTI_NUISIBLE: 'Traitement Anti-Nuisible',
    LAVAGE_VOITURE_DOMICILE: 'Lavage de Voiture à Domicile',
    AUTRES: 'Autres Services',
  }
  return translations[serviceType] || serviceType
}

// FIXED: Complete statusColors mapping with ALL LeadStatus enum values
const statusColors: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  TO_QUALIFY: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  WAITING_INFO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  QUALIFIED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  VISIT_PLANNED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  ON_VISIT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  VISIT_DONE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  QUOTE_SENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  QUOTE_ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  QUOTE_REFUSED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  MISSION_SCHEDULED: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  INTERVENTION_PLANNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  INTERVENTION_IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  INTERVENTION_DONE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  QUALITY_CONTROL: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  CLIENT_TO_CONFIRM_END: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  CLIENT_CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  DELIVERY_PLANNED: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400 border-lime-200 dark:border-lime-800',
  DELIVERY_DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  SIGNED_DELIVERY_NOTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  PAID_OFFICIAL: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  PAID_CASH: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  REFUNDED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  PENDING_REFUND: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  FOLLOW_UP_SENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  UPSELL_IN_PROGRESS: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  UPSELL_CONVERTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  REWORK_PLANNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  REWORK_DONE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  UNDER_WARRANTY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  AFTER_SALES_SERVICE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  CLIENT_ISSUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  IN_DISPUTE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  CLIENT_PAUSED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  LEAD_LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  CANCELED_BY_CLIENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  CANCELED_BY_ENARVA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  INTERNAL_REVIEW: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  AWAITING_PARTS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  CONTRACT_SIGNED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  UNDER_CONTRACT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  SUBCONTRACTED: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  OUTSOURCED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  WAITING_THIRD_PARTY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  PRODUCT_ONLY: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  PRODUCT_SUPPLIER: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  DELIVERY_ONLY: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400 border-lime-200 dark:border-lime-800',
  AFFILIATE_LEAD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  SUBCONTRACTOR_LEAD: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
}

const leadTypeIcons = {
  PARTICULIER: User,
  PROFESSIONNEL: Building2,
  PUBLIC: Building2,
  SYNDIC: Users,
  NGO: Users,
  OTHER: User
}

const urgencyColors = {
  IMMEDIATE: 'bg-red-500 text-white',
  HIGH_URGENT: 'bg-orange-500 text-white',
  URGENT: 'bg-yellow-500 text-black',
  NORMAL: 'bg-blue-500 text-white',
  LOW: 'bg-gray-500 text-white'
}

const missionStatusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUALITY_CHECK: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  CLIENT_VALIDATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

// FIXED: Added CANCELLED status to quoteStatusColors
const quoteStatusColors: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CANCELLED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
}

export default function LeadDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<LeadWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch lead data
  useEffect(() => {
    const fetchLead = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/leads/${leadId}`)
        if (!response.ok) {
          throw new Error('Lead non trouvé')
        }
        const data = await response.json()
        console.log('Lead data fetched:', data) // Debug log
        setLead(data)
      } catch (error: any) {
        toast.error(error.message || 'Erreur lors du chargement du lead')
        router.push('/leads')
      } finally {
        setIsLoading(false)
      }
    }

    if (leadId) {
      fetchLead()
    }
  }, [leadId, router])

  // Pusher real-time updates
  usePusherChannel('leads-channel', {
    'lead-updated': (updatedLead: any) => {
      if (updatedLead.id === leadId) {
        setLead((prev) => prev ? { ...prev, ...updatedLead } : null)
        toast.success('Lead mis à jour')
      }
    },
    'lead-status-changed': (data: any) => {
      if (data.id === leadId) {
        setLead((prev) => prev ? { ...prev, status: data.newStatus } : null)
        toast.info(`Statut changé vers ${translate(data.newStatus)}`)
      }
    },
    'lead-assigned': (data: any) => {
      if (data.id === leadId) {
        setLead((prev) => prev ? { ...prev, assignedToId: data.newAssignedToId } : null)
        toast.info('Assignation mise à jour')
      }
    }
  })

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lead ? Cette action est irréversible.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de la suppression')
      }

      toast.success('Lead supprimé avec succès')
      router.push('/leads')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="main-content flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-enarva-start mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du lead...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="main-content">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lead non trouvé</h3>
            <p className="text-muted-foreground mb-4">Ce lead n'existe pas ou a été supprimé.</p>
            <Link href="/leads">
              <Button>Retour aux leads</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const LeadTypeIcon = leadTypeIcons[lead.leadType]
  const scoreColor = lead.score! >= 70 ? 'text-green-600' : lead.score! >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="main-content">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/leads">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <LeadTypeIcon className="h-6 w-6 text-enarva-start" />
                  {lead.firstName} {lead.lastName}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {lead.company || 'Particulier'} • Créé le {formatDate(lead.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusColors[lead.status]}>
                {translate(lead.status)}
              </Badge>
              {lead.urgencyLevel && (
                <Badge className={urgencyColors[lead.urgencyLevel]}>
                  {translate(lead.urgencyLevel)}
                </Badge>
              )}
              <Link href={`/leads/${lead.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </Link>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="thread-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Score Lead</p>
                    <p className={`text-2xl font-bold ${scoreColor}`}>{lead.score || 0}%</p>
                  </div>
                  <Target className="h-8 w-8 text-enarva-start" />
                </div>
              </CardContent>
            </Card>

            <Card className="thread-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Devis</p>
                    <p className="text-2xl font-bold">{lead.quotes?.length || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="thread-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Missions</p>
                    <p className="text-2xl font-bold">{lead.missions?.length || 0}</p>
                  </div>
                  <ClipboardList className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="thread-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Activités</p>
                    <p className="text-2xl font-bold">{lead.activities?.length || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="details" className="text-xs sm:text-sm">
                <User className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Détails</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="quotes" className="text-xs sm:text-sm">
                <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                Devis ({lead.quotes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="missions" className="text-xs sm:text-sm">
                <ClipboardList className="h-4 w-4 mr-1 sm:mr-2" />
                Missions ({lead.missions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm">
                <Activity className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Activité</span>
                <span className="sm:hidden">Act.</span>
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-6">
              {/* Contact Information */}
              <Card className="thread-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-enarva-start" />
                    Coordonnées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                      <p className="mt-1 font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </p>
                    </div>

                    {lead.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="mt-1 font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {lead.email}
                        </p>
                      </div>
                    )}

                    {lead.serviceType && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Service Demandé</label>
                        <p className="mt-1 font-medium flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-enarva-start" />
                          {translateServiceType(lead.serviceType)}
                        </p>
                      </div>
                    )}

                    {lead.address && (
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                        <p className="mt-1 flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                          {lead.address}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              {(lead.leadType !== 'PARTICULIER' || lead.company) && (
                <Card className="thread-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-enarva-start" />
                      Informations Professionnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type de Lead</label>
                        <p className="mt-1 font-medium">{translate(lead.leadType)}</p>
                      </div>

                      {lead.company && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Entreprise</label>
                          <p className="mt-1 font-medium">{lead.company}</p>
                        </div>
                      )}

                      {lead.iceNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">ICE</label>
                          <p className="mt-1 font-medium">{lead.iceNumber}</p>
                        </div>
                      )}

                      {lead.activitySector && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Secteur d'Activité</label>
                          <p className="mt-1">{lead.activitySector}</p>
                        </div>
                      )}

                      {lead.contactPosition && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Poste</label>
                          <p className="mt-1">{lead.contactPosition}</p>
                        </div>
                      )}

                      {lead.department && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Département</label>
                          <p className="mt-1">{lead.department}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Details */}
              <Card className="thread-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-enarva-start" />
                    Détails du Projet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lead.propertyType && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type de Propriété</label>
                        <p className="mt-1">{translate(lead.propertyType)}</p>
                      </div>
                    )}

                    {lead.estimatedSurface && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Surface Estimée</label>
                        <p className="mt-1">{lead.estimatedSurface} m²</p>
                      </div>
                    )}

                    {lead.budgetRange && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Budget</label>
                        <p className="mt-1 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {lead.budgetRange}
                        </p>
                      </div>
                    )}

                    {lead.urgencyLevel && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Niveau d'Urgence</label>
                        <Badge className={urgencyColors[lead.urgencyLevel]}>
                          {translate(lead.urgencyLevel)}
                        </Badge>
                      </div>
                    )}

                    {lead.frequency && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Fréquence</label>
                        <p className="mt-1">{translate(lead.frequency)}</p>
                      </div>
                    )}

                    {lead.channel && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Canal d'Acquisition</label>
                        <p className="mt-1">{translate(lead.channel)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Information */}
              <Card className="thread-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-enarva-start" />
                    Gestion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date de Création</label>
                      <p className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(lead.createdAt)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Dernière Mise à Jour</label>
                      <p className="mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatDate(lead.updatedAt)}
                      </p>
                    </div>

                    {lead.assignedTo && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Assigné à</label>
                        <div className="mt-2 flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={lead.assignedTo.image || undefined} />
                            <AvatarFallback>
                              {lead.assignedTo.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{lead.assignedTo.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.assignedTo.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Original Message */}
              {lead.originalMessage && (
                <Card className="thread-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-enarva-start" />
                      Message Original
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-secondary/50 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{lead.originalMessage}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="mt-6">
              {lead.quotes && lead.quotes.length > 0 ? (
                <div className="space-y-4">
                  {lead.quotes.map((quote) => (
                    <Card key={quote.id} className="thread-card hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{quote.quoteNumber}</h3>
                              <Badge className={quoteStatusColors[quote.status]}>
                                {translate(quote.status)}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>Type: {translate(quote.businessType)}</p>
                              <p>Créé le: {formatDate(quote.createdAt)}</p>
                              {quote.expiresAt && (
                                <p>Expire le: {formatDate(quote.expiresAt)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-enarva-start">
                                {formatCurrency(Number(quote.finalPrice))}
                              </p>
                              <p className="text-xs text-muted-foreground">Prix final TTC</p>
                            </div>
                            <Link href={`/quotes/${quote.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="thread-card">
                  <CardContent className="py-10 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun devis</h3>
                    <p className="text-muted-foreground mb-4">
                      Aucun devis n'a été créé pour ce lead.
                    </p>
                    <Link href={`/quotes/new?leadId=${lead.id}`}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un devis
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Missions Tab */}
            <TabsContent value="missions" className="mt-6">
              {lead.missions && lead.missions.length > 0 ? (
                <div className="space-y-4">
                  {lead.missions.map((mission) => (
                    <Card key={mission.id} className="thread-card hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{mission.missionNumber}</h3>
                              <Badge className={missionStatusColors[mission.status]}>
                                {translate(mission.status)}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(mission.scheduledDate)}
                              </p>
                              <p className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {mission.address}
                              </p>
                              {mission.teamLeader && (
                                <p className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Chef d'équipe: {mission.teamLeader.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <Link href={`/missions/${mission.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Voir mission
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="thread-card">
                  <CardContent className="py-10 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune mission</h3>
                    <p className="text-muted-foreground mb-4">
                      Aucune mission n'a été créée pour ce lead.
                    </p>
                    <Link href={`/missions/new?leadId=${lead.id}`}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une mission
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-6">
              {lead.activities && lead.activities.length > 0 ? (
                <div className="space-y-4">
                  {lead.activities.map((activity) => (
                    <Card key={activity.id} className="thread-card">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-enarva-start/10 flex items-center justify-center">
                              <Activity className="h-5 w-5 text-enarva-start" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-medium text-sm">{activity.title}</h4>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(activity.createdAt)}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {activity.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{activity.user.name}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {translate(activity.type)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="thread-card">
                  <CardContent className="py-10 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune activité</h3>
                    <p className="text-muted-foreground">
                      Aucune activité enregistrée pour ce lead.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky Timeline - Desktop only */}
        <div className="hidden lg:block lg:w-[272px] xl:w-[326px]">
          <div className="sticky top-6">
            <LeadTimeline lead={lead} />
          </div>
        </div>
      </div>

      {/* Mobile Timeline - Bottom positioned */}
      <div className="lg:hidden mt-6">
        <LeadTimeline lead={lead} />
      </div>
    </div>
  )
}