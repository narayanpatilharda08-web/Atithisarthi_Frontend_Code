"use strict";

(() => {
  const TOKEN_KEY = "hotel_platform_admin_token";
  const TEXT_FIELDS = Object.freeze([
    ["companyName", "Company Name", 120],
    ["shortCompanyName", "Short Company Name", 60],
    ["shortProductLabel", "Short Product Label", 80],
    ["welcomeBadge", "Welcome Badge", 100],
    ["welcomeHeading", "Welcome Heading", 160],
    ["welcomeSubheading", "Welcome Subheading", 240],
    ["description", "Description", 700, "textarea"],
    ["tagline", "Tagline", 240],
    ["logoAlt", "Primary Logo Alt Text", 160],
    ["heroImageAlt", "Hero Image Alt Text", 200],
    ["footerLogoAlt", "Footer Logo Alt Text", 160]
  ]);
  const LOGIN_FIELDS = Object.freeze([
    ["loginBadgeText", "Secure-login Badge", 80],
    ["loginHeading", "Login Heading", 160],
    ["loginDescription", "Login Description", 320, "textarea"],
    ["hotelSlugLabel", "Hotel Slug Label", 80],
    ["hotelSlugPlaceholder", "Hotel Slug Placeholder", 120],
    ["staffPinLabel", "Staff PIN Label", 80],
    ["staffPinPlaceholder", "Staff PIN Placeholder", 120],
    ["loginButtonText", "Login Button Text", 80]
  ]);
  const SERVICE_FIELDS = Object.freeze([
    ["serviceSectionHeading", "Section Heading", 160],
    ["hotelServiceLabel", "Hotel Service Label", 80],
    ["restaurantServiceLabel", "Restaurant Service Label", 80],
    ["transportServiceLabel", "Transport Service Label", 80]
  ]);
  const FOOTER_FIELDS = Object.freeze([
    ["footerCompanyName", "Footer Company Name", 120],
    ["copyrightText", "Copyright", 260],
    ["legalText", "Legal Text", 260, "textarea"],
    ["termsUrl", "Terms URL", 2000, "url"],
    ["privacyUrl", "Privacy URL", 2000, "url"]
  ]);
  const IMAGE_FIELDS = Object.freeze([
    ["logoUrl", "Primary Logo", "logo"],
    ["footerLogoUrl", "Footer Logo", "footer-logo"],
    ["heroImageUrl", "Hero Image", "hero"],
    ["backgroundImageUrl", "Background Image", "background"]
  ]);
  const COLOR_FIELDS = Object.freeze([
    ["primaryColor", "Primary Color"],
    ["secondaryColor", "Secondary Color"],
    ["accentColor", "Accent Color"],
    ["backgroundColor", "Background Color"],
    ["cardColor", "Card Color"],
    ["textColor", "Text Color"]
  ]);
  const BOOLEAN_FIELDS = Object.freeze([
    ["enableHotelService", "Enable Hotel / Stay"],
    ["enableRestaurantService", "Enable Restaurant / Dine"],
    ["enableTransportService", "Enable Local Transport / Travel"]
  ]);
  const ALL_TEXT_KEYS = Object.freeze([
    ...TEXT_FIELDS.map(([key]) => key),
    ...LOGIN_FIELDS.map(([key]) => key),
    ...SERVICE_FIELDS.map(([key]) => key),
    ...FOOTER_FIELDS.map(([key]) => key),
    ...IMAGE_FIELDS.map(([key]) => key),
    ...COLOR_FIELDS.map(([key]) => key)
  ]);

  const state = {
    activeTab: "content",
    device: "desktop",
    storagePaths: {},
    localPreviewUrls: {},
    loaded: false,
    busy: false
  };

  function getApiBase() {
    const runtimeBase = String(window.APP_RUNTIME_CONFIG?.API_BASE_URL || "").trim();
    if (runtimeBase) return runtimeBase.replace(/\/+$/, "");
    const hostname = window.location.hostname;
    const isLocal = !hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    const origin = isLocal || !window.location.origin || window.location.origin === "null"
      ? "http://localhost:5000"
      : window.location.origin;
    return `${origin.replace(/\/+$/, "")}/api`;
  }

  function fieldId(key) {
    return `loginBranding${key.charAt(0).toUpperCase()}${key.slice(1)}Input`;
  }

  function textFieldMarkup([key, label, max, type = "text"]) {
    const id = fieldId(key);
    const wide = type === "textarea" ? " is-wide" : "";
    const control = type === "textarea"
      ? `<textarea id="${id}" data-branding-field="${key}" maxlength="${max}"></textarea>`
      : `<input id="${id}" data-branding-field="${key}" type="${type}" maxlength="${max}" />`;
    return `<div class="admin-field${wide}"><label for="${id}">${label}</label>${control}</div>`;
  }

  function imageCardMarkup([key, label, imageType]) {
    const id = fieldId(key);
    return `
      <article class="login-branding-image-card" data-branding-image-card="${key}">
        <h4>${label}</h4>
        <div class="admin-field">
          <label for="${id}">${label} URL</label>
          <input id="${id}" data-branding-field="${key}" type="url" placeholder="Uploaded image URL" />
        </div>
        <div class="admin-field">
          <label for="${id}File">Choose PNG, JPG, JPEG, or WebP</label>
          <input id="${id}File" data-branding-image-file="${key}" data-image-type="${imageType}" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" />
          <p class="admin-field-hint">Maximum 4 MB. Images are inspected by signature and dimensions before storage.</p>
        </div>
        <div class="login-branding-image-preview" data-branding-image-preview="${key}"><span>No image selected</span></div>
        <div class="login-branding-image-actions">
          <button type="button" data-branding-upload="${key}">Upload / Replace</button>
          <button type="button" data-branding-remove="${key}">Remove Image</button>
        </div>
      </article>`;
  }

  function colorFieldMarkup([key, label]) {
    const id = fieldId(key);
    return `
      <div class="admin-field">
        <label for="${id}">${label}</label>
        <div class="login-branding-color-row">
          <input id="${id}Picker" data-branding-color-picker="${key}" type="color" aria-label="${label} picker" />
          <input id="${id}" data-branding-field="${key}" type="text" maxlength="7" pattern="^#[0-9A-Fa-f]{6}$" aria-label="${label} hexadecimal value" />
        </div>
      </div>`;
  }

  function previewMarkup() {
    return `
      <div class="login-branding-preview-controls" aria-label="Preview device">
        <button type="button" data-branding-device="desktop" aria-pressed="true">Desktop</button>
        <button type="button" data-branding-device="tablet" aria-pressed="false">Tablet</button>
        <button type="button" data-branding-device="mobile" aria-pressed="false">Mobile</button>
      </div>
      <div class="login-branding-preview-stage">
        <div class="login-branding-preview" data-device="desktop" data-branding-preview>
          <header class="lbp-preview-header">
            <div class="lbp-preview-brand">
              <span class="lbp-preview-logo" data-preview-logo><span>A</span></span>
              <span class="lbp-preview-brand-copy"><strong data-preview="companyName"></strong><small data-preview="shortProductLabel"></small></span>
            </div>
          </header>
          <div class="lbp-preview-main">
            <section class="lbp-preview-hero">
              <p class="lbp-preview-eyebrow" data-preview="welcomeBadge"></p>
              <h3 class="lbp-preview-title"><span data-preview="companyName"></span><br /><span data-preview="welcomeHeading"></span></h3>
              <p data-preview="welcomeSubheading"></p>
              <p data-preview="description"></p>
              <p data-preview="tagline"></p>
              <p data-preview="serviceSectionHeading"></p>
              <div class="lbp-preview-services">
                <span class="lbp-preview-service" data-preview-service="hotel"></span>
                <span class="lbp-preview-service" data-preview-service="restaurant"></span>
                <span class="lbp-preview-service" data-preview-service="transport"></span>
              </div>
            </section>
            <section class="lbp-preview-card" aria-label="Safe login-card preview">
              <p class="lbp-preview-eyebrow" data-preview="loginBadgeText"></p>
              <h4 data-preview="loginHeading"></h4>
              <p data-preview="loginDescription"></p>
              <div class="lbp-preview-field"><span data-preview="hotelSlugLabel"></span><span class="lbp-preview-input" data-preview="hotelSlugPlaceholder"></span></div>
              <div class="lbp-preview-field"><span data-preview="staffPinLabel"></span><span class="lbp-preview-input" data-preview="staffPinPlaceholder"></span></div>
              <span class="lbp-preview-button" data-preview="loginButtonText"></span>
            </section>
          </div>
          <footer class="lbp-preview-footer">
            <strong data-preview="footerCompanyName"></strong>
            <p data-preview="copyrightText"></p>
            <p data-preview="legalText"></p>
            <div class="lbp-preview-legal"><span data-preview-terms>Terms</span><span data-preview-privacy>Privacy</span></div>
          </footer>
        </div>
      </div>`;
  }

  function sectionMarkup() {
    return `
      <section id="loginBrandingSection" aria-labelledby="loginBrandingTitle" hidden>
        <div class="login-branding-admin-head">
          <div>
            <h2 id="loginBrandingTitle">Login Page Branding</h2>
            <p class="login-branding-admin-copy">Configure safe platform or hotel-specific presentation without changing authentication.</p>
          </div>
          <div class="login-branding-actions">
            <button class="is-primary" type="submit" form="loginBrandingForm" data-branding-action>Save Draft</button>
            <button type="button" data-branding-open-preview data-branding-action>Preview</button>
            <button type="button" data-branding-publish data-branding-action>Publish</button>
            <button class="is-danger" type="button" data-branding-reset data-branding-action>Reset to Default</button>
          </div>
        </div>

        <div class="login-branding-scope">
          <div class="admin-field">
            <label for="loginBrandingScopeTypeInput">Branding Scope</label>
            <select id="loginBrandingScopeTypeInput">
              <option value="platform">Platform Default</option>
              <option value="hotel">Hotel Specific</option>
            </select>
          </div>
          <div class="admin-field">
            <label for="loginBrandingHotelSlugInput">Hotel Slug</label>
            <select id="loginBrandingHotelSlugInput" disabled><option value="">Choose a hotel</option></select>
          </div>
          <button type="button" data-branding-load data-branding-action>Load Branding</button>
        </div>

        <p id="loginBrandingStatus" class="login-branding-status" role="status" aria-live="polite">Open the editor and load a branding scope.</p>

        <div class="login-branding-tabs" role="tablist" aria-label="Branding editor sections">
          ${["content", "images", "login", "services", "footer", "theme", "preview"].map((tab, index) =>
            `<button id="loginBrandingTab-${tab}" type="button" role="tab" data-branding-tab="${tab}" aria-selected="${index === 0}" aria-controls="loginBrandingPanel-${tab}">${tab === "login" ? "Login Card" : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>`
          ).join("")}
        </div>

        <form id="loginBrandingForm">
          <section id="loginBrandingPanel-content" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-content">
            <div><h3>Content</h3><p class="login-branding-panel-copy">Brand, hero, and accessible image descriptions.</p></div>
            <div class="login-branding-grid">${TEXT_FIELDS.map(textFieldMarkup).join("")}</div>
          </section>
          <section id="loginBrandingPanel-images" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-images" hidden>
            <div><h3>Images</h3><p class="login-branding-panel-copy">Preview locally, then upload to the selected scope.</p></div>
            <div class="login-branding-grid">${IMAGE_FIELDS.map(imageCardMarkup).join("")}</div>
          </section>
          <section id="loginBrandingPanel-login" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-login" hidden>
            <div><h3>Login Card</h3><p class="login-branding-panel-copy">Labels change presentation only; functional IDs and payload keys remain fixed.</p></div>
            <div class="login-branding-grid">${LOGIN_FIELDS.map(textFieldMarkup).join("")}</div>
          </section>
          <section id="loginBrandingPanel-services" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-services" hidden>
            <div><h3>Service Connections</h3><p class="login-branding-panel-copy">Display capabilities only; these are not booking actions.</p></div>
            <div class="login-branding-grid">
              ${SERVICE_FIELDS.map(textFieldMarkup).join("")}
              ${BOOLEAN_FIELDS.map(([key, label]) => `<label class="login-branding-check"><input data-branding-boolean="${key}" type="checkbox" />${label}</label>`).join("")}
            </div>
          </section>
          <section id="loginBrandingPanel-footer" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-footer" hidden>
            <div><h3>Footer</h3><p class="login-branding-panel-copy">Legal links accept HTTPS or HTTP only.</p></div>
            <div class="login-branding-grid">${FOOTER_FIELDS.map(textFieldMarkup).join("")}</div>
          </section>
          <section id="loginBrandingPanel-theme" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-theme" hidden>
            <div><h3>Theme</h3><p class="login-branding-panel-copy">Each picker has a keyboard-editable hexadecimal value.</p></div>
            <div class="login-branding-grid">${COLOR_FIELDS.map(colorFieldMarkup).join("")}</div>
          </section>
          <section id="loginBrandingPanel-preview" class="login-branding-panel" role="tabpanel" aria-labelledby="loginBrandingTab-preview" hidden>
            <div><h3>Unsaved Preview</h3><p class="login-branding-panel-copy">Uses current form values and safe mock fields. It never calls the Staff login API.</p></div>
            ${previewMarkup()}
          </section>
        </form>
      </section>`;
  }

  function getSection() {
    return document.getElementById("loginBrandingSection");
  }

  function setStatus(message, tone = "") {
    const status = document.getElementById("loginBrandingStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setBusy(busy) {
    state.busy = !!busy;
    const section = getSection();
    if (!section) return;
    section.setAttribute("aria-busy", busy ? "true" : "false");
    section.querySelectorAll("[data-branding-action], [data-branding-upload], [data-branding-remove]").forEach((button) => {
      button.disabled = !!busy;
    });
  }

  async function request(path, options = {}, authAttempt = 0) {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) throw new Error("Admin session is required");
    const headers = { Accept: "application/json", ...(options.headers || {}), Authorization: `Bearer ${token}` };
    const response = await fetch(`${getApiBase()}/admin/login-branding${path}`, {
      ...options,
      credentials: "include",
      headers
    });
    const payload = await response.json().catch(() => ({}));
    if (
      response.status === 401 &&
      authAttempt === 0 &&
      typeof window.refreshAdminAccessToken === "function" &&
      await window.refreshAdminAccessToken()
    ) {
      return request(path, options, 1);
    }
    if (!response.ok) throw new Error(payload.message || "Login branding request failed");
    return payload;
  }

  function getScope() {
    const scopeType = document.getElementById("loginBrandingScopeTypeInput")?.value || "platform";
    const hotelSlug = String(document.getElementById("loginBrandingHotelSlugInput")?.value || "").trim().toLowerCase();
    if (scopeType === "hotel" && !/^[a-z0-9][a-z0-9-]{1,119}$/.test(hotelSlug)) {
      throw new Error("Choose a valid hotel before continuing");
    }
    return { scopeType, ...(scopeType === "hotel" ? { hotelSlug } : {}) };
  }

  function collectConfig() {
    const core = window.LoginBrandingCore;
    const fallback = core?.fallback || {};
    const config = {};
    for (const key of ALL_TEXT_KEYS) {
      const input = document.querySelector(`[data-branding-field="${key}"]`);
      config[key] = String(input?.value ?? fallback[key] ?? "").trim();
    }
    for (const [key] of BOOLEAN_FIELDS) {
      config[key] = !!document.querySelector(`[data-branding-boolean="${key}"]`)?.checked;
    }
    return core?.normalize ? core.normalize(config) : config;
  }

  function setImagePreview(key, url = "") {
    const preview = document.querySelector(`[data-branding-image-preview="${key}"]`);
    if (!preview) return;
    preview.replaceChildren();
    const candidate = String(url || "");
    const safeUrl = candidate.startsWith("blob:") && Object.values(state.localPreviewUrls).includes(candidate)
      ? candidate
      : window.LoginBrandingCore?.safeDisplayUrl?.(candidate) || "";
    if (!safeUrl) {
      const empty = document.createElement("span");
      empty.textContent = "No image selected";
      preview.append(empty);
      return;
    }
    const image = document.createElement("img");
    image.alt = `${key} preview`;
    image.src = safeUrl;
    image.addEventListener("error", () => {
      preview.replaceChildren();
      const errorText = document.createElement("span");
      errorText.textContent = "Image could not be loaded; the safe fallback will be used.";
      preview.append(errorText);
    }, { once: true });
    preview.append(image);
  }

  function inferStoragePath(url = "") {
    const marker = "/hotel-assets/";
    const value = String(url || "");
    const index = value.indexOf(marker);
    if (index < 0) return "";
    try {
      return decodeURIComponent(value.slice(index + marker.length)).replace(/^\/+/, "");
    } catch {
      return "";
    }
  }

  function populateConfig(source = {}) {
    const config = window.LoginBrandingCore?.normalize?.(source) || source;
    for (const key of ALL_TEXT_KEYS) {
      const input = document.querySelector(`[data-branding-field="${key}"]`);
      if (input) input.value = String(config[key] ?? "");
    }
    for (const [key] of BOOLEAN_FIELDS) {
      const input = document.querySelector(`[data-branding-boolean="${key}"]`);
      if (input) input.checked = config[key] !== false;
    }
    for (const [key] of COLOR_FIELDS) {
      const picker = document.querySelector(`[data-branding-color-picker="${key}"]`);
      if (picker && /^#[0-9a-fA-F]{6}$/.test(config[key] || "")) picker.value = config[key];
    }
    for (const [key] of IMAGE_FIELDS) {
      state.storagePaths[key] = inferStoragePath(config[key]);
      setImagePreview(key, config[key]);
    }
    updatePreview();
  }

  function updatePreview() {
    const preview = document.querySelector("[data-branding-preview]");
    if (!preview) return;
    const config = collectConfig();
    const textKeys = [
      "companyName", "shortProductLabel", "welcomeBadge", "welcomeHeading", "welcomeSubheading",
      "description", "tagline", "serviceSectionHeading", "loginBadgeText", "loginHeading",
      "loginDescription", "hotelSlugLabel", "hotelSlugPlaceholder", "staffPinLabel",
      "staffPinPlaceholder", "loginButtonText", "footerCompanyName", "copyrightText", "legalText"
    ];
    for (const key of textKeys) {
      preview.querySelectorAll(`[data-preview="${key}"]`).forEach((element) => {
        element.textContent = config[key] || "";
        if (key === "legalText") element.hidden = !config[key];
      });
    }
    preview.style.setProperty("--preview-bg", config.backgroundColor);
    preview.style.setProperty("--preview-card", config.cardColor);
    preview.style.setProperty("--preview-text", config.textColor);
    preview.style.setProperty("--preview-primary", config.primaryColor);
    preview.style.setProperty("--preview-secondary", config.secondaryColor);
    preview.style.setProperty("--preview-accent", config.accentColor);

    const logo = preview.querySelector("[data-preview-logo]");
    if (logo) {
      logo.replaceChildren();
      const logoUrl = window.LoginBrandingCore?.safeDisplayUrl?.(config.logoUrl) || "";
      if (logoUrl) {
        const image = document.createElement("img");
        image.alt = config.logoAlt || "Logo preview";
        image.src = logoUrl;
        image.addEventListener("error", () => {
          logo.textContent = String(config.shortCompanyName || config.companyName || "A").slice(0, 1).toUpperCase();
        }, { once: true });
        logo.append(image);
      } else {
        logo.textContent = String(config.shortCompanyName || config.companyName || "A").slice(0, 1).toUpperCase();
      }
    }
    const services = {
      hotel: ["enableHotelService", "hotelServiceLabel"],
      restaurant: ["enableRestaurantService", "restaurantServiceLabel"],
      transport: ["enableTransportService", "transportServiceLabel"]
    };
    for (const [service, [enabledKey, labelKey]] of Object.entries(services)) {
      const element = preview.querySelector(`[data-preview-service="${service}"]`);
      if (element) {
        element.hidden = !config[enabledKey];
        element.textContent = config[labelKey] || "";
      }
    }
    const terms = preview.querySelector("[data-preview-terms]");
    const privacy = preview.querySelector("[data-preview-privacy]");
    if (terms) terms.hidden = !window.LoginBrandingCore?.safeLegalUrl?.(config.termsUrl);
    if (privacy) privacy.hidden = !window.LoginBrandingCore?.safeLegalUrl?.(config.privacyUrl);
  }

  function selectTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll("[data-branding-tab]").forEach((button) => {
      const selected = button.dataset.brandingTab === tab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".login-branding-panel").forEach((panel) => {
      panel.hidden = panel.id !== `loginBrandingPanel-${tab}`;
    });
    if (tab === "preview") updatePreview();
  }

  function refreshHotelOptions() {
    const target = document.getElementById("loginBrandingHotelSlugInput");
    const source = document.getElementById("hotelFilter");
    if (!target || !source) return;
    const current = target.value;
    target.replaceChildren(new Option("Choose a hotel", ""));
    Array.from(source.options).forEach((option) => {
      if (!option.value) return;
      target.append(new Option(option.textContent || option.value, option.value));
    });
    if (Array.from(target.options).some((option) => option.value === current)) target.value = current;
    else if (source.value && Array.from(target.options).some((option) => option.value === source.value)) target.value = source.value;
  }

  async function loadBranding() {
    const scope = getScope();
    setBusy(true);
    setStatus("Loading branding…");
    try {
      const query = new URLSearchParams(scope);
      const payload = await request(`?${query.toString()}`);
      populateConfig(payload.branding?.draftConfig || window.LoginBrandingCore?.fallback || {});
      state.loaded = true;
      setStatus(`Loaded ${scope.scopeType === "platform" ? "platform default" : scope.hotelSlug} branding. Version ${payload.branding?.version || 0}.`, "success");
    } catch (error) {
      setStatus(error.message || "Failed to load branding", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const scope = getScope();
    const config = collectConfig();
    setBusy(true);
    setStatus("Saving draft…");
    try {
      await request("", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scope, config })
      });
      state.loaded = true;
      setStatus("Branding draft saved. Public login remains unchanged until Publish.", "success");
    } catch (error) {
      setStatus(error.message || "Failed to save draft", "error");
    } finally {
      setBusy(false);
    }
  }

  async function publishBranding() {
    const scope = getScope();
    if (!state.loaded) {
      setStatus("Save or load this scope before publishing.", "error");
      return;
    }
    setBusy(true);
    setStatus("Publishing saved draft…");
    try {
      const payload = await request("/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope)
      });
      setStatus(`Branding published successfully. Version ${payload.version || "updated"}.`, "success");
    } catch (error) {
      setStatus(error.message || "Failed to publish branding", "error");
    } finally {
      setBusy(false);
    }
  }

  async function resetBranding() {
    const scope = getScope();
    const label = scope.scopeType === "hotel" ? scope.hotelSlug : "the platform default";
    if (!window.confirm(`Reset login branding for ${label}?`)) return;
    setBusy(true);
    setStatus("Resetting branding…");
    try {
      await request("/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope)
      });
      state.storagePaths = {};
      populateConfig(window.LoginBrandingCore?.fallback || {});
      state.loaded = true;
      setStatus(scope.scopeType === "hotel" ? "Hotel branding reset to platform fallback." : "Platform branding reset to built-in defaults.", "success");
    } catch (error) {
      setStatus(error.message || "Failed to reset branding", "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(key) {
    const fileInput = document.querySelector(`[data-branding-image-file="${key}"]`);
    const file = fileInput?.files?.[0];
    if (!file) {
      setStatus("Choose an image before uploading.", "error");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setStatus("Use a PNG, JPG, JPEG, or WebP image no larger than 4 MB.", "error");
      return;
    }
    const scope = getScope();
    const formData = new FormData();
    formData.append("scopeType", scope.scopeType);
    if (scope.hotelSlug) formData.append("hotelSlug", scope.hotelSlug);
    formData.append("imageType", fileInput.dataset.imageType);
    formData.append("file", file);
    setBusy(true);
    setStatus(`Uploading ${file.name}…`);
    try {
      const payload = await request("/image", { method: "POST", body: formData });
      const urlInput = document.querySelector(`[data-branding-field="${key}"]`);
      if (urlInput) urlInput.value = payload.image?.publicUrl || "";
      state.storagePaths[key] = payload.image?.storagePath || "";
      setImagePreview(key, payload.image?.publicUrl || "");
      updatePreview();
      setStatus("Image uploaded to the selected branding scope. Save the draft to use it.", "success");
    } catch (error) {
      setStatus(error.message || "Failed to upload image", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(key) {
    const input = document.querySelector(`[data-branding-field="${key}"]`);
    const storagePath = state.storagePaths[key] || inferStoragePath(input?.value);
    if (!storagePath) {
      if (input) input.value = "";
      setImagePreview(key, "");
      updatePreview();
      setStatus("Image URL cleared locally. Save the draft to keep the change.", "success");
      return;
    }
    if (!window.confirm("Remove this scope-owned branding image?")) return;
    const scope = getScope();
    setBusy(true);
    setStatus("Removing image…");
    try {
      await request("/image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scope, storagePath })
      });
      state.storagePaths[key] = "";
      if (input) input.value = "";
      setImagePreview(key, "");
      updatePreview();
      setStatus("Image removed and its draft reference cleared.", "success");
    } catch (error) {
      setStatus(error.message || "Failed to remove image", "error");
    } finally {
      setBusy(false);
    }
  }

  function handleSectionClick(event) {
    const tabButton = event.target.closest("[data-branding-tab]");
    if (tabButton) {
      selectTab(tabButton.dataset.brandingTab);
      return;
    }
    const deviceButton = event.target.closest("[data-branding-device]");
    if (deviceButton) {
      state.device = deviceButton.dataset.brandingDevice;
      document.querySelector("[data-branding-preview]")?.setAttribute("data-device", state.device);
      document.querySelectorAll("[data-branding-device]").forEach((button) => button.setAttribute("aria-pressed", button === deviceButton ? "true" : "false"));
      return;
    }
    if (event.target.closest("[data-branding-load]")) void loadBranding();
    else if (event.target.closest("[data-branding-publish]")) void publishBranding();
    else if (event.target.closest("[data-branding-reset]")) void resetBranding();
    else if (event.target.closest("[data-branding-open-preview]")) {
      selectTab("preview");
      document.getElementById("loginBrandingPanel-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const uploadButton = event.target.closest("[data-branding-upload]");
      const removeButton = event.target.closest("[data-branding-remove]");
      if (uploadButton) void uploadImage(uploadButton.dataset.brandingUpload);
      if (removeButton) void removeImage(removeButton.dataset.brandingRemove);
    }
  }

  function bindSection(section) {
    section.addEventListener("click", handleSectionClick);
    section.addEventListener("input", (event) => {
      const picker = event.target.closest("[data-branding-color-picker]");
      if (picker) {
        const textInput = document.querySelector(`[data-branding-field="${picker.dataset.brandingColorPicker}"]`);
        if (textInput) textInput.value = picker.value;
      }
      const textColor = event.target.closest("[data-branding-field$='Color']");
      if (textColor && /^#[0-9a-fA-F]{6}$/.test(textColor.value)) {
        const key = textColor.dataset.brandingField;
        const colorPicker = document.querySelector(`[data-branding-color-picker="${key}"]`);
        if (colorPicker) colorPicker.value = textColor.value;
      }
      updatePreview();
    });
    section.addEventListener("change", (event) => {
      const fileInput = event.target.closest("[data-branding-image-file]");
      if (fileInput) {
        const key = fileInput.dataset.brandingImageFile;
        if (state.localPreviewUrls[key]) URL.revokeObjectURL(state.localPreviewUrls[key]);
        const file = fileInput.files?.[0];
        state.localPreviewUrls[key] = file ? URL.createObjectURL(file) : "";
        setImagePreview(key, state.localPreviewUrls[key]);
      }
      updatePreview();
    });
    section.querySelector("#loginBrandingForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void saveDraft();
    });
    section.querySelector("#loginBrandingScopeTypeInput")?.addEventListener("change", (event) => {
      const hotelInput = document.getElementById("loginBrandingHotelSlugInput");
      if (hotelInput) hotelInput.disabled = event.target.value !== "hotel";
      state.loaded = false;
      setStatus("Scope changed. Load branding before editing or publishing.");
    });
  }

  function initialize() {
    const dashboard = document.getElementById("adminDashboardWrap");
    const toolbar = document.querySelector(".admin-toolbar-actions");
    if (!dashboard || !toolbar || getSection()) return;

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.id = "openLoginBrandingBtn";
    openButton.className = "admin-tab";
    openButton.textContent = "Login Page Branding";
    toolbar.append(openButton);

    dashboard.insertAdjacentHTML("beforeend", sectionMarkup());
    const section = getSection();
    bindSection(section);
    populateConfig(window.LoginBrandingCore?.fallback || {});
    selectTab("content");

    openButton.addEventListener("click", () => {
      section.hidden = !section.hidden;
      if (!section.hidden) {
        refreshHotelOptions();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        if (!state.loaded) void loadBranding();
      }
    });
    document.getElementById("hotelFilter")?.addEventListener("change", refreshHotelOptions);
    window.addEventListener("beforeunload", () => {
      Object.values(state.localPreviewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
