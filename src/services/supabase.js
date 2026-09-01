import { createClient } from '@supabase/supabase-js';

// O Vite lê automaticamente as variáveis que começam com VITE_ do arquivo .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("As variáveis de ambiente do Supabase não foram configuradas corretamente!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);