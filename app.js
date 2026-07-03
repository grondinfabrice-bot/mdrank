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
    profileBadges: [],
    profileBadgesLoading: false,
    profileBadgesLoaded: false,
    profileBadgesError: "",
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
    authMessage: "",
    authError: "",
    challenge: null,
    challengeTop: [],
    challengeLoading: false,
    challengeLoaded: false,
    challengeError: ""
  };

  const app = document.querySelector("#app");

  const routes = {
    home: renderHome,
    feed: renderFeed,
    publish: renderPublish,
    challenges: renderChallenges,
    rankings: renderRankings,
    profile: renderProfile,
    login: renderLogin,
    signup: renderSignup,
    profileSetup: renderProfileSetup,
    admin: renderAdmin
  };

  state.route = routeFromHash();

  function setRoute(route, options = {}) {
    route = resolveRoute(route);
    state.route = route;
    state.reportPunchline = null;
    state.reportSent = false;
    state.reportReason = "personal_attack";
    state.reportDetails = "";
    state.reportError = "";
    if (!options.keepAuthMessage) state.authMessage = "";
    if (!options.keepAuthError) state.authError = "";
    state.feedActionError = "";
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
    const protectedRoutes = ["publish", "profile", "profileSetup"];

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

    const result = await api.loadActiveCategories();

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

    const result = await api.getDailyChallenge();

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

    const result = await api.getRecentPunchlines(20);

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

    const result = await api.getFollowingPunchlines(20);

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

    const result = await api.getLeaderboard("day", 20);

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

    const result = await api.getProfileCounts();

    state.profileCountsLoading = false;
    state.profileCountsLoaded = true;
    state.profileCounts = result.ok ? result.counts : null;
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
        api.getProfileBadges(8),
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

  async function loadLeaderboard(force = false) {
    if (!api || state.leaderboardLoading || (state.leaderboardLoaded[state.rankingTab] && !force)) return;

    state.leaderboardLoading = true;
    state.leaderboardError = "";

    const result = await api.getLeaderboard(state.rankingTab, 50);

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

  async function loadAdminReports(force = false) {
    if (!api || state.adminLoading || (state.adminLoaded && !force)) return;

    const authState = getAuthState();
    if (!isStaffProfile(authState.profile)) return;

    state.adminLoading = true;
    state.adminError = "";

    const [pendingResult, moderatedResult] = await Promise.all([
      api.getPendingReports(),
      api.getModeratedPunchlines()
    ]);

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
    state.profileBadgesLoaded = false;
    state.profileBadges = [];
    state.profileBadgesError = "";
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

    return `
      <article class="badge-card badge-${escapeHtml(rarity)} badge-category-${escapeHtml(category)} badge-slug-${escapeHtml(slug)} badge-variant-${escapeHtml(variant)}${specialClass}${lockedClass}">
        <div class="badge-medallion" aria-hidden="true">
          <span>${escapeHtml(options.locked ? "🔒" : badgeIcon(badge.icon, badge))}</span>
        </div>
        <div class="badge-content">
          <div class="badge-title-row">
            <h3>${escapeHtml(badgeDisplayName(badge))}</h3>
            ${level ? `<span class="badge-level">${escapeHtml(level)}</span>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function renderProfileBadges() {
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

    return `
      <div class="badges-grid">
        ${state.profileBadges.map((badge) => BadgePill(badge)).join("")}
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
            (item) => `
              <button class="nav-item ${state.route === item.route ? "active" : ""} ${item.primary ? "primary-nav" : ""}" data-route="${item.route}">
                <span>${item.icon}</span>
                <small>${item.label}</small>
              </button>
            `
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
          <div>
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
            <strong>${escapeHtml(item.pseudo)}</strong>
            ${CategoryBadge(item.category)}
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

  function StatCard(stat) {
    return `
      <article class="stat-card">
        <span class="stat-icon">${escapeHtml(stat.icon || "✦")}</span>
        <strong>${escapeHtml(stat.value)}</strong>
        <span>${escapeHtml(stat.label)}</span>
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
          <button class="primary-button full" type="submit">Se connecter</button>
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
          <button class="primary-button full" type="submit">Créer mon compte</button>
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
          <button class="primary-button full" type="submit">${hasProfile ? "Enregistrer mon profil" : "Créer mon profil"}</button>
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
              <div>
                <span>${escapeHtml(item.pseudo)}</span>
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
    if (!state.leaderboardLoaded[state.rankingTab] && !state.leaderboardLoading) {
      setTimeout(() => loadLeaderboard(), 0);
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

    const createdAt = authState.profile.created_at
      ? new Date(authState.profile.created_at).toLocaleDateString("fr-FR")
      : "";
    const counts = state.profileCounts || { following: "—", followers: "—", punchlines: "—" };
    const email = authState.user?.email || "Email indisponible pour le moment";

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
          <div class="avatar">${escapeHtml(authState.profile.pseudo.slice(0, 2).toUpperCase())}</div>
          <div>
            <h3>${escapeHtml(authState.profile.pseudo)}</h3>
            <p>Pseudo public, vraie identité au vestiaire.</p>
          </div>
        </div>
        ${authState.profile.bio ? `<div class="profile-bio">${escapeHtml(authState.profile.bio)}</div>` : `<div class="profile-bio is-empty">Aucune bio pour l'instant.</div>`}
        <div class="stats-grid">
          ${StatCard({ icon: "→", value: String(counts.following), label: "suivis" })}
          ${StatCard({ icon: "←", value: String(counts.followers), label: "abonnés" })}
          ${StatCard({ icon: "✎", value: String(counts.punchlines), label: "punchlines" })}
        </div>
        <div class="profile-badges">
          <div class="section-heading compact-heading">
            <div>
              <h2>Badges</h2>
              <p>Les derniers badges obtenus sur MDRank.</p>
            </div>
          </div>
          ${renderProfileBadges()}
        </div>
        <div class="profile-actions">
          <button data-route="profileSetup">Modifier mon profil</button>
        </div>
      </section>
      <section class="profile-section private-section">
        <div class="section-heading">
          <div>
            <h2>Compte privé</h2>
            <p>Visible uniquement par toi.</p>
          </div>
          <span>Privé</span>
        </div>
        <div class="account-list">
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
          <button class="logout" data-sign-out>Déconnexion</button>
        </div>
      </section>
    `, { title: "Moi" });
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
    if (refreshRankingButton) refreshRankingButton.addEventListener("click", () => loadLeaderboard(true));

    const refreshAdminButton = document.querySelector("[data-refresh-admin]");
    if (refreshAdminButton) refreshAdminButton.addEventListener("click", () => loadAdminReports(true));

    const refreshChallengeButton = document.querySelector("[data-refresh-challenge]");
    if (refreshChallengeButton) refreshChallengeButton.addEventListener("click", () => loadDailyChallenge(true));

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

        const result = punchline?.followed
          ? await api.unfollowUser({ targetUserId })
          : await api.followUser({ targetUserId });

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

        const result = await api.castReaction({
          punchlineId,
          reactionType
        });

        state.reactionSubmittingKey = "";

        if (!result.ok) {
          state.feedActionError = result.message;
          render();
          return;
        }

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

        const result = await api.giveSuperNote({ punchlineId });

        state.superNoteSubmittingKey = "";

        if (!result.ok) {
          state.feedActionError = result.message;
          render();
          return;
        }

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

      const result = await api.reportPunchline({
        punchlineId: state.reportPunchline?.id,
        reason: state.reportReason,
        details: state.reportDetails.trim()
      });

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

        const result = await api.moderatePunchline({
          punchlineId,
          action,
          reason: "Modération MDRank"
        });

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

        const result = await api.moderateUser({
          targetUserId,
          action,
          reason: "Modération MDRank"
        });

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
      const result = await api.createPunchline({
        content: state.publishText.trim(),
        categoryId: category?.id || state.publishCategoryId,
        challengeId: state.publishChallengeId || null
      });

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
      state.challengeLoaded = false;
      resetLeaderboards();
      render();
    });

    const loginForm = document.querySelector("#login-form");
    if (loginForm) loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.authError = "";
      state.authMessage = "";
      const result = await auth.signIn({
        email: document.querySelector("#login-email").value,
        password: document.querySelector("#login-password").value
      });

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
      state.authError = "";
      state.authMessage = "";

      const password = document.querySelector("#signup-password").value;
      const passwordConfirm = document.querySelector("#signup-password-confirm").value;

      if (password !== passwordConfirm) {
        state.authError = "Les mots de passe ne correspondent pas.";
        render();
        return;
      }

      const result = await auth.signUp({
        email: document.querySelector("#signup-email").value,
        password,
        pseudo: document.querySelector("#signup-pseudo").value
      });

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
      state.authError = "";
      state.authMessage = "";

      const result = await auth.createOrUpdateProfile(
        document.querySelector("#profile-pseudo").value,
        document.querySelector("#profile-bio").value
      );

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
    auth.init().then(() => render());
  }

  render();
})();
