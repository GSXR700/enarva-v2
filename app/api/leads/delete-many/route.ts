// app/api/leads/delete-many/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { ids } = await request.json();
        if (!ids || !Array.isArray(ids)) {
            return new NextResponse('Invalid input', { status: 400 });
        }

        await prisma.lead.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Failed to delete multiple leads:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}