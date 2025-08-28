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
import { LeadCanal, LeadType, PropertyType, AccessibilityLevel, UrgencyLevel, Frequency, ContractType, User as PrismaUser, ProviderType, EnarvaRole } from '@prisma/client'
import { toast } from 'sonner'
import { translations } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

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
    // Section 2
    leadType: 'PARTICULIER' as LeadType, company: '', iceNumber: '', activitySector: '', contactPosition: '', department: '',
    // Section 3 (Service)
    propertyType: '' as PropertyType | '', estimatedSurface: '', accessibility: 'EASY' as AccessibilityLevel,
    urgencyLevel: 'NORMAL' as UrgencyLevel, budgetRange: '', frequency: 'PONCTUEL' as Frequency,
    contractType: 'INTERVENTION_UNIQUE' as ContractType,
    // Section 4 (Produits)
    needsProducts: false, needsEquipment: false, providedBy: 'ENARVA' as ProviderType,
    // Section 5 (Origine)
    channel: '' as LeadCanal | '', source: '', hasReferrer: false, referrerContact: '', enarvaRole: 'PRESTATAIRE_PRINCIPAL' as EnarvaRole,
    // Section 6 (Suivi)
    originalMessage: '', assignedToId: '',
  });

  useEffect(() => {
    // Charger les utilisateurs assignables au montage du composant
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users'); // Récupère tous les utilisateurs
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
    // Gérer le cas où l'utilisateur dé-sélectionne une valeur pour la rendre compatible avec l'API
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
        materials: requestType === 'PRODUCTS' ? productRequests : null,
        assignedToId: formData.assignedToId || null, // S'assurer que les chaînes vides deviennent null
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
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Créer un Nouveau Lead</h1>
          <p className="text-muted-foreground mt-1">Saisissez toutes les informations du nouveau prospect.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><User />Informations Générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label htmlFor="firstName">Prénom</Label><Input id="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                <div><Label htmlFor="lastName">Nom</Label><Input id="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} /></div>
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
                        <div><Label htmlFor="propertyType">Type de propriété</Label><Select value={formData.propertyType || undefined} onValueChange={(v) => handleSelectChange('propertyType', v as PropertyType)}><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger><SelectContent>{Object.entries(translations.PropertyType).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label htmlFor="estimatedSurface">Surface Estimée (m²)</Label><Input id="estimatedSurface" type="number" value={formData.estimatedSurface} onChange={handleChange} /></div>
                        <div><Label htmlFor="accessibility">Accessibilité</Label><Select value={formData.accessibility} onValueChange={(v) => handleSelectChange('accessibility', v as AccessibilityLevel)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.AccessibilityLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label htmlFor="urgencyLevel">Urgence</Label><Select value={formData.urgencyLevel} onValueChange={(v) => handleSelectChange('urgencyLevel', v as UrgencyLevel)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.UrgencyLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label htmlFor="budgetRange">Budget estimé</Label><Input id="budgetRange" value={formData.budgetRange} onChange={handleChange} /></div>
                        <div><Label htmlFor="frequency">Fréquence</Label><Select value={formData.frequency} onValueChange={(v) => handleSelectChange('frequency', v as Frequency)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.Frequency).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
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
                 <div><Label htmlFor="channel">Canal d’entrée</Label><Select value={formData.channel || undefined} onValueChange={(v) => handleSelectChange('channel', v as LeadCanal)} required><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger><SelectContent>{Object.entries(translations.LeadCanal).map(([key, value]) => <SelectItem key={key} value={key as string}>{value}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="source">Source précise (campagne, contact...)</Label><Input id="source" value={formData.source} onChange={handleChange} /></div>
                <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="hasReferrer" checked={formData.hasReferrer} onCheckedChange={(checked) => setFormData(prev => ({...prev, hasReferrer: !!checked}))} />
                        <Label htmlFor="hasReferrer">Apporteur d’affaires / Médiateur ?</Label>
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
                    <Select value={formData.assignedToId || undefined} onValueChange={(v) => handleSelectChange('assignedToId', v)}>
                        <SelectTrigger><SelectValue placeholder="Choisir un agent..." /></SelectTrigger>
                        <SelectContent>
                            {/* Correction: Utiliser une valeur non-vide pour l'option "Non assigné" */}
                            <SelectItem value="null">Non assigné</SelectItem>
                            {assignableUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8 py-6 text-base" disabled={isLoading}>
            {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder le Lead'}
          </Button>
        </div>
      </form>
    </div>
  )
}