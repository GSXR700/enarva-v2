'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FileText, Save, AlertCircle, Search, Plus, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
//import { validateCompleteQuoteInput  } from '@/lib/validations'
import { Quote, Lead, QuoteStatus, QuoteType, PropertyType, UrgencyLevel } from '@prisma/client'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type QuoteWithLead = Quote & { lead: Lead };

interface EditableLineItem {
  id: string;
  description: string;
  detail?: string;
  amount: number;
  editable: boolean;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  serviceType?: string;
}

// Services prédéfinis avec "Fin de chantier"
const PREDEFINED_SERVICES = [
  'Grand Ménage',
  'Nettoyage Standard',
  'Nettoyage Express',
  'Nettoyage Vitres',
  'Nettoyage Post-Travaux',
  'Fin de chantier',
  'Nettoyage Bureaux',
  'Nettoyage Commercial',
  'Entretien Régulier'
];

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteWithLead | null>(null);
  const [editableLineItems, setEditableLineItems] = useState<EditableLineItem[]>([]);
  const [status, setStatus] = useState<QuoteStatus>('DRAFT');
  const [type, setType] = useState<QuoteType>('STANDARD');
  const [expiresAt, setExpiresAt] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Unified fields - NO MORE REDUNDANCY
  const [quoteFields, setQuoteFields] = useState({
    serviceType: '',
    propertyType: '' as PropertyType | '',
    surface: '',
    levels: '1',
    address: '',
    urgencyLevel: '' as UrgencyLevel | '',
    budgetRange: ''
  });

  // Materials Selection State - ADDED
  const [selectedMaterials, setSelectedMaterials] = useState<{
    marble: boolean;
    parquet: boolean;
    tiles: boolean;
    carpet: boolean;
    concrete: boolean;
    porcelain: boolean;
    cladding: boolean;
    composite_wood: boolean;
    pvc: boolean;
    other: string;
  }>({
    marble: false,
    parquet: false,
    tiles: false,
    carpet: false,
    concrete: false,
    porcelain: false,
    cladding: false,
    composite_wood: false,
    pvc: false,
    other: ''
  });

  // Service search functionality
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [filteredServices, setFilteredServices] = useState(PREDEFINED_SERVICES);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filter services based on search
  useEffect(() => {
    if (serviceSearch) {
      const filtered = PREDEFINED_SERVICES.filter(service =>
        service.toLowerCase().includes(serviceSearch.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(PREDEFINED_SERVICES);
    }
  }, [serviceSearch]);

  const parseQuoteLineItems = (items: any): EditableLineItem[] => {
    if (!items) return [];
    
    try {
      let parsedItems = Array.isArray(items) ? items : JSON.parse(items);
      
      return parsedItems.map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        description: item.designation || item.description || `Article ${index + 1}`,
        detail: item.detail || item.description || '',
        amount: parseFloat(item.totalPrice || item.amount || 0),
        unitPrice: parseFloat(item.unitPrice || 0),
        quantity: parseFloat(item.quantity || 1),
        totalPrice: parseFloat(item.totalPrice || item.amount || 0),
        serviceType: item.serviceType || '',
        editable: true
      }));
    } catch (error) {
      console.error('Error parsing line items:', error);
      return [];
    }
  };

  const fetchQuote = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) throw new Error("Devis non trouvé.");
      const data = await response.json();
      setQuote(data);

      const parsedLineItems = parseQuoteLineItems(data.lineItems);
      setEditableLineItems(parsedLineItems);
      
      setStatus(data.status);
      setType(data.type || 'STANDARD');
      
      // OPTIMIZED: Single unified fields object (no more redundancy)
      setQuoteFields({
        serviceType: data.serviceType || '',
        propertyType: data.propertyType || data.lead.propertyType || '',
        surface: data.surface?.toString() || data.lead.estimatedSurface?.toString() || '',
        levels: data.levels?.toString() || '1',
        address: data.lead.address || '',
        urgencyLevel: data.lead.urgencyLevel || '',
        budgetRange: data.lead.budgetRange || ''
      });

      // ADDED: Load materials from quote or lead
      if (data.materials && typeof data.materials === 'object') {
        setSelectedMaterials({
          marble: data.materials.marble || false,
          parquet: data.materials.parquet || false,
          tiles: data.materials.tiles || false,
          carpet: data.materials.carpet || false,
          concrete: data.materials.concrete || false,
          porcelain: data.materials.porcelain || false,
          cladding: data.materials.cladding || false,
          composite_wood: data.materials.composite_wood || false,
          pvc: data.materials.pvc || false,
          other: data.materials.other || ''
        });
      } else if (data.lead.materials && typeof data.lead.materials === 'object') {
        // Fallback to lead materials if quote doesn't have any
        setSelectedMaterials({
          marble: data.lead.materials.marble || false,
          parquet: data.lead.materials.parquet || false,
          tiles: data.lead.materials.tiles || false,
          carpet: data.lead.materials.carpet || false,
          concrete: data.lead.materials.concrete || false,
          porcelain: data.lead.materials.porcelain || false,
          cladding: data.lead.materials.cladding || false,
          composite_wood: data.lead.materials.composite_wood || false,
          pvc: data.lead.materials.pvc || false,
          other: data.lead.materials.other || ''
        });
      }

      // Set expiration date
      if (data.expiresAt) {
        const expirationDate = new Date(data.expiresAt);
        const isoString = expirationDate.toISOString();
        const parts = isoString.split('T');
        if (parts[0]) {
          setExpiresAt(parts[0]);
        }
      }

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

  // OPTIMIZED: Single handler for all fields
  const handleFieldChange = (field: keyof typeof quoteFields, value: string) => {
    setQuoteFields(prev => ({ 
      ...prev, 
      [field]: value
    }));
  };

  // ADDED: Material change handler
  const handleMaterialChange = (material: string, value: boolean | string) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [material]: value
    }));
  };

  const handleLineItemChange = (id: string, field: 'unitPrice' | 'quantity' | 'amount' | 'serviceType', value: number | string) => {
    setEditableLineItems(currentItems =>
      currentItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item };
          
          if (field === 'serviceType') {
            updatedItem.serviceType = value as string;
            updatedItem.description = value as string;
          } else if (field === 'unitPrice') {
            updatedItem.unitPrice = Math.max(0, isNaN(value as number) ? 0 : value as number);
            updatedItem.totalPrice = updatedItem.unitPrice * updatedItem.quantity;
            updatedItem.amount = updatedItem.totalPrice;
          } else if (field === 'quantity') {
            updatedItem.quantity = Math.max(1, isNaN(value as number) ? 1 : value as number);
            updatedItem.totalPrice = updatedItem.unitPrice * updatedItem.quantity;
            updatedItem.amount = updatedItem.totalPrice;
          } else if (field === 'amount') {
            updatedItem.amount = Math.max(0, isNaN(value as number) ? 0 : value as number);
            updatedItem.totalPrice = updatedItem.amount;
            if (updatedItem.quantity > 0) {
              updatedItem.unitPrice = updatedItem.totalPrice / updatedItem.quantity;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const addNewService = () => {
    const newService = {
      id: `new-${Date.now()}`,
      description: serviceSearch || 'Nouveau service',
      detail: '',
      amount: 0,
      unitPrice: 0,
      quantity: 1,
      totalPrice: 0,
      serviceType: serviceSearch || '',
      editable: true
    };
    
    setEditableLineItems(prev => [...prev, newService]);
    setServiceSearch('');
    setShowServiceDropdown(false);
  };

  const removeLineItem = (id: string) => {
    setEditableLineItems(prev => prev.filter(item => item.id !== id));
  };

  const finalQuote = useMemo(() => {
    if (editableLineItems.length === 0) {
      return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 };
    }
    
    const subTotalHT = editableLineItems.reduce((acc, item) => acc + item.totalPrice, 0);
    const vatAmount = subTotalHT * 0.20;
    let totalTTC = subTotalHT + vatAmount;
    
    if (totalTTC < 500) totalTTC = 500;
    
    const finalPrice = Math.round(totalTTC / 10) * 10;
    
    return { 
      lineItems: editableLineItems, 
      subTotalHT, 
      vatAmount, 
      totalTTC, 
      finalPrice 
    };
  }, [editableLineItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setValidationErrors([]);
    
    try {
      const surfaceValue = parseFloat(quoteFields.surface) || undefined;

      // Check if any materials are selected
      const hasMaterials = Object.entries(selectedMaterials).some(([key, value]) => 
        key !== 'other' ? value === true : value !== ''
      );

      const quotePayload = {
        lineItems: editableLineItems.map(item => ({
          id: item.id,
          designation: item.description,
          description: item.detail,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          serviceType: item.serviceType
        })),
        subTotalHT: finalQuote.subTotalHT,
        vatAmount: finalQuote.vatAmount,
        totalTTC: finalQuote.totalTTC,
        finalPrice: finalQuote.finalPrice,
        status,
        type,
        surface: surfaceValue,
        levels: parseInt(quoteFields.levels) || 1,
        serviceType: quoteFields.serviceType || undefined,
        propertyType: quoteFields.propertyType || undefined,
        materials: hasMaterials ? selectedMaterials : null,
        expiresAt: new Date(expiresAt).toISOString()
      };

      // OPTIMIZED: Lead payload with unified fields
      const leadPayload = {
        estimatedSurface: parseInt(quoteFields.surface) || undefined,
        propertyType: quoteFields.propertyType || undefined,
        address: quoteFields.address || undefined,
        urgencyLevel: quoteFields.urgencyLevel || undefined,
        budgetRange: quoteFields.budgetRange || undefined,
        materials: hasMaterials ? selectedMaterials : undefined
      };

      // Update quote
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la mise à jour du devis.');
      }

      // Update lead if there are changes
      const hasLeadChanges = Object.values(leadPayload).some(value => value !== undefined);
      if (hasLeadChanges && quote?.leadId) {
        const leadResponse = await fetch(`/api/leads/${quote.leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload),
        });

        if (!leadResponse.ok) {
          console.warn('Lead update failed, but quote was updated successfully');
        }
      }

      toast.success('Devis mis à jour avec succès !');
      router.push('/quotes');

    } catch (error: any) {
      console.error('Quote update error:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du devis.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <TableSkeleton 
          title="Chargement du devis..."
          description="Veuillez patienter pendant le chargement des données à modifier."
        />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Devis introuvable</h3>
              <p className="text-muted-foreground mb-4">Le devis demandé n'existe pas ou a été supprimé.</p>
              <Link href="/quotes">
                <Button>Retour aux devis</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <form onSubmit={handleSubmit}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-card border-b border-border sticky top-0 z-10 transition-colors duration-300">
          <div className="flex items-center justify-between p-4">
            <Link href={`/quotes/${quoteId}`}>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="flex-1 mx-4 text-center">
              <h1 className="text-lg font-bold text-foreground truncate">Modifier le devis</h1>
              <p className="text-sm text-muted-foreground truncate">{quote.quoteNumber}</p>
            </div>
            
            <Button 
              type="submit" 
              disabled={isSaving}
              size="sm"
              className="h-10 px-4 rounded-full bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="container mx-auto p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link href={`/quotes/${quoteId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Modifier le devis</h1>
                  <p className="text-muted-foreground">{quote.quoteNumber}</p>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto p-4 lg:p-6 max-w-5xl space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/10 dark:bg-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">Erreurs de validation</h3>
                    <ul className="mt-2 text-sm text-destructive/80 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Information (read-only) */}
          <Card className="transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Informations client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{quote.lead.firstName} {quote.lead.lastName}</h3>
                  <p className="text-muted-foreground text-sm">{quote.lead.phone}</p>
                  {quote.lead.email && <p className="text-muted-foreground text-sm">{quote.lead.email}</p>}
                </div>
                <div className="text-sm">
                  {quote.lead.company && <p><strong>Société:</strong> {quote.lead.company}</p>}
                  {quote.lead.leadType && <p><strong>Type:</strong> {quote.lead.leadType}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Settings */}
          <Card className="transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Paramètres du devis</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status" className="text-sm">Statut</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as QuoteStatus)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Brouillon</SelectItem>
                    <SelectItem value="SENT">Envoyé</SelectItem>
                    <SelectItem value="ACCEPTED">Accepté</SelectItem>
                    <SelectItem value="REJECTED">Rejeté</SelectItem>
                    <SelectItem value="EXPIRED">Expiré</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type" className="text-sm">Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as QuoteType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPRESS">Express</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiresAt" className="text-sm">Expiration</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 bg-background border-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* OPTIMIZED: Single Unified Details Section (no more redundancy!) */}
          <Card className="transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Détails du Devis & Lead</CardTitle>
              <CardDescription className="text-sm">
                Ces informations seront mises à jour dans le devis ET le lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceType" className="text-sm">Type de Service</Label>
                  <Select
                    value={quoteFields.serviceType}
                    onValueChange={(value) => handleFieldChange('serviceType', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIN_DE_CHANTIER">Fin de chantier</SelectItem>
                      <SelectItem value="GRAND_MENAGE">Grand Ménage</SelectItem>
                      <SelectItem value="NETTOYAGE_STANDARD">Nettoyage Standard</SelectItem>
                      <SelectItem value="NETTOYAGE_BUREAUX">Nettoyage Bureaux</SelectItem>
                      <SelectItem value="ENTRETIEN_REGULIER">Entretien Régulier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="propertyType" className="text-sm">Type de Bien</Label>
                  <Select
                    value={quoteFields.propertyType}
                    onValueChange={(value) => handleFieldChange('propertyType', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VILLA_SMALL">Villa Petite</SelectItem>
                      <SelectItem value="VILLA_MEDIUM">Villa Moyenne</SelectItem>
                      <SelectItem value="VILLA_LARGE">Villa Grande</SelectItem>
                      <SelectItem value="APARTMENT_SMALL">Appartement Petit</SelectItem>
                      <SelectItem value="APARTMENT_MEDIUM">Appartement Moyen</SelectItem>
                      <SelectItem value="APARTMENT_LARGE">Appartement Grand</SelectItem>
                      <SelectItem value="OFFICE">Bureau</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="surface" className="text-sm">Surface (m²)</Label>
                  <Input
                    id="surface"
                    type="number"
                    value={quoteFields.surface}
                    onChange={(e) => handleFieldChange('surface', e.target.value)}
                    placeholder="150"
                    className="mt-1 bg-background border-input"
                  />
                </div>

                <div>
                  <Label htmlFor="levels" className="text-sm">Niveaux</Label>
                  <Input
                    id="levels"
                    type="number"
                    min="1"
                    value={quoteFields.levels}
                    onChange={(e) => handleFieldChange('levels', e.target.value)}
                    placeholder="1"
                    className="mt-1 bg-background border-input"
                  />
                </div>

                <div>
                  <Label htmlFor="urgencyLevel" className="text-sm">Urgence</Label>
                  <Select
                    value={quoteFields.urgencyLevel}
                    onValueChange={(value) => handleFieldChange('urgencyLevel', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Faible</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="HIGH_URGENT">Très Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budgetRange" className="text-sm">Budget</Label>
                  <Input
                    id="budgetRange"
                    value={quoteFields.budgetRange}
                    onChange={(e) => handleFieldChange('budgetRange', e.target.value)}
                    placeholder="1000-5000 MAD"
                    className="mt-1 bg-background border-input"
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm">Adresse</Label>
                  <Input
                    id="address"
                    value={quoteFields.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="Adresse complète"
                    className="mt-1 bg-background border-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Selection Card - ADDED */}
          <Card className="transition-colors duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Sélection des Matériaux
              </CardTitle>
              <CardDescription className="text-sm">
                Sélectionnez les matériaux présents pour adapter les produits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { key: 'marble', label: 'Marbre', icon: '💎' },
                  { key: 'parquet', label: 'Parquet', icon: '🪵' },
                  { key: 'tiles', label: 'Carrelage', icon: '🧱' },
                  { key: 'carpet', label: 'Moquette', icon: '🧵' },
                  { key: 'concrete', label: 'Béton', icon: '🏗️' },
                  { key: 'porcelain', label: 'Porcelaine', icon: '🏺' },
                  { key: 'cladding', label: 'Bardage', icon: '🏠' },
                  { key: 'composite_wood', label: 'Bois composite', icon: '🌳' },
                  { key: 'pvc', label: 'PVC', icon: '📦' }
                ].map(({ key, label, icon }) => (
                  <div 
                    key={key} 
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedMaterials[key as keyof typeof selectedMaterials] 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleMaterialChange(key, !selectedMaterials[key as keyof typeof selectedMaterials])}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-medium flex-1">{label}</span>
                    {selectedMaterials[key as keyof typeof selectedMaterials] && (
                      <span className="text-primary">✓</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <Label htmlFor="other-materials" className="text-sm">Autres matériaux</Label>
                <Input
                  id="other-materials"
                  placeholder="Spécifiez d'autres matériaux..."
                  value={selectedMaterials.other}
                  onChange={(e) => handleMaterialChange('other', e.target.value)}
                  className="mt-1 text-sm bg-background border-input"
                />
              </div>

              {(Object.values(selectedMaterials).some((v, i) => i < 9 ? v === true : v !== '')) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    ℹ️ Les produits adaptés à ces matériaux seront automatiquement suggérés dans le PDF
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Management */}
          <Card className="transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Services du devis</CardTitle>
              <CardDescription className="text-sm">
                Gérez les services et leurs tarifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Service Search/Add */}
              <div className="mb-6">
                <Label htmlFor="serviceSearch" className="text-sm">Ajouter un service</Label>
                <div className="relative">
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="serviceSearch"
                      value={serviceSearch}
                      onChange={(e) => {
                        setServiceSearch(e.target.value);
                        setShowServiceDropdown(true);
                      }}
                      onFocus={() => setShowServiceDropdown(true)}
                      placeholder="Rechercher ou créer un service..."
                      className="flex-1 bg-background border-input"
                    />
                    <Button
                      type="button"
                      onClick={addNewService}
                      disabled={!serviceSearch.trim()}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                  
                  {/* Service Dropdown */}
                  {showServiceDropdown && serviceSearch && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 transition-colors duration-300">
                      {filteredServices.map((service, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors text-sm"
                          onClick={() => {
                            setServiceSearch(service);
                            setShowServiceDropdown(false);
                          }}
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          {service}
                        </button>
                      ))}
                      
                      {/* Create new service option */}
                      {!PREDEFINED_SERVICES.includes(serviceSearch) && (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 border-t border-border text-primary transition-colors text-sm"
                          onClick={addNewService}
                        >
                          <Plus className="h-4 w-4" />
                          Créer "{serviceSearch}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Services */}
              <div className="space-y-4">
                {editableLineItems.length > 0 ? (
                  editableLineItems.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/30 dark:bg-muted/20 transition-colors duration-300">
                      {/* Mobile Layout */}
                      <div className="lg:hidden space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Service</Label>
                          <Input
                            value={item.serviceType || item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'serviceType', e.target.value)}
                            placeholder="Type de service..."
                            className="mt-1 bg-background border-input"
                            list={`services-${item.id}`}
                          />
                          <datalist id={`services-${item.id}`}>
                            {PREDEFINED_SERVICES.map((service, idx) => (
                              <option key={idx} value={service} />
                            ))}
                          </datalist>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Qté</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                              min="1"
                              className="mt-1 bg-background border-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Prix U.</Label>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              className="mt-1 bg-background border-input"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Total</Label>
                            <Input
                              type="number"
                              value={item.totalPrice}
                              onChange={(e) => handleLineItemChange(item.id, 'amount', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              className="mt-1 font-semibold bg-background border-input"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLineItemChange(item.id, 'unitPrice', item.unitPrice * 1.1)}
                            className="flex-1 text-xs"
                          >
                            +10%
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLineItemChange(item.id, 'unitPrice', item.unitPrice * 0.9)}
                            className="flex-1 text-xs"
                          >
                            -10%
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            className="text-destructive hover:bg-destructive/10"
                            disabled={editableLineItems.length === 1}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:grid lg:grid-cols-7 gap-4 items-start">
                        {/* Service Type */}
                        <div className="lg:col-span-2">
                          <Label className="text-sm font-medium">Service</Label>
                          <Input
                            value={item.serviceType || item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'serviceType', e.target.value)}
                            placeholder="Type de service..."
                            className="mt-1 bg-background border-input"
                            list={`services-${item.id}`}
                          />
                          <datalist id={`services-${item.id}`}>
                            {PREDEFINED_SERVICES.map((service, idx) => (
                              <option key={idx} value={service} />
                            ))}
                          </datalist>
                        </div>

                        {/* Quantity */}
                        <div>
                          <Label className="text-sm font-medium">Quantité</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                            min="1"
                            step="1"
                            className="mt-1 bg-background border-input"
                          />
                        </div>

                        {/* Unit Price */}
                        <div>
                          <Label className="text-sm font-medium">Prix U.</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                            min="0"
                            step="0.01"
                            className="mt-1 bg-background border-input"
                          />
                          <p className="text-xs text-muted-foreground mt-1">MAD</p>
                        </div>

                        {/* Total Price */}
                        <div>
                          <Label className="text-sm font-medium">Total</Label>
                          <Input
                            type="number"
                            value={item.totalPrice}
                            onChange={(e) => handleLineItemChange(item.id, 'amount', parseFloat(e.target.value))}
                            min="0"
                            step="0.01"
                            className="mt-1 font-semibold bg-background border-input"
                          />
                          <p className="text-xs text-muted-foreground mt-1">MAD</p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium">Ajustements</Label>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleLineItemChange(item.id, 'unitPrice', item.unitPrice * 1.1)}
                              className="text-xs px-2"
                            >
                              +10%
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleLineItemChange(item.id, 'unitPrice', item.unitPrice * 0.9)}
                              className="text-xs px-2"
                            >
                              -10%
                            </Button>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium">Action</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            className="text-destructive hover:bg-destructive/10"
                            disabled={editableLineItems.length === 1}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p>Aucun service dans ce devis</p>
                    <p className="text-sm">Ajoutez des services ci-dessus</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Totals */}
          <Card className="transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span className="font-medium text-foreground">{formatCurrency(finalQuote.subTotalHT)} MAD</span>
                </div>
                
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-muted-foreground">TVA (20%)</span>
                  <span className="font-medium text-foreground">{formatCurrency(finalQuote.vatAmount)} MAD</span>
                </div>
                
                <hr className="border-border" />
                
                <div className="flex justify-between items-center text-base sm:text-lg">
                  <span className="font-semibold text-foreground">Total TTC</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(finalQuote.totalTTC)} MAD
                  </span>
                </div>
                
                {finalQuote.finalPrice !== finalQuote.totalTTC && (
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Prix final (arrondi)</span>
                    <span className="font-semibold text-foreground">{formatCurrency(finalQuote.finalPrice)} MAD</span>
                  </div>
                )}

                {/* Summary Info */}
                <div className="mt-4 p-3 sm:p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20 transition-colors duration-300">
                  <h4 className="font-medium text-primary mb-3 text-sm sm:text-base">Résumé du devis</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-primary/80">Service:</span>
                      <span className="ml-2 font-medium text-foreground block sm:inline truncate">
                        {quoteFields.serviceType || 'Non défini'}
                      </span>
                    </div>
                    <div>
                      <span className="text-primary/80">Type:</span>
                      <span className="ml-2 font-medium text-foreground">{type}</span>
                    </div>
                    <div>
                      <span className="text-primary/80">Bien:</span>
                      <span className="ml-2 font-medium text-foreground block sm:inline truncate">
                        {quoteFields.propertyType || 'Non défini'}
                      </span>
                    </div>
                    <div>
                      <span className="text-primary/80">Surface:</span>
                      <span className="ml-2 font-medium text-foreground">
                        {quoteFields.surface || 'N/A'} m²
                      </span>
                    </div>
                    <div>
                      <span className="text-primary/80">Niveaux:</span>
                      <span className="ml-2 font-medium text-foreground">{quoteFields.levels}</span>
                    </div>
                    <div>
                      <span className="text-primary/80">Urgence:</span>
                      <span className="ml-2 font-medium text-foreground">
                        {quoteFields.urgencyLevel || 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Bottom Spacing */}
          <div className="lg:hidden h-20"></div>
        </div>
      </form>
    </div>
  );
}