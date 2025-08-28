// components/auth/login-form.tsx
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import ClientOnly from "@/components/providers/ClientOnly"

// Icônes pour les boutons de connexion sociale
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.494 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
  </svg>
);
const FacebookIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M22.675 0h-21.35C.59 0 0 .59 0 1.325v21.35C0 23.41.59 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h5.713C23.41 24 24 23.41 24 22.675V1.325C24 .59 23.41 0 22.675 0z" />
    </svg>
);

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
        const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });
        
        if (result?.error) {
            setError("Email ou mot de passe incorrect.");
        } else if (result?.ok) {
            router.push("/");
        }
    } catch (err) {
        setError("Une erreur inattendue est survenue.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 rounded-20px shadow-xl border-border relative mx-4 sm:mx-0">
      <CardContent className="p-0">
        <div className="text-center mb-8">
            <div className="inline-block mb-4">
                <Image
                    src={"/images/light-logo.png"}
                    alt="Enarva Logo"
                    width={120}
                    height={40}
                />
            </div>
            <p className="text-muted-foreground text-sm">
                Entrez vos identifiants pour accéder à votre espace.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative flex items-center">
                    <AlertCircle className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    ref={emailInputRef}
                    id="email"
                    placeholder="nom@exemple.com"
                    type="email"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={isLoading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        className="absolute right-0 top-0 h-full px-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                    >
                        <ClientOnly>
                            {showPassword ? ( <EyeOff className="h-5 w-5 text-gray-400" /> ) : ( <Eye className="h-5 w-5 text-gray-400" /> )}
                        </ClientOnly>
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary font-medium">
                    Mot de passe oublié ?
                </Link>
            </div>
            <Button
                className="w-full font-semibold py-3 h-auto text-base bg-enarva-gradient"
                type="submit"
                disabled={isLoading}
            >
                {isLoading ? "Connexion en cours..." : "Se connecter"}
            </Button>
        </form>
        
        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-card text-muted-foreground">Ou continuer avec</span></div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="w-full"
                >
                    <GoogleIcon /> Google
                </Button>
                <Button
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => signIn('facebook', { callbackUrl: '/' })}
                    className="w-full"
                >
                    <FacebookIcon /> Facebook
                </Button>
            </div>
        </div>
        <div className="text-center mt-6">
             <Link href="/signup">
                <Button variant="link" className="text-muted-foreground">
                    Vous n'avez pas de compte ? S'inscrire
                </Button>
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}