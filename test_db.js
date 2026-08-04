const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const msg = await prisma.messages.findFirst({
    where: {
      fileUrl: {
        not: null
      }
    }
  });
  console.log(msg);
}

main().catch(console.error).finally(() => prisma.$disconnect());
