// app/(administration)/profile/page.tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Edit, Save } from 'lucide-react'
import { useEdgeStore } from '@/lib/edgestore'

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [name, setName] = useState(session?.user?.name || '')
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { edgestore } = useEdgeStore();

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    // Refresh the session to show the new name
    await updateSession({ name });
    setIsLoading(false);
    alert('Nom mis à jour !');
  };

  const handleImageUpdate = async () => {
    if (file) {
      setIsUploading(true);
      const res = await edgestore.profileImages.upload({
        file,
        options: {
            replaceTargetUrl: session?.user?.image || undefined,
        }
      });
      
      // Update user in DB with new image URL
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: res.url }),
      });

      // Refresh session
      await updateSession({ image: res.url });
      setFile(null);
      setIsUploading(false);
    }
  };

  if (!session) {
    return <div>Chargement du profil...</div>
  }

  return (
    <div className="main-content space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mon Profil</h1>
        <p className="text-muted-foreground mt-1">Gérez les informations de votre compte.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
            <Card className="thread-card">
                <CardHeader>
                    <CardTitle>Photo de Profil</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <Avatar className="w-32 h-32">
                        <AvatarImage src={session.user.image || undefined} />
                        <AvatarFallback className="text-4xl">
                           {session.user.name ? session.user.name.split(' ').map(n => n[0]).join('') : <User />}
                        </AvatarFallback>
                    </Avatar>
                    <Input 
                        id="picture" 
                        type="file" 
                        className="text-sm"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <Button 
                        onClick={handleImageUpdate} 
                        className="w-full bg-enarva-gradient" 
                        disabled={!file || isUploading}
                    >
                        {isUploading ? 'Chargement...' : 'Changer l\'image'}
                    </Button>
                </CardContent>
            </Card>
        </div>
        
        <div className="md:col-span-2">
            <Card className="thread-card">
                <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                    <CardDescription>Mettez à jour votre nom et votre email.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleNameUpdate} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nom complet</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={session.user.email || ''} disabled />
                        </div>
                         <div>
                            <Label htmlFor="role">Rôle</Label>
                            <Input id="role" value={session.user.role || ''} disabled />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading}>
                                <Save className="w-4 h-4 mr-2" />
                                {isLoading ? 'Sauvegarde...' : 'Sauvegarder les changements'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}