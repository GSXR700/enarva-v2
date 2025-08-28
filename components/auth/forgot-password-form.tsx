// components/auth/forgot-password-form.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // La logique d'envoi d'email de réinitialisation serait ici
    console.log("Password reset requested for:", email);
    setTimeout(() => {
        setSubmitted(true);
        setIsLoading(false);
    }, 1000);
  };

  return (
    <Card className="w-full max-w-md p-8 rounded-20px shadow-xl border-border relative mx-4 sm:mx-0">
      <CardContent className="p-0">
        <div className="text-center mb-8">
            <div className="inline-block mb-4">
                <Image src={"/images/light-logo.png"} alt="Enarva Logo" width={120} height={40} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Mot de passe oublié ?</h2>
            <p className="text-muted-foreground text-sm mt-2">
              {submitted 
                ? "Si un compte existe, vous recevrez un email." 
                : "Entrez votre email pour recevoir un lien de réinitialisation."}
            </p>
        </div>

        {submitted ? (
            <div className="text-center">
                <Mail className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-foreground">Vérifiez votre boîte de réception.</p>
                <Link href="/login">
                    <Button variant="link" className="mt-4 text-primary">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à la connexion
                    </Button>
                </Link>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        placeholder="nom@exemple.com"
                        type="email"
                        required
                        disabled={isLoading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <Button
                    className="w-full font-semibold py-3 h-auto text-base bg-enarva-gradient"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
                 <div className="text-center">
                    <Link href="/login">
                         <Button variant="link" className="text-muted-foreground">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour à la connexion
                        </Button>
                    </Link>
                </div>
            </form>
        )}
      </CardContent>
    </Card>
  );
}