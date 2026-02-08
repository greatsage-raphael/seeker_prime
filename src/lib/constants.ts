// src/lib/constants.ts
export const BADGE_ASSETS: Record<string, { img: string; vid: string }> = {
    "deep_diver": {
      "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/deep_diver.jpeg",
      "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/deep_diver.mp4"
    },
    "first_step": {
      "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/first_step.jpeg",
      "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/first_step.mp4"
    },
    "night_scholar": {
      "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/night_scholar.jpeg",
      "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/night_scholar.mp4"
    },
    "socratic_scholar": {
      "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/socratic_scholar.jpeg",
      "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/socratic_scholar.mp4"
    },
    "streak": {
      "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/streak.jpeg",
      "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/streak.mp4"
    }
  };
  
  export const getBadgeAsset = (slug: string) => {
    if (slug === 'socratic_master') return BADGE_ASSETS['socratic_scholar'];
    if (slug === 'streak_3') return BADGE_ASSETS['streak'];
    return BADGE_ASSETS[slug];
  };