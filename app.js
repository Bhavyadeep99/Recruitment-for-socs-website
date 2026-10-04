const app = document.querySelector("#app");
const navigationLinks = [...document.querySelectorAll(".topnav-link")];
const categories = ["All societies", "Technical", "Cultural", "Sports", "Literary"];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const systemTheme = matchMedia("(prefers-color-scheme: light)");
const themeToggle = document.querySelector("[data-theme-toggle]");
let activeCategory = "All societies";
let searchTerm = "";
let searchTimer;
let gridLoadingTimer;
let motionObserver;
let artworkCleanup;
let quizAnswers = Array(5).fill("");

const quizQuestions = [
  { prompt: "What would you most like to explore?", options: [["technology", "Technology"], ["art", "Visual art"], ["sports", "Sport"], ["writing", "Writing"], ["events", "Campus events"], ["music", "Music and dance"], ["reading", "Books and ideas"]] },
  { prompt: "Which kind of project sounds satisfying?", options: [["engineering", "Solving a technical challenge"], ["design", "Designing a visual identity"], ["competition", "Training for a competition"], ["publishing", "Publishing a new issue"], ["organizing", "Organizing a campus event"], ["rehearsal", "Preparing a performance"], ["discussion", "Hosting a discussion"]] },
  { prompt: "What do you bring to a team?", options: [["making", "I like making things"], ["creative", "A creative point of view"], ["teamwork", "Team energy"], ["editing", "A careful editorial eye"], ["community", "A welcoming spirit"], ["performance", "Confidence on stage"], ["books", "A love of reading"]] },
  { prompt: "Which outcome would you be proud of?", options: [["electronics", "A working prototype"], ["exhibitions", "A memorable exhibition"], ["movement", "A stronger sports team"], ["writing", "A story in print"], ["events", "A great campus gathering"], ["dance", "A polished performance"], ["reading", "A thoughtful reading group"]] },
  { prompt: "Choose the atmosphere you prefer.", options: [["collaboration", "Collaborative problem-solving"], ["art", "Open-ended experimentation"], ["sports", "Fast-paced and competitive"], ["publishing", "Focused and detail-oriented"], ["creative", "Social and creative"], ["music", "Expressive and energetic"], ["discussion", "Curious and reflective"]] }
];

const quizInterestLabels = new Map(quizQuestions.flatMap((question) => question.options).map(([value, label]) => [value, label]));

function applyTheme(theme, persist = false) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  themeToggle?.setAttribute("aria-pressed", String(isLight));
  themeToggle?.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isLight ? "#f2f4ed" : "#080b13");
  if (persist) {
    try {
      localStorage.setItem("nsut-theme", theme);
    } catch {
      // Storage can be unavailable for local files or private browsing.
    }
  }
}

let storedTheme = "";
try {
  storedTheme = localStorage.getItem("nsut-theme") || "";
} catch {
  storedTheme = "";
}
applyTheme(storedTheme || (systemTheme.matches ? "light" : "dark"));
themeToggle?.addEventListener("click", () => applyTheme(document.body.classList.contains("light-theme") ? "dark" : "light", true));
systemTheme.addEventListener("change", (event) => {
  try {
    if (!localStorage.getItem("nsut-theme")) applyTheme(event.matches ? "light" : "dark");
  } catch {
    applyTheme(event.matches ? "light" : "dark");
  }
});

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function societyLogo(society) {
  return `<svg class="society-logo" style="view-transition-name:society-${society.id}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#logo-${society.id}"></use></svg>`;
}

function formatDeadline(deadline) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(new Date(deadline));
}

function deadlineLabel(deadline) {
  const remaining = new Date(deadline).getTime() - Date.now();
  if (remaining <= 0) return "Applications closed";
  const days = Math.ceil(remaining / 86400000);
  return days === 1 ? "Closes tomorrow" : `Closes in ${days} days`;
}

function deadlineCountdown(deadline) {
  const remainingMinutes = Math.ceil((new Date(deadline).getTime() - Date.now()) / 60000);
  if (remainingMinutes <= 0) return "Applications closed";
  const days = Math.floor(remainingMinutes / 1440);
  const hours = Math.floor((remainingMinutes % 1440) / 60);
  const minutes = remainingMinutes % 60;
  return `Closes in ${days}d ${hours}h ${minutes}m`;
}

function updateCountdowns() {
  app.querySelectorAll("[data-deadline-countdown]").forEach((element) => {
    element.textContent = deadlineCountdown(element.dataset.deadlineCountdown);
  });
}

setInterval(updateCountdowns, 60000);

function applicationHash(society, role) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return `#society/${society.id}/apply${query}`;
}

