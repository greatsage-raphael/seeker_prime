import { supabase } from './supabase';

export const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
export const getNextLevelXp = (currentLevel: number) => Math.pow(currentLevel, 2) * 100;

export const awardXP = async (studentId: string, amount: number) => {
  const { data } = await supabase.from('students').select('xp').eq('student_id', studentId).single();
  const currentXp = data?.xp || 0;
  await supabase.from('students').update({ xp: currentXp + amount }).eq('student_id', studentId);
  return currentXp + amount;
};

export const unlockBadge = async (studentId: string, badgeSlug: string) => {
  const { data: badge } = await supabase
    .from('badges')
    .select('*')
    .eq('slug', badgeSlug)
    .maybeSingle(); 

  if (!badge) return null;

  const { data: existing } = await supabase
    .from('student_badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_id', badge.id)
    .maybeSingle();

  if (existing) return null; 

  const { error } = await supabase
    .from('student_badges')
    .insert({ student_id: studentId, badge_id: badge.id });

  if (error) {
    if (error.code === '23505') return null;
    return null;
  } else {
    await awardXP(studentId, badge.xp_reward);
    return badge; // Return the full badge object so the UI can show it
  }
};

export const checkNightScholar = async (studentId: string) => {
  const hour = new Date().getHours();
  if (hour >= 22 || hour <= 4) {
    return await unlockBadge(studentId, 'night_scholar');
  }
  return null;
};

export const checkFirstStep = async (studentId: string) => {
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);

  // Since we just saved the lesson, 1 means this was the first ever.
  if (count === 1) {
    return await unlockBadge(studentId, 'first_step');
  }
  return null;
};

export const checkSocraticMaster = async (studentId: string, score: number) => {
  if (score === 100) {
    return await unlockBadge(studentId, 'socratic_master');
  }
  return null;
};

export const checkDeepDiver = async (studentId: string) => {
  const { count } = await supabase
    .from('lesson_plans')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  if (count && count >= 15) {
    return await unlockBadge(studentId, 'deep_diver');
  }
  return null;
};