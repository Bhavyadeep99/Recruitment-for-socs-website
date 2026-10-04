const app = document.querySelector("#app");
const navigationLinks = [...document.querySelectorAll(".topnav-link")];
const categories = ["All societies", "Technical", "Cultural", "Sports", "Literary"];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let activeCategory = "All societies";
let searchTerm = "";
let searchTimer;
let gridLoadingTimer;
let motionObserver;
let artworkCleanup;
let lastView = "";
const I = { up: "M7 17 17 7M8 7h9v9", down: "M12 5v14M6 13l6 6 6-6", left: "M19 12H5M11 6l-6 6 6 6", check: "M5 12.5l4.5 4.5L19 7", cut: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9 20 18M8.1 16.1 20 6", find: "M10.8 4a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM16 16l5 5" };
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${I[name]}"/></svg>`;
const countWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
let quizAnswers = Array(5).fill("");

const quizQuestions = [
  { prompt: "What would you most like to explore?", options: [["technology", "Technology"], ["art", "Visual art"], ["sports", "Sport"], ["writing", "Writing"], ["events", "Campus events"], ["music", "Music and dance"], ["reading", "Books and ideas"]] },
  { prompt: "Which kind of project sounds satisfying?", options: [["engineering", "Solving a technical challenge"], ["design", "Designing a visual identity"], ["competition", "Training for a competition"], ["publishing", "Publishing a new issue"], ["organizing", "Organizing a campus event"], ["rehearsal", "Preparing a performance"], ["discussion", "Hosting a discussion"]] },
  { prompt: "What do you bring to a team?", options: [["making", "I like making things"], ["creative", "A creative point of view"], ["teamwork", "Team energy"], ["editing", "A careful editorial eye"], ["community", "A welcoming spirit"], ["performance", "Confidence on stage"], ["books", "A love of reading"]] },
  { prompt: "Which outcome would you be proud of?", options: [["electronics", "A working prototype"], ["exhibitions", "A memorable exhibition"], ["movement", "A stronger sports team"], ["writing", "A story in print"], ["events", "A great campus gathering"], ["dance", "A polished performance"], ["reading", "A thoughtful reading group"]] },
  { prompt: "Choose the atmosphere you prefer.", options: [["collaboration", "Collaborative problem-solving"], ["art", "Open-ended experimentation"], ["sports", "Fast-paced and competitive"], ["publishing", "Focused and detail-oriented"], ["creative", "Social and creative"], ["music", "Expressive and energetic"], ["discussion", "Curious and reflective"]] }
];

const quizInterestLabels = new Map(quizQuestions.flatMap((question) => question.options).map(([value, label]) => [value, label]));

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function societyLogo(society, named = false) {
  return `<svg class="society-logo" ${named ? `style="view-transition-name:society-${society.id}" ` : ""}viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#logo-${society.id}"></use></svg>`;
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
  app.querySelectorAll("[data-deadline-countdown]").forEach((el) => { el.textContent = deadlineCountdown(el.dataset.deadlineCountdown); });
  app.querySelectorAll("[data-deadline-days]").forEach((el) => { el.textContent = deadlineLabel(el.dataset.deadlineDays); });
}

setInterval(updateCountdowns, 60000);

function applicationHash(society, role) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return `#society/${society.id}/apply${query}`;
}

