/* ═══════════════════════════════════════════════════════ 
   HOTEL PLATFORM — MAIN JAVASCRIPT
   Existing UI + Food Cart + Event Booking + WhatsApp Flow
   ═══════════════════════════════════════════════════════ */

"use strict";

/* ── Helpers ─────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
let USER_LOCATION = "Not shared";

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function createRafThrottled(callback) {
  let frameId = 0;

  return (...args) => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      callback(...args);
    });
  };
}

function getSafePublicNavigationUrl(value = "") {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";
  if (candidate.startsWith("#")) return candidate;

  try {
    const parsedUrl = new URL(candidate, window.location.href);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.href : "";
  } catch {
    return "";
  }
}

function getPublicNotificationMessage(value, fallback = "Something went wrong. Please try again.") {
  const message = String(value || "").trim().slice(0, 3000);
  if (!message) return "";

  const containsInternalDetail =
    /(?:\bat\s+(?:async\s+)?[\w$.<>]+\s*\(|[a-z]:\\|\/(?:home|var|usr)\/|postgres|supabase|sqlstate|stack\s*trace|jwt[_ -]?secret|service[_ -]?role|api[_ -]?key)/i.test(
      message
    );

  return containsInternalDetail ? fallback : message;
}

function getRuntimeBooleanConfig(key, fallback = false) {
  const value = window.APP_RUNTIME_CONFIG?.[key];

  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return fallback;
}

function getRuntimeTextConfig(key, fallback = "") {
  const value = window.APP_RUNTIME_CONFIG?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getDefaultBackendBaseUrl() {
  const hostname = window.location.hostname;
  const isLocalHost =
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");
  const baseUrl =
    isLocalHost || !window.location.origin || window.location.origin === "null"
      ? `http://${hostname || "localhost"}:5000`
      : window.location.origin;

  return baseUrl.replace(/\/+$/, "");
}

let CONFIG = {
  HOTEL_NAME: "",
  OWNER_WHATSAPP_NUMBER: "",
  OWNER_UPI_ID: "",
  GST_PERCENT: 5,
  DEFAULT_UPI_DISCOUNT_PERCENT: 10,
  PAYMENT_GATEWAY_ENABLED: getRuntimeBooleanConfig("PAYMENT_GATEWAY_ENABLED", false),
  PAYMENT_GATEWAY_PROVIDER: getRuntimeTextConfig("PAYMENT_GATEWAY_PROVIDER", "razorpay"),
  PAYMENT_GATEWAY_CHECKOUT_ENABLED: getRuntimeBooleanConfig(
    "PAYMENT_GATEWAY_CHECKOUT_ENABLED",
    false
  ),
  PAYMENT_GATEWAY_SCRIPT_URL: getRuntimeTextConfig(
    "PAYMENT_GATEWAY_SCRIPT_URL",
    "https://checkout.razorpay.com/v1/checkout.js"
  ),
  // API_BASE_URL: "http://127.0.0.1:5000"
  API_BASE_URL:
  window.APP_RUNTIME_CONFIG?.BACKEND_BASE_URL || getDefaultBackendBaseUrl()
};
const ALLOW_ORDER_WHATSAPP_FALLBACK_ON_SAVE_FAILURE = getRuntimeBooleanConfig(
  "ALLOW_ORDER_WHATSAPP_FALLBACK_ON_SAVE_FAILURE",
  true
);
const OPEN_WHATSAPP_AFTER_VERIFIED_ONLINE_PAYMENT = getRuntimeBooleanConfig(
  "OPEN_WHATSAPP_AFTER_VERIFIED_ONLINE_PAYMENT",
  false
);
let PAYMENT_GATEWAY_READINESS = null;
let paymentGatewayReadinessPromise = null;

const DEFAULT_THEME_BRIDGE = {
  "--gold": "#c9a84c",
  "--gold-light": "#e8d08a",
  "--gold-dark": "#a07830",
  "--cream": "#fbf8f3",
  "--cream-dark": "#f3ede3",
  "--text": "#333333",
  "--text-muted": "#6b6b6b",
  "--font-display": "\"Cormorant Garamond\", Georgia, serif",
  "--font-body": "\"Jost\", sans-serif",
  "--radius": "16px",
  "--radius-sm": "8px",
  "--container-max": "1280px",
  "--btn-radius": "100px",
  "--btn-primary-bg": "linear-gradient(135deg, var(--gold-dark), var(--gold))",
  "--btn-primary-border": "1px solid transparent",
  "--btn-primary-shadow": "0 4px 20px rgba(201, 168, 76, 0.35)",
  "--btn-primary-shadow-hover": "0 8px 30px rgba(201, 168, 76, 0.45)",
  "--btn-outline-border": "1.5px solid rgba(255, 255, 255, 0.6)",
  "--btn-outline-hover-border": "var(--white)",
  "--btn-outline-hover-bg": "rgba(255, 255, 255, 0.08)"
};

const THEME_FONT_PRESETS = {
  default: {
    display: "\"Cormorant Garamond\", Georgia, serif",
    body: "\"Jost\", sans-serif"
  },
  system: {
    display: "Georgia, serif",
    body: "system-ui, sans-serif"
  }
};

const THEME_CONTAINER_PRESETS = {
  compact: "1120px",
  default: "1280px",
  wide: "1440px"
};

const THEME_BUTTON_PRESETS = {
  default: {
    "--btn-radius": "100px",
    "--btn-primary-bg": "linear-gradient(135deg, var(--gold-dark), var(--gold))",
    "--btn-primary-border": "1px solid transparent",
    "--btn-primary-shadow": "0 4px 20px rgba(201, 168, 76, 0.35)",
    "--btn-primary-shadow-hover": "0 8px 30px rgba(201, 168, 76, 0.45)",
    "--btn-outline-border": "1.5px solid rgba(255, 255, 255, 0.6)",
    "--btn-outline-hover-border": "var(--white)",
    "--btn-outline-hover-bg": "rgba(255, 255, 255, 0.08)"
  },
  solid: {
    "--btn-radius": "14px",
    "--btn-primary-bg": "var(--gold)",
    "--btn-primary-border": "1px solid var(--gold-dark)",
    "--btn-primary-shadow": "0 4px 16px rgba(201, 168, 76, 0.28)",
    "--btn-primary-shadow-hover": "0 8px 24px rgba(201, 168, 76, 0.36)",
    "--btn-outline-border": "1px solid var(--gold)",
    "--btn-outline-hover-border": "var(--gold)",
    "--btn-outline-hover-bg": "rgba(201, 168, 76, 0.12)"
  },
  crisp: {
    "--btn-radius": "8px",
    "--btn-primary-bg": "linear-gradient(135deg, var(--gold), var(--gold-light))",
    "--btn-primary-border": "1px solid var(--gold-dark)",
    "--btn-primary-shadow": "0 4px 18px rgba(160, 120, 48, 0.28)",
    "--btn-primary-shadow-hover": "0 8px 26px rgba(160, 120, 48, 0.4)",
    "--btn-outline-border": "1.5px solid rgba(255, 255, 255, 0.75)",
    "--btn-outline-hover-border": "var(--gold-light)",
    "--btn-outline-hover-bg": "rgba(255, 255, 255, 0.14)"
  }
};

const THEME_HERO_LAYOUT_CLASSNAMES = [
  "hero-layout-split",
  "hero-layout-stacked"
];

function getMenuData() {
  return window.APP_STATE?.menu || {};
}

function getMenuCategoryRecords() {
  const records = Array.isArray(window.APP_STATE?.menuCategories)
    ? window.APP_STATE.menuCategories
    : [];
  const isQrOrder = String(getActiveOrderContext()?.orderSource || "").toLowerCase() === "qr";
  return records.filter((category) =>
    category && category.isActive !== false && category.isPublished !== false &&
    category.websiteEnabled !== false && (!isQrOrder || category.qrEnabled !== false)
  );
}

function getMenuCategories() {
  const categoryKeys = getMenuCategoryRecords().map((category) => category.key).filter(Boolean);
  return categoryKeys.length ? categoryKeys : Object.keys(getMenuData());
}

function getMenuCategoryRecord(categoryKey = "") {
  return getMenuCategoryRecords().find((category) => category.key === categoryKey) || null;
}

function getMenuItemsByCategory(category) {
  const menuData = getMenuData();
  return Array.isArray(menuData[category]) ? menuData[category] : [];
}

function getCurrentMenuCategory() {
  const gridCategory = $("#menuGrid")?.dataset.activeCategory;
  if (gridCategory && getMenuCategories().includes(gridCategory)) return gridCategory;

  const activeTabCategory = $(".menu-tab.active")?.dataset.cat;
  if (activeTabCategory && getMenuCategories().includes(activeTabCategory)) return activeTabCategory;

  return getMenuCategories()[0] || "";
}

function applyHotelConfigFromState() {
  const hotel = window.APP_STATE?.hotel;
  if (!hotel) return;

  CONFIG = {
    HOTEL_NAME: hotel.hotelName || "",
    OWNER_WHATSAPP_NUMBER: hotel.ownerWhatsAppNumber || "",
    OWNER_UPI_ID: hotel.ownerUpiId || "",
    GST_PERCENT: Number(hotel.gstPercent || 5),
    DEFAULT_UPI_DISCOUNT_PERCENT: 10,
    PAYMENT_GATEWAY_ENABLED: getRuntimeBooleanConfig("PAYMENT_GATEWAY_ENABLED", false),
    PAYMENT_GATEWAY_PROVIDER: getRuntimeTextConfig("PAYMENT_GATEWAY_PROVIDER", "razorpay"),
    PAYMENT_GATEWAY_CHECKOUT_ENABLED: getRuntimeBooleanConfig(
      "PAYMENT_GATEWAY_CHECKOUT_ENABLED",
      false
    ),
    PAYMENT_GATEWAY_SCRIPT_URL: getRuntimeTextConfig(
      "PAYMENT_GATEWAY_SCRIPT_URL",
      "https://checkout.razorpay.com/v1/checkout.js"
    ),
    // API_BASE_URL: "http://127.0.0.1:5000"
    API_BASE_URL:
  window.APP_RUNTIME_CONFIG?.BACKEND_BASE_URL || getDefaultBackendBaseUrl()
  };
  PAYMENT_GATEWAY_READINESS = null;
  paymentGatewayReadinessPromise = null;
}

function getActiveHotelName() {
  const configuredHotelName =
    typeof CONFIG?.HOTEL_NAME === "string" ? CONFIG.HOTEL_NAME.trim() : "";

  if (configuredHotelName) {
    return configuredHotelName;
  }

  const stateHotelName =
    typeof window.APP_STATE?.hotel?.hotelName === "string"
      ? window.APP_STATE.hotel.hotelName.trim()
      : "";

  return stateHotelName;
}

const DEFAULT_PUBLIC_ORDERING_STATE = Object.freeze({
  customerOrderingEnabled: true,
  staffOrderingEnabled: true,
  whatsappOrderingEnabled: true,
  secureOnlinePaymentEnabled: true,
  cashOnDeliveryEnabled: true,
  manualUpiPaymentEnabled: true,
  title: "",
  message: "",
  buttonText: "",
  buttonLink: "",
  icon: ""
});

function normalizeOrderingUiText(value = "", maxLength = 300) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength)
    : "";
}

function normalizeOrderingUiLink(value = "") {
  const candidate = normalizeOrderingUiText(value, 2000);

  if (!candidate) {
    return "";
  }

  if (candidate.startsWith("/")) {
    return candidate;
  }

  try {
    const parsedUrl = new URL(candidate, window.location.origin);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.toString() : "";
  } catch {
    return "";
  }
}

function normalizeOrderingState(rawOrdering = null) {
  if (!rawOrdering || typeof rawOrdering !== "object" || Array.isArray(rawOrdering)) {
    return { ...DEFAULT_PUBLIC_ORDERING_STATE };
  }

  return {
    customerOrderingEnabled: rawOrdering.customerOrderingEnabled !== false,
    staffOrderingEnabled: rawOrdering.staffOrderingEnabled !== false,
    whatsappOrderingEnabled: rawOrdering.whatsappOrderingEnabled !== false,
    secureOnlinePaymentEnabled: rawOrdering.secureOnlinePaymentEnabled !== false,
    cashOnDeliveryEnabled: rawOrdering.cashOnDeliveryEnabled !== false,
    manualUpiPaymentEnabled: rawOrdering.manualUpiPaymentEnabled !== false,
    title: normalizeOrderingUiText(rawOrdering.title, 160),
    message: normalizeOrderingUiText(rawOrdering.message, 1000),
    buttonText: normalizeOrderingUiText(rawOrdering.buttonText, 120),
    buttonLink: normalizeOrderingUiLink(rawOrdering.buttonLink),
    icon: normalizeOrderingUiText(rawOrdering.icon, 40)
  };
}

function getHotelOrderingState() {
  return normalizeOrderingState(
    window.APP_STATE?.ordering || window.APP_STATE?.hotel?.ordering || null
  );
}

function updateHotelOrderingState(nextOrdering = null) {
  const normalizedOrdering = normalizeOrderingState(nextOrdering);

  if (window.APP_STATE) {
    window.APP_STATE.ordering = normalizedOrdering;

    if (window.APP_STATE.hotel && typeof window.APP_STATE.hotel === "object") {
      window.APP_STATE.hotel.ordering = normalizedOrdering;
    }
  }

  return normalizedOrdering;
}

function isCustomerOrderingEnabled() {
  return getHotelOrderingState().customerOrderingEnabled !== false;
}

function isWhatsAppOrderingEnabled() {
  return getHotelOrderingState().whatsappOrderingEnabled !== false;
}

function buildOrderingUnavailableWhatsAppLink() {
  if (!isWhatsAppOrderingEnabled()) {
    return "";
  }

  const cleanedPhone = cleanPhone(CONFIG.OWNER_WHATSAPP_NUMBER);

  if (!cleanedPhone) {
    return "";
  }

  const hotelName =
    normalizeOrderingUiText(window.APP_STATE?.hotel?.name || CONFIG.HOTEL_NAME, 120) ||
    "the restaurant";

  return ownerWhatsAppLink(`Hi, I want to place an order with ${hotelName}.`);
}

function getOrderingUnavailableActionLabel() {
  const ordering = getHotelOrderingState();
  return (
    ordering.buttonText ||
    (buildOrderingUnavailableWhatsAppLink() ? "WhatsApp to Order" : "Online Ordering Unavailable")
  );
}

function getOrderingUnavailableModalConfig(override = null) {
  const baseOrdering = getHotelOrderingState();
  const nextOrdering = override
    ? normalizeOrderingState({ ...baseOrdering, ...override })
    : baseOrdering;
  const fallbackWhatsAppLink =
    nextOrdering.whatsappOrderingEnabled !== false
      ? buildOrderingUnavailableWhatsAppLink()
      : "";
  const buttonLink = nextOrdering.buttonLink || fallbackWhatsAppLink;
  const buttonText = nextOrdering.buttonText || (buttonLink ? "WhatsApp Us" : "");

  return {
    title: nextOrdering.title || "Online Ordering is Currently Unavailable",
    message:
      nextOrdering.message ||
      "We're unable to receive online orders right now. Please visit the restaurant or contact us directly.",
    buttonText,
    buttonLink,
    icon: nextOrdering.icon || ""
  };
}

function isOrderingDisabledApiError(error) {
  return String(error?.response?.code || "").trim().toUpperCase() === "ORDERING_DISABLED";
}

function normalizeOrderContextText(value = "", maxLength = 80) {
  const text = typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim()
    : "";
  return text.slice(0, maxLength);
}

function getActiveOrderContext(rawContext = window.APP_STATE?.orderContext || {}) {
  const context = rawContext || {};
  const tableNumber = normalizeOrderContextText(context.tableNumber, 80);
  const orderType =
    typeof context.orderType === "string" && context.orderType.trim()
      ? normalizeOrderContextText(context.orderType, 40)
      : tableNumber
        ? "dine-in"
        : "standard";
  const orderSource =
    typeof context.orderSource === "string" && context.orderSource.trim()
      ? normalizeOrderContextText(context.orderSource, 40)
      : tableNumber
        ? "qr"
        : "website";
  const addToOrderId = normalizeOrderContextText(
    context.addToOrderId || context.addToOrder || context.parentOrderId,
    120,
  );
  const addToken = normalizeOrderContextText(
    context.addToken || context.trackingToken,
    200,
  );
  const qrContextToken = normalizeOrderContextText(
    context.qrContextToken || context.qctx,
    2000,
  );

  const opaqueQrToken = normalizeOrderContextText(context.opaqueQrToken, 200);
  const qrCsrfToken = normalizeOrderContextText(context.qrCsrfToken, 200);
  const qrSessionVersion = Math.max(1, Number(context.qrSessionVersion || 1));
  const secureQr = context.secureQr === true && !!opaqueQrToken;

  return {
    orderType,
    tableNumber,
    orderSource,
    qrContextToken,
    addToOrderId,
    opaqueQrToken,
    qrCsrfToken,
    qrSessionVersion,
    secureQr,
    addToken
  };
}

function hasDineInOrderContext(context = getActiveOrderContext()) {
  return context.orderType === "dine-in" && !!context.tableNumber;
}

function hasActiveOrderAddonContext(context = getActiveOrderContext()) {
  return hasDineInOrderContext(context) && !!context.addToOrderId && !!context.addToken;
}

function getEffectiveCustomerAddress(value, context = getActiveOrderContext()) {
  const address = typeof value === "string" ? value.trim() : "";
  if (address || !hasDineInOrderContext(context)) return address;

  return `Dine-in table ${context.tableNumber}`;
}

function syncOrderContextUI() {
  const checkoutForm = document.getElementById("checkoutForm");
  if (!checkoutForm) return;

  const context = getActiveOrderContext();
  let notice = document.getElementById("orderContextNotice");
  const addressField = document.getElementById("orderAddressField");
  const addressInput = document.getElementById("orderAddress");
  const addressLabel = document.querySelector('label[for="orderAddress"]');

  checkoutForm.dataset.orderType = context.orderType;
  checkoutForm.dataset.orderSource = context.orderSource;
  checkoutForm.dataset.tableNumber = context.tableNumber;
  checkoutForm.dataset.addToOrderId = context.addToOrderId || "";

  if (addressInput && !addressInput.dataset.originalPlaceholder) {
    addressInput.dataset.originalPlaceholder =
      addressInput.getAttribute("placeholder") || "";
  }

  if (addressLabel && !addressLabel.dataset.originalText) {
    addressLabel.dataset.originalText = addressLabel.textContent || "";
  }

  if (!hasDineInOrderContext(context)) {
    if (notice) notice.remove();
    if (addressField) {
      addressField.hidden = false;
    }
    if (addressInput) {
      if (!addressInput.value && addressInput.dataset.websiteValue) {
        addressInput.value = addressInput.dataset.websiteValue;
      }
      addressInput.required = true;
      addressInput.placeholder =
        addressInput.dataset.originalPlaceholder || "Enter full address";
    }
    if (addressLabel) {
      addressLabel.textContent =
        addressLabel.dataset.originalText || "Delivery Address *";
    }
    return;
  }

  if (addressField) {
    addressField.hidden = true;
  }

  if (addressInput) {
    if (addressInput.value) {
      addressInput.dataset.websiteValue = addressInput.value;
    }
    addressInput.value = "";
    addressInput.required = false;
    addressInput.placeholder = `Optional note for table ${context.tableNumber}`;
  }

  if (addressLabel) {
    addressLabel.textContent = "Table Note / Address (optional)";
  }

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "orderContextNotice";
    notice.className = "order-context-notice";
    notice.setAttribute("aria-live", "polite");
    checkoutForm.prepend(notice);
  }

  const isAddonContext = hasActiveOrderAddonContext(context);

  notice.innerHTML = `
    <span class="order-context-kicker">${isAddonContext ? "Adding to active table order" : "Dine-in QR order"}</span>
    <strong>Table ${escapeHTML(context.tableNumber)}</strong>
    <small>${isAddonContext ? `New items will be saved as an add-on for order #${escapeHTML(context.addToOrderId)}.` : "We detected this table link. Delivery address is hidden for dine-in ordering, and you can still add a special note below."}</small>
  `;
}

function clearCheckoutAddressState(form = document.getElementById("checkoutForm")) {
  const checkoutForm = form || document.getElementById("checkoutForm");
  if (!checkoutForm) return;

  const addressInput = checkoutForm.querySelector("#orderAddress");
  if (addressInput?.dataset) {
    delete addressInput.dataset.websiteValue;
  }

  syncOrderContextUI();
}

function syncTableCartResumeNotice() {
  const existingNotice = document.getElementById("tableCartResumeNotice");
  const context = getActiveOrderContext();
  const hasActiveTableCart =
    hasDineInOrderContext(context) && Array.isArray(CART) && CART.length > 0;

  if (!hasActiveTableCart) {
    if (existingNotice) existingNotice.remove();
    return;
  }

  const menuSection = document.getElementById("menu");
  const anchor =
    menuSection?.querySelector(".menu-cart-toolbar") ||
    menuSection?.querySelector("#menuGrid") ||
    menuSection?.querySelector(".menu-tabs");

  if (!menuSection || !anchor?.parentElement) return;

  const totalQty = CART.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const itemLabel = totalQty === 1 ? "item" : "items";
  let notice = existingNotice;

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "tableCartResumeNotice";
    notice.className = "table-cart-resume-notice";
    notice.setAttribute("aria-live", "polite");
  }

  notice.innerHTML = `
    <span class="order-context-kicker">Active table cart</span>
    <strong>Table ${escapeHTML(context.tableNumber)} - ${totalQty} ${itemLabel} ready</strong>
    <small>This cart is saved only for this table on this browser. It clears after checkout or when it becomes stale.</small>
  `;

  anchor.parentElement.insertBefore(notice, anchor);
}

function getValidThemeColor(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";

  if (window.CSS && typeof window.CSS.supports === "function") {
    return window.CSS.supports("color", candidate) ? candidate : "";
  }

  return candidate;
}

function getValidThemeRadius(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";

  if (window.CSS && typeof window.CSS.supports === "function") {
    return window.CSS.supports("border-radius", candidate) ? candidate : "";
  }

  return candidate;
}

function getThemeFontPreset(value) {
  const presetKey = typeof value === "string" ? value.trim().toLowerCase() : "";
  return THEME_FONT_PRESETS[presetKey] || THEME_FONT_PRESETS.default;
}

function getThemeContainerMax(value) {
  const presetKey = typeof value === "string" ? value.trim().toLowerCase() : "";
  return THEME_CONTAINER_PRESETS[presetKey] || THEME_CONTAINER_PRESETS.default;
}

function getThemeButtonPreset(value) {
  const presetKey = typeof value === "string" ? value.trim().toLowerCase() : "";
  return THEME_BUTTON_PRESETS[presetKey] || THEME_BUTTON_PRESETS.default;
}

function getThemeHeroLayoutVariant(value) {
  const presetKey = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (presetKey === "split" || presetKey === "stacked") {
    return presetKey;
  }

  return "default";
}

function applyHeroLayoutVariantFromState() {
  const layoutVariant = getThemeHeroLayoutVariant(window.APP_STATE?.theme?.hero?.layoutVariant);
  const heroSection = document.getElementById("hero");

  document.body.dataset.heroLayoutVariant = layoutVariant;

  THEME_HERO_LAYOUT_CLASSNAMES.forEach((className) => {
    document.body.classList.toggle(className, className === `hero-layout-${layoutVariant}`);
  });

  if (!heroSection) return;

  heroSection.dataset.heroLayoutVariant = layoutVariant;

  THEME_HERO_LAYOUT_CLASSNAMES.forEach((className) => {
    heroSection.classList.toggle(className, className === `hero-layout-${layoutVariant}`);
  });
}

function applyThemeFromState() {
  const root = document.documentElement;
  const themeColors = window.APP_STATE?.theme?.colors || {};
  const themeRadius = window.APP_STATE?.theme?.radius || {};
  const themeTypography = window.APP_STATE?.theme?.typography || {};
  const themeLayout = window.APP_STATE?.theme?.layout || {};
  const themeButtons = window.APP_STATE?.theme?.buttons || {};
  const fontPreset = getThemeFontPreset(themeTypography.preset);
  const buttonPreset = getThemeButtonPreset(themeButtons.preset);

  if (!root) return;

  const bridge = {
    "--gold": getValidThemeColor(themeColors.primary) || DEFAULT_THEME_BRIDGE["--gold"],
    "--gold-light":
      getValidThemeColor(themeColors.primaryLight) ||
      DEFAULT_THEME_BRIDGE["--gold-light"],
    "--gold-dark":
      getValidThemeColor(themeColors.primaryDark) ||
      DEFAULT_THEME_BRIDGE["--gold-dark"],
    "--cream":
      getValidThemeColor(themeColors.background) || DEFAULT_THEME_BRIDGE["--cream"],
    "--cream-dark":
      getValidThemeColor(themeColors.backgroundAlt) ||
      DEFAULT_THEME_BRIDGE["--cream-dark"],
    "--text":
      getValidThemeColor(themeColors.text) || DEFAULT_THEME_BRIDGE["--text"],
    "--text-muted":
      getValidThemeColor(themeColors.textMuted) ||
      DEFAULT_THEME_BRIDGE["--text-muted"],
    "--font-display": fontPreset.display || DEFAULT_THEME_BRIDGE["--font-display"],
    "--font-body": fontPreset.body || DEFAULT_THEME_BRIDGE["--font-body"],
    "--radius":
      getValidThemeRadius(themeRadius.base) || DEFAULT_THEME_BRIDGE["--radius"],
    "--radius-sm":
      getValidThemeRadius(themeRadius.small) ||
      DEFAULT_THEME_BRIDGE["--radius-sm"],
    "--container-max":
      getThemeContainerMax(themeLayout.containerPreset) ||
      DEFAULT_THEME_BRIDGE["--container-max"]
  };

  Object.assign(bridge, buttonPreset);

  Object.entries(bridge).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

function getLoaderFallbackText(el) {
  if (!el) return "";

  if (!el.dataset.fallbackText) {
    el.dataset.fallbackText = el.textContent || "";
  }

  return el.dataset.fallbackText;
}

function applyLoadingScreenFromState() {
  const loader = $("#loader");
  if (!loader) return;

  const loadingScreen = window.APP_STATE?.loadingScreen || {};
  const logoPrimary = $(".loader-a", loader);
  const logoSecondary = $(".loader-urum", loader);
  const tagline = $(".loader-tagline", loader);
  const bar = $("#loaderBar");
  const nextBackgroundColor = getValidThemeColor(loadingScreen.backgroundColor);
  const nextAccentColor = getValidThemeColor(loadingScreen.accentColor);
  const nextTextColor = getValidThemeColor(loadingScreen.textColor);

  const nextPrimary =
    (typeof loadingScreen.logoPrimaryText === "string" &&
      loadingScreen.logoPrimaryText.trim()) ||
    getLoaderFallbackText(logoPrimary);
  const nextSecondary =
    (typeof loadingScreen.logoSecondaryText === "string" &&
      loadingScreen.logoSecondaryText.trim()) ||
    getLoaderFallbackText(logoSecondary);
  const nextTagline =
    (typeof loadingScreen.tagline === "string" && loadingScreen.tagline.trim()) ||
    getLoaderFallbackText(tagline);

  if (logoPrimary) {
    logoPrimary.textContent = nextPrimary;
  }

  if (logoSecondary) {
    logoSecondary.textContent = nextSecondary;
  }

  if (tagline) {
    tagline.textContent = nextTagline;
  }

  if (nextBackgroundColor) {
    loader.style.background = nextBackgroundColor;
  } else {
    loader.style.removeProperty("background");
  }

  if (logoPrimary) {
    if (nextAccentColor) {
      logoPrimary.style.color = nextAccentColor;
    } else {
      logoPrimary.style.removeProperty("color");
    }
  }

  if (bar) {
    if (nextAccentColor) {
      bar.style.background = nextAccentColor;
    } else {
      bar.style.removeProperty("background");
    }
  }

  if (logoSecondary) {
    if (nextTextColor) {
      logoSecondary.style.color = nextTextColor;
    } else {
      logoSecondary.style.removeProperty("color");
    }
  }

  if (tagline) {
    if (nextTextColor) {
      tagline.style.color = nextTextColor;
    } else {
      tagline.style.removeProperty("color");
    }
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || "";
}

function getSeoText(value, maxLength = 320) {
  const text = typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";

  return text.slice(0, maxLength);
}

function setMetaContent(selector, value) {
  const el = document.querySelector(selector);
  const content = getSeoText(value, 500);

  if (!el || !content) return;

  el.setAttribute("content", content);
}

function applySeoFromHotel(hotel = {}) {
  const hotelName = getSeoText(hotel.hotelName, 150) || "Hotel";
  const isMenuPage = document.body.classList.contains("menu-page");
  const pageTitle = isMenuPage ? `${hotelName} | Full Menu` : hotelName;
  const fallbackDescription = isMenuPage
    ? `Browse the full menu for ${hotelName} with cart and ordering options.`
    : `Discover ${hotelName} dining, menu, reservations, gallery, reviews, and contact details.`;
  const description =
    getSeoText(hotel.footer?.description, 320) ||
    getSeoText(hotel.tagline, 320) ||
    fallbackDescription;

  document.title = pageTitle;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', pageTitle);
  setMetaContent('meta[property="og:description"]', description);
}

function getThemeContentConfig() {
  const content = window.APP_STATE?.theme?.content;
  return content && typeof content === "object" ? content : {};
}

function getThemeContentText(groupName, key) {
  const group = getThemeContentConfig()[groupName];
  const value = group && typeof group === "object" ? group[key] : "";
  return typeof value === "string" ? value.trim() : "";
}

function setTextIfConfigured(selector, value) {
  const el = document.querySelector(selector);
  if (!el || !value) return;

  el.textContent = value;
}

function applyNavLabelsFromState() {
  document.querySelectorAll("[data-nav-label]").forEach((link) => {
    const label = getThemeContentText("navLabels", link.dataset.navLabel);
    if (label) {
      link.textContent = label;
    }
  });
}

function applyMenuSectionCopyFromState() {
  const menuSection = getThemeContentConfig().menuSection || {};
  const isMenuPage = document.body.classList.contains("menu-page");
  const eyebrow = isMenuPage
    ? menuSection.fullEyebrow || menuSection.eyebrow
    : menuSection.eyebrow;
  const title = isMenuPage
    ? menuSection.fullTitle || menuSection.title
    : menuSection.title;
  const subtitle = isMenuPage
    ? menuSection.fullSubtitle || menuSection.subtitle
    : menuSection.subtitle;

  setTextIfConfigured("#menuSectionEyebrow", eyebrow);
  setTextIfConfigured("#menuSectionTitle", title);
  setTextIfConfigured("#menuSectionSubtitle", subtitle);
  setTextIfConfigured("[data-menu-action-label='viewFullMenu']", menuSection.viewFullMenu);
}

function applyMenuCategoryLabelsFromState() {
  document.querySelectorAll("[data-menu-tab-label]").forEach((labelEl) => {
    const label = getThemeContentText("menuCategories", labelEl.dataset.menuTabLabel);
    if (label) {
      labelEl.textContent = label;
    }
  });
}

function applyCtaLabelsFromState() {
  document.querySelectorAll("[data-cta-label]").forEach((labelEl) => {
    const label = getThemeContentText("ctaLabels", labelEl.dataset.ctaLabel);
    if (label) {
      labelEl.textContent = label;
    }
  });
}

function applyFooterLabelsFromState() {
  document.querySelectorAll("[data-footer-label]").forEach((labelEl) => {
    const label = getThemeContentText("footerLabels", labelEl.dataset.footerLabel);
    if (label) {
      labelEl.textContent = label;
    }
  });
}

function applyContentLabelsFromState() {
  applyNavLabelsFromState();
  applyMenuSectionCopyFromState();
  applyMenuCategoryLabelsFromState();
  applyCtaLabelsFromState();
  applyFooterLabelsFromState();
}

function getConfiguredMenuCategoryLabel(category) {
  return getThemeContentText("menuCategories", category);
}

function getConfiguredCtaLabel(key) {
  return getThemeContentText("ctaLabels", key);
}

function formatConfiguredCountLabel(template, count, fallback) {
  if (!template) {
    return fallback;
  }

  return template.replace(/\{count\}/g, String(count));
}

function renderHeroStats(stats = []) {
  const wrap = document.getElementById("heroStats");
  if (!wrap) return;

  wrap.innerHTML = stats
    .map((stat, index) => {
      const divider =
        index < stats.length - 1
          ? `<div class="stat-divider" aria-hidden="true"></div>`
          : "";

      return `
        <div class="stat">
          <span class="stat-num">${escapeHTML(stat.value || "")}</span>
          <span class="stat-label">${escapeHTML(stat.label || "")}</span>
        </div>
        ${divider}
      `;
    })
    .join("");
}
function renderAboutParagraphs(paragraphs = []) {
  const wrap = document.getElementById("aboutParagraphs");
  if (!wrap) return;

  wrap.innerHTML = (paragraphs || [])
    .map(
      (text) => `
        <p class="about-desc reveal-text">
          ${escapeHTML(text || "")}
        </p>
      `
    )
    .join("");
}

function renderAboutFeatures(features = []) {
  const wrap = document.getElementById("aboutFeatures");
  if (!wrap) return;

  wrap.innerHTML = (features || [])
    .map(
      (feature) => `
        <div class="about-feature reveal-text">
          <i class="${feature.icon || "fas fa-star"}" aria-hidden="true"></i>
          <div>
            <strong>${escapeHTML(feature.title || "")}</strong>
            <span>${escapeHTML(feature.value || "")}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function applyAboutImageSource(image, { src = "", alt = "" } = {}) {
  if (!image) return;

  if (!image.dataset.fallbackSrc) {
    image.dataset.fallbackSrc = image.getAttribute("src") || "";
  }

  if (!image.dataset.fallbackAlt) {
    image.dataset.fallbackAlt = image.getAttribute("alt") || "";
  }

  const nextSrc = src ? normalizeImagePath(src) : image.dataset.fallbackSrc;
  const nextAlt = alt || image.dataset.fallbackAlt || "";

  if (nextSrc) {
    image.setAttribute("src", nextSrc);
  }

  image.setAttribute("alt", nextAlt);
}

function renderAboutImages(about = {}) {
  const mainImage = document.querySelector(".about-img-main img");
  const subImage = document.querySelector(".about-img-sub img");

  applyAboutImageSource(mainImage, {
    src: about.primaryImageUrl,
    alt: about.primaryImageAlt
  });

  applyAboutImageSource(subImage, {
    src: about.secondaryImageUrl,
    alt: about.secondaryImageAlt
  });
}

function renderHeroBackgroundImage(hero = {}) {
  const heroSection = document.getElementById("hero");
  const heroImage = document.getElementById("heroBackgroundImage");
  if (!heroSection || !heroImage) return;

  const imageUrl = normalizeImagePath(hero.backgroundImageUrl || "");
  const imageAlt = hero.backgroundImageAlt || "";
  const sceneEnabled = hero.scene?.enabled !== false;
  const shouldShow = !sceneEnabled && Boolean(imageUrl);

  heroSection.dataset.heroBackgroundImage = shouldShow ? "true" : "false";
  heroImage.hidden = !shouldShow;

  if (!shouldShow) {
    heroImage.removeAttribute("src");
    heroImage.setAttribute("alt", "");
    return;
  }

  heroImage.setAttribute("src", imageUrl);
  heroImage.setAttribute("alt", imageAlt || "Hero background image");
}

const ORDERABLE_HOMEPAGE_SECTION_IDS = [
  "about",
  "menu",
  "reservation",
  "events",
  "gallery",
  "testimonials",
  "contact"
];

function setSectionVisibility(sectionId, isVisible) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.hidden = !isVisible;
  section.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function linkPointsToSection(link, sectionId) {
  const rawHref = link.getAttribute("href") || "";
  if (!rawHref || !rawHref.includes("#")) return false;

  if (rawHref.startsWith("#")) {
    return rawHref.slice(1) === sectionId;
  }

  try {
    return new URL(rawHref, window.location.href).hash === `#${sectionId}`;
  } catch (error) {
    return false;
  }
}

function getSectionLinkVisibilityTarget(link) {
  const listItem = link.closest("li");
  if (listItem && listItem.querySelectorAll("a").length === 1) {
    return listItem;
  }

  return link;
}

function setSectionLinkVisibility(sectionId, isVisible) {
  document.querySelectorAll("a[href*='#']").forEach((link) => {
    if (!linkPointsToSection(link, sectionId)) return;

    const target = getSectionLinkVisibilityTarget(link);
    target.hidden = !isVisible;
    target.setAttribute("aria-hidden", isVisible ? "false" : "true");
  });
}

function setReservationCtaVisibility(isVisible) {
  document
    .querySelectorAll('#hero a[href="#reservation"], #about a[href="#reservation"]')
    .forEach((link) => {
      link.hidden = !isVisible;
      link.setAttribute("aria-hidden", isVisible ? "false" : "true");
      link.style.display = isVisible ? "" : "none";
    });
}

function applySectionVisibilityFromState() {
  const sectionTheme = window.APP_STATE?.theme?.sections || {};
  const reservationVisible = sectionTheme.reservation !== false;

  setSectionVisibility("about", sectionTheme.about !== false);
  setSectionVisibility("events", sectionTheme.events !== false);
  setSectionVisibility("gallery", sectionTheme.gallery !== false);
  setSectionVisibility("reservation", reservationVisible);
  setSectionVisibility("testimonials", sectionTheme.testimonials !== false);

  setSectionLinkVisibility("about", sectionTheme.about !== false);
  setSectionLinkVisibility("events", sectionTheme.events !== false);
  setSectionLinkVisibility("gallery", sectionTheme.gallery !== false);
  setSectionLinkVisibility("reservation", reservationVisible);
  setSectionLinkVisibility("testimonials", sectionTheme.testimonials !== false);
  setReservationCtaVisibility(reservationVisible);
}

function applySectionOrderFromState() {
  const heroSection = document.getElementById("hero");
  const parent = heroSection?.parentElement;
  const sectionTheme = window.APP_STATE?.theme?.sections || {};
  const configuredOrder = Array.isArray(sectionTheme.order) ? sectionTheme.order : [];

  if (!heroSection || !parent) return;

  const orderedSectionIds = [
    ...configuredOrder,
    ...ORDERABLE_HOMEPAGE_SECTION_IDS.filter((sectionId) => !configuredOrder.includes(sectionId))
  ];

  let insertionPoint = heroSection;

  orderedSectionIds.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section || section.parentElement !== parent) return;

    insertionPoint.insertAdjacentElement("afterend", section);
    insertionPoint = section;
  });
}

function renderHotelContent() {
  const hotel = window.APP_STATE?.hotel;
  if (!hotel) return;

  applyHeroLayoutVariantFromState();

  applySeoFromHotel(hotel);
  applyContentLabelsFromState();

  setText("brandPrimary", hotel.branding?.logoTextPrimary);
  setText("brandSecondary", hotel.branding?.logoTextSecondary);

  setText("heroTitleLine1", hotel.hero?.titleLine1);
  setText("heroTitleLine2", hotel.hero?.titleLine2);
  setText("heroTitleLine3", hotel.hero?.titleLine3);
  setText("heroTagline", hotel.tagline);
  renderHeroBackgroundImage(hotel.hero || {});

  renderHeroStats(hotel.hero?.stats || []);

  setText("aboutEyebrow", hotel.about?.eyebrow);
  renderAboutImages(hotel.about || {});
 
  const aboutTitleEl = document.getElementById("aboutTitle");
if (aboutTitleEl) {
  const fullTitle = hotel.about?.title || hotel.hotelName || "";
  const words = fullTitle.trim().split(" ");
  if (words.length >= 2) {
    const firstPart = words.slice(0, -1).join(" ");
    const lastPart = words[words.length - 1];
    aboutTitleEl.innerHTML = `${escapeHTML(firstPart)}<br/><em>${escapeHTML(lastPart)}</em>`;
  } else {
    aboutTitleEl.textContent = fullTitle;
  }
}


  renderAboutParagraphs(hotel.about?.paragraphs || []);
  renderAboutFeatures(hotel.about?.features || []);
  renderGallerySection();
  GalleryLightbox.init();
  renderEventsSection();
  renderReservationSection();
  renderContactSection();
  renderFooterSection();
  applySectionOrderFromState();
  applySectionVisibilityFromState();

  initReveal(document.getElementById("about"));
  initReveal(document.getElementById("events"));

  const navLogo = document.querySelector(".nav-logo");
if (navLogo) {
  navLogo.setAttribute("aria-label", `${hotel.hotelName || "Hotel"} home`);
}

}

const CART_STORAGE_KEY = "hsr_food_cart_v1";
const ORDER_TRACKING_STORAGE_KEY = "hsr_recent_order_tracking_v1";
const ORDER_TRACKING_DISMISS_STORAGE_KEY = "hsr_recent_order_tracking_dismissed_v1";
const ORDER_TRACKING_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const ORDER_TRACKING_CLOSED_STATUSES = new Set(["completed", "cancelled", "payment_failed"]);
const TABLE_CART_STALE_WINDOW_MS = 4 * 60 * 60 * 1000;
let CART = [];

function normalizeCartStoragePart(value, fallback = "default") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getCartStorageKey(orderContext = getActiveOrderContext()) {
  const hotelSlug = normalizeCartStoragePart(getActiveHotelSlug(), "hotel");
  const keyParts = [CART_STORAGE_KEY, hotelSlug];

  if (hasDineInOrderContext(orderContext)) {
    keyParts.push("table", normalizeCartStoragePart(orderContext.tableNumber, "unknown-table"));
  } else {
    keyParts.push("website");
  }

  return keyParts
    .map((part) => encodeURIComponent(String(part).trim()))
    .join(":");
}

function getTableCartStoragePayload(items = CART, orderContext = getActiveOrderContext()) {
  return {
    items: normalizeCartItems(items),
    savedAt: new Date().toISOString(),
    tableNumber: orderContext.tableNumber || "",
    orderType: orderContext.orderType || "dine-in",
    orderSource: orderContext.orderSource || "qr"
  };
}

function getFreshStoredTableCartItems(storedCart, orderContext = getActiveOrderContext()) {
  if (!storedCart) return [];

  if (Array.isArray(storedCart)) {
    // Legacy table carts did not include timestamps, so they cannot be proven safe for table turnover.
    return null;
  }

  if (!storedCart || typeof storedCart !== "object" || !Array.isArray(storedCart.items)) {
    return null;
  }

  const storedTableNumber = normalizeOrderContextText(storedCart.tableNumber, 80);
  const savedAt = new Date(storedCart.savedAt || "").getTime();
  const isFresh =
    Number.isFinite(savedAt) &&
    Date.now() - savedAt <= TABLE_CART_STALE_WINDOW_MS;

  if (storedTableNumber !== orderContext.tableNumber || !isFresh) {
    return null;
  }

  return storedCart.items;
}

/* ── Shared Helpers ─────────────────────────────────── */
function formatCurrency(value) {
  return `₹${Number(value).toFixed(0)}`;
}

function cleanPhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function ownerWhatsAppLink(message) {
  return `https://wa.me/${cleanPhone(CONFIG.OWNER_WHATSAPP_NUMBER)}?text=${encodeURIComponent(message)}`;
}

const FALLBACK_IMAGE = {
  altSuffix: "Image unavailable",
};

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHTML(value);
}

function isLikelyRemoteUrl(src = "") {
  return /^https?:\/\//i.test(String(src));
}

function normalizeImagePath(src = "") {
  if (!src) return "";
  const trimmed = String(src).trim();
  if (isLikelyRemoteUrl(trimmed)) return trimmed;

  // VS Code Live Server commonly serves the repository root at /frontend/*.html,
  // while production serves this folder as the web root. Keep backend /img URLs
  // working in both environments without changing tenant-upload URLs.
  const isFrontendWorkspacePreview = /^\/frontend(?:\/|$)/i.test(window.location.pathname);
  if (isFrontendWorkspacePreview && /^\/img\//i.test(trimmed)) {
    return `./img/${trimmed.slice(5)}`;
  }

  return trimmed.startsWith("/")
    ? trimmed
    : `./${trimmed.replace(/^\.?\//, "")}`;
}

function createImageMarkup({ src, imageMeta = {}, alt, badge, name, priority = false }) {
  const safeSrc = normalizeImagePath(imageMeta.url || src || "/img/default-food.v1.webp");
  const categoryFallback = normalizeImagePath(imageMeta.categoryFallbackUrl || "");
  const globalFallback = normalizeImagePath(imageMeta.globalFallbackUrl || "/img/default-food.v1.webp");
  const formatFallback = normalizeImagePath(imageMeta.fallbackFormatUrl || "/img/default-food.v1.jpg");
  const safeAlt = escapeAttr(alt || name || FALLBACK_IMAGE.altSuffix);
  const safeName = escapeHTML(name || "Menu item");

  return `
    <div class="menu-card-img">
      <div class="media-frame is-loading" data-image-frame>
        <img
          class="media-frame__img"
          data-menu-image
          data-category-fallback-src="${escapeAttr(categoryFallback)}"
          data-global-fallback-src="${escapeAttr(globalFallback)}"
          data-format-fallback-src="${escapeAttr(formatFallback)}"
          data-fallback-stage="${escapeAttr(imageMeta.source || "item")}"
          src="${escapeAttr(safeSrc)}"
          alt="${safeAlt}"
          width="640"
          height="440"
          loading="${priority ? "eager" : "lazy"}"
          fetchpriority="${priority ? "high" : "low"}"
          decoding="async"
          referrerpolicy="no-referrer"
        />
        <div class="media-frame__fallback" aria-hidden="true">
          <div>
            <i class="fas fa-image"></i>
            <span>${safeName}</span>
          </div>
        </div>
      </div>
      ${badge ? `<span class="menu-card-badge">${escapeHTML(badge)}</span>` : ""}
    </div>
  `;
}

function initManagedImages(scope = document) {
  const images = $$("[data-menu-image]", scope);

  images.forEach((img) => {
    const frame = img.closest("[data-image-frame]");
    if (!frame || img.dataset.fallbackBound === "true") return;
    img.dataset.fallbackBound = "true";
    const candidates = [
      img.dataset.categoryFallbackSrc,
      img.dataset.globalFallbackSrc,
      img.dataset.formatFallbackSrc
    ].filter(Boolean);
    const attempted = new Set([new URL(img.src, document.baseURI).href]);

    let finished = false;

    const markLoaded = () => {
      if (finished) return;
      finished = true;
      frame.classList.remove("is-loading");
      frame.classList.remove("has-error");
      frame.classList.add("is-loaded");
    };

    const markError = () => {
      if (finished) return;
      const nextCandidate = candidates.find((candidate) => {
        const resolved = new URL(candidate, document.baseURI).href;
        return !attempted.has(resolved);
      });
      if (nextCandidate) {
        const resolved = new URL(nextCandidate, document.baseURI).href;
        attempted.add(resolved);
        frame.classList.add("is-loading");
        img.dataset.fallbackStage = resolved.includes("default-food.v1") ? "global" : "category";
        img.src = nextCandidate;
        return;
      }
      finished = true;
      frame.classList.remove("is-loading");
      frame.classList.add("has-error");
      img.setAttribute("aria-hidden", "true");
      img.alt = "";
    };

    img.addEventListener("load", markLoaded);
    img.addEventListener("error", markError);

    if (img.complete) {
      if (img.naturalWidth > 0) {
        markLoaded();
      } else {
        markError();
      }
    }
  });
}

function getGalleryItemClassName(layoutVariant = "standard") {
  const classNames = ["gallery-item"];

  if (layoutVariant === "large") {
    classNames.push("gallery-item--large");
  } else if (layoutVariant === "tall") {
    classNames.push("gallery-item--tall");
  } else if (layoutVariant === "wide") {
    classNames.push("gallery-item--wide");
  }

  return classNames.join(" ");
}

function renderGallerySection() {
  const galleryGrid = document.querySelector("#gallery .gallery-grid");
  const galleryItems = window.APP_STATE?.gallery || [];

  if (!galleryGrid) return;

  if (!galleryGrid.dataset.staticMarkup) {
    galleryGrid.dataset.staticMarkup = galleryGrid.innerHTML;
  }

  if (!galleryItems.length) {
    galleryGrid.innerHTML = galleryGrid.dataset.staticMarkup;
    return;
  }

  galleryGrid.innerHTML = galleryItems
    .map((item, index) => {
      const imageUrl = normalizeImagePath(item.imageUrl || "");
      const alt = escapeAttr(item.alt || `Gallery image ${index + 1}`);

      return `
        <div class="${getGalleryItemClassName(item.layoutVariant)}" role="listitem">
          <img src="${escapeAttr(imageUrl)}" alt="${alt}" width="1376" height="768" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
          <div class="gallery-overlay"><i class="fas fa-expand" aria-hidden="true"></i></div>
        </div>
      `;
    })
    .join("");
}

const WhatsAppFallback = (() => {
  let modal;
  let fallbackLink;
  let lastFocused;

  function ensureNodes() {
    modal = modal || $("#waFallbackModal");
    fallbackLink = fallbackLink || $("#waFallbackLink");
    return !!modal && !!fallbackLink;
  }

  function showCustomAlert(message) {
    showToast({
      type: "warning",
      title: "WhatsApp needs your help",
      message,
      duration: 8000,
      dedupeKey: "whatsapp-popup-blocked"
    });
  }

  function open(link) {
    if (!ensureNodes()) {
      showCustomAlert(
        "If WhatsApp does not open, please enable pop-ups and try again. If Done Ignore this",
      );
      return;
    }

    lastFocused = document.activeElement;
    fallbackLink.href = link;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    fallbackLink.focus();
  }

  function close() {
    if (!ensureNodes()) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function bind() {
    if (!ensureNodes()) return;

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-wa-close]")) {
        close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (!modal || modal.hidden) return;

      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key !== "Tab") return;
      const focusable = getFocusableElements();
      if (!focusable.length) {
        e.preventDefault();
        dialog?.focus?.();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  return { bind, open, close };
})();

const HotelPopupNotificationModal = (() => {
  let modal;
  let dialog;
  let mediaWrap;
  let image;
  let title;
  let description;
  let dismissOption;
  let dismissTodayInput;
  let cta;
  let ctaText;
  let lastFocused;
  let previousBodyOverflow = "";
  let activeNotificationKey = "";
  const closedThisView = new Set();

  function ensureNodes() {
    modal = modal || $("#hotelPopupModal");
    dialog = dialog || $(".hotel-popup__dialog", modal || document);
    mediaWrap = mediaWrap || $("#hotelPopupMediaWrap");
    image = image || $("#hotelPopupImage");
    title = title || $("#hotelPopupTitle");
    description = description || $("#hotelPopupDescription");
    dismissOption = dismissOption || $("#hotelPopupDismissOption");
    dismissTodayInput = dismissTodayInput || $("#hotelPopupDismissTodayInput");
    cta = cta || $("#hotelPopupCta");
    ctaText = ctaText || $("#hotelPopupCtaText");

    return (
      !!modal &&
      !!dialog &&
      !!title &&
      !!description &&
      !!dismissOption &&
      !!dismissTodayInput &&
      !!cta &&
      !!ctaText
    );
  }

  function isAbsoluteHttpUrl(value = "") {
    try {
      const parsedUrl = new URL(value, window.location.origin);
      return ["http:", "https:"].includes(parsedUrl.protocol) && parsedUrl.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  function getNotificationKey(notification = {}) {
    const hotelSlug =
      typeof notification.hotelSlug === "string" && notification.hotelSlug.trim()
        ? notification.hotelSlug.trim()
        : window.APP_STATE?.activeHotelSlug || "default";
    const notificationId =
      typeof notification.id === "string" || typeof notification.id === "number"
        ? String(notification.id).trim()
        : "";
    const notificationTitle =
      typeof notification.title === "string" ? notification.title.trim() : "";
    const notificationPriority = Number.isFinite(Number(notification.priority))
      ? Number(notification.priority)
      : 0;

    return notificationId || `${hotelSlug}::${notificationTitle}::${notificationPriority}`;
  }

  function getStorageKey(notification = {}) {
    const notificationKey = getNotificationKey(notification);

    if (!notificationKey) {
      return "";
    }

    return `hotel_popup_dismissed_${notificationKey}`;
  }

  function getDayOptOutStorageKey(notification = {}) {
    const notificationKey = getNotificationKey(notification);

    if (!notificationKey) {
      return "";
    }

    return `hotel_popup_dismissed_today_${notificationKey}`;
  }

  function getTodayStorageStamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getPopupNotificationsFromState() {
    if (Array.isArray(window.APP_STATE?.popupNotifications)) {
      return window.APP_STATE.popupNotifications;
    }

    const singleNotification = window.APP_STATE?.popupNotification || null;
    return singleNotification ? [singleNotification] : [];
  }

  function getDisplayMode(notification = {}) {
    const displayMode =
      typeof notification.displayMode === "string"
        ? notification.displayMode.trim().toLowerCase()
        : "";

    if (displayMode === "every_visit" || displayMode === "once_per_day") {
      return displayMode;
    }

    return "once_per_session";
  }

  function hasBeenDismissed(notification = {}) {
    const notificationKey = getNotificationKey(notification);
    if (!notificationKey) {
      return false;
    }

    if (closedThisView.has(notificationKey)) {
      return true;
    }

    const storageKey = getStorageKey(notification);
    const dayOptOutStorageKey = getDayOptOutStorageKey(notification);
    if (!storageKey) {
      return Boolean(
        dayOptOutStorageKey &&
        window.localStorage.getItem(dayOptOutStorageKey) === getTodayStorageStamp()
      );
    }

    try {
      if (
        dayOptOutStorageKey &&
        window.localStorage.getItem(dayOptOutStorageKey) === getTodayStorageStamp()
      ) {
        return true;
      }

      const displayMode = getDisplayMode(notification);

      if (displayMode === "once_per_day") {
        return window.localStorage.getItem(storageKey) === getTodayStorageStamp();
      }

      if (displayMode === "once_per_session") {
        return window.sessionStorage.getItem(storageKey) === "1";
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  function rememberDismissal(notification = {}, options = {}) {
    const notificationKey = getNotificationKey(notification);
    if (notificationKey) {
      closedThisView.add(notificationKey);
    }

    const storageKey = getStorageKey(notification);
    const dayOptOutStorageKey = getDayOptOutStorageKey(notification);
    if (!storageKey) {
      if (options.forceToday && dayOptOutStorageKey) {
        try {
          window.localStorage.setItem(dayOptOutStorageKey, getTodayStorageStamp());
        } catch (error) {
          // Ignore storage access errors so the public site keeps working.
        }
      }
      return;
    }

    try {
      if (options.forceToday && dayOptOutStorageKey) {
        window.localStorage.setItem(dayOptOutStorageKey, getTodayStorageStamp());
        return;
      }

      const displayMode = getDisplayMode(notification);

      if (displayMode === "once_per_day") {
        window.localStorage.setItem(storageKey, getTodayStorageStamp());
        return;
      }

      if (displayMode === "once_per_session") {
        window.sessionStorage.setItem(storageKey, "1");
      }
    } catch (error) {
      // Ignore storage access errors so the public site keeps working.
    }
  }

  function getNextEligibleNotification() {
    return getPopupNotificationsFromState().find((notification) => !hasBeenDismissed(notification));
  }

  function close({ remember = true, showNext = true } = {}) {
    if (!ensureNodes() || modal.hidden) return;

    const currentNotification = getPopupNotificationsFromState().find(
      (notification) => getNotificationKey(notification) === activeNotificationKey
    );

    if (remember && currentNotification) {
      rememberDismissal(currentNotification, {
        forceToday: Boolean(dismissTodayInput?.checked)
      });
    }

    activeNotificationKey = "";
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      modal.hidden = true;
      if (showNext) {
        renderFromState();
      }
    }, prefersReducedMotion() ? 0 : 220);
    document.body.style.overflow = previousBodyOverflow;

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function open(notification = {}) {
    if (!ensureNodes()) return;

    const notificationTitle =
      typeof notification.title === "string" ? notification.title.trim() : "";

    if (!notificationTitle) {
      return;
    }

    activeNotificationKey = getNotificationKey(notification);
    lastFocused = document.activeElement;
    title.textContent = notificationTitle;
    dismissTodayInput.checked = false;
    description.textContent =
      typeof notification.description === "string" && notification.description.trim()
        ? notification.description.trim()
        : "";

    if (dismissOption) {
      dismissOption.hidden = getDisplayMode(notification) === "once_per_day";
    }

    const imageUrl = normalizeImagePath(notification.imageUrl || "");
    if (imageUrl && mediaWrap && image) {
      image.src = imageUrl;
      image.alt = notificationTitle;
      mediaWrap.hidden = false;
    } else if (mediaWrap && image) {
      image.src = "";
      image.alt = "";
      mediaWrap.hidden = true;
    }

    const nextCtaText =
      typeof notification.ctaText === "string" ? notification.ctaText.trim() : "";
    const nextCtaLink = getSafePublicNavigationUrl(notification.ctaLink);

    if (nextCtaText && nextCtaLink) {
      cta.hidden = false;
      cta.href = nextCtaLink;
      cta.target = isAbsoluteHttpUrl(nextCtaLink) ? "_blank" : "_self";
      cta.rel = isAbsoluteHttpUrl(nextCtaLink) ? "noopener noreferrer" : "";
      ctaText.textContent = nextCtaText;
    } else {
      cta.hidden = true;
      cta.href = "#";
      cta.target = "_self";
      cta.rel = "noopener noreferrer";
      ctaText.textContent = "";
    }

    previousBodyOverflow = document.body.style.overflow;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      modal.classList.add("is-visible");
      const initialFocus = modal.querySelector("[data-hotel-popup-close]") || dialog;
      initialFocus?.focus?.();
    });
  }

  function renderFromState() {
    if (!ensureNodes()) return;

    const notification = getNextEligibleNotification();

    if (!notification) {
      if (!modal.hidden) {
        close({ remember: false, showNext: false });
      }
      return;
    }

    open(notification);
  }

  function getFocusableElements() {
    if (!modal) return [];
    return $(
      'a[href]:not([hidden]), button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])',
      modal
    ).filter((element) => element.getClientRects().length > 0);
  }

  function bind() {
    if (!ensureNodes() || modal.dataset.boundHotelPopup === "true") return;

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-hotel-popup-close]")) {
        close();
        return;
      }

      if (e.target.closest("#hotelPopupCta")) {
        const currentNotification = getPopupNotificationsFromState().find(
          (notification) => getNotificationKey(notification) === activeNotificationKey
        );

        if (currentNotification) {
          rememberDismissal(currentNotification, {
            forceToday: Boolean(dismissTodayInput?.checked)
          });
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && !modal.hidden) {
        close();
      }
    });

    modal.dataset.boundHotelPopup = "true";
  }

  return { bind, close, renderFromState };
})();

const HotelOrderingUnavailableModal = (() => {
  let modal;
  let title;
  let description;
  let eyebrow;
  let cta;
  let ctaText;
  let lastFocused;

  function ensureStyles() {
    if (document.getElementById("hotelOrderingUnavailableStyles")) return;

    const style = document.createElement("style");
    style.id = "hotelOrderingUnavailableStyles";
    style.textContent = `
      .hotel-ordering-disabled-btn {
        width: 100%;
        justify-content: center;
        border: 1px solid rgba(201, 168, 76, 0.36);
        background: rgba(201, 168, 76, 0.12);
        color: rgba(255,255,255,0.92);
        cursor: pointer;
      }

      .hotel-ordering-disabled-btn:hover,
      .hotel-ordering-disabled-btn:focus-visible {
        background: rgba(201, 168, 76, 0.18);
        border-color: rgba(201, 168, 76, 0.52);
      }

      .hotel-ordering-inline-notice {
        margin: 0 0 14px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(201, 168, 76, 0.2);
        background: rgba(201, 168, 76, 0.1);
        color: rgba(255,255,255,0.86);
        font-size: 0.95rem;
        line-height: 1.55;
      }

      .cart-item-actions .qty-btn[disabled] {
        opacity: 0.42;
        cursor: not-allowed;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureNodes() {
    ensureStyles();

    modal = modal || document.getElementById("hotelOrderingUnavailableModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "hotelOrderingUnavailableModal";
      modal.className = "hotel-popup";
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "hotelOrderingUnavailableTitle");
      modal.innerHTML = `
        <div class="hotel-popup__backdrop" data-ordering-unavailable-close></div>
        <div class="hotel-popup__dialog glass-card" role="document">
          <button type="button" class="hotel-popup__close" aria-label="Close ordering message" data-ordering-unavailable-close>
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
          <div class="hotel-popup__body" style="grid-column: 1 / -1;">
            <p id="hotelOrderingUnavailableEyebrow" class="hotel-popup__eyebrow">Ordering Update</p>
            <h3 id="hotelOrderingUnavailableTitle" class="hotel-popup__title"></h3>
            <p id="hotelOrderingUnavailableDescription" class="hotel-popup__description"></p>
            <a
              id="hotelOrderingUnavailableCta"
              href="#"
              target="_self"
              rel="noopener noreferrer"
              class="btn btn-primary hotel-popup__cta"
              hidden
            >
              <span id="hotelOrderingUnavailableCtaText"></span>
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    eyebrow = eyebrow || document.getElementById("hotelOrderingUnavailableEyebrow");
    title = title || document.getElementById("hotelOrderingUnavailableTitle");
    description = description || document.getElementById("hotelOrderingUnavailableDescription");
    cta = cta || document.getElementById("hotelOrderingUnavailableCta");
    ctaText = ctaText || document.getElementById("hotelOrderingUnavailableCtaText");

    return !!modal && !!eyebrow && !!title && !!description && !!cta && !!ctaText;
  }

  function close() {
    if (!ensureNodes()) return;

    modal.hidden = true;
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function open(override = null) {
    if (!ensureNodes()) return;

    const config = getOrderingUnavailableModalConfig(override);
    lastFocused = document.activeElement;
    eyebrow.textContent = config.icon
      ? `${config.icon} Ordering Update`
      : "Ordering Update";
    title.textContent = config.title;
    description.textContent = config.message;

    if (config.buttonText && config.buttonLink) {
      cta.hidden = false;
      cta.href = config.buttonLink;
      ctaText.textContent = config.buttonText;
    } else {
      cta.hidden = true;
      cta.href = "#";
      ctaText.textContent = "";
    }

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      modal.classList.add("is-visible");
    });

    const focusTarget = cta.hidden
      ? modal.querySelector("[data-ordering-unavailable-close]")
      : cta;
    focusTarget?.focus?.({ preventScroll: true });
  }

  function bind() {
    if (!ensureNodes() || modal.dataset.boundOrderingUnavailable === "true") {
      return;
    }

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-ordering-unavailable-close]")) {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) {
        close();
      }
    });

    modal.dataset.boundOrderingUnavailable = "true";
  }

  return { bind, close, open };
})();

function getReviewAvatarSource(value = "") {
  if (window.ReviewAvatar?.resolveReviewAvatar) {
    return window.ReviewAvatar.resolveReviewAvatar(value).src;
  }

  return normalizeImagePath(value) || "./img/default-review-avatar.v1.svg";
}
function normalizeTestimonialsData(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const text = typeof item.text === "string" ? item.text.trim() : "";
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const role = typeof item.role === "string" ? item.role.trim() : "";
      const avatar = getReviewAvatarSource(item.avatar || item.image || "");
      const stars = Math.max(1, Math.min(5, Math.round(Number(item.stars || 5))));

      if (!text || !name) return null;

      return {
        text,
        name,
        role,
        avatar,
        stars
      };
    })
    .filter(Boolean);
}

function renderTestimonialsSection(testimonials = window.APP_STATE?.testimonials || []) {
  const track = $("#testimonialsTrack");
  const dotsWrap = $("#testiDots");
  const prevBtn = $("#testPrev");
  const nextBtn = $("#testNext");
  const safeTestimonials = normalizeTestimonialsData(testimonials);

  if (!track || !dotsWrap) return;

  track.innerHTML = "";
  dotsWrap.innerHTML = "";
  track.style.transform = "";

  const hasMultipleTestimonials = safeTestimonials.length > 1;

  [prevBtn, nextBtn].forEach((button) => {
    if (!button) return;
    button.hidden = !hasMultipleTestimonials;
    button.setAttribute("aria-hidden", hasMultipleTestimonials ? "false" : "true");
  });

  dotsWrap.hidden = !hasMultipleTestimonials;
  dotsWrap.setAttribute("aria-hidden", hasMultipleTestimonials ? "false" : "true");

  if (!safeTestimonials.length) {
    track.innerHTML = '<div class="testi-empty" role="status"><strong>No reviews yet</strong><span>Guest reviews will appear here after approval.</span></div>';
    return;
  }

  safeTestimonials.forEach((testimonial, index) => {
    const stars = "★".repeat(testimonial.stars) + "☆".repeat(5 - testimonial.stars);
    const card = document.createElement("div");
    card.className = "testi-card";
    card.setAttribute("role", "tabpanel");
    card.setAttribute("aria-label", `Testimonial ${index + 1}`);
    card.innerHTML = `
      <div class="testi-quote" aria-hidden="true">"</div>
      <p class="testi-text">${escapeHTML(testimonial.text)}</p>
      <div class="testi-author">
        <div class="testi-avatar">
          <img class="review-card__avatar" data-review-avatar src="${escapeAttr(testimonial.avatar)}" alt="" width="96" height="96" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        </div>
        <div class="testi-stars" aria-label="${testimonial.stars} out of 5 stars">${stars}</div>
        <strong class="testi-name">${escapeHTML(testimonial.name)}</strong>
        <span class="testi-role">${escapeHTML(testimonial.role)}</span>
      </div>
    `;
    track.appendChild(card);
    window.ReviewAvatar?.bindReviewAvatars(card);
  });

  let currentIndex = 0;

  function goTo(index) {
    currentIndex = (index + safeTestimonials.length) % safeTestimonials.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    $$(".testi-dot", dotsWrap).forEach((currentDot, dotIndex) => {
      currentDot.classList.toggle("active", dotIndex === currentIndex);
    });
  }

  safeTestimonials.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "testi-dot" + (index === 0 ? " active" : "");
    dot.setAttribute("role", "listitem");
    dot.setAttribute("aria-label", `Go to testimonial ${index + 1}`);
    dot.addEventListener("click", () => {
      goTo(index);
    });
    dotsWrap.appendChild(dot);
  });

  if (prevBtn) {
    prevBtn.onclick = () => goTo(currentIndex - 1);
  }

  if (nextBtn) {
    nextBtn.onclick = () => goTo(currentIndex + 1);
  }
}

function setTestimonialReviewFormVisibility(isVisible) {
  const wrap = $("#testimonialReviewWrap");
  const openBtn = $("#openTestimonialReviewBtn");

  if (!wrap || !openBtn) return;

  wrap.hidden = !isVisible;
  wrap.setAttribute("aria-hidden", isVisible ? "false" : "true");
  openBtn.setAttribute("aria-expanded", isVisible ? "true" : "false");

  if (isVisible) {
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function handleTestimonialReviewSubmit(e) {
  e.preventDefault();

  const form = e.target;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const hotelName = getActiveHotelName();
  const hotelSlug = getActiveHotelSlug();
  const name =
    form.querySelector('[name="name"], #testimonialReviewName')?.value.trim() || "";
  const role =
    form.querySelector('[name="role"], #testimonialReviewRole')?.value.trim() || "";
  const text =
    form.querySelector('[name="text"], #testimonialReviewText')?.value.trim() || "";
  const stars = Number(
    form.querySelector('[name="stars"], #testimonialReviewStars')?.value || 5
  );
  const submitButton = form.querySelector('button[type="submit"]');

  if (!hotelName || !hotelSlug) {
    showToast("Hotel context is unavailable right now. Please refresh and try again.");
    return;
  }

  if (!name || !text || !Number.isFinite(stars)) {
    showToast("Please fill all required review details.");
    return;
  }

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting review...";
    }

    const result = await saveTestimonialReview({
      hotelName,
      hotelSlug,
      name,
      role,
      text,
      stars
    });

    form.reset();
    const starsInput = form.querySelector("#testimonialReviewStars");
    if (starsInput) {
      starsInput.value = "5";
    }
    setTestimonialReviewFormVisibility(false);
    showToast(
      result?.message || "Review submitted successfully. It will appear after approval."
    );
  } catch (error) {
    console.error("Testimonial review submit failed:", error);
    showToast(error.message || "Failed to submit review. Please try again.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Review";
    }
  }
}

function bindTestimonialReviewForm() {
  const openBtn = $("#openTestimonialReviewBtn");
  const cancelBtn = $("#cancelTestimonialReviewBtn");
  const form = $("#testimonialReviewForm");

  if (openBtn && openBtn.dataset.boundClick !== "true") {
    openBtn.addEventListener("click", () => {
      setTestimonialReviewFormVisibility(true);
      const firstInput = $("#testimonialReviewName");
      if (firstInput) {
        firstInput.focus();
      }
    });
    openBtn.dataset.boundClick = "true";
  }

  if (cancelBtn && cancelBtn.dataset.boundClick !== "true") {
    cancelBtn.addEventListener("click", () => {
      form?.reset();
      const starsInput = $("#testimonialReviewStars");
      if (starsInput) {
        starsInput.value = "5";
      }
      setTestimonialReviewFormVisibility(false);
    });
    cancelBtn.dataset.boundClick = "true";
  }

  if (!form || form.dataset.boundSubmit === "true") return;

  form.addEventListener("submit", handleTestimonialReviewSubmit);
  form.dataset.boundSubmit = "true";
}

function tryOpenExternalLink(url) {
  let popup = null;

  try {
    popup = window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    popup = null;
  }

  const blocked = !popup || popup.closed || typeof popup.closed === "undefined";

  if (blocked) {
    WhatsAppFallback.open(url);
    return false;
  }

  return true;
}

function openWhatsAppSafely(url) {
  if (!url) {
    console.error("WhatsApp URL missing");
    return;
  }

  return tryOpenExternalLink(url);
}

function getOrderTrackingUrl(tracking = {}) {
  tracking = tracking && typeof tracking === "object" ? tracking : {};
  const orderId = String(tracking.orderId || "").trim();
  const hotelSlug = String(tracking.hotelSlug || getActiveHotelSlug() || "").trim();
  const token = String(tracking.token || "").trim();
  const path = String(tracking.path || "").trim();

  if (!path && (!orderId || !hotelSlug || !token)) {
    return "";
  }

  const trackingPath = path || `order-tracking.html?hotel=${encodeURIComponent(hotelSlug)}&order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`;

  try {
    return new URL(trackingPath, window.location.href).toString();
  } catch {
    return trackingPath;
  }
}

function rememberOrderTracking(tracking = {}) {
  tracking = tracking && typeof tracking === "object" ? tracking : {};
  const trackingUrl = getOrderTrackingUrl(tracking);
  const orderId = String(tracking.orderId || "").trim();
  const hotelSlug = String(tracking.hotelSlug || getActiveHotelSlug() || "").trim();
  const token = String(tracking.token || "").trim();
  const activeOrderContext = getActiveOrderContext();
  const tableNumber = normalizeOrderContextText(
    tracking.tableNumber ||
      tracking.table_number ||
      tracking.orderContext?.tableNumber ||
      activeOrderContext.tableNumber,
    80,
  );
  const orderType = normalizeOrderContextText(
    tracking.orderType ||
      tracking.order_type ||
      tracking.orderContext?.orderType ||
      activeOrderContext.orderType,
    40,
  );
  const orderSource = normalizeOrderContextText(
    tracking.orderSource ||
      tracking.order_source ||
      tracking.orderContext?.orderSource ||
      activeOrderContext.orderSource,
    40,
  );

  if (!trackingUrl || !orderId || !hotelSlug || !token) {
    return null;
  }

  const trackingRecord = {
    orderId,
    hotelSlug,
    token,
    url: trackingUrl,
    orderType,
    tableNumber,
    orderSource,
    savedAt: new Date().toISOString()
  };

  try {
    const storageKey = getOrderTrackingRecordStorageKey(hotelSlug);
    const dismissStorageKey = getOrderTrackingDismissStorageKey(hotelSlug);

    if (!storageKey) return trackingRecord;
    sessionStorage.setItem(storageKey, JSON.stringify(trackingRecord));
    localStorage.removeItem(storageKey);
    if (dismissStorageKey) sessionStorage.removeItem(dismissStorageKey);
  } catch {
    // Tracking remains available through the visible link even if storage is blocked.
  }

  return trackingRecord;
}

function removeRecentOrderTrackingShortcut() {
  document.getElementById("recentOrderTrackingShortcut")?.remove();
}

function getOrderTrackingRecordStorageKey(hotelSlug = getActiveHotelSlug()) {
  const normalizedHotelSlug = String(hotelSlug || "").trim();
  return normalizedHotelSlug ? `${ORDER_TRACKING_STORAGE_KEY}:${normalizedHotelSlug}` : "";
}

function getOrderTrackingDismissStorageKey(hotelSlug = getActiveHotelSlug()) {
  const normalizedHotelSlug = String(hotelSlug || "").trim();
  return normalizedHotelSlug ? `${ORDER_TRACKING_DISMISS_STORAGE_KEY}:${normalizedHotelSlug}` : "";
}

function removeStoredOrderTrackingRecord(hotelSlug = getActiveHotelSlug()) {
  const normalizedHotelSlug = String(hotelSlug || "").trim();
  if (!normalizedHotelSlug) return;
  const storageKey = getOrderTrackingRecordStorageKey(normalizedHotelSlug);
  const dismissStorageKey = getOrderTrackingDismissStorageKey(normalizedHotelSlug);

  try {
    if (storageKey) {
      sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
    }
    if (dismissStorageKey) sessionStorage.removeItem(dismissStorageKey);
  } catch {
    // Cleaning recent tracking state is best-effort only.
  }
}

function isClosedOrderTrackingStatus(status = "") {
  return ORDER_TRACKING_CLOSED_STATUSES.has(String(status || "").trim().toLowerCase());
}

function getRecentOrderTrackingRecord() {
  const hotelSlug = String(getActiveHotelSlug() || "").trim();
  if (!hotelSlug) return null;

  try {
    const storageKey = getOrderTrackingRecordStorageKey(hotelSlug);
    const dismissStorageKey = getOrderTrackingDismissStorageKey(hotelSlug);
    const rawRecord = storageKey ? sessionStorage.getItem(storageKey) : "";
    if (storageKey && !rawRecord) {
      localStorage.removeItem(storageKey);
    }
    if (!rawRecord) return null;

    const record = JSON.parse(rawRecord);
    const orderId = String(record?.orderId || "").trim();
    const recordHotelSlug = String(record?.hotelSlug || "").trim();
    const token = String(record?.token || "").trim();
    const url = String(record?.url || "").trim();
    const savedAt = new Date(record?.savedAt || "").getTime();
    const status = String(record?.status || "").trim();
    const orderType = normalizeOrderContextText(record?.orderType || record?.order_type, 40);
    const tableNumber = normalizeOrderContextText(record?.tableNumber || record?.table_number, 80);
    const orderSource = normalizeOrderContextText(record?.orderSource || record?.order_source, 40);
    const activeOrderContext = getActiveOrderContext();
    const isExpired =
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > ORDER_TRACKING_RECENT_WINDOW_MS;

    if (
      hasDineInOrderContext(activeOrderContext) &&
      tableNumber !== activeOrderContext.tableNumber
    ) {
      return null;
    }

    if (
      !orderId ||
      recordHotelSlug !== hotelSlug ||
      !token ||
      !url ||
      isExpired ||
      isClosedOrderTrackingStatus(status)
    ) {
      removeStoredOrderTrackingRecord(hotelSlug);
      return null;
    }

    const dismissedOrderId = dismissStorageKey
      ? sessionStorage.getItem(dismissStorageKey)
      : "";

    if (dismissedOrderId === orderId) {
      return null;
    }

    return {
      orderId,
      hotelSlug: recordHotelSlug,
      token,
      url,
      savedAt: record.savedAt || "",
      orderType,
      tableNumber,
      orderSource,
      status
    };
  } catch {
    return null;
  }
}