function societyCard(society, index) {
  return `
    <a class="society-card" href="#society/${society.id}" aria-label="Explore ${escapeHTML(society.name)}" style="--card-order:${index}">
      <div class="card-topline"><span>${escapeHTML(society.category)}</span><span class="card-arrow" aria-hidden="true">↗</span></div>
      <div class="society-mark mark-${society.color}" aria-hidden="true">${societyLogo(society)}</div>
      <h3>${escapeHTML(society.name)}</h3>
      <p>${escapeHTML(society.tagline)}</p>
      <div class="card-footer"><span>${escapeHTML(society.members)}</span><span class="card-deadline" data-deadline-countdown="${escapeHTML(society.deadline)}">${escapeHTML(deadlineCountdown(society.deadline))}</span></div>
    </a>`;
}

function societySkeleton(index) {
  return `<div class="society-skeleton" aria-hidden="true" style="--card-order:${index}"><span></span><span></span><span></span></div>`;
}

function filteredSocieties() {
  const query = searchTerm.trim().toLocaleLowerCase();
  return SOCIETIES.filter((society) => {
    const categoryMatches = activeCategory === "All societies" || society.category === activeCategory;
    const searchable = `${society.name} ${society.category} ${society.tagline} ${society.description} ${society.roles.map((role) => role.title).join(" ")}`.toLocaleLowerCase();
    return categoryMatches && searchable.includes(query);
  });
}

function renderSocietyResults() {
  const results = filteredSocieties();
  const resultsLine = app.querySelector(".results-line");
  const grid = app.querySelector(".society-grid");
  const emptyState = app.querySelector(".empty-state");
  if (!resultsLine || !grid || !emptyState) return;

  resultsLine.querySelector(".results-count").textContent = results.length
    ? `SHOWING ${String(results.length).padStart(2, "0")} OF ${String(SOCIETIES.length).padStart(2, "0")} SOCIETIES`
    : "NO SOCIETIES FOUND";
  grid.innerHTML = results.map(societyCard).join("");
  grid.setAttribute("aria-busy", "false");
  emptyState.hidden = results.length > 0;
  app.querySelectorAll("[data-category]").forEach((button) => {
    const isActive = button.dataset.category === activeCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  observeCards(grid);
  updateCountdowns();
}

function updateQuizProgress() {
  const progress = app.querySelector("[data-quiz-progress]");
  if (progress) progress.textContent = `${quizAnswers.filter(Boolean).length} / ${quizQuestions.length} answered`;
  renderQuizResults();
}

function renderQuizResults() {
  const output = app.querySelector(".quiz-results");
  if (!output) return;
  const answers = quizAnswers.filter(Boolean);
  if (answers.length < quizQuestions.length) {
    output.hidden = true;
    output.innerHTML = "";
    return;
  }

  const ranked = SOCIETIES.map((society) => {
    const reasons = answers.filter((answer) => society.interests.includes(answer));
    return { society, reasons, score: reasons.length };
  }).sort((left, right) => right.score - left.score || left.society.name.localeCompare(right.society.name)).slice(0, 3);

  output.innerHTML = `<p class="quiz-results-heading">Your strongest matches</p><div class="quiz-match-grid">${ranked.map(({ society, reasons, score }) => {
    const reason = reasons.length
      ? `Matches your interests in ${reasons.slice(0, 3).map((interest) => escapeHTML(quizInterestLabels.get(interest) || interest)).join(", ")}.`
      : "No direct interest tags matched. Compare its roles and description to decide if it still fits.";
    return `<article class="quiz-match"><div class="quiz-match-mark mark-${society.color}">${societyLogo(society)}</div><p class="quiz-match-score">${score} / ${quizQuestions.length} MATCHES</p><h3>${escapeHTML(society.name)}</h3><p>${reason}</p><a class="text-button" href="#society/${society.id}">Explore society <span aria-hidden="true">↗</span></a></article>`;
  }).join("")}</div>`;
  output.hidden = false;
}

function renderQuiz() {
  return `<section class="find-section" id="find" aria-labelledby="find-title"><div class="find-heading"><p class="eyebrow">A QUICK MATCH</p><h2 id="find-title">Find your <em>people.</em></h2><p>Five quick picks. Three societies to explore.</p></div><form class="society-quiz">${quizQuestions.map((question, index) => `<fieldset class="quiz-question"><legend><span>${String(index + 1).padStart(2, "0")}</span>${escapeHTML(question.prompt)}</legend><div class="quiz-options">${question.options.map(([value, label]) => `<label class="quiz-option"><input type="radio" name="quiz-${index}" value="${escapeHTML(value)}" ${quizAnswers[index] === value ? "checked" : ""}><span>${escapeHTML(label)}</span></label>`).join("")}</div></fieldset>`).join("")}<div class="quiz-progress"><span data-quiz-progress>${quizAnswers.filter(Boolean).length} / ${quizQuestions.length} answered</span><button class="text-button" type="reset">Start over</button></div></form><div class="quiz-results" hidden></div></section>`;
}

function observeCards(grid) {
  const cards = grid.querySelectorAll(".society-card");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("motion-visible"));
    return;
  }
  cards.forEach((card, index) => {
    card.classList.add("motion-reveal");
    card.style.setProperty("--reveal-order", String(index));
    motionObserver?.observe(card);
  });
  revealTargetsInView();
}

