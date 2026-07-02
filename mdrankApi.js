(function () {
  const supabase = window.MDRankSupabase?.client || null;

  function cleanPublishError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("authentication")) return "Connecte-toi pour publier.";
    if (lower.includes("profile")) return "Crée ton pseudo avant de publier.";
    if (lower.includes("banned")) return "Publication impossible pour le moment.";
    if (lower.includes("category")) return "Choisis une catégorie active.";
    if (lower.includes("between 3 and 180") || lower.includes("too short")) return "Ta punchline est trop courte.";
    if (lower.includes("too long")) return "180 caractères max. Ici on frappe vite.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Publication impossible pour le moment.";
  }

  async function loadActiveCategories() {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", categories: [] };
    }

    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.warn("MDRank: load categories", error);
      return { ok: false, message: "Impossible de charger les catégories.", categories: [] };
    }

    return { ok: true, categories: data || [] };
  }

  async function createPunchline({ content, categoryId }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("create_punchline", {
      content,
      category_id: categoryId,
      challenge_id: null
    });

    if (error) {
      console.warn("MDRank: create_punchline", error);
      return { ok: false, message: cleanPublishError(error.message) };
    }

    return { ok: true, punchline: data };
  }

  function mapPunchline(row, index) {
    return {
      id: row.id,
      pseudo: row.author_pseudo || "@MDRank",
      category: row.category_name || "Punchline",
      text: row.content || "",
      reactions: {
        laugh: row.funny_count || 0,
        fire: row.heavy_count || 0,
        skull: row.killer_count || 0,
        mind: row.crazy_count || 0,
        ice: row.not_funny_count || 0
      },
      superNotes: row.supernote_count || 0,
      score: row.score || 0,
      position: index < 3 ? `#${index + 1} récent` : "",
      selectedReaction: "",
      followed: false,
      createdAt: row.created_at,
      authorId: row.author_id,
      categoryId: row.category_id,
      categorySlug: row.category_slug,
      challengeId: row.challenge_id
    };
  }

  async function getRecentPunchlines(limit = 20) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", punchlines: [] };
    }

    const { data, error } = await supabase
      .from("feed_recent")
      .select("id,content,score,funny_count,heavy_count,killer_count,crazy_count,not_funny_count,supernote_count,created_at,author_id,author_pseudo,category_id,category_name,category_slug,challenge_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("MDRank: load feed", error);
      return { ok: false, message: "Impossible de charger le feed pour le moment.", punchlines: [] };
    }

    return { ok: true, punchlines: (data || []).map(mapPunchline) };
  }

  window.MDRankApi = {
    loadActiveCategories,
    createPunchline,
    getRecentPunchlines,
    cleanPublishError
  };
})();
