// app/(administration)/subscriptions/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import { Lead, SubscriptionType, SubscriptionStatus } from '@prisma/client'
import { toast } from 'sonner'

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

export default function NewSubscriptionPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadWithSubscription[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    leadId: '',
    type: SubscriptionType.BRONZE,
    status: SubscriptionStatus.ACTIVE,
    monthlyPrice: '',
    discount: '0',
    nextBilling: '',
    includedServices: '1',
    usedServices: '0'
  })

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads?status=QUALIFIED,COMPLETED')
        if (!response.ok) throw new Error('Failed to fetch leads')
        const data = await response.json()
        setLeads(data.filter((lead: LeadWithSubscription) => !lead.subscription))
      } catch (error) {
        toast.error('Impossible de charger les leads')
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

      if (!response.ok) throw new Error('Failed to create subscription')

      toast.success('Abonnement créé avec succès!')
      router.push('/subscriptions')
    } catch (error) {
      toast.error('Erreur lors de la création de l\'abonnement')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/subscriptions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Nouvel Abonnement
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez un nouvel abonnement pour un client
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélection du Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="lead">Client *</Label>
              <Select onValueChange={(value) => handleSelectChange('leadId', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName} - {lead.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de l'Abonnement</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type d'abonnement *</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze (299 MAD/mois)</SelectItem>
                  <SelectItem value="SILVER">Silver (599 MAD/mois)</SelectItem>
                  <SelectItem value="GOLD">Gold (999 MAD/mois)</SelectItem>
                  <SelectItem value="PLATINUM">Platinum (1499 MAD/mois)</SelectItem>
                  <SelectItem value="CUSTOM">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Statut</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="PAUSED">En pause</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                  <SelectItem value="EXPIRED">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="monthlyPrice">Prix mensuel (MAD) *</Label>
              <Input
                id="monthlyPrice"
                type="number"
                step="0.01"
                value={formData.monthlyPrice}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="discount">Remise (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="includedServices">Services inclus</Label>
              <Input
                id="includedServices"
                type="number"
                min="1"
                value={formData.includedServices}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="usedServices">Services utilisés</Label>
              <Input
                id="usedServices"
                type="number"
                min="0"
                value={formData.usedServices}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="nextBilling">Prochaine facturation *</Label>
              <Input
                id="nextBilling"
                type="date"
                value={formData.nextBilling}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-enarva-gradient rounded-lg px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Création...' : 'Créer l\'Abonnement'}
          </Button>
        </div>
      </form>
    </div>
  )
}