function initializePageMotion() {
  motionObserver?.disconnect();
  const targets = app.querySelectorAll(".hero-copy, .hero-stage, .section-heading, .results-line, .society-card, .closing-note, .detail-hero, .detail-block, .apply-aside, .application-section");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("motion-visible"));
    return;
  }
  motionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("motion-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  targets.forEach((target, index) => {
    target.classList.add("motion-reveal");
    target.style.setProperty("--reveal-order", String(index));
    motionObserver.observe(target);
  });
  revealTargetsInView();
}

function revealTargetsInView() {
  app.querySelectorAll(".motion-reveal:not(.motion-visible)").forEach((target) => {
    const bounds = target.getBoundingClientRect();
    if (bounds.top >= window.innerHeight * 0.95 || bounds.bottom <= 0) return;
    target.classList.add("motion-visible");
    motionObserver?.unobserve(target);
  });
}

function initializeClosingArtwork() {
  artworkCleanup?.();
  const canvas = app.querySelector(".closing-artwork");
  if (!canvas) return;
  const section = canvas.closest(".closing-note");
  const context = canvas.getContext("2d");
  if (!context) return;

  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const points = Array.from({ length: 18 }, (_, index) => ({
    angle: index / 18 * Math.PI * 2,
    ring: index % 3,
    speed: (index % 2 ? 1 : -1) * (0.035 + index % 4 * 0.008),
    phase: index * 1.71
  }));
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let pointerX = -1000;
  let pointerY = -1000;
  let frame = 0;
  let visible = false;
  let reduced = preference.matches;

  function draw(time) {
    context.clearRect(0, 0, width, height);
    const centerX = width * 0.82;
    const centerY = height * 0.5;
    [0.12, 0.2, 0.29].forEach((ring, index) => {
      context.beginPath();
      context.ellipse(centerX, centerY, width * ring, height * (0.26 + index * 0.16), time * (index % 2 ? -0.025 : 0.018), 0, Math.PI * 2);
      context.strokeStyle = index === 1 ? "#d8ff6330" : "#9aafff28";
      context.setLineDash(index === 1 ? [2, 9] : []);
      context.stroke();
    });
    context.setLineDash([]);

    const orbitPoints = points.map((point) => {
      const angle = point.angle + time * point.speed;
      const x = centerX + Math.cos(angle) * width * (0.12 + point.ring * 0.085);
      const y = centerY + Math.sin(angle) * height * (0.26 + point.ring * 0.16);
      const distance = Math.hypot(x - pointerX, y - pointerY);
      const force = distance < 150 ? (150 - distance) / 150 : 0;
      return { x: x + (x - pointerX) * force * 0.13, y: y + (y - pointerY) * force * 0.13, phase: point.phase };
    });
    orbitPoints.forEach((point, index) => {
      [1, 4].forEach((step) => {
        const next = orbitPoints[(index + step) % orbitPoints.length];
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(next.x, next.y);
        context.strokeStyle = step === 1 ? "#9aafff20" : "#ff795e19";
        context.stroke();
      });
      context.beginPath();
      context.arc(point.x, point.y, 1.5 + (Math.sin(time * 1.8 + point.phase) + 1) * 1.15, 0, Math.PI * 2);
      context.fillStyle = index % 5 === 0 ? "#d8ff63b0" : "#a9bbff80";
      context.fill();
    });

    const signal = time * 0.22;
    context.beginPath();
    context.arc(centerX + Math.cos(signal) * width * 0.2, centerY + Math.sin(signal) * height * 0.42, 3, 0, Math.PI * 2);
    context.fillStyle = "#d8ff63";
    context.shadowColor = "#d8ff63";
    context.shadowBlur = 15;
    context.fill();
    context.shadowBlur = 0;
  }

  function resize() {
    const bounds = section.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(reduced ? 0 : performance.now() / 1000);
  }

  function animate(timestamp) {
    frame = 0;
    if (!visible || reduced || document.hidden) return;
    draw(timestamp / 1000);
    frame = requestAnimationFrame(animate);
  }

  function start() {
    if (visible && !reduced && !document.hidden && !frame) frame = requestAnimationFrame(animate);
  }

  function visibilityChanged(entries) {
    visible = entries.some((entry) => entry.isIntersecting);
    if (!visible && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      start();
    }
  }

  function motionChanged(event) {
    reduced = event.matches;
    if (reduced && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (reduced) draw(0);
    else start();
  }

  function pointerMoved(event) {
    const bounds = section.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
  }

  function pointerLeft() {
    pointerX = -1000;
    pointerY = -1000;
  }

  function documentVisibilityChanged() {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      start();
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(visibilityChanged, { threshold: 0.01 });
  resizeObserver.observe(section);
  intersectionObserver.observe(section);
  preference.addEventListener("change", motionChanged);
  document.addEventListener("visibilitychange", documentVisibilityChanged);
  section.addEventListener("pointermove", pointerMoved, { passive: true });
  section.addEventListener("pointerleave", pointerLeft);
  resize();

  artworkCleanup = () => {
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    preference.removeEventListener("change", motionChanged);
    document.removeEventListener("visibilitychange", documentVisibilityChanged);
    section.removeEventListener("pointermove", pointerMoved);
    section.removeEventListener("pointerleave", pointerLeft);
  };
}

function renderHome() {
  app.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="eyebrow-dot"></span> NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY</p>
        <h1 id="hero-title">NSUT Society<br><span>Recruitment</span></h1>
        <p class="hero-description">Explore student societies at NSUT, find a team that interests you, and apply to be part of campus life.</p>
        <a class="hero-link" href="#societies">View societies <span aria-hidden="true">↓</span></a>
      </div>
      <div class="hero-stage" aria-hidden="true">
        <div class="stage-coordinate">28.6094° N<br>77.0373° E</div>
        <svg class="stage-traces" viewBox="0 0 600 560" fill="none">
          <path class="trace trace-a" d="M300 64 300 206 190 276 190 418" />
          <path class="trace trace-b" d="M300 206 420 276 420 418" />
          <path class="trace trace-c" d="M190 276 300 346 420 276" />
          <path class="trace trace-d" d="M300 346 300 496" />
          <path class="trace trace-e" d="M108 155h72l44 44m196 0 44-44h48" />
          <path class="trace trace-f" d="M107 454h48l35-36m230 0 35 36h47" />
          <path class="trace-axis" d="M300 24v510M72 276h456" />
        </svg>
        <div class="stage-core"><span>NSUT</span></div>
        <div class="stage-node stage-node-code"><span class="stage-node-mark"><svg viewBox="0 0 64 64"><use href="#logo-coding-club"></use></svg></span><small>01 / BUILD</small></div>
        <div class="stage-node stage-node-art"><span class="stage-node-mark"><svg viewBox="0 0 64 64"><use href="#logo-fine-arts-society"></use></svg></span><small>02 / MAKE</small></div>
        <div class="stage-node stage-node-sport"><span class="stage-node-mark"><svg viewBox="0 0 64 64"><use href="#logo-sports-committee"></use></svg></span><small>03 / PLAY</small></div>
        <div class="stage-node stage-node-music"><span class="stage-node-mark"><svg viewBox="0 0 64 64"><use href="#logo-music-and-dance-society"></use></svg></span><small>04 / PERFORM</small></div>
        <div class="stage-stamp">FIND<br>YOUR<br>PEOPLE<span>✳</span></div>
        <div class="stage-footer"><span>NSUT · ${new Date().getFullYear()}</span><span>${String(SOCIETIES.length).padStart(2, "0")} SOCIETIES / MANY WAYS IN</span></div>
      </div>
    </section>
    <section class="discovery-section" id="societies" aria-labelledby="societies-title">
      <div class="section-heading">
        <div><p class="eyebrow">EXPLORE THE CLUBS</p><h2 id="societies-title">NSUT <em>societies</em></h2></div>
        <p class="section-aside">Find a society, see its open teams,<br>and send a short application.</p>
      </div>
      <div class="discovery-tools">
        <div class="filter-list" role="group" aria-label="Filter societies by category">
          ${categories.map((category) => `<button class="filter-chip${activeCategory === category ? " is-active" : ""}" data-category="${escapeHTML(category)}" type="button" aria-pressed="${activeCategory === category}">${escapeHTML(category)}</button>`).join("")}
        </div>
        <label class="search-box" for="society-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><span class="sr-only">Search societies</span><input id="society-search" type="search" placeholder="Find your thing..." value="${escapeHTML(searchTerm)}" autocomplete="off"></label>
      </div>
      <div class="results-line" aria-live="polite" aria-atomic="true"><span class="results-count"></span><span>TAKE A LOOK AROUND <span aria-hidden="true">↘</span></span></div>
      <div class="society-grid" aria-busy="true">${Array.from({ length: SOCIETIES.length }, (_, index) => societySkeleton(index)).join("")}</div>
      <div class="empty-state" hidden><span aria-hidden="true">⌕</span><h3>Nothing here just yet.</h3><p>Try another search or clear your filters to see the full list.</p><button class="text-button" type="button" data-reset-filters>Show all societies <span aria-hidden="true">↗</span></button></div>
    </section>
    ${renderQuiz()}
    <section class="closing-note" id="how-it-works" aria-labelledby="closing-title"><canvas class="closing-artwork" aria-hidden="true"></canvas><div class="closing-spark" aria-hidden="true">✳</div><p class="eyebrow">HOW TO JOIN</p><h2 id="closing-title">Choose a society.<br><em>Apply to a team.</em></h2><p>Open a society to read about it and choose one of its open roles.</p><a class="text-button" href="#societies">Browse societies <span aria-hidden="true">↗</span></a></section>
  `;
  clearTimeout(gridLoadingTimer);
  gridLoadingTimer = setTimeout(renderSocietyResults, 180);
  renderQuizResults();
  initializePageMotion();
  initializeClosingArtwork();
}

function formField({ id, name = id, label, type = "text", autocomplete = "off", placeholder = "", attributes = "", describedBy = `${id}-error` }) {
  return `<label class="form-field" for="${id}"><span>${label}</span><input id="${id}" name="${name}" type="${type}" autocomplete="${autocomplete}" placeholder="${placeholder}" aria-describedby="${describedBy}" ${attributes}><small class="field-error" id="${id}-error" hidden></small></label>`;
}

function selectField({ id, name = id, label, options }) {
  const markup = options.map((option) => `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join("");
  return `<label class="form-field" for="${id}"><span>${label}</span><select id="${id}" name="${name}" aria-describedby="${id}-error" required>${markup}</select><small class="field-error" id="${id}-error" hidden></small></label>`;
}

function renderApplicationForm(society, selectedRole) {
  const roleOptions = [{ value: "", label: "Choose a role" }, ...society.roles.map((role) => ({ value: role.title, label: role.title }))];
  const yearOptions = [{ value: "", label: "Choose a year" }, ...["First year", "Second year", "Third year", "Fourth year", "Postgraduate"].map((year) => ({ value: year, label: year }))];
  const isDemo = !document.body.dataset.applicationEndpoint?.trim();
  return `
    <section class="application-section" id="apply" aria-labelledby="application-title">
      <div class="application-intro"><p class="eyebrow">YOUR TURN</p><h2 id="application-title">Start a <em>conversation.</em></h2><p>Tell the ${escapeHTML(society.name)} team a little about yourself and the role you want to explore.</p><div class="form-aside-note"><span aria-hidden="true">✳</span><p>Your application details are sent only when an endpoint is configured and you submit.</p></div></div>
      <form id="application-form" class="application-form" novalidate data-society-id="${society.id}">
        <input type="hidden" name="society" value="${escapeHTML(society.name)}">
        <div class="honeypot" aria-hidden="true"><label for="company-website">Leave this field empty</label><input id="company-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="form-row">
          ${formField({ id: "applicant-name", name: "name", label: "Your name", autocomplete: "name", placeholder: "Full name", attributes: "required minlength=2 maxlength=100" })}
          ${formField({ id: "applicant-email", name: "email", label: "Email address", type: "email", autocomplete: "email", placeholder: "you@example.com", attributes: "required maxlength=254" })}
        </div>
        <div class="form-row">
          ${formField({ id: "applicant-phone", name: "phone", label: "Phone number", type: "tel", autocomplete: "tel", placeholder: "+91 98765 43210", attributes: 'required inputmode="tel" pattern="[+0-9() -]{7,24}" maxlength="24"' })}
          ${formField({ id: "applicant-roll", name: "rollNumber", label: "University roll number", placeholder: "Your NSUT roll number", attributes: 'required minlength="4" maxlength="32" pattern="[A-Za-z0-9/-]{4,32}"' })}
        </div>
        <div class="form-row">
          ${selectField({ id: "applicant-year", name: "year", label: "Year of study", options: yearOptions })}
          ${formField({ id: "applicant-branch", name: "branch", label: "Branch / course", autocomplete: "organization-title", placeholder: "e.g. Computer Science", attributes: "required minlength=2 maxlength=100" })}
        </div>
        <div class="form-row">
          ${selectField({ id: "applicant-role", name: "role", label: "Role you have in mind", options: roleOptions })}
          <div class="form-field role-note"><span>Applying to</span><p>${escapeHTML(society.name)}</p></div>
        </div>
        <label class="form-field" for="applicant-why"><span>What makes you curious about us?</span><textarea id="applicant-why" name="why" rows="4" placeholder="A thought, a story, a small reason. Anything is a good place to start." aria-describedby="why-help why-count applicant-why-error" required minlength="30" maxlength="700"></textarea><span class="field-help" id="why-help">Please write between 30 and 700 characters.</span><small class="field-error" id="applicant-why-error" hidden></small><span class="character-count" id="why-count">0 / 700</span></label>
        <div class="form-submit-row"><p class="demo-mode"${isDemo ? "" : " hidden"}>Demo mode · no application endpoint configured</p><button class="apply-button submit-button" type="submit"><span class="button-label">Send application</span><span aria-hidden="true">↗</span></button></div>
        <p class="form-status" tabindex="-1" hidden></p>
      </form>
    </section>`;
}

function renderDetail(society, isApply, selectedRole) {
  const isOpen = Date.now() < new Date(society.deadline).getTime();
  const roleRows = society.roles.map((role, index) => `<article class="role-row"><span class="role-number">${String(index + 1).padStart(2, "0")}</span><div class="role-copy"><span class="role-type">${escapeHTML(role.type)}</span><h3>${escapeHTML(role.title)}</h3><p>${escapeHTML(role.description)}</p></div><a class="role-apply" href="${applicationHash(society, role.title)}" aria-label="Apply for ${escapeHTML(role.title)} at ${escapeHTML(society.name)}">↗</a></article>`).join("");
  app.innerHTML = `
    <section class="detail-page">
      <a class="back-link" href="#societies"><span aria-hidden="true">←</span> All societies</a>
      <div class="detail-hero">
        <div class="detail-title-block"><p class="eyebrow"><span class="eyebrow-dot"></span> ${escapeHTML(society.category.toUpperCase())}</p><h1>${escapeHTML(society.name)}<span class="title-period">.</span></h1><p class="detail-tagline">${escapeHTML(society.tagline)}</p></div>
        <div class="detail-emblem mark-${society.color}" aria-hidden="true">${societyLogo(society)}</div>
        <div class="detail-meta"><span>${escapeHTML(society.members)}</span><span class="meta-divider"></span><span data-deadline-countdown="${escapeHTML(society.deadline)}">${escapeHTML(deadlineCountdown(society.deadline))}</span></div>
      </div>
      <div class="detail-content">
        <div class="detail-main-column">
          <section class="detail-block"><p class="eyebrow">A LITTLE ABOUT US</p><p class="detail-description">${escapeHTML(society.description)}</p></section>
          <section class="detail-block criteria-block"><div class="block-heading"><p class="eyebrow">WHAT WE'RE LOOKING FOR</p><span class="block-index">01 — ${String(society.criteria.length).padStart(2, "0")}</span></div><ul class="criteria-list">${society.criteria.map((criterion, index) => `<li><span class="criterion-number">${String(index + 1).padStart(2, "0")}</span><span>${escapeHTML(criterion)}</span></li>`).join("")}</ul></section>
          <section class="detail-block roles-block"><div class="block-heading"><div><p class="eyebrow">OPEN ROLES</p><h2>Find your <em>part.</em></h2></div><span class="role-count">${String(society.roles.length).padStart(2, "0")} OPENINGS</span></div><div class="role-list">${roleRows}</div></section>
        </div>
        <aside class="apply-aside"><div class="aside-topline"><span>THE NEXT STEP</span><span aria-hidden="true">✳</span></div><p class="aside-deadline">${isOpen ? `Applications close ${formatDeadline(society.deadline)} · ` : "This recruitment round has closed"}${isOpen ? `<span data-deadline-countdown="${escapeHTML(society.deadline)}">${escapeHTML(deadlineCountdown(society.deadline))}</span>` : ""}</p><h2>${isOpen ? "This could be" : "Stay in the"}<br><em>${isOpen ? "your thing." : "loop."}</em></h2><p>${isOpen ? "Choose a role and tell us what interests you." : "Keep exploring societies and watch for their next round."}</p>${isOpen ? `<a class="apply-button" href="${applicationHash(society, "")}">Apply to join <span aria-hidden="true">↗</span></a>` : `<a class="apply-button" href="#societies">See other societies <span aria-hidden="true">↗</span></a>`}<div class="aside-footnote"><span class="footnote-dot"></span> No experience needed. Just you.</div></aside>
      </div>
        ${isOpen ? renderApplicationForm(society) : ""}
    </section>`;
  const roleSelect = app.querySelector("#applicant-role");
  if (roleSelect && selectedRole && society.roles.some((role) => role.title === selectedRole)) {
    roleSelect.value = selectedRole;
  }
  updateCountdowns();
}

function renderNotFound() {
  app.innerHTML = `<section class="not-found"><p class="eyebrow">404 / NOT FOUND</p><h1>This page wandered off.</h1><p>That society route does not exist. Go back to the directory to find your team.</p><a class="apply-button" href="#societies">Browse societies <span aria-hidden="true">↗</span></a></section>`;
}

function parseRoute() {
  const hash = location.hash.slice(1);
  const queryIndex = hash.indexOf("?");
  const pathname = queryIndex < 0 ? hash : hash.slice(0, queryIndex);
  const query = new URLSearchParams(queryIndex < 0 ? "" : hash.slice(queryIndex + 1));
  let parts;
  try {
    parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return { view: "not-found" };
  }
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "home")) return { view: "home" };
  if (parts.length === 1 && ["societies", "how-it-works"].includes(parts[0])) return { view: "home", section: parts[0] };
  if (parts[0] !== "society" || parts.length < 2 || parts.length > 3) return { view: "not-found" };
  const society = SOCIETIES.find((item) => item.id === parts[1]);
  if (!society || (parts.length === 3 && parts[2] !== "apply")) return { view: "not-found" };
  return { view: parts[2] === "apply" ? "application" : "society", society, role: query.get("role") || "" };
}

