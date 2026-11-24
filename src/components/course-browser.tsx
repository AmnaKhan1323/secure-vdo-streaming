"use client";

import { useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { CourseCard, type CourseSummary } from "./course-card";
import { EmptyState } from "./ui";
import { cn } from "@/lib/utils";

export function CourseBrowser({ courses, initialQuery = "" }: { courses: CourseSummary[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("All courses");
  const filtered = courses.filter((course) => (filter !== "Enrolled" || course.enrolled) && (filter !== "Completed" || course.progress === 100) && `${course.title} ${course.category} ${course.subtitle}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="inline-flex gap-1 rounded-xl border border-border bg-surface p-1" role="group" aria-label="Course filters">{["All courses", "Enrolled", "Completed"].map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={cn("rounded-lg px-4 py-2 text-xs font-medium", filter === item ? "bg-[#2a243c] text-violet-200" : "text-muted hover:text-white")}>{item}</button>)}</div><div className="relative w-full sm:w-64"><Search size={15} className="absolute left-3 top-3 text-muted" /><input className="input py-2.5 pl-9 text-xs" aria-label="Filter course catalog" placeholder="Search courses or topics" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>{filtered.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <EmptyState title="No courses in this view" description="Try another search or browse all courses to find your next step." icon={<BookOpen size={22} />} action={<button className="btn-secondary" onClick={() => { setQuery(""); setFilter("All courses"); }}>Show all courses</button>} />}<p className="mt-6 text-[10px] text-muted">Original prototype curricula and estimated durations · Not a published course catalog. Add your authorized videos in the admin workspace.</p></>;
}