// upload-assets.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use SERVICE_ROLE_KEY for admin rights to upload, or VITE_SUPABASE_ANON_KEY if RLS allows uploads
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
const BUCKET_NAME = 'seeker'; 
const ASSETS_DIR = './assets';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mapToSlug = (filename) => {
  // Removes extension (e.g., 'deep_diver.mp4' -> 'deep_diver')
  return path.parse(filename).name;
};

async function uploadAndMap() {
  console.log(`🚀 Starting upload to bucket: '${BUCKET_NAME}'...`);
  
  const files = fs.readdirSync(ASSETS_DIR).filter(file => 
    ['.jpeg', '.jpg', '.png', '.mp4', '.webm'].includes(path.extname(file).toLowerCase())
  );

  const assetMap = {};

  for (const file of files) {
    const filePath = path.join(ASSETS_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const slug = mapToSlug(file);
    const ext = path.extname(file).toLowerCase();
    const type = (ext === '.mp4' || ext === '.webm') ? 'vid' : 'img';

    console.log(`... Uploading ${file}`);

    // 1. Upload
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`${file}`, fileBuffer, {
        upsert: true,
        contentType: type === 'vid' ? 'video/mp4' : 'image/jpeg'
      });

    if (error) {
      console.error(`❌ Error uploading ${file}:`, error.message);
      continue;
    }

    // 2. Get Public URL
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`${file}`);

    // 3. Build Map
    if (!assetMap[slug]) assetMap[slug] = {};
    assetMap[slug][type] = data.publicUrl;
  }

  console.log('\n✅ Upload Complete! Copy the code below into ProfilePage.tsx:\n');
  console.log('// --- REMOTE ASSETS MAP ---');
  console.log(`const BADGE_ASSETS: Record<string, { img: string; vid: string }> = ${JSON.stringify(assetMap, null, 2)};`);
}

uploadAndMap();