/* Configuração da nuvem (Supabase).
   A chave "publishable" é pública por natureza: foi feita para ficar no site.
   A segurança dos dados vem das regras (RLS) do banco, em supabase/schema.sql.
   Para usar o sistema só local (sem nuvem), deixe os dois campos vazios. */
window.FM_CONFIG = {
  supabaseUrl: 'https://kcnhicnnuhxutvtoyibo.supabase.co',
  supabaseKey: 'sb_publishable_SYezNM1RhCNiRAOosMyz1w_Unu8CdMm',
};
