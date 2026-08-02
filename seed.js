require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./config/prisma");

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");
    await prisma.$connect();

    /* ===================== USERS ===================== */
    const adminEmail = "admin@school.com";
    let admin = await prisma.users.findUnique({
      where: { email: adminEmail },
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      admin = await prisma.users.create({
        data: {
          full_name: "System Admin",
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
          status: "active",
        },
      });
      console.log("✅ Admin user seeded");
    } else {
      console.log("ℹ️ Admin user already exists");
    }

    /* ===================== TEACHERS ===================== */
    const teacherExists = await prisma.teachers.findFirst({
      where: { email: "teacher@school.com" },
    });

    if (!teacherExists) {
      await prisma.teachers.create({
        data: {
          user_id: admin.id,
          full_name: "John Doe",
          email: "teacher@school.com",
          gender: "Male",
          phone_number: "0912345678",
          Subject: "Mathematics",
          address: "Addis Ababa",
        },
      });
      console.log("✅ Teacher seeded");
    } else {
      console.log("ℹ️ Teacher already exists");
    }

    /* ===================== PARENTS ===================== */
    const parentExists = await prisma.parents.findFirst({
      where: { Email: "parent@school.com" },
    });

    if (!parentExists) {
      await prisma.parents.create({
        data: {
          First_Name: "Abebe",
          Last_Name: "Kebede",
          Sex: "Male",
          Phone_Number: "0911111111",
          Email: "parent@school.com",
          Address: "Bole, Addis Ababa",
        },
      });
      console.log("✅ Parent seeded");
    } else {
      console.log("ℹ️ Parent already exists");
    }

    /* ===================== CONTACTS ===================== */
    const contactExists = await prisma.contacts.findFirst({
      where: { email: "visitor@gmail.com" },
    });

    if (!contactExists) {
      await prisma.contacts.create({
        data: {
          full_name: "Website Visitor",
          phone_number: "0922222222",
          email: "visitor@gmail.com",
          message: "I would like more information about the school.",
        },
      });
      console.log("✅ Contact message seeded");
    } else {
      console.log("ℹ️ Contact message already exists");
    }

    console.log("🎉 Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
