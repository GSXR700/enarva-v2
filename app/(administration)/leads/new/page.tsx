// app/(administration)/leads/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, User, Briefcase, Search, Package, Plus, Trash2, Users as UsersIcon } from 'lucide-react'
import { User as PrismaUser, ServiceType } from '@prisma/client'
import { toast } from 'sonner'
import { translations } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ProductRequest = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
};

export default function NewLeadPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<'SERVICE' | 'PRODUCTS'>('SERVICE');
  const [productRequests, setProductRequests] = useState<ProductRequest[]>([{ name: '', category: '', quantity: 1, unit: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<PrismaUser[]>([]);

  const [formData, setFormData] = useState({
    // Section 1
    firstName: '', lastName: '', phone: '', email: '', address: '', gpsLocation: '',
    serviceType: '',
    // Section 2
    leadType: 'PARTICULIER',
    company: '', iceNumber: '', activitySector: '', contactPosition: '', department: '',
    // Section 3 (Service)
    propertyType: '',
    estimatedSurface: '', 
    accessibility: 'EASY',
    urgencyLevel: 'NORMAL',
    budgetRange: '', 
    frequency: 'PONCTUEL',
    contractType: 'INTERVENTION_UNIQUE',
    // Section 4 (Produits)
    needsProducts: false, 
    needsEquipment: false, 
    providedBy: 'ENARVA',
    // Section 5 (Origine)
    channel: '',
    source: '', 
    hasReferrer: false, 
    referrerContact: '', 
    enarvaRole: 'PRESTATAIRE_PRINCIPAL',
    // Section 6 (Suivi)
    originalMessage: '', 
    assignedToId: '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if(!response.ok) throw new Error("Impossible de charger les utilisateurs");
            const users = await response.json();
            setAssignableUsers(users);
        } catch (error) {
            toast.error("Erreur lors du chargement des agents.");
        }
    };
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    // @ts-ignore
    const checked = e.target.checked;
    setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    const finalValue = value === 'null' ? '' : value;
    setFormData(prev => ({ ...prev, [id]: finalValue }));
  };
  
  const handleRadioChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value as any }));
  };

  const handleProductChange = (index: number, field: keyof ProductRequest, value: string | number) => {
    const updatedProducts = [...productRequests];
    // @ts-ignore
    updatedProducts[index][field] = value;
    setProductRequests(updatedProducts);
  };
  const addProductRequest = () => setProductRequests([...productRequests, { name: '', category: '', quantity: 1, unit: '' }]);
  const removeProductRequest = (index: number) => setProductRequests(productRequests.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.leadType === 'PROFESSIONNEL' && (!formData.company || !formData.iceNumber)) {
        toast.error("La raison sociale et l'ICE sont obligatoires pour les professionnels.");
        return;
    }
    if (formData.leadType === 'PUBLIC' && !formData.company) {
        toast.error("La dénomination officielle est obligatoire pour les organismes publics.");
        return;
    }
    setIsLoading(true);

    const submissionData = {
        ...formData,
        serviceType: formData.serviceType || null,
        materials: requestType === 'PRODUCTS' ? productRequests : null,
        assignedToId: formData.assignedToId || null,
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Une erreur est survenue.');
      }
      
      toast.success("Lead créé avec succès !");
      router.push('/leads');
      router.refresh(); 

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/leads">
          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Créer un Nouveau Lead</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
            Saisissez toutes les informations du nouveau prospect.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Mobile: Tabs Layout */}
        <div className="block lg:hidden">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto mb-4">
              <TabsTrigger value="general" className="text-xs py-2">
                <User className="h-3 w-3 mr-1" />
                Général
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs py-2">
                <Briefcase className="h-3 w-3 mr-1" />
                Détails
              </TabsTrigger>
              <TabsTrigger value="origin" className="text-xs py-2">
                <Search className="h-3 w-3 mr-1" />
                Origine
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: General Info */}
            <TabsContent value="general" className="space-y-4">
              <Card className="thread-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Informations Générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="firstName" className="text-sm">Prénom *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={handleChange} required className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm">Nom *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={handleChange} required className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Téléphone *</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="serviceType" className="text-sm">Type de Service</Label>
                    <Select value={formData.serviceType} onValueChange={(v) => handleSelectChange('serviceType', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Aucun</SelectItem>
                        <SelectItem value={ServiceType.GRAND_MENAGE}>Grand Ménage</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_FIN_CHANTIER}>Nettoyage Fin-Chantier</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_CANAPES_MATELAS}>Canapés & Matelas</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_TAPIS_MOQUETTES}>Tapis & Moquettes</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_VITRES}>Nettoyage Vitres</SelectItem>
                        <SelectItem value={ServiceType.TRAITEMENT_SOL}>Traitement Sol</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_FOURS}>Nettoyage Fours</SelectItem>
                        <SelectItem value={ServiceType.ENTRETIEN_JARDIN}>Entretien Jardin</SelectItem>
                        <SelectItem value={ServiceType.ENTRETIEN_PISCINE}>Entretien Piscine</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_FACADE}>Nettoyage Façade</SelectItem>
                        <SelectItem value={ServiceType.DESINFECTION_SANITAIRE}>Désinfection</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_BUREAUX}>Nettoyage Bureaux</SelectItem>
                        <SelectItem value={ServiceType.ENTRETIEN_REGULIER}>Entretien Régulier</SelectItem>
                        <SelectItem value={ServiceType.CRISTALLISATION_MARBRE}>Cristallisation Marbre</SelectItem>
                        <SelectItem value={ServiceType.VITRIFICATION_PARQUET}>Vitrification Parquet</SelectItem>
                        <SelectItem value={ServiceType.DECAPAGE_SOL}>Décapage Sol</SelectItem>
                        <SelectItem value={ServiceType.LUSTRAGE_MARBRE}>Lustrage Marbre</SelectItem>
                        <SelectItem value={ServiceType.POLISSAGE_BETON}>Polissage Béton</SelectItem>
                        <SelectItem value={ServiceType.NETTOYAGE_MOQUETTE_VAPEUR}>Moquette Vapeur</SelectItem>
                        <SelectItem value={ServiceType.AUTRES}>Autres Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-sm">Adresse</Label>
                    <Input id="address" value={formData.address} onChange={handleChange} placeholder="Quartier, rue, ville..." className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="gpsLocation" className="text-sm">GPS</Label>
                    <Input id="gpsLocation" value={formData.gpsLocation} onChange={handleChange} placeholder="Lien Maps..." className="h-9" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Details */}
            <TabsContent value="details" className="space-y-4">
              <Card className="thread-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4" />
                    Type de Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={formData.leadType} onValueChange={(v) => handleRadioChange('leadType', v)} className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PARTICULIER" id="r1" />
                      <Label htmlFor="r1" className="text-sm">Particulier</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PROFESSIONNEL" id="r2" />
                      <Label htmlFor="r2" className="text-sm">Entreprise</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PUBLIC" id="r3" />
                      <Label htmlFor="r3" className="text-sm">Organisme Public</Label>
                    </div>
                  </RadioGroup>
                  
                  {formData.leadType === 'PROFESSIONNEL' && (
                    <div className="space-y-3 mt-4">
                      <div>
                        <Label htmlFor="company" className="text-sm">Raison sociale *</Label>
                        <Input id="company" value={formData.company} onChange={handleChange} required className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="iceNumber" className="text-sm">Numéro ICE *</Label>
                        <Input id="iceNumber" value={formData.iceNumber} onChange={handleChange} required className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="activitySector" className="text-sm">Secteur d'activité</Label>
                        <Input id="activitySector" value={formData.activitySector} onChange={handleChange} className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="contactPosition" className="text-sm">Fonction du contact</Label>
                        <Input id="contactPosition" value={formData.contactPosition} onChange={handleChange} className="h-9" />
                      </div>
                    </div>
                  )}
                  {formData.leadType === 'PUBLIC' && (
                    <div className="space-y-3 mt-4">
                      <div>
                        <Label htmlFor="company" className="text-sm">Dénomination officielle *</Label>
                        <Input id="company" value={formData.company} onChange={handleChange} required className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="iceNumber" className="text-sm">Référence / ICE</Label>
                        <Input id="iceNumber" value={formData.iceNumber} onChange={handleChange} className="h-9" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="thread-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
                    Détails de la Demande
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as any)} className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SERVICE" id="req_service" />
                      <Label htmlFor="req_service" className="text-sm">Prestation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PRODUCTS" id="req_products" />
                      <Label htmlFor="req_products" className="text-sm">Produits</Label>
                    </div>
                  </RadioGroup>

                  {requestType === 'SERVICE' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="propertyType" className="text-sm">Type de propriété</Label>
                        <Select value={formData.propertyType} onValueChange={(v) => handleSelectChange('propertyType', v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(translations.PropertyType).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="estimatedSurface" className="text-sm">Surface (m²)</Label>
                        <Input id="estimatedSurface" type="number" value={formData.estimatedSurface} onChange={handleChange} className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="accessibility" className="text-sm">Accessibilité</Label>
                        <Select value={formData.accessibility} onValueChange={(v) => handleSelectChange('accessibility', v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(translations.AccessibilityLevel).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="urgencyLevel" className="text-sm">Urgence</Label>
                        <Select value={formData.urgencyLevel} onValueChange={(v) => handleSelectChange('urgencyLevel', v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(translations.UrgencyLevel).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="budgetRange" className="text-sm">Budget estimé</Label>
                        <Input id="budgetRange" value={formData.budgetRange} onChange={handleChange} className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="frequency" className="text-sm">Fréquence</Label>
                        <Select value={formData.frequency} onValueChange={(v) => handleSelectChange('frequency', v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(translations.Frequency).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="originalMessage" className="text-sm">Service(s) demandé(s)</Label>
                        <Textarea id="originalMessage" value={formData.originalMessage} onChange={handleChange} placeholder="Décrivez..." className="min-h-[80px]" />
                      </div>
                    </div>
                  )}

                  {requestType === 'PRODUCTS' && (
                    <div className="space-y-3">
                      {productRequests.map((product, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <Input placeholder="Nom" value={product.name} onChange={(e) => handleProductChange(index, 'name', e.target.value)} className="h-9" />
                          <Select value={product.category} onValueChange={(value) => handleProductChange(index, 'category', value)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLEANING_PRODUCTS">Nettoyage</SelectItem>
                              <SelectItem value="EQUIPMENT">Machines</SelectItem>
                              <SelectItem value="GARDENING">Jardinage</SelectItem>
                              <SelectItem value="POOL">Piscine</SelectItem>
                              <SelectItem value="PEST_CONTROL">Hygiène 3D</SelectItem>
                              <SelectItem value="PPE">EPI</SelectItem>
                              <SelectItem value="MISC">Divers</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Input type="number" placeholder="Qté" value={product.quantity} onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)} className="h-9 flex-1" />
                            <Input placeholder="Unité" value={product.unit} onChange={(e) => handleProductChange(index, 'unit', e.target.value)} className="h-9 flex-1" />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeProductRequest(index)} className="text-red-500 h-9 w-9">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addProductRequest} size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />Ajouter
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Origin & Assignment */}
            <TabsContent value="origin" className="space-y-4">
              <Card className="thread-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="h-4 w-4" />
                    Origine du Lead
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="channel" className="text-sm">Canal d'entrée *</Label>
                    <Select value={formData.channel} onValueChange={(v) => handleSelectChange('channel', v)} required>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(translations.LeadCanal).map(([key, value]) => (
                          <SelectItem key={key} value={key as string}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="source" className="text-sm">Source précise</Label>
                    <Input id="source" value={formData.source} onChange={handleChange} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="hasReferrer" checked={formData.hasReferrer} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasReferrer: !!checked }))} />
                      <Label htmlFor="hasReferrer" className="text-sm">Apporteur d'affaires ?</Label>
                    </div>
                    {formData.hasReferrer && (
                      <Input id="referrerContact" value={formData.referrerContact} onChange={handleChange} placeholder="Coordonnées et %" className="h-9" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="thread-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UsersIcon className="h-4 w-4" />
                    Attribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="assignedToId" className="text-sm">Assigner à</Label>
                    <Select value={formData.assignedToId} onValueChange={(v) => handleSelectChange('assignedToId', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Non assigné</SelectItem>
                        {assignableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: Original Layout (unchanged) */}
        <div className="hidden lg:block space-y-6">
          <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><User />Informations Générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label htmlFor="firstName">Prénom</Label><Input id="firstName" value={formData.firstName} onChange={handleChange} required /></div>
              <div><Label htmlFor="lastName">Nom</Label><Input id="lastName" value={formData.lastName} onChange={handleChange} required /></div>
              <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} /></div>
              <div className="md:col-span-2">
                <Label htmlFor="serviceType">Type de Service</Label>
                <Select value={formData.serviceType} onValueChange={(v) => handleSelectChange('serviceType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Aucun service sélectionné</SelectItem>
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
              <div className="md:col-span-2"><Label htmlFor="address">Adresse complète</Label><Input id="address" value={formData.address} onChange={handleChange} placeholder="Quartier, rue, ville..." /></div>
              <div className="md:col-span-2"><Label htmlFor="gpsLocation">Localisation GPS</Label><Input id="gpsLocation" value={formData.gpsLocation} onChange={handleChange} placeholder="Lien Google Maps, Lat/Lon..." /></div>
            </CardContent>
          </Card>

          <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Détails du Client</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={formData.leadType} onValueChange={(v) => handleRadioChange('leadType', v)} className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2"><RadioGroupItem value="PARTICULIER" id="r1" /><Label htmlFor="r1">Particulier</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="PROFESSIONNEL" id="r2" /><Label htmlFor="r2">Entreprise</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="PUBLIC" id="r3" /><Label htmlFor="r3">Organisme Public</Label></div>
              </RadioGroup>
              
              {formData.leadType === 'PROFESSIONNEL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><Label htmlFor="company">Raison sociale</Label><Input id="company" value={formData.company} onChange={handleChange} required /></div>
                  <div><Label htmlFor="iceNumber">Numéro ICE</Label><Input id="iceNumber" value={formData.iceNumber} onChange={handleChange} required /></div>
                  <div><Label htmlFor="activitySector">Secteur d'activité</Label><Input id="activitySector" value={formData.activitySector} onChange={handleChange} /></div>
                  <div><Label htmlFor="contactPosition">Fonction du contact</Label><Input id="contactPosition" value={formData.contactPosition} onChange={handleChange} /></div>
                  <div className="md:col-span-2"><Label htmlFor="department">Département / Service</Label><Input id="department" value={formData.department} onChange={handleChange} /></div>
                </div>
              )}
              {formData.leadType === 'PUBLIC' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><Label htmlFor="company">Dénomination officielle</Label><Input id="company" value={formData.company} onChange={handleChange} required /></div>
                  <div><Label htmlFor="iceNumber">Référence interne / ICE</Label><Input id="iceNumber" value={formData.iceNumber} onChange={handleChange} /></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Package />Détails de la Demande</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as any)} className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2"><RadioGroupItem value="SERVICE" id="req_service" /><Label htmlFor="req_service">Prestation de Service</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="PRODUCTS" id="req_products" /><Label htmlFor="req_products">Produits / Équipements</Label></div>
              </RadioGroup>

              {requestType === 'SERVICE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><Label htmlFor="propertyType">Type de propriété</Label><Select value={formData.propertyType} onValueChange={(v) => handleSelectChange('propertyType', v)}><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger><SelectContent>{Object.entries(translations.PropertyType).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label htmlFor="estimatedSurface">Surface Estimée (m²)</Label><Input id="estimatedSurface" type="number" value={formData.estimatedSurface} onChange={handleChange} /></div>
                  <div><Label htmlFor="accessibility">Accessibilité</Label><Select value={formData.accessibility} onValueChange={(v) => handleSelectChange('accessibility', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.AccessibilityLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label htmlFor="urgencyLevel">Urgence</Label><Select value={formData.urgencyLevel} onValueChange={(v) => handleSelectChange('urgencyLevel', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.UrgencyLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label htmlFor="budgetRange">Budget estimé</Label><Input id="budgetRange" value={formData.budgetRange} onChange={handleChange} /></div>
                  <div><Label htmlFor="frequency">Fréquence</Label><Select value={formData.frequency} onValueChange={(v) => handleSelectChange('frequency', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.Frequency).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="md:col-span-2"><Label htmlFor="originalMessage">Service(s) demandé(s) / Notes</Label><Textarea id="originalMessage" value={formData.originalMessage} onChange={handleChange} placeholder="Décrivez la prestation, les besoins spécifiques..."/></div>
                </div>
              )}

              {requestType === 'PRODUCTS' && (
                <div className="space-y-4">
                  {productRequests.map((product, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                      <Input placeholder="Nom / Référence" value={product.name} onChange={(e) => handleProductChange(index, 'name', e.target.value)} className="md:col-span-2"/>
                      <Select value={product.category} onValueChange={(value) => handleProductChange(index, 'category', value)}>
                        <SelectTrigger><SelectValue placeholder="Catégorie..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLEANING_PRODUCTS">Produits nettoyage</SelectItem>
                          <SelectItem value="EQUIPMENT">Machines</SelectItem>
                          <SelectItem value="GARDENING">Jardinage</SelectItem>
                          <SelectItem value="POOL">Piscine</SelectItem>
                          <SelectItem value="PEST_CONTROL">Hygiène 3D</SelectItem>
                          <SelectItem value="PPE">EPI</SelectItem>
                          <SelectItem value="MISC">Divers</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Qté" value={product.quantity} onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)}/>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Unité" value={product.unit} onChange={(e) => handleProductChange(index, 'unit', e.target.value)}/>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeProductRequest(index)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addProductRequest} className="mt-2"><Plus className="w-4 h-4 mr-2" />Ajouter une ligne</Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Search/>Origine du Lead</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label htmlFor="channel">Canal d'entrée</Label><Select value={formData.channel} onValueChange={(v) => handleSelectChange('channel', v)} required><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger><SelectContent>{Object.entries(translations.LeadCanal).map(([key, value]) => <SelectItem key={key} value={key as string}>{value}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="source">Source précise (campagne, contact...)</Label><Input id="source" value={formData.source} onChange={handleChange} /></div>
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="hasReferrer" checked={formData.hasReferrer} onCheckedChange={(checked) => setFormData(prev => ({...prev, hasReferrer: !!checked}))} />
                  <Label htmlFor="hasReferrer">Apporteur d'affaires / Médiateur ?</Label>
                </div>
                {formData.hasReferrer && <Input id="referrerContact" value={formData.referrerContact} onChange={handleChange} placeholder="Coordonnées et % commission"/>}
              </div>
            </CardContent>
          </Card>

          <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><UsersIcon />Suivi et Planification</CardTitle></CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="assignedToId">Assigner à</Label>
                <Select value={formData.assignedToId} onValueChange={(v) => handleSelectChange('assignedToId', v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir un agent..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Non assigné</SelectItem>
                    {assignableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button - Both Mobile and Desktop */}
        <div className="flex justify-end mt-6 sticky bottom-0 bg-background py-3 border-t lg:border-t-0 lg:static lg:bg-transparent">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-6 py-5 text-sm md:px-8 md:py-6 md:text-base w-full sm:w-auto" disabled={isLoading}>
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder le Lead'}
          </Button>
        </div>
      </form>
    </div>
  )
}