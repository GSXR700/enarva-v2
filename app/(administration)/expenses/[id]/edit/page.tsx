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
import { Lead, Mission, Expense } from '@prisma/client';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { cleanExpenseData } from '@/lib/validations';

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
    const [leads, setLeads] = useState<Lead[]>([]);
    
    const [formData, setFormData] = useState<Partial<Expense>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const fetchExpenseData = useCallback(async () => {
        if (!expenseId) return;
        try {
            const [expenseRes, missionsRes, leadsRes] = await Promise.all([
                fetch(`/api/expenses/${expenseId}`),
                fetch('/api/missions'),
                fetch('/api/leads'),
            ]);
            
            if (!expenseRes.ok) throw new Error("Dépense non trouvée.");

            const expenseData = await expenseRes.json();
            
            // Process the expense data for form display
            setFormData({
                ...expenseData,
                // Convert Date objects to strings for date inputs
                date: new Date(expenseData.date).toISOString().split('T')[0],
                rentalStartDate: expenseData.rentalStartDate ? new Date(expenseData.rentalStartDate).toISOString().split('T')[0] : '',
                rentalEndDate: expenseData.rentalEndDate ? new Date(expenseData.rentalEndDate).toISOString().split('T')[0] : '',
                // Convert null values to 'none' for Select components to fix Radix UI issue
                missionId: expenseData.missionId || 'none',
                leadId: expenseData.leadId || 'none',
            });
            
            setMissions(await missionsRes.json());
            setLeads(await leadsRes.json());
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
            // Prepare the data using the validation function from lib/validation.ts
            const cleanedData = cleanExpenseData({
                ...formData,
                // Convert 'none' back to null/empty string for validation processing
                missionId: formData.missionId === 'none' ? '' : formData.missionId,
                leadId: formData.leadId === 'none' ? '' : formData.leadId,
            });

            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedData),
            });
            
            if (!response.ok) throw new Error('Échec de la mise à jour de la dépense.');
            
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
                        Mise à jour de la dépense du {formData.date ? new Date(formData.date).toLocaleDateString() : ''}
                    </p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="thread-card">
                    <CardHeader>
                        <CardTitle>Détails de la Dépense</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor="date">Date</Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={formData.date?.toString() || ''} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        <div>
                            <Label htmlFor="amount">Montant (MAD)</Label>
                            <Input 
                                id="amount" 
                                type="number" 
                                step="0.01" 
                                value={formData.amount?.toString() || ''} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        <div>
                            <Label htmlFor="paymentMethod">Mode de paiement</Label>
                            <Select value={formData.paymentMethod || ''} onValueChange={(value) => handleSelectChange('paymentMethod', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="VIREMENT">Virement</SelectItem>
                                    <SelectItem value="CARTE">Carte</SelectItem>
                                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                                    <SelectItem value="MOBILE">Mobile</SelectItem>
                                    <SelectItem value="AUTRE">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="category">Catégorie</Label>
                            <Select value={formData.category || ''} onValueChange={(value) => handleSelectChange('category', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(expenseStructure).map(cat => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat.replace(/_/g, ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="subCategory">Sous-Catégorie</Label>
                            <Select value={formData.subCategory || ''} onValueChange={(value) => handleSelectChange('subCategory', value)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {formData.category && expenseStructure[formData.category as keyof typeof expenseStructure]?.map(subCat => (
                                        <SelectItem key={subCat} value={subCat}>
                                            {subCat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="vendor">Fournisseur / Payé à</Label>
                            <Input 
                                id="vendor" 
                                value={formData.vendor || ''} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <Label htmlFor="description">Description / Notes</Label>
                            <Textarea 
                                id="description" 
                                value={formData.description || ''} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div>
                            <Label htmlFor="missionId">Lier à une mission (optionnel)</Label>
                            <Select value={formData.missionId || 'none'} onValueChange={(value) => handleSelectChange('missionId', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucune</SelectItem>
                                    {missions.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.missionNumber}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="leadId">Lier à un lead (optionnel)</Label>
                            <Select value={formData.leadId || 'none'} onValueChange={(value) => handleSelectChange('leadId', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucun</SelectItem>
                                    {leads.map(l => (
                                        <SelectItem key={l.id} value={l.id}>
                                            {l.firstName} {l.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {isRental && (
                            <>
                                <div>
                                    <Label htmlFor="rentalStartDate">Début location</Label>
                                    <Input 
                                        id="rentalStartDate" 
                                        type="date" 
                                        value={formData.rentalStartDate?.toString() || ''} 
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="rentalEndDate">Fin location</Label>
                                    <Input 
                                        id="rentalEndDate" 
                                        type="date" 
                                        value={formData.rentalEndDate?.toString() || ''} 
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
                <div className="flex justify-end mt-6">
                    <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                    </Button>
                </div>
            </form>
        </div>
    );
}