function societyCard(s, i, n = SOCIETIES.length) {
  const pattern = ["poster", "note", "note", "strip"];
  let variant = pattern[i % 4];
  if (variant === "note" && i === n - 1 && i % 4 !== 2) variant = "strip";
  const tilt = [-1.4, 1, -0.8, 0.6, 1.2, -1, 0.8, -0.5][i % 8];
  const urgent = new Date(s.deadline) - Date.now() < 7 * 864e5;
  const tabs = variant === "poster" ? `<ul class="flyer-tabs">${s.roles.map((r) => `<li>${escapeHTML(r.title)}</li>`).join("")}</ul>` : "";
  return `<div class="flyer flyer-${variant}" style="--tilt:${tilt}deg"><a class="flyer-link" href="#society/${s.id}"><span class="pin" aria-hidden="true"></span><div class="flyer-logo">${societyLogo(s, true)}</div><div class="flyer-body"><h3>${escapeHTML(s.name)}</h3><p>${escapeHTML(s.tagline)}</p></div><span class="flyer-due${urgent ? " is-urgent" : ""}" data-deadline-days="${s.deadline}">${deadlineLabel(s.deadline)}</span>${tabs}</a></div>`;
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
    ? `Showing ${results.length} of ${SOCIETIES.length} societies`
    : "No societies found";
  grid.innerHTML = results.map((s, i) => societyCard(s, i, results.length)).join("");
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
    return `<article class="quiz-match"><div class="quiz-match-mark mark-${society.color}">${societyLogo(society)}</div><p class="quiz-match-score">${score} of ${quizQuestions.length} answers match</p><h3>${escapeHTML(society.name)}</h3><p>${reason}</p><a class="text-button" href="#society/${society.id}">Explore society ${icon("up")}</a></article>`;
  }).join("")}</div>`;
  output.hidden = false;
}

function renderQuiz() {
  return `<section class="find-section" id="find" aria-labelledby="find-title"><div class="find-heading"><h2 id="find-title">Not sure where you fit?</h2><p>Answer five questions and get three societies to look at first.</p></div><form class="society-quiz">${quizQuestions.map((question, index) => `<fieldset class="quiz-question"><legend><span>${String(index + 1).padStart(2, "0")}</span>${escapeHTML(question.prompt)}</legend><div class="quiz-options">${question.options.map(([value, label]) => `<label class="quiz-option"><input type="radio" name="quiz-${index}" value="${escapeHTML(value)}" ${quizAnswers[index] === value ? "checked" : ""}><span>${escapeHTML(label)}</span></label>`).join("")}</div></fieldset>`).join("")}<div class="quiz-progress"><span data-quiz-progress>${quizAnswers.filter(Boolean).length} / ${quizQuestions.length} answered</span><button class="text-button" type="reset">Start over</button></div></form><div class="quiz-results" hidden></div></section>`;
}

function observeCards(grid) {
  const cards = grid.querySelectorAll(".flyer");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("motion-visible"));
    return;
  }
  cards.forEach((card, index) => {
    card.classList.add("motion-reveal");
    card.style.setProperty("--reveal-order", String(index));
    motionObserver?.observe(card);
  });
  queueReveal();
}

function initializePageMotion() {
  motionObserver?.disconnect();
  const targets = app.querySelectorAll(".hero-copy, .hero-stage, .section-heading, .results-line, .flyer, .closing-note, .detail-hero, .detail-block, .apply-aside, .application-section");
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
  queueReveal();
}

const queueReveal = () => requestAnimationFrame(() => requestAnimationFrame(revealTargetsInView));

function revealTargetsInView() {
  app.querySelectorAll(".motion-reveal:not(.motion-visible)").forEach((target) => {
    const bounds = target.getBoundingClientRect();
    if (bounds.top >= window.innerHeight * 0.95 || bounds.bottom <= 0) return;
    target.classList.add("motion-visible");
    motionObserver?.unobserve(target);
  });
}

function initializeClosingArtwork() {}

const notices = ["Found: one calculator. Owner must prove they know the formula.", "Free to a good home: unused attendance.", "Wanted: a back-row seat that is not already taken.", "Reminder: the canteen queue is also a society. No auditions.", "Looking for: someone to explain the 8 AM lecture. Payment in chai.", "Notice: this board is not responsible for lost sleep during fest week.", "Lost: Wi-Fi. Last seen near the library.", "You scrolled this far. Your society is probably waiting."];

function confetti(origin) {
  if (reducedMotion.matches) return;
  const host = origin.closest(".hero-board");
  const box = origin.getBoundingClientRect();
  const area = host.getBoundingClientRect();
  const colors = ["var(--paper)", "var(--pin)", "var(--ink)"];
  for (let i = 0; i < 24; i++) {
    const scrap = document.createElement("i");
    scrap.className = "scrap";
    scrap.style.cssText = `left:${box.left - area.left + box.width / 2}px;top:${box.top - area.top + box.height / 2}px;background:${colors[i % 3]};--dx:${(Math.random() - 0.5) * 280}px;--dy:${-70 - Math.random() * 170}px;--rot:${Math.random() * 720}deg`;
    host.appendChild(scrap);
    setTimeout(() => scrap.remove(), 1400);
  }
}

function initHeroBoard() {
  const board = app.querySelector(".hero-board");
  if (!board) return;
  let layer = 5;
  board.querySelectorAll(".hero-flyer").forEach((el) => {
    el.addEventListener("pointerdown", (event) => {
      cancelAnimationFrame(el.fling);
      const area = board.getBoundingClientRect();
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      let x = el.offsetLeft;
      let y = el.offsetTop;
      const dx = event.clientX - area.left - x;
      const dy = event.clientY - area.top - y;
      let vx = 0, vy = 0, travelled = 0, last = event;
      el.style.animation = "none";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.zIndex = ++layer;
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-held");
      const place = () => { el.style.left = `${x}px`; el.style.top = `${y}px`; };
      const move = (e) => {
        x = Math.min(Math.max(e.clientX - area.left - dx, 0), area.width - width);
        y = Math.min(Math.max(e.clientY - area.top - dy, 0), area.height - height);
        vx = e.clientX - last.clientX;
        vy = e.clientY - last.clientY;
        travelled += Math.abs(vx) + Math.abs(vy);
        last = e;
        place();
      };
      const glide = () => {
        x += vx; y += vy; vx *= 0.94; vy *= 0.94;
        if (x < 0 || x > area.width - width) { vx *= -0.6; x = Math.min(Math.max(x, 0), area.width - width); }
        if (y < 0 || y > area.height - height) { vy *= -0.6; y = Math.min(Math.max(y, 0), area.height - height); }
        place();
        if (Math.hypot(vx, vy) > 0.4) el.fling = requestAnimationFrame(glide);
      };
      const stop = () => {
        el.classList.remove("is-held");
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", stop);
        el.removeEventListener("pointercancel", stop);
        if (travelled < 6) { location.hash = `#society/${el.dataset.id}`; return; }
        if (!reducedMotion.matches) el.fling = requestAnimationFrame(glide);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", stop);
      el.addEventListener("pointercancel", stop);
    });
  });
  const note = board.querySelector("[data-sticky]");
  let next = 0;
  note.addEventListener("click", () => {
    note.textContent = notices[next++ % notices.length];
    note.classList.remove("flip");
    void note.offsetWidth;
    note.classList.add("flip");
    if (next % notices.length === 0) confetti(note);
  });
}

