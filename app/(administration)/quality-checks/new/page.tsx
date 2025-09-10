'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, X } from 'lucide-react'
import { Mission, Lead, QualityCheckType, QualityStatus } from '@prisma/client'
import { toast } from 'sonner'

type MissionWithLead = Mission & { lead: Lead };

interface QualityIssue {
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
}

interface QualityCorrection {
  issueId: string;
  action: string;
  deadline: string;
  assignedTo: string;
  completed: boolean;
}

export default function NewQualityCheckPage() {
  const router = useRouter()
  const [missions, setMissions] = useState<MissionWithLead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [corrections, setCorrections] = useState<QualityCorrection[]>([])

  const [formData, setFormData] = useState({
    missionId: '',
    type: QualityCheckType.TEAM_LEADER_CHECK,
    status: QualityStatus.PENDING,
    score: '',
    notes: ''
  })

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch('/api/missions?status=IN_PROGRESS,COMPLETED')
        if (!response.ok) throw new Error('Failed to fetch missions')
        const data = await response.json()
        setMissions(data)
      } catch (error) {
        toast.error('Impossible de charger les missions')
      }
    }

    fetchMissions()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
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
      category: '',
      description: '',
      severity: 'MEDIUM',
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

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    const uploadPromises = photos.map(async (photo) => {
      const formData = new FormData()
      formData.append('file', photo)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      const result = await response.json()
      return result.url
    })

    return await Promise.all(uploadPromises)
  }
  const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault()
if (!formData.missionId) {
toast.error('Veuillez sélectionner une mission')
return
}
setIsLoading(true)

try {
  // Upload photos
  const photosUrls = photos.length > 0 ? await uploadPhotos(photos) : []

  const checkData = {
    missionId: formData.missionId,
    type: formData.type,
    status: formData.status,
    score: formData.score ? parseInt(formData.score) : null,
    notes: formData.notes || null,
    photos: photosUrls.length > 0 ? photosUrls : null,
    issues: issues.length > 0 ? issues : null,
    corrections: corrections.length > 0 ? corrections : null
  }

  const response = await fetch('/api/quality-checks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkData)
  })

  if (!response.ok) throw new Error('Failed to create quality check')

  toast.success('Contrôle qualité créé avec succès!')
  router.push('/quality-checks')
} catch (error) {
  toast.error('Erreur lors de la création du contrôle')
} finally {
  setIsLoading(false)
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
          <Select onValueChange={(value) => handleSelectChange('missionId', value)} required>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une mission..." />
            </SelectTrigger>
            <SelectContent>
              {missions.map((mission) => (
                <SelectItem key={mission.id} value={mission.id}>
                  {mission.missionNumber} - {mission.lead.firstName} {mission.lead.lastName}
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
              <SelectItem value="CLIENT_WALKTHROUGH">Visite client</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Statut</Label>
          <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PASSED">Validé</SelectItem>
              <SelectItem value="FAILED">Échec</SelectItem>
              <SelectItem value="NEEDS_CORRECTION">Correction requise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="score">Score (/5)</Label>
          <Input
            id="score"
            type="number"
            min="1"
            max="5"
            value={formData.score}
            onChange={handleChange}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes générales</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>

    <Card className="thread-card">
      <CardHeader>
        <CardTitle>Photos du contrôle</CardTitle>
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
                  className="w-full h-24 object-cover rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="thread-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Problèmes identifiés</CardTitle>
          <Button type="button" onClick={addIssue} size="sm">
            <span className="mr-2">+</span>
            Ajouter un problème
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.map((issue, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Input
                  value={issue.category}
                  onChange={(e) => updateIssue(index, 'category', e.target.value)}
                  placeholder="ex: Nettoyage, Finitions..."
                />
              </div>
              <div>
                <Label>Gravité</Label>
                <Select value={issue.severity} onValueChange={(value) => updateIssue(index, 'severity', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Faible</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Élevée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localisation</Label>
                <Input
                  value={issue.location}
                  onChange={(e) => updateIssue(index, 'location', e.target.value)}
                  placeholder="ex: Salon, Salle de bain..."
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeIssue(index)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={issue.description}
                  onChange={(e) => updateIssue(index, 'description', e.target.value)}
                  placeholder="Décrivez le problème en détail..."
                  rows={2}
                />
              </div>
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>

    <Card className="thread-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Actions correctives</CardTitle>
          <Button type="button" onClick={addCorrection} size="sm">
            <span className="mr-2">+</span>
            Ajouter une correction
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {corrections.map((correction, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Action à effectuer</Label>
                <Input
                  value={correction.action}
                  onChange={(e) => updateCorrection(index, 'action', e.target.value)}
                  placeholder="Action corrective..."
                />
              </div>
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
                  placeholder="Nom de la personne responsable"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`completed-${index}`}
                    checked={correction.completed}
                    onChange={(e) => updateCorrection(index, 'completed', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`completed-${index}`}>Terminé</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeCorrection(index)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>

    <div className="flex justify-end">
      <Button 
        type="submit" 
        disabled={isLoading}
        className="bg-enarva-gradient rounded-lg px-8"
      >
        <Save className="w-4 h-4 mr-2" />
        {isLoading ? 'Création...' : 'Créer le Contrôle'}
      </Button>
    </div>
  </form>
</div>
)
}