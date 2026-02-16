import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const headersList = await headers();
        const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown';

        const deviceData = await req.json();

        const record = await prisma.deviceInfo.create({
            data: {
                userId,
                userAgent: deviceData.userAgent || '',
                platform: deviceData.platform || null,
                language: deviceData.language || null,
                languages: deviceData.languages || null,
                screenWidth: deviceData.screenWidth || null,
                screenHeight: deviceData.screenHeight || null,
                colorDepth: deviceData.colorDepth || null,
                pixelRatio: deviceData.pixelRatio || null,
                timezone: deviceData.timezone || null,
                timezoneOffset: deviceData.timezoneOffset || null,
                cookiesEnabled: deviceData.cookiesEnabled ?? null,
                onLine: deviceData.onLine ?? null,
                hardwareConcurrency: deviceData.hardwareConcurrency || null,
                maxTouchPoints: deviceData.maxTouchPoints ?? null,
                deviceMemory: deviceData.deviceMemory || null,
                connection: typeof deviceData.connection === 'object'
                    ? deviceData.connection?.effectiveType || null
                    : deviceData.connection || null,
                vendor: deviceData.vendor || null,
                ipAddress,
                rawData: deviceData, // Store the entire payload as JSON
            },
        });

        return NextResponse.json({ success: true, id: record.id });
    } catch (error: any) {
        console.error('Device info error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