function marquee() {
  const items = [...SOCIETIES].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map((s) => `<a href="#society/${s.id}"><svg class="society-logo" viewBox="0 0 64 64" aria-hidden="true"><use href="#logo-${s.id}"></use></svg><span>${escapeHTML(s.name)}</span><em data-deadline-days="${s.deadline}">${deadlineLabel(s.deadline)}</em></a>`).join("");
  return `<section class="marquee" aria-label="Societies, closing soonest first"><div class="marquee-track"><div class="marquee-group">${items}</div><div class="marquee-group" aria-hidden="true">${items.replace(/<a /g, '<a tabindex="-1" ')}</div></div></section>`;
}

function renderHome() {
  const count = countWords[SOCIETIES.length] || SOCIETIES.length;
  app.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <h1 id="hero-title"><span class="line"><span>${count} societies.</span></span><span class="line"><span>One notice board.</span></span></h1>
        <p class="hero-description">See what each NSUT society is looking for, tear off the role that fits, and send a short application. No account needed.</p>
        <div class="hero-actions"><a class="btn" href="#societies">Browse the board ${icon("down")}</a><a class="btn btn-quiet" href="#find">Not sure? Take the quick match</a></div>
      </div>
      <div class="hero-board">
        <div aria-hidden="true" class="hero-flyer hf-1" data-id="coding-club"><span class="pin"></span><svg class="society-logo" viewBox="0 0 64 64"><use href="#logo-coding-club"></use></svg><b>${SOCIETIES.find((s) => s.id === "coding-club").name}</b></div><div aria-hidden="true" class="hero-flyer hf-2" data-id="fine-arts-society"><span class="pin"></span><svg class="society-logo" viewBox="0 0 64 64"><use href="#logo-fine-arts-society"></use></svg><b>${SOCIETIES.find((s) => s.id === "fine-arts-society").name}</b></div><div aria-hidden="true" class="hero-flyer hf-3" data-id="music-and-dance-society"><span class="pin"></span><svg class="society-logo" viewBox="0 0 64 64"><use href="#logo-music-and-dance-society"></use></svg><b>${SOCIETIES.find((s) => s.id === "music-and-dance-society").name}</b></div><div aria-hidden="true" class="hero-flyer hf-4" data-id="sports-committee"><span class="pin"></span><svg class="society-logo" viewBox="0 0 64 64"><use href="#logo-sports-committee"></use></svg><b>${SOCIETIES.find((s) => s.id === "sports-committee").name}</b></div>
        <button class="sticky" type="button" data-sticky>Psst. Tap this note. It has notices.</button>
      </div>
    </section>
    ${marquee()}
    <section class="discovery-section" id="societies" aria-labelledby="societies-title">
      <div class="section-heading"><h2 id="societies-title">Societies on the board</h2><p class="section-aside">Filter by type or search by name or role. Closing dates update live.</p></div>
      <div class="discovery-tools">
        <div class="filter-list" role="group" aria-label="Filter societies by category">
          ${categories.map((category) => `<button class="filter-chip${activeCategory === category ? " is-active" : ""}" data-category="${escapeHTML(category)}" type="button" aria-pressed="${activeCategory === category}">${escapeHTML(category)}</button>`).join("")}
        </div>
        <label class="search-box" for="society-search">${icon("find")}<span class="sr-only">Search societies</span><input id="society-search" type="search" placeholder="Search by name or role" value="${escapeHTML(searchTerm)}" autocomplete="off"></label>
      </div>
      <div class="results-line" aria-live="polite" aria-atomic="true"><span class="results-count"></span></div>
      <div class="society-grid" aria-busy="true"></div>
      <div class="empty-state" hidden>${icon("find")}<h3>Nothing pinned here yet.</h3><p>Try another search or clear your filters.</p><button class="text-button" type="button" data-reset-filters>Show all societies</button></div>
    </section>
    ${renderQuiz()}
    <section class="closing-note" id="how-it-works" aria-labelledby="closing-title">
      <h2 id="closing-title">How applying works</h2>
      <ol class="ticket"><li><h3>Pick a flyer</h3><p>Open a society to read what it looks for.</p></li><li><h3>Tear off a role</h3><p>Choose the team you want to join.</p></li><li><h3>Fill the slip</h3><p>Send a short application. That is all.</p></li></ol>
    </section>`;
  renderSocietyResults();
  renderQuizResults();
  initializePageMotion();
  initHeroBoard();
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
      <div class="application-intro"><h2 id="application-title">Start a <em>conversation.</em></h2><p class="stub" data-stub hidden></p><p>Tell the ${escapeHTML(society.name)} team a little about yourself and the role you want to explore.</p><div class="form-aside-note"><p>Your application details are sent only when an endpoint is configured and you submit.</p></div></div>
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
        <div class="form-submit-row"><p class="demo-mode"${isDemo ? "" : " hidden"}>Demo mode: no application endpoint is configured</p><button class="apply-button submit-button" type="submit"><span class="button-label">Send application</span>${icon("up")}</button></div>
        <p class="form-status" tabindex="-1" hidden></p>
      </form>
    </section>`;
}

