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
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, User, Briefcase, Search, Package, Plus, Trash2, Users as UsersIcon, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { User as PrismaUser, ServiceType } from '@prisma/client'
import { toast } from 'sonner'
import { translations } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type ProductRequest = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
};

type Step = 1 | 2 | 3 | 4;

export default function NewLeadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
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

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
          toast.error('Veuillez remplir tous les champs obligatoires (Prénom, Nom, Téléphone)');
          return false;
        }
        return true;
      case 2:
        if (formData.leadType === 'PROFESSIONNEL' && (!formData.company || !formData.iceNumber)) {
          toast.error("La raison sociale et l'ICE sont obligatoires pour les professionnels.");
          return false;
        }
        if (formData.leadType === 'PUBLIC' && !formData.company) {
          toast.error("La dénomination officielle est obligatoire pour les organismes publics.");
          return false;
        }
        return true;
      case 3:
        if (!formData.channel) {
          toast.error("Veuillez sélectionner un canal d'entrée.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((currentStep + 1) as Step);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
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

  const steps = [
    { number: 1, title: 'Informations', subtitle: 'Générales', icon: User },
    { number: 2, title: 'Détails', subtitle: 'Client', icon: Briefcase },
    { number: 3, title: 'Origine', subtitle: 'et Suivi', icon: Search },
    { number: 4, title: 'Révision', subtitle: 'et Création', icon: Check },
  ];

  const renderStepIndicator = () => (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-border/30 rounded-full">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Circles */}
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const StepIcon = step.icon;

          return (
            <div key={step.number} className="flex flex-col items-center relative z-10" style={{ width: '25%' }}>
              <motion.div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-2
                  transition-all duration-300 shadow-lg
                  ${isCompleted ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' :
                    isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-4 ring-blue-500/20' :
                    'bg-muted text-muted-foreground'}
                `}
                whileHover={{ scale: 1.05 }}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </motion.div>
              <div className="text-center hidden md:block">
                <p className={`text-xs font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </p>
                <p className={`text-[10px] ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {step.subtitle}
                </p>
              </div>
              {/* Mobile: Show only active step title */}
              <div className="md:hidden text-center">
                {isActive && (
                  <p className="text-xs font-semibold text-foreground">
                    {step.title}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    const fadeVariants = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    };

    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Informations Générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium">Prénom *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium">Nom *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={handleChange} required className="mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">Téléphone *</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required className="mt-1.5" placeholder="+212 6XX XXX XXX" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} className="mt-1.5" placeholder="exemple@email.com" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="serviceType" className="text-sm font-medium">Type de Service</Label>
                  <Select value={formData.serviceType} onValueChange={(v) => handleSelectChange('serviceType', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sélectionner un service..." />
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
                  <Label htmlFor="address" className="text-sm font-medium">Adresse</Label>
                  <Input id="address" value={formData.address} onChange={handleChange} placeholder="Quartier, rue, ville..." className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="gpsLocation" className="text-sm font-medium">Localisation GPS</Label>
                  <Input id="gpsLocation" value={formData.gpsLocation} onChange={handleChange} placeholder="Lien Google Maps ou coordonnées..." className="mt-1.5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Type de Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={formData.leadType} onValueChange={(v) => handleRadioChange('leadType', v)} className="flex flex-col md:flex-row gap-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PARTICULIER" id="r1" />
                    <Label htmlFor="r1" className="text-sm cursor-pointer">Particulier</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PROFESSIONNEL" id="r2" />
                    <Label htmlFor="r2" className="text-sm cursor-pointer">Entreprise</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PUBLIC" id="r3" />
                    <Label htmlFor="r3" className="text-sm cursor-pointer">Organisme Public</Label>
                  </div>
                </RadioGroup>
                
                {formData.leadType === 'PROFESSIONNEL' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
                  >
                    <div>
                      <Label htmlFor="company" className="text-sm font-medium">Raison sociale *</Label>
                      <Input id="company" value={formData.company} onChange={handleChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="iceNumber" className="text-sm font-medium">Numéro ICE *</Label>
                      <Input id="iceNumber" value={formData.iceNumber} onChange={handleChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="activitySector" className="text-sm font-medium">Secteur d'activité</Label>
                      <Input id="activitySector" value={formData.activitySector} onChange={handleChange} className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="contactPosition" className="text-sm font-medium">Fonction du contact</Label>
                      <Input id="contactPosition" value={formData.contactPosition} onChange={handleChange} className="mt-1.5" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="department" className="text-sm font-medium">Département / Service</Label>
                      <Input id="department" value={formData.department} onChange={handleChange} className="mt-1.5" />
                    </div>
                  </motion.div>
                )}
                {formData.leadType === 'PUBLIC' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
                  >
                    <div>
                      <Label htmlFor="company" className="text-sm font-medium">Dénomination officielle *</Label>
                      <Input id="company" value={formData.company} onChange={handleChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="iceNumber" className="text-sm font-medium">Référence / ICE</Label>
                      <Input id="iceNumber" value={formData.iceNumber} onChange={handleChange} className="mt-1.5" />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Détails de la Demande
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as any)} className="flex flex-col md:flex-row gap-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SERVICE" id="req_service" />
                    <Label htmlFor="req_service" className="text-sm cursor-pointer">Prestation de Service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PRODUCTS" id="req_products" />
                    <Label htmlFor="req_products" className="text-sm cursor-pointer">Produits / Équipements</Label>
                  </div>
                </RadioGroup>

                {requestType === 'SERVICE' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
                  >
                    <div>
                      <Label htmlFor="propertyType" className="text-sm font-medium">Type de propriété</Label>
                      <Select value={formData.propertyType} onValueChange={(v) => handleSelectChange('propertyType', v)}>
                        <SelectTrigger className="mt-1.5">
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
                      <Label htmlFor="estimatedSurface" className="text-sm font-medium">Surface (m²)</Label>
                      <Input id="estimatedSurface" type="number" value={formData.estimatedSurface} onChange={handleChange} className="mt-1.5" placeholder="Ex: 120" />
                    </div>
                    <div>
                      <Label htmlFor="accessibility" className="text-sm font-medium">Accessibilité</Label>
                      <Select value={formData.accessibility} onValueChange={(v) => handleSelectChange('accessibility', v)}>
                        <SelectTrigger className="mt-1.5">
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
                      <Label htmlFor="urgencyLevel" className="text-sm font-medium">Niveau d'Urgence</Label>
                      <Select value={formData.urgencyLevel} onValueChange={(v) => handleSelectChange('urgencyLevel', v)}>
                        <SelectTrigger className="mt-1.5">
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
                      <Label htmlFor="budgetRange" className="text-sm font-medium">Budget estimé</Label>
                      <Input id="budgetRange" value={formData.budgetRange} onChange={handleChange} className="mt-1.5" placeholder="Ex: 5000-10000 DH" />
                    </div>
                    <div>
                      <Label htmlFor="frequency" className="text-sm font-medium">Fréquence</Label>
                      <Select value={formData.frequency} onValueChange={(v) => handleSelectChange('frequency', v)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(translations.Frequency).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="originalMessage" className="text-sm font-medium">Service(s) demandé(s)</Label>
                      <Textarea 
                        id="originalMessage" 
                        value={formData.originalMessage} 
                        onChange={handleChange} 
                        placeholder="Décrivez les besoins spécifiques du client..." 
                        className="mt-1.5 min-h-[100px]"
                      />
                    </div>
                  </motion.div>
                )}

                {requestType === 'PRODUCTS' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-2"
                  >
                    {productRequests.map((product, index) => (
                      <div key={index} className="border rounded-xl p-4 space-y-3 bg-muted/30">
                        <Input 
                          placeholder="Nom du produit" 
                          value={product.name} 
                          onChange={(e) => handleProductChange(index, 'name', e.target.value)} 
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={product.category} onValueChange={(value) => handleProductChange(index, 'category', value)}>
                            <SelectTrigger>
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
                            <Input 
                              type="number" 
                              placeholder="Qté" 
                              value={product.quantity} 
                              onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)} 
                              className="flex-1"
                            />
                            <Input 
                              placeholder="Unité" 
                              value={product.unit} 
                              onChange={(e) => handleProductChange(index, 'unit', e.target.value)} 
                              className="flex-1"
                            />
                          </div>
                        </div>
                        {productRequests.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeProductRequest(index)} 
                            className="text-red-500 hover:text-red-700 w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addProductRequest} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un produit
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5 text-primary" />
                  Origine du Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="channel" className="text-sm font-medium">Canal d'entrée *</Label>
                    <Select value={formData.channel} onValueChange={(v) => handleSelectChange('channel', v)} required>
                      <SelectTrigger className="mt-1.5">
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
                    <Label htmlFor="source" className="text-sm font-medium">Source précise</Label>
                    <Input 
                      id="source" 
                      value={formData.source} 
                      onChange={handleChange} 
                      className="mt-1.5" 
                      placeholder="Campagne, contact, etc."
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hasReferrer" 
                      checked={formData.hasReferrer} 
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasReferrer: !!checked }))} 
                    />
                    <Label htmlFor="hasReferrer" className="text-sm cursor-pointer">Apporteur d'affaires ?</Label>
                  </div>
                  {formData.hasReferrer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <Input 
                        id="referrerContact" 
                        value={formData.referrerContact} 
                        onChange={handleChange} 
                        placeholder="Coordonnées et % commission" 
                      />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersIcon className="h-5 w-5 text-primary" />
                  Attribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="assignedToId" className="text-sm font-medium">Assigner à</Label>
                  <Select value={formData.assignedToId} onValueChange={(v) => handleSelectChange('assignedToId', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choisir un agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Non assigné</SelectItem>
                      {assignableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Check className="h-5 w-5 text-green-500" />
                  Révision et Création
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Section */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Informations Générales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nom complet:</span>
                        <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Téléphone:</span>
                        <p className="font-medium">{formData.phone}</p>
                      </div>
                      {formData.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{formData.email}</p>
                        </div>
                      )}
                      {formData.serviceType && (
                        <div>
                          <span className="text-muted-foreground">Service:</span>
                          <p className="font-medium">{formData.serviceType}</p>
                        </div>
                      )}
                      {formData.address && (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Adresse:</span>
                          <p className="font-medium">{formData.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Type de Client
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium">{formData.leadType === 'PARTICULIER' ? 'Particulier' : formData.leadType === 'PROFESSIONNEL' ? 'Entreprise' : 'Organisme Public'}</p>
                      </div>
                      {formData.company && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Société:</span>
                            <p className="font-medium">{formData.company}</p>
                          </div>
                          {formData.iceNumber && (
                            <div>
                              <span className="text-muted-foreground">ICE:</span>
                              <p className="font-medium">{formData.iceNumber}</p>
                            </div>
                          )}
                        </>
                      )}
                      {requestType === 'SERVICE' && formData.originalMessage && (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Description:</span>
                          <p className="font-medium text-xs">{formData.originalMessage.substring(0, 100)}{formData.originalMessage.length > 100 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Origine et Attribution
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {formData.channel && (
                        <div>
                          <span className="text-muted-foreground">Canal:</span>
                          <p className="font-medium">{translations.LeadCanal[formData.channel as keyof typeof translations.LeadCanal] || formData.channel}</p>
                        </div>
                      )}
                      {formData.source && (
                        <div>
                          <span className="text-muted-foreground">Source:</span>
                          <p className="font-medium">{formData.source}</p>
                        </div>
                      )}
                      {formData.assignedToId && (
                        <div>
                          <span className="text-muted-foreground">Assigné à:</span>
                          <p className="font-medium">
                            {assignableUsers.find(u => u.id === formData.assignedToId)?.name || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Vérifiez attentivement les informations ci-dessus avant de créer le lead. Une fois créé, vous pourrez toujours le modifier depuis la page des leads.</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/leads">
            <Button variant="outline" size="icon" className="rounded-xl shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Créer un Nouveau Lead</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complétez les informations en {steps.length} étapes
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          {/* Navigation Buttons - Fixed at Bottom on Mobile */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 -mx-4 md:mx-0 md:static md:bg-transparent md:border-0 md:backdrop-blur-none md:p-0">
            <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="rounded-xl shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>

              <div className="flex items-center gap-2">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className={`h-1.5 rounded-full transition-all ${
                      step.number === currentStep ? 'w-8 bg-primary' :
                      step.number < currentStep ? 'w-4 bg-green-500' :
                      'w-4 bg-muted'
                    }`}
                  />
                ))}
              </div>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="rounded-xl shadow-lg shadow-primary/20"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl shadow-lg shadow-green-500/20 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Créer le Lead
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}