// app/(administration)/system-logs/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, Plus, Search, AlertTriangle, Info, Shield, Database, Trash2 } from 'lucide-react'
import { SystemLog, LogType, LogStatus } from '@prisma/client'
import { formatDate, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/system-logs')
      if (!response.ok) throw new Error('Failed to fetch system logs')
      const data = await response.json()
      setLogs(data)
      setFilteredLogs(data)
    } catch (error) {
      toast.error('Impossible de charger les logs système')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    let filtered = [...logs]
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter)
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredLogs(filtered)
  }, [searchQuery, typeFilter, statusFilter, logs])

  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case 'ERROR': return <AlertTriangle className="w-4 h-4" />
      case 'INFO': return <Info className="w-4 h-4" />
      case 'SECURITY': return <Shield className="w-4 h-4" />
      case 'BACKUP': return <Database className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: LogType) => {
    switch (type) {
      case 'ERROR': return 'text-red-600 bg-red-50'
      case 'INFO': return 'text-blue-600 bg-blue-50'
      case 'SECURITY': return 'text-orange-600 bg-orange-50'
      case 'BACKUP': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusVariant = (status: LogStatus) => {
    switch (status) {
      case 'SUCCESS': return 'default'
      case 'FAILED': return 'destructive'
      case 'IN_PROGRESS': return 'secondary'
      default: return 'outline'
    }
  }

  const handleDelete = async (logId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce log ?')) return

    try {
      const response = await fetch(`/api/system-logs/${logId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete log')
      
      toast.success('Log supprimé avec succès')
      fetchLogs()
    } catch (error) {
      toast.error('Impossible de supprimer le log')
    }
  }

  const clearOldLogs = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les logs de plus de 30 jours ?')) return

    try {
      const response = await fetch('/api/system-logs/cleanup', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to cleanup logs')
      
      toast.success('Anciens logs supprimés avec succès')
      fetchLogs()
    } catch (error) {
      toast.error('Impossible de nettoyer les logs')
    }
  }

  if (isLoading) return <TableSkeleton title="Chargement des logs système..." />

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Logs Système</h1>
          <p className="text-muted-foreground mt-1">
            Surveillez l'activité et les événements du système
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearOldLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Nettoyer les anciens logs
          </Button>
          <Link href="/system-logs/new">
            <Button className="bg-enarva-gradient rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Log
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher dans les messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">Tous les types</option>
              <option value="ERROR">Erreur</option>
              <option value="INFO">Information</option>
              <option value="SECURITY">Sécurité</option>
              <option value="BACKUP">Sauvegarde</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">Tous les statuts</option>
              <option value="SUCCESS">Succès</option>
              <option value="FAILED">Échec</option>
              <option value="IN_PROGRESS">En cours</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['ERROR', 'INFO', 'SECURITY', 'BACKUP'].map((type) => (
          <Card key={type} className="thread-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {type === 'ERROR' ? 'Erreurs' : 
                     type === 'INFO' ? 'Infos' :
                     type === 'SECURITY' ? 'Sécurité' : 'Sauvegardes'}
                  </p>
                  <p className="text-2xl font-bold">
                    {logs.filter(log => log.type === type).length}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${getTypeColor(type as LogType)}`}>
                  {getTypeIcon(type as LogType)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <Card className="thread-card">
            <CardContent className="pt-6 text-center">
              <Info className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Aucun log trouvé' 
                  : 'Aucun log système disponible'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="thread-card">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-full mt-1 ${getTypeColor(log.type)}`}>
                      {getTypeIcon(log.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getStatusVariant(log.status)} className="text-xs">
                          {log.status === 'SUCCESS' ? 'Succès' :
                           log.status === 'FAILED' ? 'Échec' : 'En cours'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)} à {formatTime(log.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">{log.message}</p>
                      
                      {log.metadata && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Métadonnées
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link href={`/system-logs/${log.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(log.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}