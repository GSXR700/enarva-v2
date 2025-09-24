'use client';

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, AlertCircle, Chrome, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ClientOnly from "@/components/providers/ClientOnly";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();

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
        router.refresh();
      }
    } catch (err) {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-sky-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
      
      {/* Background Blobs */}
      <div className="absolute -top-1/4 -left-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-300/50 opacity-50 blur-3xl filter dark:bg-blue-900/50" />
      <div className="absolute -bottom-1/4 -right-1/4 h-96 w-96 animate-pulse rounded-full bg-sky-300/50 opacity-50 blur-3xl filter dark:bg-sky-900/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className={cn(
          "flex flex-col justify-between rounded-3xl border border-gray-200/50 bg-white/60 p-6 shadow-2xl backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80 sm:p-8",
          "min-h-[90vh] sm:min-h-0"
        )}>
          <div>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-block">
                <Image
                  src="/images/light-logo.png"
                  alt="Enarva Logo"
                  width={129.6}
                  height={43.2}
                  priority
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Entrez vos identifiants pour accéder à votre espace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="mr-3 h-5 w-5" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-600 dark:text-gray-400">Email</Label>
                <Input
                  ref={emailInputRef}
                  id="email"
                  placeholder="nom@exemple.com"
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-600 dark:text-gray-400">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    <ClientOnly>
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </ClientOnly>
                  </button>
                </div>
              </div>
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                  Mot de passe oublié ?
                </Link>
              </div>
              <Button
                className={cn(
                  "h-auto w-full py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
                  isLoading && "animate-shine cursor-not-allowed"
                )}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-700"></div></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white/60 px-2 text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">Ou continuer avec</span></div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="outline" disabled={isLoading} onClick={() => signIn('google', { callbackUrl: '/' })}>
                  <Chrome className="mr-3 h-5 w-5" /> Google
                </Button>
                <Button variant="outline" disabled={isLoading} onClick={() => signIn('facebook', { callbackUrl: '/' })}>
                  <Facebook className="mr-3 h-5 w-5" /> Facebook
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © {currentYear} enarva. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}