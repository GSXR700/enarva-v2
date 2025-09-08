'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, User, Plus, Trash2, Settings, Eye, Save
} from 'lucide-react'
import { formatCurrency, generateQuote, ServiceInput, QuoteLineItem, ServiceType } from '@/lib/utils'
import { Lead, QuoteType } from '@prisma/client'
import { toast } from 'sonner'

type ServiceInputState = ServiceInput & { id: number };

export default function NewQuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [quoteType, setQuoteType] = useState<QuoteType>('STANDARD');
  const [expiresAt, setExpiresAt] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });

  const [services, setServices] = useState<ServiceInputState[]>([
      { id: Date.now(), type: 'GrandMénage', surface: 100, levels: 1, distance: 10, etage: 'RDC', delai: 'STANDARD', difficulte: 'STANDARD' }
  ]);

  const [editableLineItems, setEditableLineItems] = useState<QuoteLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads');
        if (!response.ok) throw new Error("Impossible de charger les leads.");
        const responseData = await response.json();
        const leadsData = responseData.data || [];
        
        setLeads(leadsData);
        const leadId = searchParams.get('leadId');
        if (leadId) {
          const lead = leadsData.find((l: Lead) => l.id === leadId);
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
    setServices([...services, { 
      id: Date.now(), 
      type: 'GrandMénage', 
      surface: 50, 
      levels: 1, 
      distance: 5, 
      etage: 'RDC', 
      delai: 'STANDARD', 
      difficulte: 'STANDARD' 
    }]);
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
                expiresAt: expiresAt,
                type: quoteType,
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

  const getServiceIcon = (type: ServiceType) => {
    const icons = {
      'GrandMénage': '🏠',
      'VitresExtérieures': '🪟',
      'FinDeChantier': '🔨',
      'CristallisationMarbre': '✨'
    };
    return icons[type] || '🔧';
  };

  const getStepColor = (step: number) => {
    if (step === activeStep) return 'bg-blue-500 text-white';
    if (step < activeStep) return 'bg-green-500 text-white';
    return 'bg-gray-200 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/quotes">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Générateur de Devis</h1>
                <p className="text-sm text-slate-500">Simulateur intelligent</p>
              </div>
            </div>
            
            {/* Progress Steps - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${getStepColor(1)}`}>
                1
              </div>
              <div className="w-8 h-px bg-slate-300"></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${getStepColor(2)}`}>
                2
              </div>
              <div className="w-8 h-px bg-slate-300"></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${getStepColor(3)}`}>
                3
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Client Selection */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  Informations Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Client</Label>
                    <Select 
                      value={selectedLead?.id} 
                      onValueChange={(id) => setSelectedLead(leads.find(l => l.id === id) || null)} 
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {lead.firstName} {lead.lastName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Type</Label>
                    <Select value={quoteType} onValueChange={(v) => setQuoteType(v as QuoteType)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPRESS">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">Express</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="STANDARD">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">Standard</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="PREMIUM">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">Premium</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-700">Expiration</Label>
                  <Input 
                    type="date" 
                    value={expiresAt} 
                    onChange={(e) => setExpiresAt(e.target.value)} 
                    className="mt-1"
                    required 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Services Configuration */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Settings className="w-4 h-4 text-green-600" />
                    </div>
                    Services & Paramètres
                  </CardTitle>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addService}
                    className="h-8 gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {services.map((service, index) => (
                  <div key={service.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getServiceIcon(service.type)}</span>
                        <span className="font-medium text-slate-900">Service {index + 1}</span>
                      </div>
                      {services.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs font-medium text-slate-600">Type de service</Label>
                        <Select 
                          value={service.type} 
                          onValueChange={(value) => handleServiceChange(service.id, 'type', value)}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GrandMénage">🏠 Grand Ménage</SelectItem>
                            <SelectItem value="VitresExtérieures">🪟 Vitres Extérieures</SelectItem>
                            <SelectItem value="FinDeChantier">🔨 Fin de Chantier</SelectItem>
                            <SelectItem value="CristallisationMarbre">✨ Cristallisation Marbre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Surface (m²)</Label>
                        <Input
                          type="number"
                          value={service.surface}
                          onChange={(e) => handleServiceChange(service.id, 'surface', parseInt(e.target.value))}
                          className="mt-1 h-9"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Niveaux</Label>
                        <Input
                          type="number"
                          value={service.levels}
                          onChange={(e) => handleServiceChange(service.id, 'levels', parseInt(e.target.value))}
                          className="mt-1 h-9"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Distance (km)</Label>
                        <Input
                          type="number"
                          value={service.distance}
                          onChange={(e) => handleServiceChange(service.id, 'distance', parseInt(e.target.value))}
                          className="mt-1 h-9"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Étage</Label>
                        <Select 
                          value={service.etage} 
                          onValueChange={(value) => handleServiceChange(service.id, 'etage', value)}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RDC">RDC</SelectItem>
                            <SelectItem value="AvecAscenseur">Avec Ascenseur</SelectItem>
                            <SelectItem value="SansAscenseur">Sans Ascenseur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Délai</Label>
                        <Select 
                          value={service.delai} 
                          onValueChange={(value) => handleServiceChange(service.id, 'delai', value)}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STANDARD">Standard</SelectItem>
                            <SelectItem value="URGENT">Urgent (+40%)</SelectItem>
                            <SelectItem value="IMMEDIAT">Immédiat (+80%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Difficulté</Label>
                        <Select 
                          value={service.difficulte} 
                          onValueChange={(value) => handleServiceChange(service.id, 'difficulte', value)}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STANDARD">Standard</SelectItem>
                            <SelectItem value="DIFFICILE">Difficile (+20%)</SelectItem>
                            <SelectItem value="EXTREME">Extrême (+50%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview & Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              
              {/* Live Preview */}
              <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="w-4 h-4 text-purple-600" />
                    </div>
                    Aperçu du Devis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Client Info */}
                  {selectedLead && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{selectedLead.firstName} {selectedLead.lastName}</p>
                          <p className="text-sm text-slate-500">{selectedLead.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Investment Summary */}
                  <div className="text-center py-6 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Investissement Total TTC</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(finalQuote.finalPrice)}</p>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-900">Détail de la Tarification</h4>
                    {editableLineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">{item.description}</p>
                          <p className="text-xs text-slate-500">{item.detail}</p>
                        </div>
                        <div className="text-right">
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleLineItemChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-right text-sm"
                            step="0.01"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total HT</span>
                        <span className="font-medium">{formatCurrency(finalQuote.subTotalHT)} MAD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">TVA (20%)</span>
                        <span className="font-medium">{formatCurrency(finalQuote.vatAmount)} MAD</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-blue-600 pt-2 border-t">
                        <span>Total TTC</span>
                        <span>{formatCurrency(finalQuote.finalPrice)} MAD</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading || !selectedLead}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Génération...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          Générer et Sauvegarder le Devis
                        </div>
                      )}
                    </Button>
                    
                    <div className="text-xs text-center text-slate-500">
                      Montant arrondi à {formatCurrency(finalQuote.finalPrice)} MAD
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {services.reduce((acc, s) => acc + s.surface * s.levels, 0)}
                  </div>
                  <div className="text-xs text-slate-500">m² Total</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {services.length}
                  </div>
                  <div className="text-xs text-slate-500">Service{services.length > 1 ? 's' : ''}</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}