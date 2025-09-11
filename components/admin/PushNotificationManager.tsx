// components/admin/PushNotificationManager.tsx - ADMIN NOTIFICATION SENDER

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Bell, Send, Users, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function PushNotificationManager() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState<'broadcast' | 'role' | 'users'>('broadcast')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)

  const roles = [
    { value: 'ADMIN', label: 'Administrateurs' },
    { value: 'MANAGER', label: 'Managers' },
    { value: 'AGENT', label: 'Agents' },
    { value: 'TEAM_LEADER', label: 'Chefs d\'équipe' },
    { value: 'TECHNICIAN', label: 'Techniciens' }
  ]

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Le titre et le message sont requis')
      return
    }

    setIsSending(true)

    try {
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
        broadcast: targetType === 'broadcast',
        roles: targetType === 'role' ? selectedRoles : []
      }

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      const result = await response.json()
      toast.success(`Notification envoyée à ${result.sent} utilisateur(s)`)
      
      // Reset form
      setTitle('')
      setBody('')
      setSelectedRoles([])
      setTargetType('broadcast')

    } catch (error) {
      console.error('Failed to send notification:', error)
      toast.error('Erreur lors de l\'envoi de la notification')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Envoyer une Notification Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la notification..."
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100 caractères</p>
        </div>

        <div>
          <Label htmlFor="body">Message *</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu de la notification..."
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-gray-500 mt-1">{body.length}/300 caractères</p>
        </div>

        <div>
          <Label>Ciblage</Label>
          <Select value={targetType} onValueChange={(value: any) => setTargetType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="broadcast">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Tous les utilisateurs
                </div>
              </SelectItem>
              <SelectItem value="role">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Rôles spécifiques
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {targetType === 'role' && (
          <div>
            <Label>Rôles ciblés</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {roles.map((role) => (
                <Badge
                  key={role.value}
                  variant={selectedRoles.includes(role.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleRoleToggle(role.value)}
                >
                  {role.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={handleSend}
          disabled={isSending || !title.trim() || !body.trim()}
          className="w-full"
        >
          {isSending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer la Notification
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}