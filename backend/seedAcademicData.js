import University from "./models/University.js";
import Course from "./models/Course.js";
import Semester from "./models/Semester.js";
import Subject from "./models/Subject.js";
import PYQ from "./models/PYQ.js";
import Note from "./models/Note.js";

/**
 * Automatically seeds initial academic hierarchy and links legacy records
 * if database has no universities yet.
 */
export async function seedAcademicData() {
  try {
    const universityCount = await University.countDocuments();
    if (universityCount > 0) {
      // If universities already exist, ensure any unlinked papers get linked
      await linkLegacyRecords();
      return;
    }

    console.log("🌱 Seeding initial academic hierarchy (Universities, Courses, Semesters, Subjects)...");

    // 1. Seed Universities
    const uu = await University.create({
      name: "United University",
      code: "UU",
      description: "Premier academic institution in Prayagraj, UP offering engineering, computer applications, management, and pharmacy programs.",
      location: "Prayagraj",
      state: "Uttar Pradesh",
      country: "India",
      website: "https://uniteduniversity.edu.in",
      status: "active",
    });

    const au = await University.create({
      name: "University of Allahabad",
      code: "AU",
      description: "Historic central university founded in 1887, known as Oxford of the East.",
      location: "Prayagraj",
      state: "Uttar Pradesh",
      country: "India",
      status: "active",
    });

    const aktu = await University.create({
      name: "Dr. A.P.J. Abdul Kalam Technical University",
      code: "AKTU",
      description: "State technical university affiliating engineering and management colleges across UP.",
      location: "Lucknow",
      state: "Uttar Pradesh",
      country: "India",
      status: "active",
    });

    const du = await University.create({
      name: "University of Delhi",
      code: "DU",
      description: "Collegiate research university located in New Delhi, India.",
      location: "New Delhi",
      state: "Delhi",
      country: "India",
      status: "active",
    });

    // 2. Seed Courses for United University
    const coursesData = [
      {
        name: "B.Tech Computer Science and Engineering",
        code: "BTECH-CSE",
        universityId: uu._id,
        degreeType: "Undergraduate",
        duration: "4 Years",
        numberOfSemesters: 8,
        description: "Core computer science covering algorithms, OS, networks, systems, and AI.",
      },
      {
        name: "B.Tech Information Technology",
        code: "BTECH-IT",
        universityId: uu._id,
        degreeType: "Undergraduate",
        duration: "4 Years",
        numberOfSemesters: 8,
        description: "Applied computing, cloud technologies, database systems, and security.",
      },
      {
        name: "BCA Bachelor of Computer Applications",
        code: "BCA",
        universityId: uu._id,
        degreeType: "Undergraduate",
        duration: "3 Years",
        numberOfSemesters: 6,
        description: "Software engineering, web development, and database architecture.",
      },
      {
        name: "MCA Master of Computer Applications",
        code: "MCA",
        universityId: uu._id,
        degreeType: "Postgraduate",
        duration: "2 Years",
        numberOfSemesters: 4,
        description: "Advanced computing, distributed systems, enterprise software, and machine learning.",
      },
      {
        name: "MBA Master of Business Administration",
        code: "MBA",
        universityId: uu._id,
        degreeType: "Postgraduate",
        duration: "2 Years",
        numberOfSemesters: 4,
        description: "Strategic management, financial systems, marketing, and human resources.",
      },
      {
        name: "BBA Bachelor of Business Administration",
        code: "BBA",
        universityId: uu._id,
        degreeType: "Undergraduate",
        duration: "3 Years",
        numberOfSemesters: 6,
        description: "Foundations of commerce, business analytics, and entrepreneurship.",
      },
      {
        name: "Diploma in Computer Science",
        code: "DIP-CS",
        universityId: uu._id,
        degreeType: "Diploma",
        duration: "3 Years",
        numberOfSemesters: 6,
        description: "Applied technical computing and programming fundamentals.",
      },
    ];

    const createdCourses = await Course.insertMany(coursesData);

    // 3. Create Semesters for each Course & Subjects
    for (const course of createdCourses) {
      const semestersToCreate = [];
      for (let s = 1; s <= course.numberOfSemesters; s++) {
        semestersToCreate.push({
          name: `Semester ${s}`,
          number: s,
          courseId: course._id,
          universityId: course.universityId,
          status: "active",
        });
      }
      const createdSemesters = await Semester.insertMany(semestersToCreate);

      // Seed baseline subjects for B.Tech CSE
      if (course.code === "BTECH-CSE") {
        const cseSubjects = [
          // Sem 1
          { sem: 1, name: "Engineering Mathematics I", code: "BAS103" },
          { sem: 1, name: "Engineering Physics", code: "BAS101" },
          { sem: 1, name: "Programming for Problem Solving (C)", code: "BCS101" },
          // Sem 2
          { sem: 2, name: "Engineering Mathematics II", code: "BAS203" },
          { sem: 2, name: "Engineering Chemistry", code: "BAS202" },
          { sem: 2, name: "Basic Electrical & Electronics", code: "BEE201" },
          // Sem 3
          { sem: 3, name: "Data Structures & Algorithms", code: "BCS301" },
          { sem: 3, name: "Computer Organization & Architecture", code: "BCS302" },
          { sem: 3, name: "Discrete Structures & Graph Theory", code: "BCS303" },
          // Sem 4
          { sem: 4, name: "Operating Systems", code: "BCS401" },
          { sem: 4, name: "Database Management Systems", code: "BCS402" },
          { sem: 4, name: "Theory of Automata & Formal Languages", code: "BCS403" },
          // Sem 5
          { sem: 5, name: "Computer Networks", code: "BCS501" },
          { sem: 5, name: "Design & Analysis of Algorithms", code: "BCS502" },
          { sem: 5, name: "Software Engineering", code: "BCS503" },
          // Sem 6
          { sem: 6, name: "Compiler Design", code: "BCS601" },
          { sem: 6, name: "Artificial Intelligence", code: "BCS602" },
          { sem: 6, name: "Cloud Computing", code: "BCS603" },
          // Sem 7
          { sem: 7, name: "Cryptography & Network Security", code: "BCS701" },
          { sem: 7, name: "Machine Learning & Deep Learning", code: "BCS702" },
          // Sem 8
          { sem: 8, name: "Distributed Systems", code: "BCS801" },
          { sem: 8, name: "Cyber Security & Digital Forensics", code: "BCS802" },
        ];

        const subjectDocs = [];
        for (const sub of cseSubjects) {
          const semDoc = createdSemesters.find((sem) => sem.number === sub.sem);
          if (semDoc) {
            subjectDocs.push({
              name: sub.name,
              code: sub.code,
              universityId: uu._id,
              courseId: course._id,
              semesterId: semDoc._id,
              semesterNumber: sub.sem,
              status: "active",
            });
          }
        }
        if (subjectDocs.length > 0) {
          await Subject.insertMany(subjectDocs);
        }
      }

      // Seed baseline subjects for MCA
      if (course.code === "MCA") {
        const mcaSubjects = [
          { sem: 1, name: "Advanced Data Structures & Algorithms", code: "MCA101" },
          { sem: 1, name: "Database Systems & Administration", code: "MCA102" },
          { sem: 2, name: "Advanced Computer Networks", code: "MCA201" },
          { sem: 2, name: "Web Technologies & Full Stack Dev", code: "MCA202" },
          { sem: 3, name: "Artificial Intelligence & Expert Systems", code: "MCA301" },
          { sem: 3, name: "Cloud Infrastructure & DevOps", code: "MCA302" },
          { sem: 4, name: "Big Data Analytics & BI", code: "MCA401" },
        ];
        const mcaSubjectDocs = [];
        for (const sub of mcaSubjects) {
          const semDoc = createdSemesters.find((sem) => sem.number === sub.sem);
          if (semDoc) {
            mcaSubjectDocs.push({
              name: sub.name,
              code: sub.code,
              universityId: uu._id,
              courseId: course._id,
              semesterId: semDoc._id,
              semesterNumber: sub.sem,
              status: "active",
            });
          }
        }
        if (mcaSubjectDocs.length > 0) {
          await Subject.insertMany(mcaSubjectDocs);
        }
      }
    }

    console.log("✅ Academic hierarchy successfully seeded!");

    // 4. Link any existing legacy papers & notes
    await linkLegacyRecords();
  } catch (error) {
    console.error("⚠️ Error in seedAcademicData:", error);
  }
}

