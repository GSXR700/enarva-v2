"use client"

import React, { useState, useCallback } from "react"
import Cropper, { Area } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"

interface AvatarCropperModalProps {
  imageSrc: string
  isOpen: boolean
  onClose: () => void
  onSave: (croppedImage: string) => void
}

// Helper function to create a cropped image
const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  });

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const size = Math.min(image.width, image.height);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      resolve(URL.createObjectURL(blob))
    }, 'image/jpeg');
  });
}


export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  imageSrc,
  isOpen,
  onClose,
  onSave,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (croppedAreaPixels) {
      const croppedImageBlobUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      // We pass the blob URL to be converted to a file and uploaded
      onSave(croppedImageBlobUrl);
      onClose();
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="bg-card rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recadrer l'image</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <Slider
            defaultValue={[1]}
            min={1}
            max={3}
            step={0.1}
            value={[zoom]}
            onValueChange={(val) => setZoom(val[0])}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="bg-enarva-gradient">Sauvegarder</Button>
        </div>
      </div>
    </div>
  )
}
