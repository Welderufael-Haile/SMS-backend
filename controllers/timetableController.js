const prisma = require("../config/prisma");

// We no longer hardcode PERIODS, they will be fetched dynamically from the DB

// Get personal timetable for student or teacher
exports.getMyTimetable = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role.toLowerCase();

    const activeDaysRaw = await prisma.school_days.findMany({
      where: { is_active: true },
      orderBy: { order_idx: 'asc' }
    });
    const days = activeDaysRaw.map(d => d.day_name);

    const periods = await prisma.school_periods.findMany({
      orderBy: { order_idx: 'asc' }
    });

    let timetable = [];

    if (role === 'student' || role === 'parent') {
      // Find student record
      const student = await prisma.student.findUnique({
        where: { user_id: userId }
      });
      if (student && student.sections_id) {
        timetable = await prisma.timetable.findMany({
          where: {
            teacher_section_subjects: {
              section_id: student.sections_id
            }
          },
          include: {
            teacher_section_subjects: {
              include: {
                subjects: true,
                teachers: true
              }
            }
          }
        });
      }
    } else if (role === 'teacher') {
      const teacher = await prisma.teachers.findUnique({
        where: { user_id: userId }
      });
      if (teacher) {
        timetable = await prisma.timetable.findMany({
          where: {
            teacher_section_subjects: {
              teacher_id: teacher.id
            }
          },
          include: {
            teacher_section_subjects: {
              include: {
                subjects: true,
                sections: true
              }
            }
          }
        });
      }
    }

    res.json({ days, periods, timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch personal timetable" });
  }
};

// Get school days
exports.getSchoolDays = async (req, res) => {
  try {
    let days = await prisma.school_days.findMany({
      orderBy: { order_idx: 'asc' }
    });

    if (days.length === 0) {
      // Seed initial days if table is empty
      const initialDays = [
        { day_name: "Monday", order_idx: 1, is_active: true },
        { day_name: "Tuesday", order_idx: 2, is_active: true },
        { day_name: "Wednesday", order_idx: 3, is_active: true },
        { day_name: "Thursday", order_idx: 4, is_active: true },
        { day_name: "Friday", order_idx: 5, is_active: true },
        { day_name: "Saturday", order_idx: 6, is_active: false },
        { day_name: "Sunday", order_idx: 7, is_active: false }
      ];
      await prisma.school_days.createMany({ data: initialDays });
      days = await prisma.school_days.findMany({ orderBy: { order_idx: 'asc' } });
    }

    res.json(days);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch school days" });
  }
};

// Toggle school day status
exports.toggleSchoolDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    await prisma.school_days.update({
      where: { id: parseInt(id) },
      data: { is_active }
    });
    
    res.json({ message: "Day status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update day status" });
  }
};

