(function () {
  const config = window.MDRANK_SUPABASE_CONFIG || {};
  const hasConfig = Boolean(config.url && config.anonKey);

  if (!hasConfig) {
    console.warn("MDRank: configuration Supabase manquante dans config.js.");
    window.MDRankSupabase = { client: null, isConfigured: false };
    return;
  }

  if (!window.supabase?.createClient) {
    console.warn("MDRank: SDK Supabase indisponible.");
    window.MDRankSupabase = { client: null, isConfigured: false };
    return;
  }

  window.MDRankSupabase = {
    client: window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }),
    isConfigured: true
  };
})();
