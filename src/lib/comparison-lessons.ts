import { PROVIDERS, type VideoProvider } from "./types";

export type ComparisonLesson = {
  id: string;
  title: string;
  courseTitle: string;
  providers: VideoProvider[];
};

type TestCourse = {
  title: string;
  enrollments: readonly unknown[];
  lessons: readonly {
    id: string;
    title: string;
    videos: readonly { provider: VideoProvider }[];
  }[];
};

export function hasProviderPair(lesson: ComparisonLesson) {
  return PROVIDERS.every((provider) => lesson.providers.includes(provider));
}

/** Prefer enrolled lessons that can actually run a paired comparison.
 * A pair of IDs is not proof that the videos contain identical source media.
 */
export function comparisonLessons(courses: readonly TestCourse[]): ComparisonLesson[] {
  return courses
    .filter((course) => course.enrollments.length > 0)
    .flatMap((course) => course.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      courseTitle: course.title,
      providers: [...new Set(lesson.videos.map((video) => video.provider))],
    })))
    .sort((left, right) => Number(hasProviderPair(right)) - Number(hasProviderPair(left)) || right.providers.length - left.providers.length);
}