function renderDetail(society, isApply, selectedRole) {
  const isOpen = Date.now() < new Date(society.deadline).getTime();
  const roleRows = society.roles.map((role, index) => `<article class="role-row"><div class="role-copy"><span class="role-type">${escapeHTML(role.type)}</span><h3>${escapeHTML(role.title)}</h3><p>${escapeHTML(role.description)}</p></div><a class="role-apply" href="${applicationHash(society, role.title)}" aria-label="Apply for ${escapeHTML(role.title)} at ${escapeHTML(society.name)}">${icon("cut")}</a></article>`).join("");
  app.innerHTML = `
    <section class="detail-page">
      <a class="back-link" href="#societies">${icon("left")} All societies</a>
      <div class="detail-hero">
        <div class="detail-title-block"><h1>${escapeHTML(society.name)}<span class="title-period">.</span></h1><p class="detail-tagline">${escapeHTML(society.tagline)}</p></div>
        <div class="detail-emblem mark-${society.color}" aria-hidden="true">${societyLogo(society)}</div>
        <div class="detail-meta"><span>${escapeHTML(society.category)}</span><span>${escapeHTML(society.members)}</span><span data-deadline-countdown="${escapeHTML(society.deadline)}">${escapeHTML(deadlineCountdown(society.deadline))}</span></div>
      </div>
      <div class="detail-content">
        <div class="detail-main-column">
          <section class="detail-block"><h2>About us</h2><p class="detail-description">${escapeHTML(society.description)}</p></section>
          <section class="detail-block criteria-block"><div class="block-heading"><h2>What we are looking for</h2></div><ul class="criteria-list">${society.criteria.map((criterion, index) => `<li>${icon("check")}<span>${escapeHTML(criterion)}</span></li>`).join("")}</ul></section>
          <section class="detail-block roles-block"><div class="block-heading"><div><h2>Find your <em>part.</em></h2></div></div><div class="role-list">${roleRows}</div></section>
        </div>
        <aside class="apply-aside"><div class="aside-topline"><span>THE NEXT STEP</span></div><p class="aside-deadline">${isOpen ? `Applications close ${formatDeadline(society.deadline)}. ` : "This recruitment round has closed"}${isOpen ? `<span data-deadline-countdown="${escapeHTML(society.deadline)}">${escapeHTML(deadlineCountdown(society.deadline))}</span>` : ""}</p><h2>${isOpen ? "This could be" : "Stay in the"}<br><em>${isOpen ? "your thing." : "loop."}</em></h2><p>${isOpen ? "Choose a role and tell us what interests you." : "Keep exploring societies and watch for their next round."}</p>${isOpen ? `<a class="apply-button" href="${applicationHash(society, "")}">Apply to join ${icon("up")}</a>` : `<a class="apply-button" href="#societies">See other societies ${icon("up")}</a>`}<div class="aside-footnote"><span class="footnote-dot"></span> No experience needed. Just you.</div></aside>
      </div>
        ${isOpen ? renderApplicationForm(society) : ""}
    </section>`;
  const roleSelect = app.querySelector("#applicant-role");
  if (roleSelect && selectedRole && society.roles.some((role) => role.title === selectedRole)) {
    roleSelect.value = selectedRole;
  }
  updateStub();
  updateCountdowns();
}

