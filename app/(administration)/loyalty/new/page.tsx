// app/loyalty/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Star } from 'lucide-react'
import { Lead } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'

const subscriptionPlans = {
  BRONZE: { name: 'Bronze', price: 1000, services: 1, discount: 10 },
  SILVER: { name: 'Silver', price: 1800, services: 2, discount: 15 },
  GOLD: { name: 'Gold', price: 3200, services: 4, discount: 20 },
  PLATINUM: { name: 'Platinum', price: 5000, services: 8, discount: 25 },
};

export default function NewSubscriptionPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof subscriptionPlans>('BRONZE')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeads = async () => {
      const response = await fetch('/api/leads');
      const data = await response.json();
      setLeads(data);
    };
    fetchLeads();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      setError("Veuillez sélectionner un client.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const planDetails = subscriptionPlans[selectedPlan];

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          type: selectedPlan,
          monthlyPrice: planDetails.price,
          includedServices: planDetails.services,
          discount: planDetails.discount,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Échec de la création de l\'abonnement.');
      }

      router.push('/loyalty');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const plan = subscriptionPlans[selectedPlan];

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/loyalty">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Nouvel Abonnement Enarva+</h1>
          <p className="text-muted-foreground mt-1">Ajoutez un client au programme de fidélité.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Configuration de l'Abonnement</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="leadId">Client</Label>
              <Select onValueChange={setSelectedLeadId} required>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName} ({lead.company || 'Particulier'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="plan">Formule d'Abonnement</Label>
              <Select value={selectedPlan} onValueChange={(value: keyof typeof subscriptionPlans) => setSelectedPlan(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(subscriptionPlans).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardContent>
             <Card className="bg-secondary/50 p-4">
                 <CardDescription>
                    La formule <strong>{plan.name}</strong> inclut <strong>{plan.services} nettoyage(s)</strong> par mois
                    pour un tarif de <strong>{formatCurrency(plan.price)}</strong>, avec une remise de <strong>{plan.discount}%</strong> sur les services additionnels.
                 </CardDescription>
             </Card>
          </CardContent>
        </Card>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex justify-end mt-6">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
            <Star className="w-4 h-4 mr-2" />
            {isLoading ? 'Activation en cours...' : 'Activer l\'Abonnement'}
          </Button>
        </div>
      </form>
    </div>
  )
}