async function validateRecentOrderTrackingShortcut(trackingRecord = {}) {
  const hotelSlug = String(trackingRecord.hotelSlug || "").trim();
  const orderId = String(trackingRecord.orderId || "").trim();
  const token = String(trackingRecord.token || "").trim();

  if (!hotelSlug || !orderId || !token) return;

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/order-tracking/${encodeURIComponent(hotelSlug)}/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`
    );

    if (response.status === 404 || response.status === 410) {
      removeStoredOrderTrackingRecord(hotelSlug);
      removeRecentOrderTrackingShortcut();
      return;
    }

    const data = await response.json().catch(() => ({}));
    const status = data?.order?.status || "";

    if (response.ok && data?.success !== false && isClosedOrderTrackingStatus(status)) {
      removeStoredOrderTrackingRecord(hotelSlug);
      removeRecentOrderTrackingShortcut();
    }
  } catch {
    // If the network is unavailable, keep the shortcut instead of hiding a valid order.
  }
}

function renderRecentOrderTrackingShortcut() {
  const trackingRecord = getRecentOrderTrackingRecord();
  removeRecentOrderTrackingShortcut();

  if (!trackingRecord) return;
  validateRecentOrderTrackingShortcut(trackingRecord);

  const shortcut = document.createElement("div");
  shortcut.id = "recentOrderTrackingShortcut";
  shortcut.className = "recent-order-tracking-shortcut";
  shortcut.innerHTML = `
    <a href="${escapeAttr(trackingRecord.url)}" class="recent-order-tracking-shortcut__link" aria-label="Track recent order ${escapeAttr(trackingRecord.orderId)}">
      <span class="recent-order-tracking-shortcut__icon"><i class="fas fa-receipt" aria-hidden="true"></i></span>
      <span>
        <small>Recent order</small>
        <strong>Track #${escapeHTML(trackingRecord.orderId)}</strong>
      </span>
    </a>
    <button type="button" class="recent-order-tracking-shortcut__close" aria-label="Hide recent order tracking">&times;</button>
  `;

  shortcut
    .querySelector(".recent-order-tracking-shortcut__close")
    ?.addEventListener("click", () => {
      try {
        const dismissStorageKey = getOrderTrackingDismissStorageKey(trackingRecord.hotelSlug);
        if (dismissStorageKey) sessionStorage.setItem(dismissStorageKey, trackingRecord.orderId);
      } catch {
        // Hiding the shortcut is non-critical.
      }

      shortcut.remove();
    });

  document.body.appendChild(shortcut);
}

function showOrderTrackingPrompt(tracking = {}, message = "Your order was saved. You can now track it live.") {
  if (!tracking || typeof tracking !== "object") return;

  const trackingRecord = rememberOrderTracking(tracking);
  if (!trackingRecord) return;

  removeRecentOrderTrackingShortcut();
  let prompt = document.getElementById("orderTrackingPrompt");

  if (!prompt) {
    prompt = document.createElement("div");
    prompt.id = "orderTrackingPrompt";
    prompt.className = "order-tracking-prompt glass-card";
    prompt.setAttribute("role", "status");
    prompt.setAttribute("aria-live", "polite");
    document.body.appendChild(prompt);
  }

  prompt.innerHTML = `
    <div class="order-tracking-prompt__content">
      <span class="order-tracking-prompt__kicker">Order #${escapeHTML(trackingRecord.orderId)}</span>
      <strong>${escapeHTML(message)}</strong>
    </div>
    <div class="order-tracking-prompt__actions">
      <a class="btn btn-primary" href="${escapeAttr(trackingRecord.url)}" target="_blank" rel="noopener noreferrer">Track Order</a>
      <button type="button" class="order-tracking-prompt__close" aria-label="Dismiss tracking link">&times;</button>
    </div>
  `;

  prompt.hidden = false;
  prompt.classList.add("is-visible");

  prompt
    .querySelector(".order-tracking-prompt__close")
    ?.addEventListener("click", () => {
      prompt.classList.remove("is-visible");
      prompt.hidden = true;
      renderRecentOrderTrackingShortcut();
    }, { once: true });
}

function getSecureQrOrderStatusUrl(publicReference = "") {
  const normalizedReference = String(publicReference || "").trim();
  if (!normalizedReference) return "";

  const statusPath = `qr-order-status.html?submission=${encodeURIComponent(normalizedReference)}`;

  try {
    return new URL(statusPath, window.location.href).toString();
  } catch {
    return statusPath;
  }
}

function showSecureQrOrderStatusPrompt(publicReference = "") {
  const statusUrl = getSecureQrOrderStatusUrl(publicReference);
  if (!statusUrl) return;

  removeRecentOrderTrackingShortcut();
  let prompt = document.getElementById("orderTrackingPrompt");

  if (!prompt) {
    prompt = document.createElement("div");
    prompt.id = "orderTrackingPrompt";
    prompt.className = "order-tracking-prompt glass-card";
    prompt.setAttribute("role", "status");
    prompt.setAttribute("aria-live", "polite");
    document.body.appendChild(prompt);
  }

  prompt.innerHTML = `
    <div class="order-tracking-prompt__content">
      <span class="order-tracking-prompt__kicker">Table order received</span>
      <strong>Your order was confirmed. You can now view its live status.</strong>
    </div>
    <div class="order-tracking-prompt__actions">
      <a class="btn btn-primary" href="${escapeAttr(statusUrl)}" target="_blank" rel="noopener noreferrer">View Order Status</a>
      <button type="button" class="order-tracking-prompt__close" aria-label="Dismiss order status link">&times;</button>
    </div>
  `;

  prompt.hidden = false;
  prompt.classList.add("is-visible");
  prompt
    .querySelector(".order-tracking-prompt__close")
    ?.addEventListener("click", () => {
      prompt.classList.remove("is-visible");
      prompt.hidden = true;
    }, { once: true });
}

function flattenMenuData() {
  const menuData = getMenuData();
  const eligibleCategories = new Set(getMenuCategories());

  return Object.entries(menuData)
    .filter(([category]) => eligibleCategories.has(category))
    .flatMap(([category, items]) =>
    items.map((item) => ({ ...item, category }))
  );
}

function findMenuItemById(id) {
  return flattenMenuData().find((item) => item.id === id);
}

function normalizeCartNumber(value, fallback = 0) {
  const candidate = Number(value);
  return Number.isFinite(candidate) && candidate >= 0 ? candidate : fallback;
}

function normalizeCartItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") return null;

  const rawId = typeof rawItem.id === "string" ? rawItem.id.trim() : "";
  const menuItem = rawId ? findMenuItemById(rawId) : null;
  const id = rawId || menuItem?.id || "";
  const name =
    (typeof rawItem.name === "string" && rawItem.name.trim()) ||
    menuItem?.name ||
    "";
  const qty = Math.max(1, Math.trunc(normalizeCartNumber(rawItem.qty, 1)));
  const price = normalizeCartNumber(
    rawItem.price,
    Number.isFinite(Number(menuItem?.price)) ? Number(menuItem.price) : 0,
  );

  if (!id || !name) return null;

  return {
    id,
    name,
    price,
    qty,
    itemType:
      (typeof rawItem.itemType === "string" && rawItem.itemType.trim()) ||
      menuItem?.itemType ||
      menuItem?.item_type ||
      "single",
    comboItems: Array.isArray(rawItem.comboItems)
      ? rawItem.comboItems
      : Array.isArray(menuItem?.comboItems)
        ? menuItem.comboItems
        : [],
    originalPrice: normalizeCartNumber(
      rawItem.originalPrice,
      Number.isFinite(Number(menuItem?.originalPrice)) ? Number(menuItem.originalPrice) : 0,
    ),
    savings: normalizeCartNumber(
      rawItem.savings,
      Number.isFinite(Number(menuItem?.savings)) ? Number(menuItem.savings) : 0,
    ),
    image:
      (typeof rawItem.image === "string" && rawItem.image.trim()) ||
      menuItem?.image ||
      "",
  };
}

function normalizeCartItems(items = []) {
  return Array.isArray(items)
    ? items.map((item) => normalizeCartItem(item)).filter(Boolean)
    : [];
}

function loadCart() {
  const orderContext = getActiveOrderContext();
  const storageKey = getCartStorageKey(orderContext);

  try {
    const rawCart = localStorage.getItem(storageKey);
    if (!rawCart) {
      CART = [];
      return;
    }

    const storedCart = JSON.parse(rawCart);

    if (hasDineInOrderContext(orderContext)) {
      const tableCartItems = getFreshStoredTableCartItems(storedCart, orderContext);

      if (tableCartItems === null) {
        localStorage.removeItem(storageKey);
        CART = [];
        return;
      }

      CART = normalizeCartItems(tableCartItems);
      return;
    }

    CART = normalizeCartItems(Array.isArray(storedCart) ? storedCart : storedCart?.items || []);
  } catch {
    CART = [];
  }
}

function saveCart() {
  const orderContext = getActiveOrderContext();
  const storageKey = getCartStorageKey(orderContext);
  CART = normalizeCartItems(CART);

  try {
    if (!CART.length) {
      localStorage.removeItem(storageKey);
      return;
    }

    const storagePayload = hasDineInOrderContext(orderContext)
      ? getTableCartStoragePayload(CART, orderContext)
      : CART;

    localStorage.setItem(storageKey, JSON.stringify(storagePayload));
  } catch {
    // Cart storage is best-effort; the in-memory cart remains available for this page.
  }
}

function getCartItem(id) {
  return CART.find((item) => item.id === id);
}

function getItemQty(id) {
  return getCartItem(id)?.qty || 0;
}

function refreshRenderedMenuItem(itemId) {
  if (typeof window.updateRenderedMenuItem === "function") {
    window.updateRenderedMenuItem(itemId);
    return;
  }
  if (typeof window.renderMenu === "function") {
    window.renderMenu(getCurrentMenuCategory());
  }
}

function addToCart(itemId) {
  if (!isCustomerOrderingEnabled()) {
    HotelOrderingUnavailableModal.open();
    return false;
  }

  const menuItem = findMenuItemById(itemId);
  if (!menuItem) return false;

  const existing = getCartItem(itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    CART.push({
      id: menuItem.id,
      name: menuItem.name,
      price: Number(menuItem.price),
      qty: 1,
      itemType: String(menuItem.itemType || menuItem.item_type || "single").trim() || "single",
      comboItems: Array.isArray(menuItem.comboItems) ? menuItem.comboItems : [],
      originalPrice: Number(menuItem.originalPrice || 0) || 0,
      savings: Number(menuItem.savings || 0) || 0,
      image: menuItem.image,
    });
  }

  saveCart();
  updateCartUI();
  refreshRenderedMenuItem(itemId);
  return true;
}

function updateCartQty(itemId, delta) {
  if (delta > 0 && !isCustomerOrderingEnabled()) {
    HotelOrderingUnavailableModal.open();
    return;
  }

  const item = getCartItem(itemId);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    CART = CART.filter((i) => i.id !== itemId);
  }

  saveCart();
  updateCartUI();
  refreshRenderedMenuItem(itemId);
}

function removeFromCart(itemId) {
  CART = CART.filter((item) => item.id !== itemId);
  saveCart();
  updateCartUI();
  refreshRenderedMenuItem(itemId);
}

function calculateCartTotals(items = CART) {
  const safeItems = normalizeCartItems(items);
  const orderContext = getActiveOrderContext();
  const subtotal = safeItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gst = Math.round((subtotal * Number(CONFIG.GST_PERCENT || 5)) / 100);
  const deliveryCharge = getWebsiteDeliveryCharge(orderContext);
  const total = subtotal + gst + deliveryCharge;
  return { subtotal, gst, deliveryCharge, total };
}

function shouldApplyWebsiteDeliveryCharge(orderContext = getActiveOrderContext()) {
  return !hasDineInOrderContext(getActiveOrderContext(orderContext));
}

function getConfiguredDeliveryCharge() {
  const candidate = Number(window.APP_STATE?.theme?.payment?.deliveryCharge);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
}

function getWebsiteDeliveryCharge(orderContext = getActiveOrderContext()) {
  return shouldApplyWebsiteDeliveryCharge(orderContext) ? getConfiguredDeliveryCharge() : 0;
}

function getUpiDiscountPercent() {
  const candidate = Number(window.APP_STATE?.theme?.payment?.upiDiscountPercent);

  if (Number.isFinite(candidate)) {
    return Math.min(Math.max(candidate, 0), 100);
  }

  return Number(CONFIG.DEFAULT_UPI_DISCOUNT_PERCENT || 10);
}

function formatDiscountPercent(percent) {
  const safePercent = Number.isFinite(Number(percent)) ? Number(percent) : 0;

  return Number.isInteger(safePercent)
    ? `${safePercent}%`
    : `${safePercent.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function calculatePayableAmounts(items = CART) {
  const { subtotal, gst, deliveryCharge, total: normalTotal } = calculateCartTotals(items);
  const upiDiscountPercent = getUpiDiscountPercent();
  const gpayDiscount = Math.round((normalTotal * upiDiscountPercent) / 100);
  const gpayFinalTotal = Math.max(0, normalTotal - gpayDiscount);

  return {
    subtotal,
    gst,
    deliveryCharge,
    normalTotal,
    upiDiscountPercent,
    gpayDiscount,
    gpayFinalTotal,
  };
}

function buildUpiLink(amount) {
  const params = new URLSearchParams({
    pa: CONFIG.OWNER_UPI_ID || "",
    pn: getActiveHotelName() || "Hotel",
    tn: "Food Order",
    am: Number(amount || 0).toFixed(0),
    cu: "INR",
  });

  return `upi://pay?${params.toString()}`;
}

function isLikelyMobileUpiDevice() {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isTouchIpad =
    platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1;

  return /Android|iPhone|iPad|iPod/i.test(userAgent) || isTouchIpad;
}

function revealUpiFallbackBox() {
  const fallbackBox = document.getElementById("upiFallbackBox");

  if (fallbackBox) {
    fallbackBox.hidden = false;
  }
}

async function copyOwnerUpiIdToClipboard() {
  const upiId = CONFIG.OWNER_UPI_ID || "";

  if (!upiId || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(upiId);
    return true;
  } catch {
    return false;
  }
}

async function showManualUpiFallback(message) {
  revealUpiFallbackBox();
  const copied = await copyOwnerUpiIdToClipboard();

  showToast(copied ? `${message} UPI ID copied.` : message);
}
// Legacy duplicate retained only until the surrounding malformed text block is cleaned mechanically.
function buildOrderSummaryTextLegacyUnused({
  customerName,
  customerPhone,
  customerAddress,
  customerTableNote,
  locationLink,
  paymentMethod,
  note,
  paymentConfirmed,
  items = CART,
  orderContext = getActiveOrderContext(),
}) {
  const safeItems = normalizeCartItems(items);
  const { subtotal, gst, deliveryCharge, normalTotal, upiDiscountPercent, gpayDiscount, gpayFinalTotal } =
    calculatePayableAmounts(safeItems);

  const isUpi = paymentMethod === "UPI";
  const isOnlineGateway = paymentMethod === "ONLINE_GATEWAY";
  const hotelName = getActiveHotelName();
  const activeOrderContext = getActiveOrderContext(orderContext);

  const lines = [
  `Order Summary - ${hotelName || "Hotel"}`,
  `━━━━━━━━━━━━━━━━━━━━━━`,
  `Name: ${customerName}`,
  `Phone: ${customerPhone}`,
];

  if (hasDineInOrderContext(activeOrderContext)) {
    lines.push("Order Type: Dine-in");
    if (hasActiveOrderAddonContext(activeOrderContext)) {
      lines.push(`Add-on For Order: #${activeOrderContext.addToOrderId}`);
    }
    lines.push(`Table: ${activeOrderContext.tableNumber}`);
    lines.push(
      `Source: ${activeOrderContext.orderSource === "qr" ? "QR code" : activeOrderContext.orderSource}`,
    );
    lines.push(`Table Note: ${customerTableNote || "Not provided"}`);
  } else {
    lines.push(`Address: ${customerAddress || "Not provided"}`);
    lines.push(`Location: ${locationLink || "Not shared"}`);
  }
  lines.push("");

  safeItems.forEach((item) => {
    lines.push(
      ` ${item.name} ×${item.qty} = ${formatCurrency(item.price * item.qty)}`,
    );
  });

  lines.push("");
  lines.push(` Subtotal = ${formatCurrency(subtotal)}`);
  lines.push(` GST = ${formatCurrency(gst)}`);
  if (deliveryCharge > 0) {
    lines.push(` Delivery Charge = ${formatCurrency(deliveryCharge)}`);
  }

  if (isUpi) {
    lines.push(` Original Total = ${formatCurrency(normalTotal)}`);
    lines.push(
      ` Google Pay Discount (${formatDiscountPercent(upiDiscountPercent)}) = -${formatCurrency(gpayDiscount)}`,
    );
    lines.push(` Final Paid Amount = ${formatCurrency(gpayFinalTotal)}`);
    lines.push(" Payment Method = Google Pay / UPI");
    lines.push(` UPI ID = ${CONFIG.OWNER_UPI_ID}`);
    lines.push(
      ` Payment Status = ${paymentConfirmed ? "Confirmed" : "Pending"}`,
    );
  } else if (isOnlineGateway) {
    lines.push(` Total = ${formatCurrency(normalTotal)}`);
    lines.push(" Payment Method = Secure Online Payment");
    lines.push(
      ` Payment Status = ${paymentConfirmed ? "Paid (Verified)" : "Pending Gateway Payment"}`,
    );
  } else {
    lines.push(` Total = ${formatCurrency(normalTotal)}`);
    lines.push(" Payment Method = COD");
  }

  if (note) {
    lines.push("");
    lines.push(` Note = ${note}`);
  }

  return lines.join("\n");
}

function buildOrderSummaryText({
  customerName,
  customerPhone,
  customerAddress,
  customerTableNote,
  locationLink,
  paymentMethod,
  note,
  paymentConfirmed,
  items = CART,
  orderContext = getActiveOrderContext(),
}) {
  const safeItems = normalizeCartItems(items);
  const {
    subtotal,
    gst,
    deliveryCharge,
    normalTotal,
    upiDiscountPercent,
    gpayDiscount,
    gpayFinalTotal,
  } = calculatePayableAmounts(safeItems);

  const isUpi = paymentMethod === "UPI";
  const isOnlineGateway = paymentMethod === "ONLINE_GATEWAY";
  const hotelName = getActiveHotelName();
  const activeOrderContext = getActiveOrderContext(orderContext);

  const lines = [
    `Order Summary - ${hotelName || "Hotel"}`,
    "----------------------",
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
  ];

  if (hasDineInOrderContext(activeOrderContext)) {
    lines.push("Order Type: Dine-in");
    if (hasActiveOrderAddonContext(activeOrderContext)) {
      lines.push(`Add-on For Order: #${activeOrderContext.addToOrderId}`);
    }
    lines.push(`Table: ${activeOrderContext.tableNumber}`);
    lines.push(
      `Source: ${activeOrderContext.orderSource === "qr" ? "QR code" : activeOrderContext.orderSource}`,
    );
    lines.push(`Table Note: ${customerTableNote || "Not provided"}`);
  } else {
    lines.push(`Address: ${customerAddress || "Not provided"}`);
    lines.push(`Location: ${locationLink || "Not shared"}`);
  }

  lines.push("");

  safeItems.forEach((item) => {
    lines.push(` ${item.name} x${item.qty} = ${formatCurrency(item.price * item.qty)}`);
    const comboSummary = buildCartComboSummary(item);
    if (comboSummary) {
      lines.push(`   Includes: ${comboSummary}`);
    }
  });

  lines.push("");
  lines.push(` Subtotal = ${formatCurrency(subtotal)}`);
  lines.push(` GST = ${formatCurrency(gst)}`);
  if (deliveryCharge > 0) {
    lines.push(` Delivery Charge = ${formatCurrency(deliveryCharge)}`);
  }

  if (isUpi) {
    lines.push(` Original Total = ${formatCurrency(normalTotal)}`);
    lines.push(
      ` Google Pay Discount (${formatDiscountPercent(upiDiscountPercent)}) = -${formatCurrency(gpayDiscount)}`,
    );
    lines.push(` Final Paid Amount = ${formatCurrency(gpayFinalTotal)}`);
    lines.push(" Payment Method = Google Pay / UPI");
    lines.push(` UPI ID = ${CONFIG.OWNER_UPI_ID}`);
    lines.push(` Payment Status = ${paymentConfirmed ? "Confirmed" : "Pending"}`);
  } else if (isOnlineGateway) {
    lines.push(` Total = ${formatCurrency(normalTotal)}`);
    lines.push(" Payment Method = Secure Online Payment");
    lines.push(
      ` Payment Status = ${paymentConfirmed ? "Paid (Verified)" : "Pending Gateway Payment"}`,
    );
  } else {
    lines.push(` Total = ${formatCurrency(normalTotal)}`);
    lines.push(" Payment Method = COD");
  }

  if (note) {
    lines.push("");
    lines.push(` Note = ${note}`);
  }

  return lines.join("\n");
}

function buildEventMessage({
  name,
  phone,
  eventType,
  date,
  guests,
  specialRequirements
}) {
  return `*New Event Inquiry*

 Name: ${name}
 Phone: ${phone}
 Event Type: ${eventType}
 Date: ${date}
 Guests: ${guests || "Not specified"}
 Requirements: ${specialRequirements || "None"}

Please review and confirm.`;
}

async function handleEventInquirySubmit(e) {
  e.preventDefault();

  const form = e.target;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const name = form.querySelector('[name="name"], #eventName')?.value.trim();
  const phone = form.querySelector('[name="phone"], #eventPhone')?.value.trim();
  const eventType = form.querySelector('[name="eventType"], [name="type"], #eventType')?.value.trim();
  const date = form.querySelector('[name="date"], #eventDate')?.value.trim();
  const guests = form.querySelector('[name="guests"], #eventGuests')?.value.trim();
  const specialRequirements =
    form.querySelector('[name="specialRequirements"], [name="message"], #eventRequirements, #specialRequirements')
      ?.value.trim() || "";

  if (!name || !phone || !eventType || !date) {
    showToast("Please fill all required event details.");
    return;
  }

  const payload = getEventInquiryPayload({
    name,
    phone,
    eventType,
    date,
    guests,
    specialRequirements
  });

  try {
    await saveInquiry(payload);

    const message = buildEventMessage({
      name,
      phone,
      eventType,
      date,
      guests,
      specialRequirements
    });

    ownerWhatsAppLink(message);

    form.reset();
    showToast("Event inquiry saved successfully.");
  } catch (error) {
    console.error("Event inquiry save failed:", error);
    showToast("Failed to save inquiry. Please try again.");
  }
}

function bindEventInquiryForm() {
  const form =
    document.getElementById("eventForm") ||
    document.getElementById("eventInquiryForm");

  if (!form || form.dataset.boundSubmit === "true") return;

  form.addEventListener("submit", handleEventInquirySubmit);
  form.dataset.boundSubmit = "true";
}

async function handleReservationSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const success = document.getElementById("resSuccess");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const name = form.querySelector('[name="name"], #reservationName, #reserveName')?.value.trim();
  const phone = form.querySelector('[name="phone"], #reservationPhone, #reservePhone')?.value.trim();
  const date = form.querySelector('[name="date"], #reservationDate, #reserveDate')?.value.trim();
  const time = form.querySelector('[name="time"], #reservationTime, #reserveTime')?.value.trim();
  const guests = form.querySelector('[name="guests"], #reservationGuests, #reserveGuests')?.value.trim();
  const note =
    form.querySelector('[name="note"], [name="notes"], #reservationNote, #reserveNote')?.value.trim() || "";

  if (!name || !phone || !date || !time || !guests) {
    showToast("Please fill all required reservation details.");
    return;
  }

  const payload = getReservationPayload({
    name,
    phone,
    date,
    time,
    guests,
    note
  });

  try {
    await saveReservation(payload);

    form.reset();
    showToast("Reservation saved successfully.");

    if (success) {
      form.style.display = "none";
      success.hidden = false;

      setTimeout(() => {
        success.hidden = true;
        form.style.display = "block";
      }, 5000);
    }
  } catch (error) {
    console.error("Reservation save failed:", error);
    showToast("Failed to save reservation. Please try again.");
  }
}

function bindReservationForm() {
  const form =
    document.getElementById("reservationForm") ||
    document.getElementById("tableReservationForm");

  if (!form || form.dataset.boundSubmit === "true") return;

  const dateInput = form.querySelector('#reservationDate, #reserveDate, input[type="date"]');
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }

  form.addEventListener("submit", handleReservationSubmit);
  form.dataset.boundSubmit = "true";
}

async function postJSON(url, payload, { headers = {}, credentials = "same-origin" } = {}) {
  const res = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    credentials,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const validationMessages = Array.isArray(data.errors) && data.errors.length
      ? data.errors
      : Array.isArray(data.details)
        ? data.details.map((detail) => detail?.message).filter(Boolean)
        : [];
    const validationDetails = validationMessages.length
      ? ` (${validationMessages.join("; ")})`
      : "";
    const error = new Error(`${data.message || "Request failed"}${validationDetails}`);
    error.status = res.status;
    error.response = data;
    throw error;
  }

  return data;
}

const SECURE_QR_PENDING_REQUEST_KEY = "secure_qr_pending_order_v1";

function getSecureQrClientRequestId(items = []) {
  const signature = JSON.stringify(items.map((item) => ({ id: String(item.id), qty: Number(item.qty) })));
  try {
    const stored = JSON.parse(window.sessionStorage?.getItem(SECURE_QR_PENDING_REQUEST_KEY) || "null");
    if (stored?.signature === signature && typeof stored?.id === "string" && stored.id.length >= 12) {
      return stored.id;
    }
  } catch {
    // A fresh id below is still protected by the server's active-order transaction.
  }
  const id = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  try {
    window.sessionStorage?.setItem(SECURE_QR_PENDING_REQUEST_KEY, JSON.stringify({ signature, id }));
  } catch {
    // Storage is an availability aid only; it is not an authorization mechanism.
  }
  return id;
}

function clearSecureQrClientRequestId() {
  try {
    window.sessionStorage?.removeItem(SECURE_QR_PENDING_REQUEST_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

const ACTIVE_NOTIFICATIONS = new Map();
const NOTIFICATION_DURATIONS = Object.freeze({
  success: 3500,
  info: 4500,
  warning: 7000,
  error: 9000
});
const NOTIFICATION_ICONS = Object.freeze({
  success: "✓",
  info: "i",
  warning: "!",
  error: "×"
});

function ensureNotificationRegion() {
  let region = $("#notificationRegion");
  if (region) return region;

  region = document.createElement("div");
  region.id = "notificationRegion";
  region.className = "notification-region";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "false");
  region.setAttribute("aria-relevant", "additions text");
  document.body.appendChild(region);
  return region;
}

function dismissNotification(entry, { immediate = false } = {}) {
  if (!entry?.node) return;
  window.clearTimeout(entry.timer);
  entry.node.classList.remove("is-visible");
  entry.node.classList.add("is-leaving");
  const remove = () => {
    entry.node.remove();
    ACTIVE_NOTIFICATIONS.delete(entry.key);
  };
  if (immediate || prefersReducedMotion()) remove();
  else window.setTimeout(remove, 190);
}

function showToast(input, options = {}) {
  const supplied = input && typeof input === "object" ? input : { message: input };
  const config = { ...supplied, ...options };
  const type = ["success", "info", "warning", "error"].includes(config.type)
    ? config.type
    : "info";
  const message = getPublicNotificationMessage(config.message);
  const title = String(config.title || "").trim().slice(0, 160);
  if (!message && !title) return null;

  const key = String(config.dedupeKey || `${type}::${title}::${message}`).slice(0, 512);
  const existing = ACTIVE_NOTIFICATIONS.get(key);
  const duration = Number.isFinite(Number(config.duration))
    ? Math.max(0, Number(config.duration))
    : NOTIFICATION_DURATIONS[type];

  function scheduleDismiss(entry) {
    window.clearTimeout(entry.timer);
    if (duration > 0) {
      entry.timer = window.setTimeout(() => dismissNotification(entry), duration);
    }
  }

  if (existing) {
    scheduleDismiss(existing);
    return existing.node;
  }

  const region = ensureNotificationRegion();
  while (region.children.length >= 4) {
    const oldestNode = region.firstElementChild;
    const oldestEntry = [...ACTIVE_NOTIFICATIONS.values()].find(
      (entry) => entry.node === oldestNode
    );
    if (oldestEntry) dismissNotification(oldestEntry, { immediate: true });
    else oldestNode?.remove();
  }

  const toast = document.createElement("div");
  toast.className = `notification-toast notification-toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-atomic", "true");

  const icon = document.createElement("span");
  icon.className = "notification-toast__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = NOTIFICATION_ICONS[type];

  const content = document.createElement("div");
  content.className = "notification-toast__content";
  if (title) {
    const titleNode = document.createElement("p");
    titleNode.className = "notification-toast__title";
    titleNode.textContent = title;
    content.appendChild(titleNode);
  }
  if (message) {
    const messageNode = document.createElement("p");
    messageNode.className = "notification-toast__message";
    messageNode.textContent = message;
    content.appendChild(messageNode);
  }

  const safeActionUrl = getSafePublicNavigationUrl(config.actionUrl);
  const actionLabel = String(config.actionLabel || "").trim().slice(0, 100);
  if (safeActionUrl && actionLabel) {
    const action = document.createElement("a");
    action.className = "notification-toast__action";
    action.href = safeActionUrl;
    action.textContent = actionLabel;
    if (new URL(safeActionUrl, window.location.href).origin !== window.location.origin) {
      action.target = "_blank";
      action.rel = "noopener noreferrer";
    }
    content.appendChild(action);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "notification-toast__close";
  closeButton.setAttribute("aria-label", "Dismiss notification");
  closeButton.textContent = "×";

  toast.append(icon, content, closeButton);
  region.appendChild(toast);

  const entry = { key, node: toast, timer: 0 };
  ACTIVE_NOTIFICATIONS.set(key, entry);
  closeButton.addEventListener("click", () => dismissNotification(entry));
  toast.addEventListener("mouseenter", () => window.clearTimeout(entry.timer));
  toast.addEventListener("mouseleave", () => scheduleDismiss(entry));
  toast.addEventListener("focusin", () => window.clearTimeout(entry.timer));
  toast.addEventListener("focusout", () => scheduleDismiss(entry));

  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
  scheduleDismiss(entry);
  return toast;
}

function ensureMenuAssistantStyles() {
  if (document.getElementById("menuAssistantStyles")) return;

  const style = document.createElement("style");
  style.id = "menuAssistantStyles";
  style.textContent = `
    .menu-assistant-card {
      margin: 1rem 0 1.25rem;
      padding: 1.05rem;
      border: 1px solid rgba(255,255,255,0.16);
      background:
        linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06)),
        rgba(8, 14, 28, 0.94);
      border-radius: 22px;
      box-shadow: 0 24px 50px rgba(0,0,0,0.24);
      backdrop-filter: blur(18px);
    }

    .menu-assistant-card.is-open {
      border-color: rgba(255,255,255,0.22);
      box-shadow: 0 28px 56px rgba(0,0,0,0.28);
    }

    .menu-assistant-card [hidden] {
      display: none !important;
    }

    .menu-assistant-card:not(.is-open) {
      margin: 0.9rem 0 1.1rem;
      padding: 0;
      border-color: transparent;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }

    .menu-assistant-card:not(.is-open) .menu-assistant-head {
      justify-content: flex-start;
      gap: 0;
    }

    body:not(.menu-page) .menu-assistant-card:not(.is-open) .menu-assistant-head {
      gap: 0.65rem;
      align-items: center;
    }

    body:not(.menu-page) .menu-assistant-card:not(.is-open) .menu-assistant-head::before {
      content: "Menu help";
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 0.72rem;
      border-radius: 999px;
      border: 1px solid rgba(201, 168, 76, 0.26);
      background: rgba(201, 168, 76, 0.12);
      color: #8a6a1d;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .menu-assistant-card:not(.is-open) .menu-assistant-toggle {
      border-color: rgba(201, 168, 76, 0.42);
      background: rgba(18, 16, 14, 0.94);
      color: #fff9ea;
      box-shadow: 0 12px 28px rgba(0,0,0,0.22);
    }

    .menu-assistant-card:not(.is-open) .menu-assistant-toggle:hover,
    .menu-assistant-card:not(.is-open) .menu-assistant-toggle:focus-visible {
      border-color: rgba(232, 208, 138, 0.65);
      background: rgba(28, 24, 20, 0.98);
      color: #fff;
    }

    .menu-assistant-card:not(.is-open) .menu-assistant-head > div {
      display: none;
    }

    .menu-assistant-card:not(.is-open) .menu-assistant-copy,
    .menu-assistant-card:not(.is-open) .menu-assistant-example,
    .menu-assistant-card:not(.is-open) .menu-assistant-guard-copy,
    .menu-assistant-card:not(.is-open) .menu-assistant-guard-list,
    .menu-assistant-card:not(.is-open) .menu-assistant-context {
      display: none;
    }

    .menu-assistant-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .menu-assistant-head > div {
      flex: 1 1 420px;
      min-width: 0;
    }

    .menu-assistant-title {
      margin: 0;
      font-size: 1.05rem;
      color: #fff;
    }

    .menu-assistant-copy {
      margin: 0.35rem 0 0;
      color: rgba(255,255,255,0.78);
      font-size: 0.95rem;
      max-width: 680px;
    }

    .menu-assistant-example {
      margin: 0.45rem 0 0;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.75rem;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      color: rgba(255,245,220,0.9);
      font-size: 0.83rem;
      line-height: 1.45;
      max-width: 100%;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      text-align: left;
      appearance: none;
      -webkit-appearance: none;
    }

    .menu-assistant-example strong {
      color: rgba(255,255,255,0.96);
      font-weight: 700;
    }

    .menu-assistant-example:hover,
    .menu-assistant-example:focus-visible {
      border-color: rgba(255,255,255,0.24);
      background: rgba(255,255,255,0.12);
      transform: translateY(-1px);
      outline: none;
    }

    .menu-assistant-guard-copy {
      margin: 0.6rem 0 0;
      color: rgba(255,255,255,0.68);
      font-size: 0.82rem;
      line-height: 1.5;
      max-width: 720px;
    }

    .menu-assistant-guard-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.7rem;
    }

    .menu-assistant-context {
      margin-top: 0.8rem;
      display: grid;
      gap: 0.45rem;
    }

    .menu-assistant-context-pill {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 0.38rem 0.7rem;
      border-radius: 999px;
      border: 1px solid rgba(201, 168, 76, 0.24);
      background: rgba(201, 168, 76, 0.14);
      color: #f3deb0;
      font-size: 0.78rem;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .menu-assistant-context-copy {
      margin: 0;
      color: rgba(255,255,255,0.76);
      font-size: 0.84rem;
      line-height: 1.5;
      max-width: 720px;
    }

    .menu-assistant-guard-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.38rem 0.68rem;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.84);
      font-size: 0.78rem;
      line-height: 1.2;
    }

    .menu-assistant-guard-chip.is-supported {
      border-color: rgba(101, 202, 146, 0.32);
      background: rgba(101, 202, 146, 0.14);
      color: #d7ffe5;
    }

    .menu-assistant-guard-chip.is-limited {
      border-color: rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.74);
    }

    .menu-assistant-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 165px;
      min-height: 46px;
      white-space: nowrap;
      align-self: flex-start;
      border-color: rgba(255,255,255,0.26);
      background: rgba(255,255,255,0.09);
      color: rgba(255,255,255,0.96);
      font-weight: 600;
    }

    .menu-assistant-toggle.is-open {
      border-color: rgba(255,255,255,0.34);
      background: rgba(255,255,255,0.18);
      color: #fff;
    }

    .menu-assistant-toggle:hover,
    .menu-assistant-toggle:focus-visible {
      border-color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.16);
      color: #fff;
      outline: none;
    }

    .menu-assistant-body {
      margin-top: 1rem;
      display: grid;
      gap: 0.9rem;
    }

    .menu-assistant-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .menu-assistant-prompts-meta {
      margin: 0 0 -0.2rem;
      color: rgba(255,255,255,0.62);
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .menu-assistant-suggestions,
    .menu-assistant-followups,
    .menu-assistant-actions {
      display: grid;
      gap: 0.55rem;
    }

    .menu-assistant-section-label {
      margin: 0;
      color: rgba(255,255,255,0.64);
      font-size: 0.76rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .menu-assistant-section-body {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .menu-assistant-chip {
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.1);
      color: #fff;
      padding: 0.65rem 0.85rem;
      border-radius: 999px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
    }

    .menu-assistant-chip:hover,
    .menu-assistant-chip:focus-visible {
      background: rgba(255,255,255,0.14);
      border-color: rgba(255,255,255,0.26);
      transform: translateY(-1px);
      outline: none;
    }

    .menu-assistant-chip.is-active-prompt {
      border-color: rgba(255, 221, 149, 0.42);
      background: rgba(255, 221, 149, 0.2);
      color: #fff5d8;
      box-shadow: 0 0 0 1px rgba(255, 221, 149, 0.18);
    }

    .menu-assistant-chip.is-active-followup {
      border-color: rgba(131, 216, 255, 0.38);
      background: rgba(131, 216, 255, 0.18);
      color: #e3f8ff;
      box-shadow: 0 0 0 1px rgba(131, 216, 255, 0.16);
    }

    .menu-assistant-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
    }

    .menu-assistant-input {
      width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.1);
      color: #fff;
      padding: 0.9rem 1rem;
      font-size: 0.98rem;
    }

    .menu-assistant-input::placeholder {
      color: rgba(255,255,255,0.46);
    }

    .menu-assistant-char-count {
      margin: -0.2rem 0 0;
      text-align: right;
      color: rgba(255,255,255,0.56);
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .menu-assistant-char-count.is-near-limit {
      color: rgba(255, 223, 161, 0.92);
    }

    .menu-assistant-submit-hint {
      margin: -0.15rem 0 0;
      text-align: right;
      color: rgba(255,255,255,0.62);
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .menu-assistant-status {
      min-height: 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: rgba(255,255,255,0.78);
      font-size: 0.9rem;
    }

    .menu-assistant-empty-hint {
      margin: -0.15rem 0 0;
      color: rgba(255,255,255,0.62);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .menu-assistant-failure-hint {
      margin: -0.1rem 0 0;
      padding: 0.72rem 0.84rem;
      border-radius: 16px;
      border: 1px dashed rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.76);
      font-size: 0.83rem;
      line-height: 1.55;
    }

    .menu-assistant-retry {
      display: flex;
      justify-content: flex-start;
      margin: -0.15rem 0 0;
    }

    .menu-assistant-retry-btn {
      font-size: 0.84rem;
      padding: 0.5rem 0.78rem;
    }

    .menu-assistant-status.is-loading {
      color: rgba(255, 240, 200, 0.94);
    }

    .menu-assistant-status.is-loading::before {
      content: "";
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      background: #d7b45c;
      box-shadow: 0 0 0 0 rgba(215, 180, 92, 0.55);
      animation: menuAssistantPulse 1.15s ease-in-out infinite;
      flex: 0 0 auto;
    }

    @keyframes menuAssistantPulse {
      0% {
        transform: scale(0.92);
        box-shadow: 0 0 0 0 rgba(215, 180, 92, 0.48);
      }
      70% {
        transform: scale(1.08);
        box-shadow: 0 0 0 0.5rem rgba(215, 180, 92, 0);
      }
      100% {
        transform: scale(0.92);
        box-shadow: 0 0 0 0 rgba(215, 180, 92, 0);
      }
    }

    .menu-assistant-history {
      display: grid;
      gap: 0.65rem;
    }

    .menu-assistant-history-title {
      margin: 0;
      color: rgba(255,255,255,0.72);
      font-size: 0.82rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .menu-assistant-toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
      flex-wrap: wrap;
      margin-top: -0.15rem;
    }

    .menu-assistant-clear-btn {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.8);
      font-size: 0.8rem;
      line-height: 1.2;
      padding: 0.42rem 0.72rem;
      cursor: pointer;
      transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .menu-assistant-clear-btn:hover,
    .menu-assistant-clear-btn:focus-visible {
      border-color: rgba(255,255,255,0.24);
      background: rgba(255,255,255,0.12);
      transform: translateY(-1px);
      outline: none;
    }

    .menu-assistant-clear-btn:disabled {
      cursor: not-allowed;
      opacity: 0.58;
      transform: none;
    }

    .menu-assistant-history-list {
      display: grid;
      gap: 0.65rem;
    }

    .menu-assistant-history-item {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.06);
      padding: 0.8rem 0.9rem;
      display: grid;
      gap: 0.38rem;
    }

    .menu-assistant-history-question,
    .menu-assistant-history-answer {
      margin: 0;
      line-height: 1.55;
      font-size: 0.9rem;
    }

    .menu-assistant-history-question {
      color: rgba(255,255,255,0.92);
    }

    .menu-assistant-history-answer {
      color: rgba(255,255,255,0.72);
    }

    .menu-assistant-helper {
      border-radius: 16px;
      border: 1px solid rgba(201, 168, 76, 0.2);
      background: rgba(201, 168, 76, 0.08);
      padding: 0.95rem 1rem;
      display: grid;
      gap: 0.55rem;
    }

    .menu-assistant-helper-title,
    .menu-assistant-helper-copy {
      margin: 0;
    }

    .menu-assistant-helper-title {
      color: #fff0c8;
      font-size: 0.92rem;
    }

    .menu-assistant-helper-copy {
      color: rgba(255,255,255,0.76);
      font-size: 0.88rem;
      line-height: 1.55;
    }

    .menu-assistant-helper-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      min-height: 44px;
      border-color: rgba(255,255,255,0.26);
      background: rgba(255,255,255,0.09);
      color: rgba(255,255,255,0.96);
      font-weight: 600;
    }

    .menu-assistant-helper-link:hover,
    .menu-assistant-helper-link:focus-visible {
      border-color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.16);
      color: #fff;
      outline: none;
    }

    .menu-assistant-reply {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.08);
      padding: 1rem;
      display: grid;
      gap: 0.85rem;
    }

    .menu-assistant-reply.is-fresh {
      animation: menuAssistantReplyGlow 1.3s ease;
    }

    @keyframes menuAssistantReplyGlow {
      0% {
        border-color: rgba(215, 180, 92, 0.42);
        background: rgba(255,255,255,0.12);
        box-shadow: 0 0 0 0 rgba(215, 180, 92, 0.24);
      }
      55% {
        border-color: rgba(215, 180, 92, 0.28);
        background: rgba(255,255,255,0.1);
        box-shadow: 0 0 0 0.52rem rgba(215, 180, 92, 0);
      }
      100% {
        border-color: rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.08);
        box-shadow: 0 0 0 0 rgba(215, 180, 92, 0);
      }
    }

    .menu-assistant-answer {
      margin: 0;
      color: #fff;
      line-height: 1.65;
    }

    .menu-assistant-summary {
      margin: 0;
      color: #fff0c8;
      font-size: 0.79rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .menu-assistant-updated {
      margin: -0.15rem 0 0;
      color: rgba(255,255,255,0.6);
      font-size: 0.76rem;
      line-height: 1.4;
    }

    .menu-assistant-disclaimer {
      margin: 0;
      color: rgba(255,255,255,0.58);
      font-size: 0.82rem;
    }

    .menu-assistant-item {
      min-width: 180px;
      flex: 1 1 220px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.07);
      padding: 0.9rem;
    }

    .menu-assistant-item strong,
    .menu-assistant-item span {
      display: block;
    }

    .menu-assistant-item strong {
      color: #fff;
      margin-bottom: 0.25rem;
    }

    .menu-assistant-item span {
      color: rgba(255,255,255,0.7);
      font-size: 0.88rem;
      line-height: 1.5;
    }

    .menu-assistant-empty-result {
      margin: 0;
      border-radius: 16px;
      border: 1px dashed rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.05);
      padding: 0.85rem 0.95rem;
      color: rgba(255,255,255,0.74);
      font-size: 0.87rem;
      line-height: 1.55;
    }

    @media (max-width: 768px) {
      .menu-assistant-form {
        grid-template-columns: 1fr;
      }

      .menu-assistant-toggle,
      .menu-assistant-form .btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function getThemeAiAssistantConfig() {
  const source =
    window.APP_STATE?.theme?.aiAssistant &&
    typeof window.APP_STATE.theme.aiAssistant === "object" &&
    !Array.isArray(window.APP_STATE.theme.aiAssistant)
      ? window.APP_STATE.theme.aiAssistant
      : {};
  const starterPrompts = Array.isArray(source.starterPrompts)
    ? source.starterPrompts
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const examplePrompt =
    typeof source.examplePrompt === "string" ? source.examplePrompt.trim() : "";

  return {
    enabled: source.enabled !== false,
    title:
      (typeof source.title === "string" && source.title.trim()) ||
      "Ask about dishes, budget, and combos",
    intro:
      (typeof source.intro === "string" && source.intro.trim()) ||
      "This helper answers only from the current hotel's live menu and can suggest safe actions like add to cart.",
    examplePrompt,
    starterPrompts: starterPrompts.length
      ? starterPrompts
      : [
          "Best veg starter under 300",
          "Suggest something spicy for 2 people",
          "Tell me about paneer tikka"
        ]
  };
}

function getMenuAssistantScopeGuardConfig() {
  const supported = ["Suggestions", "Budgets", "Dish details"];

  if (hasDineInOrderContext()) {
    return {
      copy:
        "Menu help only. For live order status, bill requests, or staff help, please use the regular table-order buttons.",
      supported,
      limited: ["Order status", "Bill request", "Staff help"]
    };
  }

  return {
    copy:
      "Menu help only. For order tracking, payment, reservation, or support, please use the regular site options.",
    supported,
    limited: ["Order status", "Payment", "Reservations"]
  };
}

function getMenuAssistantDefaultDisclaimer() {
  if (hasDineInOrderContext()) {
    return "This assistant is grounded only in the current hotel's active menu and does not handle live order status, bill requests, or staff calls.";
  }

  return "This assistant is grounded only in the current hotel's active menu and does not handle order tracking, billing, payment, or reservations.";
}

function getMenuAssistantRuntimeContextMeta(context = getActiveOrderContext()) {
  if (!hasDineInOrderContext(context)) {
    return null;
  }

  const isAddonContext = hasActiveOrderAddonContext(context);
  const tableLabel = `Table ${context.tableNumber}`;

  return {
    label: isAddonContext ? `${tableLabel} add-on menu help` : `${tableLabel} menu help`,
    copy: isAddonContext
      ? `You are adding more dishes for ${tableLabel}. Smart Waiter can help compare menu items, but the normal add-to-order and table actions still handle the real order flow.`
      : `Smart Waiter is helping ${tableLabel} with menu questions only. Use the normal table-order buttons for order status, bill requests, or staff help.`,
    placeholder: isAddonContext
      ? `Ask for ${tableLabel} add-on suggestions, e.g. a mild side dish`
      : `Ask for ${tableLabel} menu ideas, e.g. spicy starter for 2`,
    quickPrompts: isAddonContext
      ? [
          "Suggest something light to add",
          "Suggest a mild starter to add",
          "Suggest a drink to add for 2 people"
        ]
      : [
          "Suggest a starter to share for 2 people",
          "Suggest a light dish for this table",
          "Suggest a drink for 2 people"
        ]
  };
}

function getEffectiveMenuAssistantPrompts(basePrompts = [], context = getActiveOrderContext()) {
  const normalizedBase = Array.isArray(basePrompts)
    ? basePrompts
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    : [];
  const runtimeContextMeta = getMenuAssistantRuntimeContextMeta(context);
  const contextPrompts = Array.isArray(runtimeContextMeta?.quickPrompts)
    ? runtimeContextMeta.quickPrompts
    : [];
  const seen = new Set();

  return [...contextPrompts, ...normalizedBase].reduce((prompts, entry) => {
    if (prompts.length >= 6) {
      return prompts;
    }

    const normalizedKey = entry.toLowerCase();
    if (!entry || seen.has(normalizedKey)) {
      return prompts;
    }

    seen.add(normalizedKey);
    prompts.push(entry);
    return prompts;
  }, []);
}

let CART_DRAWER_LAST_FOCUSED = null;
let CART_DRAWER_PREVIOUS_BODY_OVERFLOW = "";

function getCartDrawerTriggers() {
  return [$("#openCartBtn"), $("#floatingCartBtn")].filter(Boolean);
}

function setCartDrawerExpanded(isOpen) {
  getCartDrawerTriggers().forEach((trigger) => {
    trigger.setAttribute("aria-expanded", String(isOpen));
  });
}

function getCartDrawerFocusableElements(drawer) {
  if (!drawer) return [];
  return $(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    drawer
  ).filter(
    (element) =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
  );
}

function openCartDrawer() {
  const drawer = $("#cartDrawer");
  const backdrop = $("#cartBackdrop");
  if (!drawer || !backdrop) return;

  CART_DRAWER_LAST_FOCUSED = document.activeElement;
  CART_DRAWER_PREVIOUS_BODY_OVERFLOW = document.body.style.overflow;
  drawer.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  backdrop.setAttribute("aria-hidden", "false");
  setCartDrawerExpanded(true);
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => {
    ($("#closeCartBtn") || drawer).focus({ preventScroll: true });
  });
}

