// app/(administration)/quotes/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calculator, DollarSign, RefreshCw } from 'lucide-react'
import { formatCurrency, calculateQuotePrice, translations } from '@/lib/utils' // Importation corrigée
import { Lead } from '@prisma/client'
import { toast } from 'sonner'

type QuoteFormData = {
  leadId: string;
  leadName: string;
  surface: string;
  propertyType: string;
  levels: string;
  materials: string;
  distance: string;
  accessibility: string;
  urgency: string;
  finalPrice: string;
};

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [formData, setFormData] = useState<QuoteFormData>({
    leadId: searchParams.get('leadId') || '',
    leadName: searchParams.get('leadName') || '',
    surface: searchParams.get('surface') || '',
    propertyType: searchParams.get('propertyType') || '',
    levels: '1',
    materials: 'STANDARD',
    distance: '0',
    accessibility: 'EASY', // Champ réintégré
    urgency: 'NORMAL',     // Champ réintégré
    finalPrice: '',
  });

  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads');
        if (!response.ok) throw new Error("Impossible de charger les leads.");
        const data = await response.json();
        setLeads(data);
      } catch (error) {
        toast.error("Erreur lors du chargement des leads.");
      }
    };
    fetchLeads();
  }, []);

  useEffect(() => {
    const canCalculate = formData.surface && formData.propertyType && formData.accessibility && formData.urgency;
    if (canCalculate) {
      const calculated = calculateQuotePrice({
        surface: parseInt(formData.surface, 10) || 0,
        propertyType: formData.propertyType,
        materials: formData.materials,
        levels: parseInt(formData.levels, 10) || 1,
        distance: parseInt(formData.distance, 10) || 0,
        accessibility: formData.accessibility,
        urgency: formData.urgency,
      });
      setSuggestedPrice(calculated.finalPrice);
      // Mettre à jour le prix final uniquement s'il n'a pas été modifié manuellement
      if (formData.finalPrice === '' || formData.finalPrice === suggestedPrice?.toString()) {
        setFormData(prev => ({ ...prev, finalPrice: calculated.finalPrice.toString() }));
      }
    } else {
      setSuggestedPrice(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.surface, formData.propertyType, formData.materials, formData.levels, formData.distance, formData.accessibility, formData.urgency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof QuoteFormData, value: string) => {
    if (id === 'leadId') {
      const selectedLead = leads.find(lead => lead.id === value);
      if (selectedLead) {
        setFormData(prev => ({
          ...prev,
          leadId: selectedLead.id,
          leadName: `${selectedLead.firstName} ${selectedLead.lastName}`,
          surface: selectedLead.estimatedSurface?.toString() || '',
          propertyType: selectedLead.propertyType || '',
          accessibility: selectedLead.accessibility || 'EASY',
          urgency: selectedLead.urgencyLevel || 'NORMAL',
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!formData.finalPrice || !formData.leadId) {
      toast.error("Veuillez sélectionner un lead et définir un prix final.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quoteNumber: `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          surface: parseInt(formData.surface),
          levels: parseInt(formData.levels),
          distance: parseInt(formData.distance),
          finalPrice: parseFloat(formData.finalPrice),
        }),
      });

      if (!response.ok) throw new Error('Échec de la création du devis.');
      
      toast.success("Devis créé avec succès !");
      router.push('/quotes');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Créer un Devis Express</h1>
          <p className="text-muted-foreground mt-1">Générez un devis instantané avec un prix suggéré et ajustable.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="thread-card md:col-span-2">
          <CardHeader>
            <CardTitle>Détails de la Prestation</CardTitle>
            <CardDescription>Fournissez les informations pour générer le devis.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="leadId">Sélectionner un Lead</Label>
                <Select value={formData.leadId} onValueChange={(value) => handleSelectChange('leadId', value)} required>
                  <SelectTrigger><SelectValue placeholder="Choisir un lead..." /></SelectTrigger>
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
                <Label htmlFor="surface">Surface estimée (m²)</Label>
                <Input id="surface" type="number" value={formData.surface} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="propertyType">Type de propriété</Label>
                <Select value={formData.propertyType} onValueChange={(value) => handleSelectChange('propertyType', value)} required>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{Object.entries(translations.PropertyType).map(([key, value]: [string, unknown]) => <SelectItem key={key} value={key}>{String(value)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="materials">Type de matériaux</Label>
                <Select value={formData.materials} onValueChange={(value) => handleSelectChange('materials', value)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="MARBLE">Marbre</SelectItem>
                    <SelectItem value="PARQUET">Parquet</SelectItem>
                    <SelectItem value="LUXURY">Luxe</SelectItem>
                    <SelectItem value="MIXED">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="levels">Nombre d'étages</Label><Input id="levels" type="number" value={formData.levels} onChange={handleChange} /></div>
              <div><Label htmlFor="distance">Distance (km)</Label><Input id="distance" type="number" value={formData.distance} onChange={handleChange} /></div>
              <div>
                <Label htmlFor="accessibility">Accessibilité</Label>
                <Select value={formData.accessibility} onValueChange={(value) => handleSelectChange('accessibility', value)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{Object.entries(translations.AccessibilityLevel).map(([k, v]: [string, unknown]) => <SelectItem key={k} value={k}>{String(v)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
               <div>
                <Label htmlFor="urgency">Niveau d'urgence</Label>
                <Select value={formData.urgency} onValueChange={(value) => handleSelectChange('urgency', value)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{Object.entries(translations.UrgencyLevel).map(([k, v]: [string, unknown]) => <SelectItem key={k} value={k}>{String(v)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
          </CardContent>
        </Card>

        <div className="md:col-span-1 space-y-6">
          <Card className="thread-card sticky top-20">
            <CardHeader>
              <CardTitle>Calcul du Devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="text-xs text-muted-foreground">Prix Suggéré par le système</Label>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-muted-foreground">
                            {suggestedPrice ? formatCurrency(suggestedPrice) : '--- MAD'}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData(prev => ({...prev, finalPrice: suggestedPrice?.toString() || ''}))}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <Label htmlFor="finalPrice" className="font-semibold">Prix Final (MAD)</Label>
                     <Input 
                        id="finalPrice"
                        type="number"
                        className="text-2xl font-bold h-12 mt-1 border-2 border-primary"
                        value={formData.finalPrice}
                        onChange={handleChange}
                        required
                    />
                </div>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full bg-enarva-gradient py-6 text-lg rounded-lg" disabled={isLoading || !formData.finalPrice}>
            <DollarSign className="w-5 h-5 mr-2" />
            {isLoading ? 'Création en cours...' : 'Générer le devis'}
          </Button>
        </div>
      </form>
    </div>
  );
}