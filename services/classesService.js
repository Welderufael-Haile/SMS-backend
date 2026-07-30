const prisma = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

class ClassesService {
  static async getAllClasses() {
    // Return sections grouped with academic terms and student counts
    const sections = await prisma.sections.findMany({
      include: {
        _count: {
          select: { Student: true, enrollments: true }
        }
      },
      orderBy: [
        { grade_level: 'asc' },
        { name: 'asc' }
      ]
    });

    return sections.map(s => ({
      id: s.id,
      section_name: s.name,
      grade_level: s.grade_level,
      status: s.status,
      student_count: s._count.Student || s._count.enrollments
    }));
  }

  static async getClassById(id) {
    const sectionId = parseInt(id, 10);
    const section = await prisma.sections.findUnique({
      where: { id: sectionId },
      include: {
        _count: {
          select: { Student: true }
        }
      }
    });

    if (!section) {
      throw new NotFoundError("Class not found");
    }

    return {
      id: section.id,
      section_name: section.name,
      grade_level: section.grade_level,
      status: section.status,
      student_count: section._count.Student
    };
  }

  static async getClassStudents(id) {
    const sectionId = parseInt(id, 10);
    const section = await prisma.sections.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      throw new NotFoundError("Class not found");
    }

    const students = await prisma.student.findMany({
      where: { sections_id: sectionId },
      include: {
        parents: true,
        academic_year: true,
        terms: true
      }
    });

    return {
      classInfo: section,
      students: students.map(s => ({
        ...s,
        parent_first_name: s.parents?.First_Name,
        parent_last_name: s.parents?.Last_Name
      }))
    };
  }
}

module.exports = ClassesService;
