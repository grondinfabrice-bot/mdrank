(function () {
  const auth = window.MDRankAuth || null;
  const api = window.MDRankApi || null;
  const routeFromHash = () => {
    const route = window.location.hash.replace("#", "");
    return route && routes[route] ? route : "home";
  };

  const state = {
    route: "home",
    feedTab: "recent",
    feedItems: [],
    followingItems: [],
    topItems: [],
    feedLoading: false,
    followingLoading: false,
    topLoading: false,
    feedLoaded: false,
    followingLoaded: false,
    topLoaded: false,
    feedError: "",
    followingError: "",
    topError: "",
    feedActionError: "",
    reactionSubmittingKey: "",
    superNoteSubmittingKey: "",
    followSubmittingKey: "",
    profileCounts: null,
    profileCountsLoading: false,
    profileCountsLoaded: false,
    profileCountsError: "",
    profileBadges: [],
    profileBadgesLoading: false,
    profileBadgesLoaded: false,
    profileBadgesError: "",
    activeBadges: [],
    activeBadgesLoading: false,
    activeBadgesLoaded: false,
    activeBadgesError: "",
    badgeProgressCounts: null,
    badgeProgressLoading: false,
    badgeProgressLoaded: false,
    badgeProgressError: "",
    badgeUnlockToast: null,
    rankingTab: "day",
    leaderboardItems: {
      day: [],
      week: [],
      month: []
    },
    leaderboardLoading: false,
    leaderboardLoaded: {
      day: false,
      week: false,
      month: false
    },
    leaderboardError: "",
    userLeaderboardItems: [],
    userLeaderboardLoading: false,
    userLeaderboardLoaded: false,
    userLeaderboardError: "",
    reportPunchline: null,
    reportSent: false,
    reportReason: "personal_attack",
    reportDetails: "",
    reportSubmitting: false,
    reportError: "",
    adminTab: "pending",
    adminReports: [],
    adminModerated: [],
    adminLoading: false,
    adminLoaded: false,
    adminError: "",
    adminMessage: "",
    adminActionKey: "",
    publishText: "",
    publishCategoryId: "",
    publishChallengeId: "",
    publishCategories: [],
    publishCategoriesLoading: false,
    publishCategoriesLoaded: false,
    publishSubmitting: false,
    publishError: "",
    publishSuccess: "",
    published: false,
    authSubmitting: false,
    authMessage: "",
    authError: "",
    challenge: null,
    challengeTop: [],
    challengeLoading: false,
    challengeLoaded: false,
    challengeError: ""
  };

  const app = document.querySelector("#app");
  let badgeUnlockToastTimer = null;
  const badgeUnlockToastSeen = new Map();

  const routes = {
    home: renderHome,
    feed: renderFeed,
    publish: renderPublish,
    challenges: renderChallenges,
    rankings: renderRankings,
    profile: renderProfile,
    account: renderAccount,
    badges: renderBadgesCollection,
    login: renderLogin,
    signup: renderSignup,
    profileSetup: renderProfileSetup,
    admin: renderAdmin
  };

  const avatarVariants = [
    { bg: "#6654f1", fg: "#fffdf9", accent: "#ff7a59" },
    { bg: "#ff7a59", fg: "#15131d", accent: "#ffc83d" },
    { bg: "#ffc83d", fg: "#4c3bd2", accent: "#fffdf9" },
    { bg: "#4c3bd2", fg: "#fffdf9", accent: "#ff5f8f" },
    { bg: "#ff5f8f", fg: "#fffdf9", accent: "#15131d" },
    { bg: "#e8ddff", fg: "#4c3bd2", accent: "#ff7a59" },
    { bg: "#15131d", fg: "#ffc83d", accent: "#ff5f8f" },
    { bg: "#79bce8", fg: "#15131d", accent: "#fffdf9" }
  ];

  function hashAvatarSeed(seed) {
    const value = String(seed || "mdrank-avatar-fallback");
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function avatarSymbol(symbolIndex, fg, accent) {
    const symbols = [
      `<path d="M47 13 24 41h17l-5 30 24-35H43l4-23Z" fill="${fg}"/>`,
      `<path d="m42 12 7 19 20 2-15 13 5 20-17-11-17 11 5-20-15-13 20-2 7-19Z" fill="${fg}"/>`,
      `<path d="M42 12c3 16 11 24 27 27-16 3-24 11-27 27-3-16-11-24-27-27 16-3 24-11 27-27Z" fill="${fg}"/><circle cx="62" cy="19" r="5" fill="${accent}"/>`,
      `<path d="m42 13 29 29-29 29-29-29 29-29Z" fill="${fg}"/><path d="m42 28 14 14-14 14-14-14 14-14Z" fill="${accent}"/>`,
      `<circle cx="42" cy="42" r="17" fill="${fg}"/><path d="M42 10v14M42 60v14M10 42h14M60 42h14M19 19l10 10M55 55l10 10M65 19 55 29M29 55 19 65" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`,
      `<path d="M30 15h24v15h15v24H54v15H30V54H15V30h15V15Z" fill="${fg}"/>`,
      `<path d="M20 31c8-17 36-17 44 0 5 11-2 27-22 39-20-12-27-28-22-39Z" fill="${fg}"/><circle cx="31" cy="38" r="4" fill="${accent}"/><circle cx="53" cy="38" r="4" fill="${accent}"/>`,
      `<path d="M16 50c10-23 42-29 53-7-8-3-15-2-22 3-10 7-20 8-31 4Z" fill="${fg}"/><path d="M25 29c12-13 31-13 43 1-15-4-29-4-43-1Z" fill="${accent}"/>`
    ];

    return symbols[symbolIndex % symbols.length];
  }

  function MdrankAvatar(seed, size = "medium", label = "") {
    const hash = hashAvatarSeed(seed);
    const variant = avatarVariants[hash % avatarVariants.length];
    const symbolIndex = Math.floor(hash / avatarVariants.length) % 8;
    const rotate = [-10, -5, 0, 6, 10][Math.floor(hash / 17) % 5];
    const dotX = 20 + (hash % 44);
    const dotY = 18 + (Math.floor(hash / 97) % 48);
    const safeLabel = label ? ` role="img" aria-label="${escapeHtml(label)}"` : ` aria-hidden="true"`;

    return `
      <span class="mdrank-avatar mdrank-avatar-${size}"${safeLabel}>
        <svg viewBox="0 0 84 84" focusable="false">
          <circle cx="42" cy="42" r="42" fill="${variant.bg}"/>
          <path d="M13 24c18-18 44-20 59-4" fill="none" stroke="#fffdf9" stroke-opacity=".28" stroke-width="10" stroke-linecap="round"/>
          <g transform="rotate(${rotate} 42 42)">
            ${avatarSymbol(symbolIndex, variant.fg, variant.accent)}
          </g>
          <circle cx="${dotX}" cy="${dotY}" r="5" fill="${variant.accent}"/>
          <circle cx="42" cy="42" r="39" fill="none" stroke="#fffdf9" stroke-opacity=".5" stroke-width="3"/>
        </svg>
      </span>
    `;
  }

  state.route = routeFromHash();

  function setRoute(route, options = {}) {
    route = resolveRoute(route);
    state.route = route;
    state.reportPunchline = null;
    state.reportSent = false;
    state.reportReason = "personal_attack";
    state.reportDetails = "";
    state.reportError = "";
    state.badgeUnlockToast = null;
    if (badgeUnlockToastTimer) {
      clearTimeout(badgeUnlockToastTimer);
      badgeUnlockToastTimer = null;
    }
    if (!options.keepAuthMessage) state.authMessage = "";
    if (!options.keepAuthError) state.authError = "";
    state.feedActionError = "";
    state.authSubmitting = false;
    window.location.hash = route === "home" ? "" : route;
    render();
  }

  function getAuthState() {
    return auth?.getState ? auth.getState() : {
      user: null,
      profile: null,
      loading: false,
      isAuthenticated: false,
      isConfigured: false
    };
  }

  function resolveRoute(route) {
    const authState = getAuthState();
    const protectedRoutes = ["publish", "profile", "account", "profileSetup", "badges"];

    if (protectedRoutes.includes(route) && authState.loading) {
      return route;
    }

    if (protectedRoutes.includes(route) && !authState.isAuthenticated) {
      return "login";
    }

    if (protectedRoutes.includes(route) && authState.isAuthenticated && !authState.profile && !authState.loading) {
      return "profileSetup";
    }

    return route;
  }

  async function loadPublishCategories() {
    if (!api || state.publishCategoriesLoading || state.publishCategoriesLoaded) return;

    state.publishCategoriesLoading = true;
    state.publishError = "";

    let result;
    try {
      result = await api.loadActiveCategories();
    } catch (error) {
      console.warn("MDRank: load categories", error);
      result = { ok: false, message: "Impossible de charger les catégories.", categories: [] };
    }

    state.publishCategoriesLoading = false;
    state.publishCategoriesLoaded = true;

    if (!result.ok) {
      state.publishError = result.message;
      state.publishCategories = [];
      render();
      return;
    }

    state.publishCategories = result.categories;
    syncPublishCategory();
    render();
  }

  async function loadDailyChallenge(force = false) {
    if (!api || state.challengeLoading || (state.challengeLoaded && !force)) return;

    state.challengeLoading = true;
    state.challengeError = "";

    let result;
    try {
      result = await api.getDailyChallenge();
    } catch (error) {
      console.warn("MDRank: load daily challenge", error);
      result = { ok: false, message: "Impossible de charger le défi du jour.", challenge: null, top: [] };
    }

    state.challengeLoading = false;
    state.challengeLoaded = true;

    if (!result.ok) {
      state.challenge = null;
      state.challengeTop = [];
      state.challengeError = result.message;
      render();
      return;
    }

    state.challenge = result.challenge;
    state.challengeTop = result.top;
    render();
  }

  async function loadFeed(force = false) {
    if (!api || state.feedLoading || (state.feedLoaded && !force)) return;

    state.feedLoading = true;
    state.feedError = "";

    let result;
    try {
      result = await api.getRecentPunchlines(20);
    } catch (error) {
      console.warn("MDRank: load feed", error);
      result = { ok: false, message: "Impossible de charger le feed pour le moment.", punchlines: [] };
    }

    state.feedLoading = false;
    state.feedLoaded = true;

    if (!result.ok) {
      state.feedItems = [];
      state.feedError = result.message;
      render();
      return;
    }

    state.feedItems = result.punchlines;
    render();
  }

  async function loadFollowingFeed(force = false) {
    if (!api || state.followingLoading || (state.followingLoaded && !force)) return;

    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.profile) return;

    state.followingLoading = true;
    state.followingError = "";

    let result;
    try {
      result = await api.getFollowingPunchlines(20);
    } catch (error) {
      console.warn("MDRank: load following feed", error);
      result = { ok: false, message: "Impossible de charger le feed suivis pour le moment.", punchlines: [] };
    }

    state.followingLoading = false;
    state.followingLoaded = true;

    if (!result.ok) {
      state.followingItems = [];
      state.followingError = result.message;
      render();
      return;
    }

    state.followingItems = result.punchlines;
    render();
  }

  async function loadFeedTopDay(force = false) {
    if (!api || state.topLoading || (state.topLoaded && !force)) return;

    state.topLoading = true;
    state.topError = "";

    let result;
    try {
      result = await api.getLeaderboard("day", 20);
    } catch (error) {
      console.warn("MDRank: load top feed", error);
      result = { ok: false, message: "Impossible de charger le classement pour le moment.", punchlines: [] };
    }

    state.topLoading = false;
    state.topLoaded = true;

    if (!result.ok) {
      state.topItems = [];
      state.topError = result.message;
      render();
      return;
    }

    state.topItems = result.punchlines;
    render();
  }

  async function loadProfileCounts(force = false) {
    if (!api || state.profileCountsLoading || (state.profileCountsLoaded && !force)) return;

    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.profile) return;

    state.profileCountsLoading = true;
    state.profileCountsError = "";

    let result;
    try {
      result = await api.getProfileCounts();
    } catch (error) {
      console.warn("MDRank: load profile counts", error);
      result = { ok: false, message: "Impossible de charger les stats du profil.", counts: null };
    }

    state.profileCountsLoading = false;
    state.profileCountsLoaded = true;
    state.profileCounts = result.ok ? result.counts : null;
    state.profileCountsError = result.ok ? "" : result.message || "Impossible de charger les stats du profil.";
    render();
  }

  async function loadProfileBadges(force = false) {
    if (state.profileBadgesLoading || (state.profileBadgesLoaded && !force)) return;

    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.profile) {
      state.profileBadges = [];
      state.profileBadgesLoaded = true;
      state.profileBadgesError = "";
      return;
    }

    if (!api?.getProfileBadges) {
      state.profileBadges = [];
      state.profileBadgesLoaded = true;
      state.profileBadgesError = "Impossible de charger les badges pour le moment.";
      render();
      return;
    }

    state.profileBadgesLoading = true;
    state.profileBadgesError = "";

    try {
      const result = await Promise.race([
        api.getProfileBadges(12),
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: false,
            message: "Impossible de charger les badges pour le moment.",
            badges: []
          }), 10000);
        })
      ]);

      state.profileBadges = result.ok && Array.isArray(result.badges) ? result.badges : [];
      state.profileBadgesError = result.ok ? "" : "Impossible de charger les badges pour le moment.";
    } catch (error) {
      console.warn("MDRank: load profile badges", error);
      state.profileBadges = [];
      state.profileBadgesError = "Impossible de charger les badges pour le moment.";
    } finally {
      state.profileBadgesLoading = false;
      state.profileBadgesLoaded = true;
      render();
    }
  }

  async function loadActiveBadges(force = false) {
    if (state.activeBadgesLoading || (state.activeBadgesLoaded && !force)) return;

    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.profile) {
      state.activeBadges = [];
      state.activeBadgesLoaded = true;
      state.activeBadgesError = "";
      return;
    }

    if (!api?.getActiveBadges) {
      state.activeBadges = [];
      state.activeBadgesLoaded = true;
      state.activeBadgesError = "Impossible de charger les badges à débloquer.";
      render();
      return;
    }

    state.activeBadgesLoading = true;
    state.activeBadgesError = "";

    try {
      const result = await Promise.race([
        api.getActiveBadges(),
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: false,
            message: "Impossible de charger les badges à débloquer.",
            badges: []
          }), 10000);
        })
      ]);

      state.activeBadges = result.ok && Array.isArray(result.badges) ? result.badges : [];
      state.activeBadgesError = result.ok ? "" : "Impossible de charger les badges à débloquer.";
    } catch (error) {
      console.warn("MDRank: load active badges", error);
      state.activeBadges = [];
      state.activeBadgesError = "Impossible de charger les badges à débloquer.";
    } finally {
      state.activeBadgesLoading = false;
      state.activeBadgesLoaded = true;
      render();
    }
  }

  async function loadBadgeProgressCounts(force = false) {
    if (state.badgeProgressLoading || (state.badgeProgressLoaded && !force)) return;

    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.profile) {
      state.badgeProgressCounts = null;
      state.badgeProgressLoaded = true;
      state.badgeProgressError = "";
      return;
    }

    if (!api?.getBadgeProgressCounts) {
      state.badgeProgressCounts = null;
      state.badgeProgressLoaded = true;
      state.badgeProgressError = "Impossible de charger la progression des badges.";
      render();
      return;
    }

    state.badgeProgressLoading = true;
    state.badgeProgressError = "";

    try {
      const result = await Promise.race([
        api.getBadgeProgressCounts(),
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: false,
            message: "Impossible de charger la progression des badges.",
            counts: null
          }), 10000);
        })
      ]);

      state.badgeProgressCounts = result.ok ? result.counts : null;
      state.badgeProgressError = result.ok ? "" : result.message || "Impossible de charger la progression des badges.";
      if (!result.ok) console.warn("MDRank: badge progress unavailable", result);
    } catch (error) {
      console.warn("MDRank: load badge progress", error);
      state.badgeProgressCounts = null;
      state.badgeProgressError = "Impossible de charger la progression des badges.";
    } finally {
      state.badgeProgressLoading = false;
      state.badgeProgressLoaded = true;
      render();
    }
  }

  async function loadLeaderboard(force = false) {
    if (!api || state.leaderboardLoading || (state.leaderboardLoaded[state.rankingTab] && !force)) return;

    state.leaderboardLoading = true;
    state.leaderboardError = "";

    let result;
    try {
      result = await api.getLeaderboard(state.rankingTab, 50);
    } catch (error) {
      console.warn("MDRank: load leaderboard", error);
      result = { ok: false, message: "Impossible de charger le classement pour le moment.", punchlines: [] };
    }

    state.leaderboardLoading = false;
    state.leaderboardLoaded[state.rankingTab] = true;

    if (!result.ok) {
      state.leaderboardItems[state.rankingTab] = [];
      state.leaderboardError = result.message;
      render();
      return;
    }

    state.leaderboardItems[state.rankingTab] = result.punchlines;
    render();
  }

  async function loadUserLeaderboard(force = false) {
    if (!api?.getLeaderboardUsers || state.userLeaderboardLoading || (state.userLeaderboardLoaded && !force)) return;

    state.userLeaderboardLoading = true;
    state.userLeaderboardError = "";

    let result;
    try {
      result = await api.getLeaderboardUsers(20);
    } catch (error) {
      console.warn("MDRank: load user leaderboard", error);
      result = { ok: false, message: "Impossible de charger le Top blagueurs pour le moment.", users: [] };
    }

    state.userLeaderboardLoading = false;
    state.userLeaderboardLoaded = true;

    if (!result.ok) {
      state.userLeaderboardItems = [];
      state.userLeaderboardError = result.message;
      render();
      return;
    }

    state.userLeaderboardItems = result.users;
    render();
  }

  async function loadAdminReports(force = false) {
    if (!api || state.adminLoading || (state.adminLoaded && !force)) return;

    const authState = getAuthState();
    if (!isStaffProfile(authState.profile)) return;

    state.adminLoading = true;
    state.adminError = "";

    let pendingResult;
    let moderatedResult;
    try {
      [pendingResult, moderatedResult] = await Promise.all([
        api.getPendingReports(),
        api.getModeratedPunchlines()
      ]);
    } catch (error) {
      console.warn("MDRank: load admin reports", error);
      pendingResult = { ok: false, message: "Impossible de charger la modération.", reports: [] };
      moderatedResult = { ok: false, message: "Impossible de charger la modération.", reports: [] };
    }

    state.adminLoading = false;
    state.adminLoaded = true;

    if (!pendingResult.ok || !moderatedResult.ok) {
      state.adminReports = [];
      state.adminModerated = [];
      state.adminError = pendingResult.message || moderatedResult.message;
      render();
      return;
    }

    state.adminReports = pendingResult.reports;
    state.adminModerated = moderatedResult.reports;
    render();
  }

  function getActiveFeedItems() {
    if (state.feedTab === "following") return state.followingItems;
    if (state.feedTab === "top") return state.topItems;
    return state.feedItems;
  }

  function resetUserScopedData() {
    state.feedLoaded = false;
    state.followingLoaded = false;
    state.topLoaded = false;
    state.feedItems = [];
    state.followingItems = [];
    state.topItems = [];
    state.profileCountsLoaded = false;
    state.profileCounts = null;
    state.profileCountsError = "";
    state.profileBadgesLoaded = false;
    state.profileBadges = [];
    state.profileBadgesError = "";
    state.activeBadgesLoaded = false;
    state.activeBadges = [];
    state.activeBadgesError = "";
    state.badgeProgressLoaded = false;
    state.badgeProgressCounts = null;
    state.badgeProgressError = "";
    state.feedActionError = "";
    state.adminLoaded = false;
    state.adminReports = [];
    state.adminModerated = [];
    state.adminMessage = "";
    state.adminError = "";
    state.challengeLoaded = false;
    state.challenge = null;
    state.challengeTop = [];
  }

  function resetLeaderboards() {
    state.leaderboardLoaded = {
      day: false,
      week: false,
      month: false
    };
    state.leaderboardError = "";
    state.topLoaded = false;
    state.topError = "";
    state.userLeaderboardLoaded = false;
    state.userLeaderboardItems = [];
    state.userLeaderboardError = "";
  }

  function isStaffProfile(profile) {
    return profile?.role === "moderator" || profile?.role === "admin";
  }

  function isAdminProfile(profile) {
    return profile?.role === "admin";
  }

  function badgeIcon(icon, badge = {}) {
    const slug = badge.slug || "";
    const name = badge.name || "";
    const category = badge.category || "";

    if (slug.includes("premier-mdr") || name.includes("Premier MDR")) return "🔥";
    if (slug.includes("machine-a-vannes")) return "⚡";
    if (slug.includes("supernote") || category === "supernote") return "◆";
    if (slug.includes("killer") || category === "reaction") return "◎";
    if (slug.includes("defi") || category === "challenge") return "✦";
    if (slug.includes("top-semaine")) return "♛";
    if (slug.includes("blagueur-du-jour")) return "☻";

    return {
      spark: "✦",
      type: "⚡",
      star: "◆",
      skull: "◎",
      target: "✦",
      trophy: "♛",
      sun: "☻",
      badge: "◆"
    }[icon] || "◆";
  }

  function badgeVariant(badge, options = {}) {
    if (options.locked) return "locked";
    const specialSlugs = ["top-semaine", "defi-du-jour", "blagueur-du-jour"];
    if (specialSlugs.includes(badge.slug) || ["challenge", "ranking"].includes(badge.category)) return "special";
    return "default";
  }

  function badgeLevelLabel(level) {
    return {
      1: "I",
      2: "II",
      3: "III"
    }[Number(level)] || "";
  }

  function badgeCategoryLabel(category) {
    return {
      starter: "Début",
      score: "Score",
      posting: "Vannes",
      reaction: "Réaction",
      supernote: "SuperNote",
      challenge: "Défi",
      ranking: "Top",
      seasonal: "Saison"
    }[category] || "Badge";
  }

  function badgeDisplayName(badge) {
    const level = badgeLevelLabel(badge.level);
    const name = badge.name || badge.slug || "Badge";
    if (!level) return name;
    return name.replace(new RegExp(`\\s+${level}$`, "i"), "");
  }

  function getBadgeUnlockHint(badge) {
    return getBadgeRequirement(badge)?.hint || "Continue à faire vivre MDRank pour le débloquer.";
  }

  function getBadgeRequirement(badge) {
    return {
      "premier-mdr": {
        metric: "published",
        target: 1,
        unit: "punchline",
        hint: "Publie ta première punchline."
      },
      "machine-a-vannes-1": {
        metric: "published",
        target: 5,
        unit: "punchlines",
        hint: "Publie 5 punchlines."
      },
      "machine-a-vannes-2": {
        metric: "published",
        target: 25,
        unit: "punchlines",
        hint: "Publie 25 punchlines."
      },
      "machine-a-vannes-3": {
        metric: "published",
        target: 100,
        unit: "punchlines",
        hint: "Publie 100 punchlines."
      },
      "supernote-1": {
        metric: "supernoteReceived",
        target: 1,
        unit: "SuperNote",
        hint: "Reçois une SuperNote."
      },
      "killer-1": {
        metric: "killerReceived",
        target: 1,
        unit: "réaction Killer",
        hint: "Reçois une réaction Killer."
      },
      "killer-2": {
        metric: "killerReceived",
        target: 10,
        unit: "réactions Killer",
        hint: "Reçois 10 réactions Killer."
      },
      "killer-3": {
        metric: "killerReceived",
        target: 50,
        unit: "réactions Killer",
        hint: "Reçois 50 réactions Killer."
      },
      "defi-du-jour": {
        metric: "challengePunchlines",
        target: 1,
        unit: "participation",
        hint: "Participe au Défi du jour."
      }
    }[badge?.slug] || null;
  }

  function getBadgeProgress(badge) {
    const requirement = getBadgeRequirement(badge);
    if (!requirement || !state.badgeProgressCounts) return null;

    const rawCurrent = Number(state.badgeProgressCounts[requirement.metric] ?? 0);
    const current = Math.max(0, Math.min(rawCurrent, requirement.target));
    const percent = requirement.target > 0 ? Math.round((current / requirement.target) * 100) : 0;

    return {
      current,
      target: requirement.target,
      unit: requirement.unit,
      percent: Math.max(0, Math.min(percent, 100))
    };
  }

  function getCurrentUserUnlockedBadges(result) {
    const authState = getAuthState();
    const userId = authState.user?.id;
    if (!userId || !Array.isArray(result?.unlockedBadges)) return [];

    return result.unlockedBadges.filter((badge) => badge.awardedUserId === userId);
  }

  function showBadgeUnlockToast(badges) {
    const now = Date.now();
    const visibleBadges = Array.isArray(badges)
      ? badges.filter((badge) => {
        if (!badge?.slug || !badge?.name) return false;

        const key = `${badge.awardedUserId || "me"}:${badge.slug}:${badge.earnedAt || ""}`;
        const lastSeen = badgeUnlockToastSeen.get(key) || 0;
        if (now - lastSeen < 12000) return false;

        badgeUnlockToastSeen.set(key, now);
        return true;
      })
      : [];

    badgeUnlockToastSeen.forEach((seenAt, key) => {
      if (now - seenAt > 60000) badgeUnlockToastSeen.delete(key);
    });

    if (!visibleBadges.length) return;

    if (badgeUnlockToastTimer) clearTimeout(badgeUnlockToastTimer);

    const id = `${Date.now()}-${visibleBadges.map((badge) => badge.slug).join("-")}`;
    state.badgeUnlockToast = { id, badges: visibleBadges.slice(0, 4) };
    render();

    badgeUnlockToastTimer = setTimeout(() => {
      if (state.badgeUnlockToast?.id === id) {
        state.badgeUnlockToast = null;
        render();
      }
    }, 5200);
  }

  function handleUnlockedBadges(result) {
    let badges = [];
    try {
      badges = getCurrentUserUnlockedBadges(result);
    } catch (error) {
      console.warn("MDRank: badge feedback skipped", error);
      return;
    }

    if (!badges.length) return;

    state.profileBadgesLoaded = false;
    state.badgeProgressLoaded = false;
    showBadgeUnlockToast(badges);
  }

  function BadgeUnlockedToast() {
    const toast = state.badgeUnlockToast;
    const badges = toast?.badges || [];
    if (!badges.length) return "";

    const firstBadge = badges[0];
    const title = badges.length > 1 ? `${badges.length} badges débloqués !` : "Badge débloqué !";
    const names = badges.map((badge) => badgeDisplayName(badge)).join(", ");
    const remainingCount = badges.length - 1;
    const summary = badges.length > 1
      ? `${badgeDisplayName(firstBadge)} +${remainingCount} autre${remainingCount > 1 ? "s" : ""}`
      : badgeDisplayName(firstBadge);
    const description = badges.length === 1 && firstBadge.description ? firstBadge.description : names;

    return `
      <div class="badge-unlock-toast" role="status" aria-live="polite">
        <div class="badge-unlock-icon" aria-hidden="true">
          <span>${escapeHtml(badgeIcon(firstBadge.icon, firstBadge))}</span>
        </div>
        <div class="badge-unlock-copy">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(summary)}</span>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        <button type="button" data-dismiss-badge-toast aria-label="Fermer">×</button>
      </div>
    `;
  }

  function formatBadgeDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short"
    });
  }

  function BadgePill(badge, options = {}) {
    const rarity = ["common", "rare", "epic", "legendary"].includes(badge.rarity) ? badge.rarity : "common";
    const category = badge.category || "starter";
    const slug = badge.slug || "badge";
    const level = badgeLevelLabel(badge.level);
    const variant = badgeVariant(badge, options);
    const lockedClass = options.locked ? " is-locked" : "";
    const specialClass = variant === "special" ? " badge-special" : "";
    const progress = options.showProgress ? getBadgeProgress(badge) : null;
    const hasProgress = progress !== null
      && Number.isFinite(progress.current)
      && Number.isFinite(progress.target)
      && progress.target > 0;
    const progressWidth = hasProgress ? Math.max(0, Math.min(progress.percent, 100)) : 0;

    return `
      <article class="badge-card badge-${escapeHtml(rarity)} badge-category-${escapeHtml(category)} badge-slug-${escapeHtml(slug)} badge-variant-${escapeHtml(variant)}${specialClass}${lockedClass}">
        <div class="badge-medallion" aria-hidden="true">
          <span>${escapeHtml(badgeIcon(badge.icon, badge))}</span>
        </div>
        <div class="badge-content">
          <div class="badge-title-row">
            <h3>${escapeHtml(badgeDisplayName(badge))}</h3>
            ${level ? `<span class="badge-level">${escapeHtml(level)}</span>` : ""}
          </div>
          ${options.locked ? `<p class="badge-unlock-hint">${escapeHtml(getBadgeUnlockHint(badge))}</p>` : ""}
          ${hasProgress ? `
            <div class="badge-progress" aria-label="${escapeHtml(`${progress.current} sur ${progress.target} ${progress.unit}`)}">
              <div class="badge-progress-row">
                <span>${escapeHtml(`${progress.current} / ${progress.target} ${progress.unit}`)}</span>
              </div>
              <div class="badge-progress-track" aria-hidden="true">
                <span style="width: ${progressWidth}%"></span>
              </div>
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }

  function sortBadgesForProfile(badges) {
    const priority = [
      "premier-mdr",
      "machine-a-vannes-1",
      "machine-a-vannes-2",
      "machine-a-vannes-3",
      "supernote-1",
      "killer-1",
      "killer-2",
      "killer-3",
      "defi-du-jour"
    ];

    return [...badges].sort((a, b) => {
      const aIndex = priority.indexOf(a.slug);
      const bIndex = priority.indexOf(b.slug);
      const safeA = aIndex === -1 ? priority.length : aIndex;
      const safeB = bIndex === -1 ? priority.length : bIndex;
      return safeA - safeB || Number(a.level || 0) - Number(b.level || 0) || String(a.name).localeCompare(String(b.name));
    });
  }

  function getLockedProfileBadges(limit = 6) {
    const earnedSlugs = new Set(state.profileBadges.map((badge) => badge.slug).filter(Boolean));
    return sortBadgesForProfile(state.activeBadges)
      .filter((badge) => badge.slug && !earnedSlugs.has(badge.slug))
      .slice(0, limit);
  }

  function getEarnedActiveBadges() {
    if (!state.activeBadges.length) return state.profileBadges;

    const earnedBySlug = new Map(state.profileBadges.map((badge) => [badge.slug, badge]));
    return sortBadgesForProfile(state.activeBadges)
      .map((badge) => earnedBySlug.get(badge.slug))
      .filter(Boolean);
  }

  function renderProfileBadges(limit = 4) {
    if (state.profileBadgesLoading && !state.profileBadgesLoaded) {
      return `
        <div class="badges-empty">
          <strong>Chargement des badges</strong>
          <p>On récupère tes derniers badges MDRank.</p>
        </div>
      `;
    }

    if (state.profileBadgesError) {
      return `
        <div class="badges-empty">
          <strong>Badges indisponibles</strong>
          <p>${escapeHtml(state.profileBadgesError)}</p>
        </div>
      `;
    }

    if (!state.profileBadges.length) {
      return `
        <div class="badges-empty">
          <strong>Aucun badge pour l'instant.</strong>
          <p>Poste ta première punchline pour commencer.</p>
        </div>
      `;
    }

    const badges = limit ? state.profileBadges.slice(0, limit) : getEarnedActiveBadges();

    return `
      <div class="badges-grid">
        ${badges.map((badge) => BadgePill(badge)).join("")}
      </div>
    `;
  }

  function renderLockedProfileBadges(limit = 2, options = {}) {
    if (state.activeBadgesLoading && !state.activeBadgesLoaded) {
      return `
        <div class="badges-empty badges-empty-compact">
          <strong>Objectifs en chargement</strong>
          <p>On prépare les prochains badges.</p>
        </div>
      `;
    }

    if (state.activeBadgesError || !state.activeBadges.length) {
      return "";
    }

    const lockedBadges = getLockedProfileBadges(limit);

    if (!lockedBadges.length) {
      return `
        <div class="badges-complete">
          <strong>Tous les badges V1 sont débloqués.</strong>
        </div>
      `;
    }

    return `
      <div class="profile-badge-subsection">
        ${options.heading === false ? "" : `
          <div class="mini-heading">
            <h3>À débloquer</h3>
            <p>${escapeHtml(options.description || "Quelques prochains objectifs, sans pression.")}</p>
          </div>
        `}
        <div class="badges-grid badges-grid-locked">
          ${lockedBadges.map((badge) => BadgePill(badge, { locked: true })).join("")}
        </div>
      </div>
    `;
  }

  function getSelectedPublishCategory() {
    return state.publishCategories.find((category) => category.id === state.publishCategoryId) || null;
  }

  function getNormalPublishCategories() {
    return state.publishCategories.filter((category) => category.slug !== "defi-du-jour");
  }

  function getChallengeCategory() {
    return state.publishCategories.find((category) => category.slug === "defi-du-jour") || null;
  }

  function getActivePublishChallenge() {
    if (!state.publishChallengeId || !state.challenge) return null;
    return String(state.challenge.id) === String(state.publishChallengeId) ? state.challenge : null;
  }

  function syncPublishCategory() {
    if (!state.publishCategories.length) return;

    if (state.publishChallengeId) {
      const challengeCategory = getChallengeCategory();
      state.publishCategoryId = challengeCategory?.id || "";
      return;
    }

    const normalCategories = getNormalPublishCategories();
    const selected = normalCategories.find((category) => category.id === state.publishCategoryId);
    if (!selected) {
      const defaultCategory = normalCategories.find((category) => category.slug === "punchline") || normalCategories[0] || null;
      state.publishCategoryId = defaultCategory?.id || "";
    }
  }

  function resetPublishChallengeContext() {
    state.publishChallengeId = "";
    syncPublishCategory();
  }

  function validatePublish(authState) {
    const content = state.publishText.trim();
    const activeChallenge = getActivePublishChallenge();

    if (!authState.isAuthenticated) return "Connecte-toi pour publier.";
    if (!authState.profile) return "Crée ton pseudo avant de publier.";
    if (!content) return "Ta punchline est trop courte.";
    if (content.length < 3) return "Ta punchline est trop courte.";
    if (content.length > 180) return "180 caractères max. Ici on frappe vite.";
    if (state.publishChallengeId && !activeChallenge) return "Défi indisponible pour le moment.";
    if (state.publishChallengeId && !getChallengeCategory()) return "Défi indisponible pour le moment.";
    if (!state.publishCategoryId) return "Choisis une catégorie.";
    return "";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function AppShell(content, options = {}) {
    const isHome = state.route === "home";
    return `
      <main class="phone-shell ${isHome ? "home-shell" : ""}">
        ${!isHome ? Header(options.title || "MDRank", options.action) : ""}
        <section class="screen ${isHome ? "screen-home" : ""}">${content}</section>
        ${!isHome ? BottomNavigation() : ""}
        ${state.reportPunchline ? ReportModal(state.reportPunchline) : ""}
        ${BadgeUnlockedToast()}
      </main>
    `;
  }

  function Header(title, action) {
    return `
      <header class="topbar">
        <button class="brand-button" data-route="feed" aria-label="Retour au feed">MDRank</button>
        <h1>${title}</h1>
        ${action || `<span class="topbar-spacer" aria-hidden="true"></span>`}
      </header>
    `;
  }

  function BottomNavigation() {
    const items = [
      { route: "feed", label: "Feed", icon: "⌂" },
      { route: "challenges", label: "Défis", icon: "◇" },
      { route: "publish", label: "Publier", icon: "+", primary: true },
      { route: "rankings", label: "Top", icon: "≡" },
      { route: "profile", label: "Moi", icon: "●" }
    ];

    return `
      <nav class="bottom-nav" aria-label="Navigation principale">
        ${items
          .map(
            (item) => {
              const active = state.route === item.route || (["account", "badges"].includes(state.route) && item.route === "profile");
              return `
              <button class="nav-item ${active ? "active" : ""} ${item.primary ? "primary-nav" : ""}" data-route="${item.route}">
                <span>${item.icon}</span>
                <small>${item.label}</small>
              </button>
            `;
            }
          )
          .join("")}
      </nav>
    `;
  }

  function CategoryBadge(category) {
    return `<span class="category-badge">${escapeHtml(category)}</span>`;
  }

  function ScoreBadge(score, position) {
    return `
      <div class="score-line">
        <span class="score-badge"><span class="score-spark">✦</span> Score ${score}</span>
        ${position ? `<span class="rank-chip">${escapeHtml(position)}</span>` : ""}
      </div>
    `;
  }

  function SuperNoteButton(punchline, disabled = false) {
    const isSelected = punchline.hasSuperNoted;
    const isUsedToday = punchline.superNoteUsedToday && !punchline.hasSuperNoted;
    const label = isSelected
      ? "SuperNote utilisée"
      : isUsedToday
        ? "SuperNote utilisée aujourd'hui"
        : "SuperNote +6";
    const disabledAttribute = disabled || isSelected || isUsedToday ? "disabled" : "";

    return `
      <button class="reaction-button super-note ${isSelected ? "is-selected" : ""} ${isUsedToday ? "is-muted" : ""}" type="button" aria-label="${label}" data-supernote ${disabledAttribute}>
        ⭐ <strong>${punchline.superNotes}</strong><span>${label}</span>
      </button>
    `;
  }

  function ReactionBar(punchline, disabled = false) {
    const reactions = punchline.reactions;
    const selectedReaction = punchline.selectedReaction || "";
    const reactionClass = (name) => `reaction-button ${selectedReaction === name ? "is-selected" : ""}`;
    const disabledAttribute = disabled ? "disabled" : "";

    return `
      <div class="reaction-bar" aria-label="Reactions">
        <button class="${reactionClass("laugh")}" type="button" aria-label="Drôle +1" data-reaction="funny" ${disabledAttribute}>😂 <strong>${reactions.laugh}</strong></button>
        <button class="${reactionClass("mind")}" type="button" aria-label="Déjanté +2" data-reaction="crazy" ${disabledAttribute}>🤯 <strong>${reactions.mind}</strong></button>
        <button class="${reactionClass("fire")}" type="button" aria-label="Lourd +3" data-reaction="heavy" ${disabledAttribute}>🔥 <strong>${reactions.fire}</strong></button>
        <button class="${reactionClass("skull")}" type="button" aria-label="Assassin +4" data-reaction="killer" ${disabledAttribute}>💀 <strong>${reactions.skull}</strong></button>
        ${SuperNoteButton(punchline, disabled)}
      </div>
    `;
  }

  function PunchlineCard(punchline, compact = false) {
    const authState = getAuthState();
    const isOwn = Boolean(punchline.authorId && punchline.authorId === authState.user?.id);
    const submitting = compact || state.reactionSubmittingKey === String(punchline.id) || state.superNoteSubmittingKey === String(punchline.id);
    const followSubmitting = state.followSubmittingKey === String(punchline.authorId);
    const followAction = compact
      ? ""
      : isOwn
        ? `<span class="own-punchline-chip">Ta punchline</span>`
        : `<button class="follow-button ${punchline.followed ? "is-following" : ""}" type="button" data-follow-author="${punchline.authorId}" ${followSubmitting ? "disabled" : ""}>
            ${followSubmitting ? "..." : punchline.followed ? "Suivi" : "+ Suivre"}
          </button>`;

    return `
      <article class="punch-card" data-punchline-card="${punchline.id}">
        <div class="card-meta">
          <div class="author-line">
            ${MdrankAvatar(punchline.authorId, "small")}
            <strong>${escapeHtml(punchline.pseudo)}</strong>
            ${CategoryBadge(punchline.category)}
          </div>
          ${followAction}
        </div>
        <p class="punch-text">“${escapeHtml(punchline.text)}”</p>
        ${ReactionBar(punchline, submitting)}
        ${ScoreBadge(punchline.score, punchline.position)}
        ${
          !compact
            ? `
          <div class="card-actions">
            <button class="ice-button" type="button" aria-label="Pas ouf -1" data-reaction="not_funny" ${submitting ? "disabled" : ""}>Pas ouf ? 🧊</button>
            <button class="report-button" type="button" data-report="${punchline.id}">Signaler</button>
          </div>
        `
            : ""
        }
      </article>
    `;
  }

  function FeedSkeleton() {
    return `
      <div class="card-list" aria-label="Chargement du feed">
        ${[1, 2, 3].map(() => `
          <article class="punch-card feed-skeleton">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line tall"></div>
            <div class="skeleton-row">
              <span></span><span></span><span></span>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function RankingItem(item) {
    const rank = Number(String(item.position || "").replace("#", "")) || 0;
    const dateLabel = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
      : "";
    const topClass = rank > 0 && rank <= 3 ? `top-${rank}` : "";

    return `
      <article class="ranking-item ${topClass}">
        <span class="rank-position">${escapeHtml(item.position)}</span>
        <div>
          <div class="ranking-author">
            ${MdrankAvatar(item.authorId, "small")}
            <div class="ranking-author-copy">
              <strong>${escapeHtml(item.pseudo)}</strong>
              ${CategoryBadge(item.category)}
            </div>
          </div>
          <p>“${escapeHtml(item.text)}”</p>
          <div class="ranking-metrics">
            <span class="score-badge compact-score"><span class="score-spark">✦</span> Score ${item.score}</span>
            <span class="star-chip">⭐ ${item.superNotes}</span>
            <span class="tiny-metric">😂 ${item.reactions.laugh}</span>
            <span class="tiny-metric">🔥 ${item.reactions.fire}</span>
            <span class="tiny-metric">💀 ${item.reactions.skull}</span>
            <span class="tiny-metric">🤯 ${item.reactions.mind}</span>
          </div>
          ${dateLabel ? `<small class="ranking-date">${escapeHtml(dateLabel)}</small>` : ""}
        </div>
      </article>
    `;
  }

  function RankingUserItem(item) {
    const rank = Number(String(item.position || "").replace("#", "")) || 0;
    const topClass = rank > 0 && rank <= 3 ? `top-${rank}` : "";

    return `
      <article class="ranking-item ranking-user ${topClass}">
        <span class="rank-position">${escapeHtml(item.position)}</span>
        <div>
          <div class="ranking-author">
            ${MdrankAvatar(item.id, "small")}
            <div class="ranking-author-copy">
              <strong>${escapeHtml(item.pseudo)}</strong>
              <span class="category-badge">Blagueur</span>
            </div>
          </div>
          <div class="ranking-metrics">
            <span class="score-badge compact-score"><span class="score-spark">✦</span> Score ${escapeHtml(String(item.score))}</span>
            <span class="tiny-metric">✎ ${escapeHtml(String(item.punchlines))} punchline${Number(item.punchlines) > 1 ? "s" : ""}</span>
            <span class="star-chip">⭐ ${escapeHtml(String(item.superNotes))}</span>
          </div>
        </div>
      </article>
    `;
  }

  function StatCard(stat) {
    return `
      <article class="stat-card">
        <span class="stat-icon">${escapeHtml(stat.icon || "✦")}</span>
        <strong>${escapeHtml(stat.value)}</strong>
        <span>${escapeHtml(stat.label)}</span>
      </article>
    `;
  }

  function BestPunchlineCard(bestPunchline, punchlineCount = 0) {
    if (!bestPunchline?.content) {
      const hasPunchlines = Number(punchlineCount || 0) > 0;
      return `
        <article class="best-punchline-card is-empty">
          <div>
            <span class="stat-icon">★</span>
            <strong>Meilleure punchline</strong>
          </div>
          <p>${hasPunchlines ? "Meilleure punchline indisponible pour le moment." : "Aucune punchline publiée pour l'instant."}</p>
        </article>
      `;
    }

    return `
      <article class="best-punchline-card">
        <div>
          <span class="stat-icon">★</span>
          <strong>Meilleure punchline</strong>
          <em><span class="score-spark">✦</span> Score ${escapeHtml(String(bestPunchline.score ?? 0))}</em>
        </div>
        <p>“${escapeHtml(bestPunchline.content)}”</p>
      </article>
    `;
  }

  function EmptyState(title, text) {
    return `
      <div class="empty-state">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  function ReportModal(punchline) {
    const reasons = [
      { label: "Attaque personnelle", value: "personal_attack" },
      { label: "Personne identifiable", value: "identifiable_person" },
      { label: "Haine / discrimination", value: "hate" },
      { label: "Harcèlement", value: "harassment" },
      { label: "Contenu sexuel", value: "sexual_content" },
      { label: "Spam", value: "spam" },
      { label: "Autre", value: "other" }
    ];
    const detailsCount = state.reportDetails.length;

    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <section class="report-modal">
          <button class="close-modal" type="button" data-close-report aria-label="Fermer">×</button>
          <h2 id="report-title">Signaler cette punchline</h2>
          ${
            state.reportSent
              ? `<div class="success-box">Merci. Le signalement a été envoyé.</div>`
              : `
                <p class="muted">Les vannes, oui. Le ciblage de vraies personnes, non.</p>
                ${state.reportError ? `<div class="error-box">${escapeHtml(state.reportError)}</div>` : ""}
                <div class="reason-list">
                  ${reasons
                    .map(
                      (reason) => `
                        <label>
                          <input type="radio" name="reason" value="${reason.value}" ${state.reportReason === reason.value ? "checked" : ""} />
                          <span>${reason.label}</span>
                        </label>
                      `
                    )
                    .join("")}
                </div>
                <label class="report-details-label">
                  Détail optionnel
                  <textarea id="report-details" maxlength="500" placeholder="Ajoute un contexte si nécessaire.">${escapeHtml(state.reportDetails)}</textarea>
                </label>
                <div class="form-row">
                  <span class="${detailsCount > 500 ? "danger" : ""}">${detailsCount} / 500</span>
                  <button class="primary-button" type="button" data-send-report ${state.reportSubmitting ? "disabled" : ""}>
                    ${state.reportSubmitting ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              `
          }
        </section>
      </div>
    `;
  }

  function Tabs(items, active, target) {
    return `
      <div class="tabs">
        ${items
          .map(
            (item) => `
              <button class="${active === item.value ? "active" : ""}" data-tab-target="${target}" data-tab="${item.value}">
                ${item.label}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderHome() {
    return AppShell(`
      <div class="hero">
        <div class="logo-mark">MDR</div>
        <h1>MDRank</h1>
        <p class="hero-line">Des punchlines courtes. Des votes anonymes. Des classements. Zéro commentaire.</p>
        <p class="hero-copy">Balance ta meilleure vanne, vote pour les plus lourdes et grimpe dans les classements.</p>
        <div class="hero-actions">
          <button class="primary-button" data-route="feed">Entrer dans MDRank</button>
          <button class="secondary-button" data-route="feed">Voir le concept</button>
        </div>
      </div>
    `);
  }

  function renderAuthNotice() {
    return `
      ${state.authError ? `<div class="error-box">${escapeHtml(state.authError)}</div>` : ""}
      ${state.authMessage ? `<div class="success-box">${escapeHtml(state.authMessage)}</div>` : ""}
      ${!getAuthState().isConfigured ? `<div class="rules-box"><strong>Configuration requise</strong><span>Renseigne l'URL Supabase et la clé anon publique dans config.js.</span></div>` : ""}
    `;
  }

  function renderLogin() {
    return AppShell(`
      <section class="auth-card">
        <h2>Connexion</h2>
        <p>Connecte-toi pour publier, réagir et gérer ton pseudo MDRank.</p>
        ${renderAuthNotice()}
        <form class="auth-form" id="login-form">
          <label>
            Email
            <input id="login-email" type="email" autocomplete="email" required />
          </label>
          <label>
            Mot de passe
            <input id="login-password" type="password" autocomplete="current-password" required />
          </label>
          <button class="primary-button full" type="submit" ${state.authSubmitting ? "disabled" : ""}>${state.authSubmitting ? "Connexion..." : "Se connecter"}</button>
        </form>
        <div class="auth-links">
          <button type="button" data-route="signup">Créer un compte</button>
          <button type="button" data-reset-password>Mot de passe oublié</button>
        </div>
      </section>
    `, { title: "Connexion" });
  }

  function renderSignup() {
    return AppShell(`
      <section class="auth-card">
        <h2>Créer un compte</h2>
        <p>Ton email reste privé. Ton pseudo est ton identité publique.</p>
        ${renderAuthNotice()}
        <form class="auth-form" id="signup-form">
          <label>
            Email
            <input id="signup-email" type="email" autocomplete="email" required />
          </label>
          <label>
            Mot de passe
            <input id="signup-password" type="password" autocomplete="new-password" required />
          </label>
          <label>
            Confirmer le mot de passe
            <input id="signup-password-confirm" type="password" autocomplete="new-password" required />
          </label>
          <label>
            Pseudo
            <input id="signup-pseudo" type="text" minlength="3" maxlength="24" autocomplete="nickname" required />
          </label>
          <button class="primary-button full" type="submit" ${state.authSubmitting ? "disabled" : ""}>${state.authSubmitting ? "Création..." : "Créer mon compte"}</button>
        </form>
        <div class="auth-links">
          <button type="button" data-route="login">J'ai déjà un compte</button>
        </div>
      </section>
    `, { title: "Inscription" });
  }

  function renderProfileSetup() {
    const authState = getAuthState();
    const hasProfile = Boolean(authState.profile?.pseudo);

    return AppShell(`
      <section class="auth-card">
        <h2>${hasProfile ? "Modifier mon profil" : "Créer mon profil"}</h2>
        <p>Ton pseudo est public. Ton email reste privé.</p>
        ${renderAuthNotice()}
        ${authState.loading ? `<div class="empty-state"><strong>Chargement</strong><p>On vérifie ta session.</p></div>` : ""}
        <form class="auth-form" id="profile-form">
          <label>
            Pseudo
            <input id="profile-pseudo" type="text" minlength="3" maxlength="24" value="${escapeHtml(authState.profile?.pseudo || "")}" required />
          </label>
          <label>
            Bio optionnelle
            <textarea id="profile-bio" maxlength="160" placeholder="Une courte bio, sans vrai nom.">${escapeHtml(authState.profile?.bio || "")}</textarea>
          </label>
          <button class="primary-button full" type="submit" ${state.authSubmitting ? "disabled" : ""}>${state.authSubmitting ? "Enregistrement..." : hasProfile ? "Enregistrer mon profil" : "Créer mon profil"}</button>
        </form>
      </section>
    `, { title: "Pseudo" });
  }

  function renderFeed() {
    const authState = getAuthState();
    const needsRecentFeed = state.feedTab === "recent";
    const needsFollowingFeed = state.feedTab === "following" && authState.isAuthenticated && authState.profile;
    const needsTopFeed = state.feedTab === "top";

    if (needsRecentFeed && !state.feedLoaded && !state.feedLoading) {
      setTimeout(() => loadFeed(), 0);
    }

    if (needsTopFeed && !state.topLoaded && !state.topLoading) {
      setTimeout(() => loadFeedTopDay(), 0);
    }

    if (needsFollowingFeed && !state.followingLoaded && !state.followingLoading) {
      setTimeout(() => loadFollowingFeed(), 0);
    }

    if (needsFollowingFeed && !state.profileCountsLoaded && !state.profileCountsLoading) {
      setTimeout(() => loadProfileCounts(), 0);
    }

    const filtered = state.feedTab === "following"
      ? state.followingItems
      : state.feedTab === "top"
        ? state.topItems
        : state.feedItems;

    let content = "";
    if (state.feedTab === "following" && authState.loading) {
      content = FeedSkeleton();
    } else if (state.feedTab === "following" && !authState.isAuthenticated) {
      content = `
        <div class="empty-state">
          <strong>Connecte-toi pour voir les blagueurs que tu suis.</strong>
          <p>Ton feed suivis garde seulement les punchlines de tes profils préférés.</p>
          <button class="primary-button full" type="button" data-route="login">Se connecter</button>
        </div>
      `;
    } else if (state.feedTab === "following" && !authState.profile) {
      content = `
        <div class="empty-state">
          <strong>Crée ton pseudo pour suivre des blagueurs.</strong>
          <p>MDRank affiche les gens sous pseudo, jamais avec l'email.</p>
          <button class="primary-button full" type="button" data-route="profileSetup">Créer mon pseudo</button>
        </div>
      `;
    } else if (state.feedTab === "following" && state.followingLoading && !state.followingLoaded) {
      content = FeedSkeleton();
    } else if (state.feedTab === "following" && state.followingError) {
      content = `
        <div class="empty-state">
          <strong>Feed suivis en pause</strong>
          <p>${escapeHtml(state.followingError)}</p>
          <button class="secondary-button full" type="button" data-refresh-following-feed>Réessayer</button>
        </div>
      `;
    } else if (state.feedTab === "top" && state.topLoading && !state.topLoaded) {
      content = FeedSkeleton();
    } else if (state.feedTab === "top" && state.topError) {
      content = `
        <div class="empty-state">
          <strong>Top du jour en pause</strong>
          <p>${escapeHtml(state.topError)}</p>
          <button class="secondary-button full" type="button" data-refresh-top-feed>Réessayer</button>
        </div>
      `;
    } else if (state.feedLoading && !state.feedLoaded) {
      content = FeedSkeleton();
    } else if (state.feedError) {
      content = `
        <div class="empty-state">
          <strong>Feed en pause</strong>
          <p>${escapeHtml(state.feedError)}</p>
          <button class="secondary-button full" type="button" data-refresh-feed>Réessayer</button>
        </div>
      `;
    } else if (state.feedTab === "following" && !filtered.length) {
      const followsSomeone = Number(state.profileCounts?.following || 0) > 0;
      content = followsSomeone
        ? EmptyState("Les blagueurs que tu suis sont silencieux pour l'instant.", "C'est louche.")
        : EmptyState("Tu ne suis encore personne.", "Va repérer des blagueurs dans le Feed.");
    } else if (state.feedTab === "top" && !filtered.length) {
      content = EmptyState("Aucun top aujourd'hui.", "La scène est encore vide.");
    } else if (!filtered.length) {
      content = EmptyState("Aucune punchline pour l'instant", "Sois le premier à dégainer.");
    } else {
      content = `<div class="card-list">${filtered.map((item) => PunchlineCard(item)).join("")}</div>`;
    }

    return AppShell(`
      ${Tabs(
        [
          { label: "Récent", value: "recent" },
          { label: "Suivis", value: "following" },
          { label: "Top du jour", value: "top" }
        ],
        state.feedTab,
        "feed"
      )}
      ${state.feedActionError ? `<div class="error-box">${escapeHtml(state.feedActionError)}</div>` : ""}
      ${content}
    `, { title: "Feed" });
  }

  function renderPublish() {
    const authState = getAuthState();
    if (authState.loading) {
      return AppShell(`
        <div class="empty-state">
          <strong>Chargement</strong>
          <p>On vérifie ta session MDRank.</p>
        </div>
      `, { title: "Publier une punchline" });
    }

    if (!authState.isAuthenticated) {
      return renderLogin();
    }

    if (!authState.profile) {
      return renderProfileSetup();
    }

    if (!state.publishCategoriesLoaded && !state.publishCategoriesLoading) {
      setTimeout(loadPublishCategories, 0);
    }

    syncPublishCategory();

    const trimmedText = state.publishText.trim();
    const count = trimmedText.length;
    const normalCategories = getNormalPublishCategories();
    const activeChallenge = getActivePublishChallenge();
    const isChallengePublish = Boolean(state.publishChallengeId);
    const effectiveCategory = isChallengePublish ? getChallengeCategory() : getSelectedPublishCategory();
    const canPublish = !state.publishSubmitting
      && !state.publishCategoriesLoading
      && count >= 3
      && count <= 180
      && Boolean(effectiveCategory?.id)
      && (!isChallengePublish || Boolean(activeChallenge));
    const preview = {
      pseudo: authState.profile.pseudo,
      authorId: authState.user?.id,
      category: isChallengePublish ? "Défi du jour" : effectiveCategory?.name || "Catégorie",
      text: state.publishText || "Ta punchline apparaîtra ici pendant que tu l'écris.",
      reactions: { laugh: 0, fire: 0, skull: 0, mind: 0, ice: 0 },
      superNotes: 0,
      score: 0,
      position: "Aperçu",
      followed: true
    };

    return AppShell(`
      <form class="publish-form">
        <div class="publish-help">Punchline courte. Pseudo public. Email privé.</div>
        ${state.publishError ? `<div class="error-box">${escapeHtml(state.publishError)}</div>` : ""}
        ${state.publishSuccess ? `<div class="success-box">${escapeHtml(state.publishSuccess)}</div>` : ""}
        ${state.publishCategoriesLoaded && !normalCategories.length && !isChallengePublish ? `
          <button class="secondary-button full" type="button" data-refresh-publish-categories>
            Réessayer de charger les catégories
          </button>
        ` : ""}
        ${
          isChallengePublish
            ? `
              <div class="challenge-context">
                <strong>Tu réponds au défi du jour.</strong>
                <span>${activeChallenge ? escapeHtml(activeChallenge.title) : "Défi indisponible pour le moment."}</span>
              </div>
            `
            : `
              <label>
                Catégorie
                <select id="publish-category" ${state.publishCategoriesLoading ? "disabled" : ""}>
                  <option value="">${state.publishCategoriesLoading ? "Chargement..." : "Choisis une catégorie"}</option>
                  ${normalCategories.map((category) => `
                    <option value="${category.id}" ${category.id === state.publishCategoryId ? "selected" : ""}>${escapeHtml(category.name)}</option>
                  `).join("")}
                </select>
              </label>
            `
        }
        <label>
          Punchline
          <textarea id="publish-text" maxlength="180" placeholder="Écris court, net, efficace.">${escapeHtml(state.publishText)}</textarea>
        </label>
        <div class="form-row">
          <span class="char-counter ${count > 180 ? "danger" : count >= 160 ? "warning" : ""}">${count} / 180</span>
          <button class="primary-button" type="button" data-publish ${canPublish ? "" : "disabled"}>
            ${state.publishSubmitting ? "Publication..." : "Publier"}
          </button>
        </div>
      </form>
      <h2 class="section-title">Aperçu</h2>
      ${PunchlineCard(preview, true)}
      <div class="rules-box"><strong>Règles rapides</strong><span>Roast oui, acharnement non. Ne vise pas une vraie personne identifiable.</span></div>
    `, { title: "Publier une punchline" });
  }

  function renderChallenges() {
    if (!state.challengeLoaded && !state.challengeLoading) {
      setTimeout(() => loadDailyChallenge(), 0);
    }

    if (state.challengeLoading && !state.challengeLoaded) {
      return AppShell(FeedSkeleton(), { title: "Défi du jour" });
    }

    if (state.challengeError) {
      return AppShell(`
        <div class="empty-state">
          <strong>Défi indisponible</strong>
          <p>${escapeHtml(state.challengeError)}</p>
          <button class="secondary-button full" type="button" data-refresh-challenge>Réessayer</button>
        </div>
      `, { title: "Défi du jour" });
    }

    if (!state.challenge) {
      return AppShell(`
        <div class="empty-state">
          <strong>Aucun défi actif pour l'instant.</strong>
          <p>Reviens dès qu'un thème du jour est lancé.</p>
        </div>
      `, { title: "Défi du jour" });
    }

    const topContent = state.challengeTop.length
      ? `
        <div class="ranking-list">
          ${state.challengeTop.map((item) => `
            <article class="challenge-rank">
              <strong>${item.position}</strong>
              <div class="challenge-rank-body">
                <div class="challenge-author">
                  ${MdrankAvatar(item.authorId, "small")}
                  <span>${escapeHtml(item.pseudo)}</span>
                </div>
                <p>“${escapeHtml(item.text)}”</p>
              </div>
              <em><span class="score-spark">✦</span> Score ${item.score}</em>
            </article>
          `).join("")}
        </div>
      `
      : EmptyState("Pas encore de punchline dans ce défi.", "C'est peut-être le moment de lancer la première.");

    return AppShell(`
      <section class="challenge-card">
        <span class="eyebrow">Thème du jour</span>
        <h2>${escapeHtml(state.challenge.title)}</h2>
        ${state.challenge.description ? `<p>${escapeHtml(state.challenge.description)}</p>` : ""}
        <p><span>Date</span> <strong>${new Date(`${state.challenge.challenge_date}T00:00:00`).toLocaleDateString("fr-FR")}</strong></p>
        <button class="primary-button" type="button" data-join-challenge="${state.challenge.id}">Participer au défi</button>
      </section>
      <h2 class="section-title">Top 3 du défi</h2>
      ${topContent}
      <button class="secondary-button full" data-route="rankings">Voir tout le classement</button>
      <div class="challenge-note">Les meilleures punchlines du défi montent dans le Top du jour.</div>
    `, { title: "Défi du jour" });
  }

  function renderRankings() {
    if (!state.userLeaderboardLoaded && !state.userLeaderboardLoading) {
      setTimeout(() => loadUserLeaderboard(), 0);
    }

    if (!state.leaderboardLoaded[state.rankingTab] && !state.leaderboardLoading) {
      setTimeout(() => loadLeaderboard(), 0);
    }

    let usersContent = "";
    if (state.userLeaderboardLoading && !state.userLeaderboardLoaded) {
      usersContent = FeedSkeleton();
    } else if (state.userLeaderboardError) {
      usersContent = `
        <div class="empty-state">
          <strong>Top blagueurs en pause</strong>
          <p>${escapeHtml(state.userLeaderboardError)}</p>
          <button class="secondary-button full" type="button" data-refresh-ranking>Réessayer</button>
        </div>
      `;
    } else if (!state.userLeaderboardItems.length) {
      usersContent = EmptyState("Aucun blagueur classé pour l'instant.", "Le classement se remplira avec les premières punchlines.");
    } else {
      usersContent = `<div class="ranking-list">${state.userLeaderboardItems.map(RankingUserItem).join("")}</div>`;
    }

    const items = state.leaderboardItems[state.rankingTab] || [];
    let content = "";

    if (state.leaderboardLoading && !state.leaderboardLoaded[state.rankingTab]) {
      content = FeedSkeleton();
    } else if (state.leaderboardError) {
      content = `
        <div class="empty-state">
          <strong>Classement en pause</strong>
          <p>${escapeHtml(state.leaderboardError)}</p>
          <button class="secondary-button full" type="button" data-refresh-ranking>Réessayer</button>
        </div>
      `;
    } else if (!items.length) {
      content = EmptyState("Aucune punchline dans ce classement pour l'instant.", "Le classement est vide. C'est le moment de frapper.");
    } else {
      content = `<div class="ranking-list">${items.map(RankingItem).join("")}</div>`;
    }

    return AppShell(`
      <section class="ranking-section">
        <div class="section-heading compact-heading">
          <div>
            <h2>Top blagueurs</h2>
            <p>Score total reçu sur les punchlines publiées.</p>
          </div>
        </div>
        ${usersContent}
      </section>
      <section class="ranking-section">
        <div class="section-heading compact-heading">
          <div>
            <h2>Top punchlines</h2>
            <p>Les meilleures punchlines selon le Score MDR.</p>
          </div>
        </div>
      ${Tabs(
        [
          { label: "Jour", value: "day" },
          { label: "Semaine", value: "week" },
          { label: "Mois", value: "month" }
        ],
        state.rankingTab,
        "ranking"
      )}
      ${content}
      </section>
    `, { title: "Classements" });
  }

  function renderProfile() {
    const authState = getAuthState();

    if (authState.loading) {
      return AppShell(`
        <div class="empty-state">
          <strong>Chargement</strong>
          <p>On récupère ta session MDRank.</p>
        </div>
      `, { title: "Moi" });
    }

    if (!authState.isAuthenticated) {
      return renderLogin();
    }

    if (!authState.profile) {
      return renderProfileSetup();
    }

    const counts = state.profileCounts || {
      punchlines: "—",
      scoreMdr: "—",
      superNotesReceived: "—",
      bestPunchline: null
    };

    if (!state.profileCountsLoaded && !state.profileCountsLoading) {
      setTimeout(() => loadProfileCounts(), 0);
    }

    if (!state.profileBadgesLoaded && !state.profileBadgesLoading) {
      setTimeout(() => loadProfileBadges(), 0);
    }

    return AppShell(`
      ${state.authMessage ? `<div class="success-box">${escapeHtml(state.authMessage)}</div>` : ""}
      <section class="profile-section">
        <div class="section-heading">
          <div>
            <h2>Profil public</h2>
            <p>Ce que les autres voient sur MDRank.</p>
          </div>
          <span>Public</span>
        </div>
        <div class="profile-header compact-profile">
          ${MdrankAvatar(authState.user?.id, "large")}
          <div>
            <h3>${escapeHtml(authState.profile.pseudo)}</h3>
            <p>Pseudo public, vraie identité au vestiaire.</p>
          </div>
        </div>
        ${authState.profile.bio ? `<div class="profile-bio">${escapeHtml(authState.profile.bio)}</div>` : `<div class="profile-bio is-empty">Aucune bio pour l'instant.</div>`}
        <div class="stats-grid">
          ${StatCard({ icon: "✦", value: String(counts.scoreMdr), label: "Score MDR" })}
          ${StatCard({ icon: "✎", value: String(counts.punchlines), label: "Punchlines" })}
          ${StatCard({ icon: "◆", value: String(counts.superNotesReceived), label: "SuperNotes reçues" })}
        </div>
        ${state.profileCountsError ? `<div class="error-box">${escapeHtml(state.profileCountsError)}</div>` : ""}
        ${BestPunchlineCard(counts.bestPunchline, counts.punchlines)}
        <div class="profile-badges">
          <div class="section-heading compact-heading">
            <div>
              <h2>Badges</h2>
              <p>Un aperçu de ta collection MDRank.</p>
            </div>
          </div>
          <div class="profile-badge-subsection">
            <div class="mini-heading">
              <h3>Badges obtenus</h3>
            </div>
          </div>
          ${renderProfileBadges(4)}
          <div class="profile-actions compact-actions">
            <button data-route="badges">Voir tous les badges</button>
          </div>
        </div>
        <div class="profile-actions">
          <button data-route="profileSetup">Modifier mon profil</button>
          <button data-route="account">Compte privé</button>
        </div>
      </section>
    `, { title: "Profil", action: `<button class="icon-text" data-route="account">Compte</button>` });
  }

  function renderAccount() {
    const authState = getAuthState();

    if (authState.loading) {
      return AppShell(`
        <div class="empty-state">
          <strong>Chargement</strong>
          <p>On vérifie ta session MDRank.</p>
        </div>
      `, { title: "Compte" });
    }

    if (!authState.isAuthenticated) {
      return renderLogin();
    }

    if (!authState.profile) {
      return renderProfileSetup();
    }

    const createdAt = authState.profile.created_at
      ? new Date(authState.profile.created_at).toLocaleDateString("fr-FR")
      : "";
    const email = authState.user?.email || "Email indisponible pour le moment";

    return AppShell(`
      <section class="profile-section private-section">
        <div class="section-heading">
          <div>
            <h2>Compte privé</h2>
            <p>Visible uniquement par toi.</p>
          </div>
          <span>Privé</span>
        </div>
        <div class="profile-header compact-profile account-avatar-row">
          ${MdrankAvatar(authState.user?.id, "medium")}
          <div>
            <h3>${escapeHtml(authState.profile.pseudo)}</h3>
            <p>Identité publique MDRank</p>
          </div>
        </div>
        <div class="account-list">
          <div>
            <span>Pseudo public</span>
            <strong>${escapeHtml(authState.profile.pseudo)}</strong>
          </div>
          <div>
            <span>Email de connexion</span>
            <strong>${escapeHtml(email)}</strong>
          </div>
          <div>
            <span>Statut</span>
            <strong>Connecté</strong>
          </div>
          ${createdAt ? `<div><span>Profil créé le</span><strong>${createdAt}</strong></div>` : ""}
        </div>
        <div class="profile-actions">
          <button data-route="profile">Voir mon profil</button>
          <button data-route="profileSetup">Modifier mon pseudo</button>
          <button class="logout" data-sign-out>Déconnexion</button>
        </div>
      </section>
    `, { title: "Compte", action: `<button class="icon-text" data-route="profile">Profil</button>` });
  }

  function renderBadgesCollection() {
    const authState = getAuthState();

    if (authState.loading) {
      return AppShell(`
        <div class="empty-state">
          <strong>Chargement</strong>
          <p>On prépare ta collection de badges.</p>
        </div>
      `, { title: "Badges", action: `<button class="icon-text" data-route="profile">Profil</button>` });
    }

    if (!authState.isAuthenticated) {
      return renderLogin();
    }

    if (!authState.profile) {
      return renderProfileSetup();
    }

    if (!state.profileBadgesLoaded && !state.profileBadgesLoading) {
      setTimeout(() => loadProfileBadges(), 0);
    }

    if (!state.activeBadgesLoaded && !state.activeBadgesLoading) {
      setTimeout(() => loadActiveBadges(), 0);
    }

    if (!state.badgeProgressLoaded && !state.badgeProgressLoading) {
      setTimeout(() => loadBadgeProgressCounts(), 0);
    }

    const earnedBadges = getEarnedActiveBadges();
    const lockedBadges = getLockedProfileBadges(12);
    const earnedLoading = (state.profileBadgesLoading && !state.profileBadgesLoaded)
      || (state.activeBadgesLoading && !state.activeBadgesLoaded);
    const lockedLoading = state.activeBadgesLoading && !state.activeBadgesLoaded;
    const progressLoading = state.badgeProgressLoading && !state.badgeProgressLoaded;

    let earnedContent = "";
    if (earnedLoading) {
      earnedContent = `
        <div class="badges-empty">
          <strong>Chargement des badges</strong>
          <p>On récupère ta collection MDRank.</p>
        </div>
      `;
    } else if (state.profileBadgesError) {
      earnedContent = `
        <div class="badges-empty">
          <strong>Badges indisponibles</strong>
          <p>${escapeHtml(state.profileBadgesError)}</p>
        </div>
      `;
    } else if (!earnedBadges.length) {
      earnedContent = `
        <div class="badges-empty">
          <strong>Aucun badge obtenu pour l'instant.</strong>
          <p>Commence par publier ta première punchline.</p>
        </div>
      `;
    } else {
      earnedContent = `
        <div class="badges-grid badges-grid-collection">
          ${earnedBadges.map((badge) => BadgePill(badge)).join("")}
        </div>
      `;
    }

    let lockedContent = "";
    if (lockedLoading) {
      lockedContent = `
        <div class="badges-empty">
          <strong>Objectifs en chargement</strong>
          <p>On récupère les prochains badges à débloquer.</p>
        </div>
      `;
    } else if (state.activeBadgesError) {
      lockedContent = `
        <div class="badges-empty">
          <strong>Objectifs indisponibles</strong>
          <p>${escapeHtml(state.activeBadgesError)}</p>
        </div>
      `;
    } else if (lockedBadges.length) {
      lockedContent = `
        ${progressLoading ? `
          <div class="badges-progress-warning">
            Progression en chargement. Les objectifs restent visibles sans compteur temporaire.
          </div>
        ` : state.badgeProgressError ? `
          <div class="badges-progress-warning">
            ${escapeHtml(state.badgeProgressError)}
          </div>
        ` : ""}
        <div class="badges-grid badges-grid-collection badges-grid-locked">
          ${lockedBadges.map((badge) => BadgePill(badge, { locked: true, showProgress: state.badgeProgressLoaded && !state.badgeProgressError })).join("")}
        </div>
      `;
    } else if (state.activeBadgesLoaded && state.activeBadges.length) {
      lockedContent = `
        <div class="badges-complete">
          <strong>Tous les badges V1 sont débloqués.</strong>
        </div>
      `;
    }

    return AppShell(`
      <section class="profile-section badges-page">
        <div class="section-heading">
          <div>
            <h2>Tous les badges</h2>
            <p>Ta collection MDRank V1.</p>
          </div>
          <span>V1</span>
        </div>
        <div class="profile-badge-subsection">
          <div class="mini-heading">
            <h3>Badges obtenus</h3>
            <p>Ceux que tu as déjà débloqués.</p>
          </div>
          ${earnedContent}
        </div>
        <div class="profile-badge-subsection">
          <div class="mini-heading">
            <h3>À débloquer</h3>
            <p>Les prochains objectifs actifs.</p>
          </div>
          ${lockedContent}
        </div>
      </section>
    `, { title: "Badges", action: `<button class="icon-text" data-route="profile">Profil</button>` });
  }

  function reportReasonLabel(reason) {
    return {
      personal_attack: "Attaque personnelle",
      identifiable_person: "Personne identifiable",
      hate: "Haine / discrimination",
      harassment: "Harcèlement",
      sexual_content: "Contenu sexuel",
      spam: "Spam",
      other: "Autre"
    }[reason] || "Autre";
  }

  function reportStatusLabel(status) {
    return {
      pending: "Signalement ouvert",
      reviewed: "Signalement traité",
      dismissed: "Signalement rejeté",
      action_taken: "Action appliquée"
    }[status] || status;
  }

  function punchlineStatusLabel(status) {
    return {
      published: "Visible",
      hidden: "Masquée",
      deleted: "Supprimée",
      pending_review: "En revue"
    }[status] || status;
  }

  function AdminReportCard(report) {
    const createdAt = report.created_at
      ? new Date(report.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "";
    const authState = getAuthState();
    const actionBusy = state.adminActionKey === String(report.id);
    const isHidden = report.punchline_status === "hidden";

    return `
      <article class="admin-card" data-admin-report="${report.id}">
        <div class="card-meta">
          <div>
            <strong>${escapeHtml(report.author_pseudo || "@MDRank")}</strong>
            ${CategoryBadge(report.category_name || "Punchline")}
          </div>
          <span class="status-chip">${escapeHtml(punchlineStatusLabel(report.punchline_status))}</span>
        </div>
        <p>“${escapeHtml(report.punchline_content || "")}”</p>
        <div class="admin-report-meta">
          ${report.report_reason ? `<span>${escapeHtml(reportReasonLabel(report.report_reason))}</span>` : ""}
          ${report.report_status ? `<span>${escapeHtml(reportStatusLabel(report.report_status))}</span>` : ""}
          <span>${Number(report.report_count || 0)} signalement${Number(report.report_count || 0) > 1 ? "s" : ""}</span>
          ${createdAt ? `<span>${escapeHtml(createdAt)}</span>` : ""}
        </div>
        ${report.report_details ? `<div class="admin-detail">${escapeHtml(report.report_details)}</div>` : ""}
        <div class="admin-actions">
          ${
            isHidden
              ? `<button type="button" data-admin-action="restore_punchline" data-punchline-id="${report.punchline_id}" data-report-id="${report.id}" ${actionBusy ? "disabled" : ""}>Restaurer</button>`
              : `
                <button type="button" data-admin-action="dismiss_report" data-punchline-id="${report.punchline_id}" data-report-id="${report.id}" ${actionBusy ? "disabled" : ""}>Ignorer</button>
                <button type="button" data-admin-action="hide_punchline" data-punchline-id="${report.punchline_id}" data-report-id="${report.id}" ${actionBusy ? "disabled" : ""}>Masquer</button>
              `
          }
          ${
            isAdminProfile(authState.profile)
              ? `<button class="danger-button" type="button" data-admin-user-action="${report.author_is_banned ? "unban_user" : "ban_user"}" data-target-user-id="${report.author_id}" data-report-id="${report.id}" ${actionBusy ? "disabled" : ""}>${report.author_is_banned ? "Débannir" : "Bannir"}</button>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderAdmin() {
    const authState = getAuthState();

    if (authState.loading) {
      return AppShell(`
        <div class="empty-state">
          <strong>Chargement</strong>
          <p>On vérifie ton accès modération.</p>
        </div>
      `, { title: "Admin MDRank", action: `<button class="icon-text" data-route="feed">Feed</button>` });
    }

    if (!authState.isAuthenticated) {
      return renderLogin();
    }

    if (!authState.profile) {
      return renderProfileSetup();
    }

    if (!isStaffProfile(authState.profile)) {
      return AppShell(`
        <div class="empty-state">
          <strong>Accès réservé</strong>
          <p>Cette zone est uniquement pour la modération MDRank.</p>
        </div>
      `, { title: "Admin MDRank", action: `<button class="icon-text" data-route="feed">Feed</button>` });
    }

    if (!state.adminLoaded && !state.adminLoading) {
      setTimeout(() => loadAdminReports(), 0);
    }

    const adminItems = state.adminTab === "moderated" ? state.adminModerated : state.adminReports;
    let content = "";
    if (state.adminLoading && !state.adminLoaded) {
      content = FeedSkeleton();
    } else if (state.adminError) {
      content = `
        <div class="empty-state">
          <strong>Modération indisponible</strong>
          <p>${escapeHtml(state.adminError)}</p>
          <button class="secondary-button full" type="button" data-refresh-admin>Réessayer</button>
        </div>
      `;
    } else if (!adminItems.length) {
      content = state.adminTab === "moderated"
        ? EmptyState("Aucune punchline masquée.", "Rien à restaurer pour le moment.")
        : EmptyState("Aucun signalement en attente.", "La modération respire un peu.");
    } else {
      content = `<div class="card-list">${adminItems.map(AdminReportCard).join("")}</div>`;
    }

    return AppShell(`
      ${Tabs(
        [
          { label: `À traiter (${state.adminReports.length})`, value: "pending" },
          { label: `Masquées (${state.adminModerated.length})`, value: "moderated" }
        ],
        state.adminTab,
        "admin"
      )}
      <div class="admin-note">Signalements en attente. Actions réservées à la modération MDRank.</div>
      ${state.adminMessage ? `<div class="success-box">${escapeHtml(state.adminMessage)}</div>` : ""}
      ${state.adminError && adminItems.length ? `<div class="error-box">${escapeHtml(state.adminError)}</div>` : ""}
      ${content}
    `, { title: "Admin MDRank", action: `<button class="icon-text" data-route="feed">Feed</button>` });
  }

  function bindEvents() {
    const dismissBadgeToast = document.querySelector("[data-dismiss-badge-toast]");
    if (dismissBadgeToast) dismissBadgeToast.addEventListener("click", () => {
      state.badgeUnlockToast = null;
      if (badgeUnlockToastTimer) {
        clearTimeout(badgeUnlockToastTimer);
        badgeUnlockToastTimer = null;
      }
      render();
    });

    document.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.route === "publish") resetPublishChallengeContext();
        setRoute(button.dataset.route);
      });
    });

    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.tabTarget === "feed") state.feedTab = button.dataset.tab;
        if (button.dataset.tabTarget === "ranking") {
          state.rankingTab = button.dataset.tab;
          state.leaderboardError = "";
        }
        if (button.dataset.tabTarget === "admin") state.adminTab = button.dataset.tab;
        render();
      });
    });

    document.querySelectorAll("[data-report]").forEach((button) => {
      button.addEventListener("click", () => {
        const authState = getAuthState();
        const punchline = getActiveFeedItems().find((item) => String(item.id) === String(button.dataset.report)) || null;

        if (!authState.isAuthenticated) {
          state.feedActionError = "Connecte-toi pour signaler une punchline.";
          render();
          return;
        }

        if (!authState.profile) {
          setRoute("profileSetup");
          return;
        }

        if (punchline?.authorId === authState.user?.id) {
          state.feedActionError = "Tu ne peux pas signaler ta propre punchline.";
          render();
          return;
        }

        state.reportPunchline = punchline;
        state.reportSent = false;
        state.reportReason = "personal_attack";
        state.reportDetails = "";
        state.reportError = "";
        render();
      });
    });

    const refreshFeedButton = document.querySelector("[data-refresh-feed]");
    if (refreshFeedButton) refreshFeedButton.addEventListener("click", () => loadFeed(true));

    const refreshFollowingFeedButton = document.querySelector("[data-refresh-following-feed]");
    if (refreshFollowingFeedButton) refreshFollowingFeedButton.addEventListener("click", () => loadFollowingFeed(true));

    const refreshTopFeedButton = document.querySelector("[data-refresh-top-feed]");
    if (refreshTopFeedButton) refreshTopFeedButton.addEventListener("click", () => loadFeedTopDay(true));

    const refreshRankingButton = document.querySelector("[data-refresh-ranking]");
    if (refreshRankingButton) refreshRankingButton.addEventListener("click", () => {
      loadUserLeaderboard(true);
      loadLeaderboard(true);
    });

    const refreshAdminButton = document.querySelector("[data-refresh-admin]");
    if (refreshAdminButton) refreshAdminButton.addEventListener("click", () => loadAdminReports(true));

    const refreshChallengeButton = document.querySelector("[data-refresh-challenge]");
    if (refreshChallengeButton) refreshChallengeButton.addEventListener("click", () => loadDailyChallenge(true));

    const refreshPublishCategoriesButton = document.querySelector("[data-refresh-publish-categories]");
    if (refreshPublishCategoriesButton) refreshPublishCategoriesButton.addEventListener("click", () => {
      state.publishCategoriesLoaded = false;
      state.publishError = "";
      loadPublishCategories();
    });

    document.querySelectorAll("[data-join-challenge]").forEach((button) => {
      button.addEventListener("click", () => {
        state.publishChallengeId = button.dataset.joinChallenge;
        syncPublishCategory();
        setRoute("publish");
      });
    });

    document.querySelectorAll("[data-follow-author]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (state.followSubmittingKey) return;

        const targetUserId = button.dataset.followAuthor;
        const punchline = getActiveFeedItems().find((item) => String(item.authorId) === String(targetUserId));
        const authState = getAuthState();

        if (!authState.isAuthenticated) {
          state.feedActionError = "Connecte-toi pour suivre ce blagueur.";
          setRoute("login");
          return;
        }

        if (!authState.profile) {
          setRoute("profileSetup");
          return;
        }

        if (!targetUserId || targetUserId === authState.user?.id) {
          state.feedActionError = "Impossible de te suivre toi-même. Même si tu es très drôle.";
          render();
          return;
        }

        state.followSubmittingKey = String(targetUserId);
        state.feedActionError = "";
        render();

        let result;
        try {
          result = punchline?.followed
            ? await api.unfollowUser({ targetUserId })
            : await api.followUser({ targetUserId });
        } catch (error) {
          console.warn("MDRank: follow action", error);
          result = { ok: false, message: "Action impossible pour le moment." };
        }

        state.followSubmittingKey = "";

        if (!result.ok) {
          state.feedActionError = result.message;
          render();
          return;
        }

        state.profileCountsLoaded = false;
        if (state.feedTab === "top") {
          await loadFeedTopDay(true);
        } else {
          await loadFeed(true);
        }
        if (state.feedTab === "following" || punchline?.followed) {
          await loadFollowingFeed(true);
        }
      });
    });

    document.querySelectorAll("[data-reaction]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (state.reactionSubmittingKey) return;

        const card = button.closest("[data-punchline-card]");
        const punchlineId = card?.dataset.punchlineCard;
        const reactionType = button.dataset.reaction;
        const punchline = getActiveFeedItems().find((item) => String(item.id) === String(punchlineId));
        const authState = getAuthState();

        if (!authState.isAuthenticated) {
          setRoute("login");
          return;
        }

        if (!authState.profile) {
          setRoute("profileSetup");
          return;
        }

        if (!punchlineId || !reactionType) return;

        if (punchline?.authorId === authState.user?.id) {
          state.feedActionError = "Impossible de réagir à ta propre punchline.";
          render();
          return;
        }

        state.reactionSubmittingKey = String(punchlineId);
        state.feedActionError = "";
        render();

        let result;
        try {
          result = await api.castReaction({
            punchlineId,
            reactionType
          });
        } catch (error) {
          console.warn("MDRank: cast reaction", error);
          result = { ok: false, message: "Réaction impossible pour le moment." };
        }

        state.reactionSubmittingKey = "";

        if (!result.ok) {
          state.feedActionError = result.message;
          render();
          return;
        }

        handleUnlockedBadges(result);
        resetLeaderboards();
        if (state.feedTab === "following") {
          await loadFollowingFeed(true);
        } else if (state.feedTab === "top") {
          await loadFeedTopDay(true);
        } else {
          await loadFeed(true);
        }
      });
    });

    document.querySelectorAll("[data-supernote]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (state.superNoteSubmittingKey) return;

        const card = button.closest("[data-punchline-card]");
        const punchlineId = card?.dataset.punchlineCard;
        const punchline = getActiveFeedItems().find((item) => String(item.id) === String(punchlineId));
        const authState = getAuthState();

        if (!authState.isAuthenticated) {
          setRoute("login");
          return;
        }

        if (!authState.profile) {
          setRoute("profileSetup");
          return;
        }

        if (!punchlineId || !punchline) return;

        if (punchline.authorId === authState.user?.id) {
          state.feedActionError = "Impossible de SuperNoter ta propre punchline. Même si elle mérite une statue.";
          render();
          return;
        }

        if (punchline.hasSuperNoted) {
          state.feedActionError = "Tu as déjà SuperNoté cette punchline.";
          render();
          return;
        }

        if (punchline.superNoteUsedToday) {
          state.feedActionError = "Tu as déjà utilisé ta SuperNote du jour.";
          render();
          return;
        }

        state.superNoteSubmittingKey = String(punchlineId);
        state.feedActionError = "";
        render();

        let result;
        try {
          result = await api.giveSuperNote({ punchlineId });
        } catch (error) {
          console.warn("MDRank: give supernote", error);
          result = { ok: false, message: "Impossible d'envoyer la SuperNote pour le moment." };
        }

        state.superNoteSubmittingKey = "";

        if (!result.ok) {
          state.feedActionError = result.message;
          render();
          return;
        }

        handleUnlockedBadges(result);
        resetLeaderboards();
        if (state.feedTab === "following") {
          await loadFollowingFeed(true);
        } else if (state.feedTab === "top") {
          await loadFeedTopDay(true);
        } else {
          await loadFeed(true);
        }
      });
    });

    const closeReport = document.querySelector("[data-close-report]");
    if (closeReport) closeReport.addEventListener("click", () => {
      state.reportPunchline = null;
      state.reportSent = false;
      state.reportError = "";
      render();
    });

    document.querySelectorAll("input[name='reason']").forEach((input) => {
      input.addEventListener("change", (event) => {
        state.reportReason = event.target.value;
        state.reportError = "";
        render();
      });
    });

    const reportDetails = document.querySelector("#report-details");
    if (reportDetails) reportDetails.addEventListener("input", (event) => {
      state.reportDetails = event.target.value;
      state.reportError = "";
      render();
      const nextDetails = document.querySelector("#report-details");
      if (nextDetails) {
        nextDetails.focus();
        nextDetails.setSelectionRange(nextDetails.value.length, nextDetails.value.length);
      }
    });

    const sendReport = document.querySelector("[data-send-report]");
    if (sendReport) sendReport.addEventListener("click", async () => {
      if (state.reportSubmitting) return;

      if (!state.reportReason) {
        state.reportError = "Choisis une raison.";
        render();
        return;
      }

      if (state.reportDetails.length > 500) {
        state.reportError = "Détail trop long.";
        render();
        return;
      }

      state.reportSubmitting = true;
      state.reportError = "";
      render();

      let result;
      try {
        result = await api.reportPunchline({
          punchlineId: state.reportPunchline?.id,
          reason: state.reportReason,
          details: state.reportDetails.trim()
        });
      } catch (error) {
        console.warn("MDRank: report punchline", error);
        result = { ok: false, message: "Impossible d'envoyer le signalement pour le moment." };
      }

      state.reportSubmitting = false;

      if (!result.ok) {
        state.reportError = result.message;
        render();
        return;
      }

      state.reportSent = true;
      render();
    });

    document.querySelectorAll("[data-admin-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (state.adminActionKey) return;

        const action = button.dataset.adminAction;
        const punchlineId = button.dataset.punchlineId;
        const reportId = button.dataset.reportId;

        state.adminActionKey = String(reportId);
        state.adminError = "";
        state.adminMessage = "";
        render();

        let result;
        try {
          result = await api.moderatePunchline({
            punchlineId,
            action,
            reason: "Modération MDRank"
          });
        } catch (error) {
          console.warn("MDRank: moderate punchline", error);
          result = { ok: false, message: "Action impossible pour le moment." };
        }

        state.adminActionKey = "";

        if (!result.ok) {
          state.adminError = result.message;
          render();
          return;
        }

        state.adminMessage = {
          dismiss_report: "Signalement ignoré.",
          hide_punchline: "Punchline masquée.",
          restore_punchline: "Punchline restaurée."
        }[action] || "Action effectuée.";
        state.feedLoaded = false;
        state.followingLoaded = false;
        state.topLoaded = false;
        resetLeaderboards();
        await loadAdminReports(true);
      });
    });

    document.querySelectorAll("[data-admin-user-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (state.adminActionKey) return;

        const action = button.dataset.adminUserAction;
        const targetUserId = button.dataset.targetUserId;
        const reportId = button.dataset.reportId;

        if (action === "ban_user" && !window.confirm("Bannir cet utilisateur ?")) return;

        state.adminActionKey = String(reportId);
        state.adminError = "";
        state.adminMessage = "";
        render();

        let result;
        try {
          result = await api.moderateUser({
            targetUserId,
            action,
            reason: "Modération MDRank"
          });
        } catch (error) {
          console.warn("MDRank: moderate user", error);
          result = { ok: false, message: "Action impossible pour le moment." };
        }

        state.adminActionKey = "";

        if (!result.ok) {
          state.adminError = result.message;
          render();
          return;
        }

        state.adminMessage = action === "ban_user" ? "Utilisateur banni." : "Utilisateur débanni.";
        state.feedLoaded = false;
        state.followingLoaded = false;
        state.topLoaded = false;
        resetLeaderboards();
        await loadAdminReports(true);
      });
    });

    const publishText = document.querySelector("#publish-text");
    if (publishText) publishText.addEventListener("input", (event) => {
      state.publishText = event.target.value;
      state.published = false;
      state.publishError = "";
      state.publishSuccess = "";
      render();
      const nextTextarea = document.querySelector("#publish-text");
      if (nextTextarea) {
        nextTextarea.focus();
        nextTextarea.setSelectionRange(nextTextarea.value.length, nextTextarea.value.length);
      }
    });

    const publishCategory = document.querySelector("#publish-category");
    if (publishCategory) publishCategory.addEventListener("change", (event) => {
      state.publishCategoryId = event.target.value;
      state.publishError = "";
      state.publishSuccess = "";
      render();
    });

    const publishButton = document.querySelector("[data-publish]");
    if (publishButton) publishButton.addEventListener("click", async () => {
      if (state.publishSubmitting) return;

      const authState = getAuthState();
      const validationError = validatePublish(authState);
      if (validationError) {
        state.publishError = validationError;
        state.publishSuccess = "";
        render();
        return;
      }

      state.publishSubmitting = true;
      state.publishError = "";
      state.publishSuccess = "";
      render();

      const category = state.publishChallengeId ? getChallengeCategory() : getSelectedPublishCategory();
      let result;
      try {
        result = await api.createPunchline({
          content: state.publishText.trim(),
          categoryId: category?.id || state.publishCategoryId,
          challengeId: state.publishChallengeId || null
        });
      } catch (error) {
        console.warn("MDRank: create punchline", error);
        result = { ok: false, message: "La publication n'est pas passée. Réessaie." };
      }

      state.publishSubmitting = false;

      if (!result.ok) {
        state.publishError = result.message;
        render();
        return;
      }

      state.publishText = "";
      resetPublishChallengeContext();
      state.published = true;
      state.publishSuccess = "Punchline publiée. Elle démarre à Score 0.";
      state.feedLoaded = false;
      state.followingLoaded = false;
      state.topLoaded = false;
      state.feedItems = [];
      state.followingItems = [];
      state.topItems = [];
      state.profileCountsLoaded = false;
      state.profileBadgesLoaded = false;
      state.badgeProgressLoaded = false;
      state.challengeLoaded = false;
      resetLeaderboards();
      handleUnlockedBadges(result);
      render();
    });

    const loginForm = document.querySelector("#login-form");
    if (loginForm) loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.authSubmitting) return;
      state.authError = "";
      state.authMessage = "";
      const email = document.querySelector("#login-email").value;
      const password = document.querySelector("#login-password").value;
      state.authSubmitting = true;
      render();

      let result;
      try {
        result = await auth.signIn({
          email,
          password
        });
      } catch (error) {
        console.warn("MDRank: sign in", error);
        result = { ok: false, message: "Connexion impossible pour le moment." };
      }

      state.authSubmitting = false;

      if (!result.ok) {
        state.authError = result.message;
        render();
        return;
      }

      const authState = getAuthState();
      setRoute(authState.profile ? "profile" : "profileSetup");
    });

    const signupForm = document.querySelector("#signup-form");
    if (signupForm) signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.authSubmitting) return;
      state.authError = "";
      state.authMessage = "";

      const password = document.querySelector("#signup-password").value;
      const passwordConfirm = document.querySelector("#signup-password-confirm").value;
      const email = document.querySelector("#signup-email").value;
      const pseudo = document.querySelector("#signup-pseudo").value;

      if (password !== passwordConfirm) {
        state.authError = "Les mots de passe ne correspondent pas.";
        render();
        return;
      }

      state.authSubmitting = true;
      render();

      let result;
      try {
        result = await auth.signUp({
          email,
          password,
          pseudo
        });
      } catch (error) {
        console.warn("MDRank: sign up", error);
        result = { ok: false, message: "Création du compte impossible pour le moment." };
      }

      state.authSubmitting = false;

      if (!result.ok) {
        state.authError = result.message;
        render();
        return;
      }

      if (result.needsConfirmation) {
        state.authMessage = result.message;
        render();
        return;
      }

      setRoute("profile");
    });

    const profileForm = document.querySelector("#profile-form");
    if (profileForm) profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.authSubmitting) return;
      state.authError = "";
      state.authMessage = "";
      const pseudo = document.querySelector("#profile-pseudo").value;
      const bio = document.querySelector("#profile-bio").value;

      state.authSubmitting = true;
      render();

      let result;
      try {
        result = await auth.createOrUpdateProfile(
          pseudo,
          bio
        );
      } catch (error) {
        console.warn("MDRank: save profile", error);
        result = { ok: false, message: "Impossible d'enregistrer le profil pour le moment." };
      }

      state.authSubmitting = false;

      if (!result.ok) {
        state.authError = result.message;
        render();
        return;
      }

      state.authMessage = "Profil enregistré.";
      setRoute("profile", { keepAuthMessage: true });
    });

    const signOutButton = document.querySelector("[data-sign-out]");
    if (signOutButton) signOutButton.addEventListener("click", async () => {
      await auth.signOut();
      setRoute("feed");
    });

    const resetPasswordButton = document.querySelector("[data-reset-password]");
    if (resetPasswordButton) resetPasswordButton.addEventListener("click", async () => {
      const email = document.querySelector("#login-email")?.value || "";
      const result = await auth.resetPassword(email);
      state.authError = result.ok ? "" : result.message;
      state.authMessage = result.ok ? result.message : "";
      render();
    });
  }

  function render() {
    state.route = resolveRoute(state.route);
    const screen = routes[state.route] || routes.home;
    app.innerHTML = screen();
    bindEvents();
  }

  window.addEventListener("hashchange", () => {
    state.route = resolveRoute(routeFromHash());
    state.reportPunchline = null;
    state.reportSent = false;
    render();
  });

  if (auth) {
    auth.subscribe(() => {
      resetUserScopedData();
      render();
    });
    auth.init().then(() => {
      render();
    });
  }

  render();
})();
