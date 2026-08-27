const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const generateSecurePassword = () => {
  const length = 10;
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  return password;
};

const generateParentEmail = async (fullName) => {
  const nameParts = fullName.toLowerCase().trim().split(' ');
  const firstName = nameParts[0].replace(/[^a-z]/g, '');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
  
  let baseEmail = lastName ? `${firstName}.${lastName}` : firstName;
  let email = `${baseEmail}@parent.com`;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (!existing) break;
    email = `${baseEmail}${counter}@parent.com`;
    counter++;
  }
  return email;
};

async function main() {
  console.log('Starting migration of existing parents...');
  
  const parents = await prisma.parents.findMany();
  let migratedCount = 0;
  const generatedCredentials = [];

  for (const parent of parents) {
    // Check if user already exists
    if (parent.Email) {
      const existingUser = await prisma.users.findFirst({ where: { email: parent.Email } });
      if (existingUser) {
        console.log(`Parent ${parent.First_Name} ${parent.Last_Name} already has a user account.`);
        continue;
      }
    }

    // Determine email
    let finalEmail = parent.Email;
    if (!finalEmail) {
      finalEmail = await generateParentEmail(`${parent.First_Name} ${parent.Last_Name}`);
    }

    // Ensure it doesn't conflict
    let counter = 1;
    let checkEmail = finalEmail;
    while (await prisma.users.findFirst({ where: { email: checkEmail } })) {
       const [name, domain] = finalEmail.split('@');
       checkEmail = `${name}${counter}@${domain}`;
       counter++;
    }
    finalEmail = checkEmail;

    const defaultPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update parent record with the email (in case it was missing)
    await prisma.parents.update({
      where: { id: parent.id },
      data: { Email: finalEmail }
    });

    // Create user record
    await prisma.users.create({
      data: {
        full_name: `${parent.First_Name} ${parent.Last_Name}`,
        email: finalEmail,
        password: hashedPassword,
        role: 'parent',
        status: 'active'
      }
    });

    migratedCount++;
    generatedCredentials.push({
      Name: `${parent.First_Name} ${parent.Last_Name}`,
      Email: finalEmail,
      Password: defaultPassword
    });
    
    console.log(`Created user for ${parent.First_Name} ${parent.Last_Name}`);
  }

  console.log(`\nMigration complete. Created ${migratedCount} new parent user accounts.\n`);
  
  if (generatedCredentials.length > 0) {
    console.log("=== NEW PARENT CREDENTIALS ===");
    console.table(generatedCredentials);
    console.log("==============================");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
