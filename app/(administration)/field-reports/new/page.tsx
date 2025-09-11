import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Camera, Upload, Save, Trash2, PenTool, RotateCcw, Check } from 'lucide-react'
import { toast } from 'sonner'

interface SignaturePadProps {
  onSignature: (signature: string) => void
  label: string
  existingSignature?: string
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignature, label, existingSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!existingSignature)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 200

    // Set drawing styles
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Load existing signature if provided
    if (existingSignature) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = existingSignature
    }
  }, [existingSignature])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    setHasSignature(true)
    
    const canvas = canvasRef.current
    if (!canvas) return

    // Convert to base64 and notify parent
    const signatureData = canvas.toDataURL('image/png')
    onSignature(signatureData)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignature('')
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <div className="flex justify-between items-center mt-3">
          <p className="text-xs text-gray-500">
            Cliquez et glissez pour signer
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Effacer
            </Button>
            {hasSignature && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1" />
                Signé
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Mission {
  id: string
  missionNumber: string
  lead: {
    firstName: string
    lastName: string
  }
}

export default function EnhancedFieldReportForm() {
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [beforePhotos, setBeforePhotos] = useState<File[]>([])
  const [afterPhotos, setAfterPhotos] = useState<File[]>([])
  const [clientSignature, setClientSignature] = useState('')
  const [teamLeadSignature, setTeamLeadSignature] = useState('')

  const [formData, setFormData] = useState({
    missionId: '',
    generalObservations: '',
    clientFeedback: '',
    issuesEncountered: '',
    materialsUsed: '',
    hoursWorked: '',
    additionalNotes: ''
  })

  useEffect(() => {
    const fetchCompletedMissions = async () => {
      try {
        const response = await fetch('/api/missions?status=COMPLETED')
        if (!response.ok) throw new Error('Failed to fetch missions')
        const data = await response.json()
        setMissions(data.filter((m: any) => !m.fieldReport))
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

  const uploadSignature = async (signatureData: string): Promise<string> => {
    if (!signatureData) return ''
    
    // Convert base64 to blob
    const response = await fetch(signatureData)
    const blob = await response.blob()
    
    const formData = new FormData()
    formData.append('file', blob, 'signature.png')
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!uploadResponse.ok) throw new Error('Signature upload failed')
    const result = await uploadResponse.json()
    return result.url
  }

  const validateForm = (): boolean => {
    if (!formData.missionId) {
      toast.error('Veuillez sélectionner une mission')
      return false
    }
    if (!formData.hoursWorked || parseFloat(formData.hoursWorked) <= 0) {
      toast.error('Veuillez indiquer le nombre d\'heures travaillées')
      return false
    }
    if (!clientSignature) {
      toast.error('La signature du client est requise')
      return false
    }
    if (!teamLeadSignature) {
      toast.error('La signature du chef d\'équipe est requise')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      // Upload photos
      const beforePhotosUrls = beforePhotos.length > 0 ? await uploadPhotos(beforePhotos) : []
      const afterPhotosUrls = afterPhotos.length > 0 ? await uploadPhotos(afterPhotos) : []
      
      // Upload signatures
      const clientSignatureUrl = await uploadSignature(clientSignature)
      const teamLeadSignatureUrl = await uploadSignature(teamLeadSignature)

      const reportData = {
        ...formData,
        hoursWorked: parseFloat(formData.hoursWorked),
        materialsUsed: formData.materialsUsed ? JSON.parse(formData.materialsUsed) : null,
        beforePhotos: beforePhotosUrls,
        afterPhotos: afterPhotosUrls,
        clientSignatureUrl,
        teamLeadSignatureUrl
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
      console.error(error)
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
            Créez un rapport détaillé avec signatures et photos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mission Selection */}
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

        {/* General Information */}
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
                min="0"
                value={formData.hoursWorked}
                onChange={handleChange}
                required
                placeholder="Ex: 4.5"
              />
            </div>
            
            <div>
              <Label htmlFor="generalObservations">Observations générales</Label>
              <Textarea
                id="generalObservations"
                value={formData.generalObservations}
                onChange={handleChange}
                rows={4}
                placeholder="Décrivez le déroulement de la mission..."
              />
            </div>

            <div>
              <Label htmlFor="materialsUsed">Matériaux utilisés (JSON)</Label>
              <Textarea
                id="materialsUsed"
                value={formData.materialsUsed}
                onChange={handleChange}
                placeholder='{"produit_vitres": "5L", "chiffons_microfibre": "10 unités"}'
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format JSON pour les matériaux utilisés
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Feedback */}
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
                placeholder="Retours, suggestions ou remarques du client..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Photos Section */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Photos Avant/Après</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Before Photos */}
            <div>
              <Label>Photos avant intervention</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoChange(e, 'before')}
                  className="hidden"
                  id="before-photos"
                />
                <label
                  htmlFor="before-photos"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ajouter des photos
                </label>
              </div>
              
              {beforePhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {beforePhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Avant ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(index, 'before')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* After Photos */}
            <div>
              <Label>Photos après intervention</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoChange(e, 'after')}
                  className="hidden"
                  id="after-photos"
                />
                <label
                  htmlFor="after-photos"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ajouter des photos
                </label>
              </div>
              
              {afterPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {afterPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Après ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(index, 'after')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signatures Section */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Signatures Obligatoires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignaturePad
              onSignature={setClientSignature}
              label="Signature du client *"
            />
            
            <SignaturePad
              onSignature={setTeamLeadSignature}
              label="Signature du chef d'équipe *"
            />
          </CardContent>
        </Card>

        {/* Issues and Notes */}
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
                placeholder="Décrivez les difficultés ou problèmes rencontrés..."
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Notes supplémentaires</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleChange}
                rows={3}
                placeholder="Toute information supplémentaire pertinente..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Section */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !formData.missionId || !formData.hoursWorked || !clientSignature || !teamLeadSignature}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Créer le Rapport
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}