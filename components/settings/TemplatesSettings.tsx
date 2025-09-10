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

// Type definitions
type TaskTemplateItem = {
  id?: string
  title: string
  category: TaskCategory
}

type TaskTemplate = {
  id: string
  name: string
  description?: string | null
  items: TaskTemplateItem[]
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

export function TemplatesSettings() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState(initialFormState)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/task-templates')
      if (!response.ok) throw new Error('Impossible de charger les modèles')
      const data = await response.json()
      setTemplates(data)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof TaskTemplateItem, value: string) => {
    const updatedItems = [...formState.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
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

  const handleSelectTemplateForEdit = (template: TaskTemplate) => {
    setFormState({
      id: template.id,
      name: template.name,
      description: template.description || '',
      items: template.items && template.items.length > 0 
        ? template.items.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category
          }))
        : [{ title: '', category: 'GENERAL' }]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formState.items.length === 0) {
      toast.error('Au moins une tâche est requise')
      return
    }

    setIsSaving(true)
    try {
      const url = formState.id ? `/api/task-templates/${formState.id}` : '/api/task-templates'
      const method = formState.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description || null,
          items: formState.items
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      toast.success(formState.id ? 'Modèle mis à jour avec succès' : 'Modèle créé avec succès')
      await fetchTemplates()
      resetForm()
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
      await fetchTemplates()
      
      if (formState.id === templateId) {
        resetForm()
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const resetForm = () => {
    setFormState(initialFormState)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Templates List */}
      <Card className="thread-card">
        <CardHeader>
          <CardTitle>Modèles de Tâches</CardTitle>
          <CardDescription>
            Gérez vos modèles de tâches pour une création rapide de missions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-enarva-start" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun modèle disponible</p>
              <p className="text-sm">Créez votre premier modèle</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {templates.map((template) => (
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
                      <p className="text-xs text-muted-foreground mt-2">
                        {template.items?.length || 0} tâche(s)
                      </p>
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
              <Label>Tâches du modèle</Label>
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
                    {formState.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une tâche
              </Button>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {formState.id ? 'Mettre à jour' : 'Créer le modèle'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}