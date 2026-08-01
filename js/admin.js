"use strict";

// const API_BASE = "http://localhost:5000/api/admin";

function getDefaultAdminApiBaseUrl() {
  const hostname = window.location.hostname;
  const isLocalHost =
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");
  const baseUrl =
    isLocalHost || !window.location.origin || window.location.origin === "null"
      ? "http://localhost:5000"
      : window.location.origin;

  return `${baseUrl.replace(/\/+$/, "")}/api`;
}

const BASE_API =
  window.APP_RUNTIME_CONFIG?.API_BASE_URL || getDefaultAdminApiBaseUrl();

const API_BASE = `${BASE_API}/admin`;
const AUTH_API_BASE = `${BASE_API}/auth`;
const UPLOAD_API_BASE = `${BASE_API}/admin/upload`;

function isRoomCombinedCheckoutFrontendEnabled() {
  return window.APP_RUNTIME_CONFIG?.ROOM_COMBINED_CHECKOUT_FRONTEND_ENABLED === true;
}

function getRoomCombinedCheckoutDisabledAttribute() {
  return isRoomCombinedCheckoutFrontendEnabled() ? "" : "disabled";
}

function getRoomCombinedCheckoutHintText() {
  return isRoomCombinedCheckoutFrontendEnabled()
    ? "Combined checkout frontend is enabled for staging. Backend feature flag and RPC validation still control settlement."
    : "Combined checkout stays disabled until the backend migration, staging verifier, and feature flag are enabled.";
}

const TAB_LABELS = {
  orders: "orders",
  reservations: "reservations",
  inquiries: "inquiries",
  "contact-submissions": "contact messages",
  "notification-events": "notification events",
  hotels: "hotels",
  rooms: "rooms",
  "gallery-items": "gallery items",
  "popup-notifications": "popup notifications",
  "menu-categories": "menu categories",
  "menu-items": "menu items",
  "menu-combos": "combo offers",
  testimonials: "testimonials"
};

// ====================== UPLOAD BUTTON ======================
const uploadBtn = document.getElementById("openUploadSectionBtn");

if (uploadBtn) {
  uploadBtn.addEventListener("click", () => {
    const isVisible = setSectionVisibility("uploadSection");
    if (isVisible) {
      scrollSectionIntoView("uploadSection");
    }
  });
}

const ADMIN_TOKEN_KEY = "hotel_platform_admin_token";
let adminTabLoadController = null;

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

const state = {
  activeTab: "orders",
  hotels: [],
  orders: [],
  reservations: [],
  inquiries: [],
  contactSubmissions: [],
  notificationEvents: [],
  notificationEventMaxRetries: 3,
  galleryItems: [],
  popupNotifications: [],
  menuCategories: [],
  menuItems: [],
  menuCombos: [],
  roomTypes: [],
  rooms: [],
  roomBookings: [],
  roomCheckoutSummaries: {},
  roomCheckoutBills: {},
  roomBookingFilters: {
    status: "",
    fromDate: "",
    toDate: "",
    limit: "100"
  },
  testimonials: [],
  menuItemSearchQuery: "",
  profileHeroBase: {},
  profileHeroHotelSlug: "",
  profileThemeBase: {},
  profileThemeHotelSlug: "",
  profileThemeSectionOrderDirty: false,
  hotelSavedLaunchReadiness: null,
  hotelDomainResolveStatus: {
    outcome: "idle",
    checkedHost: "",
    resolvedSlug: "",
    matchesCurrentHotel: false
  }
};

const PROFILE_THEME_DEFAULTS = {
  colors: {
    primary: "#c9a84c",
    primaryLight: "#e8d08a",
    primaryDark: "#a07830",
    background: "#fbf8f3",
    backgroundAlt: "#f3ede3",
    text: "#333333",
    textMuted: "#6b6b6b"
  },
  radius: {
    base: "16px",
    small: "8px"
  }
};

const PROFILE_THEME_FONT_PRESETS = {
  default: {
    display: "\"Cormorant Garamond\", Georgia, serif",
    body: "\"Jost\", sans-serif"
  },
  system: {
    display: "Georgia, serif",
    body: "system-ui, sans-serif"
  }
};

const PROFILE_THEME_CONTAINER_PRESETS = {
  compact: "1120px",
  default: "1280px",
  wide: "1440px"
};

const PROFILE_THEME_BUTTON_PRESETS = {
  default: "default",
  solid: "solid",
  crisp: "crisp"
};

const PROFILE_THEME_HERO_LAYOUT_PRESETS = {
  default: "default",
  split: "split",
  stacked: "stacked"
};

const PROFILE_THEME_HERO_LAYOUT_LABELS = {
  default: "Default",
  split: "Split",
  stacked: "Stacked"
};

const PROFILE_HERO_SCENE_PRESETS = {
  default: "default",
  luxury: "luxury",
  warm: "warm",
  minimal: "minimal",
  family: "family"
};
const PROFILE_HERO_SCENE_TEMPLATES = {
  default: "default",
  orbital: "orbital",
  sculptural: "sculptural",
  constellation: "constellation"
};
const PROFILE_HERO_SCENE_MODEL_PRESETS = {
  none: "none",
  "coffee-cup": "coffee-cup",
  "plated-dish": "plated-dish",
  dessert: "dessert",
  "service-cloche": "service-cloche"
};

const PROFILE_THEME_SECTION_ORDER = [
  "about",
  "menu",
  "reservation",
  "events",
  "gallery",
  "testimonials",
  "contact"
];

const PROFILE_THEME_SECTION_LABELS = {
  about: "About",
  menu: "Menu",
  reservation: "Reservation",
  events: "Events",
  gallery: "Gallery",
  testimonials: "Testimonials",
  contact: "Contact"
};

const THEME_FOUNDATION_VERSION = "24.6-foundation";



