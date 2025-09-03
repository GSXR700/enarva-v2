// app/(administration)/quotes/new/NewQuoteForm.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calculator, FileText, User, Plus, Trash2, Edit } from 'lucide-react'
import { formatCurrency, generateQuote, ServiceInput, QuoteLineItem, ServiceType } from '@/lib/utils'
import { Lead } from '@prisma/client'
import { toast } from 'sonner'

type ServiceInputState = ServiceInput & { id: number };

export default function NewQuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [services, setServices] = useState<ServiceInputState[]>([
      { id: Date.now(), type: 'GrandMénage', surface: 100, levels: 1, distance: 10, etage: 'RDC', delai: 'STANDARD', difficulte: 'STANDARD' }
  ]);
  
  const [editableLineItems, setEditableLineItems] = useState<QuoteLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads');
        if (!response.ok) throw new Error("Impossible de charger les leads.");
        const data = await response.json();
        setLeads(data);
        const leadId = searchParams.get('leadId');
        if (leadId) {
          const lead = data.find((l: Lead) => l.id === leadId);
          if(lead) setSelectedLead(lead);
        }
      } catch (error) {
        toast.error("Erreur lors du chargement des leads.");
      }
    };
    fetchLeads();
  }, [searchParams]);

  const quoteCalculation = useMemo(() => {
    return generateQuote(services);
  }, [services]);

  useEffect(() => {
    setEditableLineItems(quoteCalculation.lineItems);
  }, [quoteCalculation]);

  const handleServiceChange = (id: number, field: keyof ServiceInputState, value: string | number) => {
    setServices(currentServices =>
      currentServices.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  };
  
  const handleLineItemChange = (id: string, newAmount: number) => {
    setEditableLineItems(currentItems =>
        currentItems.map(item => item.id === id ? { ...item, amount: newAmount } : item)
    );
  };
  
  const finalQuote = useMemo(() => {
    const subTotalHT = editableLineItems.reduce((acc, item) => acc + item.amount, 0);
    const vatAmount = subTotalHT * 0.20;
    let totalTTC = subTotalHT + vatAmount;
    if (totalTTC < 500) totalTTC = 500;
    const finalPrice = Math.round(totalTTC / 10) * 10;
    return { lineItems: editableLineItems, subTotalHT, vatAmount, totalTTC, finalPrice };
  }, [editableLineItems]);

  const addService = () => {
    setServices([...services, { id: Date.now(), type: 'GrandMénage', surface: 50, levels: 1, distance: 5, etage: 'RDC', delai: 'STANDARD', difficulte: 'STANDARD' }]);
  };

  const removeService = (id: number) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) {
      toast.error("Veuillez sélectionner un client.");
      return;
    }
    setIsLoading(true);
    
    try {
        const response = await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                leadId: selectedLead.id,
                quoteNumber: `DV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                ...finalQuote,
                expiresAt: new Date(new Date().setDate(new Date().getDate() + 30)),
                surface: services.reduce((acc, s) => acc + s.surface * s.levels, 0),
                levels: services.reduce((acc, s) => Math.max(acc, s.levels), 1),
                propertyType: selectedLead.propertyType
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec de la création du devis.');
        }

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
        <Link href="/quotes"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Générateur de Devis</h1>
          <p className="text-muted-foreground mt-1">Construisez un devis détaillé et professionnel.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
            <Card className="thread-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><User />Informations Client</CardTitle></CardHeader>
              <CardContent>
                <Label htmlFor="leadId">Sélectionner un Lead</Label>
                <Select value={selectedLead?.id} onValueChange={(id) => setSelectedLead(leads.find(l => l.id === id) || null)} required>
                  <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                  <SelectContent>{leads.map(lead => (<SelectItem key={lead.id} value={lead.id}>{lead.firstName} {lead.lastName}</SelectItem>))}</SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="thread-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Calculator />Services & Paramètres</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {services.map((service, index) => (
                    <div key={service.id} className="p-4 border rounded-lg space-y-4 relative bg-secondary/50">
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-3 -right-3 h-6 w-6" onClick={() => removeService(service.id)}><Trash2 className="w-4 h-4"/></Button>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                                <Label>Service</Label>
                                <Select value={service.type} onValueChange={(v) => handleServiceChange(service.id, 'type', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GrandMénage">Grand Ménage</SelectItem>
                                        <SelectItem value="FinDeChantier">Fin de Chantier</SelectItem>
                                        <SelectItem value="CristallisationMarbre">Cristallisation Marbre</SelectItem>
                                    </SelectContent>
                                </Select>
                           </div>
                           <div><Label>Surface (par niveau)</Label><Input type="number" value={service.surface} onChange={(e) => handleServiceChange(service.id, 'surface', e.target.value)} /></div>
                           <div><Label>Nombre de Niveaux</Label><Input type="number" value={service.levels} onChange={(e) => handleServiceChange(service.id, 'levels', e.target.value)} /></div>
                           <div><Label>Distance (km)</Label><Input type="number" value={service.distance} onChange={(e) => handleServiceChange(service.id, 'distance', e.target.value)} /></div>
                           <div>
                                <Label>Étage</Label>
                                <Select value={service.etage} onValueChange={(v) => handleServiceChange(service.id, 'etage', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RDC">RDC</SelectItem>
                                        <SelectItem value="AvecAscenseur">Avec Ascenseur</SelectItem>
                                        <SelectItem value="SansAscenseur">Sans Ascenseur</SelectItem>
                                    </SelectContent>
                                </Select>
                           </div>
                           <div>
                                <Label>Délai</Label>
                                <Select value={service.delai} onValueChange={(v) => handleServiceChange(service.id, 'delai', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STANDARD">Standard</SelectItem>
                                        <SelectItem value="URGENT">Urgent (&lt;72h)</SelectItem>
                                        <SelectItem value="IMMEDIAT">Immédiat (&lt;24h)</SelectItem>
                                    </SelectContent>
                                </Select>
                           </div>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={addService}><Plus className="w-4 h-4 mr-2"/> Ajouter un service</Button>
              </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="thread-card sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText />Aperçu du Devis</CardTitle>
              {selectedLead && <CardDescription>Pour : {selectedLead.firstName} {selectedLead.lastName}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-secondary/50 space-y-2">
                <div className="text-center">
                    <p className="text-muted-foreground">Investissement Total TTC</p>
                    <p className="text-3xl font-bold text-enarva-start">{formatCurrency(finalQuote.finalPrice)}</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <h4 className="font-semibold">DÉTAIL DE LA TARIFICATION</h4>
                {finalQuote.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm border-b py-2 gap-2">
                        <div>
                            <p className="font-medium text-foreground">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        <Input 
                            type="number" 
                            value={item.amount} 
                            onChange={(e) => handleLineItemChange(item.id, Number(e.target.value))}
                            className="w-32 h-8 text-right font-semibold"
                            disabled={!item.editable}
                        />
                    </div>
                ))}
                <div className="flex justify-between items-center text-sm font-semibold pt-2">
                    <p>TOTAL HORS TAXES (HT)</p>
                    <p>{formatCurrency(finalQuote.subTotalHT)}</p>
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <p>TVA (20%)</p>
                    <p>{formatCurrency(finalQuote.vatAmount)}</p>
                </div>
                 <div className="flex justify-between items-center font-bold text-lg pt-2 border-t mt-2">
                    <p>TOTAL TTC</p>
                    <p>{formatCurrency(finalQuote.totalTTC)} (Arrondi à {formatCurrency(finalQuote.finalPrice)})</p>
                </div>
              </div>
            </CardContent>
          </Card>
           <Button type="submit" className="w-full bg-enarva-gradient py-6 text-lg rounded-lg" disabled={isLoading || !selectedLead}>
            {isLoading ? 'Création en cours...' : 'Générer et Sauvegarder le Devis'}
          </Button>
        </div>
      </form>
    </div>
  );
}