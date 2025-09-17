import { NextResponse, NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Initialize the S3 client once to be reused across invocations
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  // Credentials will be automatically assumed from IAM role or environment
});

/**
 * GET /api/cron/backup
 * This endpoint is designed to be called by a cron job service.
 * It creates a database dump, uploads it to S3, and logs the result.
 */
export async function GET(request: NextRequest) {
  // Add validation for required environment variables
  if (!process.env.AWS_REGION || !process.env.BACKUP_BUCKET || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Missing required AWS configuration' }, { status: 500 });
  }

  // 1. Verify Cron Secret for Security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql.gz`;
  const filePath = `/tmp/${filename}`;

  try {
    // 2. Create Database Dump using pg_dump with compression
    // The -Z 9 flag enables gzip compression at the highest level for smaller file sizes.
    await execAsync(
      `pg_dump "${process.env.DATABASE_URL}" -Z 9 > ${filePath}`
    );

    // 3. Upload the compressed backup to S3
    const fileContent = await fs.readFile(filePath);
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BACKUP_BUCKET!,
      Key: `database/${filename}`,
      Body: fileContent,
      ServerSideEncryption: 'AES256',
    }));

    // 4. Log Backup Completion to the database for auditing
    await prisma.systemLog.create({
      data: {
        type: 'BACKUP',
        status: 'SUCCESS',
        message: `Successfully created and uploaded database backup: ${filename}`,
        metadata: { filename, size: fileContent.length, timestamp }
      }
    });

    console.log(`✅ Backup successful: ${filename}`);
    return NextResponse.json({ success: true, filename });

  } catch (error: any) {
    console.error('❌ Backup failed:', error);

    // Log the failure to the database for auditing and alerting
    await prisma.systemLog.create({
      data: {
        type: 'BACKUP',
        status: 'FAILED',
        message: `Backup process failed: ${error.message}`,
        metadata: { error: error.stack }
      }
    });

    return NextResponse.json({ error: 'Backup failed', details: error.message }, { status: 500 });

  } finally {
    // 5. Clean up the temporary file from the serverless function's disk
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error(`Failed to clean up temporary file ${filePath}:`, cleanupError);
    }
    await prisma.$disconnect();
  }
}