function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeValue(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeHotelPrimaryDomainInput(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

function normalizeHotelSubdomainInput(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getHotelDomainResolveHostInputValue() {
  return normalizeHotelPrimaryDomainInput(
    document.getElementById("hotelDomainResolveHostInput")?.value
  );
}

function setHotelDomainResolveStatus(status = {}) {
  state.hotelDomainResolveStatus = {
    outcome: String(status.outcome || "idle").trim() || "idle",
    checkedHost: String(status.checkedHost || "").trim(),
    resolvedSlug: String(status.resolvedSlug || "").trim(),
    matchesCurrentHotel: !!status.matchesCurrentHotel
  };
}

function renderHotelDomainLaunchChecklist() {
  const container = document.getElementById("hotelDomainLaunchChecklist");
  if (!container) return;

  const hotelSlug = document.getElementById("hotelSlugInput")?.value.trim() || "";
  const primaryDomain = normalizeHotelPrimaryDomainInput(
    document.getElementById("hotelPrimaryDomainInput")?.value
  );
  const subdomain = normalizeHotelSubdomainInput(
    document.getElementById("hotelSubdomainInput")?.value
  );
  const resolveStatus =
    state.hotelDomainResolveStatus &&
    typeof state.hotelDomainResolveStatus === "object"
      ? state.hotelDomainResolveStatus
      : {
          outcome: "idle",
          checkedHost: "",
          resolvedSlug: "",
          matchesCurrentHotel: false
        };
  const resolveMatchesCurrentSlug =
    !!resolveStatus.resolvedSlug &&
    !!hotelSlug &&
    resolveStatus.resolvedSlug.toLowerCase() === hotelSlug.toLowerCase();
  const hasRoutingIdentity = !!hotelSlug && !!(primaryDomain || subdomain);
  const resolveReady =
    resolveStatus.outcome === "matched" &&
    (
      !hotelSlug ||
      resolveMatchesCurrentSlug ||
      resolveStatus.matchesCurrentHotel
    );
  const resolveNeedsAttention =
    resolveStatus.outcome === "failed" || resolveStatus.outcome === "mismatched";
  const routingTargetLabel = primaryDomain || (subdomain ? `${subdomain} + trusted shared host` : "Not set");
  const subdomainNote = subdomain
    ? "If you plan to use a shared platform subdomain, confirm the backend trusted public host env already includes that public domain family."
    : "Add a subdomain only when this hotel should also work on your shared platform host.";

  container.innerHTML = `
    <strong>Domain Launch Checklist</strong>
    <div style="margin-top: 8px;">
      ${buildAdminStateBadge(hasRoutingIdentity ? "Ready" : "Needed", hasRoutingIdentity ? "success" : "warning")}
      <span style="margin-left: 8px;">Hotel routing identity: ${escapeHTML(routingTargetLabel)}</span>
    </div>
    <div style="margin-top: 8px;">
      ${buildAdminStateBadge("Manual", "neutral")}
      <span style="margin-left: 8px;">Point the chosen public hostname to the shared frontend deploy before opening the site to customers.</span>
    </div>
    <div style="margin-top: 8px;">
      ${
        resolveReady
          ? buildAdminStateBadge("Verified", "success")
          : resolveNeedsAttention
            ? buildAdminStateBadge("Attention", "warning")
            : buildAdminStateBadge("Pending", "neutral")
      }
      <span style="margin-left: 8px;">
        ${
          resolveReady
            ? `Tenant resolve last matched ${escapeHTML(resolveStatus.checkedHost || primaryDomain || hotelSlug)} to ${escapeHTML(resolveStatus.resolvedSlug || hotelSlug)}.`
            : resolveNeedsAttention
              ? `Recheck tenant resolve for ${escapeHTML(resolveStatus.checkedHost || primaryDomain || hotelSlug || "the planned hostname")} until it points to this hotel.`
              : "Run the hostname check after saving the hotel record and DNS change."
        }
      </span>
    </div>
    <div style="margin-top: 8px;">
      ${buildAdminStateBadge(subdomain ? "Review" : "Optional", subdomain ? "neutral" : "neutral")}
      <span style="margin-left: 8px;">${escapeHTML(subdomainNote)}</span>
    </div>
  `;
}

function buildHotelDeployValuesText() {
  const hotelSlug = document.getElementById("hotelSlugInput")?.value.trim() || "";
  const hotelName = document.getElementById("hotelNameInput")?.value.trim() || "";
  const primaryDomain = normalizeHotelPrimaryDomainInput(
    document.getElementById("hotelPrimaryDomainInput")?.value
  );
  const subdomain = normalizeHotelSubdomainInput(
    document.getElementById("hotelSubdomainInput")?.value
  );
  const checkedHost =
    state.hotelDomainResolveStatus?.checkedHost ||
    getHotelDomainResolveHostInputValue() ||
    primaryDomain;
  const resolvedSlug = state.hotelDomainResolveStatus?.resolvedSlug || "";
  const resolveOutcome = state.hotelDomainResolveStatus?.outcome || "idle";

  return [
    `Hotel Name: ${hotelName || "-"}`,
    `Hotel Slug: ${hotelSlug || "-"}`,
    `Primary Domain: ${primaryDomain || "-"}`,
    `Subdomain: ${subdomain || "-"}`,
    `Tenant Resolve Host: ${checkedHost || "-"}`,
    `Last Resolve Outcome: ${resolveOutcome || "-"}`,
    `Last Resolved Slug: ${resolvedSlug || "-"}`
  ].join(" | ");
}

function buildHotelLaunchNotesText() {
  const hotelSlug = document.getElementById("hotelSlugInput")?.value.trim() || "-";
  const hotelName = document.getElementById("hotelNameInput")?.value.trim() || "-";
  const primaryDomain = normalizeHotelPrimaryDomainInput(
    document.getElementById("hotelPrimaryDomainInput")?.value
  ) || "-";
  const subdomain = normalizeHotelSubdomainInput(
    document.getElementById("hotelSubdomainInput")?.value
  ) || "-";
  const resolveStatus =
    state.hotelDomainResolveStatus &&
    typeof state.hotelDomainResolveStatus === "object"
      ? state.hotelDomainResolveStatus
      : {
          outcome: "idle",
          checkedHost: "",
          resolvedSlug: "",
          matchesCurrentHotel: false
        };
  const readiness =
    state.hotelSavedLaunchReadiness &&
    typeof state.hotelSavedLaunchReadiness === "object"
      ? state.hotelSavedLaunchReadiness
      : null;
  const readinessWarnings = Array.isArray(readiness?.warnings)
    ? readiness.warnings.filter(Boolean)
    : [];
  const trustedHosts = Array.isArray(readiness?.trustedSharedParentHosts)
    ? readiness.trustedSharedParentHosts
    : [];
  const checks = readiness?.checks && typeof readiness.checks === "object"
    ? readiness.checks
    : {};
  const resolveTargets = readiness?.resolveTargets && typeof readiness.resolveTargets === "object"
    ? readiness.resolveTargets
    : {};

  return [
    "Hotel Launch Notes",
    `Hotel Name: ${hotelName}`,
    `Hotel Slug: ${hotelSlug}`,
    `Primary Domain: ${primaryDomain}`,
    `Subdomain: ${subdomain}`,
    "",
    "Saved Backend Readiness",
    `Exact Primary Ready: ${checks.exactPrimaryReady ? "Yes" : "No"}`,
    `Shared Subdomain Ready: ${checks.sharedSubdomainReady ? "Yes" : "No"}`,
    `Trusted Shared Parent Hosts: ${trustedHosts.length ? trustedHosts.join(", ") : "None configured"}`,
    `Recommended Shared Subdomain Host: ${resolveTargets.recommendedSharedSubdomainHost || "-"}`,
    "",
    "Latest Tenant Resolve Check",
    `Checked Host: ${resolveStatus.checkedHost || "-"}`,
    `Outcome: ${resolveStatus.outcome || "idle"}`,
    `Resolved Slug: ${resolveStatus.resolvedSlug || "-"}`,
    `Matches Current Hotel: ${resolveStatus.matchesCurrentHotel ? "Yes" : "No"}`,
    "",
    "Deploy Values",
    buildHotelDeployValuesText(),
    "",
    "Warnings",
    ...(readinessWarnings.length ? readinessWarnings : ["None"])
  ].join("\n");
}

function renderHotelSavedLaunchReadiness() {
  const container = document.getElementById("hotelSavedLaunchReadiness");
  if (!container) return;

  const readiness =
    state.hotelSavedLaunchReadiness &&
    typeof state.hotelSavedLaunchReadiness === "object"
      ? state.hotelSavedLaunchReadiness
      : null;

  if (!readiness) {
    container.className = "admin-row";
    container.innerHTML = "<strong>Saved Launch Readiness</strong><div style=\"margin-top: 6px;\">Open an existing hotel to load the backend readiness summary.</div>";
    renderHotelLaunchNotesHelper();
    return;
  }

  const warnings = Array.isArray(readiness.warnings) ? readiness.warnings.filter(Boolean) : [];
  const toneClassName = warnings.length ? "admin-row admin-attention-row" : "admin-row";
  const sharedParents = Array.isArray(readiness.trustedSharedParentHosts)
    ? readiness.trustedSharedParentHosts
    : [];
  const checks = readiness.checks && typeof readiness.checks === "object"
    ? readiness.checks
    : {};
  const resolveTargets = readiness.resolveTargets && typeof readiness.resolveTargets === "object"
    ? readiness.resolveTargets
    : {};

  container.className = toneClassName;
  container.innerHTML = `
    <strong>Saved Launch Readiness</strong>
    <div style="margin-top: 8px;">
      ${buildBooleanStateBadge(!!checks.exactPrimaryReady, {
        onLabel: "Primary Ready",
        offLabel: "Primary Pending"
      })}
      <span style="margin-left: 8px;">Exact-domain routing: ${escapeHTML(resolveTargets.primaryDomainHost || "not configured")}</span>
    </div>
    <div style="margin-top: 8px;">
      ${buildBooleanStateBadge(!!checks.sharedSubdomainReady, {
        onLabel: "Shared Subdomain Ready",
        offLabel: "Shared Subdomain Pending"
      })}
      <span style="margin-left: 8px;">Shared subdomain target: ${escapeHTML(resolveTargets.recommendedSharedSubdomainHost || "not available yet")}</span>
    </div>
    <div style="margin-top: 8px;">
      ${buildAdminStateBadge(sharedParents.length ? "Trusted Hosts" : "No Trusted Hosts", sharedParents.length ? "success" : "warning")}
      <span style="margin-left: 8px;">${escapeHTML(sharedParents.length ? sharedParents.join(", ") : "No shared public parent hosts configured in backend env.")}</span>
    </div>
    ${
      warnings.length
        ? `<div style="margin-top: 8px;">${warnings.map((warning) => `<div>${escapeHTML(warning)}</div>`).join("")}</div>`
        : `<div style="margin-top: 8px;">Saved hotel record looks ready for the configured routing modes.</div>`
    }
  `;
  renderHotelLaunchNotesHelper();
}

function renderHotelDeployValuesHelper(message = "") {
  const output = document.getElementById("hotelDeployValuesOutput");
  const help = document.getElementById("hotelDeployValuesHelp");
  if (!output) return;

  output.value = buildHotelDeployValuesText();

  if (help) {
    help.textContent = message || "Keep this handy while updating DNS, tenant data, and deploy notes.";
  }
  renderHotelLaunchNotesHelper();
}

function renderHotelLaunchNotesHelper(message = "") {
  const output = document.getElementById("hotelLaunchNotesOutput");
  const help = document.getElementById("hotelLaunchNotesHelp");
  if (!output) return;

  output.value = buildHotelLaunchNotesText();

  if (help) {
    help.textContent = message || "Use this for rollout handoff or deployment checklists.";
  }
}

async function fetchHotelLaunchReadiness(hotelId) {
  return fetchJson(`${API_BASE}/hotels/${encodeURIComponent(hotelId)}/launch-readiness`);
}

async function loadHotelLaunchReadiness(hotelId = "") {
  const normalizedHotelId = String(hotelId || "").trim();

  if (!normalizedHotelId) {
    state.hotelSavedLaunchReadiness = null;
    renderHotelSavedLaunchReadiness();
    return;
  }

  try {
    const result = await fetchHotelLaunchReadiness(normalizedHotelId);
    state.hotelSavedLaunchReadiness = result.readiness || null;
    renderHotelSavedLaunchReadiness();
  } catch (error) {
    state.hotelSavedLaunchReadiness = {
      warnings: [error.message || "Failed to load saved launch readiness."],
      checks: {},
      resolveTargets: {},
      trustedSharedParentHosts: []
    };
    renderHotelSavedLaunchReadiness();
  }
}

async function copyHotelDeployValues() {
  const output = document.getElementById("hotelDeployValuesOutput");
  const value = buildHotelDeployValuesText();

  if (output) {
    output.value = value;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else if (output) {
      output.select();
      document.execCommand("copy");
    }

    renderHotelDeployValuesHelper("Copied deploy values. Paste them into your DNS/deploy checklist.");
  } catch (error) {
    console.error("Hotel deploy values copy failed:", error);
    renderHotelDeployValuesHelper("Copy failed. Select the deploy values manually.");
  }
}

async function copyHotelLaunchNotes() {
  const output = document.getElementById("hotelLaunchNotesOutput");
  const value = buildHotelLaunchNotesText();

  if (output) {
    output.value = value;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else if (output) {
      output.select();
      document.execCommand("copy");
    }

    renderHotelLaunchNotesHelper("Copied launch notes. Paste them into your rollout handoff.");
  } catch (error) {
    console.error("Hotel launch notes copy failed:", error);
    renderHotelLaunchNotesHelper("Copy failed. Select the launch notes manually.");
  }
}

function setHotelDomainResolveOutput({
  tone = "neutral",
  title = "",
  detail = "",
  lines = []
} = {}) {
  const output = document.getElementById("hotelDomainResolveResult");
  if (!output) return;

  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const toneClassName =
    tone === "warning"
      ? "admin-row admin-attention-row"
      : "admin-row";
  const lineMarkup = safeLines.length
    ? safeLines.map((line) => `<div>${escapeHTML(line)}</div>`).join("")
    : "";

  output.className = toneClassName;
  output.innerHTML = `
    <strong>${escapeHTML(title || "No hostname checked yet.")}</strong>
    ${
      detail
        ? `<div style="margin-top: 6px;">${escapeHTML(detail)}</div>`
        : ""
    }
    ${lineMarkup ? `<div style="margin-top: 8px;">${lineMarkup}</div>` : ""}
  `;
}

function resetHotelDomainResolveState({
  host = "",
  message = "No hostname checked yet."
} = {}) {
  const input = document.getElementById("hotelDomainResolveHostInput");

  if (input) {
    input.value = host || "";
  }

  setHotelDomainResolveStatus({
    outcome: "idle",
    checkedHost: host || "",
    resolvedSlug: "",
    matchesCurrentHotel: false
  });
  setHotelDomainResolveOutput({
    tone: "neutral",
    title: message
  });
  renderHotelDomainLaunchChecklist();
  renderHotelSavedLaunchReadiness();
  renderHotelDeployValuesHelper();
  renderHotelLaunchNotesHelper();
}

async function resolveTenantHost(host) {
  return fetchJson(
    `${BASE_API}/tenant/resolve?host=${encodeURIComponent(host)}`
  );
}

function fillHotelResolveHostFromPrimaryDomain() {
  const primaryDomainInput = document.getElementById("hotelPrimaryDomainInput");
  const normalizedPrimaryDomain = normalizeHotelPrimaryDomainInput(
    primaryDomainInput?.value
  );

  if (!normalizedPrimaryDomain) {
    setHotelDomainResolveOutput({
      tone: "warning",
      title: "Primary domain is empty.",
      detail: "Enter a primary domain first or paste the hostname you want to test."
    });
    return "";
  }

  resetHotelDomainResolveState({
    host: normalizedPrimaryDomain,
    message: "Hostname ready. Run the check when you want to verify tenant routing."
  });
  return normalizedPrimaryDomain;
}

async function checkHotelDomainResolve() {
  const currentHotelSlug = document.getElementById("hotelSlugInput")?.value.trim() || "";
  const host = getHotelDomainResolveHostInputValue();

  if (!host) {
    setHotelDomainResolveOutput({
      tone: "warning",
      title: "Enter a hostname first.",
      detail: "Use the exact public host you want the tenant resolver to match."
    });
    return;
  }

  const hostInput = document.getElementById("hotelDomainResolveHostInput");
  if (hostInput) {
    hostInput.value = host;
  }

  setHotelDomainResolveOutput({
    tone: "neutral",
    title: "Checking tenant routing...",
    detail: `Resolving ${host}`
  });

  try {
    const result = await resolveTenantHost(host);
    const hotel = result?.hotel || {};
    const resolvedSlug = String(hotel.slug || "").trim();
    const matchesCurrentHotel =
      resolvedSlug &&
      currentHotelSlug &&
      resolvedSlug.toLowerCase() === currentHotelSlug.toLowerCase();
    setHotelDomainResolveStatus({
      outcome: currentHotelSlug && !matchesCurrentHotel ? "mismatched" : "matched",
      checkedHost: host,
      resolvedSlug,
      matchesCurrentHotel
    });
    const tone = currentHotelSlug && !matchesCurrentHotel ? "warning" : "neutral";
    const title = currentHotelSlug
      ? matchesCurrentHotel
        ? "Hostname resolves to this hotel."
        : "Hostname resolves to a different hotel."
      : "Hostname resolves successfully.";

    setHotelDomainResolveOutput({
      tone,
      title,
      detail: `${host} -> ${hotel.name || resolvedSlug || "Unknown hotel"}`,
      lines: [
        `Resolved slug: ${resolvedSlug || "unknown"}`,
        `Primary domain: ${hotel.primary_domain || "none"}`,
        `Subdomain: ${hotel.subdomain || "none"}`,
        `Active: ${hotel.is_active === false ? "No" : "Yes"}`,
        currentHotelSlug
          ? `Current form slug: ${currentHotelSlug}`
          : ""
      ]
    });
    renderHotelDomainLaunchChecklist();
    renderHotelDeployValuesHelper("Deploy values refreshed with the latest tenant resolve result.");
  } catch (error) {
    setHotelDomainResolveStatus({
      outcome: "failed",
      checkedHost: host,
      resolvedSlug: "",
      matchesCurrentHotel: false
    });
    setHotelDomainResolveOutput({
      tone: "warning",
      title: "Hostname did not resolve.",
      detail: error.message || "Tenant resolver check failed.",
      lines: [
        `Checked host: ${host}`
      ]
    });
    renderHotelDomainLaunchChecklist();
    renderHotelDeployValuesHelper("Deploy values refreshed. Resolve check still needs attention.");
  }
}

function getHotelFilterValue() {
  return $("#hotelFilter")?.value.trim() || "";
}

function setHotelFilterValue(value = "") {
  const select = $("#hotelFilter");
  if (!select) return;
  select.value = value;
}

function getSelectedHotel() {
  const filterValue = getHotelFilterValue();
  if (!filterValue) return null;

  const normalizedFilter = normalizeValue(filterValue);

  return (
    state.hotels.find((hotel) => {
      const slug = normalizeValue(hotel.slug);
      const name = normalizeValue(hotel.name);
      return slug === normalizedFilter || name === normalizedFilter;
    }) || null
  );
}

function getSelectedHotelName() {
  return getSelectedHotel()?.name || "";
}

function getSelectedHotelSlug() {
  const selectedHotel = getSelectedHotel();
  if (selectedHotel?.slug) return selectedHotel.slug;
  return getHotelFilterValue();
}

function getLoadingLabel(activeTab = state.activeTab) {
  return TAB_LABELS[activeTab] || "dashboard";
}

function toTitleLabel(value = "") {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderAdminScopeSummary() {
  const tabValue = document.getElementById("adminScopeTabValue");
  const hotelValue = document.getElementById("adminScopeHotelValue");
  const helpText = document.getElementById("adminScopeHelp");

  if (!tabValue || !hotelValue || !helpText) return;

  const selectedHotel = getSelectedHotel();
  const selectedHotelSlug = getSelectedHotelSlug();
  const activeTabLabel = toTitleLabel(getLoadingLabel());
  const hotelScopeLabel = selectedHotel?.name
    ? `${selectedHotel.name}${selectedHotel.slug ? ` (${selectedHotel.slug})` : ""}`
    : selectedHotelSlug
      ? selectedHotelSlug
      : "All Hotels";

  tabValue.textContent = activeTabLabel;
  hotelValue.textContent = hotelScopeLabel;
  helpText.textContent = selectedHotel || selectedHotelSlug
    ? `${activeTabLabel} is currently filtered to one hotel. Supported editor forms will reuse this scope automatically.`
    : `${activeTabLabel} is currently showing all hotels. Choose a hotel filter when you want narrower records and editor defaults.`;
}

function normalizeQrLinkValue(value = "", maxLength = 100) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function syncQrTableLinkHotelSlug({ force = false } = {}) {
  const input = document.getElementById("qrLinkHotelSlugInput");
  if (!input) return;

  const selectedHotelSlug = getSelectedHotelSlug();
  if (selectedHotelSlug && (force || !input.value.trim())) {
    input.value = selectedHotelSlug;
  }
}

function buildQrTableOrderUrl({ hotelSlug, tableNumber, targetPage, qrContextToken = "" }) {
  const safePage = targetPage === "index.html" ? "index.html" : "menu.html";
  const url = new URL(safePage, window.location.href);

  url.search = "";
  url.hash = safePage === "index.html" ? "menu" : "";
  url.searchParams.set("hotel", hotelSlug);
  url.searchParams.set("table", tableNumber);
  url.searchParams.set("source", "qr");
  if (qrContextToken) {
    url.searchParams.set("qctx", qrContextToken);
  }

  return url.href;
}

function updateQrTableLinkOutput(link = "", message = "", summary = "") {
  const output = document.getElementById("qrTableLinkOutput");
  const preview = document.getElementById("qrTableLinkPreview");
  const help = document.getElementById("qrTableLinkHelp");
  const summaryEl = document.getElementById("qrTableLinkSummary");

  if (output) output.value = link;
  if (preview) {
    preview.href = link || "#";
    preview.setAttribute("aria-disabled", link ? "false" : "true");
  }
  if (help) {
    help.textContent = message || (link ? "Use this URL in your QR code tool." : "No QR link generated yet.");
  }
  if (summaryEl) {
    summaryEl.textContent = summary || "No QR table selected yet.";
  }
}

async function fetchSignedQrContextToken({ hotelSlug, tableNumber, orderSource = "qr" }) {
  const result = await fetchJson(`${API_BASE}/qr-links/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      hotelSlug,
      tableNumber,
      orderSource
    })
  });

  return String(result?.qrContextToken || "").trim();
}

async function generateQrTableLink() {
  const hotelSlug = normalizeQrLinkValue(
    document.getElementById("qrLinkHotelSlugInput")?.value,
    120
  );
  const tableNumber = normalizeQrLinkValue(
    document.getElementById("qrLinkTableNumberInput")?.value,
    80
  );
  const targetPage =
    document.getElementById("qrLinkTargetPageInput")?.value || "menu.html";

  if (!hotelSlug || !tableNumber) {
    updateQrTableLinkOutput("", "Enter hotel slug and table number first.");
    return "";
  }

  let qrContextToken = "";
  let helperMessage = "";

  try {
    qrContextToken = await fetchSignedQrContextToken({
      hotelSlug,
      tableNumber,
      orderSource: "qr"
    });
  } catch (error) {
    console.warn("QR link signing failed, using legacy link:", error.message);
    helperMessage = "Signed QR token is unavailable right now. Generated a legacy link so your current QR flow still works.";
  }

  const link = buildQrTableOrderUrl({
    hotelSlug,
    tableNumber,
    targetPage,
    qrContextToken
  });
  updateQrTableLinkOutput(
    link,
    helperMessage,
    `QR target: ${hotelSlug} / ${tableNumber} / ${targetPage === "index.html" ? "Homepage menu section" : "Full menu page"}`
  );
  return link;
}

async function copyQrTableLink() {
  const output = document.getElementById("qrTableLinkOutput");
  const link = output?.value.trim() || await generateQrTableLink();

  if (!link) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
    } else if (output) {
      output.select();
      document.execCommand("copy");
    }
    updateQrTableLinkOutput(link, "Copied. Use this URL in your QR code tool.");
  } catch (error) {
    console.error("QR table link copy failed:", error);
    updateQrTableLinkOutput(link, "Copy failed. Select the generated link manually.");
  }
}

function buildAdminStateBadge(label = "", tone = "neutral") {
  return `<span class="admin-state-badge is-${tone}">${escapeHTML(label)}</span>`;
}

function buildBooleanStateBadge(
  value,
  {
    onLabel = "Enabled",
    offLabel = "Disabled",
    onTone = "success",
    offTone = "warning"
  } = {}
) {
  return buildAdminStateBadge(
    value ? onLabel : offLabel,
    value ? onTone : offTone
  );
}

function getAdminListScopeLabel() {
  const selectedHotel = getSelectedHotel();
  const selectedHotelSlug = getSelectedHotelSlug();

  if (selectedHotel?.name) {
    return `${selectedHotel.name}${selectedHotel.slug ? ` (${selectedHotel.slug})` : ""}`;
  }

  if (selectedHotelSlug) {
    return selectedHotelSlug;
  }

  return "All Hotels";
}

function buildAdminListSummaryCard({
  title = "List Overview",
  count = 0,
  description = ""
} = {}) {
  return `
    <div class="admin-card admin-list-summary">
      <h3>${escapeHTML(title)}</h3>
      ${
        description
          ? `<p class="admin-toolbar-help">${escapeHTML(description)}</p>`
          : ""
      }
      <div class="status-row">
        <span class="status-badge">Records: ${escapeHTML(count)}</span>
        <span class="status-badge">Scope: ${escapeHTML(getAdminListScopeLabel())}</span>
      </div>
    </div>
    `;
}

function normalizeSearchText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function filterMenuItemsBySearchQuery(menuItems = [], searchQuery = "") {
  const normalizedQuery = normalizeSearchText(searchQuery);

  if (!normalizedQuery) {
    return menuItems;
  }

  return menuItems.filter((item) => {
    const searchableFields = [
      item?.name,
      item?.category,
      item?.item_id,
      item?.description,
      item?.badge,
      item?.tag,
      item?.alt,
      item?.hotel_slug
    ];

    return searchableFields.some((fieldValue) =>
      normalizeSearchText(fieldValue).includes(normalizedQuery)
    );
  });
}

async function fetchJson(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  const token = getAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminToken();
      showLoginView();
      throw new Error("Admin session expired or missing. Please log in again.");
    }

    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.code = data.code || "";
    error.responseData = data;
    throw error;
  }

  return data;
}

function buildUrl(endpoint) {
  const hotelSlug = getSelectedHotelSlug();
  const hotelName = getSelectedHotelName();
  if (!hotelSlug && !hotelName) return `${API_BASE}/${endpoint}`;

  const params = new URLSearchParams();
  if (hotelSlug) params.set("hotelSlug", hotelSlug);
  if (hotelName) params.set("hotelName", hotelName);
  return `${API_BASE}/${endpoint}?${params.toString()}`;
}

function getFilteredHotels() {
  const selectedHotel = getSelectedHotel();
  if (!selectedHotel) return state.hotels;

  return state.hotels.filter((hotel) => String(hotel.id) === String(selectedHotel.id));
}

function syncMenuFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("menuHotelSlugInput");
  const idField = document.getElementById("menuItemDbId");
  if (!input) return;

  const isEditingExistingItem = !!idField?.value.trim();
  if (isEditingExistingItem) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncMenuCategoryFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("menuCategoryHotelSlugInput");
  const idField = document.getElementById("menuCategoryDbId");
  if (!input || idField?.value.trim()) return;
  const hotelSlug = getSelectedHotelSlug();
  if (force || !input.value.trim()) input.value = hotelSlug || "";
}

function refreshMenuCategoryOptions() {
  const options = document.getElementById("menuCategoryOptions");
  if (!options) return;
  options.innerHTML = state.menuCategories.map((category) =>
    `<option value="${escapeHTML(category.key)}">${escapeHTML(category.name)}</option>`
  ).join("");
}

function syncMenuComboFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("menuComboHotelSlugInput");
  const idField = document.getElementById("menuComboDbId");
  if (!input) return;

  const isEditingExistingItem = !!idField?.value.trim();
  if (isEditingExistingItem) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncGalleryFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("galleryHotelSlugInput");
  const idField = document.getElementById("galleryItemDbId");
  if (!input) return;

  const isEditingExistingItem = !!idField?.value.trim();
  if (isEditingExistingItem) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncTestimonialFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("testimonialHotelSlugInput");
  const idField = document.getElementById("testimonialDbId");
  if (!input) return;

  const isEditingExistingItem = !!idField?.value.trim();
  if (isEditingExistingItem) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncPopupNotificationFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("popupNotificationHotelSlugInput");
  const idField = document.getElementById("popupNotificationDbId");
  if (!input) return;

  const isEditingExistingItem = !!idField?.value.trim();
  if (isEditingExistingItem) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }

  renderPopupNotificationPreview();
}

function syncNotificationSettingsHotelSlug({ force = false } = {}) {
  const input = document.getElementById("notificationSettingsHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncOrderingSettingsHotelSlug({ force = false } = {}) {
  const input = document.getElementById("orderingSettingsHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncRoomFeatureSettingsHotelSlug({ force = false } = {}) {
  const input = document.getElementById("roomFeatureSettingsHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncPaymentRouteSettingsHotelSlug({ force = false } = {}) {
  const input = document.getElementById("paymentRouteHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncRoomTypeFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("roomTypeHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncRoomFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("roomHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function syncRoomBookingFormHotelSlug({ force = false } = {}) {
  const input = document.getElementById("roomBookingHotelSlugInput");
  if (!input) return;

  const hotelSlug = getSelectedHotelSlug();

  if (force || !input.value.trim()) {
    input.value = hotelSlug || "";
  }
}

function resetHotelForm() {
  const form = document.getElementById("hotelForm");
  if (!form) return;

  form.reset();
  const idField = document.getElementById("hotelId");
  const activeField = document.getElementById("hotelIsActiveInput");

  if (idField) idField.value = "";
  if (activeField) activeField.checked = true;
  state.hotelSavedLaunchReadiness = null;
  resetHotelDomainResolveState();
  renderHotelSavedLaunchReadiness();
}

function resetMenuItemForm() {
  const form = document.getElementById("menuItemForm");
  if (!form) return;

  form.reset();
  const idField = document.getElementById("menuItemDbId");
  const availableField = document.getElementById("menuIsAvailableInput");

  if (idField) idField.value = "";
  if (availableField) availableField.checked = true;

  syncMenuFormHotelSlug({ force: true });
}

function resetMenuCategoryForm() {
  const form = document.getElementById("menuCategoryForm");
  if (!form) return;
  form.reset();
  document.getElementById("menuCategoryDbId").value = "";
  document.getElementById("menuCategoryKeyInput").readOnly = false;
  document.getElementById("menuCategoryDisplayOrderInput").value = "0";
  ["menuCategoryIsActiveInput", "menuCategoryIsPublishedInput", "menuCategoryStaffEnabledInput", "menuCategoryWebsiteEnabledInput", "menuCategoryQrEnabledInput"]
    .forEach((id) => { const field = document.getElementById(id); if (field) field.checked = true; });
  syncMenuCategoryFormHotelSlug({ force: true });
}

function fillMenuCategoryForm(category = {}) {
  document.getElementById("menuCategoryDbId").value = category.reference || "";
  document.getElementById("menuCategoryHotelSlugInput").value = getSelectedHotelSlug() || "";
  const keyInput = document.getElementById("menuCategoryKeyInput");
  keyInput.value = category.key || "";
  keyInput.readOnly = true;
  document.getElementById("menuCategoryNameInput").value = category.name || "";
  document.getElementById("menuCategorySlugInput").value = category.slug || "";
  document.getElementById("menuCategoryDescriptionInput").value = category.description || "";
  document.getElementById("menuCategoryDisplayOrderInput").value = String(category.displayOrder || 0);
  document.getElementById("menuCategoryImageUrlInput").value = category.defaultImage?.cardUrl || "";
  document.getElementById("menuCategoryThumbnailUrlInput").value = category.defaultImage?.thumbnailUrl || "";
  document.getElementById("menuCategoryImageStoragePathInput").value = category.imageStoragePath || "";
  document.getElementById("menuCategoryImageAltInput").value = category.defaultImage?.alt || "";
  document.getElementById("menuCategoryIsActiveInput").checked = category.isActive !== false;
  document.getElementById("menuCategoryIsPublishedInput").checked = category.isPublished !== false;
  document.getElementById("menuCategoryStaffEnabledInput").checked = category.staffEnabled !== false;
  document.getElementById("menuCategoryWebsiteEnabledInput").checked = category.websiteEnabled !== false;
  document.getElementById("menuCategoryQrEnabledInput").checked = category.qrEnabled !== false;
}

function resetMenuComboForm() {
  const form = document.getElementById("menuComboForm");
  if (!form) return;

  form.reset();
  const idField = document.getElementById("menuComboDbId");
  const availableField = document.getElementById("menuComboIsAvailableInput");
  const categoryField = document.getElementById("menuComboCategoryInput");

  if (idField) idField.value = "";
  if (availableField) availableField.checked = true;
  if (categoryField) categoryField.value = "combos";

  setMenuComboIdentityFieldsLocked(false);
  syncMenuComboFormHotelSlug({ force: true });
}

function resetRoomTypeForm() {
  const form = document.getElementById("roomTypeForm");
  if (!form) return;

  form.reset();
  const activeField = document.getElementById("roomTypeIsActiveInput");
  if (activeField) activeField.checked = true;

  syncRoomTypeFormHotelSlug({ force: true });
}

function resetRoomForm() {
  const form = document.getElementById("roomForm");
  if (!form) return;

  form.reset();
  const activeField = document.getElementById("roomIsActiveInput");
  const statusField = document.getElementById("roomStatusInput");
  if (activeField) activeField.checked = true;
  if (statusField) statusField.value = "available";

  syncRoomFormHotelSlug({ force: true });
}

function resetRoomBookingForm() {
  const form = document.getElementById("roomBookingForm");
  if (!form) return;

  form.reset();
  const adultsField = document.getElementById("roomBookingAdultsInput");
  const childrenField = document.getElementById("roomBookingChildrenInput");
  const sourceField = document.getElementById("roomBookingSourceInput");
  const statusField = document.getElementById("roomBookingStatusInput");
  const paymentMethodField = document.getElementById("roomBookingPaymentMethodInput");
  const advanceOptionField = document.getElementById("roomBookingAdvanceOptionInput");

  if (adultsField) adultsField.value = "1";
  if (childrenField) childrenField.value = "0";
  if (sourceField) sourceField.value = "admin";
  if (statusField) statusField.value = "confirmed";
  if (paymentMethodField) paymentMethodField.value = "";
  if (advanceOptionField) advanceOptionField.value = "no_advance";
  syncAdminRoomAdvanceFields();

  syncRoomBookingFormHotelSlug({ force: true });
  populateRoomBookingRoomOptions();
}

function formatTimeInputValue(value = "") {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return "";
  }

  const timeMatch = candidate.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  return timeMatch ? timeMatch[1] : "";
}

function parseMenuComboChildItemsInput(rawValue = "") {
  return String(rawValue || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [childItemIdPart = "", quantityPart = "", sortOrderPart = ""] = line
        .split("|")
        .map((part) => String(part || "").trim());

      return {
        childItemId: childItemIdPart,
        quantity: quantityPart ? Number(quantityPart) : 1,
        sortOrder: sortOrderPart ? Number(sortOrderPart) : 0
      };
    });
}

function parseRoomListInput(rawValue = "") {
  const seen = new Set();

  return String(rawValue || "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((items, entry) => {
      if (items.length >= 100) return items;

      const candidate = entry.slice(0, 500);
      const key = candidate.toLowerCase();
      if (seen.has(key)) return items;

      seen.add(key);
      items.push(candidate);
      return items;
    }, []);
}

function getOptionalNumericInput(id, { integer = false, min = 0, max = 99999999.99 } = {}) {
  const rawValue = document.getElementById(id)?.value.trim() || "";
  if (!rawValue) return undefined;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error("Enter valid room pricing, capacity, and guest numbers.");
  }

  if (integer && !Number.isInteger(value)) {
    throw new Error("Room capacity and guest counts must be whole numbers.");
  }

  return value;
}

function serializeMenuComboChildItems(childItems = []) {
  return (Array.isArray(childItems) ? childItems : [])
    .map((childItem) => {
      const childItemId = String(childItem?.childItemId || "").trim();

      if (!childItemId) {
        return "";
      }

      const quantity = Number(childItem?.quantity || 1);
      const sortOrder = Number(childItem?.sortOrder || 0);
      return `${childItemId}|${quantity}|${sortOrder}`;
    })
    .filter(Boolean)
    .join("\n");
}

function setMenuComboIdentityFieldsLocked(isLocked) {
  const hotelSlugInput = document.getElementById("menuComboHotelSlugInput");
  const itemIdInput = document.getElementById("menuComboItemIdInput");

  [hotelSlugInput, itemIdInput].forEach((input) => {
    if (!input) return;
    input.readOnly = !!isLocked;
  });
}

function fillMenuComboForm(combo = {}) {
  document.getElementById("menuComboDbId").value = combo.id || "";
  document.getElementById("menuComboHotelSlugInput").value =
    combo.hotelSlug || combo.hotel_slug || "";
  document.getElementById("menuComboCategoryInput").value = combo.category || "combos";
  document.getElementById("menuComboItemIdInput").value = combo.itemId || combo.item_id || "";
  document.getElementById("menuComboNameInput").value = combo.name || "";
  document.getElementById("menuComboDescriptionInput").value = combo.description || "";
  document.getElementById("menuComboPriceInput").value = combo.price ?? 0;
  document.getElementById("menuComboImageInput").value = combo.image || "";
  document.getElementById("menuComboStoragePathInput").value = combo.storagePath || "";
  document.getElementById("menuComboAltInput").value = combo.alt || "";
  document.getElementById("menuComboBadgeInput").value = combo.badge || "";
  document.getElementById("menuComboTagInput").value = combo.tag || "";
  document.getElementById("menuComboSortOrderInput").value = combo.sortOrder ?? 0;
  document.getElementById("menuComboStartDateInput").value = combo.startDate || "";
  document.getElementById("menuComboEndDateInput").value = combo.endDate || "";
  document.getElementById("menuComboStartTimeInput").value = formatTimeInputValue(
    combo.startTime || ""
  );
  document.getElementById("menuComboEndTimeInput").value = formatTimeInputValue(
    combo.endTime || ""
  );
  document.getElementById("menuComboChildItemsInput").value = serializeMenuComboChildItems(
    combo.childItems || []
  );
  document.getElementById("menuComboIsAvailableInput").checked = combo.isAvailable !== false;
  setMenuComboIdentityFieldsLocked(true);
}

function resetGalleryItemForm() {
  const form = document.getElementById("galleryItemForm");
  if (!form) return;

  form.reset();
  const idField = document.getElementById("galleryItemDbId");
  const layoutField = document.getElementById("galleryLayoutVariantInput");
  const activeField = document.getElementById("galleryIsActiveInput");

  if (idField) idField.value = "";
  if (layoutField) layoutField.value = "standard";
  if (activeField) activeField.checked = true;

  syncGalleryFormHotelSlug({ force: true });
}

function resetTestimonialForm() {
  const form = document.getElementById("testimonialForm");
  if (!form) return;

  form.reset();
  const idField = document.getElementById("testimonialDbId");
  const starsField = document.getElementById("testimonialStarsInput");
  const activeField = document.getElementById("testimonialIsActiveInput");
  const approvedField = document.getElementById("testimonialIsApprovedInput");

  if (idField) idField.value = "";
  if (starsField) starsField.value = "5";
  if (activeField) activeField.checked = true;
  if (approvedField) approvedField.checked = true;

  syncTestimonialFormHotelSlug({ force: true });
}

function formatDateTimeLocalInputValue(value = "") {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return "";
  }

  const parsedDate = new Date(candidate);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fillPopupNotificationForm(notification = {}) {
  document.getElementById("popupNotificationDbId").value = notification.id || "";
  document.getElementById("popupNotificationHotelSlugInput").value =
    notification.hotel_slug || notification.hotelSlug || "";
  document.getElementById("popupNotificationTitleInput").value =
    notification.title || "";
  document.getElementById("popupNotificationDescriptionInput").value =
    notification.description || "";
  document.getElementById("popupNotificationImageUrlInput").value =
    notification.image_url || notification.imageUrl || "";
  document.getElementById("popupNotificationStoragePathInput").value =
    notification.storage_path || notification.storagePath || "";
  document.getElementById("popupNotificationCtaTextInput").value =
    notification.cta_text || notification.ctaText || "";
  document.getElementById("popupNotificationCtaLinkInput").value =
    notification.cta_link || notification.ctaLink || "";
  document.getElementById("popupNotificationDisplayModeInput").value =
    notification.display_mode || notification.displayMode || "once_per_session";
  document.getElementById("popupNotificationPriorityInput").value =
    notification.priority ?? 0;
  document.getElementById("popupNotificationStartAtInput").value =
    formatDateTimeLocalInputValue(notification.start_at || notification.startAt || "");
  document.getElementById("popupNotificationEndAtInput").value =
    formatDateTimeLocalInputValue(notification.end_at || notification.endAt || "");
  document.getElementById("popupNotificationIsActiveInput").checked =
    notification.is_active !== false;
  renderPopupNotificationPreview();
}

function resetPopupNotificationForm() {
  const form = document.getElementById("popupNotificationForm");
  if (!form) return;

  form.reset();
  document.getElementById("popupNotificationDbId").value = "";
  document.getElementById("popupNotificationDisplayModeInput").value = "once_per_session";
  document.getElementById("popupNotificationPriorityInput").value = "0";
  document.getElementById("popupNotificationIsActiveInput").checked = true;
  syncPopupNotificationFormHotelSlug({ force: true });
  renderPopupNotificationPreview();
}

function formatPopupDisplayModeLabel(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "every_visit") return "every visit";
  if (normalized === "once_per_day") return "once per day";
  return "once per session";
}

function renderPopupNotificationPreview() {
  const titleEl = document.getElementById("popupNotificationPreviewTitle");
  const descriptionEl = document.getElementById("popupNotificationPreviewDescription");
  const imageWrapEl = document.getElementById("popupNotificationPreviewImageWrap");
  const imageEl = document.getElementById("popupNotificationPreviewImage");
  const ctaEl = document.getElementById("popupNotificationPreviewCta");
  const dismissOptionEl = document.getElementById("popupNotificationPreviewDismissOption");
  const hotelSlugChipEl = document.getElementById("popupPreviewHotelSlugChip");
  const displayModeChipEl = document.getElementById("popupPreviewDisplayModeChip");
  const priorityChipEl = document.getElementById("popupPreviewPriorityChip");
  const statusChipEl = document.getElementById("popupPreviewStatusChip");

  if (
    !titleEl ||
    !descriptionEl ||
    !imageWrapEl ||
    !imageEl ||
    !ctaEl ||
    !dismissOptionEl ||
    !hotelSlugChipEl ||
    !displayModeChipEl ||
    !priorityChipEl ||
    !statusChipEl
  ) {
    return;
  }

  const hotelSlug =
    document.getElementById("popupNotificationHotelSlugInput")?.value.trim() || "";
  const title =
    document.getElementById("popupNotificationTitleInput")?.value.trim() || "Festival Offer";
  const description =
    document.getElementById("popupNotificationDescriptionInput")?.value.trim() ||
    "Your popup preview updates live as you type so you can check title length, spacing, image fit, and CTA copy before saving.";
  const imageUrl =
    document.getElementById("popupNotificationImageUrlInput")?.value.trim() || "";
  const ctaText =
    document.getElementById("popupNotificationCtaTextInput")?.value.trim() || "";
  const ctaLink =
    document.getElementById("popupNotificationCtaLinkInput")?.value.trim() || "";
  const displayMode =
    document.getElementById("popupNotificationDisplayModeInput")?.value.trim() ||
    "once_per_session";
  const priority = Number(
    document.getElementById("popupNotificationPriorityInput")?.value || 0
  );
  const isActive = !!document.getElementById("popupNotificationIsActiveInput")?.checked;

  titleEl.textContent = title;
  descriptionEl.textContent = description;

  if (imageUrl) {
    imageEl.src = imageUrl;
    imageEl.alt = title;
    imageWrapEl.hidden = false;
  } else {
    imageEl.removeAttribute("src");
    imageEl.alt = "";
    imageWrapEl.hidden = true;
  }

  if (ctaText && ctaLink) {
    ctaEl.hidden = false;
    ctaEl.textContent = ctaText;
    ctaEl.setAttribute("href", ctaLink);
  } else {
    ctaEl.hidden = true;
    ctaEl.textContent = "";
    ctaEl.setAttribute("href", "#");
  }

  dismissOptionEl.hidden = String(displayMode).trim().toLowerCase() === "once_per_day";
  hotelSlugChipEl.textContent = `Hotel: ${hotelSlug || "not set"}`;
  displayModeChipEl.textContent = `Mode: ${formatPopupDisplayModeLabel(displayMode)}`;
  priorityChipEl.textContent = `Priority: ${Number.isFinite(priority) ? priority : 0}`;
  statusChipEl.textContent = isActive ? "Active" : "Inactive";
}

function bindPopupNotificationPreview() {
  const form = document.getElementById("popupNotificationForm");
  if (!form || form.dataset.boundPopupPreview === "true") return;

  form.addEventListener("input", () => {
    renderPopupNotificationPreview();
  });

  form.addEventListener("change", () => {
    renderPopupNotificationPreview();
  });

  form.dataset.boundPopupPreview = "true";
  renderPopupNotificationPreview();
}

function isValidPopupNotificationCtaLink(value = "") {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return true;
  }

  if (candidate.startsWith("/")) {
    return true;
  }

  try {
    const parsedUrl = new URL(candidate);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch (error) {
    return false;
  }
}

function validatePopupNotificationForm(form) {
  if (!form) {
    return false;
  }

  const hotelSlugInput = document.getElementById("popupNotificationHotelSlugInput");
  const titleInput = document.getElementById("popupNotificationTitleInput");
  const ctaTextInput = document.getElementById("popupNotificationCtaTextInput");
  const ctaLinkInput = document.getElementById("popupNotificationCtaLinkInput");
  const startAtInput = document.getElementById("popupNotificationStartAtInput");
  const endAtInput = document.getElementById("popupNotificationEndAtInput");
  const priorityInput = document.getElementById("popupNotificationPriorityInput");

  [
    hotelSlugInput,
    titleInput,
    ctaTextInput,
    ctaLinkInput,
    startAtInput,
    endAtInput,
    priorityInput
  ]
    .filter(Boolean)
    .forEach((input) => input.setCustomValidity(""));

  if (!form.reportValidity()) {
    return false;
  }

  let firstInvalidInput = null;
  const ctaText = ctaTextInput?.value.trim() || "";
  const ctaLink = ctaLinkInput?.value.trim() || "";
  const startAt = startAtInput?.value.trim() || "";
  const endAt = endAtInput?.value.trim() || "";
  const priorityValue = priorityInput?.value.trim() || "0";
  const priorityNumber = Number(priorityValue);

  if (ctaText && !ctaLink && ctaLinkInput) {
    ctaLinkInput.setCustomValidity("Add a button link when button text is filled.");
    firstInvalidInput = firstInvalidInput || ctaLinkInput;
  }

  if (ctaLink && !ctaText && ctaTextInput) {
    ctaTextInput.setCustomValidity("Add button text when a button link is filled.");
    firstInvalidInput = firstInvalidInput || ctaTextInput;
  }

  if (ctaLink && !isValidPopupNotificationCtaLink(ctaLink) && ctaLinkInput) {
    ctaLinkInput.setCustomValidity("Button link must be an http(s) URL or start with /.");
    firstInvalidInput = firstInvalidInput || ctaLinkInput;
  }

  if (startAt && endAt) {
    const startTime = new Date(startAt).getTime();
    const endTime = new Date(endAt).getTime();

    if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime < startTime && endAtInput) {
      endAtInput.setCustomValidity("End date/time must be after the start date/time.");
      firstInvalidInput = firstInvalidInput || endAtInput;
    }
  }

  if (
    priorityInput &&
    (!Number.isFinite(priorityNumber) || !Number.isInteger(priorityNumber) || priorityNumber < 0)
  ) {
    priorityInput.setCustomValidity("Priority must be a whole number zero or greater.");
    firstInvalidInput = firstInvalidInput || priorityInput;
  }

  if (firstInvalidInput) {
    firstInvalidInput.reportValidity();
    firstInvalidInput.focus();
    return false;
  }

  return true;
}

function bindPopupNotificationValidation() {
  const form = document.getElementById("popupNotificationForm");
  if (!form || form.dataset.boundPopupValidation === "true") return;

  [
    "popupNotificationCtaTextInput",
    "popupNotificationCtaLinkInput",
    "popupNotificationStartAtInput",
    "popupNotificationEndAtInput",
    "popupNotificationPriorityInput"
  ].forEach((id) => {
    const input = document.getElementById(id);
    if (!input || input.dataset.boundPopupValidationInput === "true") return;

    const clearValidity = () => {
      input.setCustomValidity("");
    };

    input.addEventListener("input", clearValidity);
    input.addEventListener("change", clearValidity);
    input.dataset.boundPopupValidationInput = "true";
  });

  form.dataset.boundPopupValidation = "true";
}

function fillNotificationSettingsForm(settings = {}) {
  document.getElementById("notificationSettingsHotelSlugInput").value =
    settings.hotelSlug || "";
  document.getElementById("notificationOwnerEmailInput").value =
    settings.ownerEmail || "";
  document.getElementById("notificationEmailEnabledInput").checked =
    !!settings.emailEnabled;
  document.getElementById("notificationNotifyOrderInput").checked =
    settings.notifyOnNewOrder !== false;
  document.getElementById("notificationNotifyReservationInput").checked =
    settings.notifyOnNewReservation !== false;
  document.getElementById("notificationNotifyInquiryInput").checked =
    settings.notifyOnNewInquiry !== false;
}

function resetNotificationSettingsForm() {
  fillNotificationSettingsForm({
    hotelSlug: "",
    ownerEmail: "",
    emailEnabled: false,
    notifyOnNewOrder: true,
    notifyOnNewReservation: true,
    notifyOnNewInquiry: true
  });
}

function fillOrderingSettingsForm(settings = {}) {
  const help = document.getElementById("orderingSettingsHelp");

  document.getElementById("orderingSettingsHotelSlugInput").value =
    settings.hotelSlug || "";
  document.getElementById("orderingCustomerEnabledInput").checked =
    settings.customerOrderingEnabled !== false;
  document.getElementById("orderingStaffEnabledInput").checked =
    settings.staffOrderingEnabled !== false;
  document.getElementById("orderingWhatsappEnabledInput").checked =
    settings.whatsappOrderingEnabled !== false;
  document.getElementById("orderingSecureOnlinePaymentEnabledInput").checked =
    settings.secureOnlinePaymentEnabled !== false;
  document.getElementById("orderingCashOnDeliveryEnabledInput").checked =
    settings.cashOnDeliveryEnabled !== false;
  document.getElementById("orderingManualUpiPaymentEnabledInput").checked =
    settings.manualUpiPaymentEnabled !== false;
  document.getElementById("orderingDisabledTitleInput").value =
    settings.disabledTitle || "";
  document.getElementById("orderingDisabledMessageInput").value =
    settings.disabledMessage || "";
  document.getElementById("orderingDisabledButtonTextInput").value =
    settings.disabledButtonText || "";
  document.getElementById("orderingDisabledButtonLinkInput").value =
    settings.disabledButtonLink || "";
  document.getElementById("orderingDisabledIconInput").value =
    settings.disabledIcon || "";

  if (help) {
    help.textContent =
      "Ordering settings loaded. Public menu browsing stays live; customer ordering follows these saved flags.";
  }
}

function resetOrderingSettingsForm() {
  fillOrderingSettingsForm({
    hotelSlug: "",
    customerOrderingEnabled: true,
    staffOrderingEnabled: true,
    whatsappOrderingEnabled: true,
    secureOnlinePaymentEnabled: true,
    cashOnDeliveryEnabled: true,
    manualUpiPaymentEnabled: true,
    disabledTitle: "",
    disabledMessage: "",
    disabledButtonText: "",
    disabledButtonLink: "",
    disabledIcon: ""
  });
}

let loadedHotelFeatureSettings = null;

function getHotelFeatureBusinessType(settings = {}) {
  if (settings.enableFoodModule !== false && settings.enableRoomModule === true) {
    return "hotel_restaurant";
  }
  if (settings.enableRoomModule === true) return "hotel_only";
  return "restaurant_only";
}

function syncHotelFeatureDependencies({ fromBusinessType = false } = {}) {
  const businessTypeInput = document.getElementById("hotelBusinessTypeInput");
  const foodModuleInput = document.getElementById("hotelFeatureFoodModuleEnabledInput");
  const roomModuleInput = document.getElementById("hotelFeatureRoomModuleEnabledInput");
  const foodOrderingInput = document.getElementById("roomFeatureFoodOrderingEnabledInput");
  const roomBookingInput = document.getElementById("roomFeatureRoomBookingEnabledInput");
  const roomServiceInput = document.getElementById("roomFeatureRoomServiceEnabledInput");
  const foodReportsInput = document.getElementById("hotelFeatureFoodReportsEnabledInput");
  const roomReportsInput = document.getElementById("hotelFeatureRoomReportsEnabledInput");
  const combinedReportsInput = document.getElementById("hotelFeatureCombinedReportsEnabledInput");
  const combinedBillingInput = document.getElementById("hotelFeatureCombinedBillingEnabledInput");
  const help = document.getElementById("roomFeatureDependencyHelp");

  if (fromBusinessType && businessTypeInput) {
    const businessType = businessTypeInput.value;
    if (foodModuleInput) foodModuleInput.checked = businessType !== "hotel_only";
    if (roomModuleInput) roomModuleInput.checked = businessType !== "restaurant_only";
    if (foodOrderingInput) foodOrderingInput.checked = businessType !== "hotel_only";
    if (foodReportsInput) foodReportsInput.checked = businessType !== "hotel_only";
    if (roomBookingInput) roomBookingInput.checked = businessType !== "restaurant_only";
    if (roomReportsInput) roomReportsInput.checked = businessType !== "restaurant_only";
    if (combinedReportsInput) combinedReportsInput.checked = businessType === "hotel_restaurant";
  }

  const foodEnabled = foodModuleInput?.checked === true;
  const roomsEnabled = roomModuleInput?.checked === true;
  const combinedEnabled = foodEnabled && roomsEnabled;

  if (businessTypeInput && !fromBusinessType) {
    businessTypeInput.value = getHotelFeatureBusinessType({
      enableFoodModule: foodEnabled,
      enableRoomModule: roomsEnabled
    });
  }

  [foodOrderingInput, foodReportsInput].forEach((input) => {
    if (!input) return;
    input.disabled = !foodEnabled;
    if (!foodEnabled) input.checked = false;
  });
  [roomBookingInput, roomReportsInput].forEach((input) => {
    if (!input) return;
    input.disabled = !roomsEnabled;
    if (!roomsEnabled) input.checked = false;
  });

  if (roomServiceInput) {
    roomServiceInput.disabled = !combinedEnabled;
    if (!combinedEnabled) roomServiceInput.checked = false;
  }
  if (combinedReportsInput) {
    combinedReportsInput.disabled = !combinedEnabled;
    if (!combinedEnabled) combinedReportsInput.checked = false;
  }
  if (combinedBillingInput) {
    combinedBillingInput.disabled = !combinedEnabled || roomServiceInput?.checked !== true;
    if (combinedBillingInput.disabled) combinedBillingInput.checked = false;
  }

  if (help) {
    help.textContent = combinedEnabled
      ? "Both modules are enabled. Room Service and Combined Reports may be enabled; Combined Billing also requires Room Service."
      : foodEnabled
        ? "Restaurant-only: all Room Operations, Room Reports, Room Service, and combined features will be blocked."
        : "Hotel-only: all Food Operations, ordering, KDS, Food Reports, Room Service, and combined features will be blocked.";
  }
}

function fillRoomFeatureSettingsForm(settings = {}) {
  const help = document.getElementById("roomFeatureSettingsHelp");

  document.getElementById("roomFeatureSettingsHotelSlugInput").value =
    settings.hotelSlug || "";
  document.getElementById("hotelBusinessTypeInput").value =
    settings.businessType || getHotelFeatureBusinessType(settings);
  document.getElementById("hotelFeatureFoodModuleEnabledInput").checked =
    settings.enableFoodModule !== false;
  document.getElementById("hotelFeatureRoomModuleEnabledInput").checked =
    !!settings.enableRoomModule;
  document.getElementById("roomFeatureFoodOrderingEnabledInput").checked =
    settings.enableFoodOrdering !== false;
  document.getElementById("roomFeatureRoomBookingEnabledInput").checked =
    !!settings.enableRoomBooking;
  document.getElementById("roomFeatureRoomServiceEnabledInput").checked =
    !!settings.enableRoomService;
  document.getElementById("hotelFeatureFoodReportsEnabledInput").checked =
    settings.enableFoodReports !== false;
  document.getElementById("hotelFeatureRoomReportsEnabledInput").checked =
    !!settings.enableRoomReports;
  document.getElementById("hotelFeatureCombinedReportsEnabledInput").checked =
    !!settings.enableCombinedReports;
  document.getElementById("hotelFeatureCombinedBillingEnabledInput").checked =
    !!settings.enableCombinedBilling;

  syncHotelFeatureDependencies();
  loadedHotelFeatureSettings = settings.hotelSlug ? { ...settings } : null;

  if (help) {
    help.textContent =
      `Hotel module settings loaded${settings.version ? ` (version ${settings.version})` : ""}. Backend guards and staff visibility use this same configuration.`;
  }
}

function resetRoomFeatureSettingsForm() {
  fillRoomFeatureSettingsForm({
    hotelSlug: "",
    enableFoodModule: true,
    enableRoomModule: false,
    enableFoodOrdering: true,
    enableRoomBooking: false,
    enableRoomService: false,
    enableFoodReports: true,
    enableRoomReports: false,
    enableCombinedReports: false,
    enableCombinedBilling: false
  });
}

function fillPaymentRouteSettingsForm(settings = {}) {
  const help = document.getElementById("paymentRouteSettingsHelp");

  document.getElementById("paymentRouteHotelSlugInput").value =
    settings.hotelSlug || "";
  document.getElementById("paymentRouteProviderInput").value =
    settings.provider || "razorpay";
  document.getElementById("paymentRouteLinkedAccountInput").value =
    settings.razorpayLinkedAccountId || "";
  document.getElementById("paymentRouteEnabledInput").checked =
    !!settings.routeEnabled;

  if (help) {
    help.textContent = "Route settings loaded. Current checkout is unchanged until Route checkout is enabled later.";
  }
}

function resetPaymentRouteSettingsForm() {
  fillPaymentRouteSettingsForm({
    hotelSlug: "",
    provider: "razorpay",
    routeEnabled: false,
    razorpayLinkedAccountId: ""
  });
}

function setSectionVisibility(id, shouldShow) {
  const el = document.getElementById(id);
  if (!el) return false;

  const isHidden = getComputedStyle(el).display === "none";
  const nextVisibleState = typeof shouldShow === "boolean" ? shouldShow : isHidden;

  el.style.display = nextVisibleState ? "block" : "none";
  return nextVisibleState;
}

function scrollSectionIntoView(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadHotels() {
  const result = await fetchJson(`${API_BASE}/hotels`);
  state.hotels = result.hotels || [];
  renderHotelFilter();
  renderAdminScopeSummary();
}

async function loadTabData() {
  if (adminTabLoadController) {
    adminTabLoadController.abort();
  }

  const loadController = new AbortController();
  adminTabLoadController = loadController;
  const fetchTabJson = (url) =>
    fetchJson(url, { signal: loadController.signal });
  const content = $("#adminContent");
  content?.setAttribute("aria-busy", "true");

  try {
  renderAdminScopeSummary();
  if (content) {
    content.innerHTML = `<p class="loading-state">Loading ${escapeHTML(getLoadingLabel())}...</p>`;
  }

  if (state.activeTab === "orders") {
    const result = await fetchTabJson(buildUrl("orders"));
    state.orders = result.orders || [];
    renderOrders();
    return;
  }

  if (state.activeTab === "reservations") {
    const result = await fetchTabJson(buildUrl("reservations"));
    state.reservations = result.reservations || [];
    renderReservations();
    return;
  }

  if (state.activeTab === "inquiries") {
    const result = await fetchTabJson(buildUrl("inquiries"));
    state.inquiries = result.inquiries || [];
    renderInquiries();
    return;
  }

  if (state.activeTab === "contact-submissions") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/contact-submissions?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/contact-submissions`
    );
    state.contactSubmissions = result.contactSubmissions || [];
    renderContactSubmissions();
    return;
  }

  if (state.activeTab === "notification-events") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/notification-events?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/notification-events`
    );

    state.notificationEvents = result.notificationEvents || [];
    const maxRetries = Number.parseInt(
      String(result.notificationEventMaxRetries ?? ""),
      10
    );
    state.notificationEventMaxRetries =
      Number.isFinite(maxRetries) && maxRetries > 0 ? maxRetries : 3;
    renderNotificationEvents();
    return;
  }

  if (state.activeTab === "hotels") {
    renderHotels();
    return;
  }

  if (state.activeTab === "rooms") {
    const hotelSlug = getSelectedHotelSlug();
    const queryString = hotelSlug
      ? `?hotelSlug=${encodeURIComponent(hotelSlug)}`
      : "";
    const bookingQueryString = buildRoomBookingAdminQueryString(hotelSlug);
    const [roomTypesResult, roomsResult, bookingsResult] = await Promise.all([
      fetchTabJson(`${API_BASE}/room-booking/room-types${queryString}`),
      fetchTabJson(`${API_BASE}/room-booking/rooms${queryString}`),
      fetchTabJson(`${API_BASE}/room-booking/bookings${bookingQueryString}`)
    ]);

    state.roomTypes = roomTypesResult.roomTypes || [];
    state.rooms = roomsResult.rooms || [];
    state.roomBookings = bookingsResult.bookings || [];
    renderRoomsAdminList();
    return;
  }

  if (state.activeTab === "menu-categories") {
    const hotelSlug = getSelectedHotelSlug();
    if (!hotelSlug) {
      state.menuCategories = [];
      content.innerHTML = `<p class="empty-state">Select a hotel to manage its Menu Category Master.</p>`;
      return;
    }
    const result = await fetchTabJson(
      `${API_BASE}/menu-categories?hotelSlug=${encodeURIComponent(hotelSlug)}`
    );
    state.menuCategories = result.categories || [];
    refreshMenuCategoryOptions();
    renderMenuCategories();
    return;
  }

  if (state.activeTab === "menu-items") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/menu-items?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/menu-items`
    );

    state.menuItems = result.menuItems || [];
    renderMenuItems();
    return;
  }

  if (state.activeTab === "menu-combos") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/menu-combos?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/menu-combos`
    );

    state.menuCombos = result.menuCombos || [];
    renderMenuCombos();
    return;
  }

  if (state.activeTab === "gallery-items") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/gallery-items?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/gallery-items`
    );

    state.galleryItems = result.galleryItems || [];
    renderGalleryItems();
    return;
  }

  if (state.activeTab === "popup-notifications") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/popup-notifications?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/popup-notifications`
    );

    state.popupNotifications = result.popupNotifications || [];
    renderPopupNotifications();
    return;
  }

  if (state.activeTab === "testimonials") {
    const hotelSlug = getSelectedHotelSlug();
    const result = await fetchTabJson(
      hotelSlug
        ? `${API_BASE}/testimonials?hotelSlug=${encodeURIComponent(hotelSlug)}`
        : `${API_BASE}/testimonials`
    );

    state.testimonials = result.testimonials || [];
    renderTestimonialsAdminList();
    return;
  }

  if (content) {
    content.innerHTML = `<p class="empty-state">Select a valid dashboard section.</p>`;
  }
  } catch (error) {
    if (error?.name === "AbortError") return;
    throw error;
  } finally {
    if (adminTabLoadController === loadController) {
      adminTabLoadController = null;
      content?.setAttribute("aria-busy", "false");
    }
  }
}
function renderMenuCategories() {
  const content = $("#adminContent");
  if (!content) return;
  if (!state.menuCategories.length) {
    content.innerHTML = `${buildAdminListSummaryCard({
      title: "Menu Categories",
      count: 0,
      description: "No menu categories are configured. Add a category to begin creating the menu."
    })}`;
    return;
  }
  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Menu Categories",
      count: state.menuCategories.length,
      description: "Authoritative hotel-scoped ordering for Manager, Staff, Take Order, Website, and QR."
    })}
    <div class="admin-grid">
      ${state.menuCategories.map((category) => `
        <article class="admin-card">
          <h3>${escapeHTML(category.name)}</h3>
          <div class="admin-meta">${escapeHTML(category.key)} • /${escapeHTML(category.slug || "")}</div>
          <div class="admin-row"><strong>Display Order:</strong> ${escapeHTML(category.displayOrder ?? 0)}</div>
          <div class="admin-row"><strong>Visible Items:</strong> ${escapeHTML(category.itemCount ?? 0)}</div>
          <div class="admin-state-list">
            ${buildBooleanStateBadge(category.isActive, { onLabel: "Active", offLabel: "Inactive", onTone: "success", offTone: "warning" })}
            ${buildBooleanStateBadge(category.isPublished, { onLabel: "Published", offLabel: "Unpublished", onTone: "success", offTone: "neutral" })}
            ${buildBooleanStateBadge(category.staffEnabled, { onLabel: "Staff", offLabel: "No Staff", onTone: "success", offTone: "neutral" })}
            ${buildBooleanStateBadge(category.websiteEnabled, { onLabel: "Website", offLabel: "No Website", onTone: "success", offTone: "neutral" })}
            ${buildBooleanStateBadge(category.qrEnabled, { onLabel: "QR", offLabel: "No QR", onTone: "success", offTone: "neutral" })}
          </div>
          <div class="admin-row"><strong>Fallback Image:</strong> ${escapeHTML(category.defaultImage?.cardUrl || "Global food placeholder")}</div>
          <div class="status-row admin-card-actions">
            <button class="status-btn" data-edit-menu-category data-id="${escapeHTML(category.reference)}">Edit Category</button>
            <button class="status-btn" data-delete-menu-category data-id="${escapeHTML(category.reference)}"
              ${Number(category.itemCount || 0) > 0 ? "disabled" : ""}
              title="${Number(category.itemCount || 0) > 0 ? "Move menu items or archive this category before deleting it" : "Permanently delete this empty category"}">
              Delete Empty Category
            </button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderMenuItems() {
  const content = $("#adminContent");
  if (!content) return;
  const searchQuery = String(state.menuItemSearchQuery || "");
  const filteredMenuItems = filterMenuItemsBySearchQuery(
    state.menuItems,
    searchQuery
  );
  const menuCountLabel = searchQuery.trim()
    ? `${filteredMenuItems.length} of ${state.menuItems.length}`
    : state.menuItems.length;

  if (!state.menuItems.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Menu Items",
        count: 0,
        description: "Browse menu records for the current hotel scope."
      })}
      <p class="empty-state">No menu items found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Menu Items",
      count: menuCountLabel,
      description: "Browse menu records for the current hotel scope."
    })}
    <div class="admin-card admin-list-summary">
      <div class="admin-list-toolbar">
        <input
          class="admin-list-search"
          type="search"
          data-menu-item-search
          value="${escapeHTML(searchQuery)}"
          placeholder="Search by name, category, item ID, description, badge, tag, or hotel slug" />
        <p class="admin-list-helper-text">
          ${
            searchQuery.trim()
              ? escapeHTML(
                  `Showing ${filteredMenuItems.length} matching menu items in the current scope.`
                )
              : "Search filters only the menu items already loaded for the current hotel scope."
          }
        </p>
      </div>
    </div>
    ${
      filteredMenuItems.length
        ? `
    <div class="admin-grid">
      ${filteredMenuItems
        .map(
          (item) => `
            <article class="admin-card">
              <h3>${escapeHTML(item.name || "")}</h3>
              <div class="admin-meta">${escapeHTML(item.hotel_slug || "")} • ${escapeHTML(item.category || "")}</div>

              <div class="admin-row"><strong>DB ID:</strong> ${escapeHTML(item.id)}</div>
              <div class="admin-row"><strong>Item ID:</strong> ${escapeHTML(item.item_id || "")}</div>
              <div class="admin-row"><strong>Price:</strong> ₹${escapeHTML(item.price ?? "")}</div>
              <div class="admin-row"><strong>Badge:</strong> ${escapeHTML(item.badge || "")}</div>
              <div class="admin-row"><strong>Tag:</strong> ${escapeHTML(item.tag || "")}</div>
              <div class="admin-row admin-state-line">
                <strong>State:</strong>
                <div class="admin-state-list">
                  ${buildBooleanStateBadge(item.is_available, {
                    onLabel: "Available",
                    offLabel: "Unavailable",
                    onTone: "success",
                    offTone: "warning"
                  })}
                  ${buildBooleanStateBadge(item.is_archived, {
                    onLabel: "Archived",
                    offLabel: "Live",
                    onTone: "danger",
                    offTone: "neutral"
                  })}
                </div>
              </div>
              <div class="admin-row"><strong>Sort Order:</strong> ${escapeHTML(item.sort_order ?? "")}</div>

              <div class="status-row admin-card-actions">
                <button class="status-btn" data-edit-menu-item data-id="${escapeHTML(item.id)}">
                  Edit Menu Item
                </button>

                <button 
                  class="status-btn" 
                  data-toggle-menu-archive 
                  data-id="${escapeHTML(item.id)}" 
                  data-archived="${escapeHTML(String(item.is_archived))}">
                  ${item.is_archived ? "Restore Menu Item" : "Archive Menu Item"}
                </button>

                <button 
                  class="status-btn" 
                  data-delete-menu-item 
                  data-id="${escapeHTML(item.id)}">
                  Delete Menu Item
                </button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
    `
        : `<p class="empty-state">No menu items match the current search.</p>`
    }
  `;
}

