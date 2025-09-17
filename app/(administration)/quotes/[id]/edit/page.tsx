'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FileText, Save, AlertCircle, Search, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { validateCompleteQuoteInput  } from '@/lib/validation'
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
  
  // Lead data that can be updated from quote form
  const [leadUpdates, setLeadUpdates] = useState({
    estimatedSurface: '',
    propertyType: '' as PropertyType | '',
    address: '',
    urgencyLevel: '' as UrgencyLevel | '',
    budgetRange: ''
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
      
    

      // Initialize lead updates with current lead data
      setLeadUpdates({
        estimatedSurface: data.lead.estimatedSurface?.toString() || '',
        propertyType: data.lead.propertyType || '',
        address: data.lead.address || '',
        urgencyLevel: data.lead.urgencyLevel || '',
        budgetRange: data.lead.budgetRange || ''
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

  // FIX: Helper function to handle lead updates safely
  const handleLeadChange = (field: keyof typeof leadUpdates, value: string | undefined) => {
    setLeadUpdates(prev => ({ 
      ...prev, 
      [field]: value || '' // Ensure value is never undefined
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
      // FIX: Include ALL required fields for lineItems validation
      const formattedLineItems = editableLineItems.map(item => ({
        id: item.id,
        description: item.description,
        detail: item.detail || '',
        amount: item.totalPrice,
        serviceType: item.serviceType,
        editable: item.editable,
        // FIX: Add missing required fields
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0
      }));

      // Calculate surface from quote or lead
      const surfaceValue = quote?.surface || parseInt(leadUpdates.estimatedSurface) || undefined;

      const quoteData = {
        leadId: quote?.leadId,
        quoteNumber: quote?.quoteNumber,
        businessType: quote?.businessType || 'SERVICE',
        lineItems: formattedLineItems, // Now includes all required fields
        subTotalHT: finalQuote.subTotalHT,
        vatAmount: finalQuote.vatAmount,
        totalTTC: finalQuote.totalTTC,
        finalPrice: finalQuote.finalPrice,
        status,
        type,
        surface: surfaceValue,
        expiresAt,
        leadUpdates: {
          estimatedSurface: parseInt(leadUpdates.estimatedSurface) || undefined,
          propertyType: leadUpdates.propertyType || undefined,
          address: leadUpdates.address || undefined,
          urgencyLevel: leadUpdates.urgencyLevel || undefined,
          budgetRange: leadUpdates.budgetRange || undefined
        }
      };

      const validation = validateCompleteQuoteInput(quoteData);
      
      if (!validation.success) {
        const errors = validation.error.errors.map(error => `${error.path.join('.')}: ${error.message}`);
        setValidationErrors(errors);
        toast.error('Données invalides. Veuillez corriger les erreurs.');
        return;
      }

      // Create the final payload for the API (matching what the API expects)
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
        expiresAt: new Date(expiresAt).toISOString()
      };

      const leadPayload = {
        estimatedSurface: parseInt(leadUpdates.estimatedSurface) || undefined,
        propertyType: leadUpdates.propertyType || undefined,
        address: leadUpdates.address || undefined,
        urgencyLevel: leadUpdates.urgencyLevel || undefined,
        budgetRange: leadUpdates.budgetRange || undefined
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
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Devis introuvable</h3>
              <p className="text-gray-600 mb-4">Le devis demandé n'existe pas ou a été supprimé.</p>
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
    <div className="min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b sticky top-0 z-10">
          <div className="flex items-center justify-between p-4 mx-2">
            <Link href={`/quotes/${quoteId}`}>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="flex-1 mx-4 text-center">
              <h1 className="text-lg font-bold text-gray-900 truncate">Modifier le devis</h1>
              <p className="text-sm text-gray-600 truncate">{quote.quoteNumber}</p>
            </div>
            
            <Button 
              type="submit" 
              disabled={isSaving}
              size="sm"
              className="h-10 w-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link href={`/quotes/${quoteId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour au devis
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Modifier le devis</h1>
                  <p className="text-gray-600">{quote.quoteNumber}</p>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto p-4 lg:p-6 max-w-4xl space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800">Erreurs de validation</h3>
                    <ul className="mt-2 text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du devis</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as QuoteStatus)}>
                  <SelectTrigger>
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
                <Label htmlFor="type">Type de devis</Label>
                <Select value={type} onValueChange={(value) => setType(value as QuoteType)}>
                  <SelectTrigger>
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
                <Label htmlFor="expiresAt">Date d'expiration</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead Information (modifiable) */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Lead (modifiables depuis le devis)</CardTitle>
              <CardDescription>
                Ces informations seront mises à jour dans le lead
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedSurface">Surface estimée (m²)</Label>
                <Input
                  id="estimatedSurface"
                  type="number"
                  value={leadUpdates.estimatedSurface}
                  onChange={(e) => handleLeadChange('estimatedSurface', e.target.value)}
                  min="1"
                  placeholder="Surface en m²"
                />
              </div>

              <div>
                <Label htmlFor="propertyType">Type de propriété</Label>
                <Select
                  value={leadUpdates.propertyType}
                  onValueChange={(value) => handleLeadChange('propertyType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APARTMENT_SMALL">Appartement Petit</SelectItem>
                    <SelectItem value="APARTMENT_MEDIUM">Appartement Moyen</SelectItem>
                    <SelectItem value="APARTMENT_LARGE">Appartement Grand</SelectItem>
                    <SelectItem value="VILLA_SMALL">Villa Petite</SelectItem>
                    <SelectItem value="VILLA_MEDIUM">Villa Moyenne</SelectItem>
                    <SelectItem value="VILLA_LARGE">Villa Grande</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="OFFICE">Bureau</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="urgencyLevel">Niveau d'urgence</Label>
                <Select
                  value={leadUpdates.urgencyLevel}
                  onValueChange={(value) => handleLeadChange('urgencyLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Faible</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH_URGENT">Très Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budgetRange">Budget estimé</Label>
                <Input
                  id="budgetRange"
                  value={leadUpdates.budgetRange}
                  onChange={(e) => handleLeadChange('budgetRange', e.target.value)}
                  placeholder="1000-5000 MAD"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={leadUpdates.address}
                  onChange={(e) => handleLeadChange('address', e.target.value)}
                  placeholder="Adresse complète"
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Information (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>Informations client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">{quote.lead.firstName} {quote.lead.lastName}</h3>
                  <p className="text-gray-600">{quote.lead.phone}</p>
                  {quote.lead.email && <p className="text-gray-600">{quote.lead.email}</p>}
                </div>
                <div>
                  {quote.lead.company && <p><strong>Société:</strong> {quote.lead.company}</p>}
                  {quote.lead.address && <p><strong>Adresse actuelle:</strong> {quote.lead.address}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Management */}
          <Card>
            <CardHeader>
              <CardTitle>Services du devis</CardTitle>
              <CardDescription>
                Recherchez parmi nos services ou créez-en de nouveaux. Les prix sont modifiables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Service Search/Add */}
              <div className="mb-6">
                <Label htmlFor="serviceSearch">Ajouter un service</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      id="serviceSearch"
                      value={serviceSearch}
                      onChange={(e) => {
                        setServiceSearch(e.target.value);
                        setShowServiceDropdown(true);
                      }}
                      onFocus={() => setShowServiceDropdown(true)}
                      placeholder="Rechercher ou taper un nouveau service..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addNewService}
                      disabled={!serviceSearch.trim()}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                  
                  {/* Service Dropdown */}
                  {showServiceDropdown && serviceSearch && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                      {filteredServices.map((service, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {
                            setServiceSearch(service);
                            setShowServiceDropdown(false);
                          }}
                        >
                          <Search className="h-4 w-4 text-gray-400" />
                          {service}
                        </button>
                      ))}
                      
                      {/* Create new service option */}
                      {!PREDEFINED_SERVICES.includes(serviceSearch) && (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 border-t border-gray-200 text-blue-600"
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
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-start">
                        {/* Service Type - Searchable */}
                        <div className="lg:col-span-2">
                          <Label className="text-sm font-medium">Service</Label>
                          <div className="relative">
                            <Input
                              value={item.serviceType || item.description}
                              onChange={(e) => handleLineItemChange(item.id, 'serviceType', e.target.value)}
                              placeholder="Type de service..."
                              className="w-full"
                              list={`services-${item.id}`}
                            />
                            <datalist id={`services-${item.id}`}>
                              {PREDEFINED_SERVICES.map((service, idx) => (
                                <option key={idx} value={service} />
                              ))}
                            </datalist>
                          </div>
                          {item.detail && (
                            <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                          )}
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
                            className="w-full"
                            disabled={isSaving}
                          />
                        </div>

                        {/* Unit Price */}
                        <div>
                          <Label className="text-sm font-medium">Prix unitaire</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full"
                            disabled={isSaving}
                          />
                          <p className="text-xs text-gray-500 mt-1">MAD</p>
                        </div>

                        {/* Total Price */}
                        <div>
                          <Label className="text-sm font-medium">Total ligne</Label>
                          <Input
                            type="number"
                            value={item.totalPrice}
                            onChange={(e) => handleLineItemChange(item.id, 'amount', parseFloat(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full font-semibold"
                            disabled={isSaving}
                          />
                          <p className="text-xs text-gray-500 mt-1">MAD</p>
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
                              disabled={isSaving}
                            >
                              +10%
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleLineItemChange(item.id, 'unitPrice', item.unitPrice * 0.9)}
                              className="text-xs px-2"
                              disabled={isSaving}
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
                            className="text-red-600 hover:bg-red-50"
                            disabled={isSaving || editableLineItems.length === 1}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>Aucun service dans ce devis</p>
                    <p className="text-sm">Utilisez la recherche ci-dessus pour ajouter des services</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sous-total HT</span>
                  <span className="font-medium">{formatCurrency(finalQuote.subTotalHT)} MAD</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">TVA (20%)</span>
                  <span className="font-medium">{formatCurrency(finalQuote.vatAmount)} MAD</span>
                </div>
                
                <hr />
                
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total TTC</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(finalQuote.totalTTC)} MAD
                  </span>
                </div>
                
                {finalQuote.finalPrice !== finalQuote.totalTTC && (
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Prix final (arrondi)</span>
                    <span className="font-semibold">{formatCurrency(finalQuote.finalPrice)} MAD</span>
                  </div>
                )}

                {/* Surface and Type Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Informations du devis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Type:</span>
                      <span className="ml-2 font-medium">{type}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Surface:</span>
                      <span className="ml-2 font-medium">
                        {quote?.surface || leadUpdates.estimatedSurface || 'Non définie'} m²
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