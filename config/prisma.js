const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const globalForPrisma = global;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let isTotalScoreGeneratedCache = null;

prisma.isTotalScoreGenerated = async () => {
  if (isTotalScoreGeneratedCache !== null) return isTotalScoreGeneratedCache;
  try {
    const result = await prisma.$queryRaw`
      SELECT EXTRA 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'marks' 
        AND COLUMN_NAME = 'total_score'
    `;
    if (result && result.length > 0) {
      isTotalScoreGeneratedCache = result[0].EXTRA.toUpperCase().includes('GENERATED');
    } else {
      isTotalScoreGeneratedCache = false;
    }
  } catch (e) {
    isTotalScoreGeneratedCache = false;
  }
  return isTotalScoreGeneratedCache;
};

module.exports = prisma;
