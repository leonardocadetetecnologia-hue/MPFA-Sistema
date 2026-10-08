import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '../../packages/database/src/generated/index.js';

const env = process.env.APP_ENV ?? 'local';
const password = process.env.SEED_PASSWORD ?? '';

if (env === 'production') {
  console.error('seed refused in production');
  process.exit(1);
}
if (password.length < 10) {
  console.error('SEED_PASSWORD must have at least 10 characters');
  process.exit(1);
}

function hashPassword(value) {
  const salt = randomBytes(16).toString('base64url');
  const derived = scryptSync(value, salt, 32).toString('base64url');
  return `scrypt$${salt}$${derived}`;
}

const prisma = new PrismaClient();
const organization = await prisma.organization.upsert({
  where: { id: '00000000-0000-4000-8000-000000000001' },
  update: { name: 'Organização piloto' },
  create: { id: '00000000-0000-4000-8000-000000000001', name: 'Organização piloto' },
});
const client = await prisma.client.upsert({
  where: { id: '00000000-0000-4000-8000-000000000002' },
  update: { name: 'Cliente piloto' },
  create: {
    id: '00000000-0000-4000-8000-000000000002',
    organizationId: organization.id,
    name: 'Cliente piloto',
  },
});

const users = [
  ['admin@mpfa.local', 'Administrador piloto', 'ADMINISTRATIVE', null],
  ['advogado@mpfa.local', 'Advogado piloto', 'LAWYER', null],
  ['gestao@mpfa.local', 'Gestão piloto', 'MANAGER', null],
  ['cliente@mpfa.local', 'Cliente piloto', 'CLIENT', client.id],
];

for (const [email, name, role, clientId] of users) {
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email } },
    update: { name, role, status: 'ACTIVE', clientId, passwordHash: hashPassword(password) },
    create: {
      organizationId: organization.id,
      email,
      name,
      role,
      clientId,
      passwordHash: hashPassword(password),
    },
  });
}

console.log('seed ok: admin@mpfa.local advogado@mpfa.local gestao@mpfa.local cliente@mpfa.local');
await prisma.$disconnect();
