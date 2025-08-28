// app/(administration)/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, Users, Save } from 'lucide-react'
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton'

type Settings = {
    basePrices: { [key: string]: number };
    userRoles: { id: string; name: string; role: string; email: string; }[];
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Impossible de charger les paramètres.');
        const data = await response.json();
        setSettings(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handlePriceChange = (propertyType: string, value: string) => { /* ... */ };
  const handleSubmit = async (e: React.FormEvent) => { /* ... */ };
  
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Gérez les configurations globales de l'application.</p>
        </div>
      </div>

    <form onSubmit={handleSubmit}>
        <Card className="thread-card">
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-enarva-start" />Tarifs de Base par m²</CardTitle>
            <CardDescription>Ajustez les prix de base utilisés par le calculateur de devis.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settings && Object.entries(settings.basePrices).map(([key, value]) => (
                <div key={key}>
                    <Label htmlFor={key} className="text-sm">{key.replace(/_/g, ' ')}</Label>
                    <Input id={key} type="number" value={value} onChange={(e) => handlePriceChange(key, e.target.value)} className="mt-1"/>
                </div>
            ))}
            </CardContent>
        </Card>

        <Card className="thread-card mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-enarva-start" />Gestion des Utilisateurs</CardTitle>
                <CardDescription>Modifiez les rôles des membres de votre équipe.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="py-3 px-4 text-left">Nom</th>
                                <th className="py-3 px-4 text-left">Email</th>
                                <th className="py-3 px-4 text-left">Rôle Actuel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {settings && settings.userRoles.map(user => (
                                <tr key={user.id} className="border-b">
                                    <td className="py-3 px-4 font-medium">{user.name}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                                    <td className="py-3 px-4">
                                        <Select defaultValue={user.role}>
                                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ADMIN">Administrateur</SelectItem>
                                                <SelectItem value="TEAM_LEADER">Chef d'équipe</SelectItem>
                                                <SelectItem value="TECHNICIAN">Technicien</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
        
        <div className="flex justify-end mt-6">
            <Button type="submit" className="bg-enarva-gradient rounded-lg px-8">
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les Changements
            </Button>
        </div>
    </form>
    </div>
  )
}