function renderMenuCombos() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.menuCombos.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Combo Offers",
        count: 0,
        description: "Browse combo offers for the current hotel scope."
      })}
      <p class="empty-state">No combo offers found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Combo Offers",
      count: state.menuCombos.length,
      description: "Browse combo offers for the current hotel scope."
    })}
    <div class="admin-grid">
      ${state.menuCombos
        .map((item) => {
          const childItems = Array.isArray(item.childItems) ? item.childItems : [];
          const childItemSummary = childItems.length
            ? childItems
                .map((childItem) => {
                  const childName = String(childItem.childName || childItem.childItemId || "").trim();
                  const quantity = Number(childItem.quantity || 1);
                  return `${quantity}x ${childName}`;
                })
                .join(", ")
            : "No child items saved";
          const availabilityWindow = [
            item.startDate || "",
            item.startTime || "",
            item.endDate ? "to" : "",
            item.endDate || "",
            item.endTime || ""
          ]
            .filter(Boolean)
            .join(" ");

          return `
            <article class="admin-card">
              <h3>${escapeHTML(item.name || "")}</h3>
              <div class="admin-meta">${escapeHTML(item.hotelSlug || item.hotel_slug || "")} - ${escapeHTML(item.category || "combos")}</div>

              <div class="admin-row"><strong>DB ID:</strong> ${escapeHTML(item.id ?? "")}</div>
              <div class="admin-row"><strong>Combo Item ID:</strong> ${escapeHTML(item.itemId || item.item_id || "")}</div>
              <div class="admin-row"><strong>Combo Price:</strong> Rs. ${escapeHTML(item.price ?? "")}</div>
              <div class="admin-row"><strong>Original Price:</strong> Rs. ${escapeHTML(item.originalPrice ?? 0)}</div>
              <div class="admin-row"><strong>Savings:</strong> Rs. ${escapeHTML(item.savings ?? 0)}</div>
              <div class="admin-row"><strong>Badge:</strong> ${escapeHTML(item.badge || "")}</div>
              <div class="admin-row"><strong>Tag:</strong> ${escapeHTML(item.tag || "")}</div>
              <div class="admin-row"><strong>Window:</strong> ${escapeHTML(availabilityWindow || "Always available")}</div>
              <div class="admin-row"><strong>Includes:</strong> ${escapeHTML(childItemSummary)}</div>
              <div class="admin-row admin-state-line">
                <strong>State:</strong>
                <div class="admin-state-list">
                  ${buildBooleanStateBadge(item.isAvailable, {
                    onLabel: "Available",
                    offLabel: "Unavailable",
                    onTone: "success",
                    offTone: "warning"
                  })}
                  ${buildBooleanStateBadge(item.isArchived, {
                    onLabel: "Archived",
                    offLabel: "Live",
                    onTone: "danger",
                    offTone: "neutral"
                  })}
                </div>
              </div>
              <div class="admin-row"><strong>Sort Order:</strong> ${escapeHTML(item.sortOrder ?? 0)}</div>

              <div class="status-row admin-card-actions">
                <button class="status-btn" data-edit-menu-combo data-id="${escapeHTML(item.id)}">
                  Edit Combo
                </button>
                <button
                  class="status-btn"
                  data-toggle-menu-combo-active
                  data-id="${escapeHTML(item.id)}"
                  data-active="${escapeHTML(String(item.isAvailable === true))}">
                  ${item.isAvailable === true ? "Deactivate Combo" : "Activate Combo"}
                </button>
                <button
                  class="status-btn"
                  data-delete-menu-combo
                  data-id="${escapeHTML(item.id)}">
                  Delete Combo
                </button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderGalleryItems() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.galleryItems.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Gallery Items",
        count: 0,
        description: "Browse gallery records for the current hotel scope."
      })}
      <p class="empty-state">No gallery items found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Gallery Items",
      count: state.galleryItems.length,
      description: "Browse gallery records for the current hotel scope."
    })}
    <div class="admin-grid">
      ${state.galleryItems
        .map(
          (item) => `
            <article class="admin-card">
              <h3>${escapeHTML(item.alt || `Gallery Item #${item.id || ""}`)}</h3>
              <div class="admin-meta">${escapeHTML(item.hotel_slug || "")} • ${escapeHTML(item.layout_variant || "standard")}</div>

              <div class="admin-row"><strong>DB ID:</strong> ${escapeHTML(item.id ?? "")}</div>
              <div class="admin-row"><strong>Image URL:</strong> ${escapeHTML(item.image_url || "")}</div>
              <div class="admin-row"><strong>Storage Path:</strong> ${escapeHTML(item.storage_path || "")}</div>
              <div class="admin-row admin-state-line">
                <strong>State:</strong>
                <div class="admin-state-list">
                  ${buildBooleanStateBadge(item.is_active, {
                    onLabel: "Active",
                    offLabel: "Inactive",
                    onTone: "success",
                    offTone: "warning"
                  })}
                  ${buildBooleanStateBadge(item.is_archived, {
                    onLabel: "Archived",
                    offLabel: "Live",
                    onTone: "danger",
                    offTone: "neutral"
                  })}
                </div>
              </div>
              <div class="admin-row"><strong>Sort Order:</strong> ${escapeHTML(item.sort_order ?? "")}</div>

              <div class="status-row admin-card-actions">
                <button class="status-btn" data-edit-gallery-item data-id="${escapeHTML(item.id)}">
                  Edit Gallery Item
                </button>

                ${
                  item.is_archived
                    ? `
                <button
                  class="status-btn"
                  data-toggle-gallery-archive
                  data-id="${escapeHTML(item.id)}"
                  data-archived="${escapeHTML(String(item.is_archived))}">
                  Restore Gallery Item
                </button>

                <button
                  class="status-btn"
                  data-delete-gallery-item
                  data-id="${escapeHTML(item.id)}">
                  Delete Gallery Item
                </button>
                `
                    : `
                <button
                  class="status-btn"
                  data-toggle-gallery-active
                  data-id="${escapeHTML(item.id)}"
                  data-active="${escapeHTML(String(item.is_active))}">
                  ${item.is_active ? "Deactivate Gallery Item" : "Activate Gallery Item"}
                </button>

                <button
                  class="status-btn"
                  data-toggle-gallery-archive
                  data-id="${escapeHTML(item.id)}"
                  data-archived="${escapeHTML(String(item.is_archived))}">
                  Archive Gallery Item
                </button>
                `
                }
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPopupNotifications() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.popupNotifications.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Popup Notifications",
        count: 0,
        description: "Browse hotel-specific popup records for the current scope."
      })}
      <p class="empty-state">No popup notifications found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Popup Notifications",
      count: state.popupNotifications.length,
      description: "Browse hotel-specific popup records for the current scope."
    })}
    <div class="admin-grid">
      ${state.popupNotifications
        .map(
          (item) => `
            <article class="admin-card">
              <h3>${escapeHTML(item.title || `Popup #${item.id || ""}`)}</h3>
              <div class="admin-meta">${escapeHTML(item.hotel_slug || item.hotelSlug || "")} • ${escapeHTML(item.display_mode || item.displayMode || "once_per_session")}</div>

              <div class="admin-row"><strong>DB ID:</strong> ${escapeHTML(item.id ?? "")}</div>
              <div class="admin-row"><strong>Description:</strong> ${escapeHTML(item.description || "")}</div>
              <div class="admin-row"><strong>Image URL:</strong> ${escapeHTML(item.image_url || item.imageUrl || "")}</div>
              <div class="admin-row"><strong>Storage Path:</strong> ${escapeHTML(item.storage_path || item.storagePath || "")}</div>
              <div class="admin-row"><strong>CTA:</strong> ${escapeHTML(item.cta_text || item.ctaText || "")}</div>
              <div class="admin-row"><strong>CTA Link:</strong> ${escapeHTML(item.cta_link || item.ctaLink || "")}</div>
              <div class="admin-row"><strong>Priority:</strong> ${escapeHTML(item.priority ?? 0)}</div>
              <div class="admin-row"><strong>Start:</strong> ${escapeHTML(item.start_at || item.startAt || "")}</div>
              <div class="admin-row"><strong>End:</strong> ${escapeHTML(item.end_at || item.endAt || "")}</div>
              <div class="admin-row admin-state-line">
                <strong>State:</strong>
                <div class="admin-state-list">
                  ${buildBooleanStateBadge(item.is_active, {
                    onLabel: "Active",
                    offLabel: "Inactive",
                    onTone: "success",
                    offTone: "warning"
                  })}
                </div>
              </div>

              <div class="status-row admin-card-actions">
                <button class="status-btn" data-edit-popup-notification data-id="${escapeHTML(item.id)}">
                  Edit Popup
                </button>
                <button
                  class="status-btn"
                  data-toggle-popup-notification-active
                  data-id="${escapeHTML(item.id)}"
                  data-active="${escapeHTML(String(item.is_active === true))}">
                  ${item.is_active === true ? "Deactivate Popup" : "Activate Popup"}
                </button>
                <button
                  class="status-btn"
                  data-delete-popup-notification
                  data-id="${escapeHTML(item.id)}">
                  Delete Popup
                </button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTestimonialsAdminList() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.testimonials.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Testimonials",
        count: 0,
        description: "Browse hotel-specific testimonial records for the current scope."
      })}
      <p class="empty-state">No testimonials found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Testimonials",
      count: state.testimonials.length,
      description: "Browse hotel-specific testimonial records for the current scope."
    })}
    <div class="admin-grid">
      ${state.testimonials
        .map(
          (item) => `
            <article class="admin-card">
              <h3>${escapeHTML(item.guest_name || item.name || `Testimonial #${item.id || ""}`)}</h3>
              <div class="admin-meta">${escapeHTML(item.hotel_slug || item.hotelSlug || "")} • ${escapeHTML(item.guest_role || item.role || "Guest")}</div>

              <div class="admin-row"><strong>DB ID:</strong> ${escapeHTML(item.id ?? "")}</div>
              <div class="admin-row"><strong>Review:</strong> ${escapeHTML(item.review_text || item.text || "")}</div>
              <div class="admin-row"><strong>Stars:</strong> ${escapeHTML(item.star_rating ?? item.stars ?? "")}</div>
              <div class="admin-row"><strong>Avatar URL:</strong> ${escapeHTML(item.avatar_url || item.avatar || "")}</div>
              <div class="admin-row admin-state-line">
                <strong>State:</strong>
                <div class="admin-state-list">
                  ${buildBooleanStateBadge(item.is_active, {
                    onLabel: "Active",
                    offLabel: "Inactive",
                    onTone: "success",
                    offTone: "warning"
                  })}
                  ${buildBooleanStateBadge(item.is_approved, {
                    onLabel: "Approved",
                    offLabel: "Pending",
                    onTone: "success",
                    offTone: "warning"
                  })}
                  ${buildBooleanStateBadge(item.is_archived, {
                    onLabel: "Archived",
                    offLabel: "Live",
                    onTone: "danger",
                    offTone: "neutral"
                  })}
                </div>
              </div>
              <div class="admin-row"><strong>Sort Order:</strong> ${escapeHTML(item.sort_order ?? item.sortOrder ?? "")}</div>
              <div class="admin-row"><strong>Created At:</strong> ${escapeHTML(item.created_at || "")}</div>

              <div class="status-row admin-card-actions">
                <button class="status-btn" data-edit-testimonial data-id="${escapeHTML(item.id)}">
                  Edit Testimonial
                </button>
                <button
                  class="status-btn"
                  data-toggle-testimonial-approval
                  data-id="${escapeHTML(item.id)}"
                  data-approved="${escapeHTML(String(item.is_approved !== false))}">
                  ${item.is_approved !== false ? "Mark Pending" : "Approve Testimonial"}
                </button>
                <button
                  class="status-btn"
                  data-toggle-testimonial-archive
                  data-id="${escapeHTML(item.id)}"
                  data-archived="${escapeHTML(String(item.is_archived === true))}">
                  ${item.is_archived === true ? "Restore Testimonial" : "Archive Testimonial"}
                </button>
                <button
                  class="status-btn"
                  data-delete-testimonial
                  data-id="${escapeHTML(item.id)}">
                  Delete Testimonial
                </button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function normalizeNotificationEventStatus(value = "") {
  const status = String(value || "").trim().toLowerCase();
  const supportedStatuses = ["pending", "sent", "failed", "skipped"];

  return supportedStatuses.includes(status) ? status : "unknown";
}

function buildNotificationStatusCounts(notificationEvents = []) {
  const counts = {
    total: notificationEvents.length,
    pending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    unknown: 0
  };

  for (const event of notificationEvents) {
    const status = normalizeNotificationEventStatus(event?.status);
    counts[status] += 1;
  }

  return counts;
}

function getNotificationEventRetryCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function renderNotificationEvents() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.notificationEvents.length) {
    content.innerHTML = `<p class="empty-state">No notification events found.</p>`;
    return;
  }

  const statusCounts = buildNotificationStatusCounts(state.notificationEvents);

  content.innerHTML = `
    <div class="admin-card">
      <h3>Delivery Status Overview</h3>
      <div class="status-row">
        <span class="status-badge">Total: ${escapeHTML(statusCounts.total)}</span>
        <span class="status-badge">Pending: ${escapeHTML(statusCounts.pending)}</span>
        <span class="status-badge">Sent: ${escapeHTML(statusCounts.sent)}</span>
        <span class="status-badge">Failed: ${escapeHTML(statusCounts.failed)}</span>
        <span class="status-badge">Skipped: ${escapeHTML(statusCounts.skipped)}</span>
        <span class="status-badge">Unknown: ${escapeHTML(statusCounts.unknown)}</span>
      </div>
    </div>

    <div class="admin-grid">
      ${state.notificationEvents
        .map(
          (event) => `
            <article class="admin-card">
              <h3>${escapeHTML(event.event_type || "notification_event")}</h3>
              <div class="admin-meta">${escapeHTML(event.hotel_slug || "shared")} • ${escapeHTML(event.source_type || "unknown")}</div>

              <div class="admin-row"><strong>DB ID:</strong> ${escapeHTML(event.id ?? "")}</div>
              <div class="admin-row"><strong>Source ID:</strong> ${escapeHTML(event.source_id || "")}</div>
              <div class="admin-row"><strong>Channel:</strong> ${escapeHTML(event.delivery_channel || "")}</div>
              <div class="admin-row"><strong>Status:</strong> ${escapeHTML(event.status || "")}</div>
              <div class="admin-row"><strong>Retry Count:</strong> ${escapeHTML(getNotificationEventRetryCount(event.retry_count))}</div>
              <div class="admin-row"><strong>Last Retry At:</strong> ${escapeHTML(event.last_retry_at || "")}</div>
              <div class="admin-row"><strong>Created At:</strong> ${escapeHTML(event.created_at || "")}</div>
              <div class="admin-row"><strong>Processed At:</strong> ${escapeHTML(event.processed_at || "")}</div>
              <div class="admin-row"><strong>Error:</strong> ${escapeHTML(event.error_message || "")}</div>

              ${
                ["failed", "skipped"].includes(
                  String(event.status || "").trim().toLowerCase()
                ) &&
                getNotificationEventRetryCount(event.retry_count) <
                  state.notificationEventMaxRetries
                  ? `
              <button
                class="status-btn"
                data-resend-notification-event
                data-id="${escapeHTML(event.id ?? "")}">
                Resend Notification
              </button>
              `
                  : ""
              }
              ${
                ["failed", "skipped"].includes(
                  String(event.status || "").trim().toLowerCase()
                ) &&
                getNotificationEventRetryCount(event.retry_count) >=
                  state.notificationEventMaxRetries
                  ? `
              <div class="admin-row"><strong>Retry:</strong> Maximum resend attempts reached (${escapeHTML(
                state.notificationEventMaxRetries
              )})</div>
              `
                  : ""
              }

              <pre class="json-box">${escapeHTML(
                JSON.stringify(
                  event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
                    ? event.payload
                    : {},
                  null,
                  2
                )
              )}</pre>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function bindEditActions() {
  document.addEventListener("click", async (e) => {
    const resendNotificationBtn = e.target.closest(
      "[data-resend-notification-event]"
    );
    if (resendNotificationBtn) {
      const notificationEventId = resendNotificationBtn.dataset.id;
      if (!notificationEventId) return;

      if (!window.confirm("Resend this notification event now?")) {
        return;
      }

      try {
        await resendNotificationEvent(notificationEventId);
        await loadTabData();
      } catch (error) {
        console.error("Notification resend failed:", error);
        alert(error.message || "Failed to resend notification event");
      }
      return;
    }

    const menuBtn = e.target.closest("[data-edit-menu-item]");
    if (menuBtn) {
      const id = menuBtn.dataset.id;
      const item = state.menuItems.find((entry) => String(entry.id) === String(id));
      if (!item) return;

      setSectionVisibility("menuFormSection", true);
      document.getElementById("menuItemDbId").value = item.id || "";
      document.getElementById("menuHotelSlugInput").value = item.hotel_slug || "";
      document.getElementById("menuCategoryInput").value = item.category || "";
      document.getElementById("menuItemIdInput").value = item.item_id || "";
      document.getElementById("menuNameInput").value = item.name || "";
      document.getElementById("menuDescriptionInput").value = item.description || "";
      document.getElementById("menuPriceInput").value = item.price || 0;
      document.getElementById("menuImageInput").value = item.image || "";
      document.getElementById("menuAltInput").value = item.alt || "";
      document.getElementById("menuBadgeInput").value = item.badge || "";
      document.getElementById("menuTagInput").value = item.tag || "";
      document.getElementById("menuSortOrderInput").value = item.sort_order || 0;
      document.getElementById("menuIsAvailableInput").checked = !!item.is_available;
      scrollSectionIntoView("menuFormSection");
      return;
    }

    const menuComboBtn = e.target.closest("[data-edit-menu-combo]");
    if (menuComboBtn) {
      const id = menuComboBtn.dataset.id;
      const item = state.menuCombos.find((entry) => String(entry.id) === String(id));
      if (!item) return;

      setSectionVisibility("menuComboFormSection", true);
      fillMenuComboForm(item);
      scrollSectionIntoView("menuComboFormSection");
      return;
    }

    const galleryBtn = e.target.closest("[data-edit-gallery-item]");
    if (galleryBtn) {
      const id = galleryBtn.dataset.id;
      const item = state.galleryItems.find((entry) => String(entry.id) === String(id));
      if (!item) return;

      setSectionVisibility("galleryFormSection", true);
      document.getElementById("galleryItemDbId").value = item.id || "";
      document.getElementById("galleryHotelSlugInput").value = item.hotel_slug || "";
      document.getElementById("galleryImageUrlInput").value = item.image_url || "";
      document.getElementById("galleryStoragePathInput").value = item.storage_path || "";
      document.getElementById("galleryAltInput").value = item.alt || "";
      document.getElementById("galleryLayoutVariantInput").value = item.layout_variant || "standard";
      document.getElementById("gallerySortOrderInput").value = item.sort_order || 0;
      document.getElementById("galleryIsActiveInput").checked = !!item.is_active;
      scrollSectionIntoView("galleryFormSection");
      return;
    }

    const testimonialBtn = e.target.closest("[data-edit-testimonial]");
    if (testimonialBtn) {
      const id = testimonialBtn.dataset.id;
      const item = state.testimonials.find((entry) => String(entry.id) === String(id));
      if (!item) return;

      setSectionVisibility("testimonialFormSection", true);
      document.getElementById("testimonialDbId").value = item.id || "";
      document.getElementById("testimonialHotelSlugInput").value =
        item.hotel_slug || item.hotelSlug || "";
      document.getElementById("testimonialNameInput").value =
        item.guest_name || item.name || "";
      document.getElementById("testimonialRoleInput").value =
        item.guest_role || item.role || "";
      document.getElementById("testimonialTextInput").value =
        item.review_text || item.text || "";
      document.getElementById("testimonialStarsInput").value =
        item.star_rating ?? item.stars ?? 5;
      document.getElementById("testimonialAvatarInput").value =
        item.avatar_url || item.avatar || "";
      document.getElementById("testimonialSortOrderInput").value =
        item.sort_order ?? item.sortOrder ?? 0;
      document.getElementById("testimonialIsActiveInput").checked = !!item.is_active;
      document.getElementById("testimonialIsApprovedInput").checked =
        item.is_approved !== false;
      scrollSectionIntoView("testimonialFormSection");
      return;
    }

    const popupNotificationBtn = e.target.closest("[data-edit-popup-notification]");
    if (popupNotificationBtn) {
      const id = popupNotificationBtn.dataset.id;
      const item = state.popupNotifications.find((entry) => String(entry.id) === String(id));
      if (!item) return;

      setSectionVisibility("popupNotificationFormSection", true);
      fillPopupNotificationForm(item);
      scrollSectionIntoView("popupNotificationFormSection");
      return;
    }

    const hotelBtn = e.target.closest("[data-edit-hotel]");
    if (hotelBtn) {
      const id = hotelBtn.dataset.id;
      const hotel = state.hotels.find((entry) => String(entry.id) === String(id));
      if (!hotel) return;

      setSectionVisibility("hotelFormSection", true);
      document.getElementById("hotelId").value = hotel.id || "";
      document.getElementById("hotelSlugInput").value = hotel.slug || "";
      document.getElementById("hotelNameInput").value = hotel.name || "";
      document.getElementById("hotelWhatsappInput").value = hotel.whatsapp_number || "";
      document.getElementById("hotelUpiInput").value = hotel.upi_id || "";
      document.getElementById("hotelGstInput").value = hotel.gst_percent || 5;
      document.getElementById("hotelPrimaryDomainInput").value = hotel.primary_domain || "";
      document.getElementById("hotelSubdomainInput").value = hotel.subdomain || "";
      document.getElementById("hotelIsActiveInput").checked = !!hotel.is_active;
      resetHotelDomainResolveState({
        host: hotel.primary_domain || "",
        message: hotel.primary_domain
          ? "Primary domain loaded. Run the hostname check when you want to verify routing."
          : "Paste the exact hostname you want to test."
      });
      void loadHotelLaunchReadiness(hotel.id || "");
      scrollSectionIntoView("hotelFormSection");
    }

    const profileBtn = e.target.closest("[data-edit-profile]");
if (profileBtn) {
  const slug = profileBtn.dataset.slug;
  if (!slug) return;

  try {
    const result = await fetchHotelProfile(slug);
    fillProfileForm(result.profile);
  } catch (error) {
    console.error("Failed to load profile:", error);
    alert("Failed to load hotel profile");
  }
  return;
}

const archiveBtn = e.target.closest("[data-toggle-menu-archive]");
if (archiveBtn) {
  const id = archiveBtn.dataset.id;
  const currentArchived = archiveBtn.dataset.archived === "true";

  const confirmMessage = currentArchived
    ? "Restore this menu item?"
    : "Archive this menu item?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleMenuArchive(id, !currentArchived);
    await loadTabData();
  } catch (error) {
    console.error("Toggle menu archive failed:", error);
    alert("Failed to update menu item archive state");
  }
  return;
}

const menuComboActiveBtn = e.target.closest("[data-toggle-menu-combo-active]");
if (menuComboActiveBtn) {
  const id = menuComboActiveBtn.dataset.id;
  const currentActive = menuComboActiveBtn.dataset.active === "true";

  const confirmMessage = currentActive
    ? "Deactivate this combo offer?"
    : "Activate this combo offer?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleMenuComboActive(id, !currentActive);
    await loadTabData();
  } catch (error) {
    console.error("Toggle menu combo active failed:", error);
    alert(error.message || "Failed to update combo offer state");
  }
  return;
}

const galleryArchiveBtn = e.target.closest("[data-toggle-gallery-archive]");
if (galleryArchiveBtn) {
  const id = galleryArchiveBtn.dataset.id;
  const currentArchived = galleryArchiveBtn.dataset.archived === "true";

  const confirmMessage = currentArchived
    ? "Restore this gallery item?"
    : "Archive this gallery item?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleGalleryArchive(id, !currentArchived);
    await loadTabData();
  } catch (error) {
    console.error("Toggle gallery archive failed:", error);
    alert("Failed to update gallery item archive state");
  }
  return;
}

const galleryActiveBtn = e.target.closest("[data-toggle-gallery-active]");
if (galleryActiveBtn) {
  const id = galleryActiveBtn.dataset.id;
  const currentActive = galleryActiveBtn.dataset.active === "true";

  const confirmMessage = currentActive
    ? "Deactivate this gallery item?"
    : "Activate this gallery item?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleGalleryActive(id, !currentActive);
    await loadTabData();
  } catch (error) {
    console.error("Toggle gallery active failed:", error);
    alert("Failed to update gallery item active state");
  }
  return;
}

const popupNotificationActiveBtn = e.target.closest("[data-toggle-popup-notification-active]");
if (popupNotificationActiveBtn) {
  const id = popupNotificationActiveBtn.dataset.id;
  const currentActive = popupNotificationActiveBtn.dataset.active === "true";

  const confirmMessage = currentActive
    ? "Deactivate this popup notification?"
    : "Activate this popup notification?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await togglePopupNotificationActive(id, !currentActive);
    await loadTabData();
  } catch (error) {
    console.error("Toggle popup notification active failed:", error);
    alert("Failed to update popup notification state");
  }
  return;
}

const deleteGalleryBtn = e.target.closest("[data-delete-gallery-item]");
if (deleteGalleryBtn) {
  const id = deleteGalleryBtn.dataset.id;
  const item = state.galleryItems.find((entry) => String(entry.id) === String(id));

  if (!item || !item.is_archived) {
    alert("Archive the gallery item before deleting it permanently.");
    return;
  }

  if (
    !window.confirm(
      "Delete this gallery item permanently? The gallery record will be removed, but the uploaded image file will stay in storage."
    )
  ) {
    return;
  }

  try {
    await deleteGalleryItem(id);

    if (String(document.getElementById("galleryItemDbId")?.value || "") === String(id)) {
      resetGalleryItemForm();
    }

    await loadTabData();
  } catch (error) {
    console.error("Delete gallery item failed:", error);
    alert("Failed to delete gallery item");
  }
  return;
}

const deletePopupNotificationBtn = e.target.closest("[data-delete-popup-notification]");
if (deletePopupNotificationBtn) {
  const id = deletePopupNotificationBtn.dataset.id;

  if (!window.confirm("Delete this popup notification permanently? This cannot be undone.")) {
    return;
  }

  try {
    await deletePopupNotification(id);

    if (String(document.getElementById("popupNotificationDbId")?.value || "") === String(id)) {
      resetPopupNotificationForm();
    }

    await loadTabData();
  } catch (error) {
    console.error("Delete popup notification failed:", error);
    alert("Failed to delete popup notification");
  }
  return;
}

const deleteMenuBtn = e.target.closest("[data-delete-menu-item]");
if (deleteMenuBtn) {
  const id = deleteMenuBtn.dataset.id;

  if (!window.confirm("Delete this menu item permanently? This cannot be undone.")) {
    return;
  }

  try {
    await deleteMenuItem(id);
    await loadTabData();
  } catch (error) {
    console.error("Delete menu item failed:", error);
    alert("Failed to delete menu item");
  }
  return;
}

const deleteMenuComboBtn = e.target.closest("[data-delete-menu-combo]");
if (deleteMenuComboBtn) {
  const id = deleteMenuComboBtn.dataset.id;

  if (!window.confirm("Delete this combo offer permanently? This cannot be undone.")) {
    return;
  }

  try {
    await deleteMenuCombo(id);

    if (String(document.getElementById("menuComboDbId")?.value || "") === String(id)) {
      resetMenuComboForm();
    }

    await loadTabData();
  } catch (error) {
    console.error("Delete menu combo failed:", error);
    alert(error.message || "Failed to delete combo offer");
  }
  return;
}

const testimonialApprovalBtn = e.target.closest("[data-toggle-testimonial-approval]");
if (testimonialApprovalBtn) {
  const id = testimonialApprovalBtn.dataset.id;
  const currentApproved = testimonialApprovalBtn.dataset.approved === "true";

  const confirmMessage = currentApproved
    ? "Mark this testimonial as pending so it no longer appears publicly?"
    : "Approve this testimonial for public display?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleTestimonialApproval(id, !currentApproved);
    await loadTabData();
  } catch (error) {
    console.error("Toggle testimonial approval failed:", error);
    alert("Failed to update testimonial approval");
  }
  return;
}

const testimonialArchiveBtn = e.target.closest("[data-toggle-testimonial-archive]");
if (testimonialArchiveBtn) {
  const id = testimonialArchiveBtn.dataset.id;
  const currentArchived = testimonialArchiveBtn.dataset.archived === "true";

  const confirmMessage = currentArchived
    ? "Restore this testimonial?"
    : "Archive this testimonial?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleTestimonialArchive(id, !currentArchived);
    await loadTabData();
  } catch (error) {
    console.error("Toggle testimonial archive failed:", error);
    alert("Failed to update testimonial archive state");
  }
  return;
}

const deleteTestimonialBtn = e.target.closest("[data-delete-testimonial]");
if (deleteTestimonialBtn) {
  const id = deleteTestimonialBtn.dataset.id;
  const item = state.testimonials.find((entry) => String(entry.id) === String(id));

  if (!item || item.is_archived !== true) {
    alert("Archive the testimonial before deleting it permanently.");
    return;
  }

  if (!window.confirm("Delete this testimonial permanently? This cannot be undone.")) {
    return;
  }

  try {
    await deleteTestimonial(id);

    if (String(document.getElementById("testimonialDbId")?.value || "") === String(id)) {
      resetTestimonialForm();
    }

    await loadTabData();
  } catch (error) {
    console.error("Delete testimonial failed:", error);
    alert("Failed to delete testimonial");
  }
  return;
}

const hotelActiveBtn = e.target.closest("[data-toggle-hotel-active]");
if (hotelActiveBtn) {
  const id = hotelActiveBtn.dataset.id;
  const currentActive = hotelActiveBtn.dataset.active === "true";

  const confirmMessage = currentActive
    ? "Deactivate this hotel? It will stop resolving for live use."
    : "Activate this hotel?";

  if (!window.confirm(confirmMessage)) return;

  try {
    await toggleHotelActive(id, !currentActive);
    await loadHotels();
    if (state.activeTab === "hotels") {
      await loadTabData();
    }
  } catch (error) {
    console.error("Toggle hotel active failed:", error);
    alert("Failed to update hotel active state");
  }
  return;
}

  });
}

function renderHotelFilter() {
  const select = $("#hotelFilter");
  if (!select) return;

  const currentValue = getHotelFilterValue();
  const optionMap = new Map();

  state.hotels.forEach((hotel) => {
    const optionValue = (hotel.slug || hotel.name || "").trim();
    if (!optionValue) return;

    const key = normalizeValue(optionValue);
    if (!optionMap.has(key)) {
      optionMap.set(key, {
        value: optionValue,
        label: hotel.name || hotel.slug || optionValue
      });
    }
  });

  select.innerHTML = `
    <option value="">All Hotels</option>
    ${[...optionMap.values()]
      .map(
        (hotel) => `
          <option value="${escapeHTML(hotel.value)}">
            ${escapeHTML(hotel.label)}
          </option>
        `
      )
      .join("")}
  `;

  const matchingOption = [...optionMap.values()].find(
    (hotel) => normalizeValue(hotel.value) === normalizeValue(currentValue)
  );

  select.value = matchingOption?.value || "";
  syncMenuFormHotelSlug({ force: true });
  syncMenuComboFormHotelSlug({ force: true });
  syncPopupNotificationFormHotelSlug({ force: true });
  syncRoomFeatureSettingsHotelSlug({ force: true });
  syncRoomTypeFormHotelSlug({ force: true });
  syncRoomFormHotelSlug({ force: true });
  syncRoomBookingFormHotelSlug({ force: true });
}

function getOrderContextValues(order = {}) {
  const orderContext =
    order.orderContext && typeof order.orderContext === "object" && !Array.isArray(order.orderContext)
      ? order.orderContext
      : {};

  return {
    orderType: order.order_type || orderContext.orderType || "",
    tableNumber: order.table_number || orderContext.tableNumber || "",
    orderSource: order.order_source || orderContext.orderSource || ""
  };
}

function buildOrderContextRows(order = {}) {
  const { orderType, tableNumber, orderSource } = getOrderContextValues(order);
  const rows = [];

  if (orderType) {
    rows.push(
      `<div class="admin-row"><strong>Order Type:</strong> ${escapeHTML(orderType)}</div>`
    );
  }

  if (tableNumber) {
    rows.push(
      `<div class="admin-row"><strong>Table:</strong> ${escapeHTML(tableNumber)}</div>`
    );
  }

  if (orderSource) {
    rows.push(
      `<div class="admin-row"><strong>Source:</strong> ${escapeHTML(orderSource)}</div>`
    );
  }

  return rows.join("");
}

function getOrderRoomServiceValues(order = {}) {
  const roomService =
    order.roomService && typeof order.roomService === "object" && !Array.isArray(order.roomService)
      ? order.roomService
      : {};

  return {
    roomId: order.room_id || roomService.roomId || "",
    roomBookingId: order.room_booking_id || roomService.roomBookingId || "",
    roomNumber: order.room_number || roomService.roomNumber || "",
    guestName: order.room_service_guest_name || roomService.guestName || "",
    chargeToRoom:
      order.room_service_charge_to_room === true ||
      roomService.chargeToRoom === true
  };
}

function buildOrderRoomServiceRows(order = {}) {
  const roomService = getOrderRoomServiceValues(order);
  const hasRoomService =
    roomService.roomId ||
    roomService.roomBookingId ||
    roomService.roomNumber ||
    roomService.guestName ||
    roomService.chargeToRoom;

  if (!hasRoomService) return "";

  const rows = [];
  rows.push(
    `<div class="admin-row"><strong>Room Service:</strong> ${escapeHTML(roomService.roomNumber ? `Room ${roomService.roomNumber}` : "Yes")}</div>`
  );

  if (roomService.roomBookingId) {
    rows.push(
      `<div class="admin-row"><strong>Room Booking:</strong> ${escapeHTML(roomService.roomBookingId)}</div>`
    );
  }

  if (roomService.guestName) {
    rows.push(
      `<div class="admin-row"><strong>Room Guest:</strong> ${escapeHTML(roomService.guestName)}</div>`
    );
  }

  if (roomService.chargeToRoom) {
    rows.push('<div class="admin-row"><strong>Billing:</strong> Add food bill to room</div>');
  }

  return rows.join("");
}

function getOrderCreatedByLabel(order = {}) {
  const createdByStaff =
    order.createdByStaff && typeof order.createdByStaff === "object" && !Array.isArray(order.createdByStaff)
      ? order.createdByStaff
      : {};
  const displayName = String(createdByStaff.displayName || "").trim();
  const createdByStaffId = String(order.createdByStaffId || createdByStaff.id || "").trim();

  if (displayName) {
    return `Staff - ${displayName}`;
  }

  return createdByStaffId ? `Staff #${createdByStaffId}` : "";
}

function buildOrderCreatedByRow(order = {}) {
  const createdByLabel = getOrderCreatedByLabel(order);
  return createdByLabel
    ? `<div class="admin-row"><strong>Taken By:</strong> ${escapeHTML(createdByLabel)}</div>`
    : "";
}

function buildOrderBillingRows(order = {}) {
  const rows = [];
  const showBillingDefaults = isDineInOrderCard(order);
  const paymentStatus = getOrderPaymentStatus(order, showBillingDefaults);
  const billingStatus = getOrderBillingStatus(order, showBillingDefaults);

  if (paymentStatus) {
    rows.push(
      `<div class="admin-row"><strong>Payment Status:</strong> ${escapeHTML(getPaymentStatusLabel(paymentStatus))}</div>`
    );
  }

  if (billingStatus) {
    rows.push(
      `<div class="admin-row"><strong>Billing Status:</strong> ${escapeHTML(billingStatus)}</div>`
    );
  }

  if (order.bill_number) {
    rows.push(
      `<div class="admin-row"><strong>${escapeHTML(getOrderBillNumberLabel(order))}:</strong> ${escapeHTML(order.bill_number)}</div>`
    );
  }

  if (order.billed_at) {
    rows.push(
      `<div class="admin-row"><strong>Billed At:</strong> ${escapeHTML(order.billed_at)}</div>`
    );
  }

  if (order.paid_at) {
    rows.push(
      `<div class="admin-row"><strong>Paid At:</strong> ${escapeHTML(order.paid_at)}</div>`
    );
  }

  return rows.join("");
}

function getOrderRouteMetadata(order = {}) {
  const paymentMetadata =
    order.payment_metadata &&
    typeof order.payment_metadata === "object" &&
    !Array.isArray(order.payment_metadata)
      ? order.payment_metadata
      : {};
  const route =
    paymentMetadata.route &&
    typeof paymentMetadata.route === "object" &&
    !Array.isArray(paymentMetadata.route)
      ? paymentMetadata.route
      : {};

  return {
    routeStatus: route.routeStatus || "",
    routeReady: !!route.routeReady,
    transferRequested: !!route.transferRequested,
    transferId: order.gateway_transfer_id || route.transferId || "",
    transferStatus:
      order.gateway_transfer_status ||
      route.transferStatus ||
      route.transfer_status ||
      "",
    settlementStatus:
      order.gateway_settlement_status ||
      route.settlementStatus ||
      route.settlement_status ||
      "",
    transferError:
      order.gateway_transfer_error ||
      route.transferError ||
      route.transfer_error ||
      "",
    linkedAccountId: route.linkedAccountId || ""
  };
}

function buildOrderRouteTransferRows(order = {}) {
  const route = getOrderRouteMetadata(order);
  const rows = [];
  const hasRouteData =
    route.routeStatus ||
    route.transferRequested ||
    route.transferId ||
    route.transferStatus ||
    route.settlementStatus ||
    route.linkedAccountId;

  if (!hasRouteData) {
    return "";
  }

  if (route.routeStatus) {
    rows.push(
      `<div class="admin-row"><strong>Route Status:</strong> ${escapeHTML(route.routeStatus)}</div>`
    );
  }

  if (route.linkedAccountId) {
    rows.push(
      `<div class="admin-row"><strong>Route Linked Account:</strong> ${escapeHTML(route.linkedAccountId)}</div>`
    );
  }

  rows.push(
    `<div class="admin-row"><strong>Route Transfer Requested:</strong> ${escapeHTML(route.transferRequested ? "yes" : "no")}</div>`
  );

  if (route.transferId) {
    rows.push(
      `<div class="admin-row"><strong>Transfer ID:</strong> ${escapeHTML(route.transferId)}</div>`
    );
  }

  if (route.transferStatus) {
    rows.push(
      `<div class="admin-row"><strong>Transfer Status:</strong> <span class="status-badge">${escapeHTML(route.transferStatus)}</span></div>`
    );
  }

  if (route.settlementStatus) {
    rows.push(
      `<div class="admin-row"><strong>Settlement Status:</strong> ${escapeHTML(route.settlementStatus)}</div>`
    );
  }

  if (route.transferError) {
    rows.push(
      `<div class="admin-row admin-attention-row"><strong>Transfer Error:</strong> ${escapeHTML(route.transferError)}</div>`
    );
  }

  return rows.join("");
}

function isDineInOrderCard(order = {}) {
  const { orderType, tableNumber } = getOrderContextValues(order);
  const normalizedOrderType = String(orderType || "")
    .trim()
    .toLowerCase();
  const normalizedTableNumber = String(tableNumber || "").trim();

  return (
    normalizedOrderType === "dine-in" ||
    !!normalizedTableNumber ||
    !!order.payment_status ||
    !!order.billing_status
  );
}

function getOrderPaymentStatus(order = {}, useDefault = isDineInOrderCard(order)) {
  return order.payment_status || (useDefault ? "unpaid" : "");
}

function getPaymentStatusLabel(paymentStatus = "") {
  const normalizedStatus = String(paymentStatus || "").trim().toLowerCase();
  const labels = {
    unpaid: "unpaid",
    customer_confirmed: "customer confirmed, verify before paid",
    paid: "paid",
    refunded: "refunded"
  };

  return labels[normalizedStatus] || normalizedStatus.replace(/_/g, " ");
}

function getOrderBillingStatus(order = {}, useDefault = isDineInOrderCard(order)) {
  return order.billing_status || (useDefault ? "not_billed" : "");
}

function getOrderBillingAttentionMessage(order = {}) {
  if (!isDineInOrderCard(order)) {
    return "";
  }

  const paymentStatus = getOrderPaymentStatus(order, true);
  const billingStatus = getOrderBillingStatus(order, true);

  if (paymentStatus === "customer_confirmed") {
    return "Verify UPI receipt before marking paid.";
  }

  if (billingStatus === "billed" && paymentStatus !== "paid") {
    return "Bill is ready, payment is not marked paid.";
  }

  if (paymentStatus === "paid" && billingStatus !== "billed") {
    return "Payment is marked paid, but billing is not marked billed.";
  }

  return "";
}

function buildOrderBillingAttentionRow(order = {}) {
  const message = getOrderBillingAttentionMessage(order);

  if (!message) {
    return "";
  }

  return `<div class="admin-row admin-attention-row"><strong>Payment Attention:</strong> ${escapeHTML(message)}</div>`;
}

function getOrderBillNumberLabel(order = {}) {
  return getOrderBillingStatus(order, true) === "billed"
    ? "Bill Number"
    : "Saved Bill Ref";
}

function getOrderBillPrintTitle(order = {}) {
  if (order.bill_number && getOrderBillingStatus(order, true) === "billed") {
    return order.bill_number;
  }

  return `Draft Bill - Order ${order.id || ""}`;
}

function getNumberValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatDiscountPercent(value) {
  const percent = getNumberValue(value);

  if (percent === null) return "";

  return Number.isInteger(percent)
    ? `${percent}%`
    : `${percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatBillMoney(value) {
  const numberValue = getNumberValue(value);
  return numberValue === null ? "Rs. 0.00" : `Rs. ${numberValue.toFixed(2)}`;
}

function getOrderBillItems(order = {}) {
  return Array.isArray(order.items) ? order.items : [];
}

function buildOrderComboSummary(item = {}) {
  if (String(item?.itemType || "single").trim() !== "combo") {
    return "";
  }

  return (Array.isArray(item?.comboItems) ? item.comboItems : [])
    .map((comboItem) => {
      const quantity = getNumberValue(comboItem?.quantity) || 1;
      const comboItemName = String(comboItem?.name || comboItem?.itemId || "").trim();
      return comboItemName ? `${quantity}x ${comboItemName}` : "";
    })
    .filter(Boolean)
    .join(" + ");
}

function buildOrderItemMetaLines(item = {}) {
  const lines = [];
  const comboSummary = buildOrderComboSummary(item);
  const originalPrice = getNumberValue(item?.originalPrice);
  const savings = getNumberValue(item?.savings);
  const price = getNumberValue(item?.price) || 0;

  if (comboSummary) {
    lines.push(`Includes: ${comboSummary}`);
  }

  if (
    String(item?.itemType || "single").trim() === "combo" &&
    originalPrice !== null &&
    savings !== null &&
    originalPrice > price &&
    savings > 0
  ) {
    lines.push(`Was ${formatBillMoney(originalPrice)} | Save ${formatBillMoney(savings)}`);
  }

  return lines;
}

function buildOrderItemsDetailsMarkup(order = {}) {
  const items = getOrderBillItems(order);

  if (!items.length) {
    return `<p class="admin-toolbar-help">No items found for this order.</p>`;
  }

  return `
    <ol class="admin-order-items">
      ${items
        .map((item) => {
          const name = item?.name || item?.id || "Item";
          const qty = getNumberValue(item?.qty) || 0;
          const lineTotal = getNumberValue(item?.lineTotal) ?? getOrderBillItemLineTotal(item);
          const metaLines = buildOrderItemMetaLines(item);
          const metaMarkup = metaLines.length
            ? `<div class="admin-order-item-meta">${metaLines
                .map((line) => escapeHTML(line))
                .join("<br>")}</div>`
            : "";

          return `
            <li>
              <strong>${escapeHTML(name)}</strong> x ${escapeHTML(qty)} - ${escapeHTML(formatBillMoney(lineTotal))}
              ${metaMarkup}
            </li>
          `;
        })
        .join("")}
    </ol>
  `;
}

function getOrderBillItemLineTotal(item = {}) {
  return getNumberValue(item?.lineTotal) ?? ((getNumberValue(item?.qty) || 0) * (getNumberValue(item?.price) || 0));
}

function getOrderBillItemSubtotal(order = {}) {
  return getOrderBillItems(order).reduce(
    (sum, item) => sum + getOrderBillItemLineTotal(item),
    0
  );
}

function getOrderBillTotals(order = {}) {
  return order.totals && typeof order.totals === "object" && !Array.isArray(order.totals)
    ? order.totals
    : {};
}

function isUpiOrder(order = {}) {
  const paymentMethod = String(order.payment_method || "").trim().toLowerCase();
  return paymentMethod.includes("upi") || paymentMethod.includes("google pay");
}

function getOrderBillFinalTotal(order = {}) {
  const totals = getOrderBillTotals(order);
  const itemSubtotal = getOrderBillItemSubtotal(order);

  if (isUpiOrder(order)) {
    return (
      getNumberValue(totals.gpayFinalTotal) ??
      getNumberValue(totals.total) ??
      getNumberValue(totals.normalTotal) ??
      itemSubtotal
    );
  }

  return (
    getNumberValue(totals.total) ??
    getNumberValue(totals.normalTotal) ??
    getNumberValue(totals.gpayFinalTotal) ??
    itemSubtotal
  );
}

function buildOrderBillTotalsRows(order = {}) {
  const totals = getOrderBillTotals(order);
  const rows = [];
  const subtotal = getNumberValue(totals.subtotal);
  const gst = getNumberValue(totals.gst);
  const deliveryCharge = getNumberValue(totals.deliveryCharge);
  const normalTotal = getNumberValue(totals.normalTotal);
  const upiDiscountPercent = getNumberValue(totals.upiDiscountPercent);
  const gpayDiscount = getNumberValue(totals.gpayDiscount);
  const gpayFinalTotal = getNumberValue(totals.gpayFinalTotal);

  if (subtotal !== null) {
    rows.push(`<tr><th>Subtotal</th><td>${escapeHTML(formatBillMoney(subtotal))}</td></tr>`);
  }

  if (gst !== null) {
    rows.push(`<tr><th>GST</th><td>${escapeHTML(formatBillMoney(gst))}</td></tr>`);
  }

  if (deliveryCharge !== null && deliveryCharge > 0) {
    rows.push(
      `<tr><th>Delivery Charge</th><td>${escapeHTML(formatBillMoney(deliveryCharge))}</td></tr>`
    );
  }

  if (isUpiOrder(order) && normalTotal !== null) {
    rows.push(`<tr><th>Original Total</th><td>${escapeHTML(formatBillMoney(normalTotal))}</td></tr>`);
  }

  if (isUpiOrder(order) && gpayDiscount !== null) {
    const discountLabel = upiDiscountPercent !== null
      ? `Google Pay Discount (${formatDiscountPercent(upiDiscountPercent)})`
      : "Google Pay Discount";
    rows.push(`<tr><th>${escapeHTML(discountLabel)}</th><td>-${escapeHTML(formatBillMoney(gpayDiscount))}</td></tr>`);
  }

  if (isUpiOrder(order) && gpayFinalTotal !== null) {
    rows.push(`<tr><th>Final Paid Amount</th><td>${escapeHTML(formatBillMoney(gpayFinalTotal))}</td></tr>`);
  } else {
    rows.push(`<tr><th>Total</th><td>${escapeHTML(formatBillMoney(getOrderBillFinalTotal(order)))}</td></tr>`);
  }

  return rows.join("");
}

function buildOrderBillPrintDocument(order = {}) {
  const { orderType, tableNumber, orderSource } = getOrderContextValues(order);
  const billTitle = getOrderBillPrintTitle(order);
  const createdByLabel = getOrderCreatedByLabel(order);
  const savedBillRefRow = order.bill_number
    ? `<p>${escapeHTML(getOrderBillNumberLabel(order))}: ${escapeHTML(order.bill_number)}</p>`
    : "";
  const items = getOrderBillItems(order);

  const itemRows = items.length
    ? items
        .map((item, index) => {
      const qty = getNumberValue(item.qty) || 0;
      const price = getNumberValue(item.price) || 0;
      const lineTotal = getOrderBillItemLineTotal(item);
      const itemMetaMarkup = buildOrderItemMetaLines(item)
        .map((line) => `<span class="bill-item-meta">${escapeHTML(line)}</span>`)
        .join("");

      return `
            <tr>
              <td>${escapeHTML(index + 1)}</td>
              <td>
                <div class="bill-item-name">
                  <strong>${escapeHTML(item.name || item.id || "Item")}</strong>
                  ${itemMetaMarkup}
                </div>
              </td>
              <td>${escapeHTML(qty)}</td>
              <td>${escapeHTML(formatBillMoney(price))}</td>
              <td>${escapeHTML(formatBillMoney(lineTotal))}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="5">No items found for this order.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(billTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    .bill { max-width: 760px; margin: 0 auto; }
    .bill-header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 18px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 16px; margin-top: 4px; font-weight: 600; }
    .muted { color: #555; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 18px 0; }
    .row { font-size: 14px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }
    th { background: #f2f2f2; }
    .bill-item-name strong { display: block; }
    .bill-item-meta { display: block; margin-top: 4px; color: #555; font-size: 12px; line-height: 1.45; }
    .totals { max-width: 340px; margin-left: auto; }
    .note { margin-top: 18px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 14px; }
    .actions { display: flex; justify-content: flex-end; margin-bottom: 18px; }
    button { border: 0; border-radius: 8px; background: #111; color: #fff; padding: 10px 14px; cursor: pointer; }
    @media print {
      body { margin: 0; }
      .actions { display: none; }
      .bill { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="bill">
    <div class="actions">
      <button type="button" onclick="window.print()">Print Bill</button>
    </div>
    <header class="bill-header">
      <div>
        <h1>${escapeHTML(order.hotel_name || "Hotel")}</h1>
        <h2>${escapeHTML(billTitle)}</h2>
      </div>
      <div class="muted">
        <p>Order: ${escapeHTML(order.id || "")}</p>
        ${savedBillRefRow}
        <p>Created: ${escapeHTML(order.created_at || "")}</p>
        <p>Billed: ${escapeHTML(order.billed_at || "Not billed yet")}</p>
      </div>
    </header>

    <section class="grid">
      <div class="row"><strong>Customer:</strong> ${escapeHTML(order.customer_name || "")}</div>
      <div class="row"><strong>Phone:</strong> ${escapeHTML(order.customer_phone || "")}</div>
      <div class="row"><strong>Order Type:</strong> ${escapeHTML(orderType || "dine-in")}</div>
      <div class="row"><strong>Table:</strong> ${escapeHTML(tableNumber || "Not provided")}</div>
      <div class="row"><strong>Source:</strong> ${escapeHTML(orderSource || "")}</div>
      ${createdByLabel ? `<div class="row"><strong>Taken By:</strong> ${escapeHTML(createdByLabel)}</div>` : ""}
      <div class="row"><strong>Payment:</strong> ${escapeHTML(order.payment_method || "")}</div>
      <div class="row"><strong>Payment Status:</strong> ${escapeHTML(getPaymentStatusLabel(getOrderPaymentStatus(order, true)))}</div>
      <div class="row"><strong>Billing Status:</strong> ${escapeHTML(getOrderBillingStatus(order, true))}</div>
    </section>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <table class="totals">
      <tbody>${buildOrderBillTotalsRows(order)}</tbody>
    </table>

    <div class="note">
      <strong>Note:</strong> ${escapeHTML(order.note || "No note")}
    </div>
  </div>
</body>
</html>`;
}

function openOrderBillPrintView(order = {}) {
  const printWindow = window.open("", "_blank", "width=780,height=900");

  if (!printWindow) {
    alert("Please allow popups to open the bill view.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildOrderBillPrintDocument(order));
  printWindow.document.close();
  printWindow.focus();
}

function buildSelectOption(value, label, currentValue) {
  return `<option value="${escapeHTML(value)}" ${currentValue === value ? "selected" : ""}>${escapeHTML(label)}</option>`;
}

function buildOrderBillingControls(order = {}) {
  if (!isDineInOrderCard(order)) {
    return "";
  }

  const orderId = escapeHTML(order.id);
  const billingStatus = String(order.billing_status || "not_billed").trim().toLowerCase();
  const paymentStatus = String(order.payment_status || "unpaid").trim().toLowerCase();

  return `
    <div class="status-row admin-card-actions">
      <select class="status-select order-billing-select" data-order-billing-field="billingStatus" data-id="${orderId}" aria-label="Billing status">
        ${buildSelectOption("not_billed", "not billed", billingStatus)}
        ${buildSelectOption("billed", "billed", billingStatus)}
        ${buildSelectOption("cancelled", "billing cancelled", billingStatus)}
      </select>
      <select class="status-select order-billing-select" data-order-billing-field="paymentStatus" data-id="${orderId}" aria-label="Payment status">
        ${buildSelectOption("unpaid", "unpaid", paymentStatus)}
        ${buildSelectOption("customer_confirmed", getPaymentStatusLabel("customer_confirmed"), paymentStatus)}
        ${buildSelectOption("paid", "paid", paymentStatus)}
        ${buildSelectOption("refunded", "refunded", paymentStatus)}
      </select>
      <button class="status-btn" data-update-order-billing data-id="${orderId}">Update Billing</button>
      <button class="status-btn" data-print-order-bill data-id="${orderId}">View Bill</button>
    </div>
  `;
}

function getOrderBillingSummaryCounts(orders = []) {
  const dineInOrders = orders.filter(isDineInOrderCard);
  const notBilled = dineInOrders.filter(
    (order) => getOrderBillingStatus(order, true) === "not_billed"
  );
  const billedAndPaid = dineInOrders.filter(
    (order) =>
      getOrderBillingStatus(order, true) === "billed" &&
      getOrderPaymentStatus(order, true) === "paid"
  );
  const billedNotPaid = dineInOrders.filter(
    (order) =>
      getOrderBillingStatus(order, true) === "billed" &&
      getOrderPaymentStatus(order, true) !== "paid"
  );
  const needsPaymentVerification = dineInOrders.filter(
    (order) => getOrderPaymentStatus(order, true) === "customer_confirmed"
  );
  const paidNotBilled = dineInOrders.filter(
    (order) =>
      getOrderPaymentStatus(order, true) === "paid" &&
      getOrderBillingStatus(order, true) !== "billed"
  );

  return {
    dineIn: dineInOrders.length,
    notBilled: notBilled.length,
    billedAndPaid: billedAndPaid.length,
    billedNotPaid: billedNotPaid.length,
    needsPaymentVerification: needsPaymentVerification.length,
    paidNotBilled: paidNotBilled.length
  };
}

function buildOrderBillingSummaryCard(orders = []) {
  const counts = getOrderBillingSummaryCounts(orders);

  if (!counts.dineIn) {
    return "";
  }

  return `
    <div class="admin-card admin-list-summary">
      <h3>Dine-in Billing</h3>
      <p class="admin-toolbar-help">Customer confirmed means verify before paid. Only mark paid after the operator confirms receipt.</p>
      <div class="status-row">
        <span class="status-badge">Dine-in: ${escapeHTML(counts.dineIn)}</span>
        <span class="status-badge">Not billed: ${escapeHTML(counts.notBilled)}</span>
        <span class="status-badge">Billed not paid: ${escapeHTML(counts.billedNotPaid)}</span>
        <span class="status-badge">Verify UPI: ${escapeHTML(counts.needsPaymentVerification)}</span>
        <span class="status-badge">Paid: ${escapeHTML(counts.billedAndPaid)}</span>
        ${
          counts.paidNotBilled
            ? `<span class="status-badge">Paid not billed: ${escapeHTML(counts.paidNotBilled)}</span>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderOrders() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.orders.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Orders",
        count: 0,
        description: "Review incoming food orders and update their current status."
      })}
      <p class="empty-state">No orders found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Orders",
      count: state.orders.length,
      description: "Review incoming food orders and update their current status."
    })}
    ${buildOrderBillingSummaryCard(state.orders)}
    <div class="admin-grid">
      ${state.orders
        .map(
          (order) => `
            <article class="admin-card">
              <h3>Order #${escapeHTML(order.id)}</h3>
              <div class="admin-meta">${escapeHTML(order.created_at || "")}</div>

              <div class="admin-row"><strong>Hotel:</strong> ${escapeHTML(order.hotel_name || "")}</div>
              <div class="admin-row"><strong>Customer:</strong> ${escapeHTML(order.customer_name || "")}</div>
              <div class="admin-row"><strong>Phone:</strong> ${escapeHTML(order.customer_phone || "")}</div>
              <div class="admin-row"><strong>Address:</strong> ${escapeHTML(order.customer_address || "")}</div>
              ${buildOrderContextRows(order)}
              ${buildOrderRoomServiceRows(order)}
              ${buildOrderCreatedByRow(order)}
              <div class="admin-row"><strong>Payment:</strong> ${escapeHTML(order.payment_method || "")}</div>
              ${buildOrderBillingRows(order)}
              ${buildOrderRouteTransferRows(order)}
              ${buildOrderBillingAttentionRow(order)}
              <div class="admin-row"><strong>Note:</strong> ${escapeHTML(order.note || "")}</div>
              <div class="admin-row"><strong>Total:</strong> ₹${escapeHTML(order.totals?.total ?? "")}</div>
              <div class="admin-row"><strong>Status:</strong> <span class="status-badge">${escapeHTML(order.status || "new")}</span></div>

              <details>
                <summary>View Items</summary>
                ${buildOrderItemsDetailsMarkup(order)}
              </details>

              <div class="status-row">
                <select class="status-select" data-type="orders" data-id="${escapeHTML(order.id)}">
                  <option value="new" ${order.status === "new" ? "selected" : ""}>new</option>
                  <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>confirmed</option>
                  <option value="preparing" ${order.status === "preparing" ? "selected" : ""}>preparing</option>
                  <option value="completed" ${order.status === "completed" ? "selected" : ""}>completed</option>
                  <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>cancelled</option>
                </select>
                <button class="status-btn" data-update-status data-type="orders" data-id="${escapeHTML(order.id)}">Update Status</button>
              </div>
              ${buildOrderBillingControls(order)}
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderReservations() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.reservations.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Reservations",
        count: 0,
        description: "Review reservation requests and move them through the current seating flow."
      })}
      <p class="empty-state">No reservations found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Reservations",
      count: state.reservations.length,
      description: "Review reservation requests and move them through the current seating flow."
    })}
    <div class="admin-grid">
      ${state.reservations
        .map(
          (item) => `
            <article class="admin-card">
              <h3>Reservation #${escapeHTML(item.id)}</h3>
              <div class="admin-meta">${escapeHTML(item.created_at || "")}</div>

              <div class="admin-row"><strong>Hotel:</strong> ${escapeHTML(item.hotel_name || "")}</div>
              <div class="admin-row"><strong>Name:</strong> ${escapeHTML(item.name || "")}</div>
              <div class="admin-row"><strong>Phone:</strong> ${escapeHTML(item.phone || "")}</div>
              <div class="admin-row"><strong>Date:</strong> ${escapeHTML(item.date || "")}</div>
              <div class="admin-row"><strong>Time:</strong> ${escapeHTML(item.time || "")}</div>
              <div class="admin-row"><strong>Guests:</strong> ${escapeHTML(item.guests || "")}</div>
              <div class="admin-row"><strong>Note:</strong> ${escapeHTML(item.note || "")}</div>
              <div class="admin-row"><strong>Status:</strong> <span class="status-badge">${escapeHTML(item.status || "new")}</span></div>

              <div class="status-row">
                <select class="status-select" data-type="reservations" data-id="${escapeHTML(item.id)}">
                  <option value="new" ${item.status === "new" ? "selected" : ""}>new</option>
                  <option value="confirmed" ${item.status === "confirmed" ? "selected" : ""}>confirmed</option>
                  <option value="seated" ${item.status === "seated" ? "selected" : ""}>seated</option>
                  <option value="completed" ${item.status === "completed" ? "selected" : ""}>completed</option>
                  <option value="cancelled" ${item.status === "cancelled" ? "selected" : ""}>cancelled</option>
                </select>
                <button class="status-btn" data-update-status data-type="reservations" data-id="${escapeHTML(item.id)}">Update Status</button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInquiries() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.inquiries.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Inquiries",
        count: 0,
        description: "Review event and inquiry submissions for the current hotel scope."
      })}
      <p class="empty-state">No inquiries found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Inquiries",
      count: state.inquiries.length,
      description: "Review event and inquiry submissions for the current hotel scope."
    })}
    <div class="admin-grid">
      ${state.inquiries
        .map(
          (item) => `
            <article class="admin-card">
              <h3>Inquiry #${escapeHTML(item.id)}</h3>
              <div class="admin-meta">${escapeHTML(item.created_at || "")}</div>

              <div class="admin-row"><strong>Hotel:</strong> ${escapeHTML(item.hotel_name || "")}</div>
              <div class="admin-row"><strong>Name:</strong> ${escapeHTML(item.name || "")}</div>
              <div class="admin-row"><strong>Phone:</strong> ${escapeHTML(item.phone || "")}</div>
              <div class="admin-row"><strong>Event Type:</strong> ${escapeHTML(item.event_type || "")}</div>
              <div class="admin-row"><strong>Date:</strong> ${escapeHTML(item.date || "")}</div>
              <div class="admin-row"><strong>Guests:</strong> ${escapeHTML(item.guests || "")}</div>
              <div class="admin-row"><strong>Requirements:</strong> ${escapeHTML(item.special_requirements || "")}</div>
              <div class="admin-row"><strong>Status:</strong> <span class="status-badge">${escapeHTML(item.status || "new")}</span></div>

              <div class="status-row">
                <select class="status-select" data-type="inquiries" data-id="${escapeHTML(item.id)}">
                  <option value="new" ${item.status === "new" ? "selected" : ""}>new</option>
                  <option value="contacted" ${item.status === "contacted" ? "selected" : ""}>contacted</option>
                  <option value="converted" ${item.status === "converted" ? "selected" : ""}>converted</option>
                  <option value="closed" ${item.status === "closed" ? "selected" : ""}>closed</option>
                </select>
                <button class="status-btn" data-update-status data-type="inquiries" data-id="${escapeHTML(item.id)}">Update Status</button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHotels() {
  const content = $("#adminContent");
  if (!content) return;

  const hotelsToRender = getFilteredHotels();

  if (!hotelsToRender.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Hotels",
        count: 0,
        description: "Browse hotel records and jump into hotel or profile editing."
      })}
      <p class="empty-state">${getHotelFilterValue() ? "No hotels found for the selected filter." : "No hotels found."}</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Hotels",
      count: hotelsToRender.length,
      description: "Browse hotel records and jump into hotel or profile editing."
    })}
    <div class="admin-grid">
      ${hotelsToRender
        .map(
          (hotel) => `
            <article class="admin-card">
              <h3>${escapeHTML(hotel.name || "")}</h3>
              <div class="admin-meta">${escapeHTML(hotel.created_at || "")}</div>
              <div class="admin-row"><strong>Slug:</strong> ${escapeHTML(hotel.slug || "")}</div>
              <div class="admin-row"><strong>WhatsApp:</strong> ${escapeHTML(hotel.whatsapp_number || "")}</div>
              <div class="admin-row"><strong>UPI ID:</strong> ${escapeHTML(hotel.upi_id || "")}</div>
              <div class="admin-row"><strong>GST %:</strong> ${escapeHTML(hotel.gst_percent ?? "")}</div>
              <div class="admin-row"><strong>Primary Domain:</strong> ${escapeHTML(hotel.primary_domain || "")}</div>
              <div class="admin-row"><strong>Subdomain:</strong> ${escapeHTML(hotel.subdomain || "")}</div>
              <div class="admin-row admin-state-line">
                <strong>Status:</strong>
                <div class="admin-state-list">
                  ${buildBooleanStateBadge(hotel.is_active, {
                    onLabel: "Active",
                    offLabel: "Inactive",
                    onTone: "success",
                    offTone: "danger"
                  })}
                </div>
              </div>
              <div class="status-row admin-card-actions">
                <button class="status-btn" data-edit-hotel data-id="${escapeHTML(hotel.id)}">Edit Hotel</button>
                <button class="status-btn" data-edit-profile data-slug="${escapeHTML(hotel.slug)}">Edit Profile</button>
                <button class="status-btn" data-toggle-hotel-active data-id="${escapeHTML(hotel.id)}" data-active="${escapeHTML(String(hotel.is_active))}">
                  ${hotel.is_active ? "Deactivate Hotel" : "Activate Hotel"}
                </button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getRoomStatusLabel(status = "") {
  return String(status || "available").replace(/_/g, " ");
}

function getRoomStatusTone(status = "") {
  const normalizedStatus = normalizeValue(status);

  if (normalizedStatus === "available") return "success";
  if (normalizedStatus === "booked" || normalizedStatus === "occupied") return "warning";
  if (normalizedStatus === "maintenance" || normalizedStatus === "inactive") return "danger";
  return "neutral";
}

function getRoomBookingStatusTone(status = "") {
  const normalizedStatus = normalizeValue(status);

  if (normalizedStatus === "confirmed" || normalizedStatus === "checked_in") return "success";
  if (normalizedStatus === "pending") return "warning";
  if (normalizedStatus === "cancelled" || normalizedStatus === "no_show") return "danger";
  return "neutral";
}

function formatAdminMoney(amount = 0) {
  const value = Number(amount || 0);
  return `Rs. ${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;
}

function getRoomTypeName(room = {}) {
  const roomType = state.roomTypes.find(
    (item) => String(item.id) === String(room.room_type_id)
  );

  return roomType?.name || "";
}

function buildRoomBookingRoomLabel(room = {}) {
  const title = room.title || `Room ${room.room_number || room.id}`;
  const status = room.status || "available";
  const price = formatAdminMoney(room.discount_price ?? room.base_price ?? 0);
  const typeName = getRoomTypeName(room);

  return [
    title,
    typeName ? `Type: ${typeName}` : "",
    `Status: ${status}`,
    price
  ].filter(Boolean).join(" | ");
}

function getAdminRoomStatusOptions(currentStatus = "") {
  const statuses = [
    ["available", "Available"],
    ["booked", "Booked"],
    ["occupied", "Occupied"],
    ["cleaning", "Cleaning"],
    ["maintenance", "Maintenance"],
    ["inactive", "Inactive"]
  ];
  const normalizedCurrentStatus = normalizeValue(currentStatus || "available");

  return statuses
    .map(([value, label]) => `
      <option value="${escapeHTML(value)}" ${normalizedCurrentStatus === value ? "selected" : ""}>
        ${escapeHTML(label)}
      </option>
    `)
    .join("");
}

function buildAdminRoomInventoryControls(room = {}) {
  const roomId = String(room.id || "");
  const isActive = room.is_active !== false;
  const basePrice = Number(room.base_price || 0);
  const discountPrice =
    room.discount_price === null || room.discount_price === undefined
      ? ""
      : Number(room.discount_price || 0).toFixed(2);
  const taxPercent = Number(room.tax_percent || 0);

  return `
    <div class="admin-card-actions" data-room-inventory-actions="${escapeHTML(roomId)}">
      <div class="admin-field">
        <label class="admin-field-label" for="roomInventoryStatus-${escapeHTML(roomId)}">Room Status</label>
        <select
          id="roomInventoryStatus-${escapeHTML(roomId)}"
          class="status-select room-inventory-status-select"
          data-id="${escapeHTML(roomId)}"
        >
          ${getAdminRoomStatusOptions(room.status)}
        </select>
        <p class="admin-field-hint">Maintenance and inactive rooms are excluded from public availability.</p>
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomInventoryActive-${escapeHTML(roomId)}">Inventory State</label>
        <select
          id="roomInventoryActive-${escapeHTML(roomId)}"
          class="status-select room-inventory-active-select"
          data-id="${escapeHTML(roomId)}"
        >
          <option value="true" ${isActive ? "selected" : ""}>Active</option>
          <option value="false" ${isActive ? "" : "selected"}>Inactive</option>
        </select>
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomInventoryBasePrice-${escapeHTML(roomId)}">Base Price</label>
        <input
          id="roomInventoryBasePrice-${escapeHTML(roomId)}"
          class="room-inventory-base-price"
          data-id="${escapeHTML(roomId)}"
          type="number"
          min="0"
          step="0.01"
          value="${escapeHTML(basePrice.toFixed(2))}"
        />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomInventoryDiscountPrice-${escapeHTML(roomId)}">Discounted Nightly Price (amount, not %)</label>
        <input
          id="roomInventoryDiscountPrice-${escapeHTML(roomId)}"
          class="room-inventory-discount-price"
          data-id="${escapeHTML(roomId)}"
          type="number"
          min="0"
          step="0.01"
          value="${escapeHTML(discountPrice)}"
          placeholder="Blank for no discount"
        />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomInventoryTaxPercent-${escapeHTML(roomId)}">Tax/GST %</label>
        <input
          id="roomInventoryTaxPercent-${escapeHTML(roomId)}"
          class="room-inventory-tax-percent"
          data-id="${escapeHTML(roomId)}"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value="${escapeHTML(taxPercent.toFixed(2))}"
        />
        <p class="admin-field-hint">Public pricing uses discount price when present.</p>
      </div>
      <button
        type="button"
        class="status-btn"
        data-update-room-inventory
        data-id="${escapeHTML(roomId)}"
      >Update Room</button>
    </div>
  `;
}

function buildAdminRoomTypeControls(roomType = {}) {
  const roomTypeId = String(roomType.id || "");
  const isActive = roomType.is_active !== false;
  const basePrice = Number(roomType.base_price || 0);
  const maxAdults = Number(roomType.max_adults || 0);
  const maxChildren = Number(roomType.max_children || 0);

  return `
    <div class="admin-card-actions" data-room-type-actions="${escapeHTML(roomTypeId)}">
      <div class="admin-field">
        <label class="admin-field-label" for="roomTypeBasePrice-${escapeHTML(roomTypeId)}">Base Price</label>
        <input
          id="roomTypeBasePrice-${escapeHTML(roomTypeId)}"
          class="room-type-base-price"
          data-id="${escapeHTML(roomTypeId)}"
          type="number"
          min="0"
          step="0.01"
          value="${escapeHTML(basePrice.toFixed(2))}"
        />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomTypeMaxAdults-${escapeHTML(roomTypeId)}">Max Adults</label>
        <input
          id="roomTypeMaxAdults-${escapeHTML(roomTypeId)}"
          class="room-type-max-adults"
          data-id="${escapeHTML(roomTypeId)}"
          type="number"
          min="0"
          max="100"
          step="1"
          value="${escapeHTML(String(maxAdults))}"
        />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomTypeMaxChildren-${escapeHTML(roomTypeId)}">Max Children</label>
        <input
          id="roomTypeMaxChildren-${escapeHTML(roomTypeId)}"
          class="room-type-max-children"
          data-id="${escapeHTML(roomTypeId)}"
          type="number"
          min="0"
          max="100"
          step="1"
          value="${escapeHTML(String(maxChildren))}"
        />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomTypeActive-${escapeHTML(roomTypeId)}">Type State</label>
        <select
          id="roomTypeActive-${escapeHTML(roomTypeId)}"
          class="status-select room-type-active-select"
          data-id="${escapeHTML(roomTypeId)}"
        >
          <option value="true" ${isActive ? "selected" : ""}>Active</option>
          <option value="false" ${isActive ? "" : "selected"}>Inactive</option>
        </select>
        <p class="admin-field-hint">Inactive room types should not be used for new room inventory.</p>
      </div>
      <button
        type="button"
        class="status-btn"
        data-update-room-type
        data-id="${escapeHTML(roomTypeId)}"
      >Update Room Type</button>
    </div>
  `;
}

function populateRoomBookingRoomOptions(rooms = state.rooms) {
  const select = document.getElementById("roomBookingRoomIdInput");
  const help = document.getElementById("roomBookingRoomHelp");
  if (!select) return;

  const hotelSlug =
    document.getElementById("roomBookingHotelSlugInput")?.value.trim() || "";
  const scopedRooms = (rooms || []).filter((room) => {
    if (hotelSlug && room.hotel_slug !== hotelSlug) return false;
    return room.is_active !== false;
  });

  if (!hotelSlug) {
    select.innerHTML = `<option value="">Select a hotel first</option>`;
    if (help) help.textContent = "Choose a hotel scope first to load that hotel's rooms.";
    return;
  }

  if (!scopedRooms.length) {
    select.innerHTML = `<option value="">No active rooms found for this hotel</option>`;
    if (help) help.textContent = "Add rooms for this hotel before creating a manual booking.";
    return;
  }

  select.innerHTML = `
    <option value="">Select room</option>
    ${scopedRooms.map((room) => `
      <option value="${escapeHTML(room.id)}">${escapeHTML(buildRoomBookingRoomLabel(room))}</option>
    `).join("")}
  `;
  if (help) help.textContent = `${scopedRooms.length} active room${scopedRooms.length === 1 ? "" : "s"} loaded for ${hotelSlug}.`;
}

async function loadRoomBookingRoomOptions() {
  const hotelSlug =
    document.getElementById("roomBookingHotelSlugInput")?.value.trim() || "";
  const help = document.getElementById("roomBookingRoomHelp");

  if (!hotelSlug) {
    populateRoomBookingRoomOptions([]);
    return;
  }

  try {
    if (help) help.textContent = "Loading rooms...";
    const result = await fetchJson(
      `${API_BASE}/room-booking/rooms?hotelSlug=${encodeURIComponent(hotelSlug)}`
    );
    state.rooms = result.rooms || state.rooms;
    populateRoomBookingRoomOptions(result.rooms || []);
  } catch (error) {
    console.error("Manual booking room load failed:", error);
    if (help) help.textContent = error.message || "Failed to load rooms.";
  }
}

function getRoomBookingAvailabilityCriteria() {
  const hotelSlug =
    document.getElementById("roomBookingHotelSlugInput")?.value.trim() || "";
  const checkInDate =
    document.getElementById("roomBookingCheckInInput")?.value.trim() || "";
  const checkOutDate =
    document.getElementById("roomBookingCheckOutInput")?.value.trim() || "";
  const adults = Number(document.getElementById("roomBookingAdultsInput")?.value || 1);
  const children = Number(document.getElementById("roomBookingChildrenInput")?.value || 0);

  return {
    hotelSlug,
    checkInDate,
    checkOutDate,
    adults: Number.isFinite(adults) ? Math.max(0, adults) : 1,
    children: Number.isFinite(children) ? Math.max(0, children) : 0
  };
}

async function loadRoomBookingAvailableRoomOptions() {
  const help = document.getElementById("roomBookingRoomHelp");
  const criteria = getRoomBookingAvailabilityCriteria();

  if (!criteria.hotelSlug) {
    alert("Hotel slug is required before checking availability.");
    return;
  }

  if (
    !criteria.checkInDate ||
    !criteria.checkOutDate ||
    criteria.checkOutDate <= criteria.checkInDate
  ) {
    alert("Choose valid check-in and check-out dates before checking availability.");
    return;
  }

  const params = new URLSearchParams({
    hotelSlug: criteria.hotelSlug,
    checkInDate: criteria.checkInDate,
    checkOutDate: criteria.checkOutDate,
    adults: String(criteria.adults),
    children: String(criteria.children)
  });

  try {
    if (help) help.textContent = "Checking room availability...";
    const result = await fetchJson(
      `${API_BASE}/room-booking/availability?${params.toString()}`
    );
    const rooms = Array.isArray(result.rooms) ? result.rooms : [];
    state.rooms = rooms.length ? mergeAdminRoomsById(state.rooms, rooms) : state.rooms;
    populateRoomBookingRoomOptions(rooms);

    if (help) {
      help.textContent = rooms.length
        ? `${rooms.length} available room${rooms.length === 1 ? "" : "s"} found for selected dates.`
        : "No rooms are available for the selected dates and guest count.";
    }
  } catch (error) {
    console.error("Manual booking availability check failed:", error);
    if (help) help.textContent = error.message || "Failed to check room availability.";
    alert(error.message || "Failed to check room availability");
  }
}

function mergeAdminRoomsById(existingRooms = [], nextRooms = []) {
  const roomMap = new Map();
  existingRooms.forEach((room) => {
    if (room?.id !== undefined) {
      roomMap.set(String(room.id), room);
    }
  });
  nextRooms.forEach((room) => {
    if (room?.id !== undefined) {
      roomMap.set(String(room.id), room);
    }
  });
  return Array.from(roomMap.values());
}

function getRoomBookingSummaryCounts(bookings = []) {
  return bookings.reduce(
    (counts, booking) => {
      const status = normalizeValue(booking.booking_status || "pending");
      const paymentStatus = normalizeValue(booking.payment_status || "unpaid");

      counts.total += 1;
      if (status === "pending") counts.pending += 1;
      if (status === "confirmed") counts.confirmed += 1;
      if (status === "checked_in") counts.checkedIn += 1;
      if (status === "checked_out") counts.checkedOut += 1;
      if (status === "cancelled") counts.cancelled += 1;
      if (paymentStatus === "paid") counts.paid += 1;
      if (paymentStatus === "partial") counts.partial += 1;
      if (paymentStatus === "unpaid") counts.unpaid += 1;
      return counts;
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      checkedIn: 0,
      checkedOut: 0,
      cancelled: 0,
      paid: 0,
      partial: 0,
      unpaid: 0
    }
  );
}

function buildRoomBookingAdminQueryString(hotelSlug = "") {
  const params = new URLSearchParams();
  const filters = state.roomBookingFilters || {};

  if (hotelSlug) {
    params.set("hotelSlug", hotelSlug);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.fromDate) {
    params.set("fromDate", filters.fromDate);
  }

  if (filters.toDate) {
    params.set("toDate", filters.toDate);
  }

  const limit = Number(filters.limit || 100);
  if (Number.isInteger(limit) && limit >= 1 && limit <= 200) {
    params.set("limit", String(limit));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function buildRoomBookingFilterMarkup() {
  const filters = state.roomBookingFilters || {};
  const statusOptions = [
    ["", "All Statuses"],
    ["pending", "Pending"],
    ["confirmed", "Confirmed"],
    ["checked_in", "Checked In"],
    ["checked_out", "Checked Out"],
    ["cancelled", "Cancelled"],
    ["no_show", "No Show"]
  ];
  const limitOptions = ["25", "50", "100", "200"];
  const currentLimit = String(filters.limit || "100");

  return `
    <form id="roomBookingFiltersForm" class="admin-grid" style="margin-bottom: 16px;">
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingFilterStatus">Booking Status</label>
        <select id="roomBookingFilterStatus" name="status">
          ${statusOptions.map(([value, label]) => `
            <option value="${escapeHTML(value)}" ${filters.status === value ? "selected" : ""}>
              ${escapeHTML(label)}
            </option>
          `).join("")}
        </select>
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingFilterFromDate">Check-in From</label>
        <input id="roomBookingFilterFromDate" name="fromDate" type="date" value="${escapeHTML(filters.fromDate || "")}" />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingFilterToDate">Check-in To</label>
        <input id="roomBookingFilterToDate" name="toDate" type="date" value="${escapeHTML(filters.toDate || "")}" />
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingFilterLimit">Limit</label>
        <select id="roomBookingFilterLimit" name="limit">
          ${limitOptions.map((value) => `
            <option value="${escapeHTML(value)}" ${currentLimit === value ? "selected" : ""}>
              ${escapeHTML(value)}
            </option>
          `).join("")}
        </select>
      </div>
      <div class="status-row admin-card-actions">
        <button type="submit" class="status-btn">Apply Booking Filters</button>
        <button type="button" class="status-btn" data-reset-room-booking-filters>Reset Filters</button>
      </div>
    </form>
  `;
}

function getAdminRoomBookingStatusOptions(currentStatus = "") {
  const statuses = [
    ["pending", "Pending"],
    ["confirmed", "Confirmed"],
    ["checked_in", "Checked In"],
    ["checked_out", "Checked Out"],
    ["cancelled", "Cancelled"],
    ["no_show", "No Show"]
  ];
  const normalizedCurrentStatus = normalizeValue(currentStatus || "pending");

  return statuses
    .map(([value, label]) => `
      <option value="${escapeHTML(value)}" ${normalizedCurrentStatus === value ? "selected" : ""}>
        ${escapeHTML(label)}
      </option>
    `)
    .join("");
}

function buildAdminRoomBookingControls(booking = {}) {
  const bookingId = String(booking.id || "");
  const hotelSlug = String(booking.hotel_slug || "");
  const bookingStatus = normalizeValue(booking.booking_status || "pending");
  const paymentStatus = normalizeValue(booking.payment_status || "unpaid");
  const balanceAmount = Math.max(0, Number(booking.balance_amount || 0));
  const isClosed = ["checked_out", "cancelled", "no_show"].includes(bookingStatus);
  const canRecordPayment = balanceAmount > 0 && bookingStatus !== "cancelled" && paymentStatus !== "paid";
  const cachedCheckoutSummary = state.roomCheckoutSummaries?.[bookingId];
  const cachedCheckoutBill = state.roomCheckoutBills?.[bookingId];
  const canReuseCachedCheckout =
    cachedCheckoutSummary &&
    cachedCheckoutBill &&
    String(cachedCheckoutSummary.hotelSlug || hotelSlug) === hotelSlug;
  const cachedCheckoutMarkup = canReuseCachedCheckout
    ? buildAdminRoomCheckoutSummaryMarkup(cachedCheckoutSummary, cachedCheckoutBill)
    : "";

  return `
    <div class="admin-card-actions" data-room-booking-actions="${escapeHTML(bookingId)}">
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingStatus-${escapeHTML(bookingId)}">Booking Status</label>
        <select
          id="roomBookingStatus-${escapeHTML(bookingId)}"
          class="room-booking-status-select"
          data-id="${escapeHTML(bookingId)}"
          data-hotel-slug="${escapeHTML(hotelSlug)}"
          ${isClosed ? "disabled" : ""}
        >
          ${getAdminRoomBookingStatusOptions(bookingStatus)}
        </select>
        <p class="admin-field-hint">${isClosed ? "Closed bookings are locked by the backend." : "Use check-in before checkout."}</p>
      </div>
      <button
        type="button"
        class="status-btn"
        data-update-room-booking-status
        data-id="${escapeHTML(bookingId)}"
        ${isClosed ? "disabled" : ""}
      >Update Booking Status</button>
    </div>

    <div class="admin-card-actions" data-room-booking-payment="${escapeHTML(bookingId)}">
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingPaymentAmount-${escapeHTML(bookingId)}">Collect Payment</label>
        <input
          id="roomBookingPaymentAmount-${escapeHTML(bookingId)}"
          class="room-booking-payment-amount"
          data-id="${escapeHTML(bookingId)}"
          type="number"
          min="0.01"
          max="${escapeHTML(balanceAmount.toFixed(2))}"
          step="0.01"
          value="${escapeHTML(canRecordPayment ? balanceAmount.toFixed(2) : "")}"
          placeholder="Amount"
          ${canRecordPayment ? "" : "disabled"}
        />
        <p class="admin-field-hint">Current balance: ${escapeHTML(formatAdminMoney(balanceAmount))}</p>
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingPaymentMethod-${escapeHTML(bookingId)}">Method</label>
        <select
          id="roomBookingPaymentMethod-${escapeHTML(bookingId)}"
          class="room-booking-payment-method"
          data-id="${escapeHTML(bookingId)}"
          ${canRecordPayment ? "" : "disabled"}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="online">Online</option>
        </select>
      </div>
      <div class="admin-field">
        <label class="admin-field-label" for="roomBookingPaymentTxn-${escapeHTML(bookingId)}">Transaction ID</label>
        <input
          id="roomBookingPaymentTxn-${escapeHTML(bookingId)}"
          class="room-booking-payment-transaction"
          data-id="${escapeHTML(bookingId)}"
          maxlength="200"
          placeholder="Optional"
          ${canRecordPayment ? "" : "disabled"}
        />
      </div>
      <button
        type="button"
        class="status-btn"
        data-record-room-booking-payment
        data-id="${escapeHTML(bookingId)}"
        data-hotel-slug="${escapeHTML(hotelSlug)}"
        ${canRecordPayment ? "" : "disabled"}
      >Record Payment</button>
    </div>

    <div class="admin-card-actions">
      <button
        type="button"
        class="status-btn"
        data-view-room-checkout-summary
        data-id="${escapeHTML(bookingId)}"
        data-hotel-slug="${escapeHTML(hotelSlug)}"
        ${bookingId ? "" : "disabled"}
      >${canReuseCachedCheckout ? "Refresh Checkout Summary" : "Checkout Summary"}</button>
    </div>
    <div
      class="admin-room-checkout-summary"
      data-room-checkout-summary="${escapeHTML(bookingId)}"
      ${cachedCheckoutMarkup ? "" : "hidden"}
    >${cachedCheckoutMarkup}</div>
  `;
}

function getRoomCombinedCheckoutSafeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100) / 100
    : 0;
}

function buildRoomCombinedCheckoutIdempotencyKey(scope = "admin", bookingId = "") {
  const safeScope = String(scope || "admin").replace(/[^A-Za-z0-9._:-]/g, "-");
  const safeBookingId = String(bookingId || "booking").replace(/[^A-Za-z0-9._:-]/g, "-");
  return `${safeScope}:room-combined-checkout:${safeBookingId}:${Date.now()}`;
}

function buildAdminRoomCombinedCheckoutRequest(summary = {}, options = {}) {
  const booking = summary.booking || {};
  const totals = summary.totals || {};
  const bookingId = String(options.bookingId || booking.id || "").trim();
  const paymentMethod = String(options.paymentMethod || "cash").trim();

  if (!bookingId) {
    throw new Error("Room booking id is required for combined checkout.");
  }

  if (!paymentMethod) {
    throw new Error("Payment method is required for combined checkout.");
  }

  return {
    endpoint: `${API_BASE}/room-booking/bookings/${encodeURIComponent(bookingId)}/combined-checkout`,
    payload: {
      amount: getRoomCombinedCheckoutSafeAmount(totals.finalPayableAmount),
      paymentMethod,
      transactionId: String(options.transactionId || "").trim(),
      notes: String(options.notes || "").trim(),
      currency: String(options.currency || "INR").trim().toUpperCase(),
      idempotencyKey: String(
        options.idempotencyKey || buildRoomCombinedCheckoutIdempotencyKey("admin", bookingId)
      )
    }
  };
}

async function postAdminRoomCombinedCheckout(summary = {}, options = {}) {
  if (!isRoomCombinedCheckoutFrontendEnabled()) {
    throw new Error(getRoomCombinedCheckoutHintText());
  }

  const request = buildAdminRoomCombinedCheckoutRequest(summary, options);
  return fetchJson(request.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request.payload)
  });
}

