import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Load environment variables for standalone script
try {
  // @ts-ignore
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) { }

const url = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding BK Food v4.0 data...');

  const password = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { matricule: 'ADMIN001' },
    update: {},
    create: {
      matricule: 'ADMIN001',
      email: 'admin@bkfood.tn',
      password,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isApproved: true,
    },
  });

  await prisma.user.upsert({
    where: { matricule: 'WORKER001' },
    update: {},
    create: {
      matricule: 'WORKER001',
      password,
      name: 'Mohamed Ouvrier',
      role: 'WORKER',
      assignedModule: 'CHAMBRE',
      isApproved: true,
    },
  });

  const palettes = [
    { code: 'PAL-001', batchCode: 'BT-2024-001', species: 'Albacore', article: 'Entier', weightKg: 450.5, origin: 'Mauritanie', status: 'PARAGE_DONE' },
    { code: 'PAL-002', batchCode: 'BT-2024-001', species: 'Albacore', article: 'Entier', weightKg: 420.0, origin: 'Sénégal', status: 'IN_CHAMBRE' },
    { code: 'PAL-003', batchCode: 'BT-2024-002', species: 'Listao', article: 'Morceaux', weightKg: 380.0, origin: 'Maroc', status: 'PARAGE_DONE' },
  ];

  for (const p of palettes) {
    await prisma.palette.upsert({
      where: { code: p.code },
      update: { status: p.status as any },
      create: p as any,
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
