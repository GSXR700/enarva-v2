// app/(administration)/profile/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Edit, Save, Upload, Check } from 'lucide-react'
import { useEdgeStore } from '@/lib/edgestore'
import { toast } from 'sonner'
import { AvatarCropperModal } from '@/components/ui/AvatarCropperModal'
import { AnimatePresence, motion } from 'framer-motion'

// Helper to convert blob URL to a File object
async function urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
  const response = await fetch(url);
  const data = await response.blob();
  return new File([data], filename, { type: mimeType });
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [name, setName] = useState(session?.user?.name || '')
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const [isNameLoading, setIsNameLoading] = useState(false)
  const { edgestore } = useEdgeStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveCroppedImage = useCallback(async (croppedImageBlobUrl: string) => {
      setUploadStatus('uploading');
      try {
        const croppedFile = await urlToFile(croppedImageBlobUrl, `${session?.user?.id}-avatar.jpeg`, 'image/jpeg');

        const res = await edgestore.profileImages.upload({
            file: croppedFile,
            options: {
                replaceTargetUrl: session?.user?.image || undefined,
            }
        });

        await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: res.url }),
        });

        setUploadStatus('success');
        await updateSession({ image: res.url });
        
        setTimeout(() => {
            setUploadStatus('idle');
            toast.success("Photo de profil mise à jour !");
        }, 1200);

      } catch (error) {
        setUploadStatus('idle');
        toast.error("Échec de la mise à jour de l'image.");
        console.error(error);
      } finally {
        setSelectedImage(null);
      }
  }, [session?.user?.id, session?.user?.image, edgestore.profileImages, updateSession]);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsNameLoading(true);
    try {
        await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        await updateSession({ name });
        toast.success('Nom mis à jour !');
    } catch (error) {
        toast.error("Échec de la mise à jour du nom.");
    } finally {
        setIsNameLoading(false);
    }
  };

  if (!session) {
    return <div>Chargement du profil...</div>
  }

  return (
    <>
      {selectedImage && (
        <AvatarCropperModal
          imageSrc={selectedImage}
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setSelectedImage(null);
          }}
          onSave={handleSaveCroppedImage}
        />
      )}
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
                      <div className="relative">
                          <AnimatePresence>
                              {uploadStatus === 'uploading' && (
                                  <motion.div 
                                      key="spinner"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="absolute inset-0 z-10 flex items-center justify-center"
                                  >
                                      <div className="h-32 w-32 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"></div>
                                  </motion.div>
                              )}
                              {uploadStatus === 'success' && (
                                  <motion.div 
                                      key="checkmark"
                                      initial={{ opacity: 0, scale: 0.5 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                      className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-green-500/80"
                                  >
                                      <Check className="h-16 w-16 text-white" />
                                  </motion.div>
                              )}
                          </AnimatePresence>
                          <Avatar className="w-32 h-32">
                              <AvatarImage src={session.user.image || undefined} className="object-cover" />
                              <AvatarFallback className="text-4xl">
                                {session.user.name ? session.user.name.split(' ').map(n => n[0]).join('') : <User />}
                              </AvatarFallback>
                          </Avatar>
                      </div>

                      <Label htmlFor="picture" className="w-full">
                          <Button asChild className="w-full cursor-pointer" variant="outline" disabled={uploadStatus === 'uploading'}>
                              <span>
                                  <Upload className="w-4 h-4 mr-2"/>
                                  {uploadStatus === 'uploading' ? 'Chargement...' : 'Changer l\'image'}
                              </span>
                          </Button>
                          <Input 
                              id="picture" 
                              type="file" 
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileChange}
                              disabled={uploadStatus === 'uploading'}
                          />
                      </Label>
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
                              <Button type="submit" disabled={isNameLoading} className="bg-enarva-gradient">
                                  <Save className="w-4 h-4 mr-2" />
                                  {isNameLoading ? 'Sauvegarde...' : 'Sauvegarder les changements'}
                              </Button>
                          </div>
                      </form>
                  </CardContent>
              </Card>
          </div>
        </div>
      </div>
    </>
  )
}