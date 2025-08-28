// app/api/settings/route.ts
import { NextResponse } from 'next/server'

// In a real application, these values would come from a database or a config file.
const settings = {
    basePrices: {
        APARTMENT_SMALL: 30,
        APARTMENT_MEDIUM: 22,
        APARTMENT_MULTI: 18,
        VILLA_LARGE: 18,
        COMMERCIAL: 30,
        HOTEL_STANDARD: 22,
        HOTEL_LUXURY: 42,
        OFFICE: 28,
        RESIDENCE_B2B: 15,
    },
    userRoles: [
        { id: '1', name: 'Hassan Amrani', role: 'TEAM_LEADER', email: 'hassan.amrani@enarva.com' },
        { id: '2', name: 'Aicha Bensouda', role: 'TEAM_LEADER', email: 'aicha.bensouda@enarva.com' },
        { id: '3', name: 'Fatima Benali', role: 'TECHNICIAN', email: 'fatima.benali@enarva.com' },
        { id: '4', name: 'Admin Enarva', role: 'ADMIN', email: 'admin@enarva.com' },
    ]
}

// GET /api/settings - Fetch all settings
export async function GET() {
  try {
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/settings - Update settings
export async function POST(request: Request) {
    try {
        const body = await request.json();
        // In a real app, you would save these updated settings to your database.
        console.log("Updating settings with:", body);
        // For now, we just return a success message.
        return NextResponse.json({ message: "Settings updated successfully." });
    } catch (error) {
        console.error('Failed to update settings:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}