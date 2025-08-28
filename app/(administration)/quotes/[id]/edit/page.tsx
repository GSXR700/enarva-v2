// app/(administration)/quotes/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, DollarSign, Save, RefreshCw } from 'lucide-react'
import { formatCurrency, calculateQuotePrice, translations } from '@/lib/utils'
import { Quote, Lead, PropertyType, AccessibilityLevel, UrgencyLevel, MaterialType } from '@prisma/client'
import { toast } from 'sonner'

type QuoteFormData = Partial<Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'lead' | 'coefficients' | 'basePrice' | 'finalPrice' | 'surface' | 'levels' | 'distance'>> & {
  finalPrice: string;
  surface: string;
  levels: string;
  distance: string;
  leadName?: string;
};

// État initial bien typé pour éviter les erreurs
const initialFormData: QuoteFormData = {
    leadId: '',
    quoteNumber: '',
    type: 'STANDARD',
    status: 'DRAFT',
    surface: '',
    propertyType: 'COMMERCIAL',
    levels: '1',
    materials: 'STANDARD',
    distance: '0',
    accessibility: 'EASY',
    urgency: 'NORMAL',
    finalPrice: '',
    leadName: ''
};

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  
  const [formData, setFormData] = useState<QuoteFormData>(initialFormData);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuote = useCallback(async () => {
    try {
        const response = await fetch(`/api/quotes/${quoteId}`);
        if(!response.ok) throw new Error("Devis non trouvé.");
        const data = await response.json();
        
        // Nettoyer les données pour le formulaire
        const cleanedData: any = {};
        for (const key in data) {
            cleanedData[key] = data[key] === null ? '' : data[key];
        }

        setFormData({
            ...cleanedData,
            leadName: `${data.lead.firstName} ${data.lead.lastName}`,
            surface: String(data.surface),
            levels: String(data.levels),
            distance: String(data.distance),
            finalPrice: String(Number(data.finalPrice)),
        });
    } catch (error) {
        toast.error("Impossible de charger les données du devis.");
        router.push('/quotes');
    } finally {
        setIsLoading(false);
    }
  }, [quoteId, router]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  useEffect(() => {
    const { surface, propertyType, accessibility, urgency, materials, levels, distance } = formData;
    if (surface && propertyType && accessibility && urgency) {
      const calculated = calculateQuotePrice({
        surface: parseInt(String(surface), 10) || 0,
        propertyType: propertyType,
        materials: materials!,
        levels: parseInt(String(levels), 10) || 1,
        distance: parseInt(String(distance), 10) || 0,
        accessibility: accessibility,
        urgency: urgency,
      });
      setSuggestedPrice(calculated.finalPrice);
    } else {
      setSuggestedPrice(null);
    }
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof QuoteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          surface: parseInt(formData.surface),
          levels: parseInt(formData.levels),
          distance: parseInt(formData.distance),
          finalPrice: parseFloat(formData.finalPrice),
          // S'assurer que les champs optionnels vides sont bien `null`
          propertyType: formData.propertyType || null, 
        }),
      });

      if (!response.ok) throw new Error('Échec de la mise à jour du devis.');
      
      toast.success("Devis mis à jour avec succès !");
      router.push('/quotes');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="main-content p-10 text-center">Chargement...</div>;

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Modifier le Devis {formData.quoteNumber}</h1>
          <p className="text-muted-foreground mt-1">Ajustez les paramètres et le prix du devis.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="thread-card md:col-span-2">
            <CardHeader><CardTitle>Détails de la Prestation</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>Client</Label><Input value={formData.leadName || ''} disabled /></div>
              <div><Label htmlFor="surface">Surface (m²)</Label><Input id="surface" type="number" value={formData.surface || ''} onChange={handleChange} required /></div>
              <div>
                <Label htmlFor="propertyType">Type de propriété</Label>
                <Select value={formData.propertyType || undefined} onValueChange={(v) => handleSelectChange('propertyType', v as PropertyType)} required>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..."/></SelectTrigger>
                  <SelectContent>{Object.entries(translations.PropertyType).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="materials">Type de matériaux</Label>
                <Select value={formData.materials || 'STANDARD'} onValueChange={(v) => handleSelectChange('materials', v as MaterialType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="MARBLE">Marbre</SelectItem>
                    <SelectItem value="PARQUET">Parquet</SelectItem>
                    <SelectItem value="LUXURY">Luxe</SelectItem>
                    <SelectItem value="MIXED">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div><Label htmlFor="levels">Nombre d'étages</Label><Input id="levels" type="number" value={formData.levels || ''} onChange={handleChange} /></div>
               <div><Label htmlFor="distance">Distance (km)</Label><Input id="distance" type="number" value={formData.distance || ''} onChange={handleChange} /></div>
                <div><Label htmlFor="accessibility">Accessibilité</Label><Select value={formData.accessibility || 'EASY'} onValueChange={(v) => handleSelectChange('accessibility', v as AccessibilityLevel)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.AccessibilityLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="urgency">Urgence</Label><Select value={formData.urgency || 'NORMAL'} onValueChange={(v) => handleSelectChange('urgency', v as UrgencyLevel)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.UrgencyLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent></Select></div>
            </CardContent>
        </Card>

        <div className="md:col-span-1 space-y-6">
          <Card className="thread-card sticky top-20">
            <CardHeader><CardTitle>Ajustement du Prix</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="text-xs text-muted-foreground">Prix Suggéré</Label>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-muted-foreground">{suggestedPrice ? formatCurrency(suggestedPrice) : '--- MAD'}</p>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setFormData(prev => ({...prev, finalPrice: suggestedPrice?.toString() || ''}))}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                </div>
                <div className="border-t pt-4">
                    <Label htmlFor="finalPrice" className="font-semibold">Prix Final (MAD)</Label>
                     <Input id="finalPrice" type="number" className="text-2xl font-bold h-12 mt-1 border-2 border-primary" value={formData.finalPrice} onChange={handleChange} required />
                </div>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full bg-enarva-gradient py-6 text-lg rounded-lg" disabled={isLoading}>
            <Save className="w-5 h-5 mr-2" />
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </form>
    </div>
  );
}