async function handleAdminRoomCombinedCheckoutButton(button) {
  const bookingId = String(button?.dataset?.id || "").trim();

  if (!isRoomCombinedCheckoutFrontendEnabled()) {
    alert(getRoomCombinedCheckoutHintText());
    return;
  }

  const summary = state.roomCheckoutSummaries?.[bookingId];

  if (!summary) {
    alert("Load the checkout summary before finalizing combined checkout.");
    return;
  }

  let request;
  try {
    request = buildAdminRoomCombinedCheckoutRequest(summary, { bookingId });
  } catch (error) {
    alert(error.message || "Unable to prepare combined checkout request.");
    return;
  }

  const confirmed = window.confirm(
    `Finalize combined checkout for booking ${bookingId}? This will submit ${formatAdminMoney(request.payload.amount)} to the backend settlement endpoint.`
  );

  if (!confirmed) {
    return;
  }

  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = "Finalizing...";
    const result = await postAdminRoomCombinedCheckout(summary, {
      bookingId,
      idempotencyKey: request.payload.idempotencyKey
    });
    alert(result.message || "Combined checkout completed.");
    if (result.checkoutBill) {
      state.roomCheckoutBills = {
        ...state.roomCheckoutBills,
        [bookingId]: result.checkoutBill
      };
    }
    await loadTabData();
    const refreshedSummaryButton = Array.from(
      document.querySelectorAll("[data-view-room-checkout-summary]")
    ).find((candidate) => String(candidate.dataset.id || "") === bookingId);
    refreshedSummaryButton?.click();
  } catch (error) {
    console.error("Admin combined checkout failed:", error);
    alert(error.message || "Failed to finalize combined checkout.");
    button.disabled = false;
    button.textContent = originalText;
  }
}

function buildAdminRoomCheckoutSummaryMarkup(summary = {}, bill = {}) {
  const bookingId = summary.booking?.id || String(bill.bookingReference || "").split("-").pop();
  const finalizeButton = bill.provisional
    ? `<button type="button" class="status-btn" data-finalize-room-combined-checkout data-id="${escapeHTML(bookingId || "")}" ${getRoomCombinedCheckoutDisabledAttribute()}>Finalize Combined Checkout</button>`
    : "";
  return window.RoomCheckoutReceipt.buildCheckoutPanel({
    bill,
    finalizeButton,
    bookingId
  });
}

function buildAdminRoomCheckoutInvoiceDocument(bill = {}) {
  return window.RoomCheckoutReceipt.buildPrintDocument(bill);
}

function openAdminRoomCheckoutInvoice(bill = {}) {
  if (!window.RoomCheckoutReceipt.openPrintWindow(bill)) {
    alert("Please allow popups to print or save the room checkout bill as PDF.");
  }
}

function findAdminElementByDataId(selector = "", id = "") {
  return Array.from(document.querySelectorAll(selector)).find(
    (element) => String(element.dataset.id || "") === String(id)
  );
}

function buildRoomSummaryMarkup() {
  const availableRooms = state.rooms.filter(
    (room) => normalizeValue(room.status) === "available" && room.is_active !== false
  ).length;
  const occupiedRooms = state.rooms.filter(
    (room) => normalizeValue(room.status) === "occupied"
  ).length;
  const maintenanceRooms = state.rooms.filter((room) =>
    ["maintenance", "inactive"].includes(normalizeValue(room.status))
  ).length;
  const bookingCounts = getRoomBookingSummaryCounts(state.roomBookings);

  return `
    <div class="admin-card admin-list-summary">
      <h3>Room Snapshot</h3>
      <p class="admin-toolbar-help">Room inventory and booking state for the selected hotel scope.</p>
      <div class="status-row">
        <span class="status-badge">Room Types: ${escapeHTML(state.roomTypes.length)}</span>
        <span class="status-badge">Rooms: ${escapeHTML(state.rooms.length)}</span>
        <span class="status-badge">Available: ${escapeHTML(availableRooms)}</span>
        <span class="status-badge">Occupied: ${escapeHTML(occupiedRooms)}</span>
        <span class="status-badge">Maintenance/Inactive: ${escapeHTML(maintenanceRooms)}</span>
        <span class="status-badge">Bookings: ${escapeHTML(bookingCounts.total)}</span>
        <span class="status-badge">Pending: ${escapeHTML(bookingCounts.pending)}</span>
        <span class="status-badge">Checked In: ${escapeHTML(bookingCounts.checkedIn)}</span>
        <span class="status-badge">Unpaid: ${escapeHTML(bookingCounts.unpaid)}</span>
      </div>
    </div>
  `;
}

function renderRoomsAdminList() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.roomTypes.length && !state.rooms.length && !state.roomBookings.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Rooms",
        count: 0,
        description: "Room inventory and booking operations for the current hotel scope."
      })}
      <p class="empty-state">No room records found. Use the room booking API or the next room-management form step to add room types and rooms.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Rooms",
      count: state.rooms.length,
      description: "Room inventory and booking operations for the current hotel scope."
    })}
    ${buildRoomSummaryMarkup()}
    <div class="admin-card admin-list-summary">
      <h3>Rooms</h3>
      ${
        state.rooms.length
          ? `<div class="admin-grid">
              ${state.rooms.map((room) => `
                <article class="admin-card">
                  <h3>${escapeHTML(room.title || `Room ${room.room_number || room.id}`)}</h3>
                  <div class="admin-meta">${escapeHTML(room.hotel_slug || "")}</div>
                  <div class="admin-row"><strong>Room Number:</strong> ${escapeHTML(room.room_number || "")}</div>
                  <div class="admin-row"><strong>Type:</strong> ${escapeHTML(getRoomTypeName(room) || "Unassigned")}</div>
                  <div class="admin-row"><strong>Floor:</strong> ${escapeHTML(room.floor || "")}</div>
                  <div class="admin-row"><strong>Capacity:</strong> ${escapeHTML(room.capacity ?? "")}</div>
                  <div class="admin-row"><strong>Adults:</strong> ${escapeHTML(room.max_adults ?? "")}</div>
                  <div class="admin-row"><strong>Children:</strong> ${escapeHTML(room.max_children ?? "")}</div>
                  <div class="admin-row"><strong>Bed:</strong> ${escapeHTML(room.bed_type || "")}</div>
                  <div class="admin-row"><strong>Price:</strong> ${escapeHTML(formatAdminMoney(room.discount_price ?? room.base_price ?? 0))}</div>
                  <div class="admin-row admin-state-line">
                    <strong>Status:</strong>
                    <div class="admin-state-list">
                      ${buildAdminStateBadge(getRoomStatusLabel(room.status), getRoomStatusTone(room.status))}
                      ${buildBooleanStateBadge(room.is_active !== false, {
                        onLabel: "Active",
                        offLabel: "Inactive",
                        onTone: "success",
                        offTone: "danger"
                      })}
                    </div>
                  </div>
                  ${buildAdminRoomInventoryControls(room)}
                </article>
              `).join("")}
            </div>`
          : `<p class="empty-state">No rooms found.</p>`
      }
    </div>

    <div class="admin-card admin-list-summary">
      <h3>Room Bookings</h3>
      ${buildRoomBookingFilterMarkup()}
      ${
        state.roomBookings.length
          ? `<div class="admin-grid">
              ${state.roomBookings.map((booking) => `
                <article class="admin-card">
                  <h3>Booking #${escapeHTML(booking.id)}</h3>
                  <div class="admin-meta">${escapeHTML(booking.created_at || "")}</div>
                  <div class="admin-row"><strong>Hotel:</strong> ${escapeHTML(booking.hotel_slug || "")}</div>
                  <div class="admin-row"><strong>Room ID:</strong> ${escapeHTML(booking.room_id || "")}</div>
                  <div class="admin-row"><strong>Guest:</strong> ${escapeHTML(booking.guest_name || "")}</div>
                  <div class="admin-row"><strong>Phone:</strong> ${escapeHTML(booking.guest_phone || "")}</div>
                  <div class="admin-row"><strong>Dates:</strong> ${escapeHTML(booking.check_in_date || "")} to ${escapeHTML(booking.check_out_date || "")}</div>
                  <div class="admin-row"><strong>Nights:</strong> ${escapeHTML(booking.total_nights ?? "")}</div>
                  <div class="admin-row"><strong>Total:</strong> ${escapeHTML(formatAdminMoney(booking.total_amount || 0))}</div>
                  <div class="admin-row"><strong>Balance:</strong> ${escapeHTML(formatAdminMoney(booking.balance_amount || 0))}</div>
                  <div class="admin-row admin-state-line">
                    <strong>Status:</strong>
                    <div class="admin-state-list">
                      ${buildAdminStateBadge(getRoomStatusLabel(booking.booking_status), getRoomBookingStatusTone(booking.booking_status))}
                      ${buildAdminStateBadge(getRoomStatusLabel(booking.payment_status || "unpaid"), booking.payment_status === "paid" ? "success" : "warning")}
                    </div>
                  </div>
                  <div class="admin-row"><strong>Source:</strong> ${escapeHTML(booking.booking_source || "")}</div>
                  ${buildAdminRoomBookingControls(booking)}
                </article>
              `).join("")}
            </div>`
          : `<p class="empty-state">No room bookings found.</p>`
      }
    </div>

    <div class="admin-card admin-list-summary">
      <h3>Room Types</h3>
      ${
        state.roomTypes.length
          ? `<div class="admin-grid">
              ${state.roomTypes.map((roomType) => `
                <article class="admin-card">
                  <h3>${escapeHTML(roomType.name || `Room Type #${roomType.id}`)}</h3>
                  <div class="admin-meta">${escapeHTML(roomType.hotel_slug || "")}</div>
                  <div class="admin-row"><strong>Base Price:</strong> ${escapeHTML(formatAdminMoney(roomType.base_price || 0))}</div>
                  <div class="admin-row"><strong>Adults:</strong> ${escapeHTML(roomType.max_adults ?? "")}</div>
                  <div class="admin-row"><strong>Children:</strong> ${escapeHTML(roomType.max_children ?? "")}</div>
                  <div class="admin-row"><strong>Description:</strong> ${escapeHTML(roomType.description || "")}</div>
                  <div class="admin-row admin-state-line">
                    <strong>Status:</strong>
                    <div class="admin-state-list">
                      ${buildBooleanStateBadge(roomType.is_active !== false, {
                        onLabel: "Active",
                        offLabel: "Inactive",
                        onTone: "success",
                        offTone: "danger"
                      })}
                    </div>
                  </div>
                  ${buildAdminRoomTypeControls(roomType)}
                </article>
              `).join("")}
            </div>`
          : `<p class="empty-state">No room types found.</p>`
      }
    </div>
  `;
}

async function updateStatus(type, id, status) {
  await fetchJson(`${API_BASE}/${type}/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });
}

function renderContactSubmissions() {
  const content = $("#adminContent");
  if (!content) return;

  if (!state.contactSubmissions.length) {
    content.innerHTML = `
      ${buildAdminListSummaryCard({
        title: "Contact Messages",
        count: 0,
        description: "Review public contact form messages saved from the website."
      })}
      <p class="empty-state">No contact messages found.</p>
    `;
    return;
  }

  content.innerHTML = `
    ${buildAdminListSummaryCard({
      title: "Contact Messages",
      count: state.contactSubmissions.length,
      description: "Review public contact form messages saved from the website."
    })}
    <div class="admin-grid">
      ${state.contactSubmissions
        .map(
          (item) => `
            <article class="admin-card">
              <h3>Contact #${escapeHTML(item.id)}</h3>
              <div class="admin-meta">${escapeHTML(item.created_at || "")}</div>

              <div class="admin-row"><strong>Hotel:</strong> ${escapeHTML(item.hotel_name || "")}</div>
              <div class="admin-row"><strong>Hotel Slug:</strong> ${escapeHTML(item.hotel_slug || "")}</div>
              <div class="admin-row"><strong>Name:</strong> ${escapeHTML(item.name || "")}</div>
              <div class="admin-row"><strong>Email:</strong> ${escapeHTML(item.email || "")}</div>
              <div class="admin-row"><strong>Subject:</strong> ${escapeHTML(item.subject || "")}</div>
              <div class="admin-row"><strong>Message:</strong> ${escapeHTML(item.message || "")}</div>
              <div class="admin-row"><strong>Sheet Status:</strong> ${escapeHTML(item.google_sheet_status || "")}</div>
              <div class="admin-row"><strong>Status:</strong> <span class="status-badge">${escapeHTML(item.status || "new")}</span></div>

              <div class="status-row">
                <select class="status-select" data-type="contact-submissions" data-id="${escapeHTML(item.id)}">
                  <option value="new" ${item.status === "new" ? "selected" : ""}>new</option>
                  <option value="contacted" ${item.status === "contacted" ? "selected" : ""}>contacted</option>
                  <option value="resolved" ${item.status === "resolved" ? "selected" : ""}>resolved</option>
                  <option value="closed" ${item.status === "closed" ? "selected" : ""}>closed</option>
                  <option value="archived" ${item.status === "archived" ? "selected" : ""}>archived</option>
                </select>
                <button class="status-btn" data-update-status data-type="contact-submissions" data-id="${escapeHTML(item.id)}">Update Status</button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

async function updateOrderBilling(id, payload) {
  await fetchJson(`${API_BASE}/orders/${id}/billing`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function getBillingUpdateConfirmMessage(id, payload = {}) {
  const billingStatus = String(payload.billingStatus || "").replace(/_/g, " ");
  const paymentStatus = getPaymentStatusLabel(payload.paymentStatus);

  return [
    `Update billing for order ${id}?`,
    `Billing Status: ${billingStatus || "not set"}`,
    `Payment Status: ${paymentStatus || "not set"}`,
    "",
    "Only continue if the operator has confirmed this change."
  ].join("\n");
}

function bindTabs() {
  const tabs = [...document.querySelectorAll(".admin-tab[data-tab]")];
  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      tabs.forEach((btn) => {
        const isSelected = btn === tab;
        btn.classList.toggle("active", isSelected);
        btn.setAttribute("aria-selected", isSelected ? "true" : "false");
        btn.tabIndex = isSelected ? 0 : -1;
      });
      state.activeTab = tab.dataset.tab;
      await loadTabData();
    });

    tab.addEventListener("keydown", (event) => {
      const currentIndex = tabs.indexOf(tab);
      let nextIndex = currentIndex;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  });
}

function bindHotelFilter() {
  const select = $("#hotelFilter");
  if (!select) return;

  select.addEventListener("change", async () => {
    state.menuCategories = [];
    refreshMenuCategoryOptions();
    syncMenuFormHotelSlug({ force: true });
    syncMenuCategoryFormHotelSlug({ force: true });
    syncMenuComboFormHotelSlug({ force: true });
    syncGalleryFormHotelSlug({ force: true });
    syncPopupNotificationFormHotelSlug({ force: true });
    syncNotificationSettingsHotelSlug({ force: true });
    syncOrderingSettingsHotelSlug({ force: true });
    syncRoomFeatureSettingsHotelSlug({ force: true });
    syncPaymentRouteSettingsHotelSlug({ force: true });
    syncQrTableLinkHotelSlug({ force: true });
    syncRoomTypeFormHotelSlug({ force: true });
    syncRoomFormHotelSlug({ force: true });
    syncRoomBookingFormHotelSlug({ force: true });
    await loadRoomBookingRoomOptions();
    await loadTabData();
  });
}

function bindListFilters() {
  document.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.matches("[data-menu-item-search]")) {
      const nextValue = target.value || "";
      const selectionStart = target.selectionStart ?? nextValue.length;
      const selectionEnd = target.selectionEnd ?? nextValue.length;

      state.menuItemSearchQuery = nextValue;

      if (state.activeTab === "menu-items") {
        renderMenuItems();

        const nextInput = document.querySelector("[data-menu-item-search]");
        if (nextInput instanceof HTMLInputElement) {
          nextInput.focus();

          try {
            nextInput.setSelectionRange(selectionStart, selectionEnd);
          } catch (error) {
            console.warn("Menu item search cursor restore failed:", error);
          }
        }
      }
    }
  });
}

function bindRoomBookingFilters() {
  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "roomBookingFiltersForm") {
      return;
    }

    event.preventDefault();

    const formData = new FormData(form);
    const status = String(formData.get("status") || "");
    const fromDate = String(formData.get("fromDate") || "");
    const toDate = String(formData.get("toDate") || "");
    const limit = String(formData.get("limit") || "100");
    const numericLimit = Number(limit);

    if (fromDate && toDate && toDate < fromDate) {
      alert("Check-in To date must be after Check-in From date.");
      return;
    }

    if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 200) {
      alert("Booking list limit must be between 1 and 200.");
      return;
    }

    state.roomBookingFilters = {
      status,
      fromDate,
      toDate,
      limit
    };

    await loadTabData();
  });

  document.addEventListener("click", async (event) => {
    const resetButton = event.target.closest("[data-reset-room-booking-filters]");
    if (!resetButton) return;

    state.roomBookingFilters = {
      status: "",
      fromDate: "",
      toDate: "",
      limit: "100"
    };

    await loadTabData();
  });
}

function openUploadSectionWithConfig({
  hotelSlug = "",
  folder = "misc",
  targetFieldId = "",
  storageTargetFieldId = ""
} = {}) {
  const uploadHotelSlugInput = document.getElementById("uploadHotelSlugInput");
  const uploadFolderInput = document.getElementById("uploadFolderInput");
  const uploadTargetFieldInput = document.getElementById("uploadTargetFieldInput");
  const uploadStorageTargetFieldInput = document.getElementById("uploadStorageTargetFieldInput");

  if (uploadHotelSlugInput) uploadHotelSlugInput.value = hotelSlug || "shared";
  if (uploadFolderInput) uploadFolderInput.value = folder || "misc";
  if (uploadTargetFieldInput) uploadTargetFieldInput.value = targetFieldId || "";
  if (uploadStorageTargetFieldInput) {
    uploadStorageTargetFieldInput.value = storageTargetFieldId || "";
  }

  setSectionVisibility("uploadSection", true);
  scrollSectionIntoView("uploadSection");
}