function updateDocumentState(route) {
  if (route.view === "society") document.title = `${route.society.name} | NSUT Society Recruitment`;
  else if (route.view === "application") document.title = `Apply to ${route.society.name} | NSUT Society Recruitment`;
  else if (route.view === "not-found") document.title = "Page not found | NSUT Society Recruitment";
  else document.title = "NSUT Society Recruitment";
  const active = ["society", "application"].includes(route.view)
    ? "societies"
    : route.section === "how-it-works" ? "about" : route.section === "societies" ? "societies" : "home";
  navigationLinks.forEach((link) => {
    const isCurrent = link.dataset.nav === active;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function afterNavigation(route, shouldFocus) {
  if (shouldFocus) app.focus({ preventScroll: true });
  updateMobileActionBar(route);
  requestAnimationFrame(() => {
    if (route.view === "application") app.querySelector("#apply")?.scrollIntoView({ block: "start" });
    else if (route.section) document.getElementById(route.section)?.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  });
}

function updateMobileActionBar(route) {
  const bar = document.querySelector("[data-mobile-action-bar]");
  if (!bar) return;
  if (route.view === "not-found") {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const primary = bar.querySelector("[data-mobile-primary]");
  const secondary = bar.querySelector("[data-mobile-secondary]");
  const submit = bar.querySelector("[data-mobile-submit]");
  secondary.href = "#societies";
  secondary.textContent = route.view === "home" ? "Societies" : "All societies";
  submit.hidden = route.view !== "application";
  primary.hidden = route.view === "application";
  if (route.view === "home") {
    primary.href = "#find";
    primary.textContent = "Find my society";
  } else if (route.view === "application") {
    primary.href = "#apply";
    primary.textContent = "Back to application";
  } else if (Date.now() < new Date(route.society.deadline).getTime()) {
    primary.href = applicationHash(route.society, "");
    primary.textContent = "Apply to join";
  } else {
    primary.href = "#societies";
    primary.textContent = "Explore societies";
  }
}

function renderRoute(shouldFocus = false) {
  clearTimeout(searchTimer);
  motionObserver?.disconnect();
  artworkCleanup?.();
  artworkCleanup = null;
  const route = parseRoute();
  const update = () => {
    if (route.view === "home") renderHome();
    else if (route.view === "not-found") renderNotFound();
    else renderDetail(route.society, route.view === "application", route.role);
    updateDocumentState(route);
    initializePageMotion();
  };
  const finish = () => afterNavigation(route, shouldFocus);

  if (shouldFocus && typeof document.startViewTransition === "function" && !reducedMotion.matches) {
    document.startViewTransition(update).updateCallbackDone.then(finish);
  } else {
    update();
    finish();
  }
}

function validateField(field, society) {
  const error = app.querySelector(`#${CSS.escape(field.id)}-error`);
  const value = field.value.trim();
  let message = "";
  if (field.required && !value) message = "This field is required.";
  else if (field.name === "email" && !field.validity.valid) message = "Enter a valid email address.";
  else if (field.name === "phone") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) message = "Enter a phone number with 8 to 15 digits.";
  } else if (field.name === "rollNumber" && !/^[A-Za-z0-9/-]{4,32}$/.test(value)) message = "Use 4 to 32 letters, numbers, slashes or hyphens.";
  else if (field.name === "name" && value.length < 2) message = "Enter at least 2 characters.";
  else if (field.name === "branch" && value.length < 2) message = "Enter a little more detail.";
  else if (field.name === "role" && !society.roles.some((role) => role.title === value)) message = "Choose a role offered by this society.";
  else if (field.name === "why" && value.length < 30) message = "Please write at least 30 characters.";
  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
  if (message) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
  return !message;
}

function setFormStatus(form, message, state) {
  const status = form.querySelector(".form-status");
  status.textContent = message;
  status.dataset.state = state;
  status.hidden = false;
  status.focus({ preventScroll: true });
}

async function submitApplication(form) {
  const society = SOCIETIES.find((item) => item.id === form.dataset.societyId);
  const button = form.querySelector(".submit-button");
  const label = button.querySelector(".button-label");
  const fields = [...form.querySelectorAll("input:not([type=hidden]), select, textarea")].filter((field) => field.name !== "website");
  if (!fields.map((field) => validateField(field, society)).every(Boolean)) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  if (form.elements.website.value) return;

  const endpoint = document.body.dataset.applicationEndpoint?.trim() || "";
  if (!endpoint) {
    const demoApplication = Object.fromEntries(new FormData(form).entries());
    delete demoApplication.website;
    console.log("Society application demo (not sent):", demoApplication);
    setFormStatus(form, "Demo mode: your details passed validation, but nothing was sent. Configure an endpoint to receive applications.", "demo");
    return;
  }
  let target;
  try {
    target = new URL(endpoint, location.href);
  } catch {
    setFormStatus(form, "The application endpoint URL is invalid. Check its configuration and try again.", "error");
    return;
  }
  if (target.protocol !== "https:") {
    setFormStatus(form, "The application endpoint must use HTTPS.", "error");
    return;
  }

  const payload = new URLSearchParams();
  new FormData(form).forEach((value, key) => {
    if (key !== "website") payload.append(key, value);
  });
  payload.set("_subject", `Application for ${society.name}`);
  form.setAttribute("aria-busy", "true");
  button.disabled = true;
  label.textContent = "Sending application…";
  form.querySelector(".form-status").hidden = true;
  try {
    const response = await fetch(target, { method: "POST", headers: { Accept: "application/json" }, body: payload });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    form.reset();
    form.querySelector(".character-count").textContent = "0 / 700";
    setFormStatus(form, "Application sent successfully. Thank you for applying.", "success");
  } catch {
    setFormStatus(form, "We could not send your application. Check your connection or try again later.", "error");
  } finally {
    form.removeAttribute("aria-busy");
    button.disabled = false;
    label.textContent = "Send application";
  }
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const chip = event.target.closest("[data-category]");
  if (chip) {
    activeCategory = chip.dataset.category;
    renderSocietyResults();
    chip.focus();
    return;
  }
  if (event.target.closest("[data-reset-filters]")) {
    activeCategory = "All societies";
    searchTerm = "";
    const input = app.querySelector("#society-search");
    input.value = "";
    renderSocietyResults();
    input.focus();
  }
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('.society-quiz input[type="radio"]')) return;
  const questionIndex = Number(input.name.replace("quiz-", ""));
  if (Number.isInteger(questionIndex) && questionIndex >= 0 && questionIndex < quizAnswers.length) {
    quizAnswers[questionIndex] = input.value;
    updateQuizProgress();
  }
});