function closeCartDrawer() {
  const drawer = $("#cartDrawer");
  const backdrop = $("#cartBackdrop");
  if (!drawer || !backdrop) return;

  drawer.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");
  setCartDrawerExpanded(false);
  document.body.style.overflow = CART_DRAWER_PREVIOUS_BODY_OVERFLOW;

  const focusTarget = CART_DRAWER_LAST_FOCUSED;
  CART_DRAWER_LAST_FOCUSED = null;
  if (focusTarget && typeof focusTarget.focus === "function" && focusTarget.isConnected) {
    focusTarget.focus({ preventScroll: true });
  }
}

function handleCartDrawerKeydown(event) {
  const drawer = $("#cartDrawer");
  if (!drawer || drawer.hidden) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeCartDrawer();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = getCartDrawerFocusableElements(drawer);
  if (!focusable.length) {
    event.preventDefault();
    drawer.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

document.addEventListener("keydown", handleCartDrawerKeydown);

function updateCartUI() {
  const cartItemsWrap = $("#cartItems");
  const subtotalEl = $("#cartSubtotal");
  const gstEl = $("#cartGst");
  const deliveryChargeRowEl = $("#cartDeliveryChargeRow");
  const deliveryChargeEl = $("#cartDeliveryCharge");
  const totalEl = $("#cartTotal");
  const countEl = $("#cartCount");
  const floatingCountEl = $("#floatingCartCount");
  const previewEl = $("#orderPreview");
  const gstPercentLabel = $("#gstPercentLabel");
  const checkoutForm = $("#checkoutForm");
  const checkoutSubmitBtn =
    $("#checkoutSubmitBtn") ||
    checkoutForm?.querySelector("button[data-checkout-submit='true']");
  const orderingDisabled = !isCustomerOrderingEnabled();
  const orderingConfig = getOrderingUnavailableModalConfig();

  const { subtotal, gst, deliveryCharge, normalTotal, gpayDiscount, gpayFinalTotal } =
    calculatePayableAmounts();

  const selectedPaymentMethod =
    $('input[name="paymentMethod"]:checked')?.value || "COD";
  const totalQty = CART.reduce((sum, item) => sum + item.qty, 0);

  if (countEl) countEl.textContent = totalQty;
  if (floatingCountEl) floatingCountEl.textContent = totalQty;
  if (gstPercentLabel) gstPercentLabel.textContent = CONFIG.GST_PERCENT || 5;
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (gstEl) gstEl.textContent = formatCurrency(gst);
  if (deliveryChargeRowEl) {
    deliveryChargeRowEl.hidden = !(deliveryCharge > 0);
  }
  if (deliveryChargeEl) {
    deliveryChargeEl.textContent = formatCurrency(deliveryCharge);
  }
  if (totalEl) {
    totalEl.textContent = formatCurrency(
      selectedPaymentMethod === "UPI" ? gpayFinalTotal : normalTotal,
    );
  }

  if (checkoutForm && checkoutSubmitBtn) {
    let orderingNotice = document.getElementById("orderingUnavailableCheckoutNotice");

    if (!orderingNotice) {
      orderingNotice = document.createElement("div");
      orderingNotice.id = "orderingUnavailableCheckoutNotice";
      orderingNotice.className = "hotel-ordering-inline-notice";
      orderingNotice.hidden = true;
      checkoutForm.insertBefore(orderingNotice, checkoutSubmitBtn);
    }

    const submitLabel = checkoutSubmitBtn.querySelector("span");
    const submitIcon = checkoutSubmitBtn.querySelector("i");

    if (!checkoutSubmitBtn.dataset.defaultLabel && submitLabel) {
      checkoutSubmitBtn.dataset.defaultLabel = submitLabel.textContent.trim();
    }

    if (!checkoutSubmitBtn.dataset.defaultIconClass && submitIcon) {
      checkoutSubmitBtn.dataset.defaultIconClass = submitIcon.className;
    }

    if (orderingDisabled) {
      orderingNotice.hidden = false;
      orderingNotice.textContent = orderingConfig.message;
      checkoutSubmitBtn.type = "button";
      checkoutSubmitBtn.classList.add("hotel-ordering-disabled-btn");
      checkoutSubmitBtn.setAttribute("aria-disabled", "true");
      if (submitLabel) {
        submitLabel.textContent = getOrderingUnavailableActionLabel();
      }
      if (submitIcon) {
        submitIcon.className = "fas fa-clock";
      }
    } else {
      orderingNotice.hidden = true;
      orderingNotice.textContent = "";
      checkoutSubmitBtn.type = "submit";
      checkoutSubmitBtn.classList.remove("hotel-ordering-disabled-btn");
      checkoutSubmitBtn.removeAttribute("aria-disabled");
      if (submitLabel) {
        submitLabel.textContent = checkoutSubmitBtn.dataset.defaultLabel || "Place Order";
      }
      if (submitIcon && checkoutSubmitBtn.dataset.defaultIconClass) {
        submitIcon.className = checkoutSubmitBtn.dataset.defaultIconClass;
      }
    }
  }
  syncTableCartResumeNotice();
  if (!cartItemsWrap) return;

  if (!CART.length) {
    cartItemsWrap.innerHTML = `<p class="cart-empty-text">Your cart is empty.</p>`;
    if (previewEl) previewEl.textContent = "No order yet.";
    return;
  }

  cartItemsWrap.innerHTML = CART.map(
    (item) => `
    <div class="cart-item-card">
      <div class="cart-item-top">
        <div>
          <h5>${escapeHTML(item.name)}</h5>
          <span>${formatCurrency(item.price)} each</span>
          ${buildCartItemMetaMarkup(item)}
        </div>
        <strong>${formatCurrency(item.qty * item.price)}</strong>
      </div>

      <div class="cart-item-actions">
        <div class="qty-inline">
          <button type="button" class="qty-btn" data-cart-minus="${escapeAttr(item.id)}" aria-label="Decrease quantity">−</button>
          <span>${item.qty}</span>
          <button type="button" class="qty-btn" data-cart-plus="${escapeAttr(item.id)}" aria-label="Increase quantity"${orderingDisabled ? " disabled" : ""}>+</button>
        </div>

        <button type="button" class="remove-item-btn" data-remove-item="${escapeAttr(item.id)}">
          Remove Item
        </button>
      </div>
    </div>
  `,
  ).join("");
}

function buildCartComboSummary(item = {}) {
  if (String(item?.itemType || "single").trim() !== "combo") {
    return "";
  }

  return (Array.isArray(item?.comboItems) ? item.comboItems : [])
    .map((comboItem) => {
      const quantity = Number(comboItem?.quantity || 1);
      const comboItemName = String(comboItem?.name || comboItem?.itemId || "").trim();
      return comboItemName ? `${quantity}x ${comboItemName}` : "";
    })
    .filter(Boolean)
    .join(" + ");
}

function getCartItemMetaLines(item = {}) {
  const lines = [];
  const comboSummary = buildCartComboSummary(item);
  const originalPrice = Number(item?.originalPrice || 0);
  const savings = Number(item?.savings || 0);
  const price = Number(item?.price || 0);

  if (comboSummary) {
    lines.push(`Includes: ${comboSummary}`);
  }

  if (
    String(item?.itemType || "single").trim() === "combo" &&
    originalPrice > price &&
    savings > 0
  ) {
    lines.push(`Was ${formatCurrency(originalPrice)} | Save ${formatCurrency(savings)}`);
  }

  return lines;
}

function buildCartItemMetaMarkup(item = {}) {
  const lines = getCartItemMetaLines(item);
  if (!lines.length) {
    return "";
  }

  return `<div class="cart-item-meta">${lines.map((line) => escapeHTML(line)).join("<br>")}</div>`;
}

function bindCartDelegation() {
  const cartItemsWrap = $("#cartItems");
  if (!cartItemsWrap) return;

  cartItemsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.cartMinus) {
      updateCartQty(btn.dataset.cartMinus, -1);
      return;
    }

    if (btn.dataset.cartPlus) {
      updateCartQty(btn.dataset.cartPlus, 1);
      return;
    }

    if (btn.dataset.removeItem) {
      removeFromCart(btn.dataset.removeItem);
    }
  });
}

/* ════════════════════════════════════════════════════════
   1. LOADING SCREEN
   ════════════════════════════════════════════════════════ */
(function initLoader() {
  const loader = $("#loader");
  const bar = $("#loaderBar");
  if (!loader || !bar) return;

  let finished = false;
  bar.style.width = "12%";

  const finishLoader = () => {
    if (finished) return;
    finished = true;
    bar.style.width = "100%";
    loader.classList.add("hidden");
    loader.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document
      .querySelectorAll("[data-anim]")
      .forEach((el) => el.classList.add("anim-ready"));
  };

  document.addEventListener("app:ready", finishLoader, { once: true });
  document.body.style.overflow = "hidden";
})();

/* ════════════════════════════════════════════════════════
   2. CUSTOM CURSOR
   ════════════════════════════════════════════════════════ */
(function initCursor() {
  const dot = $("#cursorDot");
  const ring = $("#cursorRing");
  const supportsFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
  if (!dot || !ring || !supportsFinePointer || prefersReducedMotion()) return;

  let mx = -100;
  let my = -100;
  let rx = -100;
  let ry = -100;
  let frameId = 0;

  function animateCursor() {
    frameId = 0;
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;

    if (Math.abs(mx - rx) > 0.15 || Math.abs(my - ry) > 0.15) {
      frameId = requestAnimationFrame(animateCursor);
    }
  }

  document.addEventListener(
    "mousemove",
    (event) => {
      mx = event.clientX;
      my = event.clientY;
      if (!frameId) frameId = requestAnimationFrame(animateCursor);
    },
    { passive: true }
  );

  const hoverEls = $$("a, button, .menu-tab, .gallery-item, .testi-btn, .event-card");
  hoverEls.forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hovered"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hovered"));
  });
})();

/* ════════════════════════════════════════════════════════
   3. NAVBAR
   ════════════════════════════════════════════════════════ */
(function initNavbar() {
  const navbar = $("#navbar");
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  if (!navbar) return;

  const updateNavbar = createRafThrottled(() => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  });
  window.addEventListener("scroll", updateNavbar, { passive: true });
  updateNavbar();

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen);
    });

    $$(".nav-link", links).forEach((link) => {
      link.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", false);
      });
    });

    document.addEventListener("click", (e) => {
      if (!navbar.contains(e.target)) {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", false);
      }
    });
  }
})();

/* ════════════════════════════════════════════════════════
   4. SCROLL PROGRESS
   ════════════════════════════════════════════════════════ */
(function initScrollProgress() {
  const bar = $("#scrollProgress");
  if (!bar) return;

  const updateProgress = createRafThrottled(() => {
    const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const pct = Math.min(Math.max((window.scrollY / total) * 100, 0), 100);
    bar.style.width = pct + "%";
    bar.setAttribute("aria-valuenow", Math.round(pct));
  });
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
})();

/* ════════════════════════════════════════════════════════
   5. SCROLL REVEAL
   ════════════════════════════════════════════════════════ */
let revealObserver;

function initReveal(scope = document) {
  if (!scope || typeof scope.querySelectorAll !== "function") {
    return;
  }

  const targets = $$(".reveal-text, .reveal-img, .reveal-card", scope).filter(
    (el) => !el.dataset.revealBound
  );

  if (!targets.length) return;

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const parent = entry.target.parentElement || document;
            const siblings = $$(
              ".reveal-text, .reveal-img, .reveal-card",
              parent
            );
            const idx = siblings.indexOf(entry.target);
            entry.target.style.animationDelay = idx * 0.12 + "s";
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
  }

  targets.forEach((el) => {
    el.dataset.revealBound = "1";
    revealObserver.observe(el);
  });
}

initReveal();

/* ════════════════════════════════════════════════════════
   6. MENU + CART + CHECKOUT
   ════════════════════════════════════════════════════════ */
