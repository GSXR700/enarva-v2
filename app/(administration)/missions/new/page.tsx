import { Suspense } from 'react';
import NewMissionForm from './NewMissionForm';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';


export default function NewMissionPage() {
    return (
        <Suspense fallback={<TableSkeleton title="Nouvelle Mission" />}>
            <NewMissionForm />
        </Suspense>
    )
}