// components/auth/signup-form.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Une erreur est survenue lors de l'inscription.");
      }
      
      // Redirect to login page on successful signup
      router.push("/login");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 rounded-20px shadow-xl border-border relative mx-4 sm:mx-0">
      <CardContent className="p-0">
        <div className="text-center mb-8">
            <div className="inline-block mb-4">
                <Image src={"/images/light-logo.png"} alt="Enarva Logo" width={120} height={40} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Créer un Compte Admin</h2>
            <p className="text-muted-foreground text-sm mt-2">
                Créez le premier compte administrateur pour votre workspace.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" placeholder="John Doe" type="text" required disabled={isLoading} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="nom@exemple.com" type="email" required disabled={isLoading} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" required disabled={isLoading} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            
            <Button className="w-full font-semibold py-3 h-auto text-base bg-enarva-gradient" type="submit" disabled={isLoading}>
                {isLoading ? "Création en cours..." : "Créer le Compte"}
            </Button>
             <div className="text-center mt-4">
                <Link href="/login">
                     <Button variant="link" className="text-muted-foreground">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        J'ai déjà un compte
                    </Button>
                </Link>
            </div>
        </form>
      </CardContent>
    </Card>
  );
}