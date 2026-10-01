const app = document.querySelector("#app");
const toast = document.querySelector(".toast");
const categories = ["All societies", "Technical", "Cultural", "Sports", "Literary"];
const applicationRoles = [...new Set([...SOCIETIES.flatMap((society) => society.roles.map((role) => role.title)), "Production"])].sort();
let activeCategory = "All societies";
let searchTerm = "";
let toastTimer;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
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

function societyCard(society) {
  return `
    <a class="society-card" href="#society/${society.id}" aria-label="Explore ${escapeHTML(society.name)}">
      <div class="card-topline"><span>${escapeHTML(society.category)}</span><span class="card-arrow" aria-hidden="true">↗</span></div>
      <div class="society-mark mark-${society.color}" aria-hidden="true">${society.symbol}</div>
      <h3>${escapeHTML(society.name)}</h3>
      <p>${escapeHTML(society.tagline)}</p>
      <div class="card-footer"><span>${escapeHTML(society.members)}</span><span class="card-deadline">${escapeHTML(deadlineLabel(society.deadline))}</span></div>
    </a>`;
}

function renderHome() {
  const filtered = SOCIETIES.filter((society) => {
    const matchesCategory = activeCategory === "All societies" || society.category === activeCategory;
    const searchable = `${society.name} ${society.category} ${society.tagline} ${society.description}`.toLowerCase();
    return matchesCategory && searchable.includes(searchTerm.toLowerCase());
  });
  app.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="eyebrow-dot"></span> NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY</p>
        <h1 id="hero-title">NSUT Society<br><span>Recruitment</span></h1>
        <p class="hero-description">Explore student societies at NSUT, find a team that interests you, and apply to be part of campus life.</p>
        <a class="hero-link" href="#societies">View societies <span aria-hidden="true">↓</span></a>
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
        <label class="search-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><span class="sr-only">Search societies</span><input type="search" placeholder="Find your thing..." value="${escapeHTML(searchTerm)}" autocomplete="off"></label>
      </div>
      <div class="results-line"><span>${filtered.length ? `SHOWING ${String(filtered.length).padStart(2, "0")} SOCIETIES` : "NO SOCIETIES FOUND"}</span><span>TAKE A LOOK AROUND <span aria-hidden="true">↘</span></span></div>
      <div class="society-grid" aria-live="polite">${filtered.map(societyCard).join("")}</div>
      ${filtered.length ? "" : `<div class="empty-state"><span aria-hidden="true">⌕</span><h3>Nothing here just yet.</h3><p>Try another search or clear your filters to see the full list.</p><button class="text-button" type="button" data-reset-filters>Show all societies <span aria-hidden="true">↗</span></button></div>`}
    </section>

    <section class="closing-note" id="how-it-works"><div class="closing-spark" aria-hidden="true">✳</div><p class="eyebrow">HOW TO JOIN</p><h2>Choose a society.<br><em>Apply to a team.</em></h2><p>Open a society to read about it and choose one of its open roles.</p><a class="text-button" href="#societies">Browse societies <span aria-hidden="true">↗</span></a></section>
  `;
}

function renderDetail(society) {
  const isOpen = new Date(society.deadline).getTime() > Date.now();
  app.innerHTML = `
    <section class="detail-page">
      <a class="back-link" href="#home"><span aria-hidden="true">←</span> All societies</a>
      <div class="detail-hero">
        <div class="detail-title-block"><p class="eyebrow"><span class="eyebrow-dot"></span> ${escapeHTML(society.category.toUpperCase())}</p><h1>${escapeHTML(society.name)}<span class="title-period">.</span></h1><p class="detail-tagline">${escapeHTML(society.tagline)}</p></div>
        <div class="detail-emblem mark-${society.color}" aria-hidden="true">${society.symbol}</div>
        <div class="detail-meta"><span>${escapeHTML(society.members)}</span><span class="meta-divider"></span><span>${escapeHTML(deadlineLabel(society.deadline))}</span></div>
      </div>
      <div class="detail-content">
        <div class="detail-main-column">
          <section class="detail-block"><p class="eyebrow">A LITTLE ABOUT US</p><p class="detail-description">${escapeHTML(society.description)}</p></section>
          <section class="detail-block criteria-block"><div class="block-heading"><p class="eyebrow">WHAT WE'RE LOOKING FOR</p><span class="block-index">01 — 03</span></div><ul class="criteria-list">${society.criteria.map((criterion, index) => `<li><span class="criterion-number">0${index + 1}</span><span>${escapeHTML(criterion)}</span></li>`).join("")}</ul></section>
          <section class="detail-block roles-block"><div class="block-heading"><div><p class="eyebrow">OPEN ROLES</p><h2>Find your <em>part.</em></h2></div><span class="role-count">${String(society.roles.length).padStart(2, "0")} OPENINGS</span></div><div class="role-list">${society.roles.map((role, index) => `<article class="role-row"><span class="role-number">0${index + 1}</span><div class="role-copy"><span class="role-type">${escapeHTML(role.type)}</span><h3>${escapeHTML(role.title)}</h3><p>${escapeHTML(role.description)}</p></div><a class="role-apply" href="#society/${society.id}/apply" aria-label="Apply for ${escapeHTML(role.title)}">↗</a></article>`).join("")}</div></section>
        </div>
        <aside class="apply-aside"><div class="aside-topline"><span>THE NEXT STEP</span><span aria-hidden="true">✳</span></div><p class="aside-deadline">${isOpen ? `Applications close ${formatDeadline(society.deadline)}` : "This recruitment round has closed"}</p><h2>${isOpen ? "This could be" : "Stay in the"}<br><em>${isOpen ? "your thing." : "loop."}</em></h2><p>${isOpen ? "A few honest words are all it takes to get started." : "Keep exploring the other societies recruiting right now."}</p>${isOpen ? `<a class="apply-button" href="#society/${society.id}/apply">Apply to join <span aria-hidden="true">↗</span></a>` : `<a class="apply-button" href="#home">See open societies <span aria-hidden="true">↗</span></a>`}<div class="aside-footnote"><span class="footnote-dot"></span> ${isOpen ? "No experience needed. Just you." : "More chances to join are on the way."}</div></aside>
      </div>
      ${isOpen ? `<section class="application-section" id="apply"><div class="application-intro"><p class="eyebrow">YOUR TURN</p><h2>Start a <em>conversation.</em></h2><p>Tell us a little about yourself. There are no trick answers here.</p><div class="form-aside-note"><span>✳</span><p>Your application goes straight to the ${escapeHTML(society.name)} team.</p></div></div><form class="application-form" novalidate data-society="${escapeHTML(society.name)}"><div class="form-row"><label class="form-field" for="applicant-name"><span>Your name</span><input id="applicant-name" name="name" autocomplete="name" placeholder="What should we call you?" required minlength="2"><small class="field-error" data-error="name"></small></label><label class="form-field" for="applicant-year"><span>Year of study</span><select id="applicant-year" name="year" required><option value="">Choose a year</option><option>First year</option><option>Second year</option><option>Third year</option><option>Fourth year</option><option>Postgraduate</option></select><small class="field-error" data-error="year"></small></label></div><div class="form-row"><label class="form-field" for="applicant-branch"><span>Branch / course</span><input id="applicant-branch" name="branch" placeholder="e.g. Computer Science" required minlength="2"><small class="field-error" data-error="branch"></small></label><label class="form-field" for="applicant-role"><span>Role you have in mind</span><select id="applicant-role" name="role" required><option value="">Choose a role</option>${society.roles.map((role) => `<option value="${escapeHTML(role.title)}">${escapeHTML(role.title)}</option>`).join("")}</select><small class="field-error" data-error="role"></small></label></div><label class="form-field" for="applicant-why"><span>What makes you curious about us?</span><textarea id="applicant-why" name="why" rows="4" placeholder="A thought, a story, a small reason. Anything is a good place to start." required minlength="30" maxlength="700"></textarea><div class="textarea-foot"><small class="field-error" data-error="why"></small><span class="character-count">0 / 700</span></div></label><div class="form-submit-row"><p>We value the honest answer over the polished one.</p><button class="apply-button submit-button" type="submit">Send application <span aria-hidden="true">↗</span></button></div><div class="form-success" role="status" aria-live="polite" hidden><span class="success-mark" aria-hidden="true">✓</span><div><strong>You're on the list.</strong><p>Your application for ${escapeHTML(society.name)} has been noted. Good things start here.</p></div></div></form></section>` : ""}
      <a class="mobile-apply" href="${isOpen ? `#society/${society.id}/apply` : "#home"}">${isOpen ? "Apply to join" : "Explore societies"}<span aria-hidden="true">↗</span></a>
    </section>`;
  const roleSelect = app.querySelector("#applicant-role");
  if (roleSelect) {
    roleSelect.innerHTML = `<option value="">Choose a role</option>${applicationRoles.map((role) => `<option value="${escapeHTML(role)}">${escapeHTML(role)}</option>`).join("")}`;
  }
  if (location.hash.endsWith("/apply")) requestAnimationFrame(() => document.querySelector("#apply")?.scrollIntoView({ behavior: "smooth" }));
}

function render() {
  const route = location.hash.slice(1);
  const isApplyRoute = route.startsWith("society/") && route.endsWith("/apply");
  const societyId = route.startsWith("society/") ? route.slice("society/".length).replace(/\/apply$/, "") : "";
  const society = SOCIETIES.find((item) => item.id === societyId);
  if (society) {
    renderDetail(society);
    if (!isApplyRoute) window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    renderHome();
    const section = ["societies", "how-it-works"].includes(route) ? document.getElementById(route) : null;
    if (section) requestAnimationFrame(() => section.scrollIntoView({ behavior: "smooth" }));
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function validateField(field) {
  const error = document.querySelector(`[data-error="${field.name}"]`);
  const value = field.value.trim();
  let message = "";
  if (!value) message = "This field is required.";
  else if (field.name === "name" && value.length < 2) message = "Please enter at least 2 characters.";
  else if (field.name === "branch" && value.length < 2) message = "Please enter a little more detail.";
  else if (field.name === "why" && value.length < 30) message = "Add a little more; at least 30 characters, please.";
  if (error) error.textContent = message;
  field.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

document.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-category]");
  if (chip) {
    activeCategory = chip.dataset.category;
    renderHome();
    document.querySelector(`[data-category="${CSS.escape(activeCategory)}"]`)?.focus();
    return;
  }
  if (event.target.closest("[data-reset-filters]")) {
    activeCategory = "All societies";
    searchTerm = "";
    renderHome();
    document.querySelector(".search-box input")?.focus();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches(".search-box input")) {
    const cursorPosition = event.target.selectionStart;
    searchTerm = event.target.value;
    renderHome();
    const input = document.querySelector(".search-box input");
    input.focus();
    input.setSelectionRange(cursorPosition, cursorPosition);
  }
  if (event.target.matches("#applicant-why")) {
    document.querySelector(".character-count").textContent = `${event.target.value.length} / 700`;
    if (event.target.getAttribute("aria-invalid") === "true") validateField(event.target);
  }
  if (event.target.matches(".application-form input, .application-form select")) {
    if (event.target.getAttribute("aria-invalid") === "true") validateField(event.target);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches(".application-form select") && event.target.getAttribute("aria-invalid") === "true") validateField(event.target);
});

document.addEventListener("focusout", (event) => {
  if (event.target.matches(".application-form input, .application-form select, .application-form textarea") && event.target.value.trim()) validateField(event.target);
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest(".application-form");
  if (!form) return;
  event.preventDefault();
  const fields = [...form.querySelectorAll("input, select, textarea")];
  const isValid = fields.map(validateField).every(Boolean);
  if (!isValid) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const application = Object.fromEntries(new FormData(form).entries());
  application.society = form.dataset.society;
  console.log("Society application (demo):", application);
  form.querySelector(".form-success").hidden = false;
  form.querySelector(".form-success").scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.querySelector(".submit-button").disabled = true;
  form.querySelector(".submit-button").innerHTML = "Application noted <span aria-hidden=\"true\">✓</span>";
  showToast("Application noted. Good luck!");
});

window.addEventListener("hashchange", render);
if (!location.hash) history.replaceState(null, "", "#home");
render();