// app/(administration)/subscriptions/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Package, DollarSign, Calendar, Loader2, AlertCircle, Users } from 'lucide-react'
import { Lead, SubscriptionType, SubscriptionStatus } from '@prisma/client'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'

type LeadWithSubscription = Lead & {
  subscription?: any;
};

interface FormData {
  leadId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  monthlyPrice: string;
  discount: string;
  nextBilling: string;
  includedServices: string;
  usedServices: string;
}

// Helper function to get next month's date in YYYY-MM-DD format
const getNextMonthDate = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  const isoString = date.toISOString();
  return isoString.substring(0, 10);
};

export default function NewSubscriptionPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadWithSubscription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(true)

  const [formData, setFormData] = useState<FormData>({
    leadId: '',
    type: SubscriptionType.BRONZE,
    status: SubscriptionStatus.ACTIVE,
    monthlyPrice: '299',
    discount: '0',
    nextBilling: getNextMonthDate(),
    includedServices: '1',
    usedServices: '0'
  })

  useEffect(() => {
    const fetchLeads = async () => {
      setLoadingLeads(true)
      try {
        const response = await fetch('/api/leads?status=QUALIFIED,COMPLETED')
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to fetch leads:', response.status, errorText)
          throw new Error('Failed to fetch leads')
        }
        const data = await response.json()
        const leadsList = data.leads || []
        setLeads(leadsList.filter((lead: LeadWithSubscription) => !lead.subscription))
      } catch (error) {
        console.error('Error fetching leads:', error)
        toast.error('Impossible de charger les clients')
        setLeads([])
      } finally {
        setLoadingLeads(false)
      }
    }

    fetchLeads()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const getDefaultPrice = (type: SubscriptionType): string => {
    switch (type) {
      case SubscriptionType.BRONZE: return '299'
      case SubscriptionType.SILVER: return '599'
      case SubscriptionType.GOLD: return '999'
      case SubscriptionType.PLATINUM: return '1499'
      case SubscriptionType.CUSTOM: return ''
      default: return ''
    }
  }

  const getDefaultServices = (type: SubscriptionType): string => {
    switch (type) {
      case SubscriptionType.BRONZE: return '1'
      case SubscriptionType.SILVER: return '2'
      case SubscriptionType.GOLD: return '4'
      case SubscriptionType.PLATINUM: return '8'
      case SubscriptionType.CUSTOM: return '1'
      default: return '1'
    }
  }

  useEffect(() => {
    if (formData.type !== SubscriptionType.CUSTOM) {
      setFormData(prev => ({
        ...prev,
        monthlyPrice: getDefaultPrice(formData.type),
        includedServices: getDefaultServices(formData.type)
      }))
    }
  }, [formData.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.leadId || !formData.monthlyPrice || !formData.nextBilling) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsLoading(true)

    try {
      const subscriptionData = {
        ...formData,
        monthlyPrice: parseFloat(formData.monthlyPrice),
        discount: parseFloat(formData.discount),
        includedServices: parseInt(formData.includedServices),
        usedServices: parseInt(formData.usedServices),
        nextBilling: new Date(formData.nextBilling).toISOString()
      }

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      toast.success('Abonnement créé avec succès!')
      router.push('/subscriptions')
    } catch (error: any) {
      console.error('Error creating subscription:', error)
      toast.error(error.message || 'Erreur lors de la création de l\'abonnement')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingLeads) {
    return (
      <div className="main-content p-3 md:p-6">
        <CardGridSkeleton 
          title="Chargement..." 
          description="Chargement des clients éligibles"
        />
      </div>
    )
  }

  return (
    <div className="main-content p-3 md:p-6 space-y-4 md:space-y-6 pb-20">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/subscriptions">
          <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
            Nouvel Abonnement
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
            Créez un nouvel abonnement pour un client
          </p>
        </div>
      </div>

      {leads.length === 0 && !loadingLeads && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-xs md:text-sm text-amber-800 dark:text-amber-200">
            Aucun client éligible trouvé. Les clients doivent avoir le statut &quot;Qualifié&quot; ou &quot;Terminé&quot; et ne pas avoir d&apos;abonnement actif.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Sélection du Client</CardTitle>
                <CardDescription className="text-xs md:text-sm mt-0.5">
                  Choisissez un client qualifié ou avec projet terminé
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="lead" className="text-xs md:text-sm">Client *</Label>
              {leads.length === 0 ? (
                <div className="text-center py-8 md:py-12 border-2 border-dashed rounded-lg bg-muted/30">
                  <Users className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                  <p className="text-sm md:text-base font-medium text-muted-foreground">Aucun client éligible</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 px-4">
                    Les clients doivent être qualifiés ou avoir un projet terminé
                  </p>
                  <Link href="/leads">
                    <Button variant="outline" size="sm" className="mt-3 md:mt-4 h-8 md:h-9 text-xs md:text-sm">
                      Voir les leads
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select onValueChange={(value) => handleSelectChange('leadId', value)} required>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id} className="text-xs md:text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {lead.firstName} {lead.lastName}
                            {lead.company && <span className="text-muted-foreground ml-1">• {lead.company}</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lead.email || lead.phone}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Détails de l&apos;Abonnement</CardTitle>
                <CardDescription className="text-xs md:text-sm mt-0.5">
                  Configurez le type et le statut
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs md:text-sm">Type d&apos;abonnement *</Label>
                <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)} required>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRONZE" className="text-xs md:text-sm">Bronze - 299 MAD/mois (1 intervention)</SelectItem>
                    <SelectItem value="SILVER" className="text-xs md:text-sm">Silver - 599 MAD/mois (2 interventions)</SelectItem>
                    <SelectItem value="GOLD" className="text-xs md:text-sm">Gold - 999 MAD/mois (4 interventions)</SelectItem>
                    <SelectItem value="PLATINUM" className="text-xs md:text-sm">Platinum - 1499 MAD/mois (8 interventions)</SelectItem>
                    <SelectItem value="CUSTOM" className="text-xs md:text-sm">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs md:text-sm">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE" className="text-xs md:text-sm">Actif</SelectItem>
                    <SelectItem value="PAUSED" className="text-xs md:text-sm">En pause</SelectItem>
                    <SelectItem value="CANCELLED" className="text-xs md:text-sm">Annulé</SelectItem>
                    <SelectItem value="EXPIRED" className="text-xs md:text-sm">Expiré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Tarification</CardTitle>
                <CardDescription className="text-xs md:text-sm mt-0.5">
                  Définissez le prix et les services
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice" className="text-xs md:text-sm">Prix mensuel (MAD) *</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  step="0.01"
                  value={formData.monthlyPrice}
                  onChange={handleChange}
                  placeholder="299.00"
                  className="h-9 md:h-10 text-xs md:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount" className="text-xs md:text-sm">Réduction (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="0"
                  className="h-9 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="includedServices" className="text-xs md:text-sm">Services inclus *</Label>
                <Input
                  id="includedServices"
                  type="number"
                  min="1"
                  value={formData.includedServices}
                  onChange={handleChange}
                  placeholder="1"
                  className="h-9 md:h-10 text-xs md:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usedServices" className="text-xs md:text-sm">Services utilisés</Label>
                <Input
                  id="usedServices"
                  type="number"
                  min="0"
                  value={formData.usedServices}
                  onChange={handleChange}
                  placeholder="0"
                  className="h-9 md:h-10 text-xs md:text-sm"
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Facturation</CardTitle>
                <CardDescription className="text-xs md:text-sm mt-0.5">
                  Planifiez la prochaine facturation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="nextBilling" className="text-xs md:text-sm">Prochaine facturation *</Label>
              <Input
                id="nextBilling"
                type="date"
                value={formData.nextBilling}
                onChange={handleChange}
                className="h-9 md:h-10 text-xs md:text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                La facturation sera effectuée automatiquement à cette date
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 justify-end pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()} 
            disabled={isLoading}
            className="h-9 md:h-10 text-xs md:text-sm w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || leads.length === 0}
            className="h-9 md:h-10 text-xs md:text-sm w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Créer l&apos;Abonnement
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}