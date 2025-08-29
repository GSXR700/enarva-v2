// app/(administration)/settings/templates/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { TaskCategory } from '@prisma/client';
import { toast } from 'sonner';

// Type definitions for our state
type TaskTemplateItem = {
    id?: string; // Optional ID for existing items
    title: string;
    category: TaskCategory;
};

type TaskTemplate = {
    id: string;
    name: string;
    description?: string | null;
    items: TaskTemplateItem[];
};

const initialFormState = {
    id: null as string | null,
    name: '',
    description: '',
    items: [{ title: '', category: 'EXTERIOR_FACADE' as TaskCategory }],
};

export default function TaskTemplatesPage() {
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formState, setFormState] = useState(initialFormState);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/task-templates');
            if (!response.ok) throw new Error("Failed to fetch templates");
            const data = await response.json();
            setTemplates(data);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemChange = (index: number, field: keyof TaskTemplateItem, value: string) => {
        const updatedItems = [...formState.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setFormState(prev => ({ ...prev, items: updatedItems }));
    };

    const addItem = () => setFormState(prev => ({ ...prev, items: [...prev.items, { title: '', category: 'EXTERIOR_FACADE' }] }));
    const removeItem = (index: number) => setFormState(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

    const handleSelectTemplateForEdit = (template: TaskTemplate) => {
        setFormState({
            id: template.id,
            name: template.name,
            description: template.description || '',
            items: template.items && template.items.length > 0 ? template.items : [{ title: '', category: 'EXTERIOR_FACADE' }],
        });
    };

    const resetForm = () => setFormState(initialFormState);

    const handleDelete = async (templateId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.")) return;
        
        try {
            const response = await fetch(`/api/task-templates/${templateId}`, { method: 'DELETE' });
            if (response.status !== 204) throw new Error("Failed to delete template");
            toast.success("Modèle supprimé avec succès !");
            await fetchTemplates(); // Refresh the list
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const isEditing = formState.id !== null;
        const url = isEditing ? `/api/task-templates/${formState.id}` : '/api/task-templates';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formState.name, description: formState.description, items: formState.items }),
            });
            if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} template`);
            
            toast.success(`Modèle ${isEditing ? 'mis à jour' : 'créé'} avec succès !`);
            resetForm();
            await fetchTemplates(); // Refresh the list
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="main-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Left Column: List of Templates */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Modèles de Checklist</CardTitle>
                        <CardDescription>Visualisez, modifiez ou supprimez les checklists existantes.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto space-y-3">
                        {isLoading ? <p>Chargement...</p> : templates.map(template => (
                            <div key={template.id} className="border p-4 rounded-lg flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-bold text-foreground">{template.name}</h3>
                                    {/* --- THE FIX IS HERE --- */}
                                    <p className="text-sm text-muted-foreground">{template.items?.length || 0} tâche(s)</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleSelectTemplateForEdit(template)}><Edit className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Right Column: Create/Edit Form */}
                <Card className="sticky top-20">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{formState.id ? 'Modifier le Modèle' : 'Créer un Nouveau Modèle'}</CardTitle>
                                <CardDescription>{formState.id ? `Modification de "${formState.name}"` : 'Ajoutez une nouvelle checklist réutilisable.'}</CardDescription>
                            </div>
                            {formState.id && (
                                <Button variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4 mr-2"/>Annuler</Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nom du modèle</Label>
                                <Input id="name" value={formState.name} onChange={(e) => setFormState({...formState, name: e.target.value})} required />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" value={formState.description} onChange={(e) => setFormState({...formState, description: e.target.value})} />
                            </div>
                            <hr/>
                            <Label>Tâches de la checklist</Label>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {formState.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input 
                                            placeholder="Titre de la tâche" 
                                            value={item.title} 
                                            onChange={(e) => handleItemChange(index, 'title', e.target.value)} 
                                            required 
                                        />
                                        <Select value={item.category} onValueChange={(value) => handleItemChange(index, 'category', value as TaskCategory)}>
                                            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.values(TaskCategory).map(cat => <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" onClick={addItem} className="w-full"><Plus className="w-4 h-4 mr-2"/>Ajouter une tâche</Button>
                            <Button type="submit" className="w-full bg-enarva-gradient" disabled={isLoading}>
                                <Save className="w-4 h-4 mr-2"/>
                                {isLoading ? "Enregistrement..." : (formState.id ? "Sauvegarder les Modifications" : "Créer le Modèle")}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}