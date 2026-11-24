import { FEATURED_COURSE_IDS } from "./site";

/** Original sample curricula for this prototype, NOT copied course outlines or
 * published videos. No instructor identity or provider ID is assumed.
 */
export const sampleCourses = [
  {
    id: FEATURED_COURSE_IDS[0],
    slug: "web-development-foundations",
    title: "Web development foundations",
    subtitle: "Start with HTML, CSS, and JavaScript. Build your first website.",
    category: "Web development",
    level: "Beginner",
    accent: "violet",
    instructor: "Instructor to be assigned",
    instructorRole: "Original prototype curriculum",
    description: "Build a small website from a blank page, then make it responsive and interactive. This original sample curriculum is a test container for Secure VDO Streaming, not a published course. Add your authorized videos and approved instructor details before publishing.",
    learningOutcomes: ["Structure a page with semantic HTML", "Create responsive layouts with CSS", "Add interactions with JavaScript", "Build and review a small web project"],
    lessons: [
      { title: "How websites work", module: "01 · Understand the web", description: "Connect the browser, server, and files that make up a website. Set up a simple project and open it locally.", estimatedSeconds: 720 },
      { title: "HTML that gives a page structure", module: "01 · Understand the web", description: "Organize headings, navigation, links, and forms using meaningful HTML elements.", estimatedSeconds: 1080 },
      { title: "Build a responsive layout with CSS", module: "02 · Create your first project", description: "Use spacing, flexbox, and responsive breakpoints to make a page work on small and large screens.", estimatedSeconds: 1260 },
      { title: "Make the page interactive", module: "02 · Create your first project", description: "Handle an event, update page content, and give users clear feedback with JavaScript.", estimatedSeconds: 1440 },
      { title: "Finish and review your first website", module: "03 · Practice with a project", description: "Bring the pieces together, test keyboard navigation, and improve your project one small step at a time.", estimatedSeconds: 960 },
    ],
  },
  {
    id: FEATURED_COURSE_IDS[1],
    slug: "python-programming-essentials",
    title: "Python programming essentials",
    subtitle: "Learn the basics, write small programs, and practice every step.",
    category: "Python",
    level: "Beginner",
    accent: "blue",
    instructor: "Instructor to be assigned",
    instructorRole: "Original prototype curriculum",
    description: "Work through the building blocks of a Python program and use them in a practical mini-project. This is original prototype curriculum, not an official published course or a copy of its videos. Real lesson media must be configured by an administrator.",
    learningOutcomes: ["Work with variables and basic data types", "Use conditions and loops", "Organize code with functions", "Create and test a small command-line project"],
    lessons: [
      { title: "Write your first Python program", module: "01 · Start with the basics", description: "Run a Python file and understand variables, text, numbers, and simple output.", estimatedSeconds: 600 },
      { title: "Make decisions and repeat work", module: "01 · Start with the basics", description: "Use conditions and loops to solve a small problem step by step.", estimatedSeconds: 900 },
      { title: "Functions and everyday data", module: "02 · Solve a practical problem", description: "Break a program into functions and work with lists and dictionaries.", estimatedSeconds: 1200 },
      { title: "Build a command-line mini-project", module: "02 · Solve a practical problem", description: "Combine the basics in a small utility, handle invalid input, and check expected results.", estimatedSeconds: 780 },
    ],
  },
  {
    id: FEATURED_COURSE_IDS[2],
    slug: "dsa-problem-solving-foundations",
    title: "DSA problem-solving foundations",
    subtitle: "Understand the approach before writing the solution.",
    category: "Data structures & algorithms",
    level: "Intermediate",
    accent: "teal",
    instructor: "Instructor to be assigned",
    instructorRole: "Original prototype curriculum",
    description: "Build a repeatable problem-solving process with simple data structures, worked examples, and complexity analysis. This original sample track is a Secure VDO Streaming test container. It is not a published course, an interview-success guarantee, or a source of demo video streams.",
    learningOutcomes: ["Read a problem and identify edge cases", "Reason about time and space complexity", "Practice array and map-based solutions", "Choose a data structure for the task"],
    lessons: [
      { title: "Turn a problem into a plan", module: "01 · Build a problem-solving habit", description: "Clarify inputs and outputs, test small examples, and write a simple first approach.", estimatedSeconds: 840 },
      { title: "Understand time and space complexity", module: "01 · Build a problem-solving habit", description: "Compare approaches and explain how work and memory usage grow with the input.", estimatedSeconds: 960 },
      { title: "Arrays, maps, and common patterns", module: "02 · Practice the fundamentals", description: "Apply lookups and careful iteration to solve a small collection of example problems.", estimatedSeconds: 1080 },
      { title: "Pick the right data structure", module: "02 · Practice the fundamentals", description: "Compare lists, stacks, and queues, then justify a choice for a practical task.", estimatedSeconds: 660 },
    ],
  },
];