function initMenuAndCart() {
  const grid = $("#menuGrid");
  let tabs = $$(".menu-tab");
  const searchInput = $("#menuSearchInput");
  const clearSearchBtn = $("#menuClearSearch");
  const scopeButtons = $$(".menu-scope-btn");
  const sortSelect = $("#menuSortSelect");
  const tagFiltersWrap = $("#menuTagFilters");
  const resultsMeta = $("#menuResultsMeta");
  const searchState = $("#menuSearchState");
  const loadMoreBtn = $("#menuLoadMoreBtn");
  const scrollHint = $("#menuScrollHint");

  const openCartBtn = $("#openCartBtn");
  const floatingCartBtn = $("#floatingCartBtn");
  const closeCartBtn = $("#closeCartBtn");
  const cartBackdrop = $("#cartBackdrop");
  const checkoutForm = $("#checkoutForm");
  const checkoutSubmitBtn = checkoutForm?.querySelector('button[type="submit"]');
  const upiBox = $("#upiBox");
  const orderPreview = $("#orderPreview");

  const payWithGpayBtn = $("#payWithGpayBtn");
  const upiOriginalTotalEl = $("#upiOriginalTotal");
  const upiDiscountAmountEl = $("#upiDiscountAmount");
  const upiDiscountLabelEl = $("#upiDiscountLabel");
  const upiOfferBadgeEl = $("#upiOfferBadge");
  const upiFinalAmountEl = $("#upiFinalAmount");
  const upiFallbackBox = $("#upiFallbackBox");
  const upiFallbackLink = $("#upiFallbackLink");
  const upiManualAmount = $("#upiManualAmount");
  const orderUpiId = $("#orderUpiId");

  if (checkoutSubmitBtn) {
    checkoutSubmitBtn.id = checkoutSubmitBtn.id || "checkoutSubmitBtn";
    checkoutSubmitBtn.dataset.checkoutSubmit = "true";

    if (checkoutSubmitBtn.dataset.boundOrderingClick !== "true") {
      checkoutSubmitBtn.addEventListener("click", () => {
        if (!isCustomerOrderingEnabled()) {
          HotelOrderingUnavailableModal.open();
        }
      });
      checkoutSubmitBtn.dataset.boundOrderingClick = "true";
    }
  }

  if (!grid || !getMenuCategories().length) return;

  const tabsWrap =
    grid.closest(".menu-shell")?.querySelector(".menu-tabs") ||
    grid.closest(".section")?.querySelector(".menu-tabs") ||
    $(".menu-tabs");

  const menuAssistantThemeConfig = getThemeAiAssistantConfig();

  ensureMenuAssistantStyles();

  if (menuAssistantThemeConfig.enabled) {
    document.getElementById("menuAssistantUnavailableCard")?.remove();
  } else {
    document.getElementById("menuAssistantCard")?.remove();
    ensureMenuAssistantUnavailableCard(menuAssistantThemeConfig);
  }

  const availableCategories = getMenuCategories();

  function getFallbackCategoryLabel(category = "") {
    const normalized = String(category || "")
      .trim()
      .replace(/[-_]+/g, " ");

    if (!normalized) {
      return "Menu";
    }

    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function ensureDynamicMenuTabs() {
    if (!tabsWrap) {
      return;
    }

    tabsWrap.innerHTML = "";
    availableCategories.forEach((category, index) => {
      const nextTab = document.createElement("button");
      nextTab.type = "button";
      nextTab.className = `menu-tab${index === 0 ? " active" : ""}`;
      nextTab.dataset.cat = category;
      nextTab.setAttribute("role", "tab");
      nextTab.setAttribute("aria-selected", String(index === 0));
      nextTab.setAttribute("aria-controls", "menuGrid");
      nextTab.id = `menu-category-${index + 1}`;

      const icon = document.createElement("i");
      icon.className = "fas fa-utensils";
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.textContent = getMenuCategoryRecord(category)?.name || getFallbackCategoryLabel(category);

      nextTab.append(icon, document.createTextNode(" "), label);
      tabsWrap.appendChild(nextTab);
    });

    tabs = $$(".menu-tab");
  }

  ensureDynamicMenuTabs();

  const tabCategoryOrder = tabs
    .map((tab) => tab.dataset.cat)
    .filter(Boolean);

  function getCategoryLabel(category) {
    const categoryRecord = getMenuCategoryRecord(category);
    if (categoryRecord?.name) {
      return categoryRecord.name;
    }

    const normalized = String(category || "")
      .trim()
      .replace(/[-_]+/g, " ");

    if (!normalized) {
      return "Menu";
    }

    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function getInitialMenuCategory() {
    const requestedCategory = new URLSearchParams(window.location.search).get("category") || "";
    if (requestedCategory) {
      const matchingCategory = getMenuCategoryRecords().find(
        (category) => category.slug === requestedCategory || category.key === requestedCategory
      );
      if (matchingCategory && availableCategories.includes(matchingCategory.key)) {
        return matchingCategory.key;
      }
    }

    const currentTabCategory = $(".menu-tab.active")?.dataset.cat;

    if (currentTabCategory && availableCategories.includes(currentTabCategory)) {
      return currentTabCategory;
    }

    const firstTabbedCategory = tabCategoryOrder.find((category) =>
      availableCategories.includes(category)
    );

    if (firstTabbedCategory) {
      return firstTabbedCategory;
    }

    return availableCategories[0] || "";
  }

  function syncCategoryTabsAvailability() {
    const hasTabbedCategories = tabCategoryOrder.some((category) =>
      availableCategories.includes(category)
    );

    tabs.forEach((tab) => {
      const category = tab.dataset.cat || "";
      const hasItems = availableCategories.includes(category);
      const shouldHide = hasTabbedCategories ? !hasItems : false;

      tab.hidden = shouldHide;
      tab.disabled = hasTabbedCategories ? !hasItems : false;
      tab.setAttribute("aria-hidden", shouldHide ? "true" : "false");

      if (tab.disabled) {
        tab.setAttribute("aria-selected", "false");
      }
    });
  }

  const menuMode = grid.dataset.menuMode || "full";
  const previewLimit = Number(grid.dataset.previewLimit || 4);

  const ALL_ITEMS = flattenMenuData().map((item) => {
    const categoryLabel = getCategoryLabel(item.category);
    const comboChildNames = Array.isArray(item.comboItems)
      ? item.comboItems.map((comboItem) => comboItem?.name).filter(Boolean)
      : [];
    const normalizedTags = [
      item.tag,
      item.badge,
      item.name,
      item.desc,
      categoryLabel,
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();

    return {
      ...item,
      normalizedTags: Array.from(
        new Set(
          [item.tag, item.badge, categoryLabel].filter(
            Boolean,
          ),
        ),
      ),
      searchBlob:
        `${item.name} ${item.desc} ${item.tag || ""} ${item.badge || ""} ${categoryLabel} ${comboChildNames.join(" ")}`.toLowerCase(),
    };
  });

  const menuBatchSize = window.innerWidth >= 1200 ? 12 : window.innerWidth >= 768 ? 8 : 6;
  const MENU_STATE = {
    activeCategory: getInitialMenuCategory(),
    searchScope: "category",
    query: "",
    selectedTag: "all",
    sortBy: "featured",
    batchSize: menuBatchSize,
    visibleCount: menuMode === "preview" ? previewLimit : menuBatchSize,
  };
  let pendingMenuGridFocusSelectors = [];
  let paymentGatewayScriptPromise = null;
  const MENU_ASSISTANT_STATE = {
    loading: false,
    open: false,
    activePrompt: "",
    activeFollowUp: "",
    lastFailureHint: "",
    lastFailedPrompt: "",
    lastTurn: null,
    history: []
  };
  const MENU_ASSISTANT_HISTORY_LIMIT = 4;
  const menuAssistantPrompts = getEffectiveMenuAssistantPrompts(
    menuAssistantThemeConfig.starterPrompts,
    getActiveOrderContext()
  );

  function shouldUsePreviewMode() {
    return menuMode === "preview";
  }

  function getVisibleLimit() {
    return shouldUsePreviewMode() ? previewLimit : MENU_STATE.visibleCount;
  }

  function getBaseItems() {
    if (MENU_STATE.searchScope === "all") return ALL_ITEMS;
    return ALL_ITEMS.filter(
      (item) => item.category === MENU_STATE.activeCategory,
    );
  }

  function getAvailableTags() {
    const items = getBaseItems();
    const tagSet = new Set();

    items.forEach((item) => {
      item.normalizedTags.forEach((tag) => {
        if (tag && tag.trim()) {
          tagSet.add(tag);
        }
      });
    });

    return ["all", ...Array.from(tagSet)];
  }

  function getMenuGridActionSelector(action, itemId) {
    if (!action || !itemId) return "";
    return `[data-${action}="${escapeAttr(itemId)}"]`;
  }

  function queueMenuGridFocusRestore(itemId, actions = []) {
    pendingMenuGridFocusSelectors = actions
      .map((action) => getMenuGridActionSelector(action, itemId))
      .filter(Boolean);
  }

  function restorePendingMenuGridFocus() {
    if (!pendingMenuGridFocusSelectors.length) return;

    const selectors = [...pendingMenuGridFocusSelectors];
    pendingMenuGridFocusSelectors = [];

    const nextTarget = selectors
      .map((selector) => grid.querySelector(selector))
      .find((node) => node instanceof HTMLElement);

    if (nextTarget instanceof HTMLElement) {
      nextTarget.focus({ preventScroll: true });
    }
  }

  function getMenuAssistantContext() {
    const orderContext = getActiveOrderContext();

    if (!hasDineInOrderContext(orderContext)) {
      return {};
    }

    return {
      orderType: orderContext.orderType || "dine-in",
      tableNumber: orderContext.tableNumber || "",
      orderSource: orderContext.orderSource || "qr",
      addMode: hasActiveOrderAddonContext(orderContext)
    };
  }

  function buildMenuAssistantHistoryTurn(question = "", assistant = {}) {
    const normalizedQuestion =
      typeof question === "string" ? question.trim().slice(0, 220) : "";
    const normalizedAnswer =
      typeof assistant?.answer === "string"
        ? assistant.answer.trim().slice(0, 900)
        : "";

    if (!normalizedQuestion || !normalizedAnswer) {
      return null;
    }

    return {
      question: normalizedQuestion,
      answer: normalizedAnswer
    };
  }

  function getMenuAssistantOutOfScopeHelper(assistant = {}) {
    const isOutOfScope = assistant?.meta?.mode === "out_of_scope";
    const orderContext = getActiveOrderContext();

    if (!isOutOfScope || !hasDineInOrderContext(orderContext)) {
      return null;
    }

    const trackingRecord = getRecentOrderTrackingRecord();

    if (trackingRecord?.url) {
      return {
        title: "Use your order tracking page for live table actions",
        copy:
          "For live order status, bill requests, or staff help, open your current order tracking page. That page already has the normal table buttons for those actions.",
        linkUrl: trackingRecord.url,
        linkLabel: trackingRecord.orderId
          ? `Open tracking for order #${trackingRecord.orderId}`
          : "Open order tracking"
      };
    }

    return {
      title: "Use the tracking link after placing the order",
      copy:
        "For live order status, bill requests, or staff help, use the regular order tracking link after this table order is placed. That tracking page contains the normal table buttons for those actions.",
      linkUrl: "",
      linkLabel: ""
    };
  }

  function getMenuAssistantActionLabel(action = {}) {
    const actionType =
      typeof action?.type === "string" ? action.type.trim() : "";
    const fallbackLabel =
      typeof action?.label === "string" && action.label.trim()
        ? action.label.trim()
        : "Continue";
    const orderContext = getActiveOrderContext();
    const isDineIn = hasDineInOrderContext(orderContext);
    const isAddon = hasActiveOrderAddonContext(orderContext);
    const menuItem = action?.itemId ? findMenuItemById(action.itemId) : null;
    const itemName =
      typeof menuItem?.name === "string" && menuItem.name.trim()
        ? menuItem.name.trim()
        : "";

    if (actionType === "add_to_cart") {
      if (isAddon) {
        return itemName
          ? `Add ${itemName} to this table order`
          : "Add to this table order";
      }

      if (isDineIn) {
        return itemName
          ? `Add ${itemName} to this table cart`
          : "Add to this table cart";
      }
    }

    if (actionType === "open_cart") {
      if (isDineIn) {
        return "Open this table cart";
      }
    }

    if (actionType === "view_full_menu") {
      if (isAddon) {
        return "Browse full add-on menu";
      }

      if (isDineIn) {
        return "Browse full table menu";
      }
    }

    return fallbackLabel;
  }

  function ensureMenuAssistantUnavailableCard(config = menuAssistantThemeConfig) {
    let card = document.getElementById("menuAssistantUnavailableCard");

    if (!card) {
      card = document.createElement("section");
      card.id = "menuAssistantUnavailableCard";
      card.className = "menu-assistant-card glass-card";
      card.setAttribute("aria-label", "Smart Waiter unavailable");
      card.innerHTML = `
        <div class="menu-assistant-head">
          <div>
            <p class="section-eyebrow">Smart Waiter</p>
            <h3 class="menu-assistant-title">${escapeHTML(config.title || "Smart Waiter")}</h3>
            <p class="menu-assistant-copy">This hotel has Smart Waiter turned off right now. You can still browse the live menu, add items to cart, and order normally.</p>
            <p class="menu-assistant-guard-copy">Menu browsing, cart, checkout, QR ordering, and the rest of the page continue to work as usual.</p>
          </div>
          <span class="menu-assistant-guard-chip is-limited">Currently unavailable</span>
        </div>
      `;

      const assistantAnchor = scrollHint || grid;
      assistantAnchor.parentElement.insertBefore(card, assistantAnchor);
    }

    return card;
  }

  function ensureMenuAssistantElements(config = menuAssistantThemeConfig) {
    let card = document.getElementById("menuAssistantCard");
    const scopeGuard = getMenuAssistantScopeGuardConfig();
    const runtimeContextMeta = getMenuAssistantRuntimeContextMeta();

    if (!card) {
      card = document.createElement("section");
      card.id = "menuAssistantCard";
      card.className = "menu-assistant-card glass-card";
      card.setAttribute("aria-label", "Smart menu assistant");
      card.innerHTML = `
        <div class="menu-assistant-head">
          <div>
            <p class="section-eyebrow">Smart Waiter</p>
            <h3 class="menu-assistant-title">${escapeHTML(config.title || "Ask about dishes, budget, and combos")}</h3>
            <p class="menu-assistant-copy">${escapeHTML(config.intro || "This helper answers only from the current hotel's live menu and can suggest safe actions like add to cart.")}</p>
            ${
              config.examplePrompt
                ? `<button type="button" id="menuAssistantExamplePrompt" class="menu-assistant-example" data-assistant-example="${escapeAttr(config.examplePrompt)}"><strong>Try asking:</strong> <span>${escapeHTML(config.examplePrompt)}</span></button>`
                : ""
            }
            <p class="menu-assistant-guard-copy">${escapeHTML(scopeGuard.copy)}</p>
            <div class="menu-assistant-guard-list" aria-label="Smart Waiter scope">
              ${scopeGuard.supported
                .map(
                  (label) =>
                    `<span class="menu-assistant-guard-chip is-supported">${escapeHTML(label)}</span>`
                )
                .join("")}
              ${scopeGuard.limited
                .map(
                  (label) =>
                    `<span class="menu-assistant-guard-chip is-limited">${escapeHTML(label)}</span>`
                )
                .join("")}
            </div>
            ${
              runtimeContextMeta
                ? `
              <div class="menu-assistant-context">
                <span class="menu-assistant-context-pill">${escapeHTML(runtimeContextMeta.label)}</span>
                <p class="menu-assistant-context-copy">${escapeHTML(runtimeContextMeta.copy)}</p>
              </div>
            `
                : ""
            }
          </div>
          <button type="button" id="menuAssistantToggle" class="btn btn-outline menu-assistant-toggle" >Open Smart Waiter</button>
        </div>
        <div id="menuAssistantBody" class="menu-assistant-body" hidden>
          <p id="menuAssistantPromptsMeta" class="menu-assistant-prompts-meta" hidden></p>
          <div id="menuAssistantPrompts" class="menu-assistant-prompts"></div>
          <form id="menuAssistantForm" class="menu-assistant-form">
            <input
              id="menuAssistantInput"
              class="menu-assistant-input"
              type="text"
              maxlength="500"
              placeholder="${escapeAttr(runtimeContextMeta?.placeholder || "Ask a menu question, e.g. best veg starter under 300")}"
              aria-label="Ask the menu assistant"
            />
            <button type="submit" id="menuAssistantSubmit" class="btn btn-primary">Ask</button>
          </form>
          <p id="menuAssistantCharCount" class="menu-assistant-char-count" hidden></p>
          <p id="menuAssistantSubmitHint" class="menu-assistant-submit-hint" hidden></p>
          <p id="menuAssistantEmptyHint" class="menu-assistant-empty-hint" hidden></p>
          <p id="menuAssistantStatus" class="menu-assistant-status" aria-live="polite"></p>
          <p id="menuAssistantFailureHint" class="menu-assistant-failure-hint" hidden></p>
          <div id="menuAssistantRetry" class="menu-assistant-retry" hidden>
            <button type="button" id="menuAssistantRetryBtn" class="menu-assistant-chip menu-assistant-retry-btn">
              Retry last question
            </button>
          </div>
          <div id="menuAssistantToolbar" class="menu-assistant-toolbar" hidden>
            <button type="button" id="menuAssistantAskAgainBtn" class="menu-assistant-clear-btn" hidden>
              Ask again
            </button>
            <button type="button" id="menuAssistantCopyBtn" class="menu-assistant-clear-btn" hidden>
              Copy answer
            </button>
            <button type="button" id="menuAssistantClearBtn" class="menu-assistant-clear-btn">
              Clear chat
            </button>
          </div>
          <div id="menuAssistantHistory" class="menu-assistant-history" hidden>
            <p class="menu-assistant-history-title">Recent menu chat</p>
            <div id="menuAssistantHistoryList" class="menu-assistant-history-list"></div>
          </div>
          <div id="menuAssistantHelper" class="menu-assistant-helper" hidden>
            <p id="menuAssistantHelperTitle" class="menu-assistant-helper-title"></p>
            <p id="menuAssistantHelperCopy" class="menu-assistant-helper-copy"></p>
            <a
              id="menuAssistantHelperLink"
              class="btn btn-outline menu-assistant-helper-link"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              hidden
            >Open order tracking</a>
          </div>
          <div id="menuAssistantReply" class="menu-assistant-reply" hidden>
            <p id="menuAssistantSummary" class="menu-assistant-summary" hidden></p>
            <p id="menuAssistantUpdated" class="menu-assistant-updated" hidden></p>
            <p id="menuAssistantAnswer" class="menu-assistant-answer"></p>
            <div id="menuAssistantSuggestions" class="menu-assistant-suggestions"></div>
            <div id="menuAssistantFollowUps" class="menu-assistant-followups"></div>
            <div id="menuAssistantActions" class="menu-assistant-actions"></div>
            <p id="menuAssistantDisclaimer" class="menu-assistant-disclaimer"></p>
          </div>
        </div>
      `;

      const assistantAnchor = scrollHint || grid;
      assistantAnchor.parentElement.insertBefore(card, assistantAnchor);
    }

    return {
      card,
      toggleBtn: $("#menuAssistantToggle"),
      exampleBtn: $("#menuAssistantExamplePrompt"),
      body: $("#menuAssistantBody"),
      promptsMeta: $("#menuAssistantPromptsMeta"),
      promptsWrap: $("#menuAssistantPrompts"),
      form: $("#menuAssistantForm"),
      input: $("#menuAssistantInput"),
      submitBtn: $("#menuAssistantSubmit"),
      charCount: $("#menuAssistantCharCount"),
      submitHint: $("#menuAssistantSubmitHint"),
      emptyHint: $("#menuAssistantEmptyHint"),
      status: $("#menuAssistantStatus"),
      failureHint: $("#menuAssistantFailureHint"),
      retry: $("#menuAssistantRetry"),
      retryBtn: $("#menuAssistantRetryBtn"),
      toolbar: $("#menuAssistantToolbar"),
      askAgainBtn: $("#menuAssistantAskAgainBtn"),
      copyBtn: $("#menuAssistantCopyBtn"),
      clearBtn: $("#menuAssistantClearBtn"),
      history: $("#menuAssistantHistory"),
      historyList: $("#menuAssistantHistoryList"),
      helper: $("#menuAssistantHelper"),
      helperTitle: $("#menuAssistantHelperTitle"),
      helperCopy: $("#menuAssistantHelperCopy"),
      helperLink: $("#menuAssistantHelperLink"),
      reply: $("#menuAssistantReply"),
      summary: $("#menuAssistantSummary"),
      updated: $("#menuAssistantUpdated"),
      answer: $("#menuAssistantAnswer"),
      suggestions: $("#menuAssistantSuggestions"),
      followUps: $("#menuAssistantFollowUps"),
      actions: $("#menuAssistantActions"),
      disclaimer: $("#menuAssistantDisclaimer"),
    };
  }

  const menuAssistant = menuAssistantThemeConfig.enabled
    ? ensureMenuAssistantElements(menuAssistantThemeConfig)
    : null;
  let menuAssistantStatusResetTimer = null;
  let menuAssistantMobileNudgeTimer = null;
  let menuAssistantReplyHighlightTimer = null;
  let menuAssistantReplyUpdatedTimer = null;
  const MENU_ASSISTANT_STATUS_CALM_DELAY_MS = 2600;
  const MENU_ASSISTANT_MOBILE_NUDGE_DELAY_MS = 90;
  const MENU_ASSISTANT_REPLY_HIGHLIGHT_MS = 1400;
  const MENU_ASSISTANT_REPLY_UPDATED_PROMOTION_MS = 14000;

  function getMenuAssistantSessionStorageKey(
    hotelSlug = getActiveHotelSlug(),
    orderContext = getActiveOrderContext()
  ) {
    const normalizedHotelSlug = String(hotelSlug || "").trim();
    if (!normalizedHotelSlug) return "";

    const pageScope = document.body.classList.contains("menu-page")
      ? "full-menu"
      : "home-menu";
    const contextScope = hasActiveOrderAddonContext(orderContext)
      ? `addon:${orderContext.tableNumber || "table"}`
      : hasDineInOrderContext(orderContext)
        ? `table:${orderContext.tableNumber || "table"}`
        : "website";

    return `menuAssistantOpen:${normalizedHotelSlug}:${pageScope}:${contextScope}`;
  }

  function getStoredMenuAssistantOpenPreference() {
    const storageKey = getMenuAssistantSessionStorageKey();
    if (!storageKey) return false;

    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  }

  function storeMenuAssistantOpenPreference(isOpen) {
    const storageKey = getMenuAssistantSessionStorageKey();
    if (!storageKey) return;

    try {
      sessionStorage.setItem(storageKey, isOpen ? "1" : "0");
    } catch {
      // Smart Waiter open state memory is best-effort only.
    }
  }

  function restoreMenuAssistantOpenPreference() {
    if (!menuAssistant) return;

    const shouldOpen = getStoredMenuAssistantOpenPreference();
    const canRestore =
      menuAssistant.card?.isConnected &&
      menuAssistant.toggleBtn?.isConnected &&
      menuAssistant.body?.isConnected;

    if (!canRestore) {
      setMenuAssistantOpen(false, { focusInput: false });
      return;
    }

    requestAnimationFrame(() => {
      if (
        !menuAssistant?.card?.isConnected ||
        !menuAssistant?.toggleBtn?.isConnected ||
        !menuAssistant?.body?.isConnected
      ) {
        return;
      }

      setMenuAssistantOpen(shouldOpen, { focusInput: false });
    });
  }

  function syncMenuAssistantOpenStateFromDom() {
    if (!menuAssistant?.body || !menuAssistant?.toggleBtn || !menuAssistant?.card) {
      return MENU_ASSISTANT_STATE.open;
    }

    const domOpen = !menuAssistant.body.hidden;
    const ariaExpandedOpen = menuAssistant.toggleBtn.getAttribute("aria-expanded") === "true";
    const cardOpen = menuAssistant.card.classList.contains("is-open");
    const toggleOpen = menuAssistant.toggleBtn.classList.contains("is-open");

    if (
      MENU_ASSISTANT_STATE.open !== domOpen ||
      ariaExpandedOpen !== domOpen ||
      cardOpen !== domOpen ||
      toggleOpen !== domOpen
    ) {
      setMenuAssistantOpen(domOpen, { focusInput: false });
    }

    return domOpen;
  }

  function setMenuAssistantOpen(nextOpen, { focusInput = true } = {}) {
    if (!menuAssistant) return;
    MENU_ASSISTANT_STATE.open = !!nextOpen;
    if (!MENU_ASSISTANT_STATE.open) {
      setMenuAssistantActivePrompt("");
      setMenuAssistantActiveFollowUp("");
      clearMenuAssistantMobileNudgeTimer();
      clearMenuAssistantReplyHighlight();
    }
    storeMenuAssistantOpenPreference(MENU_ASSISTANT_STATE.open);
    menuAssistant.body.toggleAttribute("hidden", !MENU_ASSISTANT_STATE.open);
    menuAssistant.card.classList.toggle("is-open", MENU_ASSISTANT_STATE.open);
    menuAssistant.toggleBtn.classList.toggle("is-open", MENU_ASSISTANT_STATE.open);
    const toggleLabel = MENU_ASSISTANT_STATE.open
      ? "Hide Smart Waiter"
      : "Open Smart Waiter";
    menuAssistant.toggleBtn.textContent = toggleLabel;
    menuAssistant.toggleBtn.setAttribute("aria-label", toggleLabel);
    menuAssistant.toggleBtn.setAttribute("aria-expanded", MENU_ASSISTANT_STATE.open ? "true" : "false");
    menuAssistant.toggleBtn.title = toggleLabel;

    if (MENU_ASSISTANT_STATE.open && focusInput) {
      menuAssistant.input.focus({ preventScroll: true });
    }

    syncMenuAssistantEmptyHint();
    syncMenuAssistantCharCount();
    syncMenuAssistantSubmitHint();
    syncMenuAssistantFailureHint();
  }

  function getMenuAssistantLoadingMessage(context = getActiveOrderContext()) {
    if (hasActiveOrderAddonContext(context)) {
      return `Thinking about the best add-on menu options for Table ${context.tableNumber || ""}...`.trim();
    }

    if (hasDineInOrderContext(context)) {
      return `Thinking about the current menu for Table ${context.tableNumber || ""}...`.trim();
    }

    return "Thinking about the current menu...";
  }

  function getMenuAssistantEmptyHintText() {
    const hasExample = Boolean(menuAssistantThemeConfig.examplePrompt);

    if (hasExample) {
      return "Need an idea? Tap the welcome example above or use one of the quick menu prompts.";
    }

    return "Need an idea? Use one of the quick menu prompts or type your own menu question.";
  }

  function setMenuAssistantLoading(nextLoading, message = "") {
    if (!menuAssistant) return;
    MENU_ASSISTANT_STATE.loading = !!nextLoading;
    if (MENU_ASSISTANT_STATE.loading) {
      clearMenuAssistantStatusResetTimer();
      clearMenuAssistantMobileNudgeTimer();
      clearMenuAssistantReplyHighlight();
      clearMenuAssistantReplyUpdatedTimer();
    } else {
      setMenuAssistantActivePrompt("");
      setMenuAssistantActiveFollowUp("");
    }
    menuAssistant.submitBtn.disabled = MENU_ASSISTANT_STATE.loading;
    menuAssistant.input.disabled = MENU_ASSISTANT_STATE.loading;
    menuAssistant.toggleBtn.disabled = MENU_ASSISTANT_STATE.loading;
    menuAssistant.submitBtn.textContent = MENU_ASSISTANT_STATE.loading ? "Thinking..." : "Ask";
    menuAssistant.body.setAttribute("aria-busy", MENU_ASSISTANT_STATE.loading ? "true" : "false");
    menuAssistant.status.classList.toggle("is-loading", MENU_ASSISTANT_STATE.loading);
    if (menuAssistant.clearBtn) {
      menuAssistant.clearBtn.disabled = MENU_ASSISTANT_STATE.loading;
    }
    if (menuAssistant.askAgainBtn) {
      menuAssistant.askAgainBtn.disabled =
        MENU_ASSISTANT_STATE.loading ||
        menuAssistant.askAgainBtn.hidden;
    }
    if (menuAssistant.copyBtn) {
      menuAssistant.copyBtn.disabled =
        MENU_ASSISTANT_STATE.loading ||
        menuAssistant.copyBtn.hidden;
    }
    if (menuAssistant.retryBtn) {
      menuAssistant.retryBtn.disabled = MENU_ASSISTANT_STATE.loading;
    }
    menuAssistant.status.textContent = message;
    syncMenuAssistantEmptyHint();
    syncMenuAssistantFailureHint();
    syncMenuAssistantRetry();
    syncMenuAssistantSubmitHint();
  }

  function syncMenuAssistantEmptyHint() {
    if (!menuAssistant?.emptyHint) return;

    const shouldShow =
      !MENU_ASSISTANT_STATE.loading &&
      MENU_ASSISTANT_STATE.open &&
      !String(menuAssistant.input?.value || "").trim();

    menuAssistant.emptyHint.hidden = !shouldShow;
    menuAssistant.emptyHint.textContent = shouldShow
      ? getMenuAssistantEmptyHintText()
      : "";
  }

  function syncMenuAssistantCharCount() {
    if (!menuAssistant?.charCount) return;

    const currentValue = String(menuAssistant.input?.value || "");
    const maxLength = Number(menuAssistant.input?.maxLength || 500) > 0
      ? Number(menuAssistant.input.maxLength)
      : 500;
    const currentLength = currentValue.length;
    const shouldShow = MENU_ASSISTANT_STATE.open;

    menuAssistant.charCount.hidden = !shouldShow;
    menuAssistant.charCount.textContent = `${currentLength} / ${maxLength} characters`;
    menuAssistant.charCount.classList.toggle(
      "is-near-limit",
      maxLength - currentLength <= 80
    );
  }

  function syncMenuAssistantSubmitHint() {
    if (!menuAssistant?.submitHint) return;

    const hasInputValue = !!String(menuAssistant.input?.value || "").trim();
    const shouldShow =
      MENU_ASSISTANT_STATE.open &&
      !MENU_ASSISTANT_STATE.loading &&
      hasInputValue;

    menuAssistant.submitHint.hidden = !shouldShow;
    menuAssistant.submitHint.textContent = shouldShow
      ? "Press Enter to ask Smart Waiter."
      : "";

    if (menuAssistant.submitBtn) {
      menuAssistant.submitBtn.title = shouldShow
        ? "Press Enter to ask Smart Waiter"
        : "Ask Smart Waiter";
    }
  }

  function getMenuAssistantCalmStatusMessage(context = getActiveOrderContext()) {
    if (hasActiveOrderAddonContext(context) && context?.tableNumber) {
      return `Smart Waiter is ready with more add-on ideas for Table ${context.tableNumber}.`;
    }

    if (hasDineInOrderContext(context) && context?.tableNumber) {
      return `Smart Waiter is ready with more menu ideas for Table ${context.tableNumber}.`;
    }

    return "Smart Waiter is ready for another menu question.";
  }

  function clearMenuAssistantStatusResetTimer() {
    if (!menuAssistantStatusResetTimer) return;

    window.clearTimeout(menuAssistantStatusResetTimer);
    menuAssistantStatusResetTimer = null;
  }

  function isMenuAssistantCompactViewport() {
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(max-width: 768px)").matches;
    }

    return window.innerWidth <= 768;
  }

  function clearMenuAssistantMobileNudgeTimer() {
    if (!menuAssistantMobileNudgeTimer) return;

    window.clearTimeout(menuAssistantMobileNudgeTimer);
    menuAssistantMobileNudgeTimer = null;
  }

  function clearMenuAssistantReplyHighlight() {
    if (menuAssistantReplyHighlightTimer) {
      window.clearTimeout(menuAssistantReplyHighlightTimer);
      menuAssistantReplyHighlightTimer = null;
    }

    if (menuAssistant?.reply) {
      menuAssistant.reply.classList.remove("is-fresh");
    }
  }

  function triggerMenuAssistantReplyHighlight() {
    if (!menuAssistant?.reply) return;

    clearMenuAssistantReplyHighlight();
    void menuAssistant.reply.offsetWidth;
    menuAssistant.reply.classList.add("is-fresh");

    menuAssistantReplyHighlightTimer = window.setTimeout(() => {
      menuAssistantReplyHighlightTimer = null;
      menuAssistant.reply?.classList.remove("is-fresh");
    }, MENU_ASSISTANT_REPLY_HIGHLIGHT_MS);
  }

  function scheduleMenuAssistantMobileNudge(
    targetElement,
    { block = "nearest" } = {}
  ) {
    if (!menuAssistant || !targetElement || !isMenuAssistantCompactViewport()) {
      return;
    }

    clearMenuAssistantMobileNudgeTimer();
    menuAssistantMobileNudgeTimer = window.setTimeout(() => {
      menuAssistantMobileNudgeTimer = null;

      if (!menuAssistant || !MENU_ASSISTANT_STATE.open) {
        return;
      }

      const element = targetElement instanceof HTMLElement ? targetElement : null;

      if (!element || element.hidden || !document.body.contains(element)) {
        return;
      }

      element.scrollIntoView({
        behavior: "smooth",
        block,
        inline: "nearest"
      });
    }, MENU_ASSISTANT_MOBILE_NUDGE_DELAY_MS);
  }

  function setMenuAssistantStatusMessage(
    message = "",
    {
      calmAfterMs = 0,
      calmMessage = getMenuAssistantCalmStatusMessage()
    } = {}
  ) {
    if (!menuAssistant?.status) return;

    clearMenuAssistantStatusResetTimer();
    menuAssistant.status.textContent = message;

    if (calmAfterMs <= 0) {
      return;
    }

    const sourceMessage = String(message || "");
    menuAssistantStatusResetTimer = window.setTimeout(() => {
      menuAssistantStatusResetTimer = null;

      if (!menuAssistant || MENU_ASSISTANT_STATE.loading || !MENU_ASSISTANT_STATE.open) {
        return;
      }

      if (String(menuAssistant.status.textContent || "") !== sourceMessage) {
        return;
      }

      menuAssistant.status.textContent = calmMessage;
    }, calmAfterMs);
  }

  function syncMenuAssistantRetry() {
    if (!menuAssistant?.retry) return;

    const shouldShow =
      !MENU_ASSISTANT_STATE.loading &&
      MENU_ASSISTANT_STATE.open &&
      !!String(MENU_ASSISTANT_STATE.lastFailedPrompt || "").trim();

    menuAssistant.retry.hidden = !shouldShow;

    if (menuAssistant.retryBtn) {
      menuAssistant.retryBtn.disabled = MENU_ASSISTANT_STATE.loading;
      menuAssistant.retryBtn.textContent = "Retry last question";
    }
  }

  function getMenuAssistantFailureHintText() {
    const protocol = String(window.location?.protocol || "").toLowerCase();
    const hostname = String(window.location?.hostname || "").toLowerCase();

    if (protocol === "file:") {
      return "Local testing tip: this page is running from a local file. Make sure the backend server is running and the Smart Waiter API base URL is reachable before retrying.";
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "Local testing tip: make sure your backend server is running and reachable before retrying Smart Waiter.";
    }

    return "";
  }

  function syncMenuAssistantFailureHint() {
    if (!menuAssistant?.failureHint) return;

    const hint = String(MENU_ASSISTANT_STATE.lastFailureHint || "").trim();
    const shouldShow =
      !MENU_ASSISTANT_STATE.loading &&
      MENU_ASSISTANT_STATE.open &&
      !!hint;

    menuAssistant.failureHint.hidden = !shouldShow;
    menuAssistant.failureHint.textContent = shouldShow ? hint : "";
  }

  function clearMenuAssistantFailureHint() {
    if (!MENU_ASSISTANT_STATE.lastFailureHint) return;

    MENU_ASSISTANT_STATE.lastFailureHint = "";
    syncMenuAssistantFailureHint();
  }

  function handleMenuAssistantEscape(event) {
    if (!menuAssistant || event.key !== "Escape" || !MENU_ASSISTANT_STATE.open) {
      return;
    }

    const target = event.target instanceof HTMLElement ? event.target : null;

    if (!target || !menuAssistant.card.contains(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const hasInputValue = Boolean(String(menuAssistant.input?.value || "").trim());

    if (MENU_ASSISTANT_STATE.loading || hasInputValue) {
      return;
    }

    setMenuAssistantOpen(false);
    setMenuAssistantStatusMessage("Smart Waiter closed. Open it anytime.");
    menuAssistant.toggleBtn.focus({ preventScroll: true });
  }

  function renderMenuAssistantConversationControls() {
    if (!menuAssistant) return;

    const hasHistory = Array.isArray(MENU_ASSISTANT_STATE.history) && MENU_ASSISTANT_STATE.history.length > 0;
    const hasConversation = Boolean(MENU_ASSISTANT_STATE.lastTurn) || hasHistory;
    const hasAskAgainableReply =
      menuAssistant.reply &&
      !menuAssistant.reply.hidden &&
      !!String(MENU_ASSISTANT_STATE.lastTurn?.question || "").trim();
    const hasCopyableReply =
      menuAssistant.reply &&
      !menuAssistant.reply.hidden &&
      !!String(menuAssistant.answer?.textContent || "").trim();

    if (menuAssistant.toolbar) {
      menuAssistant.toolbar.hidden = !hasConversation;
    }

    if (menuAssistant.askAgainBtn) {
      menuAssistant.askAgainBtn.hidden = !hasAskAgainableReply;
      menuAssistant.askAgainBtn.disabled =
        MENU_ASSISTANT_STATE.loading || !hasAskAgainableReply;
    }

    if (menuAssistant.copyBtn) {
      menuAssistant.copyBtn.hidden = !hasCopyableReply;
      menuAssistant.copyBtn.disabled = MENU_ASSISTANT_STATE.loading || !hasCopyableReply;
    }

    if (menuAssistant.clearBtn) {
      menuAssistant.clearBtn.disabled = MENU_ASSISTANT_STATE.loading;
    }
  }

  function renderMenuAssistantPrompts() {
    if (!menuAssistant) return;
    const promptCount = Array.isArray(menuAssistantPrompts)
      ? menuAssistantPrompts.length
      : 0;

    if (menuAssistant.promptsMeta) {
      if (promptCount > 0) {
        menuAssistant.promptsMeta.textContent =
          promptCount === 1
            ? "1 quick menu prompt is ready."
            : `${promptCount} quick menu prompts are ready.`;
        menuAssistant.promptsMeta.hidden = false;
      } else {
        menuAssistant.promptsMeta.textContent = "";
        menuAssistant.promptsMeta.hidden = true;
      }
    }

    menuAssistant.promptsWrap.innerHTML = menuAssistantPrompts
      .map(
        (prompt) => `
          <button
            type="button"
            class="menu-assistant-chip${MENU_ASSISTANT_STATE.activePrompt === prompt ? " is-active-prompt" : ""}"
            data-assistant-prompt="${escapeAttr(prompt)}"
            aria-pressed="${MENU_ASSISTANT_STATE.activePrompt === prompt ? "true" : "false"}"
          >
            ${escapeHTML(prompt)}
          </button>
        `
      )
      .join("");
  }

  function setMenuAssistantActivePrompt(prompt = "") {
    const normalizedPrompt = String(prompt || "").trim();
    if (MENU_ASSISTANT_STATE.activePrompt === normalizedPrompt) {
      return;
    }

    MENU_ASSISTANT_STATE.activePrompt = normalizedPrompt;
    renderMenuAssistantPrompts();
  }

  function syncMenuAssistantActiveFollowUp() {
    if (!menuAssistant?.followUps) return;

    const normalizedFollowUp = String(MENU_ASSISTANT_STATE.activeFollowUp || "").trim();
    menuAssistant.followUps
      .querySelectorAll("[data-assistant-followup]")
      .forEach((button) => {
        const isActive =
          String(button.dataset.assistantFollowup || "").trim() === normalizedFollowUp &&
          !!normalizedFollowUp;
        button.classList.toggle("is-active-followup", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
  }

  function setMenuAssistantActiveFollowUp(prompt = "") {
    const normalizedPrompt = String(prompt || "").trim();
    if (MENU_ASSISTANT_STATE.activeFollowUp === normalizedPrompt) {
      return;
    }

    MENU_ASSISTANT_STATE.activeFollowUp = normalizedPrompt;
    syncMenuAssistantActiveFollowUp();
  }

  function renderMenuAssistantHistory() {
    if (!menuAssistant) return;

    const turns = Array.isArray(MENU_ASSISTANT_STATE.history)
      ? MENU_ASSISTANT_STATE.history
      : [];

    menuAssistant.history.hidden = !turns.length;
    menuAssistant.historyList.innerHTML = turns
      .map(
        (turn) => `
          <article class="menu-assistant-history-item">
            <p class="menu-assistant-history-question"><strong>You asked:</strong> ${escapeHTML(turn.question || "")}</p>
            <p class="menu-assistant-history-answer"><strong>Smart Waiter:</strong> ${escapeHTML(turn.answer || "")}</p>
          </article>
        `
      )
      .join("");

    renderMenuAssistantConversationControls();
  }

  function commitMenuAssistantTurn(question = "", assistant = {}) {
    if (!menuAssistant) return;

    const nextTurn = buildMenuAssistantHistoryTurn(question, assistant);

    if (!nextTurn) {
      return;
    }

    if (MENU_ASSISTANT_STATE.lastTurn) {
      MENU_ASSISTANT_STATE.history = [
        MENU_ASSISTANT_STATE.lastTurn,
        ...MENU_ASSISTANT_STATE.history
      ].slice(0, MENU_ASSISTANT_HISTORY_LIMIT);
    }

    MENU_ASSISTANT_STATE.lastTurn = nextTurn;
    renderMenuAssistantHistory();
  }

  function clearMenuAssistantConversation(statusMessage = "Smart Waiter chat cleared.") {
    if (!menuAssistant) return;

    setMenuAssistantActivePrompt("");
    setMenuAssistantActiveFollowUp("");
    MENU_ASSISTANT_STATE.lastFailureHint = "";
    MENU_ASSISTANT_STATE.lastFailedPrompt = "";
    MENU_ASSISTANT_STATE.lastTurn = null;
    MENU_ASSISTANT_STATE.history = [];
    clearMenuAssistantMobileNudgeTimer();
    clearMenuAssistantReplyHighlight();
    clearMenuAssistantReplyUpdatedTimer();
    menuAssistant.input.value = "";
    menuAssistant.summary.hidden = true;
    menuAssistant.summary.textContent = "";
    setMenuAssistantReplyUpdatedState("");
    menuAssistant.answer.textContent = "";
    menuAssistant.suggestions.innerHTML = "";
    menuAssistant.followUps.innerHTML = "";
    menuAssistant.actions.innerHTML = "";
    menuAssistant.disclaimer.textContent = "";
    menuAssistant.historyList.innerHTML = "";
    menuAssistant.helper.hidden = true;
    menuAssistant.helperTitle.textContent = "";
    menuAssistant.helperCopy.textContent = "";
    menuAssistant.helperLink.hidden = true;
    menuAssistant.helperLink.href = "#";
    menuAssistant.helperLink.textContent = "Open order tracking";
    menuAssistant.reply.hidden = true;
    setMenuAssistantStatusMessage(statusMessage);

    renderMenuAssistantHistory();
    renderMenuAssistantConversationControls();
    syncMenuAssistantCharCount();
    syncMenuAssistantSubmitHint();
    syncMenuAssistantEmptyHint();
    syncMenuAssistantFailureHint();
    syncMenuAssistantRetry();
  }

  function getMenuAssistantReplySummary({
    suggestions = [],
    followUpPrompts = [],
    actions = []
  } = {}) {
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      return `${suggestions.length} menu idea${suggestions.length === 1 ? "" : "s"} ready`;
    }

    if (Array.isArray(followUpPrompts) && followUpPrompts.length > 0) {
      return `${followUpPrompts.length} follow-up option${followUpPrompts.length === 1 ? "" : "s"} ready`;
    }

    if (Array.isArray(actions) && actions.length > 0) {
      return `${actions.length} safe action${actions.length === 1 ? "" : "s"} ready`;
    }

    return "Grounded menu reply ready";
  }

  function getMenuAssistantReplyUpdatedText() {
    return "Updated just now";
  }

  function getMenuAssistantReplyOlderUpdatedText() {
    return "Updated moments ago";
  }

  function clearMenuAssistantReplyUpdatedTimer() {
    if (!menuAssistantReplyUpdatedTimer) return;

    window.clearTimeout(menuAssistantReplyUpdatedTimer);
    menuAssistantReplyUpdatedTimer = null;
  }

  function setMenuAssistantReplyUpdatedState(
    text = "",
    {
      promoteAfterMs = 0,
      promotedText = getMenuAssistantReplyOlderUpdatedText()
    } = {}
  ) {
    if (!menuAssistant?.updated) return;

    clearMenuAssistantReplyUpdatedTimer();
    menuAssistant.updated.hidden = !text;
    menuAssistant.updated.textContent = text;

    if (!text || promoteAfterMs <= 0) {
      return;
    }

    const sourceText = String(text || "");
    menuAssistantReplyUpdatedTimer = window.setTimeout(() => {
      menuAssistantReplyUpdatedTimer = null;

      if (!menuAssistant || menuAssistant.reply.hidden) {
        return;
      }

      if (String(menuAssistant.updated.textContent || "") !== sourceText) {
        return;
      }

      menuAssistant.updated.textContent = promotedText;
    }, promoteAfterMs);
  }

  function renderMenuAssistantReply(assistant = {}) {
    if (!menuAssistant) return;
    const suggestions = Array.isArray(assistant.suggestions) ? assistant.suggestions : [];
    const followUpPrompts = Array.isArray(assistant.followUpPrompts)
      ? assistant.followUpPrompts
      : [];
    const actions = Array.isArray(assistant.suggestedActions) ? assistant.suggestedActions : [];
    const helper = getMenuAssistantOutOfScopeHelper(assistant);
    const isOutOfScope = assistant?.meta?.mode === "out_of_scope";
    const showNoSuggestionMatch = !isOutOfScope && suggestions.length === 0;
    const summaryText = getMenuAssistantReplySummary({
      suggestions,
      followUpPrompts,
      actions
    });

    menuAssistant.summary.hidden = !summaryText;
    menuAssistant.summary.textContent = summaryText;
    setMenuAssistantReplyUpdatedState(getMenuAssistantReplyUpdatedText(), {
      promoteAfterMs: MENU_ASSISTANT_REPLY_UPDATED_PROMOTION_MS
    });
    menuAssistant.answer.textContent = assistant.answer || "I could not prepare a grounded reply just now.";
    menuAssistant.suggestions.innerHTML = suggestions.length
      ? `
        <p class="menu-assistant-section-label">Menu ideas</p>
        <div class="menu-assistant-section-body">
          ${suggestions
            .map(
              (item) => `
                <article class="menu-assistant-item">
                  <strong>${escapeHTML(item.name || "Menu item")}</strong>
                  <span>${escapeHTML(item.category || "Menu")} | ${escapeHTML(formatCurrency(item.price || 0))}</span>
                  <span>${escapeHTML(item.reason || "Available on the current menu")}</span>
                </article>
              `
            )
            .join("")}
        </div>
      `
      : showNoSuggestionMatch
        ? `
          <p class="menu-assistant-section-label">Menu ideas</p>
          <p class="menu-assistant-empty-result">
            No matching menu ideas found right now. Try another budget, spice level, dish type, or category.
          </p>
        `
        : "";
    menuAssistant.followUps.innerHTML = followUpPrompts.length
      ? `
        <p class="menu-assistant-section-label">Try next</p>
        <div class="menu-assistant-section-body">
          ${followUpPrompts
            .map(
              (prompt) => `
                <button
                  type="button"
                  class="menu-assistant-chip"
                  data-assistant-followup="${escapeAttr(prompt)}"
                >
                  ${escapeHTML(prompt)}
                </button>
              `
            )
            .join("")}
        </div>
      `
      : "";
    syncMenuAssistantActiveFollowUp();
    menuAssistant.actions.innerHTML = actions.length
      ? `
        <p class="menu-assistant-section-label">Quick actions</p>
        <div class="menu-assistant-section-body">
          ${actions
            .map(
              (action) => `
                <button
                  type="button"
                  class="menu-assistant-chip"
                  data-assistant-action="${escapeAttr(action.type || "")}"
                  data-assistant-item-id="${escapeAttr(action.itemId || "")}"
                >
                  ${escapeHTML(getMenuAssistantActionLabel(action))}
                </button>
              `
            )
            .join("")}
        </div>
      `
      : "";
    menuAssistant.disclaimer.textContent =
      assistant.disclaimer ||
      getMenuAssistantDefaultDisclaimer();
    menuAssistant.helper.hidden = !helper;
    menuAssistant.helperTitle.textContent = helper?.title || "";
    menuAssistant.helperCopy.textContent = helper?.copy || "";
    menuAssistant.helperLink.hidden = !helper?.linkUrl;
    menuAssistant.helperLink.href = helper?.linkUrl || "#";
    menuAssistant.helperLink.textContent = helper?.linkLabel || "Open order tracking";
    menuAssistant.reply.hidden = false;
    renderMenuAssistantConversationControls();
    triggerMenuAssistantReplyHighlight();

    const mobileNudgeTarget =
      followUpPrompts.length >= 3 && menuAssistant.followUps?.childElementCount
        ? menuAssistant.followUps
        : menuAssistant.reply;

    scheduleMenuAssistantMobileNudge(mobileNudgeTarget);
  }

  async function copyMenuAssistantAnswerToClipboard() {
    if (!menuAssistant) return false;

    const answerText = String(menuAssistant.answer?.textContent || "").trim();
    if (!answerText) {
      return false;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(answerText);
        return true;
      } catch {
        // Fall back to a temporary textarea below.
      }
    }

    const fallbackTextarea = document.createElement("textarea");
    fallbackTextarea.value = answerText;
    fallbackTextarea.setAttribute("readonly", "true");
    fallbackTextarea.style.position = "fixed";
    fallbackTextarea.style.top = "-9999px";
    fallbackTextarea.style.opacity = "0";
    document.body.appendChild(fallbackTextarea);
    fallbackTextarea.focus();
    fallbackTextarea.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      fallbackTextarea.remove();
    }
  }

  async function requestMenuAssistantReply(message = "") {
    if (!menuAssistant) return;
    const hotelSlug = getActiveHotelSlug();
    const normalizedMessage = typeof message === "string" ? message.trim() : "";

    if (!hotelSlug || !normalizedMessage) {
      return;
    }

    setMenuAssistantOpen(true);
    setMenuAssistantLoading(true, getMenuAssistantLoadingMessage());

    try {
      const result = await postJSON(
        `/api/public/assistant/menu/${encodeURIComponent(hotelSlug)}`,
        {
          message: normalizedMessage,
          context: getMenuAssistantContext(),
        }
      );

      MENU_ASSISTANT_STATE.lastFailureHint = "";
      MENU_ASSISTANT_STATE.lastFailedPrompt = "";
      renderMenuAssistantReply(result?.assistant || {});
      commitMenuAssistantTurn(normalizedMessage, result?.assistant || {});
      setMenuAssistantStatusMessage("Grounded reply ready.", {
        calmAfterMs: MENU_ASSISTANT_STATUS_CALM_DELAY_MS
      });
      syncMenuAssistantFailureHint();
      syncMenuAssistantRetry();
    } catch (error) {
      console.error("Menu assistant request failed:", error);
      MENU_ASSISTANT_STATE.lastFailureHint = getMenuAssistantFailureHintText();
      MENU_ASSISTANT_STATE.lastFailedPrompt = normalizedMessage;
      menuAssistant.reply.hidden = true;
      renderMenuAssistantConversationControls();
      setMenuAssistantStatusMessage(
        error?.message || "The menu assistant is not available right now."
      );
      showToast("Smart Waiter is unavailable right now.");
      syncMenuAssistantFailureHint();
      syncMenuAssistantRetry();
    } finally {
      setMenuAssistantLoading(false, menuAssistant.status.textContent);
    }
  }

  function getMenuAssistantActionStatusMessage(actionType = "", itemId = "") {
    const orderContext = getActiveOrderContext();
    const tableLabel = orderContext.tableNumber ? `Table ${orderContext.tableNumber}` : "";
    const menuItem = itemId ? findMenuItemById(itemId) : null;
    const itemName =
      typeof menuItem?.name === "string" && menuItem.name.trim()
        ? menuItem.name.trim()
        : "That item";

    if (actionType === "add_to_cart") {
      if (hasActiveOrderAddonContext(orderContext) && tableLabel) {
        return `${itemName} was added for ${tableLabel}.`;
      }

      if (hasDineInOrderContext(orderContext) && tableLabel) {
        return `${itemName} was added to ${tableLabel}'s cart.`;
      }

      return `${itemName} was added to your cart.`;
    }

    if (actionType === "open_cart") {
      if (hasDineInOrderContext(orderContext) && tableLabel) {
        return `Opened ${tableLabel}'s cart.`;
      }

      return "Opened your cart.";
    }

    if (actionType === "view_full_menu") {
      if (hasActiveOrderAddonContext(orderContext) && tableLabel) {
        return `Showing the full add-on menu for ${tableLabel}.`;
      }

      if (hasDineInOrderContext(orderContext) && tableLabel) {
        return `Showing the full menu for ${tableLabel}.`;
      }

      return "Showing the full menu below.";
    }

    return "";
  }

  function setMenuAssistantActionStatus(actionType = "", itemId = "") {
    if (!menuAssistant) {
      return;
    }

    setMenuAssistantStatusMessage(
      getMenuAssistantActionStatusMessage(actionType, itemId),
      {
        calmAfterMs: MENU_ASSISTANT_STATUS_CALM_DELAY_MS
      }
    );
  }

  function getMenuAssistantActionRegistry() {
    return {
      add_to_cart: {
        safetyLevel: "local_ui",
        run(targetItemId = "") {
          if (!findMenuItemById(targetItemId)) {
            if (menuAssistant) {
              setMenuAssistantStatusMessage("That menu item is not available right now.");
            }
            showToast("That menu item is not available right now.");
            return;
          }

          queueMenuGridFocusRestore(targetItemId, ["plus", "remove", "add"]);
          addToCartWithLocation(targetItemId);
          setMenuAssistantActionStatus("add_to_cart", targetItemId);
        }
      },
      open_cart: {
        safetyLevel: "local_ui",
        run(targetItemId = "") {
          openCartDrawer();
          setMenuAssistantActionStatus("open_cart", targetItemId);
        }
      },
      view_full_menu: {
        safetyLevel: "navigation",
        run(targetItemId = "") {
          if (shouldUsePreviewMode()) {
            window.location.href = withHotelSlug("menu.html");
            return;
          }

          grid.scrollIntoView({ behavior: "smooth", block: "start" });
          setMenuAssistantActionStatus("view_full_menu", targetItemId);
          showToast("Browse the full menu below.");
        }
      }
    };
  }

  function handleMenuAssistantAction(actionType = "", itemId = "") {
    const normalizedActionType = String(actionType || "").trim();
    const actionDefinition = getMenuAssistantActionRegistry()[normalizedActionType];

    if (!actionDefinition || typeof actionDefinition.run !== "function") {
      console.warn("Blocked unsupported Smart Waiter action:", normalizedActionType);
      return;
    }

    actionDefinition.run(itemId);
  }

  if (menuAssistant) {
    renderMenuAssistantPrompts();
    renderMenuAssistantHistory();
    renderMenuAssistantConversationControls();
    restoreMenuAssistantOpenPreference();
    syncMenuAssistantCharCount();
    syncMenuAssistantSubmitHint();
    syncMenuAssistantFailureHint();
    syncMenuAssistantRetry();

    if (!menuAssistant.card.dataset.assistantBound) {
      menuAssistant.card.dataset.assistantBound = "1";

      menuAssistant.toggleBtn.addEventListener("click", () => {
        const stableOpen = syncMenuAssistantOpenStateFromDom();
        setMenuAssistantOpen(!stableOpen);
      });

      menuAssistant.exampleBtn?.addEventListener("click", () => {
        if (MENU_ASSISTANT_STATE.loading) return;

        const examplePrompt = menuAssistant.exampleBtn?.dataset.assistantExample || "";
        if (!examplePrompt) return;

        setMenuAssistantActivePrompt("");
        setMenuAssistantActiveFollowUp("");
        setMenuAssistantOpen(true);
        menuAssistant.input.value = examplePrompt;
        menuAssistant.input.focus({ preventScroll: true });
        menuAssistant.input.setSelectionRange(examplePrompt.length, examplePrompt.length);
        clearMenuAssistantFailureHint();
        syncMenuAssistantCharCount();
        syncMenuAssistantSubmitHint();
        setMenuAssistantStatusMessage("You can edit this example or ask it as-is.");
        syncMenuAssistantEmptyHint();
      });

      menuAssistant.clearBtn?.addEventListener("click", () => {
        if (MENU_ASSISTANT_STATE.loading) return;

        clearMenuAssistantConversation("Smart Waiter chat cleared. Ask a new menu question anytime.");
        menuAssistant.input.focus({ preventScroll: true });
      });

      menuAssistant.askAgainBtn?.addEventListener("click", () => {
        if (MENU_ASSISTANT_STATE.loading || menuAssistant.askAgainBtn.hidden) return;

        const repeatPrompt = String(MENU_ASSISTANT_STATE.lastTurn?.question || "").trim();
        if (!repeatPrompt) return;

        setMenuAssistantActivePrompt("");
        setMenuAssistantActiveFollowUp("");
        setMenuAssistantOpen(true);
        menuAssistant.input.value = repeatPrompt;
        clearMenuAssistantFailureHint();
        syncMenuAssistantCharCount();
        syncMenuAssistantSubmitHint();
        syncMenuAssistantEmptyHint();
        void requestMenuAssistantReply(repeatPrompt);
      });

      menuAssistant.copyBtn?.addEventListener("click", async () => {
        if (MENU_ASSISTANT_STATE.loading || menuAssistant.copyBtn.hidden) return;

        const copied = await copyMenuAssistantAnswerToClipboard();
        setMenuAssistantStatusMessage(
          copied
            ? "Smart Waiter answer copied."
            : "Could not copy the Smart Waiter answer right now.",
          copied
            ? { calmAfterMs: MENU_ASSISTANT_STATUS_CALM_DELAY_MS }
            : {}
        );

        if (copied) {
          showToast("Smart Waiter answer copied.");
        }
      });

      menuAssistant.retryBtn?.addEventListener("click", () => {
        if (MENU_ASSISTANT_STATE.loading) return;

        const retryPrompt = String(MENU_ASSISTANT_STATE.lastFailedPrompt || "").trim();
        if (!retryPrompt) return;

        setMenuAssistantActivePrompt("");
        setMenuAssistantActiveFollowUp("");
        setMenuAssistantOpen(true);
        menuAssistant.input.value = retryPrompt;
        syncMenuAssistantCharCount();
        syncMenuAssistantSubmitHint();
        syncMenuAssistantEmptyHint();
        void requestMenuAssistantReply(retryPrompt);
      });

      menuAssistant.promptsWrap.addEventListener("click", (event) => {
        const button = event.target.closest("[data-assistant-prompt]");
        if (!button || MENU_ASSISTANT_STATE.loading) return;

        const prompt = button.dataset.assistantPrompt || "";
        setMenuAssistantActivePrompt(prompt);
        setMenuAssistantActiveFollowUp("");
        menuAssistant.input.value = prompt;
        clearMenuAssistantFailureHint();
        syncMenuAssistantCharCount();
        syncMenuAssistantSubmitHint();
        syncMenuAssistantEmptyHint();
        void requestMenuAssistantReply(prompt);
      });

      menuAssistant.input.addEventListener("input", () => {
        setMenuAssistantActivePrompt("");
        setMenuAssistantActiveFollowUp("");
        clearMenuAssistantFailureHint();
        syncMenuAssistantCharCount();
        syncMenuAssistantSubmitHint();
        syncMenuAssistantEmptyHint();
      });

      menuAssistant.body.addEventListener("keydown", (event) => {
        handleMenuAssistantEscape(event);
      });

      menuAssistant.form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (MENU_ASSISTANT_STATE.loading) {
          return;
        }

        const message = menuAssistant.input.value.trim();

        if (!message) {
          showToast("Please enter a menu question first.");
          menuAssistant.input.focus({ preventScroll: true });
          return;
        }

        void requestMenuAssistantReply(message);
      });

      menuAssistant.actions.addEventListener("click", (event) => {
        const button = event.target.closest("[data-assistant-action]");
        if (!button) return;

        handleMenuAssistantAction(
          button.dataset.assistantAction || "",
          button.dataset.assistantItemId || ""
        );
      });

      menuAssistant.followUps.addEventListener("click", (event) => {
        const button = event.target.closest("[data-assistant-followup]");
        if (!button || MENU_ASSISTANT_STATE.loading) return;

        const prompt = button.dataset.assistantFollowup || "";
        setMenuAssistantActivePrompt("");
        setMenuAssistantActiveFollowUp(prompt);
        menuAssistant.input.value = prompt;
        clearMenuAssistantFailureHint();
        syncMenuAssistantCharCount();
        syncMenuAssistantSubmitHint();
        syncMenuAssistantEmptyHint();
        void requestMenuAssistantReply(prompt);
      });
    }
  }


  function getPaymentMethodAvailability() {
    const ordering = getHotelOrderingState();
    return {
      COD: ordering.cashOnDeliveryEnabled !== false,
      UPI:
        ordering.manualUpiPaymentEnabled !== false &&
        Boolean(String(CONFIG.OWNER_UPI_ID || "").trim()),
      ONLINE_GATEWAY: ordering.secureOnlinePaymentEnabled !== false
    };
  }

  function syncPaymentMethodAvailability() {
    const availability = getPaymentMethodAvailability();
    const inputs = $$('input[name="paymentMethod"]', checkoutForm || document);

    inputs.forEach((input) => {
      const enabled = availability[input.value] !== false;
      input.disabled = !enabled;
      const option = input.closest("label.payment-option");
      if (option) option.hidden = !enabled;
    });

    const checked = inputs.find((input) => input.checked && !input.disabled);
    if (!checked) {
      const fallback = inputs.find((input) => !input.disabled);
      if (fallback) fallback.checked = true;
    }
  }

  function getSelectedPaymentMethod() {
    return $('input[name="paymentMethod"]:checked:not(:disabled)')?.value || "";
  }

  function isPaymentGatewayBridgeEnabled(paymentMethod = getSelectedPaymentMethod()) {
    const provider = String(CONFIG.PAYMENT_GATEWAY_PROVIDER || "").trim().toLowerCase();
    return (
      getHotelOrderingState().secureOnlinePaymentEnabled !== false &&
      CONFIG.PAYMENT_GATEWAY_ENABLED === true &&
      provider === "razorpay" &&
      paymentMethod === "ONLINE_GATEWAY"
    );
  }

  function getPaymentGatewayReadinessState() {
    return PAYMENT_GATEWAY_READINESS &&
      typeof PAYMENT_GATEWAY_READINESS === "object"
      ? PAYMENT_GATEWAY_READINESS
      : {};
  }

  function isPaymentGatewayBackendReady() {
    return getPaymentGatewayReadinessState().checkoutAvailable === true;
  }

  async function refreshPaymentGatewayReadiness() {
    if (!CONFIG.PAYMENT_GATEWAY_ENABLED) {
      PAYMENT_GATEWAY_READINESS = {
        checkoutAvailable: false,
        reason: "frontend_disabled"
      };
      return PAYMENT_GATEWAY_READINESS;
    }

    if (paymentGatewayReadinessPromise) {
      return paymentGatewayReadinessPromise;
    }

    paymentGatewayReadinessPromise = fetch(`${CONFIG.API_BASE_URL}/api/payments/readiness`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || "Payment readiness check failed.");
        }

        PAYMENT_GATEWAY_READINESS = data.paymentGateway || {
          checkoutAvailable: false,
          reason: "invalid_readiness_response"
        };

        return PAYMENT_GATEWAY_READINESS;
      })
      .catch((error) => {
        console.warn("Payment gateway readiness unavailable:", error);
        PAYMENT_GATEWAY_READINESS = {
          checkoutAvailable: false,
          reason: "readiness_check_failed"
        };
        return PAYMENT_GATEWAY_READINESS;
      })
      .finally(() => {
        paymentGatewayReadinessPromise = null;
      });

    return paymentGatewayReadinessPromise;
  }

  function isPaymentGatewaySubmitImplemented() {
    return true;
  }

  function isPaymentGatewayCheckoutReady(paymentMethod = getSelectedPaymentMethod()) {
    return (
      isPaymentGatewayBridgeEnabled(paymentMethod) &&
      CONFIG.PAYMENT_GATEWAY_CHECKOUT_ENABLED === true &&
      isPaymentGatewaySubmitImplemented() &&
      isPaymentGatewayBackendReady()
    );
  }

  function getGatewayPaymentMethodLabel(paymentMethod = getSelectedPaymentMethod()) {
    if (paymentMethod === "UPI") return "Google Pay / UPI";
    if (paymentMethod === "ONLINE_GATEWAY") return "Online Payment";
    return paymentMethod || "Online Payment";
  }

  function ensurePaymentGatewayOption() {
    if (
      !checkoutForm ||
      !CONFIG.PAYMENT_GATEWAY_ENABLED ||
      getHotelOrderingState().secureOnlinePaymentEnabled === false
    ) {
      return null;
    }

    const paymentBox = $(".payment-box", checkoutForm);
    const upiInput = $('input[name="paymentMethod"][value="UPI"]', paymentBox || checkoutForm);
    const upiLabel = upiInput?.closest("label");

    if (!paymentBox || !upiLabel) return null;

    let gatewayOption = $("#paymentGatewayOption", paymentBox);
    if (!gatewayOption) {
      gatewayOption = document.createElement("label");
      gatewayOption.id = "paymentGatewayOption";
      gatewayOption.className = "payment-option payment-gateway-option";
      gatewayOption.innerHTML = `
        <input type="radio" name="paymentMethod" value="ONLINE_GATEWAY" />
        <span class="payment-gateway-copy">
          <strong>Secure Online Payment</strong>
          <small>Verified checkout opens in the next step.</small>
        </span>
      `;
      upiLabel.insertAdjacentElement("afterend", gatewayOption);
    }

    let gatewayBox = $("#paymentGatewayBox", paymentBox);
    if (!gatewayBox) {
      gatewayBox = document.createElement("div");
      gatewayBox.id = "paymentGatewayBox";
      gatewayBox.className = "payment-gateway-box";
      gatewayBox.hidden = true;
      gatewayBox.innerHTML = `
        <p class="payment-gateway-status">Secure online payment is available for this hotel.</p>
        <p class="payment-gateway-note">
          We will open the verified gateway checkout next. After payment confirmation, the order is saved before the hotel handoff continues.
        </p>
      `;
      gatewayOption.insertAdjacentElement("afterend", gatewayBox);
    }

    return gatewayOption;
  }

  function syncPaymentGatewayOptionUI(paymentMethod = getSelectedPaymentMethod()) {
    const gatewayOption = $("#paymentGatewayOption", checkoutForm || document);
    const gatewayBox = $("#paymentGatewayBox", checkoutForm || document);
    const gatewayInput = gatewayOption?.querySelector('input[name="paymentMethod"]');
    const shouldShowGatewayOption =
      CONFIG.PAYMENT_GATEWAY_ENABLED === true &&
      getHotelOrderingState().secureOnlinePaymentEnabled !== false;
    const isCheckoutReady = isPaymentGatewayCheckoutReady("ONLINE_GATEWAY");
    const isGatewaySelected = paymentMethod === "ONLINE_GATEWAY";

    if (gatewayOption) {
      gatewayOption.hidden = !shouldShowGatewayOption;
      gatewayOption.classList.toggle("is-disabled", shouldShowGatewayOption && !isCheckoutReady);
    }

    if (gatewayInput) {
      gatewayInput.disabled = !shouldShowGatewayOption || !isCheckoutReady;
    }

    if (gatewayBox) {
      gatewayBox.hidden = !shouldShowGatewayOption || !isGatewaySelected;
    }
  }

  function getGatewayOrderContextPayload(orderContext = getActiveOrderContext()) {
    return {
      orderType: orderContext.orderType || "standard",
      tableNumber: orderContext.tableNumber || "",
      orderSource: orderContext.orderSource || "website",
      qrContextToken: orderContext.qrContextToken || ""
    };
  }

  function buildPaymentGatewayInitPayload({
    normalizedCart,
    paymentMethod,
    customerName,
    customerPhone,
    customerAddress,
    note,
    summaryText,
    orderContext
  }) {
    return {
      hotelSlug: getActiveHotelSlug(),
      paymentMethod: getGatewayPaymentMethodLabel(paymentMethod),
      items: normalizedCart.map((item) => ({
        id: item.id,
        qty: item.qty
      })),
      orderContext: getGatewayOrderContextPayload(orderContext),
      orderDraft: {
        hotelName: getActiveHotelName(),
        customerName,
        customerPhone,
        customerAddress,
        note,
        whatsappMessage: summaryText
      }
    };
  }

  async function initPaymentGatewayDraft(initPayload) {
    return postJSON("/api/payments/init", initPayload);
  }

  function getGatewayLinkedOrderId(order) {
    return order?.id === undefined || order?.id === null
      ? ""
      : String(order.id).trim();
  }

  async function recordPaymentGatewayFailure({
    order,
    gatewayOrderId,
    gatewayPaymentId = "",
    reason = "",
    errorCode = "",
    errorSource = "",
    errorStep = ""
  }) {
    const orderId = getGatewayLinkedOrderId(order);
    const linkedGatewayOrderId = gatewayOrderId || "";

    if (!orderId || !linkedGatewayOrderId) {
      return null;
    }

    try {
      return await postJSON("/api/payments/fail", {
        hotelSlug: getActiveHotelSlug(),
        orderId,
        gatewayOrderId: linkedGatewayOrderId,
        gatewayPaymentId,
        reason,
        errorCode,
        errorSource,
        errorStep
      });
    } catch (error) {
      console.warn("Payment failure could not be recorded:", error);
      return null;
    }
  }

  async function reconcilePaymentGatewayOrder({
    order,
    gatewayOrderId
  }) {
    const orderId = getGatewayLinkedOrderId(order);
    const linkedGatewayOrderId = gatewayOrderId || "";

    if (!orderId || !linkedGatewayOrderId) {
      return null;
    }

    try {
      return await postJSON("/api/payments/reconcile", {
        hotelSlug: getActiveHotelSlug(),
        orderId,
        gatewayOrderId: linkedGatewayOrderId
      });
    } catch (error) {
      console.warn("Payment reconciliation failed:", error);
      return null;
    }
  }

  function isPaidGatewayOrderResult(result = {}) {
    if (!result || typeof result !== "object") {
      return false;
    }

    if (result.orderUpdated) {
      return true;
    }

    const updateReason = String(result.orderUpdateReason || "").trim().toLowerCase();
    const payment = result.payment && typeof result.payment === "object" ? result.payment : {};

    return (
      updateReason === "already_paid_by_other_request" &&
      (payment.verified === true || payment.captured === true)
    );
  }

  function loadPaymentGatewayScript() {
    if (window.Razorpay) {
      return Promise.resolve(window.Razorpay);
    }

    if (paymentGatewayScriptPromise) {
      return paymentGatewayScriptPromise;
    }

    paymentGatewayScriptPromise = new Promise((resolve, reject) => {
      const scriptUrl =
        CONFIG.PAYMENT_GATEWAY_SCRIPT_URL ||
        "https://checkout.razorpay.com/v1/checkout.js";
      let script = document.querySelector('script[data-payment-gateway="razorpay"]');

      const handleLoad = () => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
          return;
        }

        reject(new Error("Payment gateway checkout did not load correctly."));
      };
      const handleError = () => {
        paymentGatewayScriptPromise = null;
        reject(new Error("Unable to load payment gateway checkout."));
      };

      if (!script) {
        script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.dataset.paymentGateway = "razorpay";
        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });
        document.head.appendChild(script);
        return;
      }

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
    });

    return paymentGatewayScriptPromise;
  }

  function openPaymentGatewayCheckout({
    RazorpayCheckout,
    payment,
    order,
    customerName,
    customerPhone,
    customerAddress,
    note,
    summaryText,
    orderContext
  }) {
    return new Promise((resolve, reject) => {
      const gatewayOrderId = payment?.gatewayOrderId || "";
      let checkoutSettled = false;

      const resolveOnce = (value) => {
        if (checkoutSettled) return;
        checkoutSettled = true;
        resolve(value);
      };

      const rejectOnce = async (error, failurePayload = null) => {
        if (checkoutSettled) return;
        checkoutSettled = true;

        if (failurePayload) {
          await recordPaymentGatewayFailure(failurePayload);
        }

        reject(error);
      };
      const resolveWithPaidGatewayResult = (verifyResult, response = {}) => {
        resolveOnce({
          verifyResult,
          response,
          summaryText,
          customerAddress,
          note
        });
      };

      if (!RazorpayCheckout || !gatewayOrderId || !payment?.keyId) {
        reject(new Error("Payment gateway order is incomplete."));
        return;
      }

      const checkout = new RazorpayCheckout({
        key: payment.keyId,
        amount: payment.amountMinor,
        currency: payment.currency || "INR",
        name: getActiveHotelName() || "Hotel",
        description: "Food order payment",
        order_id: gatewayOrderId,
        prefill: {
          name: customerName,
          contact: customerPhone
        },
        notes: {
          hotelSlug: getActiveHotelSlug(),
          orderId: getGatewayLinkedOrderId(order),
          tableNumber: orderContext?.tableNumber || "",
          orderSource: orderContext?.orderSource || "website"
        },
        theme: {
          color: "#c9a84c"
        },
        modal: {
          ondismiss: async () => {
            const reconcileResult = await reconcilePaymentGatewayOrder({
              order,
              gatewayOrderId
            });

            if (isPaidGatewayOrderResult(reconcileResult)) {
              resolveWithPaidGatewayResult(reconcileResult, {
                razorpay_order_id: gatewayOrderId,
                razorpay_payment_id: reconcileResult.payment?.gatewayPaymentId || ""
              });
              return;
            }

            rejectOnce(new Error("Payment was cancelled."), {
              order,
              gatewayOrderId,
              reason: "checkout_dismissed",
              errorStep: "checkout_modal"
            });
          }
        },
        handler: async (response) => {
          try {
            const verifyResult = await postJSON("/api/payments/verify", {
              hotelSlug: getActiveHotelSlug(),
              orderId: getGatewayLinkedOrderId(order),
              gatewayOrderId: response.razorpay_order_id || gatewayOrderId,
              gatewayPaymentId: response.razorpay_payment_id || "",
              gatewaySignature: response.razorpay_signature || ""
            });

            resolveWithPaidGatewayResult(verifyResult, response);
          } catch (error) {
            const reconcileResult = await reconcilePaymentGatewayOrder({
              order,
              gatewayOrderId
            });

            if (isPaidGatewayOrderResult(reconcileResult)) {
              resolveWithPaidGatewayResult(reconcileResult, {
                razorpay_order_id: gatewayOrderId,
                razorpay_payment_id: reconcileResult.payment?.gatewayPaymentId || ""
              });
              return;
            }

            rejectOnce(error);
          }
        }
      });

      checkout.on("payment.failed", (response) => {
        const gatewayError = response?.error || {};
        const gatewayMetadata = gatewayError.metadata || {};
        const message =
          gatewayError.description ||
          gatewayError.reason ||
          "Payment failed. Please try again or use COD / manual UPI.";
        rejectOnce(new Error(message), {
          order,
          gatewayOrderId: gatewayMetadata.order_id || gatewayOrderId,
          gatewayPaymentId: gatewayMetadata.payment_id || "",
          reason: message,
          errorCode: gatewayError.code || "",
          errorSource: gatewayError.source || "",
          errorStep: gatewayError.step || ""
        });
      });

      checkout.open();
    });
  }

  async function handlePaymentGatewayCheckout({
    normalizedCart,
    paymentMethod,
    customerName,
    customerPhone,
    customerAddress,
    customerTableNote,
    locationLink,
    note,
    summaryText,
    orderContext
  }) {
    showToast("Preparing secure payment...");

    const initPayload = buildPaymentGatewayInitPayload({
      normalizedCart,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      note,
      summaryText,
      orderContext
    });
    const initResult = await initPaymentGatewayDraft(initPayload);
    const linkedOrder = initResult?.order || null;

    if (!initResult?.orderLinked || !linkedOrder?.id) {
      throw new Error(
        "Secure payment could not prepare the order. Please use COD or Google Pay / UPI."
      );
    }

    const RazorpayCheckout = await loadPaymentGatewayScript();
    const checkoutResult = await openPaymentGatewayCheckout({
      RazorpayCheckout,
      payment: initResult.payment,
      order: linkedOrder,
      customerName,
      customerPhone,
      customerAddress,
      note,
      summaryText,
      orderContext
    });

    if (!isPaidGatewayOrderResult(checkoutResult?.verifyResult)) {
      throw new Error(
        "Payment was verified, but the order could not be marked paid. Please contact the hotel."
      );
    }

    CART = [];
    saveCart();
    updateCartUI();
    renderMenu(MENU_STATE.activeCategory);

    if (checkoutForm) {
      checkoutForm.reset();
      clearCheckoutAddressState(checkoutForm);
    }

    const codInput = document.querySelector('input[name="paymentMethod"][value="COD"]');
    if (codInput) codInput.checked = true;

    let verifiedHotelHandoffReady = false;
    let verifiedHotelHandoffUnavailable = false;

    if (OPEN_WHATSAPP_AFTER_VERIFIED_ONLINE_PAYMENT) {
      const verifiedSummaryText = buildOrderSummaryText({
        customerName,
        customerPhone,
        customerAddress,
        customerTableNote,
        locationLink,
        paymentMethod,
        note,
        paymentConfirmed: true,
        items: normalizedCart,
        orderContext
      });
      const verifiedHotelWhatsAppLink = cleanPhone(CONFIG.OWNER_WHATSAPP_NUMBER)
        ? ownerWhatsAppLink(verifiedSummaryText)
        : "";

      if (verifiedHotelWhatsAppLink) {
        openWhatsAppSafely(verifiedHotelWhatsAppLink);
        verifiedHotelHandoffReady = true;
      } else {
        verifiedHotelHandoffUnavailable = true;
        console.warn(
          "Verified payment succeeded, but owner WhatsApp handoff is unavailable for this hotel."
        );
      }
    }

    closeCartDrawer();
    updatePaymentUI();
    showOrderTrackingPrompt(
      initResult?.tracking,
      verifiedHotelHandoffReady
        ? "Payment verified. Your hotel handoff opened in WhatsApp and your live order tracking link is ready."
        : "Payment verified. Your live order tracking link is ready."
    );
    showToast(
      verifiedHotelHandoffReady
        ? initResult?.trackingReady
          ? "Payment verified. WhatsApp handoff and tracking link are ready."
          : "Payment verified. WhatsApp handoff is ready."
        : verifiedHotelHandoffUnavailable
          ? initResult?.trackingReady
            ? "Payment verified. Tracking link is ready, but hotel WhatsApp handoff is not configured."
            : "Payment verified. Order saved, but hotel WhatsApp handoff is not configured."
          : initResult?.trackingReady
            ? "Payment verified. Tracking link is ready."
            : "Payment verified. Your order was saved successfully."
    );
  }

  function updateOrderPreview() {
    if (!orderPreview) return;

    if (!CART.length) {
      orderPreview.textContent = "No order yet.";
      return;
    }

    const customerName = $("#orderName")?.value.trim() || "Preview User";
    const customerPhone = $("#orderPhone")?.value.trim() || "Not provided";
    const orderContext = getActiveOrderContext();
    const rawCustomerAddress = $("#orderAddress")?.value.trim() || "";
    const customerAddress =
      getEffectiveCustomerAddress(rawCustomerAddress, orderContext) ||
      "Not provided";
    const note = $("#orderNote")?.value.trim() || "";
    const paymentMethod = getSelectedPaymentMethod();
    const paymentConfirmed = $("#orderPaymentConfirmed")?.checked || false;

    orderPreview.textContent = buildOrderSummaryText({
      customerName,
      customerPhone,
      customerAddress,
      customerTableNote: rawCustomerAddress,
      locationLink: USER_LOCATION || "Not shared",
      paymentMethod,
      note,
      paymentConfirmed,
      orderContext,
    });
  }

  function updatePaymentUI() {
    syncPaymentMethodAvailability();
    const paymentMethod = getSelectedPaymentMethod();
    const isUpi = paymentMethod === "UPI";
    const isGatewayBridgeReady = isPaymentGatewayBridgeEnabled(paymentMethod);
    const { normalTotal, upiDiscountPercent, gpayDiscount, gpayFinalTotal } =
      calculatePayableAmounts();

    syncPaymentGatewayOptionUI(paymentMethod);

    if (checkoutForm) {
      checkoutForm.dataset.paymentGatewayReady = isGatewayBridgeReady ? "true" : "false";
      checkoutForm.dataset.paymentGatewayProvider = CONFIG.PAYMENT_GATEWAY_PROVIDER || "";
    }

    if (upiBox) {
      upiBox.hidden = !isUpi;
    }

    if (orderUpiId) {
      orderUpiId.textContent = CONFIG.OWNER_UPI_ID || "";
    }

    if (upiOriginalTotalEl) {
      upiOriginalTotalEl.textContent = formatCurrency(normalTotal);
    }

    if (upiDiscountAmountEl) {
      upiDiscountAmountEl.textContent = `-${formatCurrency(gpayDiscount)}`;
    }

    if (upiDiscountLabelEl) {
      upiDiscountLabelEl.textContent =
        `Google Pay Discount (${formatDiscountPercent(upiDiscountPercent)})`;
    }

    if (upiOfferBadgeEl) {
      upiOfferBadgeEl.textContent = upiDiscountPercent > 0
        ? `Pay with Google Pay and get ${formatDiscountPercent(upiDiscountPercent)} off`
        : "Pay with Google Pay / UPI";
    }

    if (upiFinalAmountEl) {
      upiFinalAmountEl.textContent = formatCurrency(gpayFinalTotal);
    }

    if (upiManualAmount) {
      upiManualAmount.textContent = formatCurrency(gpayFinalTotal);
    }

    if (upiFallbackLink) {
      upiFallbackLink.href = buildUpiLink(gpayFinalTotal);
    }

    if (!isUpi && upiFallbackBox) {
      upiFallbackBox.hidden = true;
    }

    updateCartUI();
    updateOrderPreview();
  }

  async function openGooglePay() {
    const { gpayFinalTotal } = calculatePayableAmounts();
    const upiLink = buildUpiLink(gpayFinalTotal);

    if (upiFallbackLink) {
      upiFallbackLink.href = upiLink;
    }

    if (upiFallbackBox) {
      upiFallbackBox.hidden = false;
    }

    if (!CONFIG.OWNER_UPI_ID) {
      showToast("UPI ID is not configured for this hotel.");
      return;
    }

    if (!isLikelyMobileUpiDevice()) {
      await showManualUpiFallback(
        "Google Pay / UPI app links open on supported mobile devices. Use the details below."
      );
      return;
    }

    try {
      window.location.href = upiLink;
    } catch (error) {
      await showManualUpiFallback(
        "Could not open Google Pay automatically. Use the manual UPI link below.",
      );
      return;
    }

    setTimeout(() => {
      if (upiFallbackBox) {
        upiFallbackBox.hidden = false;
      }
    }, 1200);
  }

  function sortItems(items) {
    const list = [...items];

    switch (MENU_STATE.sortBy) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "az":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "popularity":
        list.sort((a, b) => {
          const score = (item) => {
            let s = 0;
            if ((item.badge || "").toLowerCase().includes("popular")) s += 5;
            if ((item.badge || "").toLowerCase().includes("signature")) s += 4;
            if ((item.badge || "").toLowerCase().includes("chef")) s += 3;
            return s;
          };
          return score(b) - score(a);
        });
        break;
      case "featured":
      default:
        break;
    }

    return list;
  }

  function getFilteredItems() {
    let items = getBaseItems();

    if (MENU_STATE.selectedTag !== "all") {
      const selected = MENU_STATE.selectedTag.toLowerCase();
      items = items.filter((item) =>
        item.normalizedTags.some(
          (tag) => String(tag).toLowerCase() === selected,
        ),
      );
    }

    if (MENU_STATE.query.trim()) {
      const q = MENU_STATE.query.trim().toLowerCase();
      items = items.filter((item) => item.searchBlob.includes(q));
    }

    return sortItems(items);
  }

  function syncActiveTabUI() {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.cat === MENU_STATE.activeCategory;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
  }

  function syncScopeButtonsUI() {
    scopeButtons.forEach((btn) => {
      const isActive = btn.dataset.scope === MENU_STATE.searchScope;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  function updateClearButtonUI() {
    if (!clearSearchBtn || !searchInput) return;
    const hasValue = !!searchInput.value.trim();
    clearSearchBtn.style.visibility = hasValue ? "visible" : "hidden";
    clearSearchBtn.style.pointerEvents = hasValue ? "auto" : "none";
  }

  function buildTagFilters() {
    if (!tagFiltersWrap) return;

    const tags = getAvailableTags();

    tagFiltersWrap.innerHTML = tags
      .map((tag) => {
        const isActive = MENU_STATE.selectedTag === tag;
        const label = tag === "all" ? "All" : tag;
        return `
        <button
          type="button"
          class="menu-filter-chip${isActive ? " active" : ""}"
          data-tag="${escapeAttr(tag)}"
          aria-pressed="${isActive}"
        >
          ${escapeHTML(label)}
        </button>
      `;
      })
      .join("");
  }

  function updateResultsSummary(filteredItems, visibleItems) {
    if (resultsMeta) {
      const total = filteredItems.length;
      const shown = visibleItems.length;
      const remaining = Math.max(0, total - shown);
      const context =
        MENU_STATE.searchScope === "all"
          ? "across full menu"
          : `in ${getCategoryLabel(MENU_STATE.activeCategory).toLowerCase()}`;
      const remainingText =
        !shouldUsePreviewMode() && remaining > 0
          ? ` ${remaining} more available.`
          : "";

      resultsMeta.textContent =
        `${shown} of ${total} dishes shown ${context}.` + remainingText;
    }

    if (searchState) {
      const bits = [
        MENU_STATE.searchScope === "all"
          ? "Scope: Full Menu"
          : `Scope: ${getCategoryLabel(MENU_STATE.activeCategory)}`
      ];
      if (MENU_STATE.query.trim())
        bits.push(`Search: "${MENU_STATE.query.trim()}"`);
      if (MENU_STATE.selectedTag !== "all")
        bits.push(`Tag: ${MENU_STATE.selectedTag}`);
      searchState.textContent = bits.join(" • ");
    }
  }

  function renderEmptyState() {
    const activeQuery = MENU_STATE.query.trim();
    const activeTag = MENU_STATE.selectedTag !== "all" ? MENU_STATE.selectedTag : "";
    const scopeLabel =
      MENU_STATE.searchScope === "all"
        ? "the full menu"
        : getCategoryLabel(MENU_STATE.activeCategory);
    const detailParts = [];

    if (activeQuery) {
      detailParts.push(`for "${escapeHTML(activeQuery)}"`);
    }

    if (activeTag) {
      detailParts.push(`with tag "${escapeHTML(activeTag)}"`);
    }

    const detailText = detailParts.length ? ` ${detailParts.join(" ")}` : "";
    const scopeText =
      MENU_STATE.searchScope === "all"
        ? `across ${scopeLabel}`
        : `in ${escapeHTML(scopeLabel)}`;

    grid.innerHTML = `
      <div class="menu-empty-state glass-card">
        <i class="fas fa-search" aria-hidden="true"></i>
        <h3>No matching dishes found</h3>
        <p>No dishes matched${detailText} ${scopeText}.</p>
        <p>Try changing search, switching scope, or clearing tag filters.</p>
      </div>
    `;
  }



  function addToCartWithLocation(itemId) {
    if (!hasDineInOrderContext()) {
      getUserLiveLocation();
    }
    if (addToCart(itemId)) {
      showToast("Added to cart");
    }
  }

  function attachDynamicHoverAndTilt() {
    if (window.innerWidth < 768) return;

    const cards = $$(".menu-card", grid);
    cards.forEach((card) => {
      if (card.dataset.menuInteractionBound === "true") return;
      card.dataset.menuInteractionBound = "true";
      card.addEventListener("mouseenter", () => {
        const ring = $("#cursorRing");
        if (ring) ring.classList.add("hovered");
      });

      card.addEventListener("mouseleave", () => {
        const ring = $("#cursorRing");
        if (ring) ring.classList.remove("hovered");
        card.style.transform = "";
      });

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        card.style.transform = `
          perspective(600px)
          rotateY(${x * 5}deg)
          rotateX(${-y * 5}deg)
          translateY(-8px)
          scale(1.015)
        `;
      });
    });
  }

  function createMenuCard(item, index, showCategoryPill) {
    const qty = getItemQty(item.id);
    const orderingDisabled = !isCustomerOrderingEnabled();
    const inlineTags = item.normalizedTags.slice(0, 3);
    const comboItems = Array.isArray(item.comboItems) ? item.comboItems : [];
    const comboSummary =
      item.itemType === "combo" && comboItems.length
        ? comboItems
            .map((comboItem) => {
              const quantity = Number(comboItem.quantity || 1);
              const comboItemName = String(comboItem.name || comboItem.itemId || "").trim();
              return `${quantity}x ${comboItemName}`;
            })
            .filter(Boolean)
            .join(" + ")
        : "";
    const showComboSavings =
      item.itemType === "combo" &&
      Number(item.originalPrice || 0) > Number(item.price || 0) &&
      Number(item.savings || 0) > 0;

    return `
      <article class="menu-card" role="article" data-menu-item-id="${escapeAttr(item.id)}" style="animation-delay:${Math.min(index % MENU_STATE.batchSize, 7) * 0.04}s">
        ${createImageMarkup({
          src: item.image,
          imageMeta: item.imageMeta,
          alt: item.alt || item.name,
          badge: item.badge,
          name: item.name,
          priority: index < 4,
        })}

        <div class="menu-card-body">
          <div class="menu-card-head">
            <h3 class="menu-card-name">${escapeHTML(item.name)}</h3>
            ${showCategoryPill ? `<span class="menu-card-category">${escapeHTML(getCategoryLabel(item.category))}</span>` : ""}
          </div>

          <p class="menu-card-desc">${escapeHTML(item.desc || "")}</p>
          ${
            comboSummary
              ? `<p class="menu-card-desc">Includes: ${escapeHTML(comboSummary)}</p>`
              : ""
          }

          ${
            inlineTags.length
              ? `
            <div class="menu-card-tags">
              ${inlineTags.map((tag) => `<span class="menu-inline-tag">${escapeHTML(tag)}</span>`).join("")}
            </div>
          `
              : ""
          }

          <div class="menu-card-footer">
            <span class="menu-card-price">${formatCurrency(item.price)}</span>
            ${
              item.tag
                ? `<span class="menu-card-tag">${escapeHTML(item.tag)}</span>`
                : item.itemType === "combo"
                  ? `<span class="menu-card-tag">Combo</span>`
                  : ""
            }
          </div>

          ${
            showComboSavings
              ? `
            <div class="menu-card-tags">
              <span class="menu-inline-tag">Was ${escapeHTML(formatCurrency(item.originalPrice || 0))}</span>
              <span class="menu-inline-tag">Save ${escapeHTML(formatCurrency(item.savings || 0))}</span>
            </div>
          `
              : ""
          }

          <div class="menu-card-actions">
            ${
              orderingDisabled
                ? `
                  <button
                    type="button"
                    class="btn btn-primary menu-add-btn hotel-ordering-disabled-btn"
                    data-ordering-disabled="true"
                    aria-disabled="true"
                  >
                    ${escapeHTML(getOrderingUnavailableActionLabel())}
                  </button>
                `
                : qty > 0
                ? `
                  <div class="qty-control">
                    <button type="button" class="qty-btn" data-minus="${escapeAttr(item.id)}" aria-label="Decrease quantity">−</button>
                    <span class="qty-value">${qty}</span>
                    <button type="button" class="qty-btn" data-plus="${escapeAttr(item.id)}" aria-label="Increase quantity">+</button>
                  </div>
                  <button type="button" class="remove-mini-btn" data-remove="${escapeAttr(item.id)}">Remove</button>
                `
                : `
                  <button type="button" class="btn btn-primary menu-add-btn" data-add="${escapeAttr(item.id)}">
                    Add
                  </button>
                `
            }
          </div>
        </div>
      </article>
    `;
  }

  window.updateRenderedMenuItem = function updateRenderedMenuItem(itemId) {
    const item = ALL_ITEMS.find((entry) => String(entry.id) === String(itemId));
    if (!item) return;
    const qty = getItemQty(item.id);
    const actionsMarkup = !isCustomerOrderingEnabled()
      ? `
        <button
          type="button"
          class="btn btn-primary menu-add-btn hotel-ordering-disabled-btn"
          data-ordering-disabled="true"
          aria-disabled="true"
        >
          ${escapeHTML(getOrderingUnavailableActionLabel())}
        </button>
      `
      : qty > 0
        ? `
          <div class="qty-control">
            <button type="button" class="qty-btn" data-minus="${escapeAttr(item.id)}" aria-label="Decrease quantity">&minus;</button>
            <span class="qty-value">${qty}</span>
            <button type="button" class="qty-btn" data-plus="${escapeAttr(item.id)}" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="remove-mini-btn" data-remove="${escapeAttr(item.id)}">Remove</button>
        `
        : `
          <button type="button" class="btn btn-primary menu-add-btn" data-add="${escapeAttr(item.id)}">
            Add
          </button>
        `;

    $$("[data-menu-item-id]", grid)
      .filter((card) => String(card.dataset.menuItemId) === String(itemId))
      .forEach((card) => {
        const actions = $(".menu-card-actions", card);
        if (actions) actions.innerHTML = actionsMarkup;
      });
  };

  window.renderMenu = function renderMenu(
    category = MENU_STATE.activeCategory,
    options = {},
  ) {
    const { resetVisible = false, append = false } = options;
    const nextCategory = availableCategories.includes(category)
      ? category
      : availableCategories.includes(MENU_STATE.activeCategory)
        ? MENU_STATE.activeCategory
        : getInitialMenuCategory();

    MENU_STATE.activeCategory = nextCategory || MENU_STATE.activeCategory;
    grid.dataset.activeCategory = MENU_STATE.activeCategory;

    if (resetVisible && !shouldUsePreviewMode()) {
      MENU_STATE.visibleCount = MENU_STATE.batchSize;
    }

    syncCategoryTabsAvailability();
    syncActiveTabUI();
    syncScopeButtonsUI();
    updateClearButtonUI();
    buildTagFilters();

    const filteredItems = getFilteredItems();
    const visibleItems = filteredItems.slice(0, getVisibleLimit());
    const showCategoryPill = MENU_STATE.searchScope === "all";

    if (!filteredItems.length) {
      updateResultsSummary(filteredItems, visibleItems);
      if (loadMoreBtn) loadMoreBtn.hidden = true;
      grid.dataset.renderedCount = "0";
      if (scrollHint) scrollHint.hidden = true;
      renderEmptyState();
      restorePendingMenuGridFocus();
      return;
    }

    const renderedCount = Number(grid.dataset.renderedCount || 0);
    const canAppend = append && renderedCount > 0 && renderedCount <= visibleItems.length;
    const renderStart = canAppend ? renderedCount : 0;
    const cardsMarkup = visibleItems
      .slice(renderStart)
      .map((item, i) => createMenuCard(item, renderStart + i, showCategoryPill))
      .join("");

    if (canAppend) {
      grid.insertAdjacentHTML("beforeend", cardsMarkup);
    } else {
      grid.innerHTML = cardsMarkup;
    }
    grid.dataset.renderedCount = String(visibleItems.length);

    initManagedImages(grid);

    const remaining = filteredItems.length - visibleItems.length;

    if (loadMoreBtn) {
      loadMoreBtn.hidden = shouldUsePreviewMode() || remaining <= 0;
      const loadMoreLabel = getConfiguredCtaLabel("loadMore") || "Load More";
      const loadMoreHint = formatConfiguredCountLabel(
        getConfiguredCtaLabel("loadMoreHint"),
        remaining,
        `${remaining} more dishes`
      );
      loadMoreBtn.innerHTML =
        remaining > 0
          ? `<span>${escapeHTML(loadMoreLabel)}</span><small>${escapeHTML(loadMoreHint)}</small>`
          : `<span>${escapeHTML(loadMoreLabel)}</span>`;
    }

    if (scrollHint) {
      const scrollHintLabel = $("span", scrollHint);
      scrollHint.hidden = shouldUsePreviewMode() || remaining <= 0;

      if (scrollHintLabel) {
        const fallbackHint =
          remaining > 0
            ? `Explore ${remaining} more dish${remaining === 1 ? "" : "es"} below`
            : "Explore more dishes below";

        scrollHintLabel.textContent = formatConfiguredCountLabel(
          getConfiguredCtaLabel("menuScrollHint"),
          remaining,
          fallbackHint
        );
      }
    }

    updateResultsSummary(filteredItems, visibleItems);
    attachDynamicHoverAndTilt();
    restorePendingMenuGridFocus();
  };

  function persistSelectedMenuCategory(categoryKey = "") {
    const category = getMenuCategoryRecord(categoryKey);
    if (!category || !window.history?.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set("category", category.slug || category.key);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      MENU_STATE.activeCategory = tab.dataset.cat;
      MENU_STATE.selectedTag = "all";
      MENU_STATE.visibleCount = MENU_STATE.batchSize;
      persistSelectedMenuCategory(tab.dataset.cat);
      renderMenu(tab.dataset.cat, { resetVisible: true });
      tab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      MENU_STATE.query = searchInput.value.trim();
      MENU_STATE.visibleCount = MENU_STATE.batchSize;
      renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        MENU_STATE.query = "";
        searchInput.value = "";
        MENU_STATE.visibleCount = MENU_STATE.batchSize;
        updateClearButtonUI();
        renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
        searchInput.blur();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!MENU_STATE.query.trim()) return;

    MENU_STATE.query = "";
    MENU_STATE.visibleCount = MENU_STATE.batchSize;

    if (searchInput) searchInput.value = "";
    updateClearButtonUI();
    renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
  });

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      MENU_STATE.query = "";
      MENU_STATE.visibleCount = MENU_STATE.batchSize;

      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }

      updateClearButtonUI();
      renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
    });
  }

  scopeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      MENU_STATE.searchScope = btn.dataset.scope;
      MENU_STATE.selectedTag = "all";
      MENU_STATE.visibleCount = MENU_STATE.batchSize;
      renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      MENU_STATE.sortBy = sortSelect.value;
      MENU_STATE.visibleCount = MENU_STATE.batchSize;
      renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
    });
  }

  if (tagFiltersWrap) {
    tagFiltersWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tag]");
      if (!btn) return;

      const selected = btn.dataset.tag || "all";

      MENU_STATE.selectedTag =
        MENU_STATE.selectedTag === selected && selected !== "all"
          ? "all"
          : selected;

      MENU_STATE.visibleCount = MENU_STATE.batchSize;
      renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      if (shouldUsePreviewMode()) return;
      MENU_STATE.visibleCount += MENU_STATE.batchSize;
      renderMenu(MENU_STATE.activeCategory, { append: true });
    });
  }

  if (openCartBtn) openCartBtn.addEventListener("click", openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCartDrawer);
  if (floatingCartBtn)
    floatingCartBtn.addEventListener("click", openCartDrawer);

  ensurePaymentGatewayOption();
  syncPaymentMethodAvailability();

  $$('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", updatePaymentUI);
  });

  refreshPaymentGatewayReadiness().then(() => {
    updatePaymentUI();
  });

  if (payWithGpayBtn) {
    payWithGpayBtn.addEventListener("click", openGooglePay);
  }

  if (upiFallbackLink) {
    upiFallbackLink.addEventListener("click", (event) => {
      if (isLikelyMobileUpiDevice()) return;

      event.preventDefault();
      showManualUpiFallback(
        "Manual UPI links need a supported mobile UPI app. Use the details below."
      );
    });
  }

  [
    "#orderName",
    "#orderPhone",
    "#orderAddress",
    "#orderNote",
    "#orderPaymentConfirmed",
  ].forEach((selector) => {
    const el = $(selector);
    if (!el) return;

    const eventName =
      el.tagName === "INPUT" && el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, updateOrderPreview);
  });

  grid.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;

    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.orderingDisabled) {
      HotelOrderingUnavailableModal.open();
      return;
    }

    if (btn.dataset.add) {
      queueMenuGridFocusRestore(btn.dataset.add, ["plus", "remove", "add"]);
      addToCartWithLocation(btn.dataset.add);
      return;
    }

    if (btn.dataset.plus) {
      queueMenuGridFocusRestore(btn.dataset.plus, ["plus", "minus", "remove", "add"]);
      updateCartQty(btn.dataset.plus, 1);
      return;
    }

    if (btn.dataset.minus) {
      queueMenuGridFocusRestore(btn.dataset.minus, ["minus", "plus", "add"]);
      updateCartQty(btn.dataset.minus, -1);
      return;
    }

    if (btn.dataset.remove) {
      queueMenuGridFocusRestore(btn.dataset.remove, ["add"]);
      removeFromCart(btn.dataset.remove);
    }
  });

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (!isCustomerOrderingEnabled()) {
    HotelOrderingUnavailableModal.open();
    return;
  }

  const normalizedCart = normalizeCartItems(CART);
  const hotelName = getActiveHotelName();
  const payableAmounts = calculatePayableAmounts(normalizedCart);

  if (!normalizedCart.length) {
    showToast("Your cart is empty.");
    return;
  }

  const orderContext = getActiveOrderContext();
  const customerName = document.getElementById("orderName")?.value.trim();
  const customerPhone = document.getElementById("orderPhone")?.value.trim();
  const rawCustomerAddress = document.getElementById("orderAddress")?.value.trim() || "";
  const customerAddress = getEffectiveCustomerAddress(
    rawCustomerAddress,
    orderContext,
  );
  const note = document.getElementById("orderNote")?.value.trim() || "";

  const paymentMethod = getSelectedPaymentMethod();

  const paymentConfirmed = !!document.getElementById("orderPaymentConfirmed")?.checked;

  if (!paymentMethod) {
    showToast("No payment method is currently available for this hotel. Please contact the hotel.");
    return;
  }

  if (paymentMethod === "ONLINE_GATEWAY" && !isPaymentGatewayCheckoutReady(paymentMethod)) {
    showToast("Secure online payment is not live yet. Please use COD or Google Pay / UPI.");
    return;
  }

  if (!customerName || !customerPhone || !customerAddress) {
    showToast(
      hasDineInOrderContext(orderContext)
        ? "Please enter your name and phone number."
        : "Please fill all required order details."
    );
    return;
  }

  if (customerName.length < 2) {
    showToast("Please enter a valid name.");
    return;
  }

  if (customerPhone.length < 8) {
    showToast("Please enter a valid phone number.");
    return;
  }

  if (!hasDineInOrderContext(orderContext) && customerAddress.length < 3) {
    showToast("Please enter a Proper delivery address.");
    return;
  }

  if (paymentMethod === "UPI" && !paymentConfirmed) {
    showToast("Please confirm your Google Pay / UPI payment.");
    return;
  }

  const locationLink = USER_LOCATION || "Permission denied";

  // Build the clean summary text
  const summaryText = buildOrderSummaryText({
    customerName,
    customerPhone,
    customerAddress,
    customerTableNote: rawCustomerAddress,
    locationLink,
    paymentMethod,
    note,
    paymentConfirmed,
    items: normalizedCart,
    orderContext,
  });

  // Show in preview
  if (orderPreview) orderPreview.textContent = summaryText;

  const isAddonOrder = hasActiveOrderAddonContext(orderContext);
  const isSecureQrOrder = orderContext.secureQr === true && !!orderContext.opaqueQrToken;

  if ((isAddonOrder || isSecureQrOrder) && paymentMethod === "ONLINE_GATEWAY") {
    showToast("Secure online payment is not available for this table item request yet. Please use COD or Google Pay / UPI.");
    return;
  }

  if (paymentMethod === "ONLINE_GATEWAY") {
    try {
      await handlePaymentGatewayCheckout({
        normalizedCart,
        paymentMethod,
        customerName,
        customerPhone,
        customerAddress,
        customerTableNote: rawCustomerAddress,
        locationLink,
        note,
        summaryText,
        orderContext
      });
    } catch (error) {
      if (isOrderingDisabledApiError(error)) {
        updateHotelOrderingState(error.response?.ordering || null);
        updateCartUI();
        renderMenu(MENU_STATE.activeCategory);
        HotelOrderingUnavailableModal.open(error.response?.ordering || null);
        return;
      }
      console.error("Secure payment checkout failed:", error);
      showToast(error.message || "Secure payment failed. Please use COD or Google Pay / UPI.");
    }
    return;
  }

  const orderItemsPayload = normalizedCart.map(item => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    price: item.price
  }));
  const paymentMethodLabel = paymentMethod === "UPI" ? "Google Pay / UPI" : "COD";
  const orderContextPayload = hasDineInOrderContext(orderContext)
    ? {
        orderType: orderContext.orderType,
        tableNumber: orderContext.tableNumber,
        orderSource: orderContext.orderSource,
        qrContextToken: orderContext.qrContextToken || ""
      }
    : undefined;
  const endpoint = isSecureQrOrder
    ? `/api/public/qr/${encodeURIComponent(orderContext.opaqueQrToken)}/orders`
    : isAddonOrder
      ? `/api/order-tracking/${encodeURIComponent(getActiveHotelSlug())}/${encodeURIComponent(orderContext.addToOrderId)}/add-items`
      : "/api/orders";
  const payload = isSecureQrOrder
    ? {
        clientRequestId: getSecureQrClientRequestId(orderItemsPayload),
        expectedSessionVersion: orderContext.qrSessionVersion,
        customerName,
        customerPhone,
        note,
        paymentMethod: paymentMethodLabel,
        paymentConfirmed,
        items: orderItemsPayload.map((item) => ({ menuItemId: item.id, quantity: item.qty }))
      }
    : isAddonOrder
    ? {
        token: orderContext.addToken,
        note,
        paymentMethod: paymentMethodLabel,
        paymentConfirmed,
        items: orderItemsPayload.map((item) => ({
          id: item.id,
          qty: item.qty
        }))
      }
    : {
        hotelName,
        hotelSlug: getActiveHotelSlug(),
        customerName,
        customerPhone,
        customerAddress,
        locationLink,
        note,
        paymentMethod: paymentMethodLabel,
        paymentConfirmed,
        totals: payableAmounts,
        whatsappMessage: summaryText,
        orderContext: orderContextPayload,
        items: orderItemsPayload
      };

  let waLink;
  let tracking = null;
  let usedDirectWhatsAppFallback = false;

  let secureQrSubmissionReference = "";
  try {
    const result = await postJSON(
      endpoint,
      payload,
      isSecureQrOrder
        ? { credentials: "include", headers: { "X-QR-CSRF-Token": orderContext.qrCsrfToken } }
        : undefined
    );
    if (isSecureQrOrder) clearSecureQrClientRequestId();
    const approvedSummaryText =
      result?.preview || result?.order?.whatsapp_message || summaryText;
    const activeHotelWhatsappLink = cleanPhone(CONFIG.OWNER_WHATSAPP_NUMBER)
      ? ownerWhatsAppLink(approvedSummaryText)
      : "";
    waLink = result.ownerWhatsappLink || activeHotelWhatsappLink || ownerWhatsAppLink(approvedSummaryText);
    tracking = result?.trackingReady ? result.tracking : null;
    if (isSecureQrOrder) {
      secureQrSubmissionReference = String(result?.order?.publicReference || "").trim();
    }
  } catch (error) {
    if (isOrderingDisabledApiError(error)) {
      updateHotelOrderingState(error.response?.ordering || null);
      updateCartUI();
      renderMenu(MENU_STATE.activeCategory);
      HotelOrderingUnavailableModal.open(error.response?.ordering || null);
      return;
    }
    if (error?.status >= 400 && error.status < 500) {
      showToast(error.message || "Order details are invalid. Please refresh and try again.");
      return;
    }
    if (!ALLOW_ORDER_WHATSAPP_FALLBACK_ON_SAVE_FAILURE) {
      console.warn(
        "Backend save failed and direct WhatsApp fallback is disabled by runtime policy",
        error
      );
      showToast(
        "Backend save failed, so this order was not sent to WhatsApp. Please wait a moment and try again."
      );
      return;
    }
    console.warn("Backend save failed, using direct WhatsApp fallback", error);
    usedDirectWhatsAppFallback = true;
    waLink = ownerWhatsAppLink(summaryText);
  }

  // Clear cart
  CART = [];
  saveCart();
  updateCartUI();
  renderMenu(MENU_STATE.activeCategory);

  // Reset form
  e.target.reset();
  clearCheckoutAddressState(e.target);
  const codInput = document.querySelector('input[name="paymentMethod"][value="COD"]');
  if (codInput) codInput.checked = true;

  closeCartDrawer();
  updatePaymentUI();

  // Finally open WhatsApp with the summary
  openWhatsAppSafely(waLink);

  if (isSecureQrOrder) {
    showSecureQrOrderStatusPrompt(secureQrSubmissionReference);
  } else {
    showOrderTrackingPrompt(tracking);
  }
  showToast(
    usedDirectWhatsAppFallback
      ? "Backend save failed. Order opened in WhatsApp only, so tracking is not available for this order."
      : tracking
      ? "Order saved. Tracking link is ready."
      : isSecureQrOrder
      ? "Table order received. Live status is ready."
      : "Order sent to WhatsApp successfully!"
  );
}

