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
import { Mission, Lead } from '@prisma/client'
import { toast } from 'sonner'

type MissionWithLead = Mission & { lead: Lead; fieldReport?: any };

export default function NewFieldReportPage() {
  const router = useRouter()
  const [missions, setMissions] = useState<MissionWithLead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [beforePhotos, setBeforePhotos] = useState<File[]>([])
  const [afterPhotos, setAfterPhotos] = useState<File[]>([])

  const [formData, setFormData] = useState({
    missionId: '',
    generalObservations: '',
    clientFeedback: '',
    issuesEncountered: '',
    materialsUsed: '',
    hoursWorked: '',
    clientSignatureUrl: '',
    teamLeadSignatureUrl: '',
    additionalNotes: ''
  })

  useEffect(() => {
    const fetchCompletedMissions = async () => {
      try {
        const response = await fetch('/api/missions?status=COMPLETED')
        if (!response.ok) throw new Error('Failed to fetch missions')
        const data = await response.json()
        setMissions(data.filter((m: MissionWithLead) => !m.fieldReport))
      } catch (error) {
        toast.error('Impossible de charger les missions')
      }
    }

    fetchCompletedMissions()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = Array.from(e.target.files || [])
    if (type === 'before') {
      setBeforePhotos(prev => [...prev, ...files])
    } else {
      setAfterPhotos(prev => [...prev, ...files])
    }
  }

  const removePhoto = (index: number, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforePhotos(prev => prev.filter((_, i) => i !== index))
    } else {
      setAfterPhotos(prev => prev.filter((_, i) => i !== index))
    }
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
    if (!formData.missionId || !formData.hoursWorked) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsLoading(true)

    try {
      // Upload photos
      const beforePhotosUrls = beforePhotos.length > 0 ? await uploadPhotos(beforePhotos) : []
      const afterPhotosUrls = afterPhotos.length > 0 ? await uploadPhotos(afterPhotos) : []

      const reportData = {
        ...formData,
        hoursWorked: parseFloat(formData.hoursWorked),
        materialsUsed: formData.materialsUsed ? JSON.parse(formData.materialsUsed) : null,
        beforePhotos: beforePhotosUrls,
        afterPhotos: afterPhotosUrls
      }

      const response = await fetch('/api/field-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) throw new Error('Failed to create field report')

      toast.success('Rapport de terrain créé avec succès!')
      router.push('/field-reports')
    } catch (error) {
      toast.error('Erreur lors de la création du rapport')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/field-reports">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Nouveau Rapport de Terrain
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez un rapport détaillé pour une mission terminée
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélection de la Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations Générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hoursWorked">Heures travaillées *</Label>
              <Input
                id="hoursWorked"
                type="number"
                step="0.5"
                value={formData.hoursWorked}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="generalObservations">Observations générales</Label>
              <Textarea
                id="generalObservations"
                value={formData.generalObservations}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="materialsUsed">Matériaux utilisés (JSON)</Label>
              <Textarea
                id="materialsUsed"
                value={formData.materialsUsed}
                onChange={handleChange}
                placeholder='{"produit1": "5L", "produit2": "2 unités"}'
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Retour Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientFeedback">Commentaires du client</Label>
              <Textarea
                id="clientFeedback"
                value={formData.clientFeedback}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="clientSignatureUrl">URL Signature Client</Label>
              <Input
                id="clientSignatureUrl"
                value={formData.clientSignatureUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Problèmes et Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="issuesEncountered">Problèmes rencontrés</Label>
              <Textarea
                id="issuesEncountered"
                value={formData.issuesEncountered}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Notes supplémentaires</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="teamLeadSignatureUrl">URL Signature Chef d'équipe</Label>
              <Input
                id="teamLeadSignatureUrl"
                value={formData.teamLeadSignatureUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Photos Avant</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoChange(e, 'before')}
                  className="mb-3"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {beforePhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Before ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(index, 'before')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Photos Après</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoChange(e, 'after')}
                  className="mb-3"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {afterPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`After ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(index, 'after')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-enarva-gradient rounded-lg px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Création...' : 'Créer le Rapport'}
          </Button>
        </div>
      </form>
    </div>
  )
}