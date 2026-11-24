import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Play } from "lucide-react";
import { getCourse } from "@/lib/server/queries";
import { requireLessonAccess, requirePageViewer } from "@/lib/server/authorization";
import { Badge } from "@/components/ui";
import { SecureVideoPlayer } from "@/components/secure-video-player";
import { formatDuration } from "@/lib/utils";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const viewer = await requirePageViewer();
  const { slug, lessonId } = await params;
  const course = await getCourse(viewer, slug);
  if (!course) notFound();
  const lesson = course.lessons.find((item) => item.id === lessonId);
  if (!lesson) notFound();
  if (!course.enrollments.length) redirect(`/courses/${slug}`);
  await requireLessonAccess(viewer, lessonId);
  const next = course.lessons.find((item) => item.position === lesson.position + 1);
  return <><Link href={`/courses/${slug}`} className="mb-6 inline-flex items-center gap-2 text-xs text-muted hover:text-white"><ArrowLeft size={13} />{course.title}</Link><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]"><div><div className="mb-5"><p className="eyebrow mb-2">{lesson.module}</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1><div className="mt-3 flex items-center gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] text-muted"><Clock3 size={12} />{formatDuration(lesson.estimatedSeconds)} estimated</span><Badge tone="violet">Lesson {lesson.position} of {course.lessons.length}</Badge></div></div><SecureVideoPlayer lessonId={lesson.id} title={lesson.title} availableProviders={lesson.videos.map((video) => video.provider)} resumeAt={lesson.progress[0]?.positionSeconds ?? 0} isAdmin={viewer.role === "ADMIN"} /><section className="panel mt-6 p-5"><h2 className="text-sm font-semibold">In this lesson</h2><p className="mt-3 text-sm leading-7 text-muted">{lesson.description}</p><p className="mt-4 text-[10px] leading-5 text-muted">Progress saves every 10 seconds during real playback. Completion is recorded at 95% of the provider-verified duration. Progress is a learning aid, not proof of attentive viewing.</p></section>{next && <div className="mt-5 flex justify-end"><Link href={`/courses/${slug}/lessons/${next.id}`} className="btn-secondary text-xs">Next lesson <ArrowRight size={14} /></Link></div>}</div><aside className="panel overflow-hidden xl:sticky xl:top-6"><div className="flex items-center gap-2 border-b border-border p-4"><BookOpen size={15} className="text-violet-300" /><h2 className="text-xs font-semibold">Course curriculum</h2></div><div className="divide-y divide-border">{course.lessons.map((item) => <Link key={item.id} href={`/courses/${slug}/lessons/${item.id}`} aria-current={item.id === lesson.id ? "page" : undefined} className={`flex items-start gap-3 p-4 text-xs ${item.id === lesson.id ? "bg-[#251f36]" : "hover:bg-surface-raised"}`}><span className={`mt-0.5 ${item.progress[0]?.completed ? "text-emerald-300" : item.id === lesson.id ? "text-violet-300" : "text-muted"}`}>{item.progress[0]?.completed ? <Check size={13} /> : <Play size={12} />}</span><div className="flex-1"><p className={`leading-5 ${item.id === lesson.id ? "text-violet-200" : "text-slate-300"}`}>{item.title}</p><p className="mt-1 text-[9px] text-muted">{formatDuration(item.estimatedSeconds)} estimated</p></div><ChevronRight size={12} className="mt-1 text-muted" /></Link>)}</div></aside></div></>;
}