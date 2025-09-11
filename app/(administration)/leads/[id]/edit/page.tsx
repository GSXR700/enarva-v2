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
import { ArrowLeft, Save, User, Briefcase, Search, Package, Plus, Trash2, Tag, Users as UsersIcon } from 'lucide-react';
import { Lead, LeadStatus, LeadType, PropertyType, AccessibilityLevel, UrgencyLevel, LeadCanal, Frequency, ContractType, User as PrismaUser } from '@prisma/client';
import { toast } from 'sonner';
import { translations } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

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

            if (!leadResponse.ok) throw new Error("Lead non trouvé.");
            if (!usersResponse.ok) throw new Error("Impossible de charger les utilisateurs.");

            const [leadData, usersData] = await Promise.all([
                leadResponse.json(),
                usersResponse.json()
            ]);

            // Handle both response formats: {users: [...]} and [...]
            const userList = usersData.users || usersData;
            if (Array.isArray(userList)) {
                setAssignableUsers(userList);
            } else {
                console.error('Users data is not an array:', usersData);
                setAssignableUsers([]);
            }

            // Map lead data to form structure
            setFormData({
                ...leadData,
                score: leadData.score || 0,
                estimatedSurface: leadData.estimatedSurface || '',
                materials: leadData.materials || null,
            });

            // Set request type based on lead data
            if (leadData.needsProducts && !leadData.propertyType) {
                setRequestType('PRODUCTS');
                if (leadData.materials && Array.isArray(leadData.materials)) {
                    setProductRequests(leadData.materials);
                }
            } else {
                setRequestType('SERVICE');
            }

        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error(error.message);
            router.push('/leads');
        } finally {
            setIsLoading(false);
        }
      };

      fetchLeadAndUsers();
    }
  }, [leadId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSelectChange = (name: keyof FormDataType, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value === 'null' || value === '' ? null : value
    }));
  };

  const handleCheckboxChange = (name: keyof FormDataType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleProductRequestChange = (index: number, field: keyof ProductRequest, value: string | number) => {
    setProductRequests(prev => prev.map((req, i) => 
      i === index ? { ...req, [field]: value } : req
    ));
  };

  const addProductRequest = () => {
    setProductRequests(prev => [...prev, { name: '', category: '', quantity: 1, unit: '' }]);
  };

  const removeProductRequest = (index: number) => {
    setProductRequests(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submissionData = {
        ...formData,
        materials: requestType === 'PRODUCTS' ? productRequests : null,
        propertyType: formData.propertyType || null,
        urgencyLevel: formData.urgencyLevel || null,
        frequency: formData.frequency || null,
        contractType: formData.contractType || null,
        assignedToId: formData.assignedToId || null,
    };

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Error:", errorBody);
        throw new Error('La mise à jour a échoué.');
      }
      
      toast.success("Lead mis à jour avec succès !");
      router.push('/leads');
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux leads
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Modifier le lead</h1>
          <p className="text-gray-600">ID: {leadId}</p>
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
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="gpsLocation">Localisation GPS</Label>
              <Input
                id="gpsLocation"
                name="gpsLocation"
                value={formData.gpsLocation || ''}
                onChange={handleInputChange}
                placeholder="33.5731, -7.5898"
              />
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status || 'NEW'}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">Nouveau</SelectItem>
                  <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                  <SelectItem value="COMPLETED">Terminé</SelectItem>
                  <SelectItem value="LOST">Perdu</SelectItem>
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
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leadType">Type de Lead *</Label>
              <Select
                value={formData.leadType || 'PARTICULIER'}
                onValueChange={(value) => handleSelectChange('leadType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICULIER">Particulier</SelectItem>
                  <SelectItem value="PROFESSIONNEL">Professionnel</SelectItem>
                  <SelectItem value="SYNDIC">Syndic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.leadType === 'PROFESSIONNEL' || formData.leadType === 'SYNDIC') && (
              <>
                <div>
                  <Label htmlFor="company">Société</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="iceNumber">N° ICE</Label>
                  <Input
                    id="iceNumber"
                    name="iceNumber"
                    value={formData.iceNumber || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="activitySector">Secteur d'Activité</Label>
                  <Input
                    id="activitySector"
                    name="activitySector"
                    value={formData.activitySector || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="contactPosition">Poste du Contact</Label>
                  <Input
                    id="contactPosition"
                    name="contactPosition"
                    value={formData.contactPosition || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Département</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </>
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
                  value={formData.propertyType || ''}
                  onValueChange={(value) => handleSelectChange('propertyType', value)}
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
                <Label htmlFor="estimatedSurface">Surface Estimée (m²)</Label>
                <Input
                  id="estimatedSurface"
                  name="estimatedSurface"
                  type="number"
                  value={formData.estimatedSurface || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="accessibility">Accessibilité</Label>
                <Select
                  value={formData.accessibility || 'EASY'}
                  onValueChange={(value) => handleSelectChange('accessibility', value)}
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
                  onValueChange={(value) => handleSelectChange('urgencyLevel', value)}
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
                  name="budgetRange"
                  value={formData.budgetRange || ''}
                  onChange={handleInputChange}
                  placeholder="1000-5000 DH"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Fréquence</Label>
                <Select
                  value={formData.frequency || 'PONCTUEL'}
                  onValueChange={(value) => handleSelectChange('frequency', value)}
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
                onValueChange={(value) => handleSelectChange('channel', value)}
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
                name="source"
                value={formData.source || ''}
                onChange={handleInputChange}
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
                name="originalMessage"
                value={formData.originalMessage || ''}
                onChange={handleInputChange}
                rows={4}
                placeholder="Description de la demande du client..."
                required
              />
            </div>
            <div>
              <Label htmlFor="assignedToId">Assigné à</Label>
              <Select
                value={formData.assignedToId || 'null'}
                onValueChange={(value) => handleSelectChange('assignedToId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Non assigné</SelectItem>
                  {Array.isArray(assignableUsers) && assignableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bouton de Soumission */}
        <div className="flex justify-end gap-4">
          <Link href="/leads">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}