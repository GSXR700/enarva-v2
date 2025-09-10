'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import { LogType, LogStatus } from '@prisma/client'
import { toast } from 'sonner'

export default function NewSystemLogPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    type: LogType.INFO,
    status: LogStatus.SUCCESS,
    message: '',
    metadata: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.message.trim()) {
      toast.error('Le message est obligatoire')
      return
    }

    setIsLoading(true)

    try {
      let metadata = null
      if (formData.metadata.trim()) {
        try {
          metadata = JSON.parse(formData.metadata)
        } catch {
          toast.error('Format JSON invalide pour les métadonnées')
          setIsLoading(false)
          return
        }
      }

      const logData = {
        type: formData.type,
        status: formData.status,
        message: formData.message.trim(),
        metadata
      }

      const response = await fetch('/api/system-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      })

      if (!response.ok) throw new Error('Failed to create system log')

      toast.success('Log système créé avec succès!')
      router.push('/system-logs')
    } catch (error) {
      toast.error('Erreur lors de la création du log')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/system-logs">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Nouveau Log Système
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez un nouveau log pour traçabilité du système
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails du Log</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type de log *</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Information</SelectItem>
                  <SelectItem value="ERROR">Erreur</SelectItem>
                  <SelectItem value="SECURITY">Sécurité</SelectItem>
                  <SelectItem value="BACKUP">Sauvegarde</SelectItem>
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
                  <SelectItem value="SUCCESS">Succès</SelectItem>
                  <SelectItem value="FAILED">Échec</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Description de l'événement système..."
                rows={3}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="metadata">Métadonnées (JSON optionnel)</Label>
              <Textarea
                id="metadata"
                value={formData.metadata}
                onChange={handleChange}
                placeholder='{"userId": "123", "action": "login", "ip": "192.168.1.1"}'
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format JSON valide uniquement. Laissez vide si aucune métadonnée.
              </p>
            </div>
          </CardContent>
        </Card>

        {formData.message && (
          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.type === 'INFO' ? 'bg-blue-100 text-blue-800' :
                    formData.type === 'ERROR' ? 'bg-red-100 text-red-800' :
                    formData.type === 'SECURITY' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {formData.type}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                    formData.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.status === 'SUCCESS' ? 'Succès' :
                     formData.status === 'FAILED' ? 'Échec' : 'En cours'}
                  </span>
                </div>
                <p className="font-medium">{formData.message}</p>
                {formData.metadata && (
                  <pre className="mt-2 text-xs bg-background p-2 rounded overflow-auto">
                    {formData.metadata}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-enarva-gradient rounded-lg px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Création...' : 'Créer le Log'}
          </Button>
        </div>
      </form>
    </div>
  )
}