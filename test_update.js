const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TeacherMarksService = require('./services/teacherMarksService');

async function test() {
  try {
    // Find a teacher and a mark to test
    const teacher = await prisma.teachers.findFirst();
    const mark = await prisma.marks.findFirst();
    if (!teacher || !mark) return console.log("No teacher or mark");
    
    // We will just call it and catch the error
    await TeacherMarksService.updateTeacherMark(teacher.user_id, mark.id, {
      st1: "10"
    });
  } catch (err) {
    console.error("ERROR CAUGHT:", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
