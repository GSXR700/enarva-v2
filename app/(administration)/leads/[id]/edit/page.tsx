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

            const leadData = await leadResponse.json();
            const usersData = await usersResponse.json();
            
            setAssignableUsers(usersData);

            const cleanedData: any = {};
            for (const key in initialFormData) {
                if (leadData.hasOwnProperty(key)) {
                    // @ts-ignore
                    cleanedData[key] = leadData[key] === null ? '' : leadData[key];
                }
            }
            setFormData(cleanedData);

            if (leadData.materials && Array.isArray(leadData.materials) && leadData.materials.length > 0) {
                setRequestType('PRODUCTS');
                setProductRequests(leadData.materials);
            } else {
                setRequestType('SERVICE');
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
      };
      fetchLeadAndUsers();
    }
  }, [leadId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    // @ts-ignore
    const checked = e.target.checked;
    setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (id: keyof FormDataType, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value === 'null' ? null : value }));
  };

  const handleRadioChange = (id: keyof FormDataType, value: string) => {
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
    setIsLoading(true);

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
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) return <div className="main-content p-10 text-center">Chargement du lead...</div>

  return (
    <div className="main-content space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/leads"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Modifier le Lead</h1>
                <p className="text-muted-foreground mt-1">Mise à jour de {formData.firstName} {formData.lastName}.</p>
            </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* La structure du formulaire est identique à celle de la page de création */}
        <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><User />Informations Générales & Statut</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label htmlFor="firstName">Prénom</Label><Input id="firstName" value={formData.firstName || ''} onChange={handleChange} required /></div>
                <div><Label htmlFor="lastName">Nom</Label><Input id="lastName" value={formData.lastName || ''} onChange={handleChange} required /></div>
                <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" type="tel" value={formData.phone || ''} onChange={handleChange} required /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email || ''} onChange={handleChange} /></div>
                <div className="md:col-span-2"><Label htmlFor="address">Adresse complète</Label><Input id="address" value={formData.address || ''} onChange={handleChange} /></div>
                <div className="md:col-span-2"><Label htmlFor="gpsLocation">Localisation GPS</Label><Input id="gpsLocation" value={formData.gpsLocation || ''} onChange={handleChange} /></div>
                <div><Label htmlFor="status">Statut du Lead</Label><Select value={formData.status || ''} onValueChange={(v) => handleSelectChange('status', v as LeadStatus)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.LeadStatus).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="score">Score du Lead (0-10)</Label><Input id="score" type="number" value={formData.score || 0} onChange={handleChange} /></div>
            </CardContent>
        </Card>
        
        <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Détails du Client</CardTitle></CardHeader>
            <CardContent>
                <RadioGroup value={formData.leadType || 'PARTICULIER'} onValueChange={(v) => handleRadioChange('leadType', v)} className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PARTICULIER" id="r1_edit" /><Label htmlFor="r1_edit">Particulier</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PROFESSIONNEL" id="r2_edit" /><Label htmlFor="r2_edit">Entreprise</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PUBLIC" id="r3_edit" /><Label htmlFor="r3_edit">Organisme Public</Label></div>
                </RadioGroup>
                
                {formData.leadType === 'PROFESSIONNEL' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><Label htmlFor="company">Raison sociale</Label><Input id="company" value={formData.company || ''} onChange={handleChange} required /></div>
                        <div><Label htmlFor="iceNumber">Numéro ICE</Label><Input id="iceNumber" value={formData.iceNumber || ''} onChange={handleChange} required /></div>
                        <div><Label htmlFor="activitySector">Secteur d'activité</Label><Input id="activitySector" value={formData.activitySector || ''} onChange={handleChange} /></div>
                        <div><Label htmlFor="contactPosition">Fonction du contact</Label><Input id="contactPosition" value={formData.contactPosition || ''} onChange={handleChange} /></div>
                        <div className="md:col-span-2"><Label htmlFor="department">Département / Service</Label><Input id="department" value={formData.department || ''} onChange={handleChange} /></div>
                    </div>
                )}
                {formData.leadType === 'PUBLIC' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><Label htmlFor="company">Dénomination officielle</Label><Input id="company" value={formData.company || ''} onChange={handleChange} required /></div>
                        <div><Label htmlFor="iceNumber">Référence interne / ICE</Label><Input id="iceNumber" value={formData.iceNumber || ''} onChange={handleChange} /></div>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="thread-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Package />Détails de la Demande</CardTitle></CardHeader>
            <CardContent>
                <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as any)} className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="SERVICE" id="req_service_edit" /><Label htmlFor="req_service_edit">Prestation de Service</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PRODUCTS" id="req_products_edit" /><Label htmlFor="req_products_edit">Produits / Équipements</Label></div>
                </RadioGroup>

                {requestType === 'SERVICE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="propertyType">Type de propriété</Label>
                            <Select value={formData.propertyType || undefined} onValueChange={(v) => handleSelectChange('propertyType', v as PropertyType)}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>{Object.entries(translations.PropertyType).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="urgencyLevel">Urgence</Label><Select value={formData.urgencyLevel || 'NORMAL'} onValueChange={(v) => handleSelectChange('urgencyLevel', v as UrgencyLevel)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.UrgencyLevel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label htmlFor="budgetRange">Budget estimé</Label><Input id="budgetRange" value={formData.budgetRange || ''} onChange={handleChange} /></div>
                        <div><Label htmlFor="frequency">Fréquence</Label><Select value={formData.frequency || 'PONCTUEL'} onValueChange={(v) => handleSelectChange('frequency', v as Frequency)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(translations.Frequency).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                        <div className="md:col-span-2"><Label htmlFor="originalMessage">Service(s) demandé(s)</Label><Textarea id="originalMessage" value={formData.originalMessage || ''} onChange={handleChange} /></div>
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
                 <div><Label htmlFor="channel">Canal d’entrée</Label><Select value={formData.channel || ''} onValueChange={(v) => handleSelectChange('channel', v as LeadCanal)} required><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger><SelectContent>{Object.entries(translations.LeadCanal).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="source">Source précise</Label><Input id="source" value={formData.source || ''} onChange={handleChange} /></div>
                <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="hasReferrer" checked={!!formData.hasReferrer} onCheckedChange={(checked) => setFormData(prev => ({...prev, hasReferrer: !!checked}))} />
                        <Label htmlFor="hasReferrer">Apporteur d’affaires / Médiateur ?</Label>
                    </div>
                    {formData.hasReferrer && <Input id="referrerContact" value={formData.referrerContact || ''} onChange={handleChange} placeholder="Coordonnées et % commission"/>}
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
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </form>
    </div>
  )
}
