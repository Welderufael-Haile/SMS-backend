require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");

    /* ===================== USERS ===================== */
    const adminEmail = "admin@school.com";

    const [existingAdmin] = await db.query(
      "SELECT id FROM Users WHERE email = ?",
      [adminEmail]
    );

    let adminId;

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      const [result] = await db.query(
        `INSERT INTO Users (full_name, email, password, role)
         VALUES (?, ?, ?, ?)`,
        ["System Admin", adminEmail, hashedPassword, "admin"]
      );

      adminId = result.insertId;
      console.log("✅ Admin user seeded");
    } else {
      adminId = existingAdmin[0].id;
      console.log("ℹ️ Admin user already exists");
    }

    /* ===================== TEACHERS ===================== */
    const [teacherCheck] = await db.query(
      "SELECT id FROM teachers WHERE email = ?",
      ["teacher@school.com"]
    );

    if (teacherCheck.length === 0) {
      await db.query(
        `INSERT INTO teachers
        (user_id, full_name, email, gender, phone_number, Subject, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          "John Doe",
          "teacher@school.com",
          "Male",
          "0912345678",
          "Mathematics",
          "Addis Ababa",
        ]
      );

      console.log("✅ Teacher seeded");
    } else {
      console.log("ℹ️ Teacher already exists");
    }

    /* ===================== PARENTS ===================== */
    const [parentCheck] = await db.query(
      "SELECT id FROM parents WHERE Email = ?",
      ["parent@school.com"]
    );

    if (parentCheck.length === 0) {
      await db.query(
        `INSERT INTO parents
        (First_Name, Last_Name, Sex, Phone_Number, Email, Address)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          "Abebe",
          "Kebede",
          "Male",
          "0911111111",
          "parent@school.com",
          "Bole, Addis Ababa",
        ]
      );

      console.log("✅ Parent seeded");
    } else {
      console.log("ℹ️ Parent already exists");
    }

    /* ===================== CONTACTS ===================== */
    await db.query(
      `INSERT INTO contacts
      (full_name, phone_number, email, message)
      VALUES (?, ?, ?, ?)`,
      [
        "Website Visitor",
        "0922222222",
        "visitor@gmail.com",
        "I would like more information about the school.",
      ]
    );

    console.log("✅ Contact message seeded");

    console.log("🎉 Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seed();
