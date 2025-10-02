// app/(administration)/quality-checks/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, X, Plus, Trash2 } from 'lucide-react'
import { Mission, Lead, QualityCheckType, QualityStatus } from '@prisma/client'
import { toast } from 'sonner'

type MissionWithLead = Mission & { lead: Lead }

interface QualityIssue {
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  location: string
  photo?: string
}

interface QualityCorrection {
  issueId: string
  action: string
  deadline: string
  assignedTo: string
  completed: boolean
}

interface FormData {
  missionId: string
  type: QualityCheckType
  status: QualityStatus
  score: string
  notes: string
}

export default function NewQualityCheckPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedMissionId = searchParams.get('missionId')
  
  const [missions, setMissions] = useState<MissionWithLead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [corrections, setCorrections] = useState<QualityCorrection[]>([])
  
  const [formData, setFormData] = useState<FormData>({
    missionId: preselectedMissionId || '',
    type: 'FINAL_INSPECTION' as QualityCheckType,
    status: 'PENDING' as QualityStatus,
    score: '',
    notes: ''
  })

  useEffect(() => {
    fetchMissions()
  }, [])

  const fetchMissions = async () => {
    try {
      // ✅ FIXED: Fetch ALL missions instead of only pending quality checks
      const response = await fetch('/api/missions?limit=1000')
      if (!response.ok) throw new Error('Failed to fetch missions')
      
      const data = await response.json()
      
      // Handle different API response formats
      let missionsData: MissionWithLead[] = []
      if (Array.isArray(data)) {
        missionsData = data
      } else if (data.missions && Array.isArray(data.missions)) {
        missionsData = data.missions
      } else if (data.data && Array.isArray(data.data)) {
        missionsData = data.data
      }
      
      // Sort missions by most recent first
      const sortedMissions = missionsData.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      setMissions(sortedMissions)
    } catch (error) {
      console.error('Error fetching missions:', error)
      toast.error('Impossible de charger les missions')
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSelectChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos(prev => [...prev, ...files])
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const addIssue = () => {
    setIssues(prev => [...prev, {
      description: '',
      severity: 'LOW',
      location: ''
    }])
  }

  const updateIssue = (index: number, field: keyof QualityIssue, value: string) => {
    setIssues(prev => prev.map((issue, i) => 
      i === index ? { ...issue, [field]: value } : issue
    ))
  }

  const removeIssue = (index: number) => {
    setIssues(prev => prev.filter((_, i) => i !== index))
  }

  const addCorrection = () => {
    setCorrections(prev => [...prev, {
      issueId: '',
      action: '',
      deadline: '',
      assignedTo: '',
      completed: false
    }])
  }

  const updateCorrection = (index: number, field: keyof QualityCorrection, value: string | boolean) => {
    setCorrections(prev => prev.map((correction, i) => 
      i === index ? { ...correction, [field]: value } : correction
    ))
  }

  const removeCorrection = (index: number) => {
    setCorrections(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.missionId) {
      toast.error('Veuillez sélectionner une mission')
      return
    }

    setIsLoading(true)

    try {
      const checkData = {
        missionId: formData.missionId,
        type: formData.type,
        status: formData.status,
        score: formData.score ? parseInt(formData.score) : null,
        notes: formData.notes || null,
        photos: photos.map(f => f.name),
        issues: issues.length > 0 ? issues : null,
        corrections: corrections.length > 0 ? corrections : null
      }

      const response = await fetch('/api/quality-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkData)
      })

      if (!response.ok) throw new Error('Failed to create quality check')

      const result = await response.json()

      // If quality check is approved, generate field report automatically
      if (formData.status === 'PASSED') {
        await generateFieldReport(formData.missionId, result.id)
      }

      toast.success('Contrôle qualité créé avec succès!')
      router.push('/quality-checks')
    } catch (error) {
      toast.error('Erreur lors de la création du contrôle')
    } finally {
      setIsLoading(false)
    }
  }

  const generateFieldReport = async (missionId: string, qualityCheckId: string) => {
    try {
      const response = await fetch('/api/field-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId,
          qualityCheckId,
          autoGenerated: true
        })
      })

      if (!response.ok) throw new Error('Failed to generate field report')
      
      toast.success('Rapport de terrain généré automatiquement')
    } catch (error) {
      console.error('Failed to generate field report:', error)
      toast.error('Erreur lors de la génération du rapport de terrain')
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quality-checks">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Nouveau Contrôle Qualité
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez un nouveau contrôle qualité pour une mission
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mission">Mission *</Label>
              <Select 
                value={formData.missionId} 
                onValueChange={(value) => handleSelectChange('missionId', value)} 
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une mission..." />
                </SelectTrigger>
                <SelectContent>
                  {missions.map((mission) => (
                    <SelectItem key={mission.id} value={mission.id}>
                      {mission.missionNumber} - {mission.lead.firstName} {mission.lead.lastName} - {mission.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type de contrôle *</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEAM_LEADER_CHECK">Contrôle Chef d'équipe</SelectItem>
                  <SelectItem value="FINAL_INSPECTION">Inspection finale</SelectItem>
                  <SelectItem value="CLIENT_WALKTHROUGH">Validation client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Statut *</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="PASSED">Approuvé</SelectItem>
                  <SelectItem value="FAILED">Rejeté</SelectItem>
                  <SelectItem value="NEEDS_CORRECTION">Correction requise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="score">Score qualité (1-10)</Label>
              <Input
                id="score"
                type="number"
                min="1"
                max="10"
                value={formData.score}
                onChange={(e) => handleInputChange('score', e.target.value)}
                placeholder="Ex: 8"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Notes et observations</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Observations générales, points positifs, recommandations..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
            />
            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Problèmes identifiés</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addIssue}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un problème
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {issues.map((issue, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Problème #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIssue(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Sévérité</Label>
                    <Select
                      value={issue.severity}
                      onValueChange={(value) => updateIssue(index, 'severity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Faible</SelectItem>
                        <SelectItem value="MEDIUM">Moyen</SelectItem>
                        <SelectItem value="HIGH">Élevé</SelectItem>
                        <SelectItem value="CRITICAL">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Localisation</Label>
                    <Input
                      value={issue.location}
                      onChange={(e) => updateIssue(index, 'location', e.target.value)}
                      placeholder="Ex: Salle de bain, Cuisine..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={issue.description}
                      onChange={(e) => updateIssue(index, 'description', e.target.value)}
                      placeholder="Décrivez le problème..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Actions correctives</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addCorrection}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une action
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {corrections.map((correction, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Action #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCorrection(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Date limite</Label>
                    <Input
                      type="date"
                      value={correction.deadline}
                      onChange={(e) => updateCorrection(index, 'deadline', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Assigné à</Label>
                    <Input
                      value={correction.assignedTo}
                      onChange={(e) => updateCorrection(index, 'assignedTo', e.target.value)}
                      placeholder="Nom de la personne"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Action à réaliser</Label>
                    <Textarea
                      value={correction.action}
                      onChange={(e) => updateCorrection(index, 'action', e.target.value)}
                      placeholder="Décrivez l'action corrective..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/quality-checks">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Enregistrement...' : 'Créer le contrôle'}
          </Button>
        </div>
      </form>
    </div>
  )
}