// app/api/leads/delete-many/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { ids } = await request.json();
        if (!ids || !Array.isArray(ids)) {
            return new NextResponse('Invalid input', { status: 400 });
        }

        console.log('🗑️ Attempting to delete leads:', ids);

        // First, check which leads have related missions
        const leadsWithMissions = await prisma.lead.findMany({
            where: {
                id: { in: ids },
                missions: { some: {} } // Has at least one mission
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                missions: {
                    select: { 
                        id: true, 
                        missionNumber: true,
                        status: true 
                    }
                }
            }
        });

        // Check which leads have other relationships
        const leadsWithQuotes = await prisma.lead.findMany({
            where: {
                id: { in: ids },
                quotes: { some: {} }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                quotes: {
                    select: { 
                        id: true, 
                        quoteNumber: true,
                        status: true 
                    }
                }
            }
        });

        const leadsWithSubscriptions = await prisma.lead.findMany({
            where: {
                id: { in: ids },
                subscription: { isNot: null }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                subscription: {
                    select: { 
                        id: true,
                        type: true,
                        status: true 
                    }
                }
            }
        });

        const leadsWithExpenses = await prisma.lead.findMany({
            where: {
                id: { in: ids },
                expenses: { some: {} }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        });

        // Collect all leads that have relationships
        const problematicLeadIds = new Set([
            ...leadsWithMissions.map(l => l.id),
            ...leadsWithQuotes.map(l => l.id),
            ...leadsWithSubscriptions.map(l => l.id),
            ...leadsWithExpenses.map(l => l.id)
        ]);

        const safeToDeleteIds = ids.filter(id => !problematicLeadIds.has(id));
        const cannotDeleteIds = ids.filter(id => problematicLeadIds.has(id));

        console.log('✅ Safe to delete:', safeToDeleteIds.length, 'leads');
        console.log('❌ Cannot delete:', cannotDeleteIds.length, 'leads');

        // If there are leads with relationships, return detailed error
        if (cannotDeleteIds.length > 0) {
            const errorDetails = {
                cannotDelete: cannotDeleteIds.map(id => {
                    const leadWithMissions = leadsWithMissions.find(l => l.id === id);
                    const leadWithQuotes = leadsWithQuotes.find(l => l.id === id);
                    const leadWithSubscriptions = leadsWithSubscriptions.find(l => l.id === id);
                    const leadWithExpenses = leadsWithExpenses.find(l => l.id === id);

                    const lead = leadWithMissions || leadWithQuotes || leadWithSubscriptions || leadWithExpenses;
                    
                    const relationships = [];
                    if (leadWithMissions) relationships.push(`${leadWithMissions.missions.length} mission(s)`);
                    if (leadWithQuotes) relationships.push(`${leadWithQuotes.quotes.length} devis`);
                    if (leadWithSubscriptions) relationships.push('1 abonnement');
                    if (leadWithExpenses) relationships.push('des dépenses');

                    return {
                        id: id,
                        name: lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown Lead',
                        relationships: relationships
                    };
                }),
                safeToDelete: safeToDeleteIds.length
            };

            return NextResponse.json({
                error: 'CONSTRAINT_VIOLATION',
                message: `Impossible de supprimer ${cannotDeleteIds.length} lead(s) car ils ont des données liées.`,
                details: errorDetails,
                suggestion: 'Vous devez d\'abord supprimer les missions, devis, abonnements et dépenses liés, ou utilisez la suppression sélective.'
            }, { status: 409 }); // 409 Conflict
        }

        // If all leads are safe to delete, proceed
        if (safeToDeleteIds.length > 0) {
            await prisma.lead.deleteMany({
                where: {
                    id: { in: safeToDeleteIds }
                }
            });
            console.log('✅ Successfully deleted', safeToDeleteIds.length, 'leads');
        }

        return NextResponse.json({
            success: true,
            deletedCount: safeToDeleteIds.length,
            message: safeToDeleteIds.length > 0 
                ? `${safeToDeleteIds.length} lead(s) supprimé(s) avec succès.`
                : 'Aucun lead supprimé.'
        }, { status: 200 });

    } catch (error: any) {
        console.error('Failed to delete multiple leads:', error);
        
        // Handle specific Prisma errors
        if (error.code === 'P2003') {
            return NextResponse.json({
                error: 'FOREIGN_KEY_CONSTRAINT',
                message: 'Impossible de supprimer les leads car ils sont liés à d\'autres données (missions, devis, etc.)',
                suggestion: 'Supprimez d\'abord les données liées ou contactez l\'administrateur.'
            }, { status: 409 });
        }
        
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}