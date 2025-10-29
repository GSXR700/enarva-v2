# Enarva OS - CRM pour Enarva

Ce projet est un système CRM complet construit avec Next.js, TypeScript, Tailwind CSS, et Prisma pour l'entreprise Enarva.

## Démarrage

1.  **Installer les dépendances :**
    ```bash
    npm install
    ```

2.  **Configurer la base de données :**
    Créez un fichier `.env` à la racine et ajoutez votre `DATABASE_URL`.

3.  **Synchroniser la base de données :**
    ```bash
    npx prisma db push
    ```

4.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    ```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir l'application.