function bindCheckoutForm() {
  const checkoutForm = document.getElementById("checkoutForm");
  if (!checkoutForm || checkoutForm.dataset.boundSubmit === "true") return;

  checkoutForm.addEventListener("submit", handleCheckoutSubmit);
  checkoutForm.dataset.boundSubmit = "true";
}

  loadCart();
  updateCartUI();
  bindCartDelegation();
  WhatsAppFallback.bind();
  HotelOrderingUnavailableModal.bind();
  syncOrderContextUI();
  renderMenu(MENU_STATE.activeCategory, { resetVisible: true });
  updatePaymentUI();
  updateOrderPreview();
  bindCheckoutForm();
  renderRecentOrderTrackingShortcut();
}


/* ════════════════════════════════════════════════════════
   7. TESTIMONIALS SLIDER
   ════════════════════════════════════════════════════════ */
(function initTestimonials() {
  const track = $("#testimonialsTrack");
  const dotsWrap = $("#testiDots");
  const prevBtn = $("#testPrev");
  const nextBtn = $("#testNext");
  if (!track || typeof TESTIMONIALS_DATA === "undefined") return;

  let current = 0;
  let autoTimer = null;

  TESTIMONIALS_DATA.forEach((t, i) => {
    const stars = "★".repeat(t.stars) + "☆".repeat(5 - t.stars);
    const card = document.createElement("div");
    card.className = "testi-card";
    card.setAttribute("role", "tabpanel");
    card.setAttribute("aria-label", `Testimonial ${i + 1}`);
    card.innerHTML = `
      <div class="testi-quote" aria-hidden="true">"</div>
      <p class="testi-text">${escapeHTML(t.text)}</p>
      <div class="testi-author">
        <div class="testi-avatar">
          <img class="review-card__avatar" data-review-avatar src="${escapeAttr(getReviewAvatarSource(t.avatar))}" alt="" width="96" height="96" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        </div>
        <div class="testi-stars" aria-label="${t.stars} out of 5 stars">${stars}</div>
        <strong class="testi-name">${escapeHTML(t.name)}</strong>
        <span class="testi-role">${escapeHTML(t.role)}</span>
      </div>
    `;
    track.appendChild(card);
    window.ReviewAvatar?.bindReviewAvatars(card);
  });

  TESTIMONIALS_DATA.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.className = "testi-dot" + (i === 0 ? " active" : "");
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
    btn.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(btn);
  });

  function goTo(idx) {
    current = (idx + TESTIMONIALS_DATA.length) % TESTIMONIALS_DATA.length;
    track.style.transform = `translateX(-${current * 100}%)`;

    $$(".testi-dot", dotsWrap).forEach((d, i) =>
      d.classList.toggle("active", i === current),
    );
  }

  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      goTo(current - 1);
      resetAuto();
    });
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      goTo(current + 1);
      resetAuto();
    });

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  let touchStartX = 0;
  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true },
  );
  track.addEventListener("touchend", (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? current + 1 : current - 1);
      resetAuto();
    }
  });

  startAuto();
})();

