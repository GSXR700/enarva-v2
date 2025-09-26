// app/(administration)/expenses/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { Mission, Expense } from '@prisma/client';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

// Import the validation function - update path as needed
// Note: If cleanExpenseData is not available, we'll implement basic validation inline
const cleanExpenseData = (data: any) => {
  const cleaned = { ...data };
  
  // Convert amount to number
  if (cleaned.amount && typeof cleaned.amount === 'string') {
    const amount = parseFloat(cleaned.amount);
    cleaned.amount = isNaN(amount) ? 0 : amount;
  }

  // Handle date fields
  ['date', 'rentalStartDate', 'rentalEndDate'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  // Convert empty strings to null for optional fields
  const optionalFields = ['vendor', 'description', 'proofUrl', 'missionId', 'leadId'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === 'none') {
      cleaned[field] = null;
    }
  });

  return cleaned;
};

const expenseStructure = {
  OPERATIONS: ["Produits de nettoyage", "Consommables", "Matériel & outils", "Produits jardinage", "Produits piscine", "Produits antinuisible", "Sous-traitance", "Énergie & fluides"],
  REVENTE_NEGOCE: ["Achats pour revente", "Transport & logistique", "Stockage & emballage", "Commissions"],
  RESSOURCES_HUMAINES: ["Main-d'œuvre journalière", "Salaires mensuels", "Primes et commissions", "Frais de mission", "Formations", "Uniformes & EPI"],
  ADMINISTRATIF_FINANCIER: ["Honoraires", "Frais bancaires", "Impôts et taxes", "Assurances", "Licences & abonnements"],
  MARKETING_COMMERCIAL: ["Publicité en ligne", "Supports physiques", "Événements & réseautage", "Site web & maintenance"],
  LOGISTIQUE_MOBILITE: ["Carburant", "Maintenance véhicules", "Location ou achat véhicules", "Frais de déplacement"],
  INFRASTRUCTURES_LOCAUX: ["Loyer", "Charges locales", "Aménagement & entretien"],
  LOCATIONS: ["Location de matériel", "Caution", "Frais de livraison", "Assurance matériel"],
  EXCEPTIONNELLES_DIVERSES: ["Investissements lourds", "Petits achats quotidiens", "Cadeaux clients", "Amendes", "Donations"],
};