function bindStatusActions() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-update-status]");
    if (!btn) return;

    const { type, id } = btn.dataset;
    const select = document.querySelector(
      `.status-select[data-type="${type}"][data-id="${id}"]`
    );

    if (!select) return;

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      await updateStatus(type, id, select.value);
      await loadTabData();
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Failed to update status");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Status";
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-update-room-booking-status]");
    if (!btn) return;

    const bookingId = btn.dataset.id || "";
    const select = findAdminElementByDataId(".room-booking-status-select", bookingId);

    if (!bookingId || !select) return;

    const nextStatus = select.value;
    const hotelSlug = select.dataset.hotelSlug || "";

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      await updateAdminRoomBookingStatus(bookingId, {
        hotelSlug,
        bookingStatus: nextStatus
      });
      await loadTabData();
    } catch (error) {
      console.error("Room booking status update failed:", error);
      alert(error.message || "Failed to update room booking status");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Booking Status";
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-update-room-inventory]");
    if (!btn) return;

    const roomId = btn.dataset.id || "";
    const statusSelect = findAdminElementByDataId(
      ".room-inventory-status-select",
      roomId
    );
    const activeSelect = findAdminElementByDataId(
      ".room-inventory-active-select",
      roomId
    );
    const basePriceInput = findAdminElementByDataId(
      ".room-inventory-base-price",
      roomId
    );
    const discountPriceInput = findAdminElementByDataId(
      ".room-inventory-discount-price",
      roomId
    );
    const taxPercentInput = findAdminElementByDataId(
      ".room-inventory-tax-percent",
      roomId
    );

    if (!roomId || !statusSelect || !activeSelect || !basePriceInput || !taxPercentInput) return;

    const nextStatus = statusSelect.value || "available";
    const nextIsActive = activeSelect.value === "true";
    const basePrice = Number(basePriceInput.value || 0);
    const discountPrice =
      discountPriceInput && discountPriceInput.value.trim() !== ""
        ? Number(discountPriceInput.value)
        : null;
    const taxPercent = Number(taxPercentInput.value || 0);
    const removesFromAvailability =
      !nextIsActive || ["maintenance", "inactive"].includes(nextStatus);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      alert("Enter a valid base price.");
      return;
    }

    if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0)) {
      alert("Enter a valid discount price, or leave it blank.");
      return;
    }

    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      alert("Tax/GST percent must be between 0 and 100.");
      return;
    }

    if (discountPrice !== null && discountPrice > basePrice) {
      alert("Discount price should not be greater than base price.");
      return;
    }

    if (
      removesFromAvailability &&
      !window.confirm(
        "This change will remove the room from public availability. Continue?"
      )
    ) {
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      await updateAdminRoom(roomId, {
        status: nextStatus,
        isActive: nextIsActive,
        basePrice,
        discountPrice,
        taxPercent
      });
      await loadTabData();
    } catch (error) {
      console.error("Room inventory update failed:", error);
      alert(error.message || "Failed to update room inventory");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Room";
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-update-room-type]");
    if (!btn) return;

    const roomTypeId = btn.dataset.id || "";
    const basePriceInput = findAdminElementByDataId(".room-type-base-price", roomTypeId);
    const maxAdultsInput = findAdminElementByDataId(".room-type-max-adults", roomTypeId);
    const maxChildrenInput = findAdminElementByDataId(".room-type-max-children", roomTypeId);
    const activeSelect = findAdminElementByDataId(".room-type-active-select", roomTypeId);

    if (!roomTypeId || !basePriceInput || !maxAdultsInput || !maxChildrenInput || !activeSelect) {
      return;
    }

    const basePrice = Number(basePriceInput.value || 0);
    const maxAdults = Number(maxAdultsInput.value || 0);
    const maxChildren = Number(maxChildrenInput.value || 0);
    const isActive = activeSelect.value === "true";

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      alert("Enter a valid room type base price.");
      return;
    }

    if (
      !Number.isInteger(maxAdults) ||
      maxAdults < 0 ||
      maxAdults > 100 ||
      !Number.isInteger(maxChildren) ||
      maxChildren < 0 ||
      maxChildren > 100
    ) {
      alert("Room type guest limits must be whole numbers between 0 and 100.");
      return;
    }

    if (!isActive && !window.confirm("Deactivate this room type? Existing rooms remain unchanged.")) {
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      await updateAdminRoomType(roomTypeId, {
        basePrice,
        maxAdults,
        maxChildren,
        isActive
      });
      await loadTabData();
    } catch (error) {
      console.error("Room type update failed:", error);
      alert(error.message || "Failed to update room type");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Room Type";
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-record-room-booking-payment]");
    if (!btn) return;

    const bookingId = btn.dataset.id || "";
    const hotelSlug = btn.dataset.hotelSlug || "";
    const amountInput = findAdminElementByDataId(".room-booking-payment-amount", bookingId);
    const methodSelect = findAdminElementByDataId(".room-booking-payment-method", bookingId);
    const transactionInput = findAdminElementByDataId(
      ".room-booking-payment-transaction",
      bookingId
    );

    if (!bookingId || !amountInput || !methodSelect) return;

    const amount = Number(amountInput.value || 0);
    const maxAmount = Number(amountInput.max || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid room payment amount.");
      return;
    }

    if (Number.isFinite(maxAmount) && maxAmount > 0 && amount > maxAmount) {
      alert("Payment amount cannot be greater than the current room booking balance.");
      return;
    }

    const confirmed = window.confirm(
      `Record ${formatAdminMoney(amount)} payment for room booking #${bookingId}?`
    );

    if (!confirmed) return;

    try {
      btn.disabled = true;
      btn.textContent = "Recording...";
      const idempotencyKey = btn.dataset.paymentRequestId ||
        `room-payment-${bookingId}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
      btn.dataset.paymentRequestId = idempotencyKey;

      await recordAdminRoomBookingPayment(bookingId, {
        hotelSlug,
        amount,
        paymentMethod: methodSelect.value,
        paymentStatus: "paid",
        transactionId: transactionInput?.value.trim() || "",
        idempotencyKey
      });
      delete btn.dataset.paymentRequestId;
      await loadTabData();
    } catch (error) {
      console.error("Room booking payment failed:", error);
      alert(error.message || "Failed to record room booking payment");
    } finally {
      btn.disabled = false;
      btn.textContent = "Record Payment";
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-view-room-checkout-summary]");
    if (!btn) return;

    const bookingId = String(btn.dataset.id || "").trim();
    const hotelSlug = String(btn.dataset.hotelSlug || "").trim();
    const card = btn.closest("article.admin-card");
    const target = card?.querySelector("[data-room-checkout-summary]");

    if (!bookingId || !hotelSlug || !target) return;

    try {
      btn.disabled = true;
      btn.textContent = "Loading...";
      target.hidden = false;
      target.innerHTML = '<p class="admin-field-hint">Loading checkout summary...</p>';

      const result = await fetchAdminRoomCheckoutSummary(bookingId, hotelSlug);
      const summary = {
        ...(result.summary || state.roomCheckoutSummaries?.[bookingId] || {}),
        hotelSlug: result.hotelSlug || hotelSlug
      };
      const bill = result.bill || {};
      state.roomCheckoutSummaries = {
        ...state.roomCheckoutSummaries,
        [bookingId]: summary
      };
      state.roomCheckoutBills = {
        ...state.roomCheckoutBills,
        [bookingId]: bill
      };
      target.innerHTML = buildAdminRoomCheckoutSummaryMarkup(summary, bill);
    } catch (error) {
      console.error("Admin room checkout summary fetch failed:", error);
      target.innerHTML = `<p class="admin-field-hint">${escapeHTML(error.message || "Failed to load checkout summary.")}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Checkout Summary";
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-print-room-checkout-summary]");
    if (!btn) return;

    const bookingId = String(btn.dataset.id || "").trim();
    const bill = state.roomCheckoutBills?.[bookingId];

    if (!bill) {
      alert("Load the checkout summary before printing.");
      return;
    }

    void fetchJson(
      `${API_BASE}/room-checkout-bill/bookings/${encodeURIComponent(bookingId)}/audit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bill_printed" })
      }
    ).catch(() => {});
    openAdminRoomCheckoutInvoice(bill);
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-finalize-room-combined-checkout]");
    if (!btn) return;

    void handleAdminRoomCombinedCheckoutButton(btn);
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-update-order-billing]");
    if (!btn) return;

    const { id } = btn.dataset;
    const billingSelect = document.querySelector(
      `.order-billing-select[data-order-billing-field="billingStatus"][data-id="${id}"]`
    );
    const paymentSelect = document.querySelector(
      `.order-billing-select[data-order-billing-field="paymentStatus"][data-id="${id}"]`
    );

    if (!billingSelect || !paymentSelect) return;

    const nextBillingStatus = billingSelect.value;
    const nextPaymentStatus = paymentSelect.value;
    const confirmed = window.confirm(
      getBillingUpdateConfirmMessage(id, {
        billingStatus: nextBillingStatus,
        paymentStatus: nextPaymentStatus
      })
    );

    if (!confirmed) return;

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      await updateOrderBilling(id, {
        billingStatus: nextBillingStatus,
        paymentStatus: nextPaymentStatus
      });
      await loadTabData();
    } catch (error) {
      console.error("Billing update failed:", error);
      alert("Failed to update billing");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Billing";
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-print-order-bill]");
    if (!btn) return;

    const { id } = btn.dataset;
    const order = state.orders.find((item) => String(item.id) === String(id));

    if (!order) {
      alert("Order not found in the current dashboard list.");
      return;
    }

    openOrderBillPrintView(order);
  });
}

function bindFormToggles() {
  const hotelBtn = document.getElementById("openHotelFormBtn");
  const menuBtn = document.getElementById("openMenuFormBtn");
  const menuCategoryBtn = document.getElementById("openMenuCategoryFormBtn");
  const menuComboBtn = document.getElementById("openMenuComboFormBtn");
  const galleryBtn = document.getElementById("openGalleryFormBtn");
  const popupNotificationBtn = document.getElementById("openPopupNotificationFormBtn");
  const testimonialBtn = document.getElementById("openTestimonialFormBtn");
  const notificationSettingsBtn = document.getElementById(
    "openNotificationSettingsBtn"
  );
  const orderingSettingsBtn = document.getElementById(
    "openOrderingSettingsBtn"
  );
  const roomFeatureSettingsBtn = document.getElementById(
    "openRoomFeatureSettingsBtn"
  );
  const paymentRouteSettingsBtn = document.getElementById(
    "openPaymentRouteSettingsBtn"
  );
  const profileBtn = document.getElementById("openProfileFormBtn");
  const qrTableLinkBtn = document.getElementById("openQrTableLinkBtn");
  const roomTypeBtn = document.getElementById("openRoomTypeFormBtn");
  const roomBtn = document.getElementById("openRoomFormBtn");
  const roomBookingBtn = document.getElementById("openRoomBookingFormBtn");

  if (
    notificationSettingsBtn &&
    notificationSettingsBtn.dataset.boundClick !== "true"
  ) {
    notificationSettingsBtn.addEventListener("click", async () => {
      syncNotificationSettingsHotelSlug({ force: true });
      const isVisible = setSectionVisibility("notificationSettingsSection");

      if (!isVisible) return;

      const hotelSlug =
        document.getElementById("notificationSettingsHotelSlugInput")?.value.trim() || "";

      if (hotelSlug) {
        try {
          const result = await fetchNotificationSettings(hotelSlug);
          fillNotificationSettingsForm(result.settings || {});
        } catch (error) {
          console.error("Failed to load notification settings:", error);
          alert(error.message || "Failed to load notification settings");
        }
      } else {
        resetNotificationSettingsForm();
      }

      scrollSectionIntoView("notificationSettingsSection");
    });
    notificationSettingsBtn.dataset.boundClick = "true";
  }

  if (
    orderingSettingsBtn &&
    orderingSettingsBtn.dataset.boundClick !== "true"
  ) {
    orderingSettingsBtn.addEventListener("click", async () => {
      syncOrderingSettingsHotelSlug({ force: true });
      const isVisible = setSectionVisibility("orderingSettingsSection");

      if (!isVisible) return;

      const hotelSlug =
        document.getElementById("orderingSettingsHotelSlugInput")?.value.trim() || "";

      if (hotelSlug) {
        try {
          const result = await fetchOrderingSettings(hotelSlug);
          fillOrderingSettingsForm(result.settings || {});
          const help = document.getElementById("orderingSettingsHelp");

          if (help && result.schemaReady === false) {
            help.textContent =
              "Run the hotel ordering settings SQL script before saving.";
          }
        } catch (error) {
          console.error("Failed to load ordering settings:", error);
          alert(error.message || "Failed to load ordering settings");
        }
      } else {
        resetOrderingSettingsForm();
      }

      scrollSectionIntoView("orderingSettingsSection");
    });
    orderingSettingsBtn.dataset.boundClick = "true";
  }

  if (
    paymentRouteSettingsBtn &&
    paymentRouteSettingsBtn.dataset.boundClick !== "true"
  ) {
    paymentRouteSettingsBtn.addEventListener("click", async () => {
      syncPaymentRouteSettingsHotelSlug({ force: true });
      const isVisible = setSectionVisibility("paymentRouteSettingsSection");

      if (!isVisible) return;

      const hotelSlug =
        document.getElementById("paymentRouteHotelSlugInput")?.value.trim() || "";

      if (hotelSlug) {
        try {
          const result = await fetchPaymentRouteSettings(hotelSlug);
          fillPaymentRouteSettingsForm(result.settings || {});
          const help = document.getElementById("paymentRouteSettingsHelp");

          if (help && result.schemaReady === false) {
            help.textContent =
              "Run the hotel payment Route settings SQL script before saving.";
          }
        } catch (error) {
          console.error("Failed to load payment Route settings:", error);
          alert(error.message || "Failed to load payment Route settings");
        }
      } else {
        resetPaymentRouteSettingsForm();
      }

      scrollSectionIntoView("paymentRouteSettingsSection");
    });
    paymentRouteSettingsBtn.dataset.boundClick = "true";
  }

  if (
    roomFeatureSettingsBtn &&
    roomFeatureSettingsBtn.dataset.boundClick !== "true"
  ) {
    roomFeatureSettingsBtn.addEventListener("click", async () => {
      syncRoomFeatureSettingsHotelSlug({ force: true });
      const isVisible = setSectionVisibility("roomFeatureSettingsSection");

      if (!isVisible) return;

      const hotelSlug =
        document.getElementById("roomFeatureSettingsHotelSlugInput")?.value.trim() || "";

      if (hotelSlug) {
        try {
          const result = await fetchRoomFeatureSettings(hotelSlug);
          fillRoomFeatureSettingsForm(result.settings || {});
          const help = document.getElementById("roomFeatureSettingsHelp");

          if (help && result.schemaReady === false) {
            help.textContent =
              "Run the room booking SQL script before saving feature settings.";
          }
        } catch (error) {
          console.error("Failed to load room feature settings:", error);
          alert(error.message || "Failed to load room feature settings");
        }
      } else {
        resetRoomFeatureSettingsForm();
      }

      scrollSectionIntoView("roomFeatureSettingsSection");
    });
    roomFeatureSettingsBtn.dataset.boundClick = "true";
  }

  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      const isVisible = setSectionVisibility("profileFormSection");
      if (isVisible) {
        scrollSectionIntoView("profileFormSection");
      }
  });
}

  if (qrTableLinkBtn) {
    qrTableLinkBtn.addEventListener("click", () => {
      syncQrTableLinkHotelSlug({ force: true });
      const isVisible = setSectionVisibility("qrTableLinkSection");
      if (isVisible) {
        scrollSectionIntoView("qrTableLinkSection");
      }
    });
  }

  if (hotelBtn) {
    hotelBtn.addEventListener("click", () => {
      const isVisible = setSectionVisibility("hotelFormSection");
      if (isVisible) {
        scrollSectionIntoView("hotelFormSection");
      }
    });
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", async () => {
      syncMenuFormHotelSlug({ force: true });
      const hotelSlug = getSelectedHotelSlug();
      if (hotelSlug) {
        try {
          const result = await fetchJson(
            `${API_BASE}/menu-categories?hotelSlug=${encodeURIComponent(hotelSlug)}`
          );
          state.menuCategories = result.categories || [];
          refreshMenuCategoryOptions();
        } catch (error) {
          console.error("Menu category options load failed:", error);
        }
      }
      const isVisible = setSectionVisibility("menuFormSection");
      if (isVisible) {
        scrollSectionIntoView("menuFormSection");
      }
    });
  }

  if (menuCategoryBtn) {
    menuCategoryBtn.addEventListener("click", () => {
      syncMenuCategoryFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("menuCategoryFormSection");
      if (isVisible) {
        scrollSectionIntoView("menuCategoryFormSection");
      }
    });
  }

  if (menuComboBtn) {
    menuComboBtn.addEventListener("click", () => {
      syncMenuComboFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("menuComboFormSection");
      if (isVisible) {
        scrollSectionIntoView("menuComboFormSection");
      }
    });
  }

  if (roomTypeBtn) {
    roomTypeBtn.addEventListener("click", () => {
      syncRoomTypeFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("roomTypeFormSection");
      if (isVisible) {
        scrollSectionIntoView("roomTypeFormSection");
      }
    });
  }

  if (roomBtn) {
    roomBtn.addEventListener("click", () => {
      syncRoomFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("roomFormSection");
      if (isVisible) {
        scrollSectionIntoView("roomFormSection");
      }
    });
  }

  if (roomBookingBtn) {
    roomBookingBtn.addEventListener("click", async () => {
      syncRoomBookingFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("roomBookingFormSection");
      if (isVisible) {
        await loadRoomBookingRoomOptions();
        scrollSectionIntoView("roomBookingFormSection");
      }
    });
  }

  if (popupNotificationBtn) {
    popupNotificationBtn.addEventListener("click", () => {
      syncPopupNotificationFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("popupNotificationFormSection");
      if (isVisible) {
        scrollSectionIntoView("popupNotificationFormSection");
      }
    });
  }

  if (galleryBtn) {
    galleryBtn.addEventListener("click", () => {
      syncGalleryFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("galleryFormSection");
      if (isVisible) {
        scrollSectionIntoView("galleryFormSection");
      }
    });
  }

  if (testimonialBtn) {
    testimonialBtn.addEventListener("click", () => {
      syncTestimonialFormHotelSlug({ force: true });
      const isVisible = setSectionVisibility("testimonialFormSection");
      if (isVisible) {
        scrollSectionIntoView("testimonialFormSection");
      }
    });
  }
}

function bindQrTableLinkHelper() {
  const form = document.getElementById("qrTableLinkForm");
  const copyBtn = document.getElementById("copyQrTableLinkBtn");
  const previewLink = document.getElementById("qrTableLinkPreview");
  const inputs = [
    document.getElementById("qrLinkHotelSlugInput"),
    document.getElementById("qrLinkTableNumberInput"),
    document.getElementById("qrLinkTargetPageInput")
  ].filter(Boolean);

  if (form && form.dataset.boundSubmit !== "true") {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void generateQrTableLink();
    });
    form.dataset.boundSubmit = "true";
  }

  if (copyBtn && copyBtn.dataset.boundClick !== "true") {
    copyBtn.addEventListener("click", () => {
      void copyQrTableLink();
    });
    copyBtn.dataset.boundClick = "true";
  }

  if (previewLink && previewLink.dataset.boundClick !== "true") {
    previewLink.addEventListener("click", (event) => {
      if (!previewLink.getAttribute("href") || previewLink.getAttribute("href") === "#") {
        event.preventDefault();
        void generateQrTableLink();
      }
    });
    previewLink.dataset.boundClick = "true";
  }

  inputs.forEach((input) => {
    if (input.dataset.boundQrLinkChange === "true") return;
    input.addEventListener("input", () => {
      updateQrTableLinkOutput("", "QR link inputs changed. Generate a fresh link before copying.");
    });
    input.addEventListener("change", () => {
      updateQrTableLinkOutput("", "QR link inputs changed. Generate a fresh link before copying.");
    });
    input.dataset.boundQrLinkChange = "true";
  });
}

function bindHotelDomainResolveHelper() {
  const checkBtn = document.getElementById("checkHotelResolveBtn");
  const usePrimaryBtn = document.getElementById("fillHotelResolveHostFromPrimaryBtn");
  const refreshDeployValuesBtn = document.getElementById("refreshHotelDeployValuesBtn");
  const copyDeployValuesBtn = document.getElementById("copyHotelDeployValuesBtn");
  const refreshLaunchNotesBtn = document.getElementById("refreshHotelLaunchNotesBtn");
  const copyLaunchNotesBtn = document.getElementById("copyHotelLaunchNotesBtn");
  const hotelSlugInput = document.getElementById("hotelSlugInput");
  const primaryDomainInput = document.getElementById("hotelPrimaryDomainInput");
  const subdomainInput = document.getElementById("hotelSubdomainInput");
  const resolveHostInput = document.getElementById("hotelDomainResolveHostInput");

  if (checkBtn && checkBtn.dataset.boundClick !== "true") {
    checkBtn.addEventListener("click", () => {
      void checkHotelDomainResolve();
    });
    checkBtn.dataset.boundClick = "true";
  }

  if (usePrimaryBtn && usePrimaryBtn.dataset.boundClick !== "true") {
    usePrimaryBtn.addEventListener("click", () => {
      fillHotelResolveHostFromPrimaryDomain();
    });
    usePrimaryBtn.dataset.boundClick = "true";
  }

  if (refreshDeployValuesBtn && refreshDeployValuesBtn.dataset.boundClick !== "true") {
    refreshDeployValuesBtn.addEventListener("click", () => {
      renderHotelDeployValuesHelper("Deploy values refreshed from the current hotel form.");
    });
    refreshDeployValuesBtn.dataset.boundClick = "true";
  }

  if (copyDeployValuesBtn && copyDeployValuesBtn.dataset.boundClick !== "true") {
    copyDeployValuesBtn.addEventListener("click", () => {
      void copyHotelDeployValues();
    });
    copyDeployValuesBtn.dataset.boundClick = "true";
  }

  if (refreshLaunchNotesBtn && refreshLaunchNotesBtn.dataset.boundClick !== "true") {
    refreshLaunchNotesBtn.addEventListener("click", () => {
      renderHotelLaunchNotesHelper("Launch notes refreshed from the current hotel form.");
    });
    refreshLaunchNotesBtn.dataset.boundClick = "true";
  }

  if (copyLaunchNotesBtn && copyLaunchNotesBtn.dataset.boundClick !== "true") {
    copyLaunchNotesBtn.addEventListener("click", () => {
      void copyHotelLaunchNotes();
    });
    copyLaunchNotesBtn.dataset.boundClick = "true";
  }

  [hotelSlugInput, primaryDomainInput, subdomainInput, resolveHostInput]
    .filter(Boolean)
    .forEach((input) => {
      if (input.dataset.boundHotelResolveChange === "true") return;
      input.addEventListener("input", () => {
        setHotelDomainResolveOutput({
          tone: "neutral",
          title: "Hostname inputs changed.",
          detail: "Run the check again to verify the latest routing."
        });
        renderHotelDomainLaunchChecklist();
        renderHotelDeployValuesHelper("Deploy values changed with the current hotel form.");
      });
      input.addEventListener("change", () => {
        setHotelDomainResolveOutput({
          tone: "neutral",
          title: "Hostname inputs changed.",
          detail: "Run the check again to verify the latest routing."
        });
        renderHotelDomainLaunchChecklist();
        renderHotelDeployValuesHelper("Deploy values changed with the current hotel form.");
      });
      input.dataset.boundHotelResolveChange = "true";
    });

  renderHotelDomainLaunchChecklist();
  renderHotelDeployValuesHelper();
  renderHotelLaunchNotesHelper();
}

function bindGalleryUploadHelper() {
  const btn = document.getElementById("galleryUploadHelperBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const hotelSlug =
      document.getElementById("galleryHotelSlugInput")?.value.trim() ||
      getSelectedHotelSlug() ||
      "shared";

    openUploadSectionWithConfig({
      hotelSlug,
      folder: "gallery",
      targetFieldId: "galleryImageUrlInput",
      storageTargetFieldId: "galleryStoragePathInput"
    });
  });
}

function bindMenuComboUploadHelper() {
  const btn = document.getElementById("menuComboUploadHelperBtn");
  if (!btn || btn.dataset.boundClick === "true") return;

  btn.addEventListener("click", () => {
    const hotelSlug =
      document.getElementById("menuComboHotelSlugInput")?.value.trim() ||
      getSelectedHotelSlug() ||
      "shared";

    openUploadSectionWithConfig({
      hotelSlug,
      folder: "combos",
      targetFieldId: "menuComboImageInput",
      storageTargetFieldId: "menuComboStoragePathInput"
    });
  });

  btn.dataset.boundClick = "true";
}

function bindPopupNotificationUploadHelper() {
  const btn = document.getElementById("popupNotificationUploadHelperBtn");
  if (!btn || btn.dataset.boundClick === "true") return;

  btn.addEventListener("click", () => {
    const hotelSlug =
      document.getElementById("popupNotificationHotelSlugInput")?.value.trim() ||
      getSelectedHotelSlug() ||
      "shared";

    openUploadSectionWithConfig({
      hotelSlug,
      folder: "popup-notifications",
      targetFieldId: "popupNotificationImageUrlInput",
      storageTargetFieldId: "popupNotificationStoragePathInput"
    });
  });

  btn.dataset.boundClick = "true";
}

function bindProfileAboutImageUploadHelpers() {
  const helperConfigs = [
    {
      buttonId: "profileAboutPrimaryImageUploadBtn",
      targetFieldId: "profileAboutPrimaryImageUrlInput"
    },
    {
      buttonId: "profileAboutSecondaryImageUploadBtn",
      targetFieldId: "profileAboutSecondaryImageUrlInput"
    }
  ];

  helperConfigs.forEach(({ buttonId, targetFieldId }) => {
    const btn = document.getElementById(buttonId);
    if (!btn || btn.dataset.boundClick === "true") return;

    btn.addEventListener("click", () => {
      const hotelSlug =
        document.getElementById("profileHotelSlugInput")?.value.trim() ||
        getSelectedHotelSlug() ||
        "shared";

      openUploadSectionWithConfig({
        hotelSlug,
        folder: "about",
        targetFieldId
      });
    });

    btn.dataset.boundClick = "true";
  });
}

function bindProfileHeroImageUploadHelper() {
  const btn = document.getElementById("profileHeroBackgroundImageUploadBtn");
  if (!btn || btn.dataset.boundClick === "true") return;

  btn.addEventListener("click", () => {
    const hotelSlug =
      document.getElementById("profileHotelSlugInput")?.value.trim() ||
      getSelectedHotelSlug() ||
      "shared";

    openUploadSectionWithConfig({
      hotelSlug,
      folder: "hero",
      targetFieldId: "profileHeroBackgroundImageUrlInput"
    });
  });

  btn.dataset.boundClick = "true";
}

async function createHotel(payload) {
  return fetchJson(`${API_BASE}/hotels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updateHotel(id, payload) {
  return fetchJson(`${API_BASE}/hotels/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createMenuCategory(payload) {
  return fetchJson(`${API_BASE}/menu-categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function updateMenuCategory(id, payload) {
  return fetchJson(`${API_BASE}/menu-categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function deleteMenuCategory(id) {
  return fetchJson(`${API_BASE}/menu-categories/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

async function createMenuItem(payload) {
  return fetchJson(`${API_BASE}/menu-items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createMenuCombo(payload) {
  return fetchJson(`${API_BASE}/menu-combos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createRoomType(payload) {
  return fetchJson(`${API_BASE}/room-booking/room-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updateAdminRoomType(id, payload) {
  return fetchJson(`${API_BASE}/room-booking/room-types/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createRoom(payload) {
  return fetchJson(`${API_BASE}/room-booking/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updateAdminRoom(id, payload) {
  return fetchJson(`${API_BASE}/room-booking/rooms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function fetchAdminRoomAdvancePolicy(hotelSlug = "") {
  if (!hotelSlug) return null;
  return fetchJson(`${API_BASE}/room-booking/advance-policy/${encodeURIComponent(hotelSlug)}`);
}

function applyAdminRoomAdvancePaymentMethods(policy = {}) {
  const allowed = new Set(policy.allowedPaymentMethods || ["cash", "upi", "card", "bank_transfer"]);
  ["roomBookingPaymentMethodInput", "roomBookingSplitMethodInput"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    [...select.options].forEach((option) => {
      if (!option.value) return;
      const permitted = allowed.has(option.value);
      option.disabled = !permitted;
      option.hidden = !permitted;
    });
    if (select.value && !allowed.has(select.value)) select.value = "";
  });
}

async function createAdminRoomBooking(payload, idempotencyKey = "") {
  return fetchJson(`${API_BASE}/room-booking/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(payload)
  });
}

async function updateAdminRoomBookingStatus(id, payload) {
  return fetchJson(`${API_BASE}/room-booking/bookings/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function recordAdminRoomBookingPayment(id, payload) {
  return fetchJson(`${API_BASE}/room-booking/bookings/${encodeURIComponent(id)}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function fetchAdminRoomCheckoutSummary(id, hotelSlug) {
  return fetchJson(
    `${API_BASE}/room-checkout-bill/bookings/${encodeURIComponent(id)}`
  );
}

async function updateMenuItem(id, payload) {
  return fetchJson(`${API_BASE}/menu-items/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updateMenuCombo(id, payload) {
  return fetchJson(`${API_BASE}/menu-combos/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createGalleryItem(payload) {
  return fetchJson(`${API_BASE}/gallery-items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createPopupNotification(payload) {
  return fetchJson(`${API_BASE}/popup-notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updateGalleryItem(id, payload) {
  return fetchJson(`${API_BASE}/gallery-items/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updatePopupNotification(id, payload) {
  return fetchJson(`${API_BASE}/popup-notifications/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function createTestimonial(payload) {
  return fetchJson(`${API_BASE}/testimonials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function updateTestimonial(id, payload) {
  return fetchJson(`${API_BASE}/testimonials/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function bindHotelForm() {
  const form = document.getElementById("hotelForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("hotelId")?.value.trim();
    const currentlySelectedHotelId = getSelectedHotel()?.id;

    const payload = {
      slug: document.getElementById("hotelSlugInput")?.value.trim(),
      name: document.getElementById("hotelNameInput")?.value.trim(),
      whatsappNumber: document.getElementById("hotelWhatsappInput")?.value.trim(),
      upiId: document.getElementById("hotelUpiInput")?.value.trim(),
      gstPercent: Number(document.getElementById("hotelGstInput")?.value || 5),
      primaryDomain: normalizeHotelPrimaryDomainInput(
        document.getElementById("hotelPrimaryDomainInput")?.value
      ),
      subdomain: normalizeHotelSubdomainInput(
        document.getElementById("hotelSubdomainInput")?.value
      ),
      isActive: !!document.getElementById("hotelIsActiveInput")?.checked
    };

    if (
      payload.primaryDomain &&
      (
        !payload.primaryDomain.includes(".") ||
        payload.primaryDomain === "localhost"
      )
    ) {
      alert("Primary domain must look like example.com");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = id ? "Updating hotel..." : "Creating hotel...";
      }

      if (id) {
        await updateHotel(id, payload);
        alert("Hotel updated successfully");
      } else {
        await createHotel(payload);
        alert("Hotel created successfully");
      }

      await loadHotels();

      if (id && currentlySelectedHotelId && String(currentlySelectedHotelId) === String(id)) {
        const updatedHotel = state.hotels.find((entry) => String(entry.id) === String(id));
        if (updatedHotel) {
          setHotelFilterValue(updatedHotel.slug || updatedHotel.name || "");
        }
      }

      resetHotelForm();
      syncMenuFormHotelSlug({ force: true });
      syncMenuComboFormHotelSlug({ force: true });
      syncGalleryFormHotelSlug({ force: true });
      syncPopupNotificationFormHotelSlug({ force: true });
      syncRoomTypeFormHotelSlug({ force: true });
      syncRoomFormHotelSlug({ force: true });
      await loadTabData();
    } catch (error) {
      console.error("Hotel form submit failed:", error);
      alert("Failed to save hotel");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Hotel";
      }
    }
  });
}

function bindMenuCategoryForm() {
  const form = document.getElementById("menuCategoryForm");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("menuCategoryDbId")?.value.trim() || "";
    const hotelSlug = document.getElementById("menuCategoryHotelSlugInput")?.value.trim() || "";
    const categoryKey = document.getElementById("menuCategoryKeyInput")?.value.trim() || "";
    const imageFile = document.getElementById("menuCategoryImageFileInput")?.files?.[0];
    const payload = {
      name: document.getElementById("menuCategoryNameInput")?.value.trim() || "",
      description: document.getElementById("menuCategoryDescriptionInput")?.value.trim() || "",
      displayOrder: Number(document.getElementById("menuCategoryDisplayOrderInput")?.value || 0),
      isActive: document.getElementById("menuCategoryIsActiveInput")?.checked === true,
      isPublished: document.getElementById("menuCategoryIsPublishedInput")?.checked === true,
      staffEnabled: document.getElementById("menuCategoryStaffEnabledInput")?.checked === true,
      websiteEnabled: document.getElementById("menuCategoryWebsiteEnabledInput")?.checked === true,
      qrEnabled: document.getElementById("menuCategoryQrEnabledInput")?.checked === true,
      defaultImageUrl: document.getElementById("menuCategoryImageUrlInput")?.value.trim() || "",
      defaultThumbnailUrl: document.getElementById("menuCategoryThumbnailUrlInput")?.value.trim() || "",
      imageStoragePath: document.getElementById("menuCategoryImageStoragePathInput")?.value.trim() || "",
      imageAltText: document.getElementById("menuCategoryImageAltInput")?.value.trim() || ""
    };
    const slug = document.getElementById("menuCategorySlugInput")?.value.trim() || "";
    if (slug) payload.slug = slug;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = imageFile ? "Uploading category image..." : "Saving category...";
      }
      if (imageFile) {
        const uploadResult = await uploadImageFile({
          hotelSlug,
          folder: `menu-categories/${categoryKey}`,
          file: imageFile
        });
        payload.defaultImageUrl = uploadResult.file?.publicUrl || "";
        payload.defaultThumbnailUrl = payload.defaultImageUrl;
        payload.imageStoragePath = uploadResult.file?.path || "";
      }
      if (id) {
        await updateMenuCategory(id, payload);
      } else {
        await createMenuCategory({ ...payload, hotelSlug, categoryKey });
      }
      alert(id ? "Menu category updated successfully" : "Menu category created successfully");
      resetMenuCategoryForm();
      if (state.activeTab === "menu-categories") await loadTabData();
    } catch (error) {
      console.error("Menu category save failed:", error);
      alert(error.message || "Failed to save menu category");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Menu Category";
      }
    }
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-edit-menu-category]");
    if (!button) return;
    const category = state.menuCategories.find(
      (entry) => String(entry.reference) === String(button.dataset.id || "")
    );
    if (!category) return;
    fillMenuCategoryForm(category);
    setSectionVisibility("menuCategoryFormSection", true);
    scrollSectionIntoView("menuCategoryFormSection");
  });
}

  document.addEventListener("click", async (event) => {
    const button = event.target.closest?.("[data-delete-menu-category]");
    if (!button || button.disabled) return;
    const category = state.menuCategories.find(
      (entry) => String(entry.reference) === String(button.dataset.id || "")
    );
    if (!category || !window.confirm(`Delete the empty category “${category.name}”? This cannot be undone.`)) return;
    try {
      button.disabled = true;
      button.textContent = "Deleting...";
      await deleteMenuCategory(category.reference);
      resetMenuCategoryForm();
      await loadTabData();
    } catch (error) {
      console.error("Menu category delete failed:", error);
      alert(error.message || "Failed to delete menu category");
      button.disabled = false;
      button.textContent = "Delete Empty Category";
    }
  });

function bindMenuItemForm() {
  const form = document.getElementById("menuItemForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("menuItemDbId")?.value.trim();

    const payload = {
      hotelSlug: document.getElementById("menuHotelSlugInput")?.value.trim(),
      category: document.getElementById("menuCategoryInput")?.value.trim(),
      itemId: document.getElementById("menuItemIdInput")?.value.trim(),
      name: document.getElementById("menuNameInput")?.value.trim(),
      description: document.getElementById("menuDescriptionInput")?.value.trim(),
      price: Number(document.getElementById("menuPriceInput")?.value || 0),
      image: document.getElementById("menuImageInput")?.value.trim(),
      alt: document.getElementById("menuAltInput")?.value.trim(),
      badge: document.getElementById("menuBadgeInput")?.value.trim(),
      tag: document.getElementById("menuTagInput")?.value.trim(),
      sortOrder: Number(document.getElementById("menuSortOrderInput")?.value || 0),
      isAvailable: !!document.getElementById("menuIsAvailableInput")?.checked
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = id ? "Updating menu item..." : "Creating menu item...";
      }

      if (id) {
        await updateMenuItem(id, payload);
        alert("Menu item updated successfully");
      } else {
        await createMenuItem(payload);
        alert("Menu item created successfully");
      }

      resetMenuItemForm();

      if (state.activeTab === "menu-items") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Menu form submit failed:", error);
      alert("Failed to save menu item");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Menu Item";
      }
    }
  });
}

function bindMenuComboForm() {
  const form = document.getElementById("menuComboForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("menuComboDbId")?.value.trim();
    const childItems = parseMenuComboChildItemsInput(
      document.getElementById("menuComboChildItemsInput")?.value || ""
    );

    if (!childItems.length) {
      alert("Add at least one child item line for this combo.");
      return;
    }

    if (
      childItems.some(
        (childItem) =>
          !childItem.childItemId ||
          !Number.isFinite(childItem.quantity) ||
          childItem.quantity <= 0 ||
          !Number.isFinite(childItem.sortOrder) ||
          childItem.sortOrder < 0
      )
    ) {
      alert("Each child item line must use child_item_id|quantity|sort_order with valid numbers.");
      return;
    }

    const payload = {
      hotelSlug: document.getElementById("menuComboHotelSlugInput")?.value.trim(),
      category: document.getElementById("menuComboCategoryInput")?.value.trim(),
      itemId: document.getElementById("menuComboItemIdInput")?.value.trim(),
      name: document.getElementById("menuComboNameInput")?.value.trim(),
      description: document.getElementById("menuComboDescriptionInput")?.value.trim(),
      price: Number(document.getElementById("menuComboPriceInput")?.value || 0),
      image: document.getElementById("menuComboImageInput")?.value.trim(),
      alt: document.getElementById("menuComboAltInput")?.value.trim(),
      badge: document.getElementById("menuComboBadgeInput")?.value.trim(),
      tag: document.getElementById("menuComboTagInput")?.value.trim(),
      sortOrder: Number(document.getElementById("menuComboSortOrderInput")?.value || 0),
      isAvailable: !!document.getElementById("menuComboIsAvailableInput")?.checked,
      childItems,
      startDate: document.getElementById("menuComboStartDateInput")?.value.trim(),
      endDate: document.getElementById("menuComboEndDateInput")?.value.trim(),
      startTime: document.getElementById("menuComboStartTimeInput")?.value.trim(),
      endTime: document.getElementById("menuComboEndTimeInput")?.value.trim()
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = id ? "Updating combo offer..." : "Creating combo offer...";
      }

      if (id) {
        await updateMenuCombo(id, payload);
        alert("Combo offer updated successfully");
      } else {
        await createMenuCombo(payload);
        alert("Combo offer created successfully");
      }

      resetMenuComboForm();

      if (state.activeTab === "menu-combos") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Combo form submit failed:", error);
      alert(error.message || "Failed to save combo offer");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Combo Offer";
      }
    }
  });
}

function bindRoomTypeForm() {
  const form = document.getElementById("roomTypeForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const help = document.getElementById("roomTypeFormHelp");

    try {
      const payload = {
        hotelSlug: document.getElementById("roomTypeHotelSlugInput")?.value.trim(),
        name: document.getElementById("roomTypeNameInput")?.value.trim(),
        description: document.getElementById("roomTypeDescriptionInput")?.value.trim(),
        basePrice: getOptionalNumericInput("roomTypeBasePriceInput"),
        maxAdults: getOptionalNumericInput("roomTypeMaxAdultsInput", {
          integer: true,
          max: 100
        }),
        maxChildren: getOptionalNumericInput("roomTypeMaxChildrenInput", {
          integer: true,
          max: 100
        }),
        amenities: parseRoomListInput(
          document.getElementById("roomTypeAmenitiesInput")?.value || ""
        ),
        images: parseRoomListInput(
          document.getElementById("roomTypeImagesInput")?.value || ""
        ),
        cancellationPolicy:
          document.getElementById("roomTypeCancellationPolicyInput")?.value.trim(),
        isActive: !!document.getElementById("roomTypeIsActiveInput")?.checked
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating room type...";
      }

      await createRoomType(payload);
      if (help) help.textContent = "Room type saved successfully.";
      alert("Room type created successfully");

      resetRoomTypeForm();

      if (state.activeTab === "rooms") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Room type form submit failed:", error);
      if (help) help.textContent = error.message || "Failed to save room type.";
      alert(error.message || "Failed to save room type");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Room Type";
      }
    }
  });
}

function bindRoomForm() {
  const form = document.getElementById("roomForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const help = document.getElementById("roomFormHelp");

    try {
      const payload = {
        hotelSlug: document.getElementById("roomHotelSlugInput")?.value.trim(),
        roomTypeId: getOptionalNumericInput("roomRoomTypeIdInput", {
          integer: true,
          min: 1
        }),
        roomNumber: document.getElementById("roomNumberInput")?.value.trim(),
        floor: document.getElementById("roomFloorInput")?.value.trim(),
        title: document.getElementById("roomTitleInput")?.value.trim(),
        capacity: getOptionalNumericInput("roomCapacityInput", {
          integer: true,
          max: 200
        }),
        maxAdults: getOptionalNumericInput("roomMaxAdultsInput", {
          integer: true,
          max: 100
        }),
        maxChildren: getOptionalNumericInput("roomMaxChildrenInput", {
          integer: true,
          max: 100
        }),
        bedType: document.getElementById("roomBedTypeInput")?.value.trim(),
        basePrice: getOptionalNumericInput("roomBasePriceInput"),
        discountPrice: getOptionalNumericInput("roomDiscountPriceInput"),
        taxPercent: getOptionalNumericInput("roomTaxPercentInput", {
          max: 100
        }),
        status: document.getElementById("roomStatusInput")?.value || "available",
        amenities: parseRoomListInput(document.getElementById("roomAmenitiesInput")?.value || ""),
        images: parseRoomListInput(document.getElementById("roomImagesInput")?.value || ""),
        description: document.getElementById("roomDescriptionInput")?.value.trim(),
        isActive: !!document.getElementById("roomIsActiveInput")?.checked
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating room...";
      }

      await createRoom(payload);
      if (help) help.textContent = "Room saved successfully.";
      alert("Room created successfully");

      resetRoomForm();

      if (state.activeTab === "rooms") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Room form submit failed:", error);
      if (help) help.textContent = error.message || "Failed to save room.";
      alert(error.message || "Failed to save room");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Room";
      }
    }
  });
}

const ROOM_BOOKING_CONFLICT_CODE = "ROOM_ALREADY_BOOKED";
const ROOM_BOOKING_CONFLICT_MESSAGE =
  "This room is already booked for selected dates. Please choose another room or date.";

function getAdminRoomBookingErrorMessage(error, fallback = "Failed to create manual booking.") {
  return error?.code === ROOM_BOOKING_CONFLICT_CODE
    ? ROOM_BOOKING_CONFLICT_MESSAGE
    : error?.message || fallback;
}

function syncAdminRoomAdvanceFields() {
  const option = document.getElementById("roomBookingAdvanceOptionInput")?.value || "no_advance";
  const amountField = document.getElementById("roomBookingAdvanceAmountField");
  const methodField = document.getElementById("roomBookingPaymentMethodField");
  const amountInput = document.getElementById("roomBookingAdvanceInput");
  const methodInput = document.getElementById("roomBookingPaymentMethodInput");
  const splitFields = [...document.querySelectorAll(".room-advance-split-field")];
  const summary = document.getElementById("roomBookingAdvanceSummary");
  const needsAmount = ["partial", "split"].includes(option);
  const needsMethod = option !== "no_advance";
  if (amountField) amountField.hidden = !needsAmount;
  if (methodField) methodField.hidden = !needsMethod;
  splitFields.forEach((field) => { field.hidden = option !== "split"; });
  if (amountInput) {
    amountInput.required = needsAmount;
    amountInput.disabled = !needsAmount;
    if (!needsAmount) amountInput.value = "";
  }
  if (methodInput) {
    methodInput.required = needsMethod;
    methodInput.disabled = !needsMethod;
    if (!needsMethod) methodInput.value = "";
  }
  if (summary) {
    summary.textContent = option === "no_advance"
      ? "No payment will be collected during booking creation."
      : option === "full"
        ? "The backend will collect the exact verified booking total."
        : option === "split"
          ? "Both method lines must be positive; the backend verifies their sum against the booking total."
          : "The backend will verify this partial amount against the booking total and hotel policy.";
  }
}

function getAdminRoomAdvancePayloadFromForm() {
  const option = document.getElementById("roomBookingAdvanceOptionInput")?.value || "no_advance";
  if (option === "no_advance") return { advanceOption: option };
  const paymentMethod = document.getElementById("roomBookingPaymentMethodInput")?.value || "";
  if (!paymentMethod) throw new Error("Select an advance payment method.");
  if (option === "full") return { advanceOption: option, paymentMethod };
  const amount = Number(document.getElementById("roomBookingAdvanceInput")?.value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an advance amount greater than zero.");
  }
  if (option === "partial") {
    return { advanceOption: option, advanceAmount: amount, paymentMethod };
  }
  const secondAmount = Number(document.getElementById("roomBookingSplitAmountInput")?.value || 0);
  const secondMethod = document.getElementById("roomBookingSplitMethodInput")?.value || "";
  if (!Number.isFinite(secondAmount) || secondAmount <= 0 || !secondMethod) {
    throw new Error("Enter a positive second amount and select its payment method.");
  }
  return {
    advanceOption: "split",
    advancePayments: [
      { amount, paymentMethod },
      { amount: secondAmount, paymentMethod: secondMethod }
    ]
  };
}

function bindRoomBookingForm() {
  const form = document.getElementById("roomBookingForm");
  if (!form) return;

  const hotelSlugInput = document.getElementById("roomBookingHotelSlugInput");
  const checkInInput = document.getElementById("roomBookingCheckInInput");
  const checkOutInput = document.getElementById("roomBookingCheckOutInput");
  const checkAvailabilityButton = document.getElementById("roomBookingCheckAvailabilityBtn");
  const advanceOptionInput = document.getElementById("roomBookingAdvanceOptionInput");
  if (advanceOptionInput && advanceOptionInput.dataset.boundAdvance !== "true") {
    advanceOptionInput.addEventListener("change", syncAdminRoomAdvanceFields);
    advanceOptionInput.dataset.boundAdvance = "true";
    syncAdminRoomAdvanceFields();
  }

  const formatDateInput = (date) => {
    const value = date instanceof Date ? date : new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (checkInInput && checkOutInput && checkInInput.dataset.boundCheckoutMin !== "true") {
    checkInInput.addEventListener("change", () => {
      if (!checkInInput.value) return;

      const checkInDate = new Date(`${checkInInput.value}T00:00:00`);
      checkInDate.setDate(checkInDate.getDate() + 1);
      const nextCheckout = formatDateInput(checkInDate);
      checkOutInput.min = nextCheckout;

      if (!checkOutInput.value || checkOutInput.value <= checkInInput.value) {
        checkOutInput.value = nextCheckout;
      }
    });
    checkInInput.dataset.boundCheckoutMin = "true";
  }

  if (hotelSlugInput && hotelSlugInput.dataset.boundRoomLoad !== "true") {
    hotelSlugInput.addEventListener("change", async () => {
      await loadRoomBookingRoomOptions();
      try {
        const result = await fetchAdminRoomAdvancePolicy(hotelSlugInput.value.trim());
        applyAdminRoomAdvancePaymentMethods(result?.policy || {});
      } catch (error) {
        console.error("Room advance policy load failed:", error);
        applyAdminRoomAdvancePaymentMethods({});
      }
    });
    hotelSlugInput.dataset.boundRoomLoad = "true";
  }

  if (checkAvailabilityButton && checkAvailabilityButton.dataset.boundClick !== "true") {
    checkAvailabilityButton.addEventListener("click", async () => {
      checkAvailabilityButton.disabled = true;
      checkAvailabilityButton.textContent = "Checking...";
      try {
        await loadRoomBookingAvailableRoomOptions();
      } finally {
        checkAvailabilityButton.disabled = false;
        checkAvailabilityButton.textContent = "Check Available Rooms";
      }
    });
    checkAvailabilityButton.dataset.boundClick = "true";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const help = document.getElementById("roomBookingFormHelp");

    try {
      const checkInDate =
        document.getElementById("roomBookingCheckInInput")?.value.trim() || "";
      const checkOutDate =
        document.getElementById("roomBookingCheckOutInput")?.value.trim() || "";

      if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
        throw new Error("Check-out date must be after check-in date.");
      }

      const payload = {
        hotelSlug: document.getElementById("roomBookingHotelSlugInput")?.value.trim(),
        roomId: getOptionalNumericInput("roomBookingRoomIdInput", {
          integer: true,
          min: 1
        }),
        guestName: document.getElementById("roomBookingGuestNameInput")?.value.trim(),
        guestPhone: document.getElementById("roomBookingGuestPhoneInput")?.value.trim(),
        guestEmail: document.getElementById("roomBookingGuestEmailInput")?.value.trim(),
        guestIdProof: document.getElementById("roomBookingGuestIdProofInput")?.value.trim(),
        checkInDate,
        checkOutDate,
        adults: getOptionalNumericInput("roomBookingAdultsInput", {
          integer: true,
          max: 100
        }),
        children: getOptionalNumericInput("roomBookingChildrenInput", {
          integer: true,
          max: 100
        }),
        ...getAdminRoomAdvancePayloadFromForm(),
        bookingStatus: document.getElementById("roomBookingStatusInput")?.value || "confirmed",
        bookingSource: document.getElementById("roomBookingSourceInput")?.value || "admin",
        notes: document.getElementById("roomBookingNotesInput")?.value.trim()
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          payload.advanceOption === "no_advance"
            ? "Creating booking..."
            : "Creating booking and recording advance...";
      }

      form.dataset.roomBookingIdempotencyKey =
        form.dataset.roomBookingIdempotencyKey ||
        (window.crypto?.randomUUID?.() || `room-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const result = await createAdminRoomBooking(payload, form.dataset.roomBookingIdempotencyKey);
      delete form.dataset.roomBookingIdempotencyKey;
      if (help) {
        const summary = result.summary;
        help.textContent = summary
          ? `Booking #${result.booking?.id || ""} created. Paid ${formatAdminMoney(summary.paidAmount)}; balance ${formatAdminMoney(summary.balance)}.`
          : `Booking #${result.booking?.id || ""} created. Amount and balance were calculated on the backend.`;
      }
      alert("Manual room booking created successfully");

      resetRoomBookingForm();

      if (state.activeTab === "rooms") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Manual room booking form submit failed:", error);
      const message = getAdminRoomBookingErrorMessage(error);
      if (help) help.textContent = message;
      alert(message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Create Manual Booking";
      }
    }
  });
}

function bindGalleryItemForm() {
  const form = document.getElementById("galleryItemForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("galleryItemDbId")?.value.trim();

    const payload = {
      hotelSlug: document.getElementById("galleryHotelSlugInput")?.value.trim(),
      imageUrl: document.getElementById("galleryImageUrlInput")?.value.trim(),
      storagePath: document.getElementById("galleryStoragePathInput")?.value.trim(),
      alt: document.getElementById("galleryAltInput")?.value.trim(),
      layoutVariant: document.getElementById("galleryLayoutVariantInput")?.value.trim() || "standard",
      sortOrder: Number(document.getElementById("gallerySortOrderInput")?.value || 0),
      isActive: !!document.getElementById("galleryIsActiveInput")?.checked
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = id ? "Updating gallery item..." : "Creating gallery item...";
      }

      if (id) {
        await updateGalleryItem(id, payload);
        alert("Gallery item updated successfully");
      } else {
        await createGalleryItem(payload);
        alert("Gallery item created successfully");
      }

      resetGalleryItemForm();

      if (state.activeTab === "gallery-items") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Gallery form submit failed:", error);
      alert(error.message || "Failed to save gallery item");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Gallery Item";
      }
    }
  });
}

function bindPopupNotificationForm() {
  const form = document.getElementById("popupNotificationForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validatePopupNotificationForm(form)) {
      return;
    }

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("popupNotificationDbId")?.value.trim();

    const payload = {
      hotelSlug: document.getElementById("popupNotificationHotelSlugInput")?.value.trim(),
      title: document.getElementById("popupNotificationTitleInput")?.value.trim(),
      description: document.getElementById("popupNotificationDescriptionInput")?.value.trim(),
      imageUrl: document.getElementById("popupNotificationImageUrlInput")?.value.trim(),
      storagePath: document.getElementById("popupNotificationStoragePathInput")?.value.trim(),
      ctaText: document.getElementById("popupNotificationCtaTextInput")?.value.trim(),
      ctaLink: document.getElementById("popupNotificationCtaLinkInput")?.value.trim(),
      displayMode: document.getElementById("popupNotificationDisplayModeInput")?.value.trim() || "once_per_session",
      priority: Number(document.getElementById("popupNotificationPriorityInput")?.value || 0),
      startAt: document.getElementById("popupNotificationStartAtInput")?.value.trim(),
      endAt: document.getElementById("popupNotificationEndAtInput")?.value.trim(),
      isActive: !!document.getElementById("popupNotificationIsActiveInput")?.checked
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = id
          ? "Updating popup notification..."
          : "Creating popup notification...";
      }

      if (id) {
        await updatePopupNotification(id, payload);
        alert("Popup notification updated successfully");
      } else {
        await createPopupNotification(payload);
        alert("Popup notification created successfully");
      }

      resetPopupNotificationForm();

      if (state.activeTab === "popup-notifications") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Popup notification form submit failed:", error);
      alert(error.message || "Failed to save popup notification");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Popup Notification";
      }
    }
  });
}

function bindTestimonialForm() {
  const form = document.getElementById("testimonialForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const id = document.getElementById("testimonialDbId")?.value.trim();

    const payload = {
      hotelSlug: document.getElementById("testimonialHotelSlugInput")?.value.trim(),
      name: document.getElementById("testimonialNameInput")?.value.trim(),
      role: document.getElementById("testimonialRoleInput")?.value.trim(),
      text: document.getElementById("testimonialTextInput")?.value.trim(),
      stars: Number(document.getElementById("testimonialStarsInput")?.value || 5),
      avatar: document.getElementById("testimonialAvatarInput")?.value.trim(),
      sortOrder: Number(document.getElementById("testimonialSortOrderInput")?.value || 0),
      isActive: !!document.getElementById("testimonialIsActiveInput")?.checked,
      isApproved: !!document.getElementById("testimonialIsApprovedInput")?.checked
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = id
          ? "Updating testimonial..."
          : "Creating testimonial...";
      }

      if (id) {
        await updateTestimonial(id, payload);
        alert("Testimonial updated successfully");
      } else {
        await createTestimonial(payload);
        alert("Testimonial created successfully");
      }

      resetTestimonialForm();

      if (state.activeTab === "testimonials") {
        await loadTabData();
      }
    } catch (error) {
      console.error("Testimonial form submit failed:", error);
      alert(error.message || "Failed to save testimonial");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Testimonial";
      }
    }
  });
}

async function fetchHotelProfile(slug) {
  return fetchJson(`${API_BASE}/hotel-profiles/${encodeURIComponent(slug)}`);
}

async function fetchNotificationSettings(slug) {
  return fetchJson(
    `${API_BASE}/notification-settings/${encodeURIComponent(slug)}`
  );
}

async function fetchOrderingSettings(slug) {
  return fetchJson(
    `${API_BASE}/ordering-settings/${encodeURIComponent(slug)}`
  );
}

async function fetchRoomFeatureSettings(slug) {
  return fetchJson(
    `${API_BASE}/room-booking/feature-settings/${encodeURIComponent(slug)}`
  );
}

async function fetchPaymentRouteSettings(slug) {
  return fetchJson(
    `${API_BASE}/payment-route-settings/${encodeURIComponent(slug)}`
  );
}

async function saveHotelProfile(payload) {
  return fetchJson(`${API_BASE}/hotel-profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function saveNotificationSettings(payload) {
  return fetchJson(`${API_BASE}/notification-settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function saveOrderingSettings(payload) {
  return fetchJson(`${API_BASE}/ordering-settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function saveRoomFeatureSettings(payload) {
  return fetchJson(`${API_BASE}/room-booking/feature-settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function savePaymentRouteSettings(payload) {
  return fetchJson(`${API_BASE}/payment-route-settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function parseJsonInput(value, fallback) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return fallback;

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error("Invalid JSON input");
  }
}

function parseJsonArrayInput(value, fallback, label) {
  const parsedValue = parseJsonInput(value, fallback);

  if (!Array.isArray(parsedValue)) {
    throw new Error(`${label} must be a JSON array.`);
  }

  return parsedValue;
}

function formatJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function cloneThemeValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value));
}

function getCurrentProfileHeroBase() {
  const currentHotelSlug = document.getElementById("profileHotelSlugInput")?.value.trim() || "";

  if (currentHotelSlug && currentHotelSlug === state.profileHeroHotelSlug) {
    return cloneThemeValue(state.profileHeroBase);
  }

  return {};
}

function getTrimmedInputValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (!input) return;

  input.value = value || "";
}

function parseLineSeparatedInput(value, { maxItems = 6, maxLength = 120 } = {}) {
  const seen = new Set();

  return String(value || "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((items, entry) => {
      if (items.length >= maxItems) {
        return items;
      }

      const candidate = entry.slice(0, maxLength);
      const normalizedKey = candidate.toLowerCase();

      if (!candidate || seen.has(normalizedKey)) {
        return items;
      }

      seen.add(normalizedKey);
      items.push(candidate);
      return items;
    }, []);
}

function getValidProfileHeroScenePreset(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_HERO_SCENE_PRESETS[candidate] ? candidate : "";
}

function getValidProfileHeroSceneTemplate(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_HERO_SCENE_TEMPLATES[candidate] ? candidate : "";
}

function getValidProfileHeroSceneModelPreset(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_HERO_SCENE_MODEL_PRESETS[candidate] ? candidate : "";
}

function getOptionalNumberInputValue(id, label) {
  const rawValue = getTrimmedInputValue(id);

  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return parsedValue;
}

function getOptionalPercentageInputValue(id, label) {
  const parsedValue = getOptionalNumberInputValue(id, label);

  if (parsedValue === null) {
    return null;
  }

  if (parsedValue < 0 || parsedValue > 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }

  return parsedValue;
}

function getCurrentProfileThemeBase() {
  const currentHotelSlug = document.getElementById("profileHotelSlugInput")?.value.trim() || "";

  if (currentHotelSlug && currentHotelSlug === state.profileThemeHotelSlug) {
    return cloneThemeValue(state.profileThemeBase);
  }

  return {};
}

function validateCssColorValue(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return true;

  if (window.CSS && typeof window.CSS.supports === "function") {
    return window.CSS.supports("color", candidate);
  }

  return true;
}

function validateCssRadiusValue(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return true;

  if (window.CSS && typeof window.CSS.supports === "function") {
    return window.CSS.supports("border-radius", candidate);
  }

  return true;
}

function getValidProfileThemeTypographyPreset(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_THEME_FONT_PRESETS[candidate] ? candidate : "";
}

function getSelectedProfileThemeTypographyPreset() {
  return getValidProfileThemeTypographyPreset(
    document.getElementById("profileThemeTypographyPresetInput")?.value
  );
}

function getValidProfileThemeContainerPreset(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_THEME_CONTAINER_PRESETS[candidate] ? candidate : "";
}

function getSelectedProfileThemeContainerPreset() {
  return getValidProfileThemeContainerPreset(
    document.getElementById("profileThemeContainerPresetInput")?.value
  );
}

function getValidProfileThemeButtonPreset(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_THEME_BUTTON_PRESETS[candidate] ? candidate : "";
}

function getSelectedProfileThemeButtonPreset() {
  return getValidProfileThemeButtonPreset(
    document.getElementById("profileThemeButtonPresetInput")?.value
  );
}

function getValidProfileThemeHeroLayoutPreset(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return PROFILE_THEME_HERO_LAYOUT_PRESETS[candidate] ? candidate : "";
}

function getSelectedProfileThemeHeroLayoutPreset() {
  return getValidProfileThemeHeroLayoutPreset(
    document.getElementById("profileThemeHeroLayoutPresetInput")?.value
  );
}

function normalizeProfileThemeSectionOrder(order) {
  if (!Array.isArray(order)) return [];

  const seen = new Set();

  return order.reduce((nextOrder, value) => {
    const candidate = String(value || "").trim().toLowerCase();

    if (!PROFILE_THEME_SECTION_ORDER.includes(candidate) || seen.has(candidate)) {
      return nextOrder;
    }

    seen.add(candidate);
    nextOrder.push(candidate);
    return nextOrder;
  }, []);
}

function areThemeSectionOrdersEqual(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function getEffectiveProfileThemeSectionOrder(theme) {
  const savedOrder = normalizeProfileThemeSectionOrder(theme?.sections?.order);

  return [
    ...savedOrder,
    ...PROFILE_THEME_SECTION_ORDER.filter((sectionId) => !savedOrder.includes(sectionId))
  ];
}

function getProfileThemeSectionVisibilityMap() {
  return {
    about: Boolean(document.getElementById("profileThemeShowAboutInput")?.checked),
    menu: true,
    reservation: Boolean(document.getElementById("profileThemeShowReservationInput")?.checked),
    events: Boolean(document.getElementById("profileThemeShowEventsInput")?.checked),
    gallery: Boolean(document.getElementById("profileThemeShowGalleryInput")?.checked),
    testimonials: Boolean(document.getElementById("profileThemeShowTestimonialsInput")?.checked),
    contact: true
  };
}

function syncProfileThemeSectionOrderList() {
  const list = document.getElementById("profileThemeSectionOrderList");
  if (!list) return;

  const items = [...list.querySelectorAll("[data-theme-section-id]")];

  items.forEach((item, index) => {
    const indexEl = item.querySelector("[data-theme-order-index]");
    const upBtn = item.querySelector('[data-move-theme-section="up"]');
    const downBtn = item.querySelector('[data-move-theme-section="down"]');

    if (indexEl) {
      indexEl.textContent = String(index + 1);
    }

    if (upBtn) {
      upBtn.disabled = index === 0;
    }

    if (downBtn) {
      downBtn.disabled = index === items.length - 1;
    }
  });
}

function syncProfileThemeSectionOrderStates() {
  const list = document.getElementById("profileThemeSectionOrderList");
  if (!list) return;

  const visibilityMap = getProfileThemeSectionVisibilityMap();

  [...list.querySelectorAll("[data-theme-section-id]")].forEach((item) => {
    const sectionId = item.dataset.themeSectionId || "";
    const stateEl = item.querySelector("[data-theme-order-state]");

    if (!stateEl) return;

    const isVisible = visibilityMap[sectionId] !== false;

    stateEl.textContent = isVisible ? "Visible" : "Hidden";
    stateEl.classList.toggle("is-hidden", !isVisible);
    item.setAttribute("data-theme-section-hidden", isVisible ? "false" : "true");
  });
}

function renderProfileThemeSectionOrder(order) {
  const list = document.getElementById("profileThemeSectionOrderList");
  if (!list) return;

  const effectiveOrder = normalizeProfileThemeSectionOrder(order);
  const orderedSections = effectiveOrder.length
    ? effectiveOrder
    : [...PROFILE_THEME_SECTION_ORDER];

  list.innerHTML = orderedSections
    .map(
      (sectionId, index) => `
        <div class="theme-order-item" data-theme-section-id="${escapeHTML(sectionId)}">
          <div class="theme-order-label">
            <span class="theme-order-index" data-theme-order-index>${index + 1}</span>
            <div class="theme-order-meta">
              <span class="theme-order-name">${escapeHTML(
                PROFILE_THEME_SECTION_LABELS[sectionId] || sectionId
              )}</span>
              <span class="theme-order-state" data-theme-order-state>Visible</span>
            </div>
          </div>
          <div class="theme-order-actions">
            <button
              type="button"
              class="admin-tab"
              data-move-theme-section="up"
              aria-label="Move ${escapeHTML(
                PROFILE_THEME_SECTION_LABELS[sectionId] || sectionId
              )} up"
            >
              Up
            </button>
            <button
              type="button"
              class="admin-tab"
              data-move-theme-section="down"
              aria-label="Move ${escapeHTML(
                PROFILE_THEME_SECTION_LABELS[sectionId] || sectionId
              )} down"
            >
              Down
            </button>
          </div>
        </div>
      `
    )
    .join("");

  syncProfileThemeSectionOrderList();
  syncProfileThemeSectionOrderStates();
}

function getCurrentProfileThemeSectionOrder() {
  const list = document.getElementById("profileThemeSectionOrderList");
  if (!list) {
    return [...PROFILE_THEME_SECTION_ORDER];
  }

  return normalizeProfileThemeSectionOrder(
    [...list.querySelectorAll("[data-theme-section-id]")].map(
      (item) => item.dataset.themeSectionId || ""
    )
  );
}

function syncProfileThemeSectionOrderDirtyState() {
  const loadedOrder = getEffectiveProfileThemeSectionOrder(getCurrentProfileThemeBase());
  const currentOrder = getCurrentProfileThemeSectionOrder();

  state.profileThemeSectionOrderDirty = !areThemeSectionOrdersEqual(currentOrder, loadedOrder);
}

function moveProfileThemeSectionOrder(button) {
  const list = document.getElementById("profileThemeSectionOrderList");
  const item = button?.closest("[data-theme-section-id]");
  const direction = button?.dataset.moveThemeSection;

  if (!list || !item || !direction) return;

  if (direction === "up") {
    const previousItem = item.previousElementSibling;
    if (!previousItem) return;
    list.insertBefore(item, previousItem);
  } else if (direction === "down") {
    const nextItem = item.nextElementSibling;
    if (!nextItem) return;
    list.insertBefore(nextItem, item);
  } else {
    return;
  }

  syncProfileThemeSectionOrderList();
  syncProfileThemeSectionOrderStates();
  syncProfileThemeSectionOrderDirtyState();
}

function validateProfileThemeInputs(form) {
  const fields = [
    {
      id: "profileThemePrimaryInput",
      label: "Primary accent color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemePrimaryLightInput",
      label: "Primary light color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemePrimaryDarkInput",
      label: "Primary dark color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeBackgroundInput",
      label: "Background color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeBackgroundAltInput",
      label: "Alternate background color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeTextInput",
      label: "Text color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeTextMutedInput",
      label: "Muted text color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeLoadingBackgroundColorInput",
      label: "Loader background color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeLoadingAccentColorInput",
      label: "Loader accent color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeLoadingTextColorInput",
      label: "Loader text color",
      isValid: validateCssColorValue
    },
    {
      id: "profileThemeRadiusBaseInput",
      label: "Base radius",
      isValid: validateCssRadiusValue
    },
    {
      id: "profileThemeRadiusSmallInput",
      label: "Small radius",
      isValid: validateCssRadiusValue
    }
  ];

  let firstInvalidInput = null;

  fields.forEach(({ id, label, isValid }) => {
    const input = form.querySelector(`#${id}`);
    if (!input) return;

    input.setCustomValidity("");

    const value = input.value.trim();
    if (!value || isValid(value)) return;

    input.setCustomValidity(
      `${label} must be a valid CSS ${id.includes("Radius") ? "border-radius" : "color"} value.`
    );

    if (!firstInvalidInput) {
      firstInvalidInput = input;
    }
  });

  if (firstInvalidInput) {
    firstInvalidInput.reportValidity();
    firstInvalidInput.focus();
    return false;
  }

  return true;
}

function fillProfileThemeFields(theme) {
  const safeTheme = cloneThemeValue(theme);
  const colors =
    safeTheme.colors && typeof safeTheme.colors === "object" && !Array.isArray(safeTheme.colors)
      ? safeTheme.colors
      : {};
  const radius =
    safeTheme.radius && typeof safeTheme.radius === "object" && !Array.isArray(safeTheme.radius)
      ? safeTheme.radius
      : {};
  const typography =
    safeTheme.typography &&
    typeof safeTheme.typography === "object" &&
    !Array.isArray(safeTheme.typography)
      ? safeTheme.typography
      : {};
  const layout =
    safeTheme.layout &&
    typeof safeTheme.layout === "object" &&
    !Array.isArray(safeTheme.layout)
      ? safeTheme.layout
      : {};
  const buttons =
    safeTheme.buttons &&
    typeof safeTheme.buttons === "object" &&
    !Array.isArray(safeTheme.buttons)
      ? safeTheme.buttons
      : {};
  const hero =
    safeTheme.hero && typeof safeTheme.hero === "object" && !Array.isArray(safeTheme.hero)
      ? safeTheme.hero
      : {};
  const loadingScreen =
    safeTheme.loadingScreen &&
    typeof safeTheme.loadingScreen === "object" &&
    !Array.isArray(safeTheme.loadingScreen)
      ? safeTheme.loadingScreen
      : {};
  const payment =
    safeTheme.payment && typeof safeTheme.payment === "object" && !Array.isArray(safeTheme.payment)
      ? safeTheme.payment
      : {};
  const aiAssistant =
    safeTheme.aiAssistant &&
    typeof safeTheme.aiAssistant === "object" &&
    !Array.isArray(safeTheme.aiAssistant)
      ? safeTheme.aiAssistant
      : {};
  const content =
    safeTheme.content && typeof safeTheme.content === "object" && !Array.isArray(safeTheme.content)
      ? safeTheme.content
      : {};
  const navLabels =
    content.navLabels && typeof content.navLabels === "object" && !Array.isArray(content.navLabels)
      ? content.navLabels
      : {};
  const menuSection =
    content.menuSection &&
    typeof content.menuSection === "object" &&
    !Array.isArray(content.menuSection)
      ? content.menuSection
      : {};
  const menuCategories =
    content.menuCategories &&
    typeof content.menuCategories === "object" &&
    !Array.isArray(content.menuCategories)
      ? content.menuCategories
      : {};
  const ctaLabels =
    content.ctaLabels && typeof content.ctaLabels === "object" && !Array.isArray(content.ctaLabels)
      ? content.ctaLabels
      : {};
  const footerLabels =
    content.footerLabels &&
    typeof content.footerLabels === "object" &&
    !Array.isArray(content.footerLabels)
      ? content.footerLabels
      : {};
  const sections =
    safeTheme.sections &&
    typeof safeTheme.sections === "object" &&
    !Array.isArray(safeTheme.sections)
      ? safeTheme.sections
      : {};

  document.getElementById("profileThemePrimaryInput").value = colors.primary || "";
  document.getElementById("profileThemePrimaryLightInput").value = colors.primaryLight || "";
  document.getElementById("profileThemePrimaryDarkInput").value = colors.primaryDark || "";
  document.getElementById("profileThemeBackgroundInput").value = colors.background || "";
  document.getElementById("profileThemeBackgroundAltInput").value = colors.backgroundAlt || "";
  document.getElementById("profileThemeTextInput").value = colors.text || "";
  document.getElementById("profileThemeTextMutedInput").value = colors.textMuted || "";
  document.getElementById("profileThemeRadiusBaseInput").value = radius.base || "";
  document.getElementById("profileThemeRadiusSmallInput").value = radius.small || "";
  document.getElementById("profileThemeLoadingLogoPrimaryInput").value =
    loadingScreen.logoPrimaryText || "";
  document.getElementById("profileThemeLoadingLogoSecondaryInput").value =
    loadingScreen.logoSecondaryText || "";
  document.getElementById("profileThemeLoadingTaglineInput").value =
    loadingScreen.tagline || "";
  document.getElementById("profileThemeLoadingBackgroundColorInput").value =
    loadingScreen.backgroundColor || "";
  document.getElementById("profileThemeLoadingAccentColorInput").value =
    loadingScreen.accentColor || "";
  document.getElementById("profileThemeLoadingTextColorInput").value =
    loadingScreen.textColor || "";
  document.getElementById("profileThemeAiAssistantEnabledInput").checked =
    aiAssistant.enabled !== false;
  document.getElementById("profileThemeAiAssistantTitleInput").value =
    aiAssistant.title || "";
  document.getElementById("profileThemeAiAssistantIntroInput").value =
    aiAssistant.intro || "";
  document.getElementById("profileThemeAiAssistantToneInput").value =
    ["default", "friendly", "formal"].includes(aiAssistant.tone)
      ? aiAssistant.tone
      : "default";
  setInputValue(
    "profileThemeAiAssistantExamplePromptInput",
    aiAssistant.examplePrompt || ""
  );
  setInputValue(
    "profileThemeAiAssistantPromptsInput",
    Array.isArray(aiAssistant.starterPrompts) ? aiAssistant.starterPrompts.join("\n") : ""
  );
  document.getElementById("profileUpiDiscountPercentInput").value =
    payment.upiDiscountPercent ?? "";
  document.getElementById("profileDeliveryChargeInput").value =
    payment.deliveryCharge ?? "";
  setInputValue("profileNavLabelAboutInput", navLabels.about);
  setInputValue("profileNavLabelMenuInput", navLabels.menu);
  setInputValue("profileNavLabelGalleryInput", navLabels.gallery);
  setInputValue("profileNavLabelEventsInput", navLabels.events);
  setInputValue("profileNavLabelTestimonialsInput", navLabels.testimonials);
  setInputValue("profileNavLabelContactInput", navLabels.contact);
  setInputValue("profileNavLabelReservationInput", navLabels.reservation);
  setInputValue("profileMenuSectionEyebrowInput", menuSection.eyebrow);
  setInputValue("profileMenuSectionTitleInput", menuSection.title);
  setInputValue("profileMenuSectionSubtitleInput", menuSection.subtitle);
  setInputValue("profileMenuViewFullLabelInput", menuSection.viewFullMenu);
  setInputValue("profileFullMenuSectionEyebrowInput", menuSection.fullEyebrow);
  setInputValue("profileFullMenuSectionTitleInput", menuSection.fullTitle);
  setInputValue("profileFullMenuSectionSubtitleInput", menuSection.fullSubtitle);
  setInputValue("profileMenuCategoryStartersInput", menuCategories.starters);
  setInputValue("profileMenuCategoryMainsInput", menuCategories.mains);
  setInputValue("profileMenuCategoryDessertsInput", menuCategories.desserts);
  setInputValue("profileMenuCategoryDrinksInput", menuCategories.drinks);
  setInputValue("profileCtaHeroPrimaryInput", ctaLabels.heroPrimary);
  setInputValue("profileCtaHeroReservationInput", ctaLabels.heroReservation);
  setInputValue("profileCtaAboutReservationInput", ctaLabels.aboutReservation);
  setInputValue("profileCtaCartButtonInput", ctaLabels.cartButton);
  setInputValue("profileCtaMenuScrollHintInput", ctaLabels.menuScrollHint);
  setInputValue("profileCtaLoadMoreInput", ctaLabels.loadMore);
  setInputValue("profileCtaLoadMoreHintInput", ctaLabels.loadMoreHint);
  setInputValue("profileFooterLabelExploreHeadingInput", footerLabels.exploreHeading);
  setInputValue("profileFooterLabelAboutInput", footerLabels.about);
  setInputValue("profileFooterLabelMenuInput", footerLabels.menu);
  setInputValue("profileFooterLabelGalleryInput", footerLabels.gallery);
  setInputValue("profileFooterLabelEventsInput", footerLabels.events);
  setInputValue("profileFooterLabelReviewsInput", footerLabels.reviews);
  setInputValue("profileFooterLabelReservationsHeadingInput", footerLabels.reservationsHeading);
  setInputValue("profileFooterLabelBookTableInput", footerLabels.bookTable);
  setInputValue("profileFooterLabelPrivateDiningInput", footerLabels.privateDining);
  setInputValue("profileFooterLabelContactInput", footerLabels.contact);
  setInputValue("profileFooterLabelOpeningHoursHeadingInput", footerLabels.openingHoursHeading);
  setInputValue("profileFooterLabelFindUsHeadingInput", footerLabels.findUsHeading);
  setInputValue("profileFooterLabelCopyrightSuffixInput", footerLabels.copyrightSuffix);
  document.getElementById("profileThemeTypographyPresetInput").value =
    getValidProfileThemeTypographyPreset(typography.preset);
  document.getElementById("profileThemeContainerPresetInput").value =
    getValidProfileThemeContainerPreset(layout.containerPreset);
  document.getElementById("profileThemeButtonPresetInput").value =
    getValidProfileThemeButtonPreset(buttons.preset);
  document.getElementById("profileThemeHeroLayoutPresetInput").value =
    getValidProfileThemeHeroLayoutPreset(hero.layoutVariant);
  document.getElementById("profileThemeShowAboutInput").checked = sections.about !== false;
  document.getElementById("profileThemeShowEventsInput").checked = sections.events !== false;
  document.getElementById("profileThemeShowReservationInput").checked =
    sections.reservation !== false;
  document.getElementById("profileThemeShowGalleryInput").checked = sections.gallery !== false;
  document.getElementById("profileThemeShowTestimonialsInput").checked =
    sections.testimonials !== false;
  renderProfileThemeSectionOrder(getEffectiveProfileThemeSectionOrder(safeTheme));
  syncProfileThemeSectionOrderDirtyState();
}

function getThemePreviewColorValue(inputId, baseValue, defaultValue) {
  const currentValue = getTrimmedInputValue(inputId);
  if (currentValue && validateCssColorValue(currentValue)) {
    return currentValue;
  }

  return baseValue || defaultValue;
}

function getThemePreviewRadiusValue(inputId, baseValue, defaultValue) {
  const currentValue = getTrimmedInputValue(inputId);
  if (currentValue && validateCssRadiusValue(currentValue)) {
    return currentValue;
  }

  return baseValue || defaultValue;
}

function getThemePreviewFontPreset(baseTheme) {
  const selectedPreset = getSelectedProfileThemeTypographyPreset();
  if (selectedPreset) {
    return PROFILE_THEME_FONT_PRESETS[selectedPreset];
  }

  const basePreset = getValidProfileThemeTypographyPreset(baseTheme?.typography?.preset);
  return PROFILE_THEME_FONT_PRESETS[basePreset] || PROFILE_THEME_FONT_PRESETS.default;
}

function getThemePreviewButtonPreset(baseTheme) {
  const selectedPreset = getSelectedProfileThemeButtonPreset();
  if (selectedPreset) return selectedPreset;

  const basePreset = getValidProfileThemeButtonPreset(baseTheme?.buttons?.preset);
  return basePreset || "default";
}

function getThemePreviewHeroLayoutPreset(baseTheme) {
  const selectedPreset = getSelectedProfileThemeHeroLayoutPreset();
  if (selectedPreset) return selectedPreset;

  const basePreset = getValidProfileThemeHeroLayoutPreset(baseTheme?.hero?.layoutVariant);
  return basePreset || "default";
}

function getThemePreviewButtonStyles(presetKey, colors) {
  if (presetKey === "solid") {
    return {
      radius: "14px",
      primaryBackground: colors.primary,
      primaryBorder: `1px solid ${colors.primaryDark}`,
      primaryShadow: "0 4px 16px rgba(201, 168, 76, 0.28)",
      outlineBorder: `1px solid ${colors.primary}`,
      outlineBackground: "transparent"
    };
  }

  if (presetKey === "crisp") {
    return {
      radius: "8px",
      primaryBackground: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
      primaryBorder: `1px solid ${colors.primaryDark}`,
      primaryShadow: "0 4px 18px rgba(160, 120, 48, 0.28)",
      outlineBorder: "1.5px solid rgba(255, 255, 255, 0.75)",
      outlineBackground: "transparent"
    };
  }

  return {
    radius: "100px",
    primaryBackground: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.primary})`,
    primaryBorder: "1px solid transparent",
    primaryShadow: "0 4px 20px rgba(201, 168, 76, 0.35)",
    outlineBorder: "1.5px solid rgba(255, 255, 255, 0.6)",
    outlineBackground: "transparent"
  };
}

function updateProfileThemePreview() {
  const previewCard = document.getElementById("profileThemePreviewCard");
  const previewTop = document.getElementById("profileThemePreviewTop");
  const previewSurface = document.getElementById("profileThemePreviewSurface");
  const previewEyebrow = document.getElementById("profileThemePreviewEyebrow");
  const previewTitle = document.getElementById("profileThemePreviewTitle");
  const previewBody = document.getElementById("profileThemePreviewBody");
  const previewMuted = document.getElementById("profileThemePreviewMuted");
  const previewOutlineBtn = document.getElementById("profileThemePreviewOutlineBtn");
  const previewPrimaryBtn = document.getElementById("profileThemePreviewPrimaryBtn");
  const previewChip = document.getElementById("profileThemePreviewChip");

  if (
    !previewCard ||
    !previewTop ||
    !previewSurface ||
    !previewEyebrow ||
    !previewTitle ||
    !previewBody ||
    !previewMuted ||
    !previewOutlineBtn ||
    !previewPrimaryBtn ||
    !previewChip
  ) {
    return;
  }

  const baseTheme = getCurrentProfileThemeBase();
  const baseColors =
    baseTheme.colors && typeof baseTheme.colors === "object" && !Array.isArray(baseTheme.colors)
      ? baseTheme.colors
      : {};
  const baseRadius =
    baseTheme.radius && typeof baseTheme.radius === "object" && !Array.isArray(baseTheme.radius)
      ? baseTheme.radius
      : {};
  const fontPreset = getThemePreviewFontPreset(baseTheme);
  const buttonPresetKey = getThemePreviewButtonPreset(baseTheme);
  const heroLayoutPresetKey = getThemePreviewHeroLayoutPreset(baseTheme);

  const colors = {
    primary: getThemePreviewColorValue(
      "profileThemePrimaryInput",
      baseColors.primary,
      PROFILE_THEME_DEFAULTS.colors.primary
    ),
    primaryLight: getThemePreviewColorValue(
      "profileThemePrimaryLightInput",
      baseColors.primaryLight,
      PROFILE_THEME_DEFAULTS.colors.primaryLight
    ),
    primaryDark: getThemePreviewColorValue(
      "profileThemePrimaryDarkInput",
      baseColors.primaryDark,
      PROFILE_THEME_DEFAULTS.colors.primaryDark
    ),
    background: getThemePreviewColorValue(
      "profileThemeBackgroundInput",
      baseColors.background,
      PROFILE_THEME_DEFAULTS.colors.background
    ),
    backgroundAlt: getThemePreviewColorValue(
      "profileThemeBackgroundAltInput",
      baseColors.backgroundAlt,
      PROFILE_THEME_DEFAULTS.colors.backgroundAlt
    ),
    text: getThemePreviewColorValue(
      "profileThemeTextInput",
      baseColors.text,
      PROFILE_THEME_DEFAULTS.colors.text
    ),
    textMuted: getThemePreviewColorValue(
      "profileThemeTextMutedInput",
      baseColors.textMuted,
      PROFILE_THEME_DEFAULTS.colors.textMuted
    )
  };
  const radius = {
    base: getThemePreviewRadiusValue(
      "profileThemeRadiusBaseInput",
      baseRadius.base,
      PROFILE_THEME_DEFAULTS.radius.base
    ),
    small: getThemePreviewRadiusValue(
      "profileThemeRadiusSmallInput",
      baseRadius.small,
      PROFILE_THEME_DEFAULTS.radius.small
    )
  };
  const buttonStyles = getThemePreviewButtonStyles(buttonPresetKey, colors);

  previewCard.style.background = colors.backgroundAlt;
  previewCard.style.borderColor = colors.primaryDark;
  previewCard.style.borderRadius = radius.base;

  previewTop.style.background = colors.background;
  previewTop.style.borderColor = colors.primaryDark;
  previewTop.style.borderRadius = radius.base;

  previewSurface.style.background = colors.background;
  previewSurface.style.borderColor = colors.primaryDark;
  previewSurface.style.borderRadius = radius.base;

  previewEyebrow.style.color = colors.primary;
  previewEyebrow.style.fontFamily = fontPreset.body;
  previewTitle.style.color = colors.text;
  previewTitle.style.fontFamily = fontPreset.display;
  previewBody.style.color = colors.text;
  previewBody.style.fontFamily = fontPreset.body;
  previewMuted.style.color = colors.textMuted;
  previewMuted.style.fontFamily = fontPreset.body;

  previewOutlineBtn.style.borderColor = colors.primary;
  previewOutlineBtn.style.color = colors.primary;
  previewOutlineBtn.style.border = buttonStyles.outlineBorder;
  previewOutlineBtn.style.background = buttonStyles.outlineBackground;
  previewOutlineBtn.style.borderRadius = buttonStyles.radius;
  previewOutlineBtn.style.fontFamily = fontPreset.body;
  previewOutlineBtn.style.boxShadow = "none";

  previewPrimaryBtn.style.background = buttonStyles.primaryBackground;
  previewPrimaryBtn.style.color = "#ffffff";
  previewPrimaryBtn.style.border = buttonStyles.primaryBorder;
  previewPrimaryBtn.style.borderRadius = buttonStyles.radius;
  previewPrimaryBtn.style.fontFamily = fontPreset.body;
  previewPrimaryBtn.style.boxShadow = buttonStyles.primaryShadow;

  previewChip.style.background = colors.primaryLight;
  previewChip.style.color = colors.text;
  previewChip.style.borderColor = colors.primary;
  previewChip.style.borderRadius = radius.small;
  previewChip.style.fontFamily = fontPreset.body;
  previewChip.textContent = `Hero: ${
    PROFILE_THEME_HERO_LAYOUT_LABELS[heroLayoutPresetKey] || "Default"
  }`;
}

function buildProfileThemePayload(currentHotelSlug) {
  const baseTheme = currentHotelSlug ? getCurrentProfileThemeBase() : {};

  const nextTheme = cloneThemeValue(baseTheme);
  const colorValues = {
    primary: getTrimmedInputValue("profileThemePrimaryInput"),
    primaryLight: getTrimmedInputValue("profileThemePrimaryLightInput"),
    primaryDark: getTrimmedInputValue("profileThemePrimaryDarkInput"),
    background: getTrimmedInputValue("profileThemeBackgroundInput"),
    backgroundAlt: getTrimmedInputValue("profileThemeBackgroundAltInput"),
    text: getTrimmedInputValue("profileThemeTextInput"),
    textMuted: getTrimmedInputValue("profileThemeTextMutedInput")
  };
  const radiusValues = {
    base: getTrimmedInputValue("profileThemeRadiusBaseInput"),
    small: getTrimmedInputValue("profileThemeRadiusSmallInput")
  };
  const loadingScreenValues = {
    logoPrimaryText: getTrimmedInputValue("profileThemeLoadingLogoPrimaryInput"),
    logoSecondaryText: getTrimmedInputValue("profileThemeLoadingLogoSecondaryInput"),
    tagline: getTrimmedInputValue("profileThemeLoadingTaglineInput"),
    backgroundColor: getTrimmedInputValue("profileThemeLoadingBackgroundColorInput"),
    accentColor: getTrimmedInputValue("profileThemeLoadingAccentColorInput"),
    textColor: getTrimmedInputValue("profileThemeLoadingTextColorInput")
  };
  const navLabelValues = {
    about: getTrimmedInputValue("profileNavLabelAboutInput"),
    menu: getTrimmedInputValue("profileNavLabelMenuInput"),
    gallery: getTrimmedInputValue("profileNavLabelGalleryInput"),
    events: getTrimmedInputValue("profileNavLabelEventsInput"),
    testimonials: getTrimmedInputValue("profileNavLabelTestimonialsInput"),
    contact: getTrimmedInputValue("profileNavLabelContactInput"),
    reservation: getTrimmedInputValue("profileNavLabelReservationInput")
  };
  const menuSectionValues = {
    eyebrow: getTrimmedInputValue("profileMenuSectionEyebrowInput"),
    title: getTrimmedInputValue("profileMenuSectionTitleInput"),
    subtitle: getTrimmedInputValue("profileMenuSectionSubtitleInput"),
    viewFullMenu: getTrimmedInputValue("profileMenuViewFullLabelInput"),
    fullEyebrow: getTrimmedInputValue("profileFullMenuSectionEyebrowInput"),
    fullTitle: getTrimmedInputValue("profileFullMenuSectionTitleInput"),
    fullSubtitle: getTrimmedInputValue("profileFullMenuSectionSubtitleInput")
  };
  const menuCategoryValues = {
    starters: getTrimmedInputValue("profileMenuCategoryStartersInput"),
    mains: getTrimmedInputValue("profileMenuCategoryMainsInput"),
    desserts: getTrimmedInputValue("profileMenuCategoryDessertsInput"),
    drinks: getTrimmedInputValue("profileMenuCategoryDrinksInput")
  };
  const ctaLabelValues = {
    heroPrimary: getTrimmedInputValue("profileCtaHeroPrimaryInput"),
    heroReservation: getTrimmedInputValue("profileCtaHeroReservationInput"),
    aboutReservation: getTrimmedInputValue("profileCtaAboutReservationInput"),
    cartButton: getTrimmedInputValue("profileCtaCartButtonInput"),
    menuScrollHint: getTrimmedInputValue("profileCtaMenuScrollHintInput"),
    loadMore: getTrimmedInputValue("profileCtaLoadMoreInput"),
    loadMoreHint: getTrimmedInputValue("profileCtaLoadMoreHintInput")
  };
  const footerLabelValues = {
    exploreHeading: getTrimmedInputValue("profileFooterLabelExploreHeadingInput"),
    about: getTrimmedInputValue("profileFooterLabelAboutInput"),
    menu: getTrimmedInputValue("profileFooterLabelMenuInput"),
    gallery: getTrimmedInputValue("profileFooterLabelGalleryInput"),
    events: getTrimmedInputValue("profileFooterLabelEventsInput"),
    reviews: getTrimmedInputValue("profileFooterLabelReviewsInput"),
    reservationsHeading: getTrimmedInputValue("profileFooterLabelReservationsHeadingInput"),
    bookTable: getTrimmedInputValue("profileFooterLabelBookTableInput"),
    privateDining: getTrimmedInputValue("profileFooterLabelPrivateDiningInput"),
    contact: getTrimmedInputValue("profileFooterLabelContactInput"),
    openingHoursHeading: getTrimmedInputValue("profileFooterLabelOpeningHoursHeadingInput"),
    findUsHeading: getTrimmedInputValue("profileFooterLabelFindUsHeadingInput"),
    copyrightSuffix: getTrimmedInputValue("profileFooterLabelCopyrightSuffixInput")
  };
  const typographyPresetValue = getSelectedProfileThemeTypographyPreset();
  const containerPresetValue = getSelectedProfileThemeContainerPreset();
  const buttonPresetValue = getSelectedProfileThemeButtonPreset();
  const heroLayoutPresetValue = getSelectedProfileThemeHeroLayoutPreset();
  const upiDiscountPercent = getOptionalPercentageInputValue(
    "profileUpiDiscountPercentInput",
    "Google Pay / UPI discount percentage"
  );
  const deliveryCharge = getOptionalNumberInputValue(
    "profileDeliveryChargeInput",
    "Website delivery charge"
  );
  const aiAssistantEnabled = Boolean(
    document.getElementById("profileThemeAiAssistantEnabledInput")?.checked
  );
  const aiAssistantTitle = getTrimmedInputValue("profileThemeAiAssistantTitleInput");
  const aiAssistantIntro = getTrimmedInputValue("profileThemeAiAssistantIntroInput");
  const aiAssistantToneRaw = getTrimmedInputValue("profileThemeAiAssistantToneInput").toLowerCase();
  const aiAssistantTone =
    aiAssistantToneRaw === "friendly" || aiAssistantToneRaw === "formal"
      ? aiAssistantToneRaw
      : "default";
  const aiAssistantExamplePrompt = getTrimmedInputValue(
    "profileThemeAiAssistantExamplePromptInput"
  );
  const aiAssistantStarterPrompts = parseLineSeparatedInput(
    document.getElementById("profileThemeAiAssistantPromptsInput")?.value || "",
    { maxItems: 6, maxLength: 120 }
  );
  const showAbout = Boolean(document.getElementById("profileThemeShowAboutInput")?.checked);
  const showEvents = Boolean(document.getElementById("profileThemeShowEventsInput")?.checked);
  const showReservation = Boolean(
    document.getElementById("profileThemeShowReservationInput")?.checked
  );
  const showGallery = Boolean(document.getElementById("profileThemeShowGalleryInput")?.checked);
  const showTestimonials = Boolean(
    document.getElementById("profileThemeShowTestimonialsInput")?.checked
  );
  const sectionOrder = getCurrentProfileThemeSectionOrder();

  function applyManagedGroup(groupName, values) {
    const currentGroup =
      nextTheme[groupName] &&
      typeof nextTheme[groupName] === "object" &&
      !Array.isArray(nextTheme[groupName])
        ? { ...nextTheme[groupName] }
        : {};

    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        currentGroup[key] = value;
        return;
      }

      delete currentGroup[key];
    });

    if (Object.keys(currentGroup).length) {
      nextTheme[groupName] = currentGroup;
      return;
    }

    delete nextTheme[groupName];
  }

  function applyManagedContentGroup(groupName, values) {
    const currentContent =
      nextTheme.content &&
      typeof nextTheme.content === "object" &&
      !Array.isArray(nextTheme.content)
        ? { ...nextTheme.content }
        : {};
    const currentGroup =
      currentContent[groupName] &&
      typeof currentContent[groupName] === "object" &&
      !Array.isArray(currentContent[groupName])
        ? { ...currentContent[groupName] }
        : {};

    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        currentGroup[key] = value;
        return;
      }

      delete currentGroup[key];
    });

    if (Object.keys(currentGroup).length) {
      currentContent[groupName] = currentGroup;
    } else {
      delete currentContent[groupName];
    }

    if (Object.keys(currentContent).length) {
      nextTheme.content = currentContent;
      return;
    }

    delete nextTheme.content;
  }

  applyManagedGroup("colors", colorValues);
  applyManagedGroup("radius", radiusValues);
  applyManagedGroup("loadingScreen", loadingScreenValues);
  applyManagedContentGroup("navLabels", navLabelValues);
  applyManagedContentGroup("menuSection", menuSectionValues);
  applyManagedContentGroup("menuCategories", menuCategoryValues);
  applyManagedContentGroup("ctaLabels", ctaLabelValues);
  applyManagedContentGroup("footerLabels", footerLabelValues);

  if (deliveryCharge !== null && deliveryCharge < 0) {
    throw new Error("Website delivery charge must be 0 or more.");
  }

  if (upiDiscountPercent !== null || deliveryCharge !== null) {
    const nextPayment =
      nextTheme.payment && typeof nextTheme.payment === "object" && !Array.isArray(nextTheme.payment)
        ? { ...nextTheme.payment }
        : {};

    if (upiDiscountPercent !== null) {
      nextPayment.upiDiscountPercent = upiDiscountPercent;
    } else {
      delete nextPayment.upiDiscountPercent;
    }

    if (deliveryCharge !== null) {
      nextPayment.deliveryCharge = deliveryCharge;
    } else {
      delete nextPayment.deliveryCharge;
    }

    if (Object.keys(nextPayment).length) {
      nextTheme.payment = nextPayment;
    } else {
      delete nextTheme.payment;
    }
  } else if (nextTheme.payment && typeof nextTheme.payment === "object" && !Array.isArray(nextTheme.payment)) {
    const nextPayment = { ...nextTheme.payment };
    delete nextPayment.upiDiscountPercent;
    delete nextPayment.deliveryCharge;

    if (Object.keys(nextPayment).length) {
      nextTheme.payment = nextPayment;
    } else {
      delete nextTheme.payment;
    }
  }

  const currentAiAssistant =
    nextTheme.aiAssistant &&
    typeof nextTheme.aiAssistant === "object" &&
    !Array.isArray(nextTheme.aiAssistant)
      ? { ...nextTheme.aiAssistant }
      : {};

  if (aiAssistantEnabled) {
    delete currentAiAssistant.enabled;
  } else {
    currentAiAssistant.enabled = false;
  }

  if (aiAssistantTitle) {
    currentAiAssistant.title = aiAssistantTitle;
  } else {
    delete currentAiAssistant.title;
  }

  if (aiAssistantIntro) {
    currentAiAssistant.intro = aiAssistantIntro;
  } else {
    delete currentAiAssistant.intro;
  }

  if (aiAssistantTone !== "default") {
    currentAiAssistant.tone = aiAssistantTone;
  } else {
    delete currentAiAssistant.tone;
  }

  if (aiAssistantExamplePrompt) {
    currentAiAssistant.examplePrompt = aiAssistantExamplePrompt;
  } else {
    delete currentAiAssistant.examplePrompt;
  }

  if (aiAssistantStarterPrompts.length) {
    currentAiAssistant.starterPrompts = aiAssistantStarterPrompts;
  } else {
    delete currentAiAssistant.starterPrompts;
  }

  if (Object.keys(currentAiAssistant).length) {
    nextTheme.aiAssistant = currentAiAssistant;
  } else {
    delete nextTheme.aiAssistant;
  }

  const currentTypography =
    nextTheme.typography &&
    typeof nextTheme.typography === "object" &&
    !Array.isArray(nextTheme.typography)
      ? { ...nextTheme.typography }
      : {};

  if (typographyPresetValue) {
    currentTypography.preset = typographyPresetValue;
  }

  if (Object.keys(currentTypography).length) {
    nextTheme.typography = currentTypography;
  } else {
    delete nextTheme.typography;
  }

  const currentLayout =
    nextTheme.layout &&
    typeof nextTheme.layout === "object" &&
    !Array.isArray(nextTheme.layout)
      ? { ...nextTheme.layout }
      : {};

  if (containerPresetValue) {
    currentLayout.containerPreset = containerPresetValue;
  }

  if (Object.keys(currentLayout).length) {
    nextTheme.layout = currentLayout;
  } else {
    delete nextTheme.layout;
  }

  const currentButtons =
    nextTheme.buttons &&
    typeof nextTheme.buttons === "object" &&
    !Array.isArray(nextTheme.buttons)
      ? { ...nextTheme.buttons }
      : {};

  if (buttonPresetValue) {
    currentButtons.preset = buttonPresetValue;
  }

  if (Object.keys(currentButtons).length) {
    nextTheme.buttons = currentButtons;
  } else {
    delete nextTheme.buttons;
  }

  const currentHero =
    nextTheme.hero && typeof nextTheme.hero === "object" && !Array.isArray(nextTheme.hero)
      ? { ...nextTheme.hero }
      : {};

  if (heroLayoutPresetValue === "default") {
    delete currentHero.layoutVariant;
  } else if (heroLayoutPresetValue) {
    currentHero.layoutVariant = heroLayoutPresetValue;
  }

  if (Object.keys(currentHero).length) {
    nextTheme.hero = currentHero;
  } else {
    delete nextTheme.hero;
  }

  const currentSections =
    nextTheme.sections &&
    typeof nextTheme.sections === "object" &&
    !Array.isArray(nextTheme.sections)
      ? { ...nextTheme.sections }
      : {};

  if (typeof baseTheme.sections?.about === "boolean" || showAbout === false) {
    currentSections.about = showAbout;
  } else {
    delete currentSections.about;
  }

  if (typeof baseTheme.sections?.events === "boolean" || showEvents === false) {
    currentSections.events = showEvents;
  } else {
    delete currentSections.events;
  }

  if (
    typeof baseTheme.sections?.reservation === "boolean" ||
    showReservation === false
  ) {
    currentSections.reservation = showReservation;
  } else {
    delete currentSections.reservation;
  }

  if (typeof baseTheme.sections?.gallery === "boolean" || showGallery === false) {
    currentSections.gallery = showGallery;
  } else {
    delete currentSections.gallery;
  }

  if (
    typeof baseTheme.sections?.testimonials === "boolean" ||
    showTestimonials === false
  ) {
    currentSections.testimonials = showTestimonials;
  } else {
    delete currentSections.testimonials;
  }

  if (state.profileThemeSectionOrderDirty) {
    if (areThemeSectionOrdersEqual(sectionOrder, PROFILE_THEME_SECTION_ORDER)) {
      delete currentSections.order;
    } else {
      currentSections.order = sectionOrder;
    }
  }

  if (Object.keys(currentSections).length) {
    nextTheme.sections = currentSections;
  } else {
    delete nextTheme.sections;
  }

  if (!Object.keys(nextTheme).length) {
    return undefined;
  }

  const currentMeta =
    nextTheme.meta &&
    typeof nextTheme.meta === "object" &&
    !Array.isArray(nextTheme.meta)
      ? { ...nextTheme.meta }
      : {};

  currentMeta.version = THEME_FOUNDATION_VERSION;
  nextTheme.meta = currentMeta;

  return nextTheme;
}

function bindProfileForm() {
  const form = document.getElementById("profileForm");
  const resetThemeBtn = document.getElementById("profileThemeResetBtn");
  const sectionOrderList = document.getElementById("profileThemeSectionOrderList");
  if (!form) return;

  function handleThemeFieldInteraction(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.id || !target.id.startsWith("profileTheme")) return;

    if ("setCustomValidity" in target) {
      target.setCustomValidity("");
    }

    updateProfileThemePreview();
    syncProfileThemeSectionOrderStates();
  }

  form.addEventListener("input", handleThemeFieldInteraction);
  form.addEventListener("change", handleThemeFieldInteraction);

  if (resetThemeBtn && resetThemeBtn.dataset.boundClick !== "true") {
    resetThemeBtn.addEventListener("click", () => {
      fillProfileThemeFields(getCurrentProfileThemeBase());
      updateProfileThemePreview();
    });
    resetThemeBtn.dataset.boundClick = "true";
  }

  if (sectionOrderList && sectionOrderList.dataset.boundClick !== "true") {
    sectionOrderList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-move-theme-section]");
      if (!(button instanceof HTMLButtonElement)) return;

      moveProfileThemeSectionOrder(button);
    });
    sectionOrderList.dataset.boundClick = "true";
  }

  updateProfileThemePreview();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      if (!validateProfileThemeInputs(form)) {
        return;
      }

      const hotelSlug = document.getElementById("profileHotelSlugInput")?.value.trim();
      const currentHero = hotelSlug ? getCurrentProfileHeroBase() : {};
      const nextHero =
        currentHero && typeof currentHero === "object" && !Array.isArray(currentHero)
          ? { ...currentHero }
          : {};
      const currentHeroScene =
        currentHero.scene &&
        typeof currentHero.scene === "object" &&
        !Array.isArray(currentHero.scene)
          ? { ...currentHero.scene }
          : {};
      const nextHeroScene = { ...currentHeroScene };
      const heroSceneTemplate = getValidProfileHeroSceneTemplate(
        document.getElementById("profileHeroSceneTemplateInput")?.value
      );
      const heroSceneModelPreset = getValidProfileHeroSceneModelPreset(
        document.getElementById("profileHeroSceneModelPresetInput")?.value
      );
      const heroScenePreset = getValidProfileHeroScenePreset(
        document.getElementById("profileHeroScenePresetInput")?.value
      );

      nextHero.titleLine1 = document.getElementById("profileHeroLine1Input")?.value.trim();
      nextHero.titleLine2 = document.getElementById("profileHeroLine2Input")?.value.trim();
      nextHero.titleLine3 = document.getElementById("profileHeroLine3Input")?.value.trim();
      nextHero.backgroundImageUrl = document
        .getElementById("profileHeroBackgroundImageUrlInput")
        ?.value.trim();
      nextHero.backgroundImageAlt = document
        .getElementById("profileHeroBackgroundImageAltInput")
        ?.value.trim();
      nextHero.stats = parseJsonInput(document.getElementById("profileHeroStatsInput")?.value, []);
      nextHeroScene.enabled = Boolean(
        document.getElementById("profileHeroSceneEnabledInput")?.checked
      );

      if (heroSceneTemplate) {
        nextHeroScene.template = heroSceneTemplate;
      } else {
        delete nextHeroScene.template;
      }

      if (heroSceneModelPreset) {
        nextHeroScene.modelPreset = heroSceneModelPreset;
      } else {
        delete nextHeroScene.modelPreset;
      }

      if (heroScenePreset) {
        nextHeroScene.preset = heroScenePreset;
      } else {
        delete nextHeroScene.preset;
      }

      [
        {
          inputId: "profileHeroSceneToneMappingExposureInput",
          field: "toneMappingExposure",
          label: "Hero scene tone mapping exposure"
        },
        {
          inputId: "profileHeroSceneCameraDistanceInput",
          field: "cameraDistance",
          label: "Hero scene camera distance"
        },
        {
          inputId: "profileHeroSceneAmbientLightIntensityInput",
          field: "ambientLightIntensity",
          label: "Hero scene ambient light intensity"
        },
        {
          inputId: "profileHeroSceneGoldLightIntensityInput",
          field: "goldLightIntensity",
          label: "Hero scene gold light intensity"
        },
        {
          inputId: "profileHeroSceneWarmLightIntensityInput",
          field: "warmLightIntensity",
          label: "Hero scene warm light intensity"
        },
        {
          inputId: "profileHeroSceneRimLightIntensityInput",
          field: "rimLightIntensity",
          label: "Hero scene rim light intensity"
        },
        {
          inputId: "profileHeroSceneParticleCountInput",
          field: "particleCount",
          label: "Hero scene particle count"
        }
      ].forEach(({ inputId, field, label }) => {
        const nextValue = getOptionalNumberInputValue(inputId, label);

        if (nextValue === null) {
          delete nextHeroScene[field];
          return;
        }

        nextHeroScene[field] = nextValue;
      });

      if (Object.keys(nextHeroScene).length) {
        nextHero.scene = nextHeroScene;
      } else {
        delete nextHero.scene;
      }

      const payload = {
        hotelSlug,
        hotelName: document.getElementById("profileHotelNameInput")?.value.trim(),
        tagline: document.getElementById("profileTaglineInput")?.value.trim(),
        ownerWhatsAppNumber: document.getElementById("profileWhatsappInput")?.value.trim(),
        ownerUpiId: document.getElementById("profileUpiInput")?.value.trim(),
        gstPercent: Number(document.getElementById("profileGstInput")?.value || 5),

        branding: {
          logoTextPrimary: document.getElementById("profileBrandPrimaryInput")?.value.trim(),
          logoTextSecondary: document.getElementById("profileBrandSecondaryInput")?.value.trim()
        },

        theme: buildProfileThemePayload(hotelSlug),
        hero: nextHero,

        about: {
          eyebrow: document.getElementById("profileAboutEyebrowInput")?.value.trim(),
          title: document.getElementById("profileAboutTitleInput")?.value.trim(),
          paragraphs: parseJsonInput(document.getElementById("profileAboutParagraphsInput")?.value, []),
          primaryImageUrl: document
            .getElementById("profileAboutPrimaryImageUrlInput")
            ?.value.trim(),
          primaryImageAlt: document
            .getElementById("profileAboutPrimaryImageAltInput")
            ?.value.trim(),
          secondaryImageUrl: document
            .getElementById("profileAboutSecondaryImageUrlInput")
            ?.value.trim(),
          secondaryImageAlt: document
            .getElementById("profileAboutSecondaryImageAltInput")
            ?.value.trim()
        },

        features: parseJsonInput(document.getElementById("profileFeaturesInput")?.value, []),

        events: {
          eyebrow: document.getElementById("profileEventsEyebrowInput")?.value.trim(),
          title: document.getElementById("profileEventsTitleInput")?.value.trim(),
          subtitle: document.getElementById("profileEventsSubtitleInput")?.value.trim(),
          cards: parseJsonInput(document.getElementById("profileEventsCardsInput")?.value, [])
        },

        reservation: {
          eyebrow: document.getElementById("profileReservationEyebrowInput")?.value.trim(),
          title: document.getElementById("profileReservationTitleInput")?.value.trim(),
          subtitle: document.getElementById("profileReservationSubtitleInput")?.value.trim()
        },

        contactSection: {
          eyebrow: document.getElementById("profileContactEyebrowInput")?.value.trim(),
          title: document.getElementById("profileContactTitleInput")?.value.trim(),
          subtitle: document.getElementById("profileContactSubtitleInput")?.value.trim()
        },

        contact: {
          phone: document.getElementById("profilePhoneInput")?.value.trim(),
          email: document.getElementById("profileEmailInput")?.value.trim(),
          address: document.getElementById("profileAddressInput")?.value.trim()
        },

        location: {
          mapEmbedUrl: document.getElementById("profileMapEmbedInput")?.value.trim(),
          mapLink: document.getElementById("profileMapLinkInput")?.value.trim()
        },

        footer: {
          description: document.getElementById("profileFooterDescriptionInput")?.value.trim(),
          openingHours: parseJsonArrayInput(
            document.getElementById("profileFooterOpeningHoursInput")?.value,
            [],
            "Footer opening hours"
          )
        },

        social: {
          instagram: document.getElementById("profileInstagramInput")?.value.trim(),
          facebook: document.getElementById("profileFacebookInput")?.value.trim(),
          youtube: document.getElementById("profileYoutubeInput")?.value.trim()
        }
      };

      if (!payload.hotelSlug || !payload.hotelName) {
        alert("Hotel slug and hotel name are required.");
        return;
      }

      await saveHotelProfile(payload);
      state.profileHeroBase = cloneThemeValue(payload.hero || {});
      state.profileHeroHotelSlug = payload.hotelSlug || "";
      state.profileThemeBase = cloneThemeValue(payload.theme || {});
      state.profileThemeHotelSlug = payload.hotelSlug || "";
      fillProfileThemeFields(state.profileThemeBase);
      updateProfileThemePreview();
      alert("Hotel profile saved successfully.");
    } catch (error) {
      console.error("Profile form submit failed:", error);
      alert(error.message || "Failed to save hotel profile");
    }
  });
}

function fillProfileForm(profile) {
  if (!profile) return;

  document.getElementById("profileFormSection").style.display = "block";

  const theme =
    profile.theme && typeof profile.theme === "object" && !Array.isArray(profile.theme)
      ? cloneThemeValue(profile.theme)
      : {};
  const hero =
    profile.hero && typeof profile.hero === "object" && !Array.isArray(profile.hero)
      ? cloneThemeValue(profile.hero)
      : {};

  state.profileHeroBase = hero;
  state.profileHeroHotelSlug = profile.hotel_slug || "";
  state.profileThemeBase = theme;
  state.profileThemeHotelSlug = profile.hotel_slug || "";

  document.getElementById("profileHotelSlugInput").value = profile.hotel_slug || "";
  document.getElementById("profileHotelNameInput").value = profile.hotel_name || "";
  document.getElementById("profileTaglineInput").value = profile.tagline || "";
  document.getElementById("profileWhatsappInput").value = profile.owner_whatsapp_number || "";
  document.getElementById("profileUpiInput").value = profile.owner_upi_id || "";
  document.getElementById("profileGstInput").value = profile.gst_percent ?? 5;

  document.getElementById("profileBrandPrimaryInput").value = profile.branding?.logoTextPrimary || "";
  document.getElementById("profileBrandSecondaryInput").value = profile.branding?.logoTextSecondary || "";
  fillProfileThemeFields(theme);
  updateProfileThemePreview();

  document.getElementById("profileHeroLine1Input").value = hero.titleLine1 || "";
  document.getElementById("profileHeroLine2Input").value = hero.titleLine2 || "";
  document.getElementById("profileHeroLine3Input").value = hero.titleLine3 || "";
  document.getElementById("profileHeroBackgroundImageUrlInput").value =
    hero.backgroundImageUrl || "";
  document.getElementById("profileHeroBackgroundImageAltInput").value =
    hero.backgroundImageAlt || "";
  document.getElementById("profileHeroStatsInput").value = formatJson(hero.stats || []);
  document.getElementById("profileHeroSceneEnabledInput").checked =
    hero.scene?.enabled !== false;
  document.getElementById("profileHeroSceneTemplateInput").value =
    getValidProfileHeroSceneTemplate(hero.scene?.template);
  document.getElementById("profileHeroSceneModelPresetInput").value =
    getValidProfileHeroSceneModelPreset(hero.scene?.modelPreset);
  document.getElementById("profileHeroScenePresetInput").value =
    getValidProfileHeroScenePreset(hero.scene?.preset);
  document.getElementById("profileHeroSceneToneMappingExposureInput").value =
    hero.scene?.toneMappingExposure ?? "";
  document.getElementById("profileHeroSceneCameraDistanceInput").value =
    hero.scene?.cameraDistance ?? "";
  document.getElementById("profileHeroSceneAmbientLightIntensityInput").value =
    hero.scene?.ambientLightIntensity ?? "";
  document.getElementById("profileHeroSceneGoldLightIntensityInput").value =
    hero.scene?.goldLightIntensity ?? "";
  document.getElementById("profileHeroSceneWarmLightIntensityInput").value =
    hero.scene?.warmLightIntensity ?? "";
  document.getElementById("profileHeroSceneRimLightIntensityInput").value =
    hero.scene?.rimLightIntensity ?? "";
  document.getElementById("profileHeroSceneParticleCountInput").value =
    hero.scene?.particleCount ?? "";

  document.getElementById("profileAboutEyebrowInput").value = profile.about?.eyebrow || "";
  document.getElementById("profileAboutTitleInput").value = profile.about?.title || "";
  document.getElementById("profileAboutParagraphsInput").value = formatJson(profile.about?.paragraphs || []);
  document.getElementById("profileAboutPrimaryImageUrlInput").value =
    profile.about?.primaryImageUrl || "";
  document.getElementById("profileAboutPrimaryImageAltInput").value =
    profile.about?.primaryImageAlt || "";
  document.getElementById("profileAboutSecondaryImageUrlInput").value =
    profile.about?.secondaryImageUrl || "";
  document.getElementById("profileAboutSecondaryImageAltInput").value =
    profile.about?.secondaryImageAlt || "";

  document.getElementById("profileFeaturesInput").value = formatJson(profile.features || []);

  document.getElementById("profileEventsEyebrowInput").value = profile.events?.eyebrow || "";
  document.getElementById("profileEventsTitleInput").value = profile.events?.title || "";
  document.getElementById("profileEventsSubtitleInput").value = profile.events?.subtitle || "";
  document.getElementById("profileEventsCardsInput").value = formatJson(profile.events?.cards || []);

  document.getElementById("profileReservationEyebrowInput").value = profile.reservation?.eyebrow || "";
  document.getElementById("profileReservationTitleInput").value = profile.reservation?.title || "";
  document.getElementById("profileReservationSubtitleInput").value = profile.reservation?.subtitle || "";

  document.getElementById("profileContactEyebrowInput").value = profile.contact_section?.eyebrow || "";
  document.getElementById("profileContactTitleInput").value = profile.contact_section?.title || "";
  document.getElementById("profileContactSubtitleInput").value = profile.contact_section?.subtitle || "";

  document.getElementById("profilePhoneInput").value = profile.contact?.phone || "";
  document.getElementById("profileEmailInput").value = profile.contact?.email || "";
  document.getElementById("profileAddressInput").value = profile.contact?.address || "";

  document.getElementById("profileMapEmbedInput").value = profile.location?.mapEmbedUrl || "";
  document.getElementById("profileMapLinkInput").value = profile.location?.mapLink || "";

  document.getElementById("profileFooterDescriptionInput").value = profile.footer?.description || "";
  document.getElementById("profileFooterOpeningHoursInput").value = formatJson(
    Array.isArray(profile.footer?.openingHours) ? profile.footer.openingHours : []
  );

  document.getElementById("profileInstagramInput").value = profile.social?.instagram || "";
  document.getElementById("profileFacebookInput").value = profile.social?.facebook || "";
  document.getElementById("profileYoutubeInput").value = profile.social?.youtube || "";
}


async function loginAdmin(email, password) {
 const response = await fetch(`${AUTH_API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

function hideAdminBootStatus() {
  const bootStatus = document.getElementById("adminBootStatus");
  if (bootStatus) bootStatus.hidden = true;
}

function showLoginView() {
  const loginWrap = document.getElementById("adminLoginWrap");
  const dashboardWrap = document.getElementById("adminDashboardWrap");

  hideAdminBootStatus();
  if (loginWrap) loginWrap.style.display = "block";
  if (dashboardWrap) dashboardWrap.style.display = "none";
}

function showDashboardView() {
  const loginWrap = document.getElementById("adminLoginWrap");
  const dashboardWrap = document.getElementById("adminDashboardWrap");

  hideAdminBootStatus();
  if (loginWrap) loginWrap.style.display = "none";
  if (dashboardWrap) dashboardWrap.style.display = "block";
}

function bindAdminLoginForm() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("adminEmailInput")?.value.trim();
    const passwordInput = document.getElementById("adminPasswordInput");
    const password = passwordInput?.value || "";
    const status = document.getElementById("adminLoginStatus");
    const submitButton = form.querySelector('button[type="submit"]');

    if (status) status.textContent = "";
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await loginAdmin(email, password);
      setAdminToken(result.token);
      if (passwordInput) passwordInput.value = "";
      showDashboardView();
      await loadHotels();
      await loadTabData();
    } catch (error) {
      console.error("Admin login failed:", error);
      if (status) status.textContent = error.message || "Login failed";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function bindAdminLogout() {
  const btn = document.getElementById("adminLogoutBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    clearAdminToken();
    showLoginView();
  });
}

async function checkExistingAdminSession() {
  const token = getAdminToken();

  if (!token) {
    showLoginView();
    return false;
  }

  try {
    // await fetchJson("http://localhost:5000/api/auth/me");
    await fetchJson(`${AUTH_API_BASE}/me`);
    showDashboardView();
    return true;
  } catch (error) {
    console.warn("Admin session invalid:", error);
    clearAdminToken();
    showLoginView();
    return false;
  }
}

async function uploadImageFile({ hotelSlug, folder, file }) {
  const token = getAdminToken();
  const formData = new FormData();

  formData.append("hotelSlug", hotelSlug || "shared");
  formData.append("folder", folder || "misc");
  formData.append("file", file);

const response = await fetch(UPLOAD_API_BASE, {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {},
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminToken();
      showLoginView();
      throw new Error("Admin session expired or missing. Please log in again.");
    }

    throw new Error(data.message || "Upload failed");
  }

  return data;
}

function bindUploadForm() {
  const form = document.getElementById("uploadForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const hotelSlug =
      document.getElementById("uploadHotelSlugInput")?.value.trim() || "shared";
    const folder =
      document.getElementById("uploadFolderInput")?.value.trim() || "misc";
    const targetFieldId =
      document.getElementById("uploadTargetFieldInput")?.value.trim() || "";
    const storageTargetFieldId =
      document.getElementById("uploadStorageTargetFieldInput")?.value.trim() || "";
    const fileInput = document.getElementById("uploadFileInput");
    const resultWrap = document.getElementById("uploadResult");
    const file = fileInput?.files?.[0];

    if (!file) {
      alert("Please choose a file first.");
      return;
    }

    try {
      if (resultWrap) {
        resultWrap.innerHTML = `<p class="loading-state">Uploading...</p>`;
      }

      const result = await uploadImageFile({
        hotelSlug,
        folder,
        file
      });

      const publicUrl = result.file?.publicUrl || "";
      const storagePath = result.file?.path || "";

      if (targetFieldId) {
        const targetInput = document.getElementById(targetFieldId);
        if (targetInput) {
          targetInput.value = publicUrl;
        }
      }

      if (storageTargetFieldId) {
        const storageTargetInput = document.getElementById(storageTargetFieldId);
        if (storageTargetInput) {
          storageTargetInput.value = storagePath;
        }
      }

      if (resultWrap) {
        resultWrap.innerHTML = `
          <div class="admin-card" style="margin-top: 12px;">
            <p><strong>Uploaded successfully</strong></p>
            <p><strong>URL:</strong> <a href="${escapeHTML(publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(publicUrl)}</a></p>
            <p><strong>Storage Path:</strong> ${escapeHTML(storagePath)}</p>
            <img src="${escapeHTML(publicUrl)}" alt="Uploaded preview" style="max-width: 240px; border-radius: 8px; margin-top: 10px;" />
          </div>
        `;
      }

      form.reset();
    } catch (error) {
      console.error("Upload failed:", error);
      if (resultWrap) {
        resultWrap.innerHTML = `<p class="empty-state">Upload failed: ${escapeHTML(error.message || "Unknown error")}</p>`;
      }
    }
  });
}

async function toggleMenuArchive(id, isArchived) {
  return fetchJson(`${API_BASE}/menu-items/${id}/archive`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isArchived })
  });
}

async function resendNotificationEvent(id) {
  return fetchJson(`${API_BASE}/notification-events/${id}/resend`, {
    method: "POST"
  });
}

function bindNotificationSettingsForm() {
  const form = document.getElementById("notificationSettingsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const payload = {
        hotelSlug:
          document.getElementById("notificationSettingsHotelSlugInput")?.value.trim() ||
          "",
        ownerEmail:
          document.getElementById("notificationOwnerEmailInput")?.value.trim() || "",
        emailEnabled:
          !!document.getElementById("notificationEmailEnabledInput")?.checked,
        notifyOnNewOrder:
          !!document.getElementById("notificationNotifyOrderInput")?.checked,
        notifyOnNewReservation:
          !!document.getElementById("notificationNotifyReservationInput")?.checked,
        notifyOnNewInquiry:
          !!document.getElementById("notificationNotifyInquiryInput")?.checked
      };

      if (!payload.hotelSlug) {
        alert("Hotel slug is required.");
        return;
      }

      const result = await saveNotificationSettings(payload);
      fillNotificationSettingsForm(result.settings || payload);
      alert("Notification settings saved successfully.");
    } catch (error) {
      console.error("Notification settings save failed:", error);
      alert(error.message || "Failed to save notification settings");
    }
  });
}

