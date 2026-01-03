
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eixygwolojrpulhdnnqh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeHlnd29sb2pycHVsaGRubnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDU0NTQsImV4cCI6MjA4MzAyMTQ1NH0.uXOj4Kv4Xrzl-FE4oAqA_0gSw5NgqnnsSH4maBB7zUM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
