(function () {
  const supabase = window.MDRankSupabase?.client || null;

  function cleanPublishError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("authentication")) return "Connecte-toi pour publier.";
    if (lower.includes("profile")) return "Crée ton pseudo avant de publier.";
    if (lower.includes("banned")) return "Publication impossible pour le moment.";
    if (lower.includes("challenge")) return "Défi indisponible pour le moment.";
    if (lower.includes("category")) return "Choisis une catégorie active.";
    if (lower.includes("between 3 and 180")) return "Ta punchline doit faire entre 3 et 180 caractères.";
    if (lower.includes("too short")) return "Ta punchline est trop courte.";
    if (lower.includes("too long")) return "180 caractères max. Ici on frappe vite.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Publication impossible pour le moment.";
  }

  function cleanReactionError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("authentication")) return "Connecte-toi pour réagir.";
    if (lower.includes("profile")) return "Crée ton pseudo avant de réagir.";
    if (lower.includes("banned")) return "Réaction impossible pour le moment.";
    if (lower.includes("own punchline")) return "Impossible de réagir à ta propre punchline.";
    if (lower.includes("published punchline")) return "Cette punchline n'est plus disponible.";
    if (lower.includes("invalid reaction")) return "Réaction indisponible.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Réaction impossible pour le moment.";
  }

  function cleanSuperNoteError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("authentication")) return "Connecte-toi pour envoyer ta SuperNote.";
    if (lower.includes("profile")) return "Crée ton pseudo avant de SuperNoter.";
    if (lower.includes("banned")) return "SuperNote impossible pour le moment.";
    if (lower.includes("own punchline")) return "Impossible de SuperNoter ta propre punchline. Même si elle mérite une statue.";
    if (lower.includes("daily supernote")) return "Tu as déjà utilisé ta SuperNote du jour.";
    if (lower.includes("already supernoted")) return "Tu as déjà SuperNoté cette punchline.";
    if (lower.includes("published punchline")) return "Cette punchline n'est plus disponible.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Impossible d'envoyer la SuperNote pour le moment.";
  }

  function cleanFollowError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("authentication")) return "Connecte-toi pour suivre ce blagueur.";
    if (lower.includes("profile")) return "Crée ton pseudo avant de suivre quelqu'un.";
    if (lower.includes("banned")) return "Action impossible pour le moment.";
    if (lower.includes("yourself")) return "Impossible de te suivre toi-même. Même si tu es très drôle.";
    if (lower.includes("target profile")) return "Ce profil n'est plus disponible.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Action impossible pour le moment.";
  }

  function cleanReportError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("authentication")) return "Connecte-toi pour signaler une punchline.";
    if (lower.includes("profile")) return "Crée ton pseudo avant de signaler.";
    if (lower.includes("banned")) return "Signalement impossible pour le moment.";
    if (lower.includes("duplicate") || lower.includes("unique")) return "Tu as déjà signalé cette punchline.";
    if (lower.includes("own punchline")) return "Tu ne peux pas signaler ta propre punchline.";
    if (lower.includes("invalid report reason")) return "Choisis une raison.";
    if (lower.includes("500")) return "Détail trop long.";
    if (lower.includes("punchline not found")) return "Cette punchline n'est plus disponible.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Impossible d'envoyer le signalement pour le moment.";
  }

  function cleanModerationError(message) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("moderator role")) return "Accès modération requis.";
    if (lower.includes("admin role")) return "Accès admin requis.";
    if (lower.includes("invalid")) return "Action de modération invalide.";
    if (lower.includes("not found")) return "Élément introuvable.";
    if (lower.includes("network") || lower.includes("fetch")) return "Problème réseau. Réessaie dans un instant.";
    return "Action impossible pour le moment.";
  }

  function reunionToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Indian/Reunion",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${values.year}-${values.month}-${values.day}`;
  }

  function uiReactionKey(reactionType) {
    return {
      funny: "laugh",
      crazy: "mind",
      heavy: "fire",
      killer: "skull",
      not_funny: "ice"
    }[reactionType] || "";
  }

  function normalizeUnlockedBadges(data) {
    const badges = data?.unlocked_badges || data?.unlockedBadges || [];
    if (!Array.isArray(badges)) return [];

    return badges.map((badge) => ({
      awardedUserId: badge.awarded_user_id || badge.awardedUserId || "",
      slug: badge.slug || "",
      name: badge.name || "",
      description: badge.description || "",
      category: badge.category || "",
      level: Number(badge.level || 1),
      rarity: badge.rarity || "common",
      icon: badge.icon || "badge",
      earnedAt: badge.earned_at || badge.earnedAt || ""
    })).filter((badge) => badge.slug && badge.name);
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

  async function createPunchline({ content, categoryId, challengeId = null }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("create_punchline", {
      content,
      category_id: categoryId,
      challenge_id: challengeId
    });

    if (error) {
      console.warn("MDRank: create_punchline", error);
      return { ok: false, message: cleanPublishError(error.message) };
    }

    return {
      ok: true,
      punchline: data?.punchline || data,
      unlockedBadges: normalizeUnlockedBadges(data)
    };
  }

  async function getDailyChallenge() {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", challenge: null, top: [] };
    }

    const { data: challenges, error } = await supabase
      .from("daily_challenges")
      .select("id,title,description,challenge_date,created_at")
      .eq("is_active", true)
      .lte("challenge_date", reunionToday())
      .order("challenge_date", { ascending: false })
      .limit(1);

    if (error) {
      console.warn("MDRank: load daily challenge", error);
      return { ok: false, message: "Impossible de charger le défi du jour.", challenge: null, top: [] };
    }

    const challenge = challenges?.[0] || null;
    if (!challenge) {
      return { ok: true, challenge: null, top: [] };
    }

    const { data: rows, error: topError } = await supabase
      .from("public_punchlines")
      .select("id,content,score,funny_count,heavy_count,killer_count,crazy_count,not_funny_count,supernote_count,created_at,author_id,author_pseudo,category_id,category_name,category_slug,challenge_id")
      .eq("challenge_id", challenge.id)
      .order("score", { ascending: false })
      .order("supernote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3);

    if (topError) {
      console.warn("MDRank: load challenge top", topError);
      return { ok: false, message: "Impossible de charger le top du défi.", challenge, top: [] };
    }

    const top = await enrichPunchlines(rows || [], 3);
    return {
      ok: true,
      challenge,
      top: top.map((punchline, index) => ({
        ...punchline,
        position: index + 1
      }))
    };
  }

  function mapPunchline(row, index, selectedReaction = "", superNoteState = {}, followedAuthorIds = {}) {
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
      hasSuperNoted: Boolean(superNoteState.hasSuperNoted),
      superNoteUsedToday: Boolean(superNoteState.superNoteUsedToday),
      score: row.score || 0,
      position: index < 3 ? `#${index + 1} récent` : "",
      selectedReaction,
      followed: Boolean(followedAuthorIds[row.author_id]),
      createdAt: row.created_at,
      authorId: row.author_id,
      categoryId: row.category_id,
      categorySlug: row.category_slug,
      challengeId: row.challenge_id
    };
  }

  async function enrichPunchlines(rows, limit) {
    let selectedByPunchline = {};
    let superNoteByPunchline = {};
    let superNoteUsedToday = false;
    let followedAuthorIds = {};
    const punchlineIds = (rows || []).map((row) => row.id);
    const authorIds = [...new Set((rows || []).map((row) => row.author_id).filter(Boolean))];
    const sessionResult = await supabase.auth.getSession();

    if (sessionResult.data?.session && punchlineIds.length) {
      const { data: reactions, error: reactionsError } = await supabase
        .from("my_reactions")
        .select("punchline_id,reaction_type")
        .in("punchline_id", punchlineIds);

      if (reactionsError) {
        console.warn("MDRank: load my reactions", reactionsError);
      } else {
        selectedByPunchline = (reactions || []).reduce((acc, reaction) => {
          acc[reaction.punchline_id] = uiReactionKey(reaction.reaction_type);
          return acc;
        }, {});
      }

      const { data: supernotes, error: supernotesError } = await supabase
        .from("supernotes")
        .select("punchline_id,supernote_day");

      if (supernotesError) {
        console.warn("MDRank: load my supernotes", supernotesError);
      } else {
        const today = reunionToday();
        superNoteUsedToday = (supernotes || []).some((supernote) => supernote.supernote_day === today);
        superNoteByPunchline = (supernotes || []).reduce((acc, supernote) => {
          acc[supernote.punchline_id] = true;
          return acc;
        }, {});
      }

      if (authorIds.length) {
        const { data: follows, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", sessionResult.data.session.user.id)
          .in("following_id", authorIds);

        if (followsError) {
          console.warn("MDRank: load follows", followsError);
        } else {
          followedAuthorIds = (follows || []).reduce((acc, follow) => {
            acc[follow.following_id] = true;
            return acc;
          }, {});
        }
      }
    }

    return (rows || []).slice(0, limit).map((row, index) => mapPunchline(row, index, selectedByPunchline[row.id], {
      hasSuperNoted: superNoteByPunchline[row.id],
      superNoteUsedToday
    }, followedAuthorIds));
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

    return { ok: true, punchlines: await enrichPunchlines(data || [], limit) };
  }

  async function getFollowingPunchlines(limit = 20) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", punchlines: [] };
    }

    const { data, error } = await supabase.rpc("get_following_feed", {
      limit_count: limit
    });

    if (error) {
      console.warn("MDRank: load following feed", error);
      return { ok: false, message: "Impossible de charger le feed suivis pour le moment.", punchlines: [] };
    }

    return { ok: true, punchlines: await enrichPunchlines(data || [], limit) };
  }

  async function getLeaderboard(period = "day", limit = 50) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", punchlines: [] };
    }

    const views = {
      day: "leaderboard_day",
      week: "leaderboard_week",
      month: "leaderboard_month"
    };
    const view = views[period] || views.day;

    const { data, error } = await supabase
      .from(view)
      .select("id,content,score,funny_count,heavy_count,killer_count,crazy_count,not_funny_count,supernote_count,created_at,author_id,author_pseudo,category_id,category_name,category_slug,challenge_id")
      .order("score", { ascending: false })
      .order("supernote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("MDRank: load leaderboard", error);
      return { ok: false, message: "Impossible de charger le classement pour le moment.", punchlines: [] };
    }

    const punchlines = await enrichPunchlines(data || [], limit);
    return {
      ok: true,
      punchlines: punchlines.map((punchline, index) => ({
        ...punchline,
        position: `#${index + 1}`
      }))
    };
  }

  async function getLeaderboardUsers(limit = 20) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", users: [] };
    }

    const { data, error } = await supabase
      .from("public_punchlines")
      .select("author_id,author_pseudo,score,supernote_count,created_at")
      .limit(1000);

    if (error) {
      console.warn("MDRank: load user leaderboard", error);
      return { ok: false, message: "Impossible de charger le Top blagueurs pour le moment.", users: [] };
    }

    const usersById = (data || []).reduce((acc, row) => {
      const authorId = row.author_id || "";
      if (!authorId) return acc;

      const current = acc.get(authorId) || {
        id: authorId,
        pseudo: row.author_pseudo || "@MDRank",
        score: 0,
        punchlines: 0,
        superNotes: 0,
        latestPunchlineAt: ""
      };

      current.score += Number(row.score || 0);
      current.punchlines += 1;
      current.superNotes += Number(row.supernote_count || 0);
      if (!current.latestPunchlineAt || String(row.created_at || "") > current.latestPunchlineAt) {
        current.latestPunchlineAt = row.created_at || "";
      }

      acc.set(authorId, current);
      return acc;
    }, new Map());

    const users = [...usersById.values()]
      .sort((a, b) => {
        return b.score - a.score
          || b.superNotes - a.superNotes
          || b.punchlines - a.punchlines
          || String(b.latestPunchlineAt).localeCompare(String(a.latestPunchlineAt));
      })
      .slice(0, limit)
      .map((user, index) => ({
        id: user.id,
        pseudo: user.pseudo,
        score: user.score,
        punchlines: user.punchlines,
        superNotes: user.superNotes,
        position: `#${index + 1}`
      }));

    return {
      ok: true,
      users
    };
  }

  async function castReaction({ punchlineId, reactionType }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("cast_reaction", {
      punchline_id: punchlineId,
      reaction_type: reactionType
    });

    if (error) {
      console.warn("MDRank: cast_reaction", error);
      return { ok: false, message: cleanReactionError(error.message) };
    }

    return {
      ok: true,
      reaction: data?.reaction || data,
      unlockedBadges: normalizeUnlockedBadges(data)
    };
  }

  async function giveSuperNote({ punchlineId }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("give_supernote", {
      punchline_id: punchlineId
    });

    if (error) {
      console.warn("MDRank: give_supernote", error);
      return { ok: false, message: cleanSuperNoteError(error.message) };
    }

    return {
      ok: true,
      supernote: data?.supernote || data,
      unlockedBadges: normalizeUnlockedBadges(data)
    };
  }

  async function followUser({ targetUserId }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("follow_user", {
      target_user_id: targetUserId
    });

    if (error) {
      console.warn("MDRank: follow_user", error);
      return { ok: false, message: cleanFollowError(error.message) };
    }

    return { ok: true, follow: data };
  }

  async function unfollowUser({ targetUserId }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { error } = await supabase.rpc("unfollow_user", {
      target_user_id: targetUserId
    });

    if (error) {
      console.warn("MDRank: unfollow_user", error);
      return { ok: false, message: cleanFollowError(error.message) };
    }

    return { ok: true };
  }

  async function getProfileCounts() {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", counts: null };
    }

    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data?.session?.user?.id || null;
    if (!userId) {
      return { ok: true, counts: null };
    }

    const { data, error } = await supabase.rpc("get_my_profile_counts");

    if (error) {
      console.warn("MDRank: get_my_profile_counts", error);
      return { ok: false, message: "Impossible de charger les compteurs du profil.", counts: null };
    }

    const counts = Array.isArray(data) ? data[0] : data;
    const fallbackStats = await getMyPublishedPunchlineStats(userId);
    if (!fallbackStats.ok) {
      return { ok: false, message: fallbackStats.message, counts: null };
    }

    const stats = fallbackStats.stats;
    return {
      ok: true,
      counts: {
        following: counts?.following_count || 0,
        followers: counts?.followers_count || 0,
        punchlines: stats.punchlines,
        scoreMdr: stats.scoreMdr,
        superNotesReceived: stats.superNotesReceived,
        bestPunchline: stats.bestPunchline
      }
    };
  }

  async function getMyPublishedPunchlineStats(userId) {
    const { data, error } = await supabase
      .from("public_punchlines")
      .select("id,content,score,supernote_count,created_at")
      .eq("author_id", userId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.warn("MDRank: get published punchline stats", error);
      return { ok: false, message: "Impossible de charger les statistiques du profil.", stats: null };
    }

    const rows = Array.isArray(data) ? data : [];
    const scoreMdr = rows.reduce((total, row) => total + Number(row.score || 0), 0);
    const superNotesReceived = rows.reduce((total, row) => total + Number(row.supernote_count || 0), 0);
    const best = rows[0] || null;

    return {
      ok: true,
      stats: {
        punchlines: rows.length,
        scoreMdr,
        superNotesReceived,
        bestPunchline: best ? {
          id: best.id,
          content: best.content || "",
          score: Number(best.score || 0)
        } : null
      }
    };
  }

  async function getBadgeProgressCounts() {
    if (!supabase) {
      return { ok: false, message: "Impossible de charger la progression des badges.", counts: null };
    }

    const { data, error } = await supabase.rpc("get_my_badge_progress_counts");

    if (error) {
      console.warn("MDRank: get_my_badge_progress_counts", error);
      return {
        ok: false,
        message: `Impossible de charger la progression des badges. ${error.message || ""}`.trim(),
        counts: null,
        error
      };
    }

    const counts = Array.isArray(data) ? data[0] : data;
    return {
      ok: true,
      counts: {
        published: Number(counts?.published_count || 0),
        killerReceived: Number(counts?.killer_received_count || 0),
        supernoteReceived: Number(counts?.supernote_received_count || 0),
        challengePunchlines: Number(counts?.challenge_punchline_count || 0)
      }
    };
  }

  async function getProfileBadges(limit = 12) {
    if (!supabase) {
      return { ok: false, message: "Impossible de charger les badges pour le moment.", badges: [] };
    }

    try {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) {
        return { ok: false, message: "Impossible de charger les badges pour le moment.", badges: [] };
      }

      const userId = sessionResult.data?.session?.user?.id || null;

      if (!userId) {
        return { ok: true, badges: [] };
      }

      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          id,
          badge_id,
          earned_at,
          badges!inner (
            slug,
            name,
            description,
            category,
            level,
            rarity,
            icon,
            is_active
          )
        `)
        .eq("user_id", userId)
        .eq("badges.is_active", true)
        .order("earned_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn("MDRank: get profile badges", error);
        return { ok: false, message: "Impossible de charger les badges pour le moment.", badges: [] };
      }

      const badges = (data || []).map((row) => {
        const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges;
        return {
          id: row.id,
          badge_id: row.badge_id,
          earned_at: row.earned_at,
          slug: badge?.slug || "",
          name: badge?.name || "",
          description: badge?.description || "",
          category: badge?.category || "",
          level: badge?.level || 1,
          rarity: badge?.rarity || "common",
          icon: badge?.icon || "badge"
        };
      });

      return { ok: true, badges };
    } catch (error) {
      console.warn("MDRank: get profile badges", error);
      return { ok: false, message: "Impossible de charger les badges pour le moment.", badges: [] };
    }
  }

  async function getActiveBadges(limit = 12) {
    if (!supabase) {
      return { ok: false, message: "Impossible de charger les badges à débloquer.", badges: [] };
    }

    try {
      const { data, error } = await supabase
        .from("badges")
        .select("id, slug, name, description, category, level, rarity, icon, is_active")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("level", { ascending: true })
        .limit(limit);

      if (error) {
        console.warn("MDRank: get active badges", error);
        return { ok: false, message: "Impossible de charger les badges à débloquer.", badges: [] };
      }

      return {
        ok: true,
        badges: (data || []).map((badge) => ({
          id: badge.id,
          slug: badge.slug || "",
          name: badge.name || "",
          description: badge.description || "",
          category: badge.category || "",
          level: badge.level || 1,
          rarity: badge.rarity || "common",
          icon: badge.icon || "badge",
          is_active: Boolean(badge.is_active)
        }))
      };
    } catch (error) {
      console.warn("MDRank: get active badges", error);
      return { ok: false, message: "Impossible de charger les badges à débloquer.", badges: [] };
    }
  }

  async function reportPunchline({ punchlineId, reason, details }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("report_punchline", {
      punchline_id: punchlineId,
      reason,
      details: details || null
    });

    if (error) {
      console.warn("MDRank: report_punchline", error);
      return { ok: false, message: cleanReportError(error.message) };
    }

    return { ok: true, report: data };
  }

  async function getPendingReports() {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", reports: [] };
    }

    const { data, error } = await supabase.rpc("get_pending_reports");

    if (error) {
      console.warn("MDRank: get_pending_reports", error);
      return { ok: false, message: cleanModerationError(error.message), reports: [] };
    }

    return { ok: true, reports: data || [] };
  }

  async function getModeratedPunchlines() {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré.", reports: [] };
    }

    const { data, error } = await supabase.rpc("get_moderated_punchlines");

    if (error) {
      console.warn("MDRank: get_moderated_punchlines", error);
      return { ok: false, message: cleanModerationError(error.message), reports: [] };
    }

    return { ok: true, reports: data || [] };
  }

  async function moderatePunchline({ punchlineId, action, reason }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("moderate_punchline", {
      punchline_id: punchlineId,
      action,
      reason: reason || null
    });

    if (error) {
      console.warn("MDRank: moderate_punchline", error);
      return { ok: false, message: cleanModerationError(error.message) };
    }

    return { ok: true, punchline: data };
  }

  async function moderateUser({ targetUserId, action, reason }) {
    if (!supabase) {
      return { ok: false, message: "Supabase n'est pas encore configuré." };
    }

    const { data, error } = await supabase.rpc("moderate_user", {
      target_user_id: targetUserId,
      action,
      reason: reason || null
    });

    if (error) {
      console.warn("MDRank: moderate_user", error);
      return { ok: false, message: cleanModerationError(error.message) };
    }

    return { ok: true, profile: data };
  }

  window.MDRankApi = {
    loadActiveCategories,
    createPunchline,
    getDailyChallenge,
    getRecentPunchlines,
    getFollowingPunchlines,
    getLeaderboard,
    getLeaderboardUsers,
    castReaction,
    giveSuperNote,
    followUser,
    unfollowUser,
    getProfileCounts,
    getBadgeProgressCounts,
    getProfileBadges,
    getActiveBadges,
    reportPunchline,
    getPendingReports,
    getModeratedPunchlines,
    moderatePunchline,
    moderateUser,
    cleanReactionError,
    cleanSuperNoteError,
    cleanFollowError,
    cleanReportError,
    cleanModerationError,
    cleanPublishError
  };
})();