function bindOrderingSettingsForm() {
  const form = document.getElementById("orderingSettingsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const payload = {
        hotelSlug:
          document.getElementById("orderingSettingsHotelSlugInput")?.value.trim() ||
          "",
        customerOrderingEnabled:
          !!document.getElementById("orderingCustomerEnabledInput")?.checked,
        staffOrderingEnabled:
          !!document.getElementById("orderingStaffEnabledInput")?.checked,
        whatsappOrderingEnabled:
          !!document.getElementById("orderingWhatsappEnabledInput")?.checked,
        secureOnlinePaymentEnabled:
          !!document.getElementById("orderingSecureOnlinePaymentEnabledInput")?.checked,
        cashOnDeliveryEnabled:
          !!document.getElementById("orderingCashOnDeliveryEnabledInput")?.checked,
        manualUpiPaymentEnabled:
          !!document.getElementById("orderingManualUpiPaymentEnabledInput")?.checked,
        disabledTitle:
          document.getElementById("orderingDisabledTitleInput")?.value.trim() || "",
        disabledMessage:
          document.getElementById("orderingDisabledMessageInput")?.value.trim() || "",
        disabledButtonText:
          document.getElementById("orderingDisabledButtonTextInput")?.value.trim() || "",
        disabledButtonLink:
          document.getElementById("orderingDisabledButtonLinkInput")?.value.trim() || "",
        disabledIcon:
          document.getElementById("orderingDisabledIconInput")?.value.trim() || ""
      };

      if (!payload.hotelSlug) {
        alert("Hotel slug is required.");
        return;
      }

      if (
        payload.customerOrderingEnabled &&
        !payload.secureOnlinePaymentEnabled &&
        !payload.cashOnDeliveryEnabled &&
        !payload.manualUpiPaymentEnabled
      ) {
        alert("Enable at least one customer payment method while customer ordering is active.");
        return;
      }

      if (
        payload.disabledButtonLink &&
        !(
          payload.disabledButtonLink.startsWith("/") ||
          /^https?:\/\//i.test(payload.disabledButtonLink)
        )
      ) {
        alert("Disabled button link must be an https URL or a relative path like /contact.");
        return;
      }

      const result = await saveOrderingSettings(payload);
      fillOrderingSettingsForm(result.settings || payload);
      alert("Ordering settings saved successfully.");
    } catch (error) {
      console.error("Ordering settings save failed:", error);
      alert(error.message || "Failed to save ordering settings");
    }
  });
}

