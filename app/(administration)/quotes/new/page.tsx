import { Suspense } from 'react';
import NewQuoteForm from './NewQuoteForm';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

export default function NewQuotePage() {
    return (
        <Suspense fallback={<CardGridSkeleton title="Nouveau Devis" description="Chargement..." />}>
            <NewQuoteForm />
        </Suspense>
    )
}