/* ════════════════════════════════════════════════════════
   8. GALLERY LIGHTBOX
   ════════════════════════════════════════════════════════ */
const GalleryLightbox = (() => {
  let current = 0;
  let isBound = false;

  function getItems() {
    const gallerySection = $("#gallery");
    return gallerySection ? $$(".gallery-item", gallerySection) : [];
  }

  function getImages() {
    return getItems().map((item) => {
      const img = item.querySelector("img");
      return {
        src: img ? img.src.replace(/w=\d+/, "w=1200") : "",
        alt: img ? img.alt : "",
      };
    });
  }

  function openLightbox(idx) {
    const lightbox = $("#lightbox");
    const lbImg = $("#lightboxImg");
    const closeBtn = $("#lightboxClose");
    const images = getImages();

    if (!lightbox || !lbImg || !images.length || !images[idx]) return;

    current = idx;
    lbImg.src = images[current].src;
    lbImg.alt = images[current].alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";

    if (closeBtn) {
      closeBtn.focus();
    }
  }

  function closeLightbox() {
    const lightbox = $("#lightbox");
    const items = getItems();

    if (!lightbox) return;

    lightbox.hidden = true;
    document.body.style.overflow = "";

    if (items[current]) {
      items[current].focus();
    }
  }

  function navigate(dir) {
    const lbImg = $("#lightboxImg");
    const images = getImages();

    if (!lbImg || !images.length) return;

    current = (current + dir + images.length) % images.length;
    lbImg.style.opacity = "0";
    setTimeout(() => {
      lbImg.src = images[current].src;
      lbImg.alt = images[current].alt;
      lbImg.style.opacity = "1";
    }, 200);
  }

  function bindItems() {
    getItems().forEach((item, i) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `View image ${i + 1}`);

      item.onclick = () => openLightbox(i);
      item.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(i);
        }
      };
    });
  }

  function bindControls() {
    const lightbox = $("#lightbox");
    const lbImg = $("#lightboxImg");
    const closeBtn = $("#lightboxClose");
    const prevBtn = $("#lightboxPrev");
    const nextBtn = $("#lightboxNext");

    if (!lightbox || isBound) return;

    if (lbImg) {
      lbImg.style.transition = "opacity 0.2s ease";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (prevBtn) prevBtn.addEventListener("click", () => navigate(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => navigate(1));

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    });

    isBound = true;
  }

  return {
    init() {
      if (!$("#lightbox")) return;
      bindItems();
      bindControls();
    },
  };
})();

/* ════════════════════════════════════════════════════════
   9. GOOGLE SHEET HELPER
   ════════════════════════════════════════════════════════ */
function getConfiguredContactSheetUrl() {
  return getRuntimeTextConfig("CONTACT_SHEET_URL", "");
}

async function sendToSheet(data) {
  const contactSheetUrl = getConfiguredContactSheetUrl();

  if (!contactSheetUrl) {
    return {
      ok: false,
      status: "disabled",
      response: null
    };
  }

  try {
    const res = await fetch(contactSheetUrl, {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      return {
        ok: false,
        status: "failed",
        response: null
      };
    }

    return {
      ok: true,
      status: "saved",
      response: await res.json().catch(() => ({}))
    };
  } catch (err) {
    console.warn("Optional contact Google Sheet mirror failed:", err);
    return {
      ok: false,
      status: "failed",
      response: null
    };
  }
}

/* ════════════════════════════════════════════════════════
   10. CONTACT FORM
   ════════════════════════════════════════════════════════ */
(function initContactForm() {
  const form = $("#contactForm");
  const success = $("#ctSuccess");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = {
      formType: "Contact",
      name: $("#ctName", form)?.value.trim(),
      email: $("#ctEmail", form)?.value.trim(),
      subject: $("#ctSubject", form)?.value.trim(),
      message: $("#ctMessage", form)?.value.trim(),
    };

    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
    }

    const hotelName = getActiveHotelName();
    const hotelSlug = getActiveHotelSlug();
    let dbSaveSucceeded = false;
    let sheetResult = {
      ok: false,
      status: "disabled",
      response: null
    };

    if (hotelName && hotelSlug) {
      try {
        await saveContactSubmission({
          hotelName,
          hotelSlug,
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message
        });
        dbSaveSucceeded = true;
      } catch (error) {
        console.warn("Primary contact DB save failed:", error);
      }
    } else {
      console.warn("Contact DB save skipped: hotel context unavailable.");
    }

    sheetResult = await sendToSheet(data);
    const sheetSaveSucceeded = !!sheetResult.ok;

    if (!sheetSaveSucceeded && !dbSaveSucceeded) {
      if (submitButton) {
        submitButton.disabled = false;
      }
      showToast("Failed to send contact message. Please try again.");
      return;
    }

    if (dbSaveSucceeded && sheetResult.status === "failed") {
      console.warn("Contact saved in DB, but optional Google Sheet mirror failed.");
    }

    form.style.display = "none";
    success.hidden = false;

    setTimeout(() => {
      success.hidden = true;
      form.style.display = "block";
      form.reset();
      if (submitButton) {
        submitButton.disabled = false;
      }
    }, 5000);
  });
})();

/* ════════════════════════════════════════════════════════
   13. SMOOTH SCROLL FOR ANCHOR LINKS
   ════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();

      const navH =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--nav-h",
          ),
        ) || 80;
      const top = target.getBoundingClientRect().top + window.scrollY - navH;

      window.scrollTo({ top, behavior: "smooth" });

      const waPopup = $("#waPopup");
      if (waPopup) waPopup.style.display = "none";
    });
  });
})();

/* ════════════════════════════════════════════════════════
   14. ACTIVE NAV LINK ON SCROLL
   ════════════════════════════════════════════════════════ */
(function initActiveNav() {
  const sections = $$("section[id]");
  const links = $$('.nav-link[href^="#"]');
  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((link) => {
            link.classList.toggle(
              "active-link",
              link.getAttribute("href") === "#" + id,
            );
          });
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
  );

  sections.forEach((s) => observer.observe(s));
})();

/* ════════════════════════════════════════════════════════
   15. FOOTER YEAR
   ════════════════════════════════════════════════════════ */
(function initFooterYear() {
  const el = $("#footerYear");
  if (el) el.textContent = new Date().getFullYear();
})();

/* ════════════════════════════════════════════════════════
   16. PARALLAX ON ABOUT IMAGES
   ════════════════════════════════════════════════════════ */
(function initParallax() {
  const main = $(".about-img-main");
  const sub = $(".about-img-sub");
  if (!main || !sub || window.innerWidth < 768 || prefersReducedMotion()) return;

  const updateParallax = createRafThrottled(() => {
    const aboutSection = $("#about");
    if (!aboutSection) return;
    const rect = aboutSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    if (rect.top >= windowHeight || rect.bottom <= 0) return;

    const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
    const shift = (progress - 0.5) * 40;
    main.style.transform = `translateY(${shift * 0.5}px)`;
    sub.style.transform = `translateY(${-shift * 0.7}px)`;
  });

  window.addEventListener("scroll", updateParallax, { passive: true });
  updateParallax();
})();

/* ════════════════════════════════════════════════════════
   17. CARD TILT EFFECT ON EVENT CARDS
   ════════════════════════════════════════════════════════ */
(function initTilt() {
  if (window.innerWidth < 768) return;

  const cards = $$(".event-card");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `
        perspective(600px)
        rotateY(${x * 6}deg)
        rotateX(${-y * 6}deg)
        translateY(-8px)
        scale(1.02)
      `;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
})();

/* ════════════════════════════════════════════════════════
   18. HERO GRADIENT SHIFTS
   ════════════════════════════════════════════════════════ */
(function initHeroGradient() {
  const hero = $(".hero");
  const overlay = $(".hero-overlay");
  if (!hero || !overlay || prefersReducedMotion()) return;

  let hue = 30;
  let intervalId = 0;
  const stop = () => {
    if (intervalId) window.clearInterval(intervalId);
    intervalId = 0;
  };
  const start = () => {
    if (intervalId || document.hidden) return;
    intervalId = window.setInterval(() => {
      hue += 0.25;
      const red = 15 + Math.sin(hue * 0.1) * 3;
      overlay.style.background = `linear-gradient(${135 + Math.sin(hue * 0.05) * 10}deg,
        rgba(${red},12,8,0.85) 0%,
        rgba(${red},12,8,0.55) 60%,
        rgba(${red},12,8,0.75) 100%)`;
    }, 250);
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) start();
    else stop();
  });
  observer.observe(hero);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (hero.getBoundingClientRect().bottom > 0) start();
  });
})();

/* ════════════════════════════════════════════════════════
   19. COUNTER ANIMATION FOR STATS
   ════════════════════════════════════════════════════════ */
(function initCounters() {
  const stats = $$(".stat-num");
  if (!stats.length) return;

  const targets = [1999, 4, 50];
  const suffixes = ["", ".5", "k+"];
  let animated = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting || animated) return;
      animated = true;

      stats.forEach((el, i) => {
        const target = targets[i];
        let current = 0;
        const step = target / 40;

        const timer = setInterval(() => {
          current = Math.min(current + step, target);

          if (i === 1) {
            el.textContent =
              current >= 4 ? "4.5" : Math.floor(current).toString();
          } else {
            el.textContent = Math.floor(current) + (suffixes[i] || "");
          }

          if (current >= target) clearInterval(timer);
        }, 35);
      });
    },
    { threshold: 0.6 },
  );

  const heroStats = $(".hero-stats");
  if (heroStats) observer.observe(heroStats);
})();

/* ════════════════════════════════════════════════════════
   20. ACTIVE LINK STYLE
   ════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════
   21. WHATSAPP QUICK POPUP
   ════════════════════════════════════════════════════════ */
(function initWhatsAppPopup() {
  const waBtn = $("#whatsappBtn");
  const waPopup = $("#waPopup");

  if (!waBtn || !waPopup) return;

  waBtn.addEventListener("click", () => {
    const isOpen = waPopup.style.display !== "block";
    waPopup.style.display = isOpen ? "block" : "none";
    waBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!waPopup.contains(e.target) && !waBtn.contains(e.target)) {
      waPopup.style.display = "none";
      waBtn.setAttribute("aria-expanded", "false");
    }
  });

  $$(".wa-action-link", waPopup).forEach((link) => {
    link.addEventListener("click", () => {
      waPopup.style.display = "none";
    });
  });
})();


function setHTML(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = value || "";
}

function setLink(id, href, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.href = href || "#";
  el.textContent = text || "";
}

function renderEventsSection() {
  const hotel = window.APP_STATE?.hotel;
  const events = hotel?.events;
  if (!events) return;

  setText("eventsEyebrow", events.eyebrow);
  setText("eventsTitle", events.title);
  setText("eventsSubtitle", events.subtitle);

  const wrap = document.getElementById("eventsCards");
  if (!wrap) return;

  wrap.innerHTML = (events.cards || [])
    .map(
      (card) => `
        <article class="event-card reveal-card">
          <i class="${escapeAttr(card.icon || "fas fa-star")}" aria-hidden="true"></i>
          <h3>${escapeHTML(card.title || "")}</h3>
          <p>${escapeHTML(card.text || "")}</p>
        </article>
      `
    )
    .join("");
}

function renderReservationSection() {
  const reservation = window.APP_STATE?.hotel?.reservation;
  if (!reservation) return;

  setText("reservationEyebrow", reservation.eyebrow);
  setText("reservationTitle", reservation.title);
  setText("reservationSubtitle", reservation.subtitle);
}

function renderContactSection() {
  const hotel = window.APP_STATE?.hotel;
  const contact = hotel?.contact;
  const section = hotel?.contactSection;
  const location = hotel?.location;

  if (section) {
    setText("contactEyebrow", section.eyebrow);
    setText("contactTitle", section.title);
    setText("contactSubtitle", section.subtitle);
  }

  if (contact?.phone) {
    setLink("contactPhone", `tel:${contact.phone.replace(/\s+/g, "")}`, contact.phone);
    setLink("footerPhone", `tel:${contact.phone.replace(/\s+/g, "")}`, contact.phone);
  }

  if (contact?.email) {
    setLink("contactEmail", `mailto:${contact.email}`, contact.email);
    setLink("footerEmail", `mailto:${contact.email}`, contact.email);
  }

  setText("contactAddress", contact?.address || "");
  setText("footerAddress", contact?.address || "");

  const mapFrame = document.getElementById("contactMapEmbed");
  if (mapFrame && location?.mapEmbedUrl) {
    mapFrame.src = location.mapEmbedUrl;
  }

  const mapLink = document.getElementById("contactMapLink");
  if (mapLink && location?.mapLink) {
    mapLink.href = location.mapLink;
  }
}

function renderFooterSection() {
  const hotel = window.APP_STATE?.hotel;
  if (!hotel) return;

  setText("footerBrandName", hotel.hotelName || "");
  setText("footerCopyrightName", hotel.hotelName || "Hotel");
  setText("footerDescription", hotel.footer?.description || "");
  renderFooterOpeningHours(hotel.footer?.openingHours);
}

function normalizeFooterOpeningHourRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const label = String(row.label || row.day || row.name || "").trim();
  const value = String(row.value || row.hours || row.time || "").trim();

  if (!label || !value) {
    return null;
  }

  return { label, value };
}

function renderFooterOpeningHours(openingHours) {
  const list = document.getElementById("footerHoursList");
  if (!list) return;

  if (!list.dataset.fallbackHtml) {
    list.dataset.fallbackHtml = list.innerHTML;
  }

  const rows = Array.isArray(openingHours)
    ? openingHours.map((row) => normalizeFooterOpeningHourRow(row)).filter(Boolean)
    : [];

  if (!rows.length) {
    list.innerHTML = list.dataset.fallbackHtml;
    return;
  }

  list.innerHTML = rows
    .map(
      (row) => `
        <li>
          <span>${escapeHTML(row.label)}</span>
          <span>${escapeHTML(row.value)}</span>
        </li>
      `
    )
    .join("");
}

function getEventInquiryPayload(values = {}) {
  return {
    hotelName: CONFIG.HOTEL_NAME,
    hotelSlug: getActiveHotelSlug(),           // ← Added
    name: values.name,
    phone: values.phone,
    eventType: values.eventType,
    date: values.date,
    guests: values.guests,
    specialRequirements: values.specialRequirements || ""
  };
}

function getReservationPayload(values = {}) {
  return {
    hotelName: CONFIG.HOTEL_NAME,
    hotelSlug: getActiveHotelSlug(),           // ← Added
    name: values.name,
    phone: values.phone,
    date: values.date,
    time: values.time,
    guests: values.guests,
    note: values.note || ""
  };
}


async function saveInquiry(payload) {
  return postJSON("/api/inquiries", payload);
}

async function saveReservation(payload) {
  return postJSON("/api/reservations", payload);
}

async function saveContactSubmission(payload) {
  return postJSON("/api/contact-submissions", payload);
}

async function saveTestimonialReview(payload) {
  return postJSON("/api/testimonials", payload);
}

function getUserLiveLocation() {
  if (!navigator.geolocation) {
    USER_LOCATION = "Not supported";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      USER_LOCATION = `https://maps.google.com/?q=${latitude},${longitude}`;
    },
    () => {
      USER_LOCATION = "Permission denied";
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}

function getActiveHotelSlug() {
  return (
    window.APP_STATE?.activeHotelSlug ||
    window.APP_RUNTIME_CONFIG?.DEFAULT_HOTEL_SLUG ||
    ""
  );
}

function withHotelSlug(path) {
  const slug = getActiveHotelSlug();
  return buildHotelAwareHref(path, slug);
}

function buildHotelAwareHref(rawHref, hotelSlug) {
  const normalizedHref = typeof rawHref === "string" ? rawHref.trim() : "";
  const normalizedSlug = typeof hotelSlug === "string" ? hotelSlug.trim() : "";

  if (!normalizedHref || !normalizedSlug) {
    return normalizedHref;
  }

  try {
    const url = new URL(normalizedHref, window.location.href);
    const pathname = url.pathname.toLowerCase();
    let basePath = "";

    if (pathname.endsWith("/menu.html") || pathname.endsWith("menu.html")) {
      basePath = "menu.html";
    } else if (pathname.endsWith("/index.html") || pathname.endsWith("index.html")) {
      basePath = "index.html";
    } else {
      return normalizedHref;
    }

    url.searchParams.set("hotel", normalizedSlug);

    const orderContextParams = getCurrentOrderContextLinkParams();
    if (
      orderContextParams.tableNumber &&
      !url.searchParams.has("table") &&
      !url.searchParams.has("tableNumber")
    ) {
      url.searchParams.set("table", orderContextParams.tableNumber);
    }

    if (orderContextParams.tableNumber && orderContextParams.orderSource && !url.searchParams.has("source")) {
      url.searchParams.set("source", orderContextParams.orderSource);
    }

    if (orderContextParams.qrContextToken && !url.searchParams.has("qctx")) {
      url.searchParams.set("qctx", orderContextParams.qrContextToken);
    }

    const search = url.searchParams.toString();

    return `${basePath}${search ? `?${search}` : ""}${url.hash || ""}`;
  } catch (error) {
    return normalizedHref;
  }
}

function getCurrentOrderContextLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const activeOrderContext = getActiveOrderContext();
  const tableNumber =
    params.get("table") ||
    params.get("tableNumber") ||
    activeOrderContext.tableNumber ||
    "";
  const orderSource =
    params.get("source") ||
    activeOrderContext.orderSource ||
    (tableNumber ? "qr" : "");
  const qrContextToken =
    params.get("qctx") ||
    params.get("qrContextToken") ||
    activeOrderContext.qrContextToken ||
    "";

  return {
    tableNumber: normalizeOrderContextText(tableNumber, 80),
    orderSource: normalizeOrderContextText(orderSource, 40),
    qrContextToken: normalizeOrderContextText(qrContextToken, 2000)
  };
}

function updateHotelAwareLinks(hotelSlug = getActiveHotelSlug()) {
  const normalizedSlug = typeof hotelSlug === "string" ? hotelSlug.trim() : "";
  if (!normalizedSlug) return;

  document
    .querySelectorAll('a[href^="menu.html"], a[href^="index.html"]')
    .forEach((link) => {
      const rawHref = link.getAttribute("href");
      if (!rawHref) return;

      const nextHref = buildHotelAwareHref(rawHref, normalizedSlug);
      if (nextHref) {
        link.setAttribute("href", nextHref);
      }
    });
}

function markAppReady() {
  document.body.classList.remove("app-booting");
  document.body.classList.add("app-ready");
  document.dispatchEvent(new Event("app:ready"));
}