export default function EditExpensePage() {
    const router = useRouter();
    const params = useParams();
    const expenseId = params.id as string;
    
    const [missions, setMissions] = useState<Mission[]>([]);
    
    const [formData, setFormData] = useState<Partial<Expense>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const fetchExpenseData = useCallback(async () => {
        if (!expenseId) return;
        try {
            const [expenseRes, missionsRes] = await Promise.all([
                fetch(`/api/expenses/${expenseId}`),
                fetch('/api/missions'),
            ]);
            
            if (!expenseRes.ok) throw new Error("Dépense non trouvée.");

            const expenseData = await expenseRes.json();
            const missionsData = await missionsRes.json();
            
            // Process the expense data for form display
            setFormData({
                ...expenseData,
                // Convert Date objects to strings for date inputs
                date: expenseData.date ? new Date(expenseData.date).toISOString().split('T')[0] : '',
                rentalStartDate: expenseData.rentalStartDate ? new Date(expenseData.rentalStartDate).toISOString().split('T')[0] : '',
                rentalEndDate: expenseData.rentalEndDate ? new Date(expenseData.rentalEndDate).toISOString().split('T')[0] : '',
                // Convert null values to 'none' for Select components to fix Radix UI issue
                missionId: expenseData.missionId || 'none',
                // Ensure amount is a string for the input
                amount: expenseData.amount ? expenseData.amount.toString() : '',
                // Ensure string values for text inputs
                vendor: expenseData.vendor || '',
                description: expenseData.description || ''
            });
            
            // Handle different response formats for missions
            setMissions(Array.isArray(missionsData) ? missionsData : (missionsData.missions || missionsData.data || []));
        } catch (err: any) {
            toast.error(err.message);
            router.push('/expenses');
        } finally {
            setIsLoading(false);
        }
    }, [expenseId, router]);

    useEffect(() => {
        fetchExpenseData();
    }, [fetchExpenseData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSelectChange = (id: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        
        // Reset subcategory when category changes
        if (id === 'category') {
            setFormData(prev => ({ ...prev, subCategory: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Prepare the data using the validation function
            const cleanedData = cleanExpenseData({
                ...formData,
                // Convert 'none' back to null/empty string for validation processing
                missionId: formData.missionId === 'none' ? '' : formData.missionId,
            });

            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedData),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Échec de la mise à jour de la dépense.');
            }
            
            toast.success("Dépense mise à jour avec succès !");
            router.push('/expenses');
            router.refresh();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const isRental = formData.category === 'LOCATIONS';

    if (isLoading) {
        return <TableSkeleton title="Chargement de la dépense..." />;
    }

    return (
        <div className="main-content space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/expenses">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Modifier une Dépense</h1>
                    <p className="text-muted-foreground mt-1">
                        Mise à jour de la dépense du {formData.date ? 
                            new Date(formData.date).toLocaleDateString('fr-FR') : 'N/A'
                        }
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="thread-card">
                    <CardHeader>
                        <CardTitle>Informations Générales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Date */}
                            <div>
                                <Label htmlFor="date">Date de la dépense *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={typeof formData.date === 'string' ? formData.date : ''}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <Label htmlFor="amount">Montant (MAD) *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={typeof formData.amount === 'string' ? formData.amount : (formData.amount?.toString() || '')}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <Label>Catégorie *</Label>
                                <Select 
                                    value={formData.category || ''} 
                                    onValueChange={(value) => handleSelectChange('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez une catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPERATIONS">Opérations</SelectItem>
                                        <SelectItem value="REVENTE_NEGOCE">Revente & Négoce</SelectItem>
                                        <SelectItem value="RESSOURCES_HUMAINES">Ressources Humaines</SelectItem>
                                        <SelectItem value="ADMINISTRATIF_FINANCIER">Administratif & Financier</SelectItem>
                                        <SelectItem value="MARKETING_COMMERCIAL">Marketing & Commercial</SelectItem>
                                        <SelectItem value="LOGISTIQUE_MOBILITE">Logistique & Mobilité</SelectItem>
                                        <SelectItem value="INFRASTRUCTURES_LOCAUX">Infrastructures & Locaux</SelectItem>
                                        <SelectItem value="LOCATIONS">Locations</SelectItem>
                                        <SelectItem value="EXCEPTIONNELLES_DIVERSES">Exceptionnelles & Diverses</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Subcategory */}
                            <div>
                                <Label>Sous-catégorie *</Label>
                                <Select 
                                    value={formData.subCategory || ''} 
                                    onValueChange={(value) => handleSelectChange('subCategory', value)}
                                    disabled={!formData.category}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez d'abord une catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formData.category && expenseStructure[formData.category as keyof typeof expenseStructure]?.map((subCat) => (
                                            <SelectItem key={subCat} value={subCat}>
                                                {subCat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <Label>Mode de paiement *</Label>
                                <Select 
                                    value={formData.paymentMethod || ''} 
                                    onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un mode de paiement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Espèces</SelectItem>
                                        <SelectItem value="VIREMENT">Virement</SelectItem>
                                        <SelectItem value="CARTE">Carte</SelectItem>
                                        <SelectItem value="CHEQUE">Chèque</SelectItem>
                                        <SelectItem value="MOBILE">Mobile</SelectItem>
                                        <SelectItem value="AUTRE">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Vendor */}
                            <div>
                                <Label htmlFor="vendor">Fournisseur</Label>
                                <Input
                                    id="vendor"
                                    type="text"
                                    value={formData.vendor || ''}
                                    onChange={handleChange}
                                    placeholder="Nom du fournisseur"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description || ''}
                                onChange={handleChange}
                                placeholder="Description détaillée de la dépense"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Rental dates for LOCATIONS category */}
                {isRental && (
                    <Card className="thread-card">
                        <CardHeader>
                            <CardTitle>Dates de Location</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="rentalStartDate">Date de début</Label>
                                    <Input
                                        id="rentalStartDate"
                                        type="date"
                                        value={typeof formData.rentalStartDate === 'string' ? formData.rentalStartDate : ''}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="rentalEndDate">Date de fin</Label>
                                    <Input
                                        id="rentalEndDate"
                                        type="date"
                                        value={typeof formData.rentalEndDate === 'string' ? formData.rentalEndDate : ''}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Mission and Lead associations */}
                <Card className="thread-card">
                    <CardHeader>
                        <CardTitle>Mission Associée</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            {/* Mission */}
                            <div>
                                <Label>Mission associée</Label>
                                <Select 
                                    value={formData.missionId || 'none'} 
                                    onValueChange={(value) => handleSelectChange('missionId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Aucune mission" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Aucune mission</SelectItem>
                                        {missions.map(mission => (
                                            <SelectItem key={mission.id} value={mission.id}>
                                                {mission.missionNumber} - {new Date(mission.scheduledDate).toLocaleDateString('fr-FR')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    La mission contient déjà les informations du client associé
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-4">
                    <Link href="/expenses">
                        <Button type="button" variant="outline">
                            Annuler
                        </Button>
                    </Link>
                    <Button type="submit" disabled={isSaving} className="gap-2">
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Mise à jour...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Mettre à jour
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}