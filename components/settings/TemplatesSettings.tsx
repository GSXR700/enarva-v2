// components/settings/TemplatesSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Edit, Save, X, FileText, Loader2 } from 'lucide-react'
import { TaskCategory } from '@prisma/client'
import { toast } from 'sonner'

// Type definitions - FIXED to match database structure
type TaskTemplateItem = {
  id?: string
  title: string
  category: TaskCategory
}

type TaskTemplate = {
  id: string
  name: string
  description?: string | null
  tasks: TaskTemplateItem[] | any // JSON field from database
  category: TaskCategory
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type FormTaskTemplate = {
  id: string
  name: string
  description?: string | null | undefined // Allow undefined to match exactOptionalPropertyTypes
  items: TaskTemplateItem[] // UI representation
}

const initialFormState = {
  id: null as string | null,
  name: '',
  description: '',
  items: [{ title: '', category: 'GENERAL' as TaskCategory }]
}

const categoryLabels: { [key in TaskCategory]: string } = {
  GENERAL: 'Général',
  EXTERIOR_FACADE: 'Façade Extérieure',
  WALLS_BASEBOARDS: 'Murs et Plinthes',
  FLOORS: 'Sols',
  STAIRS: 'Escaliers',
  WINDOWS_JOINERY: 'Fenêtres et Menuiserie',
  KITCHEN: 'Cuisine',
  BATHROOM_SANITARY: 'Salle de Bain',
  LIVING_SPACES: 'Espaces de Vie',
  LOGISTICS_ACCESS: 'Logistique et Accès'
}

// FIXED: Helper function to extract tasks from database JSON format
const extractTasksFromTemplate = (template: TaskTemplate): TaskTemplateItem[] => {
  if (!template.tasks) return []
  
  // If tasks is already an array, return it
  if (Array.isArray(template.tasks)) {
    return template.tasks
  }
  
  // If it's a JSON object, try different structures
  if (typeof template.tasks === 'object') {
    // Check for nested structure like { items: { create: [...] } }
    if (template.tasks.items && template.tasks.items.create && Array.isArray(template.tasks.items.create)) {
      return template.tasks.items.create
    }
    
    // Check for direct items structure like { items: [...] }
    if (template.tasks.items && Array.isArray(template.tasks.items)) {
      return template.tasks.items
    }
    
    // Check if it's directly an array of tasks
    if (Object.values(template.tasks).every((item: any) => item && typeof item.title === 'string')) {
      return Object.values(template.tasks) as TaskTemplateItem[]
    }
  }
  
  return []
}

export function TemplatesSettings() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [displayTemplates, setDisplayTemplates] = useState<FormTaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState(initialFormState)

  useEffect(() => {
    fetchTemplates()
  }, [])

  // FIXED: Process templates for display
  useEffect(() => {
    const processedTemplates: FormTaskTemplate[] = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || undefined, // Convert null to undefined for consistency
      items: extractTasksFromTemplate(template)
    }))
    setDisplayTemplates(processedTemplates)
  }, [templates])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/task-templates')
      if (!response.ok) throw new Error('Impossible de charger les modèles')
      const data = await response.json()
      console.log('Fetched templates:', data) // Debug log
      setTemplates(data)
    } catch (error: any) {
      toast.error(error.message)
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof TaskTemplateItem, value: string) => {
    const updatedItems = [...formState.items]
    const currentItem = updatedItems[index]
    if (field === 'title') {
      updatedItems[index] = { 
        ...currentItem, 
        title: value,
        category: currentItem?.category || 'GENERAL' as TaskCategory
      }
    } else if (field === 'category') {
      updatedItems[index] = { 
        ...currentItem, 
        title: currentItem?.title || '',
        category: value as TaskCategory 
      }
    }
    setFormState(prev => ({ ...prev, items: updatedItems }))
  }

  const addItem = () => {
    setFormState(prev => ({
      ...prev,
      items: [...prev.items, { title: '', category: 'GENERAL' }]
    }))
  }

  const removeItem = (index: number) => {
    setFormState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSelectTemplateForEdit = (template: FormTaskTemplate) => {
    setFormState({
      id: template.id,
      name: template.name,
      description: template.description || '',
      items: template.items && template.items.length > 0 
        ? template.items
        : [{ title: '', category: 'GENERAL' }]
    })
  }

  const resetForm = () => {
    setFormState(initialFormState)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.name.trim()) {
      toast.error('Le nom du modèle est requis')
      return
    }

    if (formState.items.length === 0 || !formState.items.some(item => item.title.trim())) {
      toast.error('Au moins une tâche avec un titre est requise')
      return
    }

    setIsSaving(true)
    try {
      const filteredItems = formState.items.filter(item => item.title.trim())
      const templateData = {
        name: formState.name.trim(),
        description: formState.description.trim() || null,
        tasks: filteredItems, // Send as 'tasks' to match database field
        category: filteredItems[0]?.category || 'GENERAL'
      }

      const url = formState.id ? `/api/task-templates/${formState.id}` : '/api/task-templates'
      const method = formState.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      toast.success(formState.id ? 'Modèle mis à jour' : 'Modèle créé avec succès')
      resetForm()
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) return

    try {
      const response = await fetch(`/api/task-templates/${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      toast.success('Modèle supprimé avec succès')
      fetchTemplates()
      if (formState.id === templateId) {
        resetForm()
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Templates List */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-enarva-start" />
            Modèles Existants ({displayTemplates.length})
          </CardTitle>
          <CardDescription>
            Sélectionnez un modèle pour le modifier ou créez-en un nouveau.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-enarva-start" />
            </div>
          ) : displayTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun modèle disponible</p>
              <p className="text-sm">Créez votre premier modèle ci-dessous</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {displayTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-border rounded-lg hover:border-enarva-start/50 transition-colors cursor-pointer group"
                  onClick={() => handleSelectTemplateForEdit(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground group-hover:text-enarva-start transition-colors">
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-enarva-start/10 text-enarva-start text-xs font-medium">
                          {template.items.length} tâche{template.items.length !== 1 ? 's' : ''}
                        </span>
                        {template.items.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            • Prêt à utiliser
                          </span>
                        )}
                      </div>
                      {/* Show task preview */}
                      {template.items && template.items.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            Exemple: {template.items[0]?.title}
                            {template.items.length > 1 && ` +${template.items.length - 1} autre${template.items.length > 2 ? 's' : ''}`}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectTemplateForEdit(template)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(template.id)
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Form */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle>
            {formState.id ? 'Modifier le Modèle' : 'Nouveau Modèle'}
          </CardTitle>
          <CardDescription>
            {formState.id ? 'Modifiez le modèle sélectionné' : 'Créez un nouveau modèle de tâches'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nom du modèle</Label>
              <Input
                id="template-name"
                placeholder="Ex: Nettoyage Appartement Standard"
                value={formState.name}
                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optionnelle)</Label>
              <Textarea
                id="template-description"
                placeholder="Description du modèle..."
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tâches du modèle ({formState.items.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une tâche
                </Button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {formState.items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Titre de la tâche"
                      value={item.title}
                      onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Select
                      value={item.category}
                      onValueChange={(value) => handleItemChange(index, 'category', value as TaskCategory)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {formState.id ? 'Mettre à jour' : 'Créer le modèle'}
                  </>
                )}
              </Button>
              {formState.id && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}