// Get school periods
exports.getSchoolPeriods = async (req, res) => {
  try {
    let periods = await prisma.school_periods.findMany({
      orderBy: { order_idx: 'asc' }
    });

    if (periods.length === 0) {
      // Seed initial periods if empty
      const initialPeriods = [
        { start_time: "08:30", end_time: "09:10", label: "1st Period", is_break: false, order_idx: 1 },
        { start_time: "09:10", end_time: "09:50", label: "2nd Period", is_break: false, order_idx: 2 },
        { start_time: "09:50", end_time: "10:30", label: "3rd Period", is_break: false, order_idx: 3 },
        { start_time: "10:30", end_time: "10:50", label: "Break Time", is_break: true, order_idx: 4 },
        { start_time: "10:50", end_time: "11:30", label: "4th Period", is_break: false, order_idx: 5 },
        { start_time: "11:30", end_time: "12:10", label: "5th Period", is_break: false, order_idx: 6 },
        { start_time: "12:10", end_time: "13:40", label: "Lunch Time", is_break: true, order_idx: 7 },
        { start_time: "13:40", end_time: "14:20", label: "6th Period", is_break: false, order_idx: 8 },
        { start_time: "14:20", end_time: "15:00", label: "7th Period", is_break: false, order_idx: 9 }
      ];
      await prisma.school_periods.createMany({ data: initialPeriods });
      periods = await prisma.school_periods.findMany({ orderBy: { order_idx: 'asc' } });
    }

    res.json(periods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch periods" });
  }
};

// Save school period (create or update)
exports.saveSchoolPeriod = async (req, res) => {
  try {
    const { id, start_time, end_time, label, is_break, order_idx } = req.body;
    
    if (id) {
      await prisma.school_periods.update({
        where: { id: parseInt(id) },
        data: { start_time, end_time, label, is_break, order_idx }
      });
    } else {
      await prisma.school_periods.create({
        data: { start_time, end_time, label, is_break, order_idx }
      });
    }
    
    res.json({ message: "Period saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save period" });
  }
};

// Delete school period
exports.deleteSchoolPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.school_periods.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Period deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete period" });
  }
};
exports.getSectionTimetable = async (req, res) => {
  try {
    const { section_id } = req.params;
    
    const timetables = await prisma.timetable.findMany({
      where: {
        teacher_section_subjects: {
          section_id: parseInt(section_id)
        }
      },
      include: {
        teacher_section_subjects: {
          include: {
            teachers: { select: { full_name: true, user_id: true } },
            subjects: { select: { name: true } },
            sections: { select: { name: true, grade_level: true } }
          }
        }
      }
    });
    
    res.json(timetables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
};

// Get timetable for a teacher
exports.getTeacherTimetable = async (req, res) => {
  try {
    const { teacher_id } = req.params;
    
    const timetables = await prisma.timetable.findMany({
      where: {
        teacher_section_subjects: {
          teacher_id: parseInt(teacher_id)
        }
      },
      include: {
        teacher_section_subjects: {
          include: {
            subjects: { select: { name: true } },
            sections: { select: { name: true, grade_level: true } }
          }
        }
      }
    });
    
    res.json(timetables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch teacher timetable" });
  }
};

// Manually save or update a timetable slot
exports.saveTimetableSlot = async (req, res) => {
  try {
    const { teacher_section_subject_id, day_of_week, start_time, end_time } = req.body;

    if (!teacher_section_subject_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the teacher is already busy at this time
    const tss = await prisma.teacher_section_subjects.findUnique({
      where: { id: parseInt(teacher_section_subject_id) }
    });

    if (!tss) return res.status(404).json({ error: "Assignment not found" });

    const teacherConflict = await prisma.timetable.findFirst({
      where: {
        day_of_week,
        start_time,
        teacher_section_subjects: {
          teacher_id: tss.teacher_id,
          NOT: { section_id: tss.section_id }
        }
      }
    });

    if (teacherConflict) {
      return res.status(400).json({ error: "Teacher is already assigned to another class at this time." });
    }

    // Check if the section already has a class at this time, if so update it, else create
    const existingSlot = await prisma.timetable.findFirst({
      where: {
        day_of_week,
        start_time,
        teacher_section_subjects: {
          section_id: tss.section_id
        }
      }
    });

    let savedSlot;
    if (existingSlot) {
      savedSlot = await prisma.timetable.update({
        where: { id: existingSlot.id },
        data: { teacher_section_subject_id: parseInt(teacher_section_subject_id), end_time }
      });
    } else {
      savedSlot = await prisma.timetable.create({
        data: {
          teacher_section_subject_id: parseInt(teacher_section_subject_id),
          day_of_week,
          start_time,
          end_time
        }
      });
    }

    res.json({ message: "Slot saved successfully", slot: savedSlot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save slot" });
  }
};

// Delete a timetable slot
exports.deleteTimetableSlot = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timetable.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Slot removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete slot" });
  }
};

// Auto-generate timetable for a section (or all sections)
exports.autoGenerateTimetable = async (req, res) => {
  try {
    const { section_id } = req.body;
    if (!section_id) return res.status(400).json({ error: "section_id is required" });

    // 1. Fetch active days and periods
    const activeDaysRaw = await prisma.school_days.findMany({
      where: { is_active: true },
      orderBy: { order_idx: 'asc' }
    });
    const activeDays = activeDaysRaw.map(d => d.day_name);

    const activePeriods = await prisma.school_periods.findMany({
      orderBy: { order_idx: 'asc' }
    });

    let targetSections = [];
    if (section_id === "all") {
      const allSecs = await prisma.sections.findMany({ select: { id: true } });
      targetSections = allSecs.map(s => s.id);
    } else {
      targetSections = [parseInt(section_id)];
    }

    let totalGenerated = 0;

    for (let secId of targetSections) {
      // 1. Fetch all assigned subjects for this section
      const assignments = await prisma.teacher_section_subjects.findMany({
        where: { section_id: secId, is_active: true }
      });

      if (assignments.length === 0) {
        continue; // skip if no subjects assigned
      }

      // 2. Fetch ALL existing timetables to check for teacher conflicts across the whole school
      const allTimetables = await prisma.timetable.findMany({
        include: { teacher_section_subjects: true }
      });

      // We will clear the current section's timetable to regenerate
      await prisma.timetable.deleteMany({
        where: {
          teacher_section_subjects: { section_id: secId }
        }
      });

      let newSlots = [];
      
      // Build a flat list of needed slots based on periods_per_week
      let neededSlots = [];
      for (let assign of assignments) {
        const times = assign.periods_per_week || 3;
        for (let i = 0; i < times; i++) {
          neededSlots.push(assign);
        }
      }

      // Shuffle the needed slots for better distribution
      neededSlots = neededSlots.sort(() => Math.random() - 0.5);

      for (let period of activePeriods) {
        if (period.is_break) continue; // Skip breaks
        
        for (let day of activeDays) {
          if (neededSlots.length === 0) break; // All slots filled

          let placedIndex = -1;
          
          // First pass: try to find a subject that is NOT already scheduled on this day
          for (let i = 0; i < neededSlots.length; i++) {
            const assignment = neededSlots[i];
            
            const isTeacherBusy = allTimetables.some(t => 
              t.day_of_week === day && 
              t.start_time === period.start_time &&
              t.teacher_section_subjects.teacher_id === assignment.teacher_id
            ) || newSlots.some(t => 
              t.day_of_week === day && 
              t.start_time === period.start_time &&
              t.teacher_id === assignment.teacher_id 
            );

            // Is this subject already on this day?
            const alreadyOnThisDay = newSlots.some(t => 
              t.day_of_week === day && 
              t.subject_id === assignment.subject_id
            );

            if (!isTeacherBusy && !alreadyOnThisDay) {
              placedIndex = i;
              break;
            }
          }

          // Second pass: if we couldn't find one, allow repeating the subject on the same day
          if (placedIndex === -1) {
            for (let i = 0; i < neededSlots.length; i++) {
              const assignment = neededSlots[i];
              
              const isTeacherBusy = allTimetables.some(t => 
                t.day_of_week === day && 
                t.start_time === period.start_time &&
                t.teacher_section_subjects.teacher_id === assignment.teacher_id
              ) || newSlots.some(t => 
                t.day_of_week === day && 
                t.start_time === period.start_time &&
                t.teacher_id === assignment.teacher_id 
              );

              if (!isTeacherBusy) {
                placedIndex = i;
                break;
              }
            }
          }

          if (placedIndex > -1) {
            const assignment = neededSlots[placedIndex];
            newSlots.push({
              teacher_section_subject_id: assignment.id,
              teacher_id: assignment.teacher_id, 
              subject_id: assignment.subject_id,
              day_of_week: day,
              start_time: period.start_time,
              end_time: period.end_time
            });
            neededSlots.splice(placedIndex, 1);
          }
        }
        if (neededSlots.length === 0) break; // Break outer loop if done
      }

      // Save generated slots to db (stripping out the temporary teacher_id field)
      const dataToInsert = newSlots.map(slot => ({
        teacher_section_subject_id: slot.teacher_section_subject_id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time
      }));

      if (dataToInsert.length > 0) {
        await prisma.timetable.createMany({
          data: dataToInsert
        });
        totalGenerated += dataToInsert.length;
      }
    }

    res.json({ message: "Timetable generated successfully!", slotsGenerated: totalGenerated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Auto-generation failed." });
  }
};
