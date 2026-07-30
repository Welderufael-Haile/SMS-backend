const prisma = require('../config/prisma');

exports.getAllStudentsWithSections = async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      include: { sections: true },
      orderBy: { full_name: 'asc' }
    });

    res.status(200).json(students.map(s => ({
      id: s.id,
      Full_Name: s.full_name,
      Sex: s.Sex,
      Date_of_birth: s.Date_of_birth,
      section_name: s.sections?.name,
      grade_level: s.sections?.grade_level
    })));
  } catch (error) {
    next(error);
  }
};