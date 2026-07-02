(function () {
  const supabase = window.MDRankSupabase?.client || null;
  const subscribers = new Set();
  const pendingPseudoKey = "mdrank_pending_pseudo";

  const state = {
    user: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
    isConfigured: Boolean(supabase)
  };

  function notify() {
    subscribers.forEach((callback) => callback(getState()));
  }

  function getState() {
    return { ...state };
  }

  function cleanMessage(message) {
    if (!message) return "Une erreur est survenue.";
    const lower = message.toLowerCase();
    if (lower.includes("invalid login")) return "Identifiants invalides.";
    if (lower.includes("email not confirmed")) return "Confirme ton email avant de te connecter.";
    if (lower.includes("already registered") || lower.includes("already exists")) return "Cet email est déjà utilisé.";
    if (lower.includes("password")) return "Le mot de passe est trop faible ou invalide.";
    if (lower.includes("duplicate") || lower.includes("unique")) return "Ce pseudo est déjà pris.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    if (lower.includes("jwt")) return "Session expirée. Reconnecte-toi.";
    if (lower.includes("pseudo")) return message;
    return "Impossible de terminer l'action. Vérifie les infos et réessaie.";
  }

  function validatePseudo(pseudo) {
    const clean = String(pseudo || "").trim();
    if (clean.length < 3) return "Pseudo trop court. Minimum 3 caractères.";
    if (clean.length > 24) return "Pseudo trop long. Maximum 24 caractères.";
    return "";
  }

  async function refreshProfile() {
    if (!supabase || !state.user) {
      state.profile = null;
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,pseudo,bio,role,is_banned,created_at")
      .eq("id", state.user.id)
      .maybeSingle();

    if (error) {
      console.warn("MDRank: erreur profil", error);
      state.profile = null;
      notify();
      return null;
    }

    state.profile = data || null;
    notify();
    return state.profile;
  }

  async function createOrUpdateProfile(pseudo, bio = null) {
    const pseudoError = validatePseudo(pseudo);
    if (pseudoError) return { ok: false, message: pseudoError };

    if (bio && bio.length > 160) {
      return { ok: false, message: "Bio trop longue. Maximum 160 caractères." };
    }

    if (!supabase) return { ok: false, message: "Supabase n'est pas encore configuré." };

    const { error } = await supabase.rpc("create_or_update_profile", {
      pseudo: pseudo.trim(),
      bio: bio?.trim() || null
    });

    if (error) {
      console.warn("MDRank: create_or_update_profile", error);
      return { ok: false, message: cleanMessage(error.message) };
    }

    localStorage.removeItem(pendingPseudoKey);
    await refreshProfile();
    return { ok: true };
  }

  async function init() {
    if (!supabase) {
      state.loading = false;
      notify();
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn("MDRank: session", error);

    state.user = data?.session?.user || null;
    state.isAuthenticated = Boolean(state.user);

    if (state.user) {
      await refreshProfile();
      const pending = localStorage.getItem(pendingPseudoKey);
      if (!state.profile && pending) {
        await createOrUpdateProfile(pending, null);
      }
    }

    state.loading = false;
    notify();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      state.user = session?.user || null;
      state.isAuthenticated = Boolean(state.user);
      state.profile = null;
      if (state.user) await refreshProfile();
      notify();
    });
  }

  async function signUp({ email, password, pseudo }) {
    const pseudoError = validatePseudo(pseudo);
    if (pseudoError) return { ok: false, message: pseudoError };
    if (!email?.trim()) return { ok: false, message: "Email obligatoire." };
    if (!password) return { ok: false, message: "Mot de passe obligatoire." };
    if (!supabase) return { ok: false, message: "Supabase n'est pas encore configuré." };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) {
      console.warn("MDRank: signUp", error);
      return { ok: false, message: cleanMessage(error.message) };
    }

    localStorage.setItem(pendingPseudoKey, pseudo.trim());

    if (!data.session) {
      return {
        ok: true,
        needsConfirmation: true,
        message: "Compte créé. Vérifie ton email pour confirmer ton inscription."
      };
    }

    state.user = data.user;
    state.isAuthenticated = true;
    const profileResult = await createOrUpdateProfile(pseudo, null);
    if (!profileResult.ok) return profileResult;

    notify();
    return { ok: true };
  }

  async function signIn({ email, password }) {
    if (!email?.trim()) return { ok: false, message: "Email obligatoire." };
    if (!password) return { ok: false, message: "Mot de passe obligatoire." };
    if (!supabase) return { ok: false, message: "Supabase n'est pas encore configuré." };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      console.warn("MDRank: signIn", error);
      return { ok: false, message: cleanMessage(error.message) };
    }

    state.user = data.user;
    state.isAuthenticated = true;
    await refreshProfile();

    const pending = localStorage.getItem(pendingPseudoKey);
    if (!state.profile && pending) {
      await createOrUpdateProfile(pending, null);
    }

    notify();
    return { ok: true };
  }

  async function resetPassword(email) {
    if (!email?.trim()) return { ok: false, message: "Renseigne ton email." };
    if (!supabase) return { ok: false, message: "Supabase n'est pas encore configuré." };

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      console.warn("MDRank: resetPassword", error);
      return { ok: false, message: cleanMessage(error.message) };
    }

    return { ok: true, message: "Email de réinitialisation envoyé." };
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    state.user = null;
    state.profile = null;
    state.isAuthenticated = false;
    notify();
  }

  window.MDRankAuth = {
    init,
    getState,
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    createOrUpdateProfile,
    validatePseudo
  };
})();