/**
 * Migration helper: links unlinked PYQs and Notes to their matching University, Course & Semester
 */
export async function linkLegacyRecords() {
  try {
    const defaultUniversity = await University.findOne({ code: "UU" }) || await University.findOne();
    if (!defaultUniversity) return;

    // Link PYQs with missing universityId
    const unlinkedPYQs = await PYQ.find({
      $or: [{ universityId: null }, { universityId: { $exists: false } }],
    });

    if (unlinkedPYQs.length > 0) {
      console.log(`🔄 Linking ${unlinkedPYQs.length} legacy PYQ records to dynamic entities...`);
      for (const paper of unlinkedPYQs) {
        let courseDoc = await Course.findOne({
          universityId: defaultUniversity._id,
          $or: [
            { code: new RegExp(`^${paper.course}$`, "i") },
            { name: new RegExp(paper.course || "B.Tech", "i") },
          ],
        });

        if (!courseDoc) {
          courseDoc = await Course.findOne({ universityId: defaultUniversity._id, code: "BTECH-CSE" });
        }

        let semesterDoc = null;
        if (courseDoc) {
          semesterDoc = await Semester.findOne({
            courseId: courseDoc._id,
            number: paper.semester || 1,
          });
        }

        await PYQ.findByIdAndUpdate(paper._id, {
          $set: {
            universityId: defaultUniversity._id,
            university: defaultUniversity.name,
            courseId: courseDoc ? courseDoc._id : null,
            semesterId: semesterDoc ? semesterDoc._id : null,
            academicYear: paper.academicYear || `${paper.year || 2024}`,
          },
        });
      }
      console.log("✅ Legacy PYQ records successfully linked!");
    }

    // Link Notes with missing universityId
    const unlinkedNotes = await Note.find({
      $or: [{ universityId: null }, { universityId: { $exists: false } }],
    });

    if (unlinkedNotes.length > 0) {
      console.log(`🔄 Linking ${unlinkedNotes.length} legacy Note records to dynamic entities...`);
      for (const note of unlinkedNotes) {
        let courseDoc = await Course.findOne({
          universityId: defaultUniversity._id,
          $or: [
            { code: new RegExp(`^${note.course}$`, "i") },
            { name: new RegExp(note.course || "B.Tech", "i") },
          ],
        });

        if (!courseDoc) {
          courseDoc = await Course.findOne({ universityId: defaultUniversity._id, code: "BTECH-CSE" });
        }

        let semesterDoc = null;
        if (courseDoc) {
          semesterDoc = await Semester.findOne({
            courseId: courseDoc._id,
            number: note.semester || 1,
          });
        }

        await Note.findByIdAndUpdate(note._id, {
          $set: {
            universityId: defaultUniversity._id,
            university: defaultUniversity.name,
            courseId: courseDoc ? courseDoc._id : null,
            semesterId: semesterDoc ? semesterDoc._id : null,
          },
        });
      }
      console.log("✅ Legacy Note records successfully linked!");
    }
  } catch (err) {
    console.error("⚠️ Error linking legacy records:", err);
  }
}