function bindRoomFeatureSettingsForm() {
  const form = document.getElementById("roomFeatureSettingsForm");
  if (!form) return;

  const businessTypeInput = document.getElementById("hotelBusinessTypeInput");
  const dependencyInputs = [
    document.getElementById("hotelFeatureFoodModuleEnabledInput"),
    document.getElementById("hotelFeatureRoomModuleEnabledInput"),
    document.getElementById("roomFeatureRoomServiceEnabledInput")
  ];

  businessTypeInput?.addEventListener("change", () => {
    syncHotelFeatureDependencies({ fromBusinessType: true });
  });
  dependencyInputs.forEach((input) => {
    input?.addEventListener("change", () => syncHotelFeatureDependencies());
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const payload = {
        hotelSlug:
          document.getElementById("roomFeatureSettingsHotelSlugInput")?.value.trim() ||
          "",
        enableFoodModule:
          !!document.getElementById("hotelFeatureFoodModuleEnabledInput")?.checked,
        enableRoomModule:
          !!document.getElementById("hotelFeatureRoomModuleEnabledInput")?.checked,
        enableFoodOrdering:
          !!document.getElementById("roomFeatureFoodOrderingEnabledInput")?.checked,
        enableRoomBooking:
          !!document.getElementById("roomFeatureRoomBookingEnabledInput")?.checked,
        enableRoomService:
          !!document.getElementById("roomFeatureRoomServiceEnabledInput")?.checked,
        enableFoodReports:
          !!document.getElementById("hotelFeatureFoodReportsEnabledInput")?.checked,
        enableRoomReports:
          !!document.getElementById("hotelFeatureRoomReportsEnabledInput")?.checked,
        enableCombinedReports:
          !!document.getElementById("hotelFeatureCombinedReportsEnabledInput")?.checked,
        enableCombinedBilling:
          !!document.getElementById("hotelFeatureCombinedBillingEnabledInput")?.checked
      };

      if (!payload.hotelSlug) {
        alert("Hotel slug is required.");
        return;
      }

      if (!payload.enableFoodModule && !payload.enableRoomModule) {
        alert("Enable at least one core module: Food Operations or Room Operations.");
        return;
      }

      if (
        payload.enableRoomService &&
        (!payload.enableFoodModule || !payload.enableRoomModule)
      ) {
        alert("Room Service requires both Food Operations and Room Operations.");
        return;
      }

      if (
        payload.enableCombinedReports &&
        (!payload.enableFoodModule || !payload.enableRoomModule)
      ) {
        alert("Combined Reports require both Food Operations and Room Operations.");
        return;
      }

      if (payload.enableCombinedBilling && !payload.enableRoomService) {
        alert("Combined Billing requires Room Service.");
        return;
      }

      const disablingFood =
        loadedHotelFeatureSettings?.enableFoodModule === true &&
        payload.enableFoodModule === false;
      const disablingRooms =
        loadedHotelFeatureSettings?.enableRoomModule === true &&
        payload.enableRoomModule === false;

      if (disablingFood || disablingRooms) {
        const impacts = [];
        if (disablingFood) {
          impacts.push("Food Operations, Take Order, Orders, KDS, Food Billing, Food Reports, and food APIs");
        }
        if (disablingRooms) {
          impacts.push("Room Operations, availability, booking, checkout, Room Reports, and room APIs");
        }

        const confirmed = window.confirm(
          `Disable ${disablingFood && disablingRooms ? "these modules" : "this module"}?\n\n${impacts.join("\n")} will be hidden and blocked for this hotel.\n\nHistorical records will not be deleted.`
        );

        if (!confirmed) return;
      }

      const result = await saveRoomFeatureSettings(payload);
      fillRoomFeatureSettingsForm(result.settings || payload);
      alert("Hotel module settings saved successfully.");
    } catch (error) {
      console.error("Hotel module settings save failed:", error);
      alert(error.message || "Failed to save hotel module settings");
    }
  });
}

function bindPaymentRouteSettingsForm() {
  const form = document.getElementById("paymentRouteSettingsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const payload = {
        hotelSlug:
          document.getElementById("paymentRouteHotelSlugInput")?.value.trim() ||
          "",
        provider:
          document.getElementById("paymentRouteProviderInput")?.value || "razorpay",
        routeEnabled:
          !!document.getElementById("paymentRouteEnabledInput")?.checked,
        razorpayLinkedAccountId:
          document.getElementById("paymentRouteLinkedAccountInput")?.value.trim() || ""
      };

      if (!payload.hotelSlug) {
        alert("Hotel slug is required.");
        return;
      }

      if (
        payload.razorpayLinkedAccountId &&
        !/^acc_[A-Za-z0-9]+$/.test(payload.razorpayLinkedAccountId)
      ) {
        alert("Razorpay linked account id should look like acc_xxxxx.");
        return;
      }

      if (payload.routeEnabled && !payload.razorpayLinkedAccountId) {
        alert("Linked account id is required when Route is enabled.");
        return;
      }

      const result = await savePaymentRouteSettings(payload);
      fillPaymentRouteSettingsForm(result.settings || payload);
      alert("Payment Route settings saved successfully.");
    } catch (error) {
      console.error("Payment Route settings save failed:", error);
      alert(error.message || "Failed to save payment Route settings");
    }
  });
}

async function toggleGalleryArchive(id, isArchived) {
  return fetchJson(`${API_BASE}/gallery-items/${id}/archive`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isArchived })
  });
}

async function deleteMenuItem(id) {
  return fetchJson(`${API_BASE}/menu-items/${id}`, {
    method: "DELETE"
  });
}

async function toggleMenuComboActive(id, isAvailable) {
  return fetchJson(`${API_BASE}/menu-combos/${id}/active`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isAvailable })
  });
}

async function deleteMenuCombo(id) {
  return fetchJson(`${API_BASE}/menu-combos/${id}`, {
    method: "DELETE"
  });
}

async function deleteGalleryItem(id) {
  return fetchJson(`${API_BASE}/gallery-items/${id}`, {
    method: "DELETE"
  });
}

async function deleteTestimonial(id) {
  return fetchJson(`${API_BASE}/testimonials/${id}`, {
    method: "DELETE"
  });
}

async function toggleTestimonialApproval(id, isApproved) {
  return fetchJson(`${API_BASE}/testimonials/${id}/approval`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isApproved })
  });
}

async function toggleTestimonialArchive(id, isArchived) {
  return fetchJson(`${API_BASE}/testimonials/${id}/archive`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isArchived })
  });
}

async function toggleHotelActive(id, isActive) {
  return fetchJson(`${API_BASE}/hotels/${id}/active`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isActive })
  });
}

async function toggleGalleryActive(id, isActive) {
  return fetchJson(`${API_BASE}/gallery-items/${id}/active`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isActive })
  });
}

async function togglePopupNotificationActive(id, isActive) {
  return fetchJson(`${API_BASE}/popup-notifications/${id}/active`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isActive })
  });
}

async function deletePopupNotification(id) {
  return fetchJson(`${API_BASE}/popup-notifications/${id}`, {
    method: "DELETE"
  });
}

async function deleteUploadedFile(storagePath) {
  return fetchJson(UPLOAD_API_BASE, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ storagePath })
  });
}

function bindUploadedFileDelete() {
  const btn = document.getElementById("deleteUploadedFileBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const storagePath =
      document.getElementById("deleteStoragePathInput")?.value.trim() || "";

    if (!storagePath) {
      alert("Enter a storage path first.");
      return;
    }

    if (!window.confirm("Delete this uploaded file?")) return;

    try {
      await deleteUploadedFile(storagePath);
      alert("Uploaded file deleted successfully");
      document.getElementById("deleteStoragePathInput").value = "";
    } catch (error) {
      console.error("Delete uploaded file failed:", error);
      alert("Failed to delete uploaded file");
    }
  });
}

async function initAdmin() {
  try {
    bindTabs();
    bindHotelFilter();
    bindListFilters();
    bindRoomBookingFilters();
    bindStatusActions();
    bindFormToggles();
    bindQrTableLinkHelper();
    bindHotelDomainResolveHelper();
    bindGalleryUploadHelper();
    bindMenuComboUploadHelper();
    bindPopupNotificationUploadHelper();
    bindProfileAboutImageUploadHelpers();
    bindProfileHeroImageUploadHelper();
    bindHotelForm();
    bindMenuCategoryForm();
    bindMenuItemForm();
    bindMenuComboForm();
    bindRoomTypeForm();
    bindRoomForm();
    bindRoomBookingForm();
    bindGalleryItemForm();
    bindPopupNotificationForm();
    bindPopupNotificationPreview();
    bindPopupNotificationValidation();
    bindTestimonialForm();
    bindNotificationSettingsForm();
    bindOrderingSettingsForm();
    bindRoomFeatureSettingsForm();
    bindPaymentRouteSettingsForm();
    bindEditActions();
    bindProfileForm();
    bindUploadForm();
    bindUploadedFileDelete();
    syncMenuFormHotelSlug();
    syncMenuCategoryFormHotelSlug();
    syncMenuComboFormHotelSlug();
    syncGalleryFormHotelSlug();
    syncPopupNotificationFormHotelSlug();
    syncTestimonialFormHotelSlug();
    syncNotificationSettingsHotelSlug();
    syncOrderingSettingsHotelSlug();
    syncRoomFeatureSettingsHotelSlug();
    syncPaymentRouteSettingsHotelSlug();
    syncQrTableLinkHotelSlug();
    syncRoomTypeFormHotelSlug();
    syncRoomFormHotelSlug();
    syncRoomBookingFormHotelSlug();
    bindAdminLoginForm();
    bindAdminLogout();

    const hasSession = await checkExistingAdminSession();
    if (!hasSession) return;

    await loadHotels();
    await loadTabData();
  } catch (error) {
    console.error("Admin init failed:", error);
    const content = $("#adminContent");
    if (content) {
      content.innerHTML = `<p class="empty-state">Failed to load dashboard.</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", initAdmin);