function isLocalAppRuntime(hostname = window.location.hostname) {
  return (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

function buildLocalBootFailureBannerMessage(error) {
  const message = String(error?.message || "").trim();

  if (error?.code === "STALE_LOCAL_HOTEL_SLUG") {
    return {
      title: "Local hotel slug was stale.",
      detail: message,
      hint: "Reload this page with ?hotel=your-real-hotel-slug after your backend is running."
    };
  }

  if (message.includes("Hotel slug is required")) {
    return {
      title: "Local hotel slug is missing.",
      detail: message,
      hint: "Open the page with ?hotel=your-real-hotel-slug, for example index.html?hotel=demo-hotel."
    };
  }

  if (Number(error?.status || 0) === 404) {
    return {
      title: "Local hotel data was not found.",
      detail: message || "The backend returned 404 for this hotel on localhost.",
      hint: "Check that your backend has an active hotel/profile/menu for the slug you are using, or reload with ?hotel=your-real-hotel-slug."
    };
  }

  return {
    title: "Local app boot failed.",
    detail: message || "The page could not load hotel data from your local backend.",
    hint: "Check your localhost backend and reload with ?hotel=your-real-hotel-slug if needed."
  };
}

function renderLocalBootFailureBanner(error) {
  if (!isLocalAppRuntime()) {
    return;
  }

  const bannerHost = document.getElementById("pageShell") || document.body;

  if (!bannerHost) {
    return;
  }

  const existingBanner = document.getElementById("localBootFailureBanner");
  if (existingBanner) {
    existingBanner.remove();
  }

  const message = buildLocalBootFailureBannerMessage(error);
  const banner = document.createElement("section");

  banner.id = "localBootFailureBanner";
  banner.setAttribute("role", "alert");
  banner.style.cssText = [
    "margin: 24px auto 0",
    "max-width: 960px",
    "padding: 16px 18px",
    "border: 1px solid rgba(232, 184, 103, 0.35)",
    "border-radius: 8px",
    "background: rgba(232, 184, 103, 0.14)",
    "color: #ffe2a8",
    "font-family: var(--font-body, sans-serif)",
    "line-height: 1.5"
  ].join(";");
  banner.innerHTML = `
    <strong style="display:block; margin-bottom: 6px;">${escapeHTML(message.title)}</strong>
    <div>${escapeHTML(message.detail)}</div>
    <div style="margin-top: 8px;">${escapeHTML(message.hint)}</div>
  `;

  bannerHost.prepend(banner);
}

function getPublicRoomsApiBase() {
  return `${String(CONFIG.API_BASE_URL || "").replace(/\/+$/, "")}/api/public/rooms`;
}

function getPublicRoomsHotelSlug() {
  return (
    window.APP_STATE?.activeHotelSlug ||
    (typeof getHotelSlugFromQuery === "function" ? getHotelSlugFromQuery() : "") ||
    ""
  ).trim();
}

function setPublicRoomsSectionVisible(isVisible) {
  const section = document.getElementById("rooms");
  const navItems = document.querySelectorAll("[data-room-booking-nav]");

  if (section) {
    section.hidden = !isVisible;
  }

  navItems.forEach((item) => {
    item.hidden = !isVisible;
  });
}

function setPublicRoomsStatus(message = "", tone = "muted") {
  const statusEl = document.getElementById("publicRoomsStatus");
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

const ROOM_BOOKING_CONFLICT_CODE = "ROOM_ALREADY_BOOKED";
const ROOM_BOOKING_CONFLICT_MESSAGE =
  "This room is already booked for selected dates. Please choose another room or date.";

function getRoomBookingErrorMessage(error, fallback = "Unable to submit booking request.") {
  return error?.code === ROOM_BOOKING_CONFLICT_CODE
    ? ROOM_BOOKING_CONFLICT_MESSAGE
    : error?.message || fallback;
}

function setPublicBookingStatus(message = "", tone = "muted") {
  const summaryEl = document.getElementById("publicBookingSummary");
  if (!summaryEl || !message) return;

  const existingStatus = summaryEl.querySelector("[data-public-booking-status]");
  if (existingStatus) {
    existingStatus.remove();
  }

  const statusEl = document.createElement("p");
  statusEl.dataset.publicBookingStatus = "true";
  statusEl.dataset.tone = tone;
  statusEl.className = "room-booking-status";
  statusEl.textContent = message;
  summaryEl.append(statusEl);
}

function toPublicDateInputValue(date) {
  const value = parsePublicDateValue(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parsePublicDateValue(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const textValue = String(value || "").trim();
  const match = textValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return new Date(value);
}

function addPublicDateDays(value, days) {
  const date = parsePublicDateValue(value);
  date.setDate(date.getDate() + days);
  return date;
}

function normalizePublicRoomArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

const PUBLIC_ROOM_GALLERY_STATE = {
  room: null,
  images: [],
  index: 0,
  trigger: null,
  touchStartX: null,
  touchStartY: null,
  scrollSnapshot: null,
  returnFocusOnClose: true,
  preloadedUrls: new Set()
};

function normalizePublicRoomImageUrl(value = "") {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.startsWith("//")) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate) && !/^https?:\/\//i.test(candidate)) return "";
  const normalized = normalizeImagePath(candidate);
  try {
    const parsed = new URL(normalized, window.location.href);
    if (parsed.pathname.includes("/storage/v1/render/image/public/")) {
      parsed.pathname = parsed.pathname.replace("/storage/v1/render/image/public/", "/storage/v1/object/public/");
      parsed.search = "";
      return parsed.href;
    }
  } catch (_error) {
    return "";
  }
  return normalized;
}

function getPublicRoomGalleryImages(room = {}) {
  const managed = normalizePublicRoomArray(room.galleryImages);
  const source = managed.length ? managed : normalizePublicRoomArray(room.images);
  const roomTitle = room.title || room.roomType?.name || room.roomNumber || "Room";
  return source.map((value, index) => {
    const image = value && typeof value === "object" ? value : {};
    const originalUrl = normalizePublicRoomImageUrl(
      typeof value === "string"
        ? value
        : image.originalUrl || image.url || image.src || image.path || ""
    );
    if (!originalUrl) return null;
    return {
      id: image.id || `legacy-${index + 1}`,
      originalUrl,
      optimizedUrl: normalizePublicRoomImageUrl(image.optimizedUrl) || originalUrl,
      cardUrl:
        normalizePublicRoomImageUrl(image.cardUrl || image.optimizedUrl) || originalUrl,
      thumbnailUrl:
        normalizePublicRoomImageUrl(
          image.thumbnailUrl || image.cardUrl || image.optimizedUrl
        ) || originalUrl,
      hasOptimizedThumbnail: Boolean(
        normalizePublicRoomImageUrl(
          image.thumbnailUrl || image.cardUrl || image.optimizedUrl
        ) &&
        normalizePublicRoomImageUrl(
          image.thumbnailUrl || image.cardUrl || image.optimizedUrl
        ) !== originalUrl
      ),
      altText: String(image.altText || image.alt || `${roomTitle} photo ${index + 1}`),
      caption: String(image.caption || "")
    };
  }).filter(Boolean);
}

function getPublicRoomImage(room = {}) {
  return getPublicRoomGalleryImages(room)[0]?.cardUrl || "";
}

function getPublicRoomGalleryElements() {
  return {
    dialog: document.getElementById("publicRoomGalleryDialog"),
    stage: document.getElementById("publicRoomGalleryStage"),
    image: document.getElementById("publicRoomGalleryImage"),
    loading: document.getElementById("publicRoomGalleryLoading"),
    error: document.getElementById("publicRoomGalleryError"),
    title: document.getElementById("publicRoomGalleryTitle"),
    caption: document.getElementById("publicRoomGalleryCaption"),
    counter: document.getElementById("publicRoomGalleryCounter"),
    thumbnails: document.getElementById("publicRoomGalleryThumbnails"),
    previous: document.getElementById("publicRoomGalleryPrevious"),
    next: document.getElementById("publicRoomGalleryNext")
  };
}

function lockPublicRoomGalleryScroll() {
  if (PUBLIC_ROOM_GALLERY_STATE.scrollSnapshot) return;
  const body = document.body;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  const computedPaddingRight = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;

  PUBLIC_ROOM_GALLERY_STATE.scrollSnapshot = {
    scrollX,
    scrollY,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight
  };

  body.classList.add("room-gallery-is-open");
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = `-${scrollX}px`;
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  if (scrollbarGap) {
    body.style.paddingRight = `${computedPaddingRight + scrollbarGap}px`;
  }
}

function unlockPublicRoomGalleryScroll() {
  const snapshot = PUBLIC_ROOM_GALLERY_STATE.scrollSnapshot;
  if (!snapshot) return;
  const body = document.body;

  body.classList.remove("room-gallery-is-open");
  body.style.position = snapshot.position;
  body.style.top = snapshot.top;
  body.style.left = snapshot.left;
  body.style.right = snapshot.right;
  body.style.width = snapshot.width;
  body.style.overflow = snapshot.overflow;
  body.style.paddingRight = snapshot.paddingRight;
  PUBLIC_ROOM_GALLERY_STATE.scrollSnapshot = null;
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
}

function setPublicRoomGalleryLoading(isLoading) {
  const { stage, image, loading, error } = getPublicRoomGalleryElements();
  stage?.setAttribute("aria-busy", String(!!isLoading));
  if (loading) loading.hidden = !isLoading;
  if (error && isLoading) error.hidden = true;
  if (image && isLoading) {
    image.classList.remove("is-ready", "is-error");
  }
}

function showPublicRoomGalleryImageError() {
  const { stage, image, loading, error } = getPublicRoomGalleryElements();
  stage?.setAttribute("aria-busy", "false");
  if (loading) loading.hidden = true;
  if (error) error.hidden = false;
  image?.classList.remove("is-ready");
  image?.classList.add("is-error");
}

function handlePublicRoomGalleryImageLoaded() {
  const { stage, image, loading, error } = getPublicRoomGalleryElements();
  stage?.setAttribute("aria-busy", "false");
  if (loading) loading.hidden = true;
  if (error) error.hidden = true;
  image?.classList.remove("is-error");
  image?.classList.add("is-ready");
}

function preloadPublicRoomGalleryAdjacentImages() {
  const images = PUBLIC_ROOM_GALLERY_STATE.images;
  const total = images.length;
  if (total < 2 || navigator.connection?.saveData) return;

  const adjacentIndexes = [
    (PUBLIC_ROOM_GALLERY_STATE.index - 1 + total) % total,
    (PUBLIC_ROOM_GALLERY_STATE.index + 1) % total
  ];

  [...new Set(adjacentIndexes)].forEach((index) => {
    const item = images[index];
    const source = normalizePublicRoomImageUrl(
      item?.optimizedUrl || item?.originalUrl
    );
    if (!source || PUBLIC_ROOM_GALLERY_STATE.preloadedUrls.has(source)) return;
    PUBLIC_ROOM_GALLERY_STATE.preloadedUrls.add(source);
    const preload = new Image();
    preload.decoding = "async";
    preload.src = source;
  });
}

function keepPublicRoomGalleryThumbnailVisible() {
  const { thumbnails, dialog } = getPublicRoomGalleryElements();
  if (!dialog?.open || !thumbnails || thumbnails.hidden) return;
  const active = thumbnails.querySelector('[aria-current="true"]');
  active?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "nearest",
    inline: "center"
  });
}

function renderPublicRoomGalleryThumbnails() {
  const { thumbnails } = getPublicRoomGalleryElements();
  if (!thumbnails) return;
  const images = PUBLIC_ROOM_GALLERY_STATE.images;
  const canUseThumbnailStrip =
    images.length > 1 && images.every((item) => item.hasOptimizedThumbnail);
  const signature = images
    .map((item) => `${item.id}:${item.thumbnailUrl || item.cardUrl || item.originalUrl}`)
    .join("|");

  thumbnails.hidden = !canUseThumbnailStrip;
  if (!canUseThumbnailStrip) {
    thumbnails.innerHTML = "";
    thumbnails.dataset.gallerySignature = "";
    return;
  }

  if (thumbnails.dataset.gallerySignature !== signature) {
    thumbnails.innerHTML = images.map((item, index) => `
      <button
        type="button"
        role="option"
        data-public-room-gallery-index="${index}"
        aria-label="View photo ${index + 1}"
      >
        <img
          src="${escapeAttr(item.thumbnailUrl || item.cardUrl || item.originalUrl)}"
          alt=""
          width="320" height="213"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        >
      </button>
    `).join("");
    thumbnails.dataset.gallerySignature = signature;
  }

  thumbnails.querySelectorAll("[data-public-room-gallery-index]").forEach((button) => {
    const isActive =
      Number(button.dataset.publicRoomGalleryIndex) === PUBLIC_ROOM_GALLERY_STATE.index;
    button.setAttribute("aria-current", isActive ? "true" : "false");
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });
  window.requestAnimationFrame(keepPublicRoomGalleryThumbnailVisible);
}

function changePublicRoomGalleryImage(offset) {
  const total = PUBLIC_ROOM_GALLERY_STATE.images.length;
  if (total < 2) return;
  PUBLIC_ROOM_GALLERY_STATE.index =
    (PUBLIC_ROOM_GALLERY_STATE.index + offset + total) % total;
  renderPublicRoomGallery();
}

function renderPublicRoomGallery() {
  const room = PUBLIC_ROOM_GALLERY_STATE.room || {};
  const images = PUBLIC_ROOM_GALLERY_STATE.images;
  const image = images[PUBLIC_ROOM_GALLERY_STATE.index];
  if (!image) return;
  const {
    title,
    image: mainImage,
    caption,
    counter,
    previous,
    next
  } = getPublicRoomGalleryElements();
  const imageSource = normalizePublicRoomImageUrl(
    image.optimizedUrl || image.originalUrl
  );
  const fallbackSource = normalizePublicRoomImageUrl(image.originalUrl);

  if (title) title.textContent = getPublicRoomTitle(room);
  if (caption) caption.textContent = image.caption || image.altText;
  if (counter) {
    counter.textContent = `${PUBLIC_ROOM_GALLERY_STATE.index + 1} / ${images.length}`;
    counter.setAttribute(
      "aria-label",
      `Photo ${PUBLIC_ROOM_GALLERY_STATE.index + 1} of ${images.length}`
    );
  }
  if (previous) {
    previous.hidden = images.length < 2;
    previous.disabled = images.length < 2;
  }
  if (next) {
    next.hidden = images.length < 2;
    next.disabled = images.length < 2;
  }

  setPublicRoomGalleryLoading(true);
  if (mainImage) {
    mainImage.alt = image.altText;
    mainImage.dataset.fallbackSrc =
      fallbackSource && fallbackSource !== imageSource ? fallbackSource : "";
    mainImage.dataset.expectedSrc = imageSource;
    mainImage.src = imageSource;
    if (mainImage.complete && mainImage.naturalWidth > 0) {
      window.queueMicrotask(handlePublicRoomGalleryImageLoaded);
    }
  }

  renderPublicRoomGalleryThumbnails();
  preloadPublicRoomGalleryAdjacentImages();
}

function getPublicRoomGalleryFocusableElements(dialog) {
  return [...dialog.querySelectorAll(
    'button:not([disabled]):not([hidden]), [href], [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hidden && element.getClientRects().length > 0);
}

function trapPublicRoomGalleryFocus(event, dialog) {
  if (event.key !== "Tab") return;
  const focusable = getPublicRoomGalleryFocusableElements(dialog);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function finishPublicRoomGalleryClose() {
  unlockPublicRoomGalleryScroll();
  if (PUBLIC_ROOM_GALLERY_STATE.returnFocusOnClose) {
    PUBLIC_ROOM_GALLERY_STATE.trigger?.focus?.();
  }
  PUBLIC_ROOM_GALLERY_STATE.trigger = null;
  PUBLIC_ROOM_GALLERY_STATE.returnFocusOnClose = true;
}

function closePublicRoomGallery({ returnFocus = true } = {}) {
  const { dialog } = getPublicRoomGalleryElements();
  PUBLIC_ROOM_GALLERY_STATE.returnFocusOnClose = returnFocus;
  if (document.fullscreenElement === dialog) {
    void document.exitFullscreen?.();
  }
  if (dialog?.open) {
    dialog.close();
  } else {
    finishPublicRoomGalleryClose();
  }
}

function openPublicRoomGallery(room, trigger) {
  const images = getPublicRoomGalleryImages(room);
  const { dialog, thumbnails } = getPublicRoomGalleryElements();
  if (!dialog || !images.length) return;

  PUBLIC_ROOM_GALLERY_STATE.room = room;
  PUBLIC_ROOM_GALLERY_STATE.images = images;
  PUBLIC_ROOM_GALLERY_STATE.index = Math.max(
    0,
    Math.min(
      images.length - 1,
      Number(trigger?.dataset?.roomGalleryIndex || 0)
    )
  );
  PUBLIC_ROOM_GALLERY_STATE.trigger = trigger || document.activeElement || null;
  PUBLIC_ROOM_GALLERY_STATE.returnFocusOnClose = true;
  PUBLIC_ROOM_GALLERY_STATE.preloadedUrls.clear();
  if (thumbnails) thumbnails.dataset.gallerySignature = "";

  lockPublicRoomGalleryScroll();
  renderPublicRoomGallery();
  try {
    dialog.showModal();
    window.requestAnimationFrame(() => {
      document.getElementById("publicRoomGalleryClose")?.focus();
    });
  } catch (error) {
    finishPublicRoomGalleryClose();
    throw error;
  }
}

function bindPublicRoomGallery() {
  const { dialog, image, stage, thumbnails } = getPublicRoomGalleryElements();
  if (!dialog || dialog.dataset.bound === "true") return;
  dialog.dataset.bound = "true";

  document.getElementById("publicRoomGalleryClose")?.addEventListener(
    "click",
    () => closePublicRoomGallery()
  );
  document.getElementById("publicRoomGalleryPrevious")?.addEventListener(
    "click",
    () => changePublicRoomGalleryImage(-1)
  );
  document.getElementById("publicRoomGalleryNext")?.addEventListener(
    "click",
    () => changePublicRoomGalleryImage(1)
  );
  document.getElementById("publicRoomGalleryFullscreen")?.addEventListener(
    "click",
    async () => {
      try {
        if (!document.fullscreenElement) {
          await dialog.requestFullscreen?.();
        } else {
          await document.exitFullscreen?.();
        }
      } catch (_error) {
        // The modal remains a full-viewport gallery if fullscreen is unavailable.
      }
    }
  );
  document.getElementById("publicRoomGalleryBook")?.addEventListener("click", () => {
    const room = PUBLIC_ROOM_GALLERY_STATE.room;
    closePublicRoomGallery({ returnFocus: false });
    if (room) {
      window.requestAnimationFrame(() => openPublicRoomBookingForm(room));
    }
  });

  image?.addEventListener("load", handlePublicRoomGalleryImageLoaded);
  image?.addEventListener("error", (event) => {
    const fallback = normalizePublicRoomImageUrl(
      event.currentTarget.dataset.fallbackSrc || ""
    );
    event.currentTarget.dataset.fallbackSrc = "";
    if (fallback) {
      const resolvedFallback = new URL(fallback, document.baseURI).href;
      if (event.currentTarget.src !== resolvedFallback) {
        event.currentTarget.src = fallback;
        return;
      }
    }
    showPublicRoomGalleryImageError();
  });

  thumbnails?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-public-room-gallery-index]");
    if (!button) return;
    PUBLIC_ROOM_GALLERY_STATE.index = Number(
      button.dataset.publicRoomGalleryIndex || 0
    );
    renderPublicRoomGallery();
  });

  dialog.addEventListener("keydown", (event) => {
    trapPublicRoomGalleryFocus(event, dialog);
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      changePublicRoomGalleryImage(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      changePublicRoomGalleryImage(1);
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePublicRoomGallery();
  });

  stage?.addEventListener(
    "touchstart",
    (event) => {
      PUBLIC_ROOM_GALLERY_STATE.touchStartX = event.changedTouches[0]?.clientX ?? null;
      PUBLIC_ROOM_GALLERY_STATE.touchStartY = event.changedTouches[0]?.clientY ?? null;
    },
    { passive: true }
  );
  stage?.addEventListener(
    "touchend",
    (event) => {
      const startX = PUBLIC_ROOM_GALLERY_STATE.touchStartX;
      const startY = PUBLIC_ROOM_GALLERY_STATE.touchStartY;
      const endX = event.changedTouches[0]?.clientX;
      const endY = event.changedTouches[0]?.clientY;
      PUBLIC_ROOM_GALLERY_STATE.touchStartX = null;
      PUBLIC_ROOM_GALLERY_STATE.touchStartY = null;
      if (
        Number.isFinite(startX) &&
        Number.isFinite(startY) &&
        Number.isFinite(endX) &&
        Number.isFinite(endY)
      ) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          changePublicRoomGalleryImage(deltaX > 0 ? -1 : 1);
        }
      }
    },
    { passive: true }
  );

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePublicRoomGallery();
  });
  dialog.addEventListener("close", finishPublicRoomGalleryClose);
}

function getPublicRoomAmenities(room = {}) {
  return normalizePublicRoomArray(room.amenities)
    .map((amenity) =>
      typeof amenity === "string"
        ? amenity.trim()
        : String(amenity?.name || amenity?.label || "").trim()
    )
    .filter(Boolean)
    .slice(0, 6);
}

function buildPublicRoomCard(room = {}) {
  const roomTitle =
    room.title || room.roomType?.name || room.roomNumber || "Room";
  const roomImage = getPublicRoomImage(room);
  const amenities = getPublicRoomAmenities(room);
  const capacityParts = [];
  const adults = Number(room.maxAdults || room.capacity || 0);
  const children = Number(room.maxChildren || 0);

  if (adults > 0) {
    capacityParts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  }
  if (children > 0) {
    capacityParts.push(`${children} child${children === 1 ? "" : "ren"}`);
  }

  const metaItems = [
    room.roomNumber ? `Room ${room.roomNumber}` : "",
    room.floor ? `Floor ${room.floor}` : "",
    room.bedType || "",
    capacityParts.join(" + ")
  ].filter(Boolean);

  const galleryImages = getPublicRoomGalleryImages(room);
  const primaryImage = galleryImages[0];
  const imageMarkup = roomImage
    ? `<button type="button" class="room-card-gallery-trigger" data-room-gallery-open="${escapeAttr(room.id)}" aria-label="View ${galleryImages.length} photo${galleryImages.length === 1 ? "" : "s"} of ${escapeAttr(roomTitle)}"><img src="${escapeAttr(normalizeImagePath(roomImage))}" data-room-image-fallback="${escapeAttr(normalizeImagePath(primaryImage?.originalUrl || roomImage))}" alt="${escapeAttr(primaryImage?.altText || roomTitle)}" width="960" height="640" loading="lazy" decoding="async" referrerpolicy="no-referrer" />${galleryImages.length > 1 ? `<span><i class="fas fa-images" aria-hidden="true"></i> ${galleryImages.length}</span>` : ""}</button>`
    : `<div class="room-card-placeholder" aria-hidden="true"><i class="fas fa-bed"></i></div>`;

  return `
    <article class="room-card">
      <div class="room-card-media">
        ${imageMarkup}
      </div>
      <div class="room-card-body">
        <div class="room-card-head">
          <div>
            <p class="room-card-type">${escapeHTML(room.roomType?.name || "Room")}</p>
            <h3>${escapeHTML(roomTitle)}</h3>
          </div>
          <strong>${escapeHTML(formatCurrency(room.pricePerNight || room.basePrice || 0))}<span>/night</span></strong>
        </div>
        ${
          metaItems.length
            ? `<div class="room-card-meta">${metaItems.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>`
            : ""
        }
        ${
          room.description
            ? `<p class="room-card-desc">${escapeHTML(room.description)}</p>`
            : ""
        }
        ${
          amenities.length
            ? `<div class="room-card-amenities">${amenities.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>`
            : ""
        }
        <button type="button" class="btn btn-outline room-card-action" data-room-booking-select="${escapeAttr(room.id)}">
          <span>Request Booking</span>
        </button>
      </div>
    </article>
  `;
}

function renderPublicRooms(rooms = [], options = {}) {
  const grid = document.getElementById("publicRoomsGrid");
  if (!grid) return;

  if (!rooms.length) {
    grid.innerHTML = `
      <div class="rooms-empty-state">
        <h3>No rooms available</h3>
        <p>${escapeHTML(options.emptyMessage || "Try another date range or contact the hotel directly.")}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = rooms.map((room) => buildPublicRoomCard(room)).join("");
  bindPublicRoomGallery();
  grid.querySelectorAll("[data-room-image-fallback]").forEach((image) => image.addEventListener("error", () => {
    const fallback = image.dataset.roomImageFallback || "";
    image.dataset.roomImageFallback = "";
    if (fallback) {
      const resolvedFallback = new URL(fallback, document.baseURI).href;
      if (image.src !== resolvedFallback) image.src = resolvedFallback;
    }
  }));
  grid.querySelectorAll("[data-room-gallery-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const roomId = Number(button.dataset.roomGalleryOpen || 0);
      const selectedRoom = rooms.find((room) => Number(room.id) === roomId);
      if (selectedRoom) openPublicRoomGallery(selectedRoom, button);
    });
  });
  grid.querySelectorAll("[data-room-booking-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const roomId = Number(button.dataset.roomBookingSelect || 0);
      const selectedRoom = rooms.find((room) => Number(room.id) === roomId);
      openPublicRoomBookingForm(selectedRoom);
    });
  });
}

function getPublicAvailabilityFormValues() {
  const form = document.getElementById("publicRoomAvailabilityForm");
  if (!form) {
    return {
      checkInDate: "",
      checkOutDate: "",
      adults: 1,
      children: 0
    };
  }

  const formData = new FormData(form);
  return {
    checkInDate: String(formData.get("checkInDate") || ""),
    checkOutDate: String(formData.get("checkOutDate") || ""),
    adults: Math.max(1, Number(formData.get("adults") || 1)),
    children: Math.max(0, Number(formData.get("children") || 0))
  };
}

function getPublicRoomTitle(room = {}) {
  return room.title || room.roomType?.name || room.roomNumber || "Selected Room";
}

function openPublicRoomBookingForm(room = null) {
  if (!room?.id) {
    return;
  }

  const bookingForm = document.getElementById("publicRoomBookingForm");
  const roomIdInput = document.getElementById("publicBookingRoomId");
  const titleEl = document.getElementById("publicBookingRoomTitle");
  const summaryEl = document.getElementById("publicBookingSummary");
  if (!bookingForm || !roomIdInput || !titleEl || !summaryEl) return;

  const availability = getPublicAvailabilityFormValues();
  if (!availability.checkInDate || !availability.checkOutDate || availability.checkOutDate <= availability.checkInDate) {
    setPublicRoomsStatus("Choose valid check-in and check-out dates before requesting a booking.", "error");
    return;
  }

  roomIdInput.value = String(room.id);
  titleEl.textContent = getPublicRoomTitle(room);
  summaryEl.innerHTML = `
    <div class="room-booking-summary-row">
      <span>Dates</span>
      <strong>${escapeHTML(availability.checkInDate)} to ${escapeHTML(availability.checkOutDate)}</strong>
    </div>
    <div class="room-booking-summary-row">
      <span>Guests</span>
      <strong>${escapeHTML(String(availability.adults))} adult${availability.adults === 1 ? "" : "s"}${availability.children ? `, ${escapeHTML(String(availability.children))} child${availability.children === 1 ? "" : "ren"}` : ""}</strong>
    </div>
    <div class="room-booking-summary-row">
      <span>Room</span>
      <strong>${escapeHTML(getPublicRoomTitle(room))}</strong>
    </div>
    <div class="room-booking-summary-row">
      <span>Display Price</span>
      <strong>${escapeHTML(formatCurrency(room.pricePerNight || room.basePrice || 0))}/night</strong>
    </div>
  `;
  bookingForm.hidden = false;
  bookingForm.dataset.checkInDate = availability.checkInDate;
  bookingForm.dataset.checkOutDate = availability.checkOutDate;
  bookingForm.dataset.adults = String(availability.adults);
  bookingForm.dataset.children = String(availability.children);
  setPublicRoomsStatus("Complete the guest details below. Final availability is checked again before saving.", "muted");
  bookingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closePublicRoomBookingForm() {
  const bookingForm = document.getElementById("publicRoomBookingForm");
  if (!bookingForm) return;

  bookingForm.hidden = true;
  bookingForm.reset();
  delete bookingForm.dataset.checkInDate;
  delete bookingForm.dataset.checkOutDate;
  delete bookingForm.dataset.adults;
  delete bookingForm.dataset.children;
  delete bookingForm.dataset.roomBookingIdempotencyKey;
}

async function submitPublicRoomBooking(form) {
  const hotelSlug = getPublicRoomsHotelSlug();
  if (!hotelSlug) {
    setPublicBookingStatus("Hotel context is missing. Please reload this hotel website.", "error");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const payload = {
    roomId: Number(formData.get("roomId") || 0),
    guestName: String(formData.get("guestName") || "").trim(),
    guestPhone: String(formData.get("guestPhone") || "").trim(),
    guestEmail: String(formData.get("guestEmail") || "").trim(),
    checkInDate: form.dataset.checkInDate || "",
    checkOutDate: form.dataset.checkOutDate || "",
    adults: Math.max(1, Number(form.dataset.adults || 1)),
    children: Math.max(0, Number(form.dataset.children || 0)),
    notes: String(formData.get("notes") || "").trim()
  };

  if (!payload.roomId || !payload.guestName || !payload.guestPhone) {
    setPublicBookingStatus("Guest name and phone are required.", "error");
    return;
  }

  if (!payload.checkInDate || !payload.checkOutDate || payload.checkOutDate <= payload.checkInDate) {
    setPublicBookingStatus("Please select valid check-in and check-out dates again.", "error");
    return;
  }

  try {
    form.dataset.roomBookingIdempotencyKey =
      form.dataset.roomBookingIdempotencyKey ||
      (window.crypto?.randomUUID?.() || `room-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent || "";
      const submitLabel = submitButton.querySelector("span");
      if (submitLabel) {
        submitLabel.textContent = "Submitting...";
      }
    }
    setPublicBookingStatus("Submitting booking request...", "muted");

    const response = await fetch(
      `${getPublicRoomsApiBase()}/${encodeURIComponent(hotelSlug)}/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": form.dataset.roomBookingIdempotencyKey
        },
        body: JSON.stringify(payload)
      }
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.success === false) {
      const error = new Error(result?.message || "Unable to submit booking request.");
      error.code = result?.code || "";
      error.responseData = result;
      throw error;
    }

    const booking = result.booking || {};
    delete form.dataset.roomBookingIdempotencyKey;
    setPublicBookingStatus(
      `Booking request submitted. Reference: ${booking.id || "pending confirmation"}. The hotel will confirm availability and payment.`,
      "success"
    );
    setPublicRoomsStatus("Booking request submitted successfully.", "success");
    await loadPublicRooms({
      availability: true,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      adults: payload.adults,
      children: payload.children
    });
  } catch (error) {
    setPublicBookingStatus(getRoomBookingErrorMessage(error), "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      const submitLabel = submitButton.querySelector("span");
      if (submitLabel) {
        submitLabel.textContent = "Submit Booking Request";
      }
    }
  }
}

function buildPublicRoomsPageUrl(overrides = {}) {
  const availability = { ...getPublicAvailabilityFormValues(), ...overrides };
  const params = new URLSearchParams();
  const hotelSlug = getPublicRoomsHotelSlug();
  if (hotelSlug) params.set("hotel", hotelSlug);
  if (availability.checkInDate) params.set("checkInDate", availability.checkInDate);
  if (availability.checkOutDate) params.set("checkOutDate", availability.checkOutDate);
  params.set("adults", String(Math.max(1, Number(availability.adults || 1))));
  params.set("children", String(Math.max(0, Number(availability.children || 0))));
  if (overrides.roomTypeId) params.set("roomTypeId", String(overrides.roomTypeId));
  return `rooms.html?${params.toString()}`;
}

function updatePublicRoomsExploreLink() {
  const link = document.getElementById("publicRoomsExploreAll");
  if (link) link.href = buildPublicRoomsPageUrl();
}

function buildPublicRoomTypeCard(roomType = {}, index = 0) {
  const image = roomType.primaryImage || null;
  const availability = Number(roomType.availableCount || 0);
  const capacity = roomType.capacity || {};
  const startingPrice = Math.max(0, Number(roomType.startingPrice || 0));
  const description = String(roomType.shortDescription || "").trim()
    || "A comfortable stay with thoughtful essentials for a relaxing visit.";
  const imageMarkup = image?.cardUrl
    ? `<img src="${escapeAttr(normalizePublicRoomImageUrl(image.cardUrl))}" alt="${escapeAttr(image.alt || roomType.name || "Room type")}" width="${Number(image.width || 960)}" height="${Number(image.height || 640)}" loading="${index === 0 ? "eager" : "lazy"}" ${index === 0 ? 'fetchpriority="high"' : ""} decoding="async" referrerpolicy="no-referrer" />`
    : `<div class="room-card-placeholder" aria-hidden="true"><i class="fas fa-bed"></i></div>`;
  const target = buildPublicRoomsPageUrl({ roomTypeId: roomType.roomTypeId });
  const capacityLabel = [
    Number(capacity.adults || 0) > 0 ? `Up to ${Number(capacity.adults)} adults` : "",
    Number(capacity.children || 0) > 0 ? `${Number(capacity.children)} children` : ""
  ].filter(Boolean).join(" · ") || "Guest capacity available on request";
  const amenities = normalizePublicRoomArray(roomType.amenities).slice(0, 3);
  return `
    <article class="room-card room-type-card">
      <a class="room-card-media room-type-card-media" href="${escapeAttr(target)}" aria-label="Explore ${escapeAttr(roomType.name || "room type")}">
        ${imageMarkup}
        <span class="room-card-availability" data-state="${escapeAttr(roomType.availabilityStatus || "available")}">${availability} room${availability === 1 ? "" : "s"}</span>
      </a>
      <div class="room-card-body">
        <div class="room-card-head">
          <div><p class="room-card-type">Room Type</p><h3>${escapeHTML(roomType.name || "Room Type")}</h3></div>
          <strong>${startingPrice > 0 ? escapeHTML(formatCurrency(startingPrice)) : "Contact hotel"}<span>${startingPrice > 0 ? "from / night" : "for rates"}</span></strong>
        </div>
        <div class="room-card-meta"><span><i class="fas fa-user-group" aria-hidden="true"></i> ${escapeHTML(capacityLabel)}</span></div>
        <p class="room-card-desc">${escapeHTML(description)}</p>
        ${amenities.length ? `<div class="room-card-amenities">${amenities.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>` : ""}
        <a class="btn btn-outline room-card-action" href="${escapeAttr(target)}"><span>View Available Rooms</span></a>
      </div>
    </article>`;
}

function renderPublicRoomTypes(items = []) {
  const grid = document.getElementById("publicRoomsGrid");
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<div class="rooms-empty-state"><h3>Room information is currently unavailable.</h3><p>Please contact the hotel for assistance.</p></div>`;
    return;
  }
  grid.innerHTML = items.map((item, index) => buildPublicRoomTypeCard(item, index)).join("");
}

async function loadPublicRooms(options = {}) {
  const hotelSlug = getPublicRoomsHotelSlug();
  if (!hotelSlug) {
    setPublicRoomsSectionVisible(false);
    return;
  }
  const isAvailabilitySearch = Boolean(options.availability);
  const params = new URLSearchParams();
  let url;
  if (isAvailabilitySearch) {
    params.set("checkInDate", options.checkInDate);
    params.set("checkOutDate", options.checkOutDate);
    params.set("adults", String(options.adults || 1));
    params.set("children", String(options.children || 0));
    url = `${getPublicRoomsApiBase()}/${encodeURIComponent(hotelSlug)}/availability?${params.toString()}`;
  } else {
    params.set("mode", "types");
    params.set("page", "1");
    params.set("pageSize", "6");
    url = `${getPublicRoomsApiBase()}/${encodeURIComponent(hotelSlug)}/discovery?${params.toString()}`;
  }
  try {
    setPublicRoomsStatus(isAvailabilitySearch ? "Checking rooms..." : "Discovering rooms...", "muted");
    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));
    if (response.status === 403 || payload?.code === "ROOM_BOOKING_DISABLED") {
      setPublicRoomsSectionVisible(false);
      return;
    }
    if (!response.ok || payload?.success === false) throw new Error(payload?.message || "Unable to load rooms.");
    setPublicRoomsSectionVisible(true);
    if (isAvailabilitySearch) {
      const rooms = Array.isArray(payload.rooms) ? payload.rooms : [];
      renderPublicRooms(rooms, { emptyMessage: "No rooms match the selected dates and guest count." });
      setPublicRoomsStatus(`${rooms.length} room${rooms.length === 1 ? "" : "s"} available for selected dates.`, rooms.length ? "success" : "muted");
    } else {
      const roomTypes = Array.isArray(payload.items) ? payload.items : [];
      renderPublicRoomTypes(roomTypes);
      setPublicRoomsStatus(`${payload.pagination?.totalItems || roomTypes.length} room type${Number(payload.pagination?.totalItems || roomTypes.length) === 1 ? "" : "s"} to explore.`, roomTypes.length ? "success" : "muted");
      updatePublicRoomsExploreLink();
    }
  } catch (error) {
    console.warn("Public room listing skipped:", error);
    setPublicRoomsSectionVisible(isAvailabilitySearch);
    setPublicRoomsStatus(error.message || "Rooms could not be loaded. Please retry.", "error");
  }
}
function bindPublicRoomAvailabilityForm() {
  const form = document.getElementById("publicRoomAvailabilityForm");
  if (!form) return;
  const checkInInput = form.querySelector("#publicRoomCheckIn");
  const checkOutInput = form.querySelector("#publicRoomCheckOut");
  const adultsInput = form.querySelector("#publicRoomAdults");
  const childrenInput = form.querySelector("#publicRoomChildren");
  const query = new URLSearchParams(window.location.search);
  const todayValue = toPublicDateInputValue(new Date());
  const tomorrowValue = toPublicDateInputValue(addPublicDateDays(new Date(), 1));
  if (checkInInput) {
    checkInInput.min = todayValue;
    checkInInput.value = query.get("checkInDate") || checkInInput.value || todayValue;
  }
  if (checkOutInput) {
    checkOutInput.min = tomorrowValue;
    checkOutInput.value = query.get("checkOutDate") || checkOutInput.value || tomorrowValue;
  }
  if (adultsInput && query.has("adults")) adultsInput.value = String(Math.max(1, Number(query.get("adults") || 1)));
  if (childrenInput && query.has("children")) childrenInput.value = String(Math.max(0, Number(query.get("children") || 0)));
  const syncExploreLink = () => updatePublicRoomsExploreLink();
  checkInInput?.addEventListener("change", () => {
    const nextCheckout = toPublicDateInputValue(addPublicDateDays(checkInInput.value, 1));
    if (checkOutInput) {
      checkOutInput.min = nextCheckout;
      if (!checkOutInput.value || checkOutInput.value <= checkInInput.value) checkOutInput.value = nextCheckout;
    }
    syncExploreLink();
  });
  checkOutInput?.addEventListener("change", syncExploreLink);
  adultsInput?.addEventListener("change", syncExploreLink);
  childrenInput?.addEventListener("change", syncExploreLink);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = getPublicAvailabilityFormValues();
    if (!values.checkInDate || !values.checkOutDate || values.checkOutDate <= values.checkInDate) {
      setPublicRoomsStatus("Check-out date must be after check-in date.", "error");
      return;
    }
    window.location.assign(buildPublicRoomsPageUrl(values));
  });
  syncExploreLink();
}
function bindPublicRoomBookingForm() {
  const form = document.getElementById("publicRoomBookingForm");
  const closeButton = document.getElementById("publicBookingCloseBtn");
  if (!form) return;

  closeButton?.addEventListener("click", closePublicRoomBookingForm);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitPublicRoomBooking(form);
  });
}

async function initPublicRoomsSection() {
  if (!document.getElementById("rooms")) {
    return;
  }

  setPublicRoomsSectionVisible(false);
  bindPublicRoomAvailabilityForm();
  bindPublicRoomBookingForm();
  await loadPublicRooms();
}

async function hydrateSecondaryPublicContent(secondaryDataPromise) {
  if (!secondaryDataPromise) return;
  await secondaryDataPromise;
  renderGallerySection();
  GalleryLightbox.init();
  renderTestimonialsSection(window.APP_STATE?.testimonials || []);
  HotelPopupNotificationModal.renderFromState();
  initReveal(document.getElementById("gallery"));
  initReveal(document.getElementById("testimonials"));
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const isMenuPage = document.body.classList.contains("menu-page");
    const queryHotelSlug =
      typeof getHotelSlugFromQuery === "function" ? getHotelSlugFromQuery() : "";

    if (queryHotelSlug) {
      updateHotelAwareLinks(queryHotelSlug);
    }

    await loadAppData({
      includeGallery: !isMenuPage,
      includeTestimonials: !isMenuPage
    });
    const secondaryDataPromise = window.APP_SECONDARY_DATA_PROMISE;
    applyLoadingScreenFromState();
    applyThemeFromState();
    applyHotelConfigFromState();
    renderHotelContent();
    renderTestimonialsSection(window.APP_STATE?.testimonials || []);
    updateHotelAwareLinks();
    applySectionVisibilityFromState();
    const publicRoomsPromise = initPublicRoomsSection();
    HotelPopupNotificationModal.bind();
    HotelPopupNotificationModal.renderFromState();
    bindReservationForm();
    bindEventInquiryForm();
    bindTestimonialReviewForm();
    initMenuAndCart();

    markAppReady();
    void hydrateSecondaryPublicContent(secondaryDataPromise);
    void publicRoomsPromise;
    if (isLocalAppRuntime(window.location.hostname)) {
      console.info("App data loaded successfully", {
        hotelSlug: window.APP_STATE?.activeHotelSlug || "",
        menuCategoryCount: Object.keys(window.APP_STATE?.menu || {}).length
      });
    }
  } catch (error) {
    console.error("App bootstrap failed:", error);
    markAppReady();
    renderLocalBootFailureBanner(error);
  }
});
