// app/(administration)/leads/[id]/edit/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Save, User, Briefcase, Search, Package, Plus, Trash2, Loader2 } from 'lucide-react';
import { Lead, User as PrismaUser, ServiceType } from '@prisma/client';
import { toast } from 'sonner';

type ProductRequest = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
};

type FormDataType = Partial<Omit<Lead, 'materials' | 'score' | 'estimatedSurface'>> & {
    materials: ProductRequest[] | null | any;
    score: number | string;
    estimatedSurface: number | string;
};

const initialFormData: FormDataType = {
    firstName: '', lastName: '', phone: '', email: '', address: '', gpsLocation: '',
    serviceType: null,
    leadType: 'PARTICULIER', company: '', iceNumber: '', activitySector: '', contactPosition: '', department: '',
    propertyType: null, estimatedSurface: '', accessibility: 'EASY',
    urgencyLevel: 'NORMAL', budgetRange: '', frequency: 'PONCTUEL',
    contractType: 'INTERVENTION_UNIQUE', needsProducts: false, needsEquipment: false, providedBy: 'ENARVA',
    channel: 'MANUEL', source: '', hasReferrer: false, referrerContact: '', enarvaRole: 'PRESTATAIRE_PRINCIPAL',
    originalMessage: '', status: 'NEW', score: 0, materials: null, assignedToId: '',
};

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [requestType, setRequestType] = useState<'SERVICE' | 'PRODUCTS'>('SERVICE');
  const [productRequests, setProductRequests] = useState<ProductRequest[]>([{ name: '', category: '', quantity: 1, unit: '' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<PrismaUser[]>([]);
  
  useEffect(() => {
    if (leadId) {
      const fetchLeadAndUsers = async () => {
        setIsLoading(true);
        try {
            const [leadResponse, usersResponse] = await Promise.all([
                fetch(`/api/leads/${leadId}`),
                fetch('/api/users')
            ]);

            if (!leadResponse.ok) {
                const errorText = await leadResponse.text();
                console.error('Lead fetch error:', errorText);
                throw new Error("Lead non trouvé.");
            }
            
            if (!usersResponse.ok) {
                console.warn('Users fetch failed, proceeding without user list');
                setAssignableUsers([]);
            } else {
                const usersData = await usersResponse.json();
                const usersList = usersData.users || usersData || [];
                setAssignableUsers(Array.isArray(usersList) ? usersList : []);
            }

            const leadData = await leadResponse.json();
            console.log('Fetched lead data:', leadData);

            // Properly parse and set form data with better error handling
            const parsedFormData: FormDataType = {
                firstName: leadData.firstName || '',
                lastName: leadData.lastName || '',
                phone: leadData.phone || '',
                email: leadData.email || '',
                address: leadData.address || '',
                gpsLocation: leadData.gpsLocation || '',
                serviceType: leadData.serviceType || null,
                leadType: leadData.leadType || 'PARTICULIER',
                company: leadData.company || '',
                iceNumber: leadData.iceNumber || '',
                activitySector: leadData.activitySector || '',
                contactPosition: leadData.contactPosition || '',
                department: leadData.department || '',
                propertyType: leadData.propertyType || null,
                estimatedSurface: leadData.estimatedSurface?.toString() || '',
                accessibility: leadData.accessibility || 'EASY',
                urgencyLevel: leadData.urgencyLevel || 'NORMAL',
                budgetRange: leadData.budgetRange || '',
                frequency: leadData.frequency || 'PONCTUEL',
                contractType: leadData.contractType || 'INTERVENTION_UNIQUE',
                needsProducts: leadData.needsProducts || false,
                needsEquipment: leadData.needsEquipment || false,
                providedBy: leadData.providedBy || 'ENARVA',
                channel: leadData.channel || 'MANUEL',
                source: leadData.source || '',
                hasReferrer: leadData.hasReferrer || false,
                referrerContact: leadData.referrerContact || '',
                enarvaRole: leadData.enarvaRole || 'PRESTATAIRE_PRINCIPAL',
                originalMessage: leadData.originalMessage || '',
                status: leadData.status || 'NEW',
                score: leadData.score || 0,
                materials: leadData.materials || null,
                assignedToId: leadData.assignedToId || '',
            };

            setFormData(parsedFormData);

            // Set request type and product requests if materials exist
            if (leadData.materials && Array.isArray(leadData.materials) && leadData.materials.length > 0) {
                setRequestType('PRODUCTS');
                setProductRequests(leadData.materials);
            } else {
                setRequestType('SERVICE');
            }

        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error(error.message || "Erreur lors du chargement des données.");
            router.push('/leads');
        } finally {
            setIsLoading(false);
        }
      };

      fetchLeadAndUsers();
    }
  }, [leadId, router]);

  const handleInputChange = (field: keyof FormDataType, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductRequestChange = (index: number, field: keyof ProductRequest, value: any) => {
    setProductRequests(prev => 
      prev.map((req, i) => 
        i === index ? { ...req, [field]: value } : req
      )
    );
  };

  const addProductRequest = () => {
    setProductRequests(prev => [...prev, { name: '', category: '', quantity: 1, unit: '' }]);
  };

  const removeProductRequest = (index: number) => {
    setProductRequests(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Prepare clean submission data - only send updateable fields
      const submissionData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        gpsLocation: formData.gpsLocation || null,
        serviceType: formData.serviceType || null,
        leadType: formData.leadType,
        company: formData.company || null,
        iceNumber: formData.iceNumber || null,
        activitySector: formData.activitySector || null,
        contactPosition: formData.contactPosition || null,
        department: formData.department || null,
        propertyType: formData.propertyType || null,
        estimatedSurface: formData.estimatedSurface ? parseInt(formData.estimatedSurface.toString()) : null,
        accessibility: formData.accessibility,
        urgencyLevel: formData.urgencyLevel || null,
        budgetRange: formData.budgetRange || null,
        frequency: formData.frequency || null,
        contractType: formData.contractType || null,
        needsProducts: formData.needsProducts,
        needsEquipment: formData.needsEquipment,
        providedBy: formData.providedBy,
        channel: formData.channel,
        source: formData.source || null,
        hasReferrer: formData.hasReferrer,
        referrerContact: formData.referrerContact || null,
        enarvaRole: formData.enarvaRole,
        originalMessage: formData.originalMessage,
        status: formData.status,
        score: formData.score ? parseInt(formData.score.toString()) : 0,
        materials: requestType === 'PRODUCTS' ? productRequests : null,
        assignedToId: formData.assignedToId || null,
      };

      console.log('Submitting lead update:', submissionData);

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        
        let errorMessage = 'La mise à jour a échoué.';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage = errorData.details.join(', ');
          } else {
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch {
          // If not JSON, use the text as error message
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const updatedLead = await response.json();
      console.log('Lead updated successfully:', updatedLead);
      
      toast.success("Lead mis à jour avec succès !");
      router.push('/leads');
      
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
            <p className="text-gray-600">Chargement du lead...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/leads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux leads
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Modifier le lead</h1>
          <p className="text-gray-600">
            {formData.firstName} {formData.lastName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Informations Générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Générales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="serviceType">Type de Service</Label>
              <Select
                value={formData.serviceType || 'NONE'}
                onValueChange={(value) => handleInputChange('serviceType', value === 'NONE' ? null : value as ServiceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucun service sélectionné</SelectItem>
                  <SelectItem value={ServiceType.GRAND_MENAGE}>Grand Ménage</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_FIN_CHANTIER}>Nettoyage de Fin-Chantier</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_CANAPES_MATELAS}>Nettoyage des Canapés & Matelas</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_TAPIS_MOQUETTES}>Nettoyage des Tapis & Moquettes</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_VITRES}>Nettoyage des Vitres</SelectItem>
                  <SelectItem value={ServiceType.TRAITEMENT_SOL}>Traitement de Sol</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_FOURS}>Nettoyage des Fours</SelectItem>
                  <SelectItem value={ServiceType.ENTRETIEN_JARDIN}>Entretien de Jardin</SelectItem>
                  <SelectItem value={ServiceType.ENTRETIEN_PISCINE}>Entretien de Piscine</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_FACADE}>Nettoyage de Façade</SelectItem>
                  <SelectItem value={ServiceType.DESINFECTION_SANITAIRE}>Désinfection Sanitaire</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_BUREAUX}>Nettoyage de Bureaux</SelectItem>
                  <SelectItem value={ServiceType.ENTRETIEN_REGULIER}>Entretien Régulier</SelectItem>
                  <SelectItem value={ServiceType.CRISTALLISATION_MARBRE}>Cristallisation de Marbre</SelectItem>
                  <SelectItem value={ServiceType.VITRIFICATION_PARQUET}>Vitrification de Parquet</SelectItem>
                  <SelectItem value={ServiceType.DECAPAGE_SOL}>Décapage de Sol</SelectItem>
                  <SelectItem value={ServiceType.LUSTRAGE_MARBRE}>Lustrage de Marbre</SelectItem>
                  <SelectItem value={ServiceType.POLISSAGE_BETON}>Polissage de Béton</SelectItem>
                  <SelectItem value={ServiceType.NETTOYAGE_MOQUETTE_VAPEUR}>Nettoyage Moquette à Vapeur</SelectItem>
                  <SelectItem value={ServiceType.AUTRES}>Autres Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="gpsLocation">Localisation GPS</Label>
              <Input
                id="gpsLocation"
                value={formData.gpsLocation || ''}
                onChange={(e) => handleInputChange('gpsLocation', e.target.value)}
                placeholder="33.5731, -7.5898"
              />
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status || 'NEW'}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">Nouveau</SelectItem>
                  <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                  <SelectItem value="QUOTE_SENT">Devis envoyé</SelectItem>
                  <SelectItem value="QUOTE_ACCEPTED">Devis accepté</SelectItem>
                  <SelectItem value="COMPLETED">Terminé</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Détails Professionnels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Détails Professionnels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type de Lead *</Label>
              <RadioGroup
                value={formData.leadType || 'PARTICULIER'}
                onValueChange={(value) => handleInputChange('leadType', value)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PARTICULIER" id="particulier" />
                  <Label htmlFor="particulier">Particulier</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PROFESSIONNEL" id="professionnel" />
                  <Label htmlFor="professionnel">Professionnel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SYNDIC" id="syndic" />
                  <Label htmlFor="syndic">Syndic</Label>
                </div>
              </RadioGroup>
            </div>

            {(formData.leadType === 'PROFESSIONNEL' || formData.leadType === 'SYNDIC') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Société</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="iceNumber">N° ICE</Label>
                  <Input
                    id="iceNumber"
                    value={formData.iceNumber || ''}
                    onChange={(e) => handleInputChange('iceNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="activitySector">Secteur d'Activité</Label>
                  <Input
                    id="activitySector"
                    value={formData.activitySector || ''}
                    onChange={(e) => handleInputChange('activitySector', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contactPosition">Poste du Contact</Label>
                  <Input
                    id="contactPosition"
                    value={formData.contactPosition || ''}
                    onChange={(e) => handleInputChange('contactPosition', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Département</Label>
                  <Input
                    id="department"
                    value={formData.department || ''}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Type de Demande */}
        <Card>
          <CardHeader>
            <CardTitle>Type de Demande</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={requestType}
              onValueChange={(value: 'SERVICE' | 'PRODUCTS') => setRequestType(value)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SERVICE" id="service" />
                <Label htmlFor="service" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Prestation de Service
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PRODUCTS" id="products" />
                <Label htmlFor="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Demande de Produits
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Section 4: Détails selon le type */}
        {requestType === 'SERVICE' ? (
          <Card>
            <CardHeader>
              <CardTitle>Détails de la Prestation</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="propertyType">Type de Propriété</Label>
                  <Select
                    value={formData.propertyType || 'NONE'}
                    onValueChange={(value) => handleInputChange('propertyType', value === 'NONE' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Aucun</SelectItem>
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
                <Label htmlFor="estimatedSurface">Surface Estimée (m²)</Label>
                <Input
                  id="estimatedSurface"
                  type="number"
                  value={formData.estimatedSurface || ''}
                  onChange={(e) => handleInputChange('estimatedSurface', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="accessibility">Accessibilité</Label>
                <Select
                  value={formData.accessibility || 'EASY'}
                  onValueChange={(value) => handleInputChange('accessibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Facile</SelectItem>
                    <SelectItem value="MODERATE">Modérée</SelectItem>
                    <SelectItem value="DIFFICULT">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="urgencyLevel">Niveau d'Urgence</Label>
                <Select
                  value={formData.urgencyLevel || 'NORMAL'}
                  onValueChange={(value) => handleInputChange('urgencyLevel', value === 'NORMAL' ? 'NORMAL' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="budgetRange">Budget</Label>
                <Input
                  id="budgetRange"
                  value={formData.budgetRange || ''}
                  onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                  placeholder="1000-5000 DH"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Fréquence</Label>
                <Select
                  value={formData.frequency || 'PONCTUEL'}
                  onValueChange={(value) => handleInputChange('frequency', value === 'PONCTUEL' ? 'PONCTUEL' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PONCTUEL">Ponctuel</SelectItem>
                    <SelectItem value="HEBDOMADAIRE">Hebdomadaire</SelectItem>
                    <SelectItem value="MENSUEL">Mensuel</SelectItem>
                    <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Demandes de Produits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productRequests.map((request, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor={`product-name-${index}`}>Nom du Produit</Label>
                      <Input
                        id={`product-name-${index}`}
                        value={request.name}
                        onChange={(e) => handleProductRequestChange(index, 'name', e.target.value)}
                        placeholder="Ex: Table en bois"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`product-category-${index}`}>Catégorie</Label>
                      <Input
                        id={`product-category-${index}`}
                        value={request.category}
                        onChange={(e) => handleProductRequestChange(index, 'category', e.target.value)}
                        placeholder="Ex: Mobilier"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`product-quantity-${index}`}>Quantité</Label>
                      <Input
                        id={`product-quantity-${index}`}
                        type="number"
                        value={request.quantity}
                        onChange={(e) => handleProductRequestChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`product-unit-${index}`}>Unité</Label>
                        <Input
                          id={`product-unit-${index}`}
                          value={request.unit}
                          onChange={(e) => handleProductRequestChange(index, 'unit', e.target.value)}
                          placeholder="Ex: pcs, kg"
                        />
                      </div>
                      {productRequests.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProductRequest(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addProductRequest}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un produit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5: Canal et Source */}
        <Card>
          <CardHeader>
            <CardTitle>Canal et Source</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel">Canal d'Acquisition *</Label>
              <Select
                value={formData.channel || 'MANUEL'}
                onValueChange={(value) => handleInputChange('channel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="GOOGLE_SEARCH">Google</SelectItem>
                  <SelectItem value="APPEL_TELEPHONIQUE">Téléphone</SelectItem>
                  <SelectItem value="RECOMMANDATION_CLIENT">Recommandation</SelectItem>
                  <SelectItem value="MANUEL">Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source Détaillée</Label>
              <Input
                id="source"
                value={formData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
                placeholder="Ex: Google Ads, Page Facebook"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Message et Attribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message et Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="originalMessage">Message Original *</Label>
              <Textarea
                id="originalMessage"
                value={formData.originalMessage || ''}
                onChange={(e) => handleInputChange('originalMessage', e.target.value)}
                rows={4}
                placeholder="Description de la demande du client..."
                required
              />
            </div>
            <div>
              <Label htmlFor="assignedToId">Assigné à</Label>
              <Select
                value={formData.assignedToId || 'UNASSIGNED'}
                onValueChange={(value) => handleInputChange('assignedToId', value === 'UNASSIGNED' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNASSIGNED">Non assigné</SelectItem>
                  {Array.isArray(assignableUsers) && assignableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="score">Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={formData.score || 0}
                onChange={(e) => handleInputChange('score', parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bouton de Soumission */}
        <div className="flex justify-end gap-4">
          <Link href="/leads">
            <Button type="button" variant="outline" disabled={isSaving}>
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mise à jour...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}