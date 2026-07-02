(function () {
  const data = window.MDRANK_DATA;
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
    feedLoading: false,
    feedLoaded: false,
    feedError: "",
    rankingTab: "day",
    reportPunchline: null,
    reportSent: false,
    publishText: "",
    publishCategoryId: "",
    publishCategories: [],
    publishCategoriesLoading: false,
    publishCategoriesLoaded: false,
    publishSubmitting: false,
    publishError: "",
    publishSuccess: "",
    published: false,
    authMessage: "",
    authError: ""
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

  function setRoute(route) {
    route = resolveRoute(route);
    state.route = route;
    state.reportPunchline = null;
    state.reportSent = false;
    state.authMessage = "";
    state.authError = "";
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
    const protectedRoutes = ["publish", "profile"];

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
    if (!state.publishCategoryId && state.publishCategories.length) {
      const defaultCategory = state.publishCategories.find((category) => category.slug === "punchline") || state.publishCategories[0];
      state.publishCategoryId = defaultCategory.id;
    }
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

  function getSelectedPublishCategory() {
    return state.publishCategories.find((category) => category.id === state.publishCategoryId) || null;
  }

  function validatePublish(authState) {
    const content = state.publishText.trim();

    if (!authState.isAuthenticated) return "Connecte-toi pour publier.";
    if (!authState.profile) return "Crée ton pseudo avant de publier.";
    if (!content) return "Ta punchline est trop courte.";
    if (content.length < 3) return "Ta punchline est trop courte.";
    if (content.length > 180) return "180 caractères max. Ici on frappe vite.";
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

  function SuperNoteButton(count, selected = false) {
    return `<button class="reaction-button super-note ${selected ? "is-selected" : ""}" type="button" aria-label="SuperNote">⭐ <strong>${count}</strong></button>`;
  }

  function ReactionBar(reactions, superNotes, selectedReaction = "") {
    const reactionClass = (name) => `reaction-button ${selectedReaction === name ? "is-selected" : ""}`;

    return `
      <div class="reaction-bar" aria-label="Reactions">
        <button class="${reactionClass("laugh")}" type="button">😂 <strong>${reactions.laugh}</strong></button>
        <button class="${reactionClass("fire")}" type="button">🔥 <strong>${reactions.fire}</strong></button>
        <button class="${reactionClass("skull")}" type="button">💀 <strong>${reactions.skull}</strong></button>
        <button class="${reactionClass("mind")}" type="button">🤯 <strong>${reactions.mind}</strong></button>
        ${SuperNoteButton(superNotes, selectedReaction === "super")}
      </div>
    `;
  }

  function PunchlineCard(punchline, compact = false) {
    return `
      <article class="punch-card">
        <div class="card-meta">
          <div>
            <strong>${escapeHtml(punchline.pseudo)}</strong>
            ${CategoryBadge(punchline.category)}
          </div>
          <button class="follow-button ${punchline.followed ? "is-following" : ""}" type="button">
            ${punchline.followed ? "Suivi" : "+ Suivre"}
          </button>
        </div>
        <p class="punch-text">“${escapeHtml(punchline.text)}”</p>
        ${ReactionBar(punchline.reactions, punchline.superNotes, punchline.selectedReaction)}
        ${ScoreBadge(punchline.score, punchline.position)}
        ${
          !compact
            ? `
          <div class="card-actions">
            <button class="ice-button" type="button">Pas ouf ? 🧊</button>
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
    return `
      <article class="ranking-item">
        <span class="rank-position">${item.position}</span>
        <div>
          <strong>${escapeHtml(item.pseudo)}</strong>
          <p>“${escapeHtml(item.text)}”</p>
          <div class="ranking-metrics">
            <span class="score-badge compact-score"><span class="score-spark">✦</span> Score ${item.score}</span>
            <span class="star-chip">⭐ ${item.superNotes}</span>
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

  function EmptyState(title, text) {
    return `
      <div class="empty-state">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  function ProfileHeader() {
    return `
      <section class="profile-header">
        <div class="avatar">TP</div>
        <div>
          <h2>${data.profile.pseudo}</h2>
          <p>${data.profile.rank}</p>
        </div>
      </section>
    `;
  }

  function ReportModal(punchline) {
    const reasons = [
      "Attaque une personne réelle",
      "Harcèlement",
      "Haine / discrimination",
      "Contenu sexuel ou violent",
      "Spam",
      "Autre"
    ];

    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <section class="report-modal">
          <button class="close-modal" type="button" data-close-report aria-label="Fermer">×</button>
          <h2 id="report-title">Signaler cette punchline</h2>
          ${
            state.reportSent
              ? `<div class="success-box">Merci. Le signalement a été envoyé.</div>`
              : `
                <p class="muted">Aide la modération à garder MDRank fun et clean.</p>
                <div class="reason-list">
                  ${reasons
                    .map(
                      (reason, index) => `
                        <label>
                          <input type="radio" name="reason" ${index === 0 ? "checked" : ""} />
                          <span>${reason}</span>
                        </label>
                      `
                    )
                    .join("")}
                </div>
                <button class="primary-button full" type="button" data-send-report>Envoyer le signalement</button>
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
        <p>Connecte-toi pour publier, voter plus tard et gérer ton pseudo MDRank.</p>
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

    return AppShell(`
      <section class="auth-card">
        <h2>Choisis ton pseudo</h2>
        <p>Pas de vrai nom public. Ton pseudo sera visible sur MDRank.</p>
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
          <button class="primary-button full" type="submit">Valider mon pseudo</button>
        </form>
      </section>
    `, { title: "Pseudo" });
  }

  function renderFeed() {
    if (!state.feedLoaded && !state.feedLoading) {
      setTimeout(() => loadFeed(), 0);
    }

    const filtered = state.feedTab === "following"
      ? []
      : state.feedTab === "top"
        ? [...state.feedItems].sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt))
        : state.feedItems;

    let content = "";
    if (state.feedLoading && !state.feedLoaded) {
      content = FeedSkeleton();
    } else if (state.feedError) {
      content = `
        <div class="empty-state">
          <strong>Feed en pause</strong>
          <p>${escapeHtml(state.feedError)}</p>
          <button class="secondary-button full" type="button" data-refresh-feed>Réessayer</button>
        </div>
      `;
    } else if (state.feedTab === "following") {
      content = EmptyState("Suivis bientôt prêts", "Le feed suivis sera branché quand les follows réels arriveront.");
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

    const count = state.publishText.length;
    const canPublish = !state.publishSubmitting
      && !state.publishCategoriesLoading
      && count >= 3
      && count <= 180
      && Boolean(state.publishCategoryId);
    const selectedCategory = getSelectedPublishCategory();
    const preview = {
      pseudo: authState.profile.pseudo,
      category: selectedCategory?.name || "Catégorie",
      text: state.publishText || "Ta punchline apparaîtra ici pendant que tu l'écris.",
      reactions: { laugh: 0, fire: 0, skull: 0, mind: 0, ice: 0 },
      superNotes: 0,
      score: 0,
      position: "Aperçu",
      followed: true
    };

    return AppShell(`
      <form class="publish-form">
        <div class="publish-help">Balance court. Frappe fort.</div>
        ${state.publishError ? `<div class="error-box">${escapeHtml(state.publishError)}</div>` : ""}
        ${state.publishSuccess ? `<div class="success-box">${escapeHtml(state.publishSuccess)}</div>` : ""}
        <label>
          Catégorie
          <select id="publish-category" ${state.publishCategoriesLoading ? "disabled" : ""}>
            <option value="">${state.publishCategoriesLoading ? "Chargement..." : "Choisis une catégorie"}</option>
            ${state.publishCategories.map((category) => `
              <option value="${category.id}" ${category.id === state.publishCategoryId ? "selected" : ""}>${escapeHtml(category.name)}</option>
            `).join("")}
          </select>
        </label>
        <label>
          Punchline
          <textarea id="publish-text" maxlength="180" placeholder="Écris court, net, efficace.">${escapeHtml(state.publishText)}</textarea>
        </label>
        <div class="form-row">
          <span class="${count > 180 ? "danger" : ""}">${count} / 180</span>
          <button class="primary-button" type="button" data-publish ${canPublish ? "" : "disabled"}>
            ${state.publishSubmitting ? "Publication..." : "Publier"}
          </button>
        </div>
      </form>
      <h2 class="section-title">Aperçu</h2>
      ${PunchlineCard(preview, true)}
      <div class="rules-box"><strong>Règles rapides</strong><span>Pas de vraie personne ciblée. Pas de nom réel. Pas d'attaque identifiable.</span></div>
    `, { title: "Publier une punchline" });
  }

  function renderChallenges() {
    return AppShell(`
      <section class="challenge-card">
        <span class="eyebrow">Thème du jour</span>
        <h2>${data.challenge.theme}</h2>
        <p><span>Temps restant</span> <strong>${data.challenge.timeLeft}</strong></p>
        <button class="primary-button" data-route="publish">Participer au défi</button>
      </section>
      <h2 class="section-title">Top 3 du défi</h2>
      <div class="ranking-list">
        ${data.challenge.top.map((item) => `
          <article class="challenge-rank">
            <strong>${item.position}</strong>
            <div>
              <span>${item.pseudo}</span>
              <p>“${escapeHtml(item.text)}”</p>
            </div>
            <em><span class="score-spark">✦</span> Score ${item.score}</em>
          </article>
        `).join("")}
      </div>
      <button class="secondary-button full" data-route="rankings">Voir tout le classement</button>
      <div class="challenge-note">Les meilleures punchlines du défi montent dans le Top du jour.</div>
    `, { title: "Défi du jour" });
  }

  function renderRankings() {
    return AppShell(`
      ${Tabs(
        [
          { label: "Jour", value: "day" },
          { label: "Semaine", value: "week" },
          { label: "Mois", value: "month" },
          { label: "SuperNotes", value: "stars" }
        ],
        state.rankingTab,
        "ranking"
      )}
      <div class="ranking-list">
        ${data.rankings.map(RankingItem).join("")}
      </div>
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

    return AppShell(`
      <section class="profile-header">
        <div class="avatar">${escapeHtml(authState.profile.pseudo.slice(0, 2).toUpperCase())}</div>
        <div>
          <h2>${escapeHtml(authState.profile.pseudo)}</h2>
          <p>Pseudo public</p>
        </div>
      </section>
      ${authState.profile.bio ? `<div class="profile-bio">${escapeHtml(authState.profile.bio)}</div>` : ""}
      ${createdAt ? `<div class="rules-box"><strong>Membre depuis</strong><span>${createdAt}</span></div>` : ""}
      <div class="profile-actions">
        <button data-route="profileSetup">Modifier pseudo / bio</button>
        <button class="logout" data-sign-out>Déconnexion</button>
      </div>
    `, { title: "Moi" });
  }

  function renderAdmin() {
    return AppShell(`
      <div class="admin-note">Page temporaire mockée, réservée à la modération visuelle du prototype.</div>
      <div class="card-list">
        ${data.reports.map((report) => `
          <article class="admin-card">
            <div class="card-meta">
              <strong>${report.pseudo}</strong>
              ${CategoryBadge(report.category)}
            </div>
            <p>“${report.text}”</p>
            <small>Motif : ${report.reason}</small>
            <div class="admin-actions">
              <button>Ignorer</button>
              <button>Masquer</button>
              <button class="danger-button">Supprimer</button>
            </div>
          </article>
        `).join("")}
      </div>
    `, { title: "Admin MDRank", action: `<button class="icon-text" data-route="feed">Feed</button>` });
  }

  function bindEvents() {
    document.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => setRoute(button.dataset.route));
    });

    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.tabTarget === "feed") state.feedTab = button.dataset.tab;
        if (button.dataset.tabTarget === "ranking") state.rankingTab = button.dataset.tab;
        render();
      });
    });

    document.querySelectorAll("[data-report]").forEach((button) => {
      button.addEventListener("click", () => {
        state.reportPunchline = state.feedItems.find((item) => String(item.id) === String(button.dataset.report)) || null;
        render();
      });
    });

    const refreshFeedButton = document.querySelector("[data-refresh-feed]");
    if (refreshFeedButton) refreshFeedButton.addEventListener("click", () => loadFeed(true));

    const closeReport = document.querySelector("[data-close-report]");
    if (closeReport) closeReport.addEventListener("click", () => {
      state.reportPunchline = null;
      state.reportSent = false;
      render();
    });

    const sendReport = document.querySelector("[data-send-report]");
    if (sendReport) sendReport.addEventListener("click", () => {
      state.reportSent = true;
      render();
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

      const result = await api.createPunchline({
        content: state.publishText.trim(),
        categoryId: state.publishCategoryId
      });

      state.publishSubmitting = false;

      if (!result.ok) {
        state.publishError = result.message;
        render();
        return;
      }

      state.publishText = "";
      state.published = true;
      state.publishSuccess = "Punchline publiée. Elle démarre à Score 0.";
      state.feedLoaded = false;
      state.feedItems = [];
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

      setRoute("profile");
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
    auth.subscribe(() => render());
    auth.init().then(() => render());
  }

  render();
})();