document.addEventListener("reset", (event) => {
  if (!(event.target instanceof HTMLFormElement) || !event.target.matches(".society-quiz")) return;
  quizAnswers = Array(quizQuestions.length).fill("");
  setTimeout(updateQuizProgress, 0);
});

document.addEventListener("pointermove", (event) => {
  if (!(event.target instanceof Element) || event.pointerType !== "mouse" || reducedMotion.matches) return;
  const stage = event.target.closest(".hero-stage");
  if (stage) {
    const bounds = stage.getBoundingClientRect();
    stage.style.setProperty("--stage-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 18}px`);
    stage.style.setProperty("--stage-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * 18}px`);
  }
  const card = event.target.closest(".society-card");
  if (card) {
    const bounds = card.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--tilt-x", `${-vertical * 4}deg`);
    card.style.setProperty("--tilt-y", `${horizontal * 4}deg`);
    card.style.setProperty("--light-x", `${(horizontal + 0.5) * 100}%`);
    card.style.setProperty("--light-y", `${(vertical + 0.5) * 100}%`);
  }
}, { passive: true });

document.addEventListener("pointerleave", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.matches(".hero-stage")) {
    event.target.style.removeProperty("--stage-x");
    event.target.style.removeProperty("--stage-y");
  }
  if (event.target.matches(".society-card")) {
    ["--tilt-x", "--tilt-y", "--light-x", "--light-y"].forEach((property) => event.target.style.removeProperty(property));
  }
}, true);

document.addEventListener("input", (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
  if (field.matches("#society-search")) {
    clearTimeout(searchTimer);
    const nextTerm = field.value;
    searchTimer = setTimeout(() => {
      searchTerm = nextTerm;
      renderSocietyResults();
    }, 150);
    return;
  }
  if (field.matches("#applicant-why")) app.querySelector(".character-count").textContent = `${field.value.length} / 700`;
  if (field.closest(".application-form") && field.getAttribute("aria-invalid") === "true") {
    const society = SOCIETIES.find((item) => item.id === field.form.dataset.societyId);
    validateField(field, society);
  }
});

document.addEventListener("focusout", (event) => {
  const field = event.target;
  if (!(field instanceof HTMLElement) || !field.closest(".application-form") || !field.value.trim()) return;
  const society = SOCIETIES.find((item) => item.id === field.form.dataset.societyId);
  validateField(field, society);
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches(".application-form")) return;
  event.preventDefault();
  submitApplication(form);
});

window.addEventListener("scroll", revealTargetsInView, { passive: true });
window.addEventListener("hashchange", () => renderRoute(true));
if (!location.hash) history.replaceState(null, "", "#home");
renderRoute(false);
