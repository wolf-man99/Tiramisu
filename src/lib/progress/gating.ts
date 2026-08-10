import { prisma } from '../db';
import { META_LESSONS, metaLessonItemId } from '../content/meta-ads';

/**
 * The Learn -> Run gate. A course opts in by adding a checker here; courses with no
 * entry have no Run tier yet and are simply never unlockable. Accepts either the
 * top-level `prisma` client or a `$transaction` callback's `tx` — both expose the
 * same `.attempt.findMany` shape, so the same checker works whether it's called from
 * inside `recordAttempt`'s transaction (the normal path) or as a live fallback read
 * (see `checkAndUnlockRun`).
 */
type Db = Pick<typeof prisma, 'attempt'>;
type LearnCompleteChecker = (db: Db, profileId: string) => Promise<boolean>;

const LEARN_COMPLETE_CHECKERS: Record<string, LearnCompleteChecker> = {
  'meta-ads': async (db, profileId) => {
    if (META_LESSONS.length === 0) return false;
    const passed = await db.attempt.findMany({
      where: { profileId, courseId: 'meta-ads', itemType: 'lesson', passed: true },
      select: { itemId: true },
    });
    const passedIds = new Set(passed.map((a) => a.itemId));
    return META_LESSONS.every((l) => passedIds.has(metaLessonItemId(l)));
  },
};

/** True once this course has a Learn tier and this learner has finished every lesson in it. */
export async function isLearnComplete(db: Db, profileId: string, courseId: string): Promise<boolean> {
  const checker = LEARN_COMPLETE_CHECKERS[courseId];
  if (!checker) return false;
  return checker(db, profileId);
}

/** True for any course with a Run tier defined — used to decide whether to show a Run section at all. */
export function hasRunTier(courseId: string): boolean {
  return courseId in LEARN_COMPLETE_CHECKERS;
}

/**
 * Reads the cached unlock state, falling back to a live check for enrollments that
 * finished Learn before this gate existed (or before `recordAttempt` last ran) — and
 * persisting the result so the fast path (`runUnlockedAt` already set) applies from
 * then on. Safe to call on every Run-page load; the live check only runs on the
 * still-locked path, and only for courses with a Run tier at all.
 */
export async function isRunUnlocked(profileId: string, courseId: string): Promise<boolean> {
  if (!hasRunTier(courseId)) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: { profileId_courseId: { profileId, courseId } },
    select: { runUnlockedAt: true },
  });
  if (enrollment?.runUnlockedAt) return true;

  const complete = await isLearnComplete(prisma, profileId, courseId);
  if (complete) {
    await prisma.enrollment.updateMany({
      where: { profileId, courseId, runUnlockedAt: null },
      data: { runUnlockedAt: new Date() },
    });
  }
  return complete;
}