function renderNotFound() {
  app.innerHTML = `<section class="not-found"><h1>This page wandered off.</h1><p>That society route does not exist. Go back to the directory to find your team.</p><a class="apply-button" href="#societies">Browse societies ${icon("up")}</a></section>`;
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
  if (parts.length === 1 && ["societies", "how-it-works", "find"].includes(parts[0])) return { view: "home", section: parts[0] };
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
    if (route.view === "application") app.querySelector("#apply")?.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "auto" : "smooth" });
    else if (route.section) document.getElementById(route.section)?.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "auto" : "smooth" });
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
  const route = parseRoute();
  if (route.view === "home" && lastView === "home" && app.children.length) {
    updateDocumentState(route);
    afterNavigation(route, false);
    return;
  }
  lastView = route.view;
  clearTimeout(searchTimer);
  motionObserver?.disconnect();
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

function updateStub() {
  const stub = app.querySelector("[data-stub]");
  const select = app.querySelector("#applicant-role");
  if (!stub || !select) return;
  stub.hidden = !select.value;
  stub.textContent = select.value ? `Your tab: ${select.value}` : "";
  stub.classList.remove("stub-in");
  void stub.offsetWidth;
  stub.classList.add("stub-in");
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const tear = event.target.closest(".role-apply");
  if (tear && !reducedMotion.matches && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    const row = tear.closest(".role-row");
    if (row.classList.contains("is-torn")) return;
    row.classList.add("is-torn");
    setTimeout(() => { location.hash = tear.getAttribute("href"); }, 650);
    return;
  }
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
  if (event.target.matches?.("#applicant-role")) updateStub();
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
