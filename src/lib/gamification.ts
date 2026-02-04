// FILE: src/lib/gamification.ts
// --------------------------------------------------------------------------
import { supabase } from './supabase';

// Level Formula: Level = sqrt(XP / 100)
export const calculateLevel = (xp: number) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const getNextLevelXp = (currentLevel: number) => {
  return Math.pow(currentLevel, 2) * 100;
};

// Generic XP Awarder
export const awardXP = async (studentId: string, amount: number) => {
  const { data } = await supabase.from('students').select('xp').eq('student_id', studentId).single();
  const currentXp = data?.xp || 0;
  
  await supabase.from('students').update({ xp: currentXp + amount }).eq('student_id', studentId);
  return currentXp + amount;
};

const unlockBadge = async (studentId: string, badgeSlug: string) => {
  // 1. Get Badge Definition
  // Use maybeSingle() -> returns null if not found, doesn't throw error
  const { data: badge } = await supabase
    .from('badges')
    .select('id, xp_reward, name')
    .eq('slug', badgeSlug)
    .maybeSingle(); 

  if (!badge) {
    console.warn(`Badge definition not found for slug: ${badgeSlug}. Did you add it to the 'badges' table?`);
    return;
  }

  // 2. Check if user ALREADY has it
  const { data: existing } = await supabase
    .from('student_badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_id', badge.id)
    .maybeSingle(); // <--- This fixes Error PGRST116

  if (existing) {
    // User already has the badge. Do nothing.
    return; 
  }

  // 3. Award Badge (Safe Insert)
  // We try to insert. If it fails due to a race condition (Error 23505), we catch it.
  const { error } = await supabase
    .from('student_badges')
    .insert({ student_id: studentId, badge_id: badge.id });

  if (error) {
    // If error is "Duplicate Key" (23505), it means they earned it milliseconds ago. Ignore it.
    if (error.code === '23505') return;
    console.error("Error awarding badge:", error);
  } else {
    // Only award XP if the insert actually happened
    await awardXP(studentId, badge.xp_reward);
    console.log(`🎖️ Unlocked: ${badge.name}`);
  }
};


// --- BADGE CHECKERS ---

/**
 * Badge: NIGHT SCHOLAR
 * Logic: Checks if current time is between 10 PM (22:00) and 4 AM (04:00).
 * Trigger: Called after finishing a lesson in LessonPage.
 */
export const checkNightScholar = async (studentId: string) => {
  const hour = new Date().getHours();
  if (hour >= 22 || hour <= 4) {
    await unlockBadge(studentId, 'night_scholar');
  }
};

/**
 * Badge: INITIATE (First Step)
 * Logic: Checks if the user has exactly 1 lesson record in the 'lessons' table.
 * Trigger: Called after finishing a lesson in LessonPage.
 */
export const checkFirstStep = async (studentId: string) => {
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);

  // If this was their first lesson, count will be 1 (since we just inserted it)
  if (count === 1) {
    await unlockBadge(studentId, 'first_step');
  }
};

/**
 * Badge: SOCRATIC MASTER
 * Logic: Checks if the Exam Score was exactly 100%.
 * Trigger: Called after passing an exam in TestPage.
 */
export const checkSocraticMaster = async (studentId: string, score: number) => {
  if (score === 100) {
    await unlockBadge(studentId, 'socratic_master');
  }
};

/**
 * Badge: DEEP DIVER
 * Logic: Checks if the user has completed enough unique Lesson Plans (e.g., 15)
 * to constitute "5 Courses" worth of work (assuming avg 3 lessons/course).
 * Trigger: Called after passing an exam in TestPage.
 */
export const checkDeepDiver = async (studentId: string) => {
  const { count } = await supabase
    .from('lesson_plans')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed'); // We rely on the lesson_plans table 'completed' status

  // Assuming ~3 lessons per course, 15 lessons = ~5 courses
  if (count && count >= 15) {
    await unlockBadge(studentId, 'deep_diver');
  }
};

/**
 * Badge: THE CONSTANT
 * Logic: Checks if calculated streak >= 7
 * Trigger: Called in ProfilePage after calculating logs
 */
export const checkStreakBadge = async (studentId: string, currentStreak: number) => {
  if (currentStreak >= 3) {
    await unlockBadge(studentId, 'streak_3');
  }
};