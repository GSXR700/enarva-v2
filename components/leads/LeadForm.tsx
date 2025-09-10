// components/leads/LeadForm.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lead, LeadStatus, LeadType, PropertyType, AccessibilityLevel, UrgencyLevel, Frequency, ContractType, ProviderType, LeadCanal, EnarvaRole } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save, X, MapPin, Star } from 'lucide-react';

// Comprehensive Lead Schema with ALL fields
const leadSchema = z.object({
 // 1. General Information
 firstName: z.string().min(1, 'Prénom requis'),
 lastName: z.string().min(1, 'Nom requis'),
 phone: z.string().min(1, 'Téléphone requis'),
 email: z.string().email().optional().nullable(),
 address: z.string().optional().nullable(),
 gpsLocation: z.string().optional(),
 status: z.nativeEnum(LeadStatus),
 score: z.number().min(0).max(100).optional(),
 
 // 2. Professional Details
 leadType: z.nativeEnum(LeadType),
 company: z.string().optional(),
 iceNumber: z.string().optional(),
 activitySector: z.string().optional(),
 contactPosition: z.string().optional(),
 department: z.string().optional(),
 
 // 3. Request Details
 propertyType: z.nativeEnum(PropertyType).optional(),
 estimatedSurface: z.number().min(0).optional(),
 accessibility: z.nativeEnum(AccessibilityLevel).optional(),
 materials: z.object({
   marble: z.boolean().optional(),
   parquet: z.boolean().optional(),
   tiles: z.boolean().optional(),
   carpet: z.boolean().optional(),
   concrete: z.boolean().optional(),
   other: z.string().optional(),
 }).optional(),
 urgencyLevel: z.nativeEnum(UrgencyLevel).optional(),
 budgetRange: z.string().optional(),
 frequency: z.nativeEnum(Frequency).optional(),
 contractType: z.nativeEnum(ContractType).optional(),
 
 // 4. Products & Equipment
 needsProducts: z.boolean().optional(),
 needsEquipment: z.boolean().optional(),
 providedBy: z.nativeEnum(ProviderType).optional(),
 
 // 5. Lead Origin
 channel: z.nativeEnum(LeadCanal),
 source: z.string().optional(),
 hasReferrer: z.boolean().optional(),
 referrerContact: z.string().optional(),
 enarvaRole: z.nativeEnum(EnarvaRole).optional(),
 
 // 6. Follow-up
 originalMessage: z.string().min(1, 'Message original requis'),
 assignedToId: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
 lead?: Lead;
 onSuccess?: () => void;
 onCancel?: () => void;
}

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
 const [isLoading, setIsLoading] = useState(false);
 const [users, setUsers] = useState<Array<{id: string, name: string}>>([]);
 
 const form = useForm<LeadFormData>({
   resolver: zodResolver(leadSchema),
   defaultValues: lead
     ? {
         // Only pick fields relevant to the form schema and convert nulls to undefined
         firstName: lead.firstName,
         lastName: lead.lastName,
         phone: lead.phone,
         email: lead.email ?? undefined,
         address: lead.address ?? undefined,
         gpsLocation: lead.gpsLocation ?? undefined,
         status: lead.status,
         score: lead.score ?? 0,
         leadType: lead.leadType,
         company: lead.company ?? undefined,
         iceNumber: lead.iceNumber ?? undefined,
         activitySector: lead.activitySector ?? undefined,
         contactPosition: lead.contactPosition ?? undefined,
         department: lead.department ?? undefined,
         propertyType: lead.propertyType ?? undefined,
         estimatedSurface: lead.estimatedSurface ?? undefined,
         accessibility: lead.accessibility ?? undefined,
         materials: (lead.materials as any) || {
           marble: false,
           parquet: false,
           tiles: false,
           carpet: false,
           concrete: false,
           other: ''
         },
         urgencyLevel: lead.urgencyLevel ?? undefined,
         budgetRange: lead.budgetRange ?? undefined,
         frequency: lead.frequency ?? undefined,
         contractType: lead.contractType ?? undefined,
         needsProducts: lead.needsProducts ?? false,
         needsEquipment: lead.needsEquipment ?? false,
         providedBy: lead.providedBy ?? undefined,
         channel: lead.channel,
         source: lead.source ?? undefined,
         hasReferrer: lead.hasReferrer ?? false,
         referrerContact: lead.referrerContact ?? undefined,
         enarvaRole: lead.enarvaRole ?? undefined,
         originalMessage: lead.originalMessage,
         assignedToId: lead.assignedToId ?? undefined,
       }
     : {
         status: LeadStatus.NEW,
         score: 0,
         leadType: LeadType.PARTICULIER,
         accessibility: AccessibilityLevel.EASY,
         frequency: Frequency.PONCTUEL,
         contractType: ContractType.INTERVENTION_UNIQUE,
         providedBy: ProviderType.ENARVA,
         enarvaRole: EnarvaRole.PRESTATAIRE_PRINCIPAL,
         channel: LeadCanal.APPEL_TELEPHONIQUE,
         needsProducts: false,
         needsEquipment: false,
         hasReferrer: false,
         materials: {
           marble: false,
           parquet: false,
           tiles: false,
           carpet: false,
           concrete: false,
           other: ''
         }
       },
 });

 useEffect(() => {
   // Fetch users for assignment
   fetch('/api/users')
     .then(res => res.json())
     .then(data => setUsers(data))
     .catch(err => console.error('Failed to load users:', err));
 }, []);

 const onSubmit = async (data: LeadFormData) => {
   setIsLoading(true);
   try {
     const url = lead ? `/api/leads/${lead.id}` : '/api/leads';
     const method = lead ? 'PATCH' : 'POST';
     
     const response = await fetch(url, {
       method,
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data),
     });

     if (!response.ok) throw new Error('Failed to save lead');
     
     toast.success(lead ? 'Lead mis à jour' : 'Lead créé avec succès');
     onSuccess?.();
   } catch (error) {
     toast.error('Erreur lors de la sauvegarde');
     console.error('Save error:', error);
   } finally {
     setIsLoading(false);
   }
 };

 const watchLeadType = form.watch('leadType');
 const watchNeedsProducts = form.watch('needsProducts');
 const watchNeedsEquipment = form.watch('needsEquipment');
 const watchHasReferrer = form.watch('hasReferrer');

 return (
   <form onSubmit={form.handleSubmit(onSubmit)}>
     <Tabs defaultValue="general" className="w-full">
       <TabsList className="grid w-full grid-cols-6">
         <TabsTrigger value="general">Général</TabsTrigger>
         <TabsTrigger value="professional">Professionnel</TabsTrigger>
         <TabsTrigger value="request">Demande</TabsTrigger>
         <TabsTrigger value="products">Produits</TabsTrigger>
         <TabsTrigger value="origin">Origine</TabsTrigger>
         <TabsTrigger value="followup">Suivi</TabsTrigger>
       </TabsList>

       {/* 1. General Information Tab */}
       <TabsContent value="general">
         <Card>
           <CardHeader>
             <CardTitle>Informations Générales</CardTitle>
           </CardHeader>
           <CardContent className="grid grid-cols-2 gap-4">
             <div>
               <Label htmlFor="firstName">Prénom *</Label>
               <Input
                 id="firstName"
                 {...form.register('firstName')}
                 placeholder="Jean"
               />
               {form.formState.errors.firstName && (
                 <p className="text-sm text-red-500 mt-1">{form.formState.errors.firstName.message}</p>
               )}
             </div>

             <div>
               <Label htmlFor="lastName">Nom *</Label>
               <Input
                 id="lastName"
                 {...form.register('lastName')}
                 placeholder="Dupont"
               />
               {form.formState.errors.lastName && (
                 <p className="text-sm text-red-500 mt-1">{form.formState.errors.lastName.message}</p>
               )}
             </div>

             <div>
               <Label htmlFor="phone">Téléphone *</Label>
               <Input
                 id="phone"
                 {...form.register('phone')}
                 placeholder="+212 6XX XXX XXX"
               />
               {form.formState.errors.phone && (
                 <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone.message}</p>
               )}
             </div>

             <div>
               <Label htmlFor="email">Email</Label>
               <Input
                 id="email"
                 type="email"
                 {...form.register('email')}
                 placeholder="jean.dupont@example.com"
               />
             </div>

             <div className="col-span-2">
               <Label htmlFor="address">Adresse</Label>
               <Input
                 id="address"
                 {...form.register('address')}
                 placeholder="123 Rue Mohammed V, Casablanca"
               />
             </div>

             <div>
               <Label htmlFor="gpsLocation">
                 <MapPin className="w-4 h-4 inline mr-1" />
                 Coordonnées GPS
               </Label>
               <Input
                 id="gpsLocation"
                 {...form.register('gpsLocation')}
                 placeholder="33.5731, -7.5898"
               />
             </div>

             <div>
               <Label className="flex items-center gap-2">
                 <Star className="w-4 h-4" />
                 Score du Lead: {form.watch('score') || 0}/100
               </Label>
               <div className="mt-2">
                 <Slider
                   value={[form.watch('score') || 0]}
                   onValueChange={(value) => form.setValue('score', value[0])}
                   max={100}
                   step={5}
                   className="w-full"
                 />
                 <div className="flex justify-between text-xs text-muted-foreground mt-1">
                   <span>Faible (0)</span>
                   <span>Moyen (50)</span>
                   <span>Élevé (100)</span>
                 </div>
               </div>
             </div>

             <div>
               <Label htmlFor="status">Statut *</Label>
               <Select
                 value={form.watch('status')}
                 onValueChange={(value) => form.setValue('status', value as LeadStatus)}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={LeadStatus.NEW}>Nouveau</SelectItem>
                   <SelectItem value={LeadStatus.TO_QUALIFY}>À qualifier</SelectItem>
                   <SelectItem value={LeadStatus.WAITING_INFO}>En attente d'infos</SelectItem>
                   <SelectItem value={LeadStatus.QUALIFIED}>Qualifié</SelectItem>
                   <SelectItem value={LeadStatus.VISIT_PLANNED}>Visite planifiée</SelectItem>
                   <SelectItem value={LeadStatus.ON_VISIT}>En visite</SelectItem>
                   <SelectItem value={LeadStatus.VISIT_DONE}>Visite effectuée</SelectItem>
                   <SelectItem value={LeadStatus.QUOTE_SENT}>Devis envoyé</SelectItem>
                   <SelectItem value={LeadStatus.QUOTE_ACCEPTED}>Devis accepté</SelectItem>
                   <SelectItem value={LeadStatus.QUOTE_REFUSED}>Devis refusé</SelectItem>
                   <SelectItem value={LeadStatus.MISSION_SCHEDULED}>Mission planifiée</SelectItem>
                   <SelectItem value={LeadStatus.IN_PROGRESS}>En cours</SelectItem>
                   <SelectItem value={LeadStatus.COMPLETED}>Terminé</SelectItem>
                   <SelectItem value={LeadStatus.INTERVENTION_PLANNED}>Intervention planifiée</SelectItem>
                   <SelectItem value={LeadStatus.INTERVENTION_IN_PROGRESS}>Intervention en cours</SelectItem>
                   <SelectItem value={LeadStatus.INTERVENTION_DONE}>Intervention terminée</SelectItem>
                   <SelectItem value={LeadStatus.QUALITY_CONTROL}>Contrôle qualité</SelectItem>
                   <SelectItem value={LeadStatus.CLIENT_TO_CONFIRM_END}>En attente validation client</SelectItem>
                   <SelectItem value={LeadStatus.CLIENT_CONFIRMED}>Client confirmé</SelectItem>
                   <SelectItem value={LeadStatus.DELIVERY_PLANNED}>Livraison planifiée</SelectItem>
                   <SelectItem value={LeadStatus.DELIVERY_DONE}>Livraison effectuée</SelectItem>
                   <SelectItem value={LeadStatus.SIGNED_DELIVERY_NOTE}>Bon de livraison signé</SelectItem>
                   <SelectItem value={LeadStatus.PENDING_PAYMENT}>Paiement en attente</SelectItem>
                   <SelectItem value={LeadStatus.PAID_OFFICIAL}>Payé (officiel)</SelectItem>
                   <SelectItem value={LeadStatus.PAID_CASH}>Payé en espèces</SelectItem>
                   <SelectItem value={LeadStatus.REFUNDED}>Remboursé</SelectItem>
                   <SelectItem value={LeadStatus.PENDING_REFUND}>Remboursement en attente</SelectItem>
                   <SelectItem value={LeadStatus.FOLLOW_UP_SENT}>Relance envoyée</SelectItem>
                   <SelectItem value={LeadStatus.UPSELL_IN_PROGRESS}>Upsell en cours</SelectItem>
                   <SelectItem value={LeadStatus.UPSELL_CONVERTED}>Upsell converti</SelectItem>
                   <SelectItem value={LeadStatus.REWORK_PLANNED}>Reprise planifiée</SelectItem>
                   <SelectItem value={LeadStatus.REWORK_DONE}>Reprise effectuée</SelectItem>
                   <SelectItem value={LeadStatus.UNDER_WARRANTY}>Sous garantie</SelectItem>
                   <SelectItem value={LeadStatus.AFTER_SALES_SERVICE}>Service après-vente</SelectItem>
                   <SelectItem value={LeadStatus.CLIENT_ISSUE}>Problème client</SelectItem>
                   <SelectItem value={LeadStatus.IN_DISPUTE}>En litige</SelectItem>
                   <SelectItem value={LeadStatus.CLIENT_PAUSED}>Mis en pause par client</SelectItem>
                   <SelectItem value={LeadStatus.LEAD_LOST}>Perdu</SelectItem>
                   <SelectItem value={LeadStatus.CANCELLED}>Annulé</SelectItem>
                   <SelectItem value={LeadStatus.CANCELED_BY_CLIENT}>Annulé par client</SelectItem>
                   <SelectItem value={LeadStatus.CANCELED_BY_ENARVA}>Annulé par Enarva</SelectItem>
                   <SelectItem value={LeadStatus.INTERNAL_REVIEW}>Revue interne</SelectItem>
                   <SelectItem value={LeadStatus.AWAITING_PARTS}>En attente de pièces</SelectItem>
                   <SelectItem value={LeadStatus.CONTRACT_SIGNED}>Contrat signé</SelectItem>
                   <SelectItem value={LeadStatus.UNDER_CONTRACT}>Sous contrat</SelectItem>
                   <SelectItem value={LeadStatus.SUBCONTRACTED}>Sous-traité</SelectItem>
                   <SelectItem value={LeadStatus.OUTSOURCED}>Externalisé</SelectItem>
                   <SelectItem value={LeadStatus.WAITING_THIRD_PARTY}>En attente d'un tiers</SelectItem>
                   <SelectItem value={LeadStatus.PRODUCT_ONLY}>Produit uniquement</SelectItem>
                   <SelectItem value={LeadStatus.PRODUCT_SUPPLIER}>Fournisseur produit</SelectItem>
                   <SelectItem value={LeadStatus.DELIVERY_ONLY}>Livraison seule</SelectItem>
                   <SelectItem value={LeadStatus.AFFILIATE_LEAD}>Lead affilié</SelectItem>
                   <SelectItem value={LeadStatus.SUBCONTRACTOR_LEAD}>Lead sous-traitant</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </CardContent>
         </Card>
       </TabsContent>

       {/* 2. Professional Details Tab */}
       <TabsContent value="professional">
         <Card>
           <CardHeader>
             <CardTitle>Détails Professionnels</CardTitle>
           </CardHeader>
           <CardContent className="grid grid-cols-2 gap-4">
             <div>
               <Label htmlFor="leadType">Type de Lead *</Label>
               <Select
                 value={form.watch('leadType')}
                 onValueChange={(value) => form.setValue('leadType', value as LeadType)}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={LeadType.PARTICULIER}>Particulier</SelectItem>
                   <SelectItem value={LeadType.PROFESSIONNEL}>Professionnel</SelectItem>
                   <SelectItem value={LeadType.SYNDIC}>Syndic</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             {(watchLeadType === LeadType.PROFESSIONNEL || watchLeadType === LeadType.SYNDIC) && (
               <>
                 <div>
                   <Label htmlFor="company">Société</Label>
                   <Input
                     id="company"
                     {...form.register('company')}
                     placeholder="Nom de l'entreprise"
                   />
                 </div>

                 <div>
                   <Label htmlFor="iceNumber">N° ICE</Label>
                   <Input
                     id="iceNumber"
                     {...form.register('iceNumber')}
                     placeholder="ICE123456789"
                   />
                 </div>

                 <div>
                   <Label htmlFor="activitySector">Secteur d'Activité</Label>
                   <Input
                     id="activitySector"
                     {...form.register('activitySector')}
                     placeholder="Immobilier, Commerce, etc."
                   />
                 </div>

                 <div>
                   <Label htmlFor="contactPosition">Poste du Contact</Label>
                   <Input
                     id="contactPosition"
                     {...form.register('contactPosition')}
                     placeholder="Directeur, Manager, etc."
                   />
                 </div>

                 <div>
                   <Label htmlFor="department">Département</Label>
                   <Input
                     id="department"
                     {...form.register('department')}
                     placeholder="Services Généraux, etc."
                   />
                 </div>
               </>
             )}
           </CardContent>
         </Card>
       </TabsContent>

       {/* 3. Request Details Tab */}
       <TabsContent value="request">
         <Card>
           <CardHeader>
             <CardTitle>Détails de la Demande</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="propertyType">Type de Propriété</Label>
                 <Select
                   value={form.watch('propertyType') || ''}
                   onValueChange={(value) => form.setValue('propertyType', value as PropertyType)}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Sélectionner..." />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={PropertyType.APARTMENT_SMALL}>Appartement Petit</SelectItem>
                     <SelectItem value={PropertyType.APARTMENT_MEDIUM}>Appartement Moyen</SelectItem>
                     <SelectItem value={PropertyType.APARTMENT_LARGE}>Appartement Grand</SelectItem>
                     <SelectItem value={PropertyType.APARTMENT_MULTI}>Immeuble Résidentiel</SelectItem>
                     <SelectItem value={PropertyType.VILLA_SMALL}>Villa Petite</SelectItem>
                     <SelectItem value={PropertyType.VILLA_MEDIUM}>Villa Moyenne</SelectItem>
                     <SelectItem value={PropertyType.VILLA_LARGE}>Villa Grande</SelectItem>
                     <SelectItem value={PropertyType.PENTHOUSE}>Penthouse</SelectItem>
                     <SelectItem value={PropertyType.COMMERCIAL}>Local Commercial</SelectItem>
                     <SelectItem value={PropertyType.STORE}>Magasin</SelectItem>
                     <SelectItem value={PropertyType.HOTEL_STANDARD}>Hôtel Standard</SelectItem>
                     <SelectItem value={PropertyType.HOTEL_LUXURY}>Hôtel de Luxe</SelectItem>
                     <SelectItem value={PropertyType.OFFICE}>Bureau</SelectItem>
                     <SelectItem value={PropertyType.RESIDENCE_B2B}>Résidence B2B</SelectItem>
                     <SelectItem value={PropertyType.BUILDING}>Immeuble</SelectItem>
                     <SelectItem value={PropertyType.RESTAURANT}>Restaurant</SelectItem>
                     <SelectItem value={PropertyType.WAREHOUSE}>Entrepôt</SelectItem>
                     <SelectItem value={PropertyType.OTHER}>Autre</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <Label htmlFor="estimatedSurface">Surface Estimée (m²)</Label>
                 <Input
                   id="estimatedSurface"
                   type="number"
                   min="0"
                   {...form.register('estimatedSurface', { valueAsNumber: true })}
                   placeholder="150"
                 />
               </div>

               <div>
                 <Label htmlFor="accessibility">Accessibilité</Label>
                 <Select
                   value={form.watch('accessibility') || AccessibilityLevel.EASY}
                   onValueChange={(value) => form.setValue('accessibility', value as AccessibilityLevel)}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={AccessibilityLevel.EASY}>Facile</SelectItem>
                     <SelectItem value={AccessibilityLevel.MODERATE}>Modérée</SelectItem>
                     <SelectItem value={AccessibilityLevel.DIFFICULT}>Difficile</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <Label htmlFor="urgencyLevel">Niveau d'Urgence</Label>
                 <Select
                   value={form.watch('urgencyLevel') || ''}
                   onValueChange={(value) => form.setValue('urgencyLevel', value as UrgencyLevel)}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Sélectionner..." />
                   </SelectTrigger>
                   <SelectContent>
                       <SelectItem value={UrgencyLevel.LOW}>Faible</SelectItem>
                       <SelectItem value={UrgencyLevel.NORMAL}>Normal</SelectItem>
                       <SelectItem value={UrgencyLevel.URGENT}>Urgent</SelectItem>
                       <SelectItem value={UrgencyLevel.HIGH_URGENT}>Très Urgent</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <Label htmlFor="budgetRange">Budget</Label>
                 <Input
                   id="budgetRange"
                   {...form.register('budgetRange')}
                   placeholder="1000-5000 DH"
                 />
               </div>

               <div>
                 <Label htmlFor="frequency">Fréquence</Label>
                 <Select
                   value={form.watch('frequency') || Frequency.PONCTUEL}
                   onValueChange={(value) => form.setValue('frequency', value as Frequency)}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={Frequency.PONCTUEL}>Ponctuel</SelectItem>
                     <SelectItem value={Frequency.HEBDOMADAIRE}>Hebdomadaire</SelectItem>
                     <SelectItem value={Frequency.BIMENSUEL}>Bi-mensuel</SelectItem>
                     <SelectItem value={Frequency.MENSUEL}>Mensuel</SelectItem>
                     <SelectItem value={Frequency.TRIMESTRIEL}>Trimestriel</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <Label htmlFor="contractType">Type de Contrat</Label>
                 <Select
                   value={form.watch('contractType') || ContractType.INTERVENTION_UNIQUE}
                   onValueChange={(value) => form.setValue('contractType', value as ContractType)}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={ContractType.INTERVENTION_UNIQUE}>Intervention Unique</SelectItem>
                     <SelectItem value={ContractType.CONTRAT_CADRE}>Contrat Cadre</SelectItem>
                     <SelectItem value={ContractType.ABONNEMENT}>Abonnement</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>

             {/* Enhanced Materials Selection */}
             <div className="col-span-2">
               <Label className="mb-3 block">Matériaux présents</Label>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 {[
                   { key: 'marble', label: 'Marbre' },
                   { key: 'parquet', label: 'Parquet' },
                   { key: 'tiles', label: 'Carrelage' },
                   { key: 'carpet', label: 'Moquette' },
                   { key: 'concrete', label: 'Béton' }
                 ].map(({ key, label }) => (
                   <div key={key} className="flex items-center space-x-2">
                     <Checkbox
                       id={key}
                       checked={Boolean(form.watch(`materials.${key}` as any))}
                       onCheckedChange={(checked) => form.setValue(`materials.${key}` as any, Boolean(checked))}
                     />
                     <Label htmlFor={key} className="text-sm">{label}</Label>
                   </div>
                 ))}
               </div>
               <div className="mt-2">
                 <Input
                   placeholder="Autres matériaux..."
                   value={form.watch('materials.other') || ''}
                   onChange={(e) => form.setValue('materials.other', e.target.value)}
                 />
               </div>
             </div>
           </CardContent>
         </Card>
       </TabsContent>

       {/* 4. Products & Equipment Tab */}
       <TabsContent value="products">
         <Card>
           <CardHeader>
             <CardTitle>Produits & Équipements</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="flex items-center space-x-4">
               <Checkbox
                 id="needsProducts"
                 checked={form.watch('needsProducts') || false}
                 onCheckedChange={(checked) => 
                   form.setValue('needsProducts', checked as boolean)
                 }
               />
               <Label htmlFor="needsProducts">Besoin de produits de nettoyage</Label>
             </div>

             <div className="flex items-center space-x-4">
               <Checkbox
                 id="needsEquipment"
                 checked={form.watch('needsEquipment') || false}
                 onCheckedChange={(checked) => 
                   form.setValue('needsEquipment', checked as boolean)
                 }
               />
               <Label htmlFor="needsEquipment">Besoin d'équipement</Label>
             </div>

             {(watchNeedsProducts || watchNeedsEquipment) && (
               <div>
                 <Label htmlFor="providedBy">Fourni par</Label>
                 <Select
                   value={form.watch('providedBy') || ProviderType.ENARVA}
                   onValueChange={(value) => form.setValue('providedBy', value as ProviderType)}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={ProviderType.ENARVA}>Enarva</SelectItem>
                     <SelectItem value={ProviderType.CLIENT}>Client</SelectItem>
                     <SelectItem value={ProviderType.MIXTE}>Mixte</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             )}
           </CardContent>
         </Card>
       </TabsContent>

       {/* 5. Lead Origin Tab */}
       <TabsContent value="origin">
         <Card>
           <CardHeader>
             <CardTitle>Origine du Lead</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="channel">Canal d'Acquisition *</Label>
                 <Select
                   value={form.watch('channel')}
                   onValueChange={(value) => form.setValue('channel', value as LeadCanal)}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                       <SelectItem value={LeadCanal.WHATSAPP}>WhatsApp</SelectItem>
                       <SelectItem value={LeadCanal.FACEBOOK}>Facebook</SelectItem>
                       <SelectItem value={LeadCanal.INSTAGRAM}>Instagram</SelectItem>
                       <SelectItem value={LeadCanal.LINKEDIN}>LinkedIn</SelectItem>
                       <SelectItem value={LeadCanal.GOOGLE_MAPS}>Google Maps</SelectItem>
                       <SelectItem value={LeadCanal.GOOGLE_SEARCH}>Google Search</SelectItem>
                       <SelectItem value={LeadCanal.SITE_WEB}>Site Web</SelectItem>
                       <SelectItem value={LeadCanal.FORMULAIRE_SITE}>Formulaire site</SelectItem>
                       <SelectItem value={LeadCanal.MARKETPLACE}>Marketplace</SelectItem>
                       <SelectItem value={LeadCanal.YOUTUBE}>YouTube</SelectItem>
                       <SelectItem value={LeadCanal.EMAIL}>Email</SelectItem>
                       <SelectItem value={LeadCanal.APPORTEUR_AFFAIRES}>Apporteur d'affaires</SelectItem>
                       <SelectItem value={LeadCanal.COMMERCIAL_TERRAIN}>Commercial terrain</SelectItem>
                       <SelectItem value={LeadCanal.SALON_PROFESSIONNEL}>Salon professionnel</SelectItem>
                       <SelectItem value={LeadCanal.PARTENARIAT}>Partenariat</SelectItem>
                       <SelectItem value={LeadCanal.RECOMMANDATION_CLIENT}>Recommandation client</SelectItem>
                       <SelectItem value={LeadCanal.VISITE_BUREAU}>Visite bureau</SelectItem>
                       <SelectItem value={LeadCanal.EMPLOYE_ENARVA}>Employé Enarva</SelectItem>
                       <SelectItem value={LeadCanal.APPEL_TELEPHONIQUE}>Téléphone</SelectItem>
                       <SelectItem value={LeadCanal.SMS}>SMS</SelectItem>
                       <SelectItem value={LeadCanal.NUMERO_SUR_PUB}>Numéro sur pub</SelectItem>
                       <SelectItem value={LeadCanal.AFFICHE}>Affiche</SelectItem>
                       <SelectItem value={LeadCanal.FLYER}>Flyer</SelectItem>
                       <SelectItem value={LeadCanal.ENSEIGNE}>Enseigne</SelectItem>
                       <SelectItem value={LeadCanal.VOITURE_SIGLEE}>Voiture siglée</SelectItem>
                       <SelectItem value={LeadCanal.RADIO}>Radio</SelectItem>
                       <SelectItem value={LeadCanal.ANNONCE_PRESSE}>Annonce presse</SelectItem>
                       <SelectItem value={LeadCanal.TELE}>Télévision</SelectItem>
                       <SelectItem value={LeadCanal.MANUEL}>Manuel</SelectItem>
                       <SelectItem value={LeadCanal.SOURCING_INTERNE}>Sourcing interne</SelectItem>
                       <SelectItem value={LeadCanal.PORTE_A_PORTE}>Porte-à-porte</SelectItem>
                       <SelectItem value={LeadCanal.CHANTIER_EN_COURS}>Chantier en cours</SelectItem>
                       </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label htmlFor="source">Source Précise</Label>
                 <Input
                   id="source"
                   {...form.register('source')}
                   placeholder="Facebook Ad, Google, Salon..."
                 />
               </div>
             </div>

             <div className="space-y-3">
               <div className="flex items-center space-x-2">
                 <Checkbox
                   id="hasReferrer"
                   checked={form.watch('hasReferrer') || false}
                   onCheckedChange={(checked) => 
                     form.setValue('hasReferrer', checked as boolean)
                   }
                 />
                 <Label htmlFor="hasReferrer">Lead avec parrain/référent</Label>
               </div>

               {watchHasReferrer && (
                 <div>
                   <Label htmlFor="referrerContact">Contact du Parrain</Label>
                   <Input
                     id="referrerContact"
                     {...form.register('referrerContact')}
                     placeholder="Nom et téléphone du parrain"
                   />
                 </div>
               )}
             </div>

             <div>
               <Label htmlFor="enarvaRole">Rôle d'Enarva</Label>
               <Select
                 value={form.watch('enarvaRole') || EnarvaRole.PRESTATAIRE_PRINCIPAL}
                 onValueChange={(value) => form.setValue('enarvaRole', value as EnarvaRole)}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={EnarvaRole.PRESTATAIRE_PRINCIPAL}>Prestataire Principal</SelectItem>
                   <SelectItem value={EnarvaRole.SOUS_TRAITANT}>Sous-Traitant</SelectItem>
                   <SelectItem value={EnarvaRole.CO_TRAITANT}>Co-Traitant</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </CardContent>
         </Card>
       </TabsContent>

       {/* 6. Follow-up Tab */}
       <TabsContent value="followup">
         <Card>
           <CardHeader>
             <CardTitle>Suivi et Planification</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div>
               <Label htmlFor="originalMessage">Message Original *</Label>
               <Textarea
                 id="originalMessage"
                 {...form.register('originalMessage')}
                 placeholder="Description détaillée de la demande du client..."
                 rows={5}
               />
               {form.formState.errors.originalMessage && (
                 <p className="text-sm text-red-500 mt-1">{form.formState.errors.originalMessage.message}</p>
               )}
             </div>

             <div>
               <Label htmlFor="assignedToId">Assigné à</Label>
               <Select
                 value={form.watch('assignedToId') || ''}
                 onValueChange={(value) => form.setValue('assignedToId', value)}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner un utilisateur..." />
                 </SelectTrigger>
                 <SelectContent>
                   {users.map((user) => (
                     <SelectItem key={user.id} value={user.id}>
                       {user.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </CardContent>
         </Card>
       </TabsContent>
     </Tabs>

     {/* Action Buttons */}
     <div className="flex justify-end gap-4 mt-6">
       <Button
         type="button"
         variant="outline"
         onClick={onCancel}
         disabled={isLoading}
       >
         <X className="h-4 w-4 mr-2" />
         Annuler
       </Button>
       <Button type="submit" disabled={isLoading}>
         {isLoading ? (
           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
         ) : (
           <Save className="h-4 w-4 mr-2" />
         )}
         {lead ? 'Mettre à jour' : 'Créer'} le Lead
       </Button>
     </div>
   </form>
 );
}