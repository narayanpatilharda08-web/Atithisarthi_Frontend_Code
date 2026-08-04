"use strict";

function getDefaultStaffApiBaseUrl() {
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

const STAFF_BASE_API =
  window.APP_RUNTIME_CONFIG?.API_BASE_URL || getDefaultStaffApiBaseUrl();
const STAFF_API_BASE = `${STAFF_BASE_API}/staff`;

function isStaffRoomCombinedCheckoutFrontendEnabled() {
  return (
    window.APP_RUNTIME_CONFIG?.ROOM_COMBINED_CHECKOUT_FRONTEND_ENABLED === true &&
    canStaffUseFeature("combined_billing")
  );
}

function getStaffRoomCombinedCheckoutDisabledAttribute() {
  return isStaffRoomCombinedCheckoutFrontendEnabled() ? "" : "disabled";
}

function getStaffRoomCombinedCheckoutHintText() {
  return isStaffRoomCombinedCheckoutFrontendEnabled()
    ? "Combined checkout frontend is enabled for staging. Backend feature flag and RPC validation still control settlement."
    : canStaffUseFeature("combined_billing")
      ? "Combined checkout stays disabled until the backend migration, staging verifier, and feature flag are enabled."
      : "Combined Billing is not enabled for this hotel.";
}
const STAFF_PAGE_MODE = (() => {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("mode") || "").trim().toLowerCase() === "kds-display"
    ? "kds-display"
    : "workspace";
})();
const STAFF_TOKEN_KEY = "hotel_platform_staff_token";
const STAFF_SOUND_ALERT_ENABLED_KEY = "hotel_platform_staff_sound_alert_enabled";
const STAFF_BROWSER_ALERT_ENABLED_KEY = "hotel_platform_staff_browser_alert_enabled";
const STAFF_SOUND_ALERT_VOLUME_KEY = "hotel_platform_staff_sound_alert_volume";
const STAFF_SOUND_ALERT_THROTTLE_MS = 1200;
const STAFF_KDS_PREFERENCES_KEY_PREFIX = "hotel_platform_staff_kds_preferences";
const STAFF_AUTO_REFRESH_INTERVAL_MS = 15 * 1000;
const STAFF_KDS_AUTO_REFRESH_INTERVAL_MS = 5 * 1000;
const STAFF_SLOW_REQUEST_WARNING_MS = 3000;
const STAFF_SLOW_REQUEST_WARNING_COOLDOWN_MS = 60 * 1000;
const STAFF_KDS_FRESH_HIGHLIGHT_WINDOW_MS = 2 * 60 * 1000;
const STAFF_KDS_BOARD_COLUMNS = ["new", "preparing", "ready"];
const STAFF_KDS_VIEW_MODES = ["kitchen", "expo", "manager"];
const STAFF_KDS_DEFAULT_DELAY_MINUTES = 15;
const STAFF_TABLE_ORDER_RENDER_BATCH_SIZE = 48;

function normalizeStaffFeatureConfig(config = {}) {
  const enableFoodModule = config.enableFoodModule !== false;
  const enableRoomModule = config.enableRoomModule === true;
  const enableRoomService = enableFoodModule && enableRoomModule && config.enableRoomService === true;
  const enableFoodReports = enableFoodModule && config.enableFoodReports !== false;
  const enableRoomReports = enableRoomModule && config.enableRoomReports !== false;
  const enableCombinedReports =
    enableFoodModule && enableRoomModule && config.enableCombinedReports === true;

  return {
    hotelSlug: String(config.hotelSlug || "").trim(),
    businessType: config.businessType || (
      enableFoodModule && enableRoomModule
        ? "hotel_restaurant"
        : enableRoomModule
          ? "hotel_only"
          : "restaurant_only"
    ),
    enableFoodModule,
    enableRoomModule,
    enableRoomService,
    enableFoodReports,
    enableRoomReports,
    enableCombinedReports,
    enableCombinedBilling:
      enableRoomService && config.enableCombinedBilling === true,
    enableFoodOrdering:
      enableFoodModule && config.enableFoodOrdering !== false,
    enableRoomBooking:
      enableRoomModule && config.enableRoomBooking !== false,
    canUseFood: enableFoodModule,
    canUseRooms: enableRoomModule,
    canUseRoomService: enableRoomService,
    canUseFoodReports: enableFoodReports,
    canUseRoomReports: enableRoomReports,
    canUseCombinedReports: enableCombinedReports,
    canUseCombinedBilling:
      enableRoomService && config.enableCombinedBilling === true
  };
}

const STAFF_STATE = {
  staffUser: null,
  featureConfig: normalizeStaffFeatureConfig(),
  activeView: "dashboard",
  orders: [],
  ordersRenderSignature: "",
  selectedOrderSourceCard: "",
  orderSourceFreshCounts: { qr: 0, staff: 0, website: 0 },
  expandedOrderIds: new Set(),
  kdsOrders: [],
  kdsCounts: {},
  kdsFreshOrderIds: {},
  kdsStatusFilter: "all",
  kdsSourceFilter: "all",
  kdsAdditionsOnly: false,
  kdsHideServed: false,
  kdsHideCancelled: false,
  kdsSortMode: "oldest",
  kdsViewMode: "kitchen",
  kdsCapabilities: { role: "general", canPrepare: true, canServe: true, canManage: false },
  kdsServerClockOffsetMs: 0,
  kdsRenderSignature: "",
  kdsConsecutiveFailures: 0,
  kdsDefaultVisibilityApplied: false,
  tableOrderMenu: [],
  tableOrderMenuCategories: [],
  tableOrderMenuVersion: "",
  tableOrderMenuRenderLimit: STAFF_TABLE_ORDER_RENDER_BATCH_SIZE,
  tableOrderCart: {},
  tableOrderItemNotes: {},
  tableOrderMode: "create",
  tableOrderTarget: null,
  tableOrderIdempotencyKey: "",
  roomServiceCart: {},
  tableOrdering: null,
  tableOrderMenuLoaded: false,
  tableOrderMenuQuery: "",
  tableOrderMenuCategory: "all",
  tableOrderSubview: "home",
  tableActivity: [],
  tableFloor: [],
  tableActivityLoaded: false,
  tableActivityRenderSignature: "",
  tableMaster: [],
  tableMasterLoaded: false,
  selectedRestaurantTableId: "",
  tableActivityQuery: "",
  tableActivityStatus: "all",
  selectedTableNumber: "",
  selectedTableOrderId: "",
  selectedTableOrder: null,
  selectedTableOrderRenderSignature: "",
  tableActivityScrollTop: 0,
  tableOrderDetailScrollTop: 0,
  tableOrderDetailNotice: "",
  tableOrderConflict: null,
  dashboardReports: null,
  dashboardReportsFreshnessLabel: "",
  dashboardReportsError: false,
  dashboardTrend: null,
  dashboardTrendError: false,
  itemSalesReports: null,
  itemSalesReportsError: false,
  businessReport: null,
  businessReportType: "food",
  businessReportLoaded: false,
  supportRequests: [],
  reservations: [],
  rooms: [],
  roomBookings: [],
  roomBookingSource: "website",
  roomBookingPage: 1,
  roomBookingSummary: {
    website: { total: 0, pending: 0, today: 0 },
    manual: { total: 0, pending: 0, today: 0 },
    legacy: { total: 0, pending: 0, today: 0 }
  },
  roomBookingPagination: { page: 1, limit: 25, total: 0, totalPages: 1, hasPrevious: false, hasNext: false },
  roomBookingUrlInitialized: false,
  roomBookingSummaryInitialized: false,
  roomBookingDetails: {},
  selectedRoomBookingId: "",
  selectedRoomBookingTrigger: null,
  roomBookingDetailRequestId: 0,
  roomBookingListRequestId: 0,
  roomWebsiteFallbackUnread: 0,
  roomOperationsRooms: [],
  roomOperationsPeriod: { checkInDate: "", checkOutDate: "" },
  roomOperationsView: "home",
  selectedRoomOperationId: "",
  selectedRoomOperationTrigger: null,
  roomOperationDetails: {},
  roomCheckoutSummaries: {},
  roomCheckoutBills: {},
  inquiries: [],
  contactSubmissions: [],
  testimonials: [],
  kdsOrdersLoaded: false,
  supportRequestsLoaded: false,
  reservationsLoaded: false,
  roomsLoaded: false,
  inquiriesLoaded: false,
  contactSubmissionsLoaded: false,
  testimonialsLoaded: false,
  notificationCards: {},
  notificationSummaryVersion: 0,
  notificationSummaryInitialized: false,
  notificationAcknowledgementAvailable: false,
  notificationLocalAcknowledgedThrough: {},
  notificationSeenEventKeys: new Set()
};
const STAFF_ORDER_STATUS_OPTIONS = ["new", "confirmed", "preparing", "completed", "cancelled"];
const STAFF_TABLE_ACTIVITY_FILTERS = Object.freeze({
  all: Object.freeze([]),
  available: Object.freeze(["available"]),
  new: Object.freeze(["new"]),
  preparing: Object.freeze(["preparing"]),
  ready: Object.freeze(["ready"]),
  billing_pending: Object.freeze(["billing_pending"])
});
const STAFF_ORDER_PAYMENT_EXCEPTION_STATUSES = ["payment_pending", "payment_failed"];
const STAFF_KDS_STATUS_ORDER = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "served",
  "delayed",
  "cancelled"
];
const STAFF_KDS_STATUS_LABELS = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  delayed: "Delayed",
  cancelled: "Cancelled"
};
const STAFF_RESERVATION_STATUS_OPTIONS = ["new", "confirmed", "seated", "completed", "cancelled"];
const STAFF_INQUIRY_STATUS_OPTIONS = ["new", "contacted", "converted", "closed"];
const STAFF_CONTACT_STATUS_OPTIONS = ["new", "contacted", "resolved", "closed", "archived"];
const STAFF_SUPPORT_STATUS_OPTIONS = ["new", "acknowledged", "resolved", "closed"];
const STAFF_ROOM_BOOKING_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(["pending", "confirmed", "cancelled", "no_show"]),
  confirmed: Object.freeze(["confirmed", "checked_in", "cancelled", "no_show"]),
  checked_in: Object.freeze(["checked_in", "checked_out"]),
  checked_out: Object.freeze(["checked_out"]),
  cancelled: Object.freeze(["cancelled"]),
  no_show: Object.freeze(["no_show"])
});
const STAFF_MANAGER_VIEWS = [
  "dashboard",
  "reports",
  "table-order",
  "orders",
  "kds",
  "support",
  "rooms",
  "reservations",
  "inquiries",
  "contacts",
  "testimonials"
];
const STAFF_BASIC_VIEWS = ["table-order", "orders", "kds", "support", "rooms"];
const STAFF_ORDER_STATUS_LABELS = {
  new: "Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  completed: "Completed / Served",
  cancelled: "Cancelled",
  payment_pending: "Payment Pending",
  payment_failed: "Payment Failed"
};
const STAFF_ORDER_SOURCE_CARD_DEFINITIONS = {
  qr: {
    label: "QR Orders",
    description: "Orders created through table QR codes",
    sourceKeys: ["qr-table"],
    defaultSourceFilter: "qr-table"
  },
  staff: {
    label: "Staff Orders",
    description: "Orders created by hotel or restaurant staff, including room service",
    sourceKeys: ["staff-table", "room-service"],
    defaultSourceFilter: "all"
  },
  website: {
    label: "Website Orders",
    description: "Orders received from the public website",
    sourceKeys: ["website"],
    defaultSourceFilter: "website"
  }
};
const STAFF_VIEW_META = {
  dashboard: {
    badge: "Dashboard",
    title: "Dashboard overview",
    description:
      "Start from the hotel snapshot, then move into live orders, guest communication, and operational follow-up without leaving this workspace."
  },
  reports: {
    badge: "Reports",
    title: "Business reports",
    description:
      "Review hotel-scoped sales, items, payments, customers, staff activity, and printable report exports."
  },
  orders: {
    badge: "Orders",
    title: "Orders and billing workspace",
    description:
      "Review live QR and website orders, billing actions, payment state, and the current working queue for this hotel."
  },
  kds: {
    badge: "Kitchen",
    title: "Kitchen display system",
    description:
      "Follow live kitchen queues by preparation stage while keeping the same hotel-scoped staff session."
  },
  "table-order": {
    badge: "Take Order",
    title: "Take table order",
    description:
      "Create a staff-assisted dine-in order from this hotel's live menu."
  },
  support: {
    badge: "Support",
    title: "Table support workspace",
    description:
      "Handle bill requests and staff-help calls from QR/table tracking without opening the full admin area."
  },
  rooms: {
    badge: "Rooms",
    title: "Rooms and bookings",
    description:
      "Review room inventory and room booking status for the logged-in hotel without changing food orders, KDS, billing, or payments."
  },
  reservations: {
    badge: "Reservations",
    title: "Reservations workspace",
    description:
      "Check booking requests, guest timing, table planning, and reservation follow-up for this hotel."
  },
  inquiries: {
    badge: "Inquiries",
    title: "Inquiries workspace",
    description:
      "Follow guest event leads, contact details, and status updates from one focused section."
  },
  contacts: {
    badge: "Contacts",
    title: "Contact messages workspace",
    description:
      "Review website contact messages, subjects, and follow-up status for this hotel only."
  },
  testimonials: {
    badge: "Testimonials",
    title: "Testimonials workspace",
    description:
      "Approve or pause hotel-specific guest reviews in a simple moderation flow."
  }
};
let staffAutoRefreshTimer = null;
let staffAutoRefreshInFlight = false;
const staffSlowRequestWarningAtByPath = new Map();
let staffCompactViewport = window.innerWidth <= 1080;
let staffMobileSidebarViewport = window.innerWidth <= 760;
let staffAlertAudioContext = null;
let staffSoundUnlocked = false;
let staffKitchenDisplayClockTimer = null;
let staffLiveRefreshNoticeTimer = null;
let staffLiveRefreshOverrideActive = false;
let staffSoundRuntimeUnlockBound = false;
let staffAutoRefreshSoundPlayed = false;
let staffLastAlertToneAt = 0;
let staffAutoRefreshFreshCounts = {};
let staffSidebarLastFocusedElement = null;
let staffOrdersSearchTimer = null;
let staffTableOrderSearchTimer = null;
let staffDashboardTrendChart = null;
let staffOrdersRequestController = null;
let staffSelectedTableOrderRequestController = null;
let staffKdsRequestController = null;

const DEFAULT_STAFF_TABLE_ORDERING_STATE = {
  staffOrderingEnabled: true,
  enforceTableMaster: false,
  secureOnlinePaymentEnabled: true,
  cashOnDeliveryEnabled: true,
  manualUpiPaymentEnabled: true,
  title: "",
  message: "",
  icon: ""
};

function normalizeStaffRoleValue(role = "") {
  return String(role || "").trim().toLowerCase() === "owner" ? "owner" : "staff";
}

function isStaffKdsDisplayMode() {
  return STAFF_PAGE_MODE === "kds-display";
}

function getStaffKitchenDisplayUrl() {
  const url = new URL("./staff-orders.html", window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("mode", "kds-display");
  return url.toString();
}

function shouldStaffSynchronizeKds() {
  return isStaffKdsDisplayMode() || STAFF_STATE.activeView === "kds";
}

function isStaffManagerSession(staffUser = STAFF_STATE.staffUser || {}) {
  return Boolean(staffUser?.isManager) || normalizeStaffRoleValue(staffUser?.role) === "owner";
}

function getStaffFeatureConfig(staffUser = STAFF_STATE.staffUser || {}) {
  return normalizeStaffFeatureConfig(staffUser?.features || STAFF_STATE.featureConfig || {});
}

function canStaffUseFeature(feature = "", staffUser = STAFF_STATE.staffUser || {}) {
  const features = getStaffFeatureConfig(staffUser);
  const capabilities = {
    food: features.canUseFood,
    rooms: features.canUseRooms,
    room_service: features.canUseRoomService,
    food_reports: features.canUseFoodReports,
    room_reports: features.canUseRoomReports,
    combined_reports: features.canUseCombinedReports,
    combined_billing: features.canUseCombinedBilling
  };
  return capabilities[feature] === true;
}

function canStaffViewOrderFinancials(order = {}) {
  return isStaffManagerSession() && order?.financialsVisible !== false;
}

function getAllowedStaffViews(staffUser = STAFF_STATE.staffUser || {}) {
  if (isStaffKdsDisplayMode()) {
    return canStaffUseFeature("food", staffUser) ? ["kds"] : [];
  }

  const roleViews = isStaffManagerSession(staffUser) ? STAFF_MANAGER_VIEWS : STAFF_BASIC_VIEWS;
  const foodViews = new Set(["table-order", "orders", "kds", "support", "reservations"]);
  const roomViews = new Set(["rooms"]);

  return roleViews.filter((view) => {
    if (foodViews.has(view)) return canStaffUseFeature("food", staffUser);
    if (roomViews.has(view)) return canStaffUseFeature("rooms", staffUser);
    if (view === "reports") {
      return (
        canStaffUseFeature("food_reports", staffUser) ||
        canStaffUseFeature("room_reports", staffUser) ||
        canStaffUseFeature("combined_reports", staffUser)
      );
    }
    return true;
  });
}

function getDefaultStaffView(staffUser = STAFF_STATE.staffUser || {}) {
  if (isStaffKdsDisplayMode()) {
    return "kds";
  }

  if (isStaffManagerSession(staffUser)) return "dashboard";
  return canStaffUseFeature("food", staffUser) ? "orders" : "rooms";
}

function canStaffAccessView(view = "", staffUser = STAFF_STATE.staffUser || {}) {
  return getAllowedStaffViews(staffUser).includes(view);
}

function $(selector) {
  return document.querySelector(selector);
}

function getStaffToken() {
  return localStorage.getItem(STAFF_TOKEN_KEY) || "";
}

function setStaffToken(token) {
  localStorage.setItem(STAFF_TOKEN_KEY, token);
}

function clearStaffToken() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
}

function getStaffScopedPreferenceKey(baseKey = "") {
  const hotelSlug = String(STAFF_STATE.staffUser?.hotelSlug || "").trim().toLowerCase();
  return hotelSlug ? `${baseKey}_${hotelSlug}` : baseKey;
}

function getStaffScopedPreference(baseKey = "") {
  const scopedKey = getStaffScopedPreferenceKey(baseKey);
  const scopedValue = localStorage.getItem(scopedKey);
  return scopedValue === null && scopedKey !== baseKey
    ? localStorage.getItem(baseKey)
    : scopedValue;
}

function setStaffScopedPreference(baseKey = "", value = "") {
  localStorage.setItem(getStaffScopedPreferenceKey(baseKey), String(value));
}

function isStaffSoundAlertEnabled() {
  return getStaffScopedPreference(STAFF_SOUND_ALERT_ENABLED_KEY) === "true";
}

function setStaffSoundAlertEnabled(enabled) {
  setStaffScopedPreference(STAFF_SOUND_ALERT_ENABLED_KEY, enabled ? "true" : "false");
}
function getStaffSoundAlertVolume() {
  const value = String(getStaffScopedPreference(STAFF_SOUND_ALERT_VOLUME_KEY) || "medium")
    .trim()
    .toLowerCase();
  return ["low", "medium", "high"].includes(value) ? value : "medium";
}

function setStaffSoundAlertVolume(value = "medium") {
  const normalized = ["low", "medium", "high"].includes(String(value).toLowerCase())
    ? String(value).toLowerCase()
    : "medium";
  setStaffScopedPreference(STAFF_SOUND_ALERT_VOLUME_KEY, normalized);
  return normalized;
}

function getStaffSoundAlertPeakGain() {
  return {
    low: 0.1,
    medium: 0.16,
    high: 0.22
  }[getStaffSoundAlertVolume()];
}


function isStaffBrowserAlertEnabled() {
  return getStaffScopedPreference(STAFF_BROWSER_ALERT_ENABLED_KEY) === "true";
}

function setStaffBrowserAlertEnabled(enabled) {
  setStaffScopedPreference(STAFF_BROWSER_ALERT_ENABLED_KEY, enabled ? "true" : "false");
}

function getStaffKdsPreferencesStorageKey(staffUser = STAFF_STATE.staffUser || {}) {
  const hotelSlug = String(staffUser?.hotelSlug || "").trim().toLowerCase();
  if (!hotelSlug) {
    return "";
  }

  return `${STAFF_KDS_PREFERENCES_KEY_PREFIX}_${hotelSlug}`;
}

function saveStaffKdsPreferences() {
  const storageKey = getStaffKdsPreferencesStorageKey();
  if (!storageKey) return;

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        statusFilter: getStaffSelectedKdsStatusFilter(),
        sourceFilter: String(STAFF_STATE.kdsSourceFilter || "all"),
        additionsOnly: STAFF_STATE.kdsAdditionsOnly === true,
        hideServed: isStaffKdsHideServedEnabled(),
        hideCancelled: isStaffKdsHideCancelledEnabled(),
        sortMode: getStaffSelectedKdsSortMode(),
        viewMode: getStaffKdsViewMode(),
        defaultVisibilityApplied: STAFF_STATE.kdsDefaultVisibilityApplied === true
      })
    );
  } catch (error) {
    console.warn("Failed to save staff KDS preferences:", error);
  }
}

function loadStaffKdsPreferences(staffUser = STAFF_STATE.staffUser || {}) {
  const storageKey = getStaffKdsPreferencesStorageKey(staffUser);
  if (!storageKey) return;

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return;

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return;
    }

    STAFF_STATE.kdsStatusFilter =
      String(parsedValue.statusFilter || "all").trim().toLowerCase() || "all";
    STAFF_STATE.kdsSourceFilter = String(parsedValue.sourceFilter || "all").trim().toLowerCase() || "all";
    STAFF_STATE.kdsAdditionsOnly = parsedValue.additionsOnly === true;
    STAFF_STATE.kdsHideServed = parsedValue.hideServed === true;
    STAFF_STATE.kdsHideCancelled = parsedValue.hideCancelled === true;
    STAFF_STATE.kdsSortMode =
      String(parsedValue.sortMode || "oldest").trim().toLowerCase() === "newest"
        ? "newest"
        : "oldest";
    const requestedViewMode = String(parsedValue.viewMode || "").trim().toLowerCase();
    if (STAFF_KDS_VIEW_MODES.includes(requestedViewMode)) STAFF_STATE.kdsViewMode = requestedViewMode;
    STAFF_STATE.kdsDefaultVisibilityApplied = parsedValue.defaultVisibilityApplied === true;
  } catch (error) {
    console.warn("Failed to load staff KDS preferences:", error);
  }
}

function canUseStaffSoundAlerts() {
  return (
    typeof window !== "undefined" &&
    (typeof window.AudioContext === "function" ||
      typeof window.webkitAudioContext === "function")
  );
}

function hasStaffBrowserAlertRuntime() {
  return typeof window !== "undefined" && typeof window.Notification === "function";
}

function isStaffBrowserAlertContextSupported() {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname || "";
  const isTrustedLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  return Boolean(window.isSecureContext) || isTrustedLocalHost;
}

function canUseStaffBrowserAlerts() {
  return hasStaffBrowserAlertRuntime() && isStaffBrowserAlertContextSupported();
}

function hasStaffBrowserAlertPermission() {
  return canUseStaffBrowserAlerts() && window.Notification.permission === "granted";
}

function isStaffBrowserAlertActive() {
  return isStaffBrowserAlertEnabled() && hasStaffBrowserAlertPermission();
}

function ensureStaffAlertAudioContext() {
  if (staffAlertAudioContext || !canUseStaffSoundAlerts()) {
    return staffAlertAudioContext;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  staffAlertAudioContext = new AudioContextClass();
  return staffAlertAudioContext;
}

async function unlockStaffSoundAlerts() {
  const audioContext = ensureStaffAlertAudioContext();
  if (!audioContext) return false;

  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    staffSoundUnlocked = audioContext.state === "running";
  } catch (error) {
    console.warn("Staff sound alert unlock failed:", error);
    staffSoundUnlocked = false;
  }

  return staffSoundUnlocked;
}

function bindStaffSoundRuntimeUnlock() {
  if (staffSoundRuntimeUnlockBound) return;

  const unlockOnInteraction = () => {
    if (!isStaffSoundAlertEnabled() || staffSoundUnlocked) {
      return;
    }

    void unlockStaffSoundAlerts();
  };

  window.addEventListener("pointerdown", unlockOnInteraction, true);
  window.addEventListener("keydown", unlockOnInteraction, true);
  window.addEventListener("touchstart", unlockOnInteraction, true);
  staffSoundRuntimeUnlockBound = true;
}

function updateStaffSoundAlertToggle() {
  const button = $("#staffSoundAlertToggleBtn");
  if (!button) return;

  if (!canUseStaffSoundAlerts()) {
    button.disabled = true;
    button.textContent = "Sound unavailable";
    button.setAttribute("aria-pressed", "false");
    return;
  }

  const enabled = isStaffSoundAlertEnabled();
  button.disabled = false;
  button.textContent = enabled ? "Sound alerts on" : "Sound alerts off";
  button.setAttribute("aria-pressed", String(enabled));
}

function updateStaffSoundVolumeControl() {
  const select = $("#staffSoundVolumeSelect");
  if (!select) return;

  select.value = getStaffSoundAlertVolume();
  select.disabled = !canUseStaffSoundAlerts();
}
function updateStaffBrowserAlertToggle() {
  const button = $("#staffBrowserAlertToggleBtn");
  if (!button) return;

  if (!canUseStaffBrowserAlerts()) {
    button.disabled = true;
    button.textContent = hasStaffBrowserAlertRuntime()
      ? "Browser alerts need localhost/https"
      : "Browser alerts unavailable";
    button.setAttribute("aria-pressed", "false");
    return;
  }

  const permission = window.Notification.permission;
  if (permission === "denied") {
    if (isStaffBrowserAlertEnabled()) {
      setStaffBrowserAlertEnabled(false);
    }

    button.disabled = true;
    button.textContent = "Browser alerts blocked";
    button.setAttribute("aria-pressed", "false");
    return;
  }

  const enabled = isStaffBrowserAlertEnabled() && permission === "granted";
  button.disabled = false;
  button.textContent = enabled ? "Browser alerts on" : "Browser alerts off";
  button.setAttribute("aria-pressed", String(enabled));
}

async function ensureStaffBrowserAlertPermission() {
  if (!canUseStaffBrowserAlerts()) return "denied";

  if (window.Notification.permission === "granted") {
    return "granted";
  }

  if (window.Notification.permission === "denied") {
    return "denied";
  }

  try {
    return await window.Notification.requestPermission();
  } catch (error) {
    console.warn("Staff browser alert permission request failed:", error);
    return window.Notification.permission || "denied";
  }
}

function showStaffBrowserNotification(
  title = "Staff alert",
  body = "",
  options = {}
) {
  if (!isStaffBrowserAlertActive()) {
    return false;
  }

  try {
    const notification = new window.Notification(title, {
      body,
      tag: options.tag || `staff-browser-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`,
      renotify: options.renotify !== false
    });

    if (typeof options.onClick === "function") {
      notification.onclick = () => {
        try {
          options.onClick(notification);
        } catch (error) {
          console.warn("Staff browser alert click failed:", error);
        }
      };
    }

    window.setTimeout(() => {
      notification.close();
    }, options.durationMs || 12000);

    return true;
  } catch (error) {
    console.warn("Staff browser alert failed:", error);
    return false;
  }
}

function playStaffAlertTone({ force = false } = {}) {
  const audioContext = ensureStaffAlertAudioContext();
  if (!audioContext || !staffSoundUnlocked || !isStaffSoundAlertEnabled()) {
    return false;
  }

  const wallClockNow = Date.now();
  if (!force && wallClockNow - staffLastAlertToneAt < STAFF_SOUND_ALERT_THROTTLE_MS) {
    return false;
  }
  staffLastAlertToneAt = wallClockNow;

  const now = audioContext.currentTime;
  const duration = 0.48;
  const peakGain = getStaffSoundAlertPeakGain();
  const primary = audioContext.createOscillator();
  const accent = audioContext.createOscillator();
  const primaryGain = audioContext.createGain();
  const accentGain = audioContext.createGain();
  const masterGain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();

  primary.type = "triangle";
  primary.frequency.setValueAtTime(784, now);
  primary.frequency.exponentialRampToValueAtTime(660, now + 0.34);
  accent.type = "sine";
  accent.frequency.setValueAtTime(1046.5, now + 0.08);
  accent.frequency.exponentialRampToValueAtTime(880, now + 0.32);

  primaryGain.gain.setValueAtTime(0.0001, now);
  primaryGain.gain.exponentialRampToValueAtTime(0.9, now + 0.025);
  primaryGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  accentGain.gain.setValueAtTime(0.0001, now);
  accentGain.gain.exponentialRampToValueAtTime(0.34, now + 0.1);
  accentGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  masterGain.gain.setValueAtTime(peakGain, now);

  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(12, now);
  compressor.ratio.setValueAtTime(4, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.15, now);

  primary.connect(primaryGain);
  accent.connect(accentGain);
  primaryGain.connect(masterGain);
  accentGain.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(audioContext.destination);

  primary.start(now);
  accent.start(now + 0.08);
  primary.stop(now + duration);
  accent.stop(now + 0.4);
  return true;
}

function getNewStaffRecords(previousRecords = [], nextRecords = []) {
  if (!Array.isArray(previousRecords) || !Array.isArray(nextRecords) || !previousRecords.length) {
    return [];
  }

  const previousIds = new Set(previousRecords.map(getStaffRecordId).filter(Boolean));
  if (!previousIds.size) return [];

  return nextRecords.filter((record) => {
    const recordId = getStaffRecordId(record);
    return recordId && !previousIds.has(recordId);
  });
}

function showStaffOrderBrowserAlert(newOrders = []) {
  if (
    !Array.isArray(newOrders) ||
    !newOrders.length ||
    !isStaffBrowserAlertActive()
  ) {
    return false;
  }

  const primaryOrder = newOrders[0] || {};
  const sourceMeta = getStaffOrderSourceMeta(primaryOrder);
  const totalLabel = formatMoney(getStaffOrderTotal(primaryOrder));
  const customerLabel = primaryOrder.customerName || "Guest";
  const detailParts = [customerLabel];

  if (sourceMeta.detail) {
    detailParts.push(sourceMeta.detail);
  }

  if (totalLabel) {
    detailParts.push(totalLabel);
  }

  const title =
    newOrders.length > 1
      ? `${newOrders.length} new orders received`
      : `New ${sourceMeta.label} order`;
  const body =
    newOrders.length > 1
      ? `${detailParts.join(" • ")} • plus ${newOrders.length - 1} more`
      : detailParts.join(" • ");

  return showStaffBrowserNotification(title, body, {
    tag: `staff-order-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`,
    renotify: true,
    onClick(notification) {
      try {
        window.focus();
      } catch (error) {
        console.warn("Staff browser alert focus failed:", error);
      }

      openStaffView("orders");
      notification.close();
    }
  });
}

function getStaffFreshViewLabel(view = "") {
  return STAFF_VIEW_META[view]?.badge || "Updates";
}

function getStaffFreshNoticeMessage(view = "", freshCount = 0) {
  const viewLabel = getStaffFreshViewLabel(view);
  const itemLabelMap = {
    orders: ["order", "orders"],
    kds: ["kitchen order", "kitchen orders"],
    support: ["support request", "support requests"],
    reservations: ["reservation", "reservations"],
    inquiries: ["inquiry", "inquiries"],
    contacts: ["contact message", "contact messages"],
    testimonials: ["testimonial", "testimonials"]
  };
  const [singularLabel, pluralLabel] = itemLabelMap[view] || ["record", "records"];
  const safeCount = Number(freshCount) || 0;

  return safeCount > 1
    ? `${safeCount} new ${pluralLabel} in ${viewLabel}`
    : `New ${singularLabel} in ${viewLabel}`;
}

function getStaffBrowserAlertPayload(view = "", newRecords = []) {
  if (!Array.isArray(newRecords) || !newRecords.length) {
    return null;
  }

  const primaryRecord = newRecords[0] || {};
  const count = newRecords.length;

  if (view === "orders") {
    const sourceMeta = getStaffOrderSourceMeta(primaryRecord);
    const totalLabel = formatMoney(getStaffOrderTotal(primaryRecord));
    const customerLabel = primaryRecord.customerName || "Guest";
    const detailParts = [customerLabel];

    if (sourceMeta.detail) {
      detailParts.push(sourceMeta.detail);
    }

    if (totalLabel) {
      detailParts.push(totalLabel);
    }

    return {
      title: count > 1 ? `${count} new orders received` : `New ${sourceMeta.label} order`,
      body: count > 1 ? `${detailParts.join(" | ")} | plus ${count - 1} more` : detailParts.join(" | "),
      tag: `staff-order-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
    };
  }

  if (view === "support") {
    const requestType = normalizeStatus(primaryRecord.requestType) === "bill" ? "Bill request" : "Staff help";
    const detailParts = [
      requestType,
      primaryRecord.tableNumber ? `Table ${primaryRecord.tableNumber}` : "",
      primaryRecord.orderId ? `Order ${primaryRecord.orderId}` : ""
    ].filter(Boolean);

    return {
      title: count > 1 ? `${count} new support requests` : "New support request",
      body: count > 1 ? `${detailParts.join(" | ")} | plus ${count - 1} more` : detailParts.join(" | "),
      tag: `staff-support-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
    };
  }

  if (view === "reservations") {
    const detailParts = [
      primaryRecord.name || "Guest",
      primaryRecord.date || "",
      primaryRecord.time || ""
    ].filter(Boolean);

    return {
      title: count > 1 ? `${count} new reservations` : "New reservation",
      body: count > 1 ? `${detailParts.join(" | ")} | plus ${count - 1} more` : detailParts.join(" | "),
      tag: `staff-reservation-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
    };
  }

  if (view === "inquiries") {
    const detailParts = [
      primaryRecord.name || "Guest",
      primaryRecord.eventType || "Event inquiry",
      primaryRecord.date || ""
    ].filter(Boolean);

    return {
      title: count > 1 ? `${count} new inquiries` : "New inquiry",
      body: count > 1 ? `${detailParts.join(" | ")} | plus ${count - 1} more` : detailParts.join(" | "),
      tag: `staff-inquiry-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
    };
  }

  if (view === "contacts") {
    const detailParts = [
      primaryRecord.name || "Guest",
      primaryRecord.subject || "Website contact"
    ].filter(Boolean);

    return {
      title: count > 1 ? `${count} new contact messages` : "New contact message",
      body: count > 1 ? `${detailParts.join(" | ")} | plus ${count - 1} more` : detailParts.join(" | "),
      tag: `staff-contact-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
    };
  }

  if (view === "testimonials") {
    const stars = Number.isFinite(Number(primaryRecord.stars))
      ? `${Number(primaryRecord.stars)} star${Number(primaryRecord.stars) === 1 ? "" : "s"}`
      : "";
    const detailParts = [
      primaryRecord.name || "Guest",
      stars
    ].filter(Boolean);

    return {
      title: count > 1 ? `${count} new testimonials` : "New testimonial",
      body: count > 1 ? `${detailParts.join(" | ")} | plus ${count - 1} more` : detailParts.join(" | "),
      tag: `staff-testimonial-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
    };
  }

  return {
    title: getStaffFreshNoticeMessage(view, count),
    body: `${count} new record${count === 1 ? "" : "s"} available now.`,
    tag: `staff-generic-alert-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`
  };
}

function showStaffRecordBrowserAlert(view = "", newRecords = []) {
  if (!Array.isArray(newRecords) || !newRecords.length || !isStaffBrowserAlertActive()) {
    return false;
  }

  const payload = getStaffBrowserAlertPayload(view, newRecords);
  if (!payload) {
    return false;
  }

  return showStaffBrowserNotification(payload.title, payload.body, {
    tag: payload.tag,
    renotify: true,
    onClick(notification) {
      try {
        window.focus();
      } catch (error) {
        console.warn("Staff browser alert focus failed:", error);
      }

      openStaffView(view || "orders");
      notification.close();
    }
  });
}

function handleStaffFreshRecords(
  view = "",
  newRecords = [],
  { playSound = true, showBrowserAlert = true } = {}
) {
  if (!Array.isArray(newRecords) || !newRecords.length) {
    return false;
  }

  markStaffFreshData(view);
  staffAutoRefreshFreshCounts[view] =
    (Number(staffAutoRefreshFreshCounts[view]) || 0) + newRecords.length;

  if (playSound && !staffAutoRefreshSoundPlayed) {
    playStaffAlertTone();
    staffAutoRefreshSoundPlayed = true;
  }

  if (showBrowserAlert) {
    showStaffRecordBrowserAlert(view, newRecords);
  }

  return true;
}

function resetStaffAutoRefreshFreshSummary() {
  staffAutoRefreshFreshCounts = {};
}

function getStaffNotificationCardDefinition(cardKey = "") {
  return window.StaffNotificationCards?.getCardDefinition(cardKey) || null;
}

function getStaffNotificationCardKeysForView(view = "") {
  return window.StaffNotificationCards?.getCardKeysForView(view) || [];
}
function getStaffNotificationCardKeyForOrderSource(sourceCard = "") {
  const normalizedSource = normalizeStatus(sourceCard);
  return Object.entries(window.StaffNotificationCards?.CARD_DEFINITIONS || {})
    .find(([, definition]) => definition.sourceCard === normalizedSource)?.[0] || "";
}


function getStaffNotificationCardUnread(cardKey = "") {
  const serverUnread = Math.max(0, Math.floor(Number(STAFF_STATE.notificationCards?.[cardKey]?.unread || 0) || 0));
  const fallbackUnread = cardKey === "website-room-bookings"
    ? Math.max(0, Math.floor(Number(STAFF_STATE.roomWebsiteFallbackUnread || 0) || 0))
    : 0;
  return serverUnread + fallbackUnread;
}

function isStaffNotificationCardUnreadLowerBound(cardKey = "") {
  return STAFF_STATE.notificationCards?.[cardKey]?.unreadIsLowerBound === true;
}

function getStaffNotificationViewUnread(view = "") {
  return getStaffNotificationCardKeysForView(view).reduce(
    (total, cardKey) => total + getStaffNotificationCardUnread(cardKey),
    0
  );
}

function isStaffNotificationViewUnreadLowerBound(view = "") {
  return getStaffNotificationCardKeysForView(view).some(
    (cardKey) => isStaffNotificationCardUnreadLowerBound(cardKey)
  );
}

function formatStaffCount(count = 0, { lowerBound = false, compactAt = 999 } = {}) {
  const safeCount = Math.max(0, Math.floor(Number(count || 0) || 0));
  if (lowerBound) return `${safeCount}+`;
  if (safeCount > compactAt) return `${compactAt}+`;
  return String(safeCount);
}

function ensureStaffNotificationLiveRegion() {
  let region = $("#staffNotificationLiveRegion");
  if (region) return region;

  region = document.createElement("div");
  region.id = "staffNotificationLiveRegion";
  region.className = "staff-sr-only";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "true");
  document.body.appendChild(region);
  return region;
}

function ensureStaffViewActivityLabel(button) {
  if (!button) return null;
  let label = button.querySelector("[data-staff-notification-activity]");
  if (label) return label;

  label = document.createElement("span");
  label.className = "staff-view-tab-activity";
  label.dataset.staffNotificationActivity = "true";
  label.hidden = true;
  button.appendChild(label);
  return label;
}

function renderStaffNotificationCards() {
  const definitions = window.StaffNotificationCards?.CARD_DEFINITIONS || {};
  const orderSourceCounts = { qr: 0, staff: 0, website: 0 };

  Object.entries(definitions).forEach(([cardKey, definition]) => {
    if (definition?.view !== "orders" || !definition?.sourceCard) return;
    orderSourceCounts[definition.sourceCard] = getStaffNotificationCardUnread(cardKey);
  });
  STAFF_STATE.orderSourceFreshCounts = orderSourceCounts;
  renderStaffOrderSourceCards(STAFF_STATE.orders);
  renderStaffRoomBookingSourceHub?.();

  const views = Array.from(new Set(Object.values(definitions).map((definition) => definition.view)));
  views.forEach((view) => {
    const button = document.querySelector(`.staff-view-tab[data-staff-view="${view}"]`);
    if (!button || button.hidden || !canStaffAccessView(view)) return;

    const unread = getStaffNotificationViewUnread(view);
    const unreadIsLowerBound = isStaffNotificationViewUnreadLowerBound(view);
    const displayUnread = formatStaffCount(unread, { lowerBound: unreadIsLowerBound });
    const activityLabel = ensureStaffViewActivityLabel(button);
    const shouldHighlight = unread > 0 && (view === "rooms" || STAFF_STATE.activeView !== view);
    button.classList.toggle("has-fresh-data", shouldHighlight);
    button.dataset.notificationUnread = String(unread);
    button.dataset.notificationUnreadLowerBound = String(unreadIsLowerBound);

    if (activityLabel) {
      activityLabel.hidden = unread <= 0;
      activityLabel.textContent = unread > 0 ? displayUnread : "";
      const activityDescription = unread > 0
        ? `${displayUnread} unread notification${unread === 1 && !unreadIsLowerBound ? "" : "s"}`
        : "";
      activityLabel.title = activityDescription;
      activityLabel.setAttribute("aria-label", activityDescription);
      activityLabel.setAttribute(
        "aria-label",
        unread === 1 ? "1 new notification" : `${unread} new notifications`
      );
    }
  });
}

function getUnseenStaffNotificationEvents(events = []) {
  const hotelSlug = STAFF_STATE.staffUser?.hotelSlug || "";
  const unseenEvents = [];

  (Array.isArray(events) ? events : []).forEach((event) => {
    const eventKey = window.StaffNotificationCards?.buildNotificationEventKey(event, hotelSlug) || "";
    if (!eventKey || STAFF_STATE.notificationSeenEventKeys.has(eventKey)) return;
    STAFF_STATE.notificationSeenEventKeys.add(eventKey);
    unseenEvents.push(event);
  });

  if (STAFF_STATE.notificationSeenEventKeys.size > 1000) {
    STAFF_STATE.notificationSeenEventKeys = new Set(
      Array.from(STAFF_STATE.notificationSeenEventKeys).slice(-500)
    );
  }

  return unseenEvents;
}

function showStaffNotificationSummaryAlert(events = []) {
  if (!Array.isArray(events) || !events.length) return false;

  const firstEvent = events[0];
  const definition = getStaffNotificationCardDefinition(firstEvent.cardKey);
  if (!definition) return false;

  const count = events.length;
  const isReview = firstEvent.cardKey === "testimonials";
  const title = isReview
    ? count > 1 ? `${count} new reviews received` : "New review received"
    : count > 1 ? `${count} new operational updates` : `New activity in ${definition.label}`;
  const body = isReview
    ? "Approval is required before the review appears on the website."
    : `${definition.label} has new activity requiring attention.`;

  ensureStaffNotificationLiveRegion().textContent = `${title}. ${body}`;
  showStaffBrowserNotification(title, body, {
    tag: `staff-card-${firstEvent.cardKey}-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`,
    renotify: true,
    onClick(notification) {
      try {
        window.focus();
      } catch (error) {
        console.warn("Staff notification focus failed:", error);
      }
      openStaffView(definition.view);
      if (firstEvent.cardKey === "website-room-bookings") {
        showProfessionalRoomView?.("bookings", { historyMode: "replace", focus: true });
        selectStaffRoomBookingSource("website", { historyMode: "replace", load: true, acknowledge: true });
      }
      notification.close();
    }
  });
  return true;
}

function applyStaffNotificationSummary(result = {}) {
  const resultHotelSlug = String(result.hotelSlug || "").trim().toLowerCase();
  const sessionHotelSlug = String(STAFF_STATE.staffUser?.hotelSlug || "").trim().toLowerCase();
  if (!resultHotelSlug || resultHotelSlug !== sessionHotelSlug) {
    return false;
  }

  const version = Math.max(0, Number(result.version || 0) || 0);
  if (STAFF_STATE.notificationSummaryInitialized && version < STAFF_STATE.notificationSummaryVersion) {
    return false;
  }

  const cards = result.cards && typeof result.cards === "object" ? result.cards : {};
  const recentEvents = Array.isArray(result.recentEvents) ? result.recentEvents : [];
  const nextCards = {};

  Object.entries(cards).forEach(([cardKey, card]) => {
    const definition = getStaffNotificationCardDefinition(cardKey);
    if (!definition || !canStaffAccessView(definition.view)) return;

    const localCursor = Math.max(
      0,
      Number(STAFF_STATE.notificationLocalAcknowledgedThrough?.[cardKey] || 0) || 0
    );
    const serverCursor = Math.max(0, Number(card?.acknowledgedThroughId || 0) || 0);
    const latestEventId = Math.max(0, Number(card?.latestEventId || 0) || 0);
    const serverUnread = Math.max(0, Math.floor(Number(card?.unread || 0) || 0));
    const unreadEventIds = Array.isArray(card?.unreadEventIds)
      ? Array.from(new Set(card.unreadEventIds.map((id) => Math.max(0, Number(id || 0) || 0))) )
      : recentEvents
          .filter((event) => event.cardKey === cardKey)
          .map((event) => Math.max(0, Number(event.id || 0) || 0));
    const hasNewerLocalCursor = localCursor > serverCursor;
    const unread = hasNewerLocalCursor
      ? localCursor >= latestEventId
        ? 0
        : unreadEventIds.filter((eventId) => eventId > localCursor).length
      : serverUnread;

    nextCards[cardKey] = {
      ...card,
      unread,
      unreadIsLowerBound: hasNewerLocalCursor ? false : card?.unreadIsLowerBound === true
    };
  });

  const wasInitialized = STAFF_STATE.notificationSummaryInitialized;
  if (Number(nextCards["website-room-bookings"]?.unread || 0) > 0) {
    STAFF_STATE.roomWebsiteFallbackUnread = 0;
    setStaffRoomBookingSessionCount("unread", 0);
  }
  STAFF_STATE.notificationCards = nextCards;
  STAFF_STATE.notificationSummaryVersion = version;
  STAFF_STATE.notificationAcknowledgementAvailable = result.acknowledgementAvailable === true;
  const unseenEvents = getUnseenStaffNotificationEvents(recentEvents);
  STAFF_STATE.notificationSummaryInitialized = true;
  renderStaffNotificationCards();

  const recordRefreshViews = STAFF_STATE.activeView === "dashboard"
    ? ["orders", "support"]
    : [STAFF_STATE.activeView];
  const summaryOnlyEvents = unseenEvents.filter(
    (event) => event.cardKey === "website-room-bookings" ||
      !recordRefreshViews.includes(getStaffNotificationCardDefinition(event.cardKey)?.view)
  );
  if (wasInitialized && summaryOnlyEvents.length) {
    playStaffAlertTone();
    staffAutoRefreshSoundPlayed = true;
    showStaffNotificationSummaryAlert(summaryOnlyEvents);
  }

  return true;
}

async function loadStaffNotificationSummary({ silent = true } = {}) {
  try {
    const result = await staffFetchJson(`${STAFF_API_BASE}/notifications/summary`);
    return applyStaffNotificationSummary(result);
  } catch (error) {
    if (!silent) {
      console.warn("Staff notification summary load failed:", error);
    }
    return false;
  }
}

async function acknowledgeStaffNotificationCard(cardKey = "") {
  const definition = getStaffNotificationCardDefinition(cardKey);
  if (!definition || !canStaffAccessView(definition.view)) return false;

  const latestEventId = Math.max(
    0,
    Number(STAFF_STATE.notificationCards?.[cardKey]?.latestEventId || 0) || 0
  );
  const previousLocalCursor = Math.max(
    0,
    Number(STAFF_STATE.notificationLocalAcknowledgedThrough?.[cardKey] || 0) || 0
  );
  const previousCard = STAFF_STATE.notificationCards?.[cardKey]
    ? { ...STAFF_STATE.notificationCards[cardKey] }
    : null;
  const previousRoomFallbackUnread = STAFF_STATE.roomWebsiteFallbackUnread;
  if (cardKey === "website-room-bookings") {
    STAFF_STATE.roomWebsiteFallbackUnread = 0;
    setStaffRoomBookingSessionCount("unread", 0);
  }

  STAFF_STATE.notificationLocalAcknowledgedThrough = {
    ...STAFF_STATE.notificationLocalAcknowledgedThrough,
    [cardKey]: Math.max(previousLocalCursor, latestEventId)
  };
  STAFF_STATE.notificationCards = {
    ...STAFF_STATE.notificationCards,
    [cardKey]: {
      ...(STAFF_STATE.notificationCards?.[cardKey] || {}),
      unread: 0,
      unreadIsLowerBound: false
    }
  };
  renderStaffNotificationCards();

  try {
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/notifications/cards/${encodeURIComponent(cardKey)}/acknowledge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedThroughId: latestEventId })
      }
    );
    const confirmedCursor = Math.max(
      latestEventId,
      Number(result?.acknowledgedThroughId || 0) || 0
    );
    STAFF_STATE.notificationLocalAcknowledgedThrough = {
      ...STAFF_STATE.notificationLocalAcknowledgedThrough,
      [cardKey]: confirmedCursor
    };
    return true;
  } catch (error) {
    if (error?.code === "notification_acknowledgements_not_ready") {
      console.info("Notification acknowledgement is session-only until storage is initialized.");
      return false;
    }

    if (
      Number(STAFF_STATE.notificationLocalAcknowledgedThrough?.[cardKey] || 0) ===
      Math.max(previousLocalCursor, latestEventId)
    ) {
      STAFF_STATE.notificationLocalAcknowledgedThrough = {
        ...STAFF_STATE.notificationLocalAcknowledgedThrough,
        [cardKey]: previousLocalCursor
      };
      if (previousCard) {
        STAFF_STATE.notificationCards = {
          ...STAFF_STATE.notificationCards,
          [cardKey]: previousCard
        };
      }
      if (cardKey === "website-room-bookings") {
        STAFF_STATE.roomWebsiteFallbackUnread = previousRoomFallbackUnread;
        setStaffRoomBookingSessionCount("unread", previousRoomFallbackUnread);
      }
      renderStaffNotificationCards();
    }
    console.warn("Staff notification acknowledgement failed:", error);
    void loadStaffNotificationSummary({ silent: true });
    return false;
  }
}

function acknowledgeStaffNotificationView(view = "") {
  if (["orders", "rooms"].includes(view)) return;
  getStaffNotificationCardKeysForView(view).forEach((cardKey) => {
    if (getStaffNotificationCardUnread(cardKey) > 0) {
      void acknowledgeStaffNotificationCard(cardKey);
    }
  });
}
function getStaffAutoRefreshFreshNoticeMessage() {
  const freshEntries = Object.entries(staffAutoRefreshFreshCounts).filter(
    ([, count]) => Number(count) > 0
  );

  if (!freshEntries.length) {
    return "";
  }

  if (freshEntries.length === 1) {
    const [view, count] = freshEntries[0];
    return getStaffFreshNoticeMessage(view, count);
  }

  const viewLabels = freshEntries.map(([view]) => getStaffFreshViewLabel(view));

  if (viewLabels.length === 2) {
    return `New activity in ${viewLabels[0]} and ${viewLabels[1]}`;
  }

  const leadingLabels = viewLabels.slice(0, -1);
  const lastLabel = viewLabels[viewLabels.length - 1];
  return `New activity in ${leadingLabels.join(", ")}, and ${lastLabel}`;
}

function resetStaffDashboardState() {
  if (staffSelectedTableOrderRequestController) {
    staffSelectedTableOrderRequestController.abort();
    staffSelectedTableOrderRequestController = null;
  }
  if (staffKdsRequestController) {
    staffKdsRequestController.abort();
    staffKdsRequestController = null;
  }
  if (staffTableOrderSearchTimer) {
    window.clearTimeout(staffTableOrderSearchTimer);
    staffTableOrderSearchTimer = null;
  }
  resetStaffAutoRefreshFreshSummary();
  destroyStaffDashboardTrendChart();
  STAFF_STATE.staffUser = null;
  STAFF_STATE.featureConfig = normalizeStaffFeatureConfig();
  STAFF_STATE.activeView = "dashboard";
  STAFF_STATE.orders = [];
  STAFF_STATE.ordersRenderSignature = "";
  STAFF_STATE.selectedOrderSourceCard = "";
  STAFF_STATE.orderSourceFreshCounts = { qr: 0, staff: 0, website: 0 };
  STAFF_STATE.expandedOrderIds = new Set();
  renderStaffOrderSourceCards([]);
  STAFF_STATE.kdsOrders = [];
  STAFF_STATE.kdsCounts = {};
  STAFF_STATE.kdsFreshOrderIds = {};
  STAFF_STATE.kdsStatusFilter = "all";
  STAFF_STATE.kdsHideServed = false;
  STAFF_STATE.kdsHideCancelled = false;
  STAFF_STATE.kdsSortMode = "newest";
  STAFF_STATE.kdsDefaultVisibilityApplied = false;
  STAFF_STATE.tableOrderMenu = [];
  STAFF_STATE.tableOrderMenuVersion = "";
  STAFF_STATE.tableOrderMenuRenderLimit = STAFF_TABLE_ORDER_RENDER_BATCH_SIZE;
  STAFF_STATE.tableOrderCart = {};
  STAFF_STATE.tableOrderItemNotes = {};
  STAFF_STATE.tableOrderMode = "create";
  STAFF_STATE.tableOrderTarget = null;
  STAFF_STATE.tableOrderIdempotencyKey = "";
  STAFF_STATE.roomServiceCart = {};
  STAFF_STATE.tableOrdering = null;
  STAFF_STATE.tableOrderMenuLoaded = false;
  STAFF_STATE.tableOrderMenuQuery = "";
  STAFF_STATE.tableOrderMenuCategory = "all";
  STAFF_STATE.tableOrderSubview = "home";
  STAFF_STATE.tableActivity = [];
  STAFF_STATE.tableFloor = [];
  STAFF_STATE.tableActivityLoaded = false;
  STAFF_STATE.tableActivityRenderSignature = "";
  STAFF_STATE.tableMaster = [];
  STAFF_STATE.tableMasterLoaded = false;
  STAFF_STATE.selectedRestaurantTableId = "";
  STAFF_STATE.tableActivityQuery = "";
  STAFF_STATE.tableActivityStatus = "all";
  STAFF_STATE.selectedTableNumber = "";
  STAFF_STATE.selectedTableOrderId = "";
  STAFF_STATE.selectedTableOrder = null;
  STAFF_STATE.selectedTableOrderRenderSignature = "";
  STAFF_STATE.tableActivityScrollTop = 0;
  STAFF_STATE.tableOrderDetailScrollTop = 0;
  STAFF_STATE.tableOrderDetailNotice = "";
  STAFF_STATE.tableOrderConflict = null;
  STAFF_STATE.dashboardReports = null;
  STAFF_STATE.dashboardReportsFreshnessLabel = "";
  STAFF_STATE.dashboardReportsError = false;
  STAFF_STATE.dashboardTrend = null;
  STAFF_STATE.dashboardTrendError = false;
  STAFF_STATE.itemSalesReports = null;
  STAFF_STATE.itemSalesReportsError = false;
  STAFF_STATE.businessReport = null;
  STAFF_STATE.businessReportType = "food";
  STAFF_STATE.businessReportLoaded = false;
  STAFF_STATE.supportRequests = [];
  STAFF_STATE.reservations = [];
  STAFF_STATE.rooms = [];
  STAFF_STATE.roomBookings = [];
  STAFF_STATE.roomBookingSource = "website";
  STAFF_STATE.roomBookingPage = 1;
  STAFF_STATE.roomBookingPagination = { page: 1, limit: 25, total: 0, totalPages: 1, hasPrevious: false, hasNext: false };
  STAFF_STATE.roomBookingUrlInitialized = false;
  STAFF_STATE.roomBookingSummaryInitialized = false;
  STAFF_STATE.roomBookingDetails = {};
  STAFF_STATE.selectedRoomBookingId = "";
  STAFF_STATE.selectedRoomBookingTrigger = null;
  STAFF_STATE.roomBookingDetailRequestId += 1;
  STAFF_STATE.roomBookingListRequestId += 1;
  STAFF_STATE.roomOperationsRooms = [];
  STAFF_STATE.roomOperationsPeriod = { checkInDate: "", checkOutDate: "" };
  STAFF_STATE.roomOperationsView = "home";
  STAFF_STATE.selectedRoomOperationId = "";
  STAFF_STATE.selectedRoomOperationTrigger = null;
  STAFF_STATE.roomOperationDetails = {};
  STAFF_STATE.roomCheckoutSummaries = {};
  STAFF_STATE.roomCheckoutBills = {};
  STAFF_STATE.inquiries = [];
  STAFF_STATE.contactSubmissions = [];
  STAFF_STATE.testimonials = [];
  STAFF_STATE.kdsOrdersLoaded = false;
  STAFF_STATE.supportRequestsLoaded = false;
  STAFF_STATE.reservationsLoaded = false;
  STAFF_STATE.roomsLoaded = false;
  STAFF_STATE.inquiriesLoaded = false;
  STAFF_STATE.contactSubmissionsLoaded = false;
  STAFF_STATE.testimonialsLoaded = false;
  STAFF_STATE.notificationCards = {};
  STAFF_STATE.notificationSummaryVersion = 0;
  STAFF_STATE.notificationSummaryInitialized = false;
  STAFF_STATE.notificationAcknowledgementAvailable = false;
  STAFF_STATE.notificationLocalAcknowledgedThrough = {};
  STAFF_STATE.notificationSeenEventKeys = new Set();
  if (staffOrdersSearchTimer) {
    window.clearTimeout(staffOrdersSearchTimer);
    staffOrdersSearchTimer = null;
  }
  applyStaffRoleWorkspaceAccess({});
  showStaffView("dashboard");
  renderStaffWorkspaceOrderingBadge("dashboard");
  setStaffDashboardSummaryEmpty("Login to load the dashboard summary.");
  clearStaffOrdersOperationalSummary();
  clearStaffOrdersActionStatus();
  setStaffReportsLoading("Open this view to load hotel-scoped business reports.", false);
  setStaffSectionLastUpdated("#staffDashboardLastUpdated", "Not refreshed yet");
  setStaffSectionLastUpdated("#staffReportsLastUpdated", "Reports not loaded yet");
  setStaffSectionLastUpdated("#staffRoomsLastUpdated", "Not refreshed yet");
  setStaffKdsLiveStatus("Kitchen waiting", "muted");
  renderStaffTableOrderMenu();
  renderStaffTableOrderCart();
  clearStaffKdsFilterStatus();
  syncStaffKdsFilterControls();
  updateStaffViewTabCounts();
}

function setStaffLoginStatus(message = "", isError = false) {
  const status = $("#staffLoginStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-error", !!isError);
}

function setStaffLiveRefreshStatus(message = "Live updates on", mode = "live") {
  const status = $("#staffLiveRefreshStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-live", mode === "live");
  status.classList.toggle("is-warning", mode === "warning");
  status.classList.toggle("is-muted", mode === "muted");
  updateStaffDashboardOperationalStatusMirrors();
}

function updateStaffKitchenDisplayAlert(message = "", mode = "muted") {
  const alert = $("#staffKitchenDisplayAlert");
  if (!alert) return;

  if (!isStaffKdsDisplayMode() || mode !== "warning") {
    alert.hidden = true;
    return;
  }

  const safeMessage = String(message || "").trim();
  alert.hidden = false;
  alert.textContent = safeMessage
    ? `${safeMessage}. Check the network or refresh this display.`
    : "Kitchen updates are temporarily unavailable. Check the network or refresh this display.";
}

function setStaffKdsLiveStatus(message = "Kitchen live", mode = "live") {
  const status = $("#staffKdsLiveStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-live", mode === "live");
  status.classList.toggle("is-warning", mode === "warning");
  status.classList.toggle("is-muted", mode === "muted");

  updateStaffKitchenDisplayAlert(message, mode);
}

function updateStaffKitchenDisplayClock(value = new Date()) {
  const badge = $("#staffKitchenDisplayClock");
  const serverNow = new Date(value.getTime() + Number(STAFF_STATE.kdsServerClockOffsetMs || 0));
  if (badge) badge.textContent = formatStaffDisplayClock(serverNow) || "--:--";
  document.querySelectorAll("[data-staff-kds-created-at]").forEach((timer) => {
    const createdAt = Date.parse(timer.getAttribute("data-staff-kds-created-at") || "");
    if (!Number.isFinite(createdAt)) return;
    const elapsedSeconds = Math.max(0, Math.floor((serverNow.getTime() - createdAt) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timer.textContent = `Waiting ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    timer.setAttribute("aria-label", `Waiting ${minutes} minutes ${seconds} seconds`);
  });
}

function updateStaffKitchenDisplayFreshness(message = "Kitchen refresh waiting") {
  const badge = $("#staffKitchenDisplayFreshness");
  if (!badge) return;

  badge.textContent = message || "Kitchen refresh waiting";
  updateStaffDashboardOperationalStatusMirrors();
}

function stopStaffKitchenDisplayClock() {
  if (!staffKitchenDisplayClockTimer) {
    return;
  }

  window.clearInterval(staffKitchenDisplayClockTimer);
  staffKitchenDisplayClockTimer = null;
}

function startStaffKitchenDisplayClock() {
  stopStaffKitchenDisplayClock();

  if (!isStaffKdsDisplayMode()) {
    return;
  }

  updateStaffKitchenDisplayClock();
  staffKitchenDisplayClockTimer = window.setInterval(() => {
    if (!document.hidden) updateStaffKitchenDisplayClock();
  }, 1000);
}

function canUseStaffFullscreen() {
  return (
    isStaffKdsDisplayMode() &&
    document.fullscreenEnabled === true &&
    typeof document.documentElement?.requestFullscreen === "function"
  );
}

function isStaffFullscreenActive() {
  return Boolean(document.fullscreenElement);
}

function updateStaffFullscreenToggle() {
  const button = $("#staffFullscreenToggleBtn");
  if (!button) return;

  const canUse = canUseStaffFullscreen();
  button.hidden = !canUse;

  if (!canUse) {
    button.setAttribute("aria-pressed", "false");
    button.classList.remove("is-active");
    button.textContent = "Enter Fullscreen";
    return;
  }

  const isActive = isStaffFullscreenActive();
  button.setAttribute("aria-pressed", String(isActive));
  button.classList.toggle("is-active", isActive);
  button.textContent = isActive ? "Exit Fullscreen" : "Enter Fullscreen";
}

async function toggleStaffFullscreen() {
  if (!canUseStaffFullscreen()) {
    updateStaffFullscreenToggle();
    return;
  }

  try {
    if (isStaffFullscreenActive() && typeof document.exitFullscreen === "function") {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.error("Staff fullscreen toggle failed:", error);
    setStaffKdsLiveStatus("Fullscreen unavailable", "warning");
    setStaffLiveRefreshStatus("Fullscreen unavailable", "warning");
  } finally {
    updateStaffFullscreenToggle();
  }
}

function flashStaffLiveRefreshNotice(
  message = "New order detected",
  mode = "warning",
  durationMs = 6000
) {
  if (staffLiveRefreshNoticeTimer) {
    window.clearTimeout(staffLiveRefreshNoticeTimer);
    staffLiveRefreshNoticeTimer = null;
  }

  staffLiveRefreshOverrideActive = true;
  setStaffLiveRefreshStatus(message, mode);

  staffLiveRefreshNoticeTimer = window.setTimeout(() => {
    staffLiveRefreshOverrideActive = false;
    setStaffLiveRefreshStatus(`Updated ${formatStaffRefreshTime()}`, "live");
    staffLiveRefreshNoticeTimer = null;
  }, durationMs);
}

function setStaffSectionLastUpdated(selector, message = "") {
  const element = $(selector);
  if (!element) return;

  element.textContent = message || "Not refreshed yet";

  if (selector === "#staffKdsLastUpdated") {
    updateStaffKitchenDisplayFreshness(message || "Kitchen refresh waiting");
  }
}

function getStaffViewMeta(view = "dashboard") {
  return STAFF_VIEW_META[view] || STAFF_VIEW_META.dashboard;
}

function updateStaffWorkspaceContext(view = "dashboard") {
  const meta = getStaffViewMeta(view);
  const title = $("#staffWorkspaceTitle");
  const badge = $("#staffWorkspaceViewBadge");
  const description = $("#staffWorkspaceDescription");

  if (title) title.textContent = meta.title;
  if (badge) badge.textContent = meta.badge;
  if (description) description.textContent = meta.description;
  if (view === "dashboard") updateStaffDashboardOverviewDateLabel();
  renderStaffWorkspaceOrderingBadge(view);
}

function renderStaffWorkspaceOrderingBadge(view = STAFF_STATE.activeView || "dashboard") {
  const badge = $("#staffWorkspaceOrderingBadge");
  if (!badge) return;

  if (view !== "table-order") {
    badge.hidden = true;
    badge.classList.remove("is-live", "is-warning", "is-muted");
    badge.classList.add("is-muted");
    return;
  }

  const ordering = STAFF_STATE.tableOrdering;
  badge.hidden = false;
  badge.classList.remove("is-live", "is-warning", "is-muted");

  if (!ordering) {
    badge.classList.add("is-muted");
    badge.textContent = "Checking staff ordering";
    return;
  }

  if (ordering.staffOrderingEnabled !== false) {
    badge.classList.add("is-live");
    badge.textContent = "Staff ordering open";
    return;
  }

  badge.classList.add("is-warning");
  badge.textContent = "Staff ordering paused";
}

function updateStaffWorkspaceHotelBadge(staffUser = STAFF_STATE.staffUser || {}) {
  const badge = $("#staffWorkspaceHotelBadge");
  const sidebarHotelName = $("#staffSidebarHotelName");
  const sidebarRoleBadge = $("#staffSidebarRoleBadge");
  const hotelSlug = String(staffUser?.hotelSlug || "this hotel").trim() || "this hotel";
  const isManager = isStaffManagerSession(staffUser);

  if (badge) {
    badge.textContent = `Hotel: ${hotelSlug}`;
  }

  if (sidebarHotelName) {
    sidebarHotelName.textContent = hotelSlug;
  }

  if (sidebarRoleBadge) {
    sidebarRoleBadge.textContent = isManager ? "Owner access" : "Staff access";
    sidebarRoleBadge.classList.toggle("is-owner", isManager);
  }

  updateStaffReferenceHeader(staffUser);
}

function getStaffHeaderGreetingPeriod(date = new Date()) {
  const hour = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getHours() : 12;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getStaffHeaderDisplayTarget(staffUser = STAFF_STATE.staffUser || {}) {
  const displayName = String(staffUser?.displayName || "").trim();
  const hotelSlug = String(staffUser?.hotelSlug || "this hotel").trim() || "this hotel";
  return displayName && displayName.toLowerCase() !== "staff" ? displayName : hotelSlug;
}

function getStaffHeaderInitials(value = "") {
  const parts = String(value || "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);

  if (!parts.length) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase() || "S";
}

function updateStaffHeaderSearchOptions(staffUser = STAFF_STATE.staffUser || {}) {
  const options = $("#staffHeaderSearchOptions");
  if (!options) return;

  const fragment = document.createDocumentFragment();
  getAllowedStaffViews(staffUser).forEach((view) => {
    const option = document.createElement("option");
    option.value = getStaffViewMeta(view).badge;
    option.dataset.staffView = view;
    fragment.appendChild(option);
  });
  options.replaceChildren(fragment);
}

function updateStaffReferenceHeader(staffUser = STAFF_STATE.staffUser || {}) {
  const greeting = $("#staffHeaderGreeting");
  const displayName = $("#staffHeaderDisplayName");
  const roleLabel = $("#staffHeaderRoleLabel");
  const avatar = $("#staffHeaderAvatarInitials");
  const displayTarget = getStaffHeaderDisplayTarget(staffUser);
  const sessionName = String(staffUser?.displayName || displayTarget).trim() || displayTarget;
  const isManager = isStaffManagerSession(staffUser);

  if (greeting) {
    greeting.textContent = `${getStaffHeaderGreetingPeriod()}, ${displayTarget}`;
  }
  if (displayName) {
    displayName.textContent = sessionName;
  }
  if (roleLabel) {
    roleLabel.textContent = isManager ? "Owner access" : "Staff access";
  }
  if (avatar) {
    avatar.textContent = getStaffHeaderInitials(sessionName || displayTarget);
  }

  updateStaffHeaderSearchOptions(staffUser);
}

function resolveStaffHeaderSearchView(value = "", staffUser = STAFF_STATE.staffUser || {}) {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return "";

  const candidates = getAllowedStaffViews(staffUser).map((view) => {
    const meta = getStaffViewMeta(view);
    return {
      view,
      labels: [view, view.replace(/-/g, " "), meta.badge, meta.title]
        .map((label) => String(label || "").trim().toLowerCase())
        .filter(Boolean)
    };
  });
  const exact = candidates.find((candidate) => candidate.labels.includes(query));
  if (exact) return exact.view;

  const prefix = candidates.find((candidate) =>
    candidate.labels.some((label) => label.startsWith(query))
  );
  if (prefix) return prefix.view;

  return candidates.find((candidate) =>
    candidate.labels.some((label) => label.includes(query))
  )?.view || "";
}

function submitStaffHeaderSearch() {
  const input = $("#staffHeaderSearchInput");
  if (!input) return;

  const query = String(input.value || "").trim();
  if (!query) {
    input.setCustomValidity("");
    return;
  }

  const view = resolveStaffHeaderSearchView(query);
  if (!view) {
    input.setCustomValidity("Choose an available workspace section.");
    input.reportValidity();
    return;
  }

  input.setCustomValidity("");
  openStaffView(view);
  input.value = "";
  input.blur();
}

function setStaffProfileMenuExpanded(isExpanded = false, { returnFocus = false } = {}) {
  const button = $("#staffProfileMenuButton");
  const menu = $("#staffProfileMenu");
  if (!button || !menu) return;

  const expanded = Boolean(isExpanded);
  button.setAttribute("aria-expanded", String(expanded));
  menu.hidden = !expanded;

  if (!expanded && returnFocus) {
    button.focus();
  }
}

function bindStaffReferenceHeader() {
  const form = $("#staffHeaderSearchForm");
  const input = $("#staffHeaderSearchInput");
  const profile = document.querySelector(".staff-reference-profile");
  const profileButton = $("#staffProfileMenuButton");
  const profileMenu = $("#staffProfileMenu");
  const logoutButton = $("#staffLogoutBtn");

  if (form && form.dataset.boundSubmit !== "true") {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitStaffHeaderSearch();
    });
    form.dataset.boundSubmit = "true";
  }

  if (input && input.dataset.boundInput !== "true") {
    input.addEventListener("input", () => input.setCustomValidity(""));
    input.dataset.boundInput = "true";
  }

  if (profileButton && profileButton.dataset.boundClick !== "true") {
    profileButton.addEventListener("click", () => {
      const expanded = profileButton.getAttribute("aria-expanded") === "true";
      setStaffProfileMenuExpanded(!expanded);
    });
    profileButton.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      setStaffProfileMenuExpanded(true);
      profileMenu?.querySelector('[role="menuitem"]')?.focus();
    });
    profileButton.dataset.boundClick = "true";
  }

  if (profileMenu && profileMenu.dataset.boundKeydown !== "true") {
    profileMenu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setStaffProfileMenuExpanded(false, { returnFocus: true });
    });
    profileMenu.dataset.boundKeydown = "true";
  }

  if (logoutButton && logoutButton.dataset.boundProfileClose !== "true") {
    logoutButton.addEventListener("click", () => setStaffProfileMenuExpanded(false));
    logoutButton.dataset.boundProfileClose = "true";
  }

  document.addEventListener("click", (event) => {
    if (!profile || profile.contains(event.target)) return;
    setStaffProfileMenuExpanded(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && profileButton?.getAttribute("aria-expanded") === "true") {
      setStaffProfileMenuExpanded(false, { returnFocus: true });
    }
  });
}
function updateStaffDashboardOverviewDateLabel(date = new Date()) {
  const label = $("#staffDashboardDateLabel");
  const button = $("#staffDashboardDateButton");
  if (!label && !button) return;

  const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const compactLabel = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  }).format(validDate);
  const accessibleLabel = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(validDate);

  if (label) label.textContent = compactLabel;
  if (button) {
    button.setAttribute("aria-label", `Open report date filters. Today is ${accessibleLabel}.`);
  }
}

function openStaffDashboardReportDateFilters() {
  if (!canStaffAccessView("reports")) return;

  openStaffView("reports");
  window.requestAnimationFrame(() => {
    $("#staffReportsRangeInput")?.focus();
  });
}

function bindStaffDashboardOverviewActions() {
  const dateButton = $("#staffDashboardDateButton");
  const newOrderButton = $("#staffDashboardNewOrderBtn");

  if (dateButton && dateButton.dataset.boundClick !== "true") {
    dateButton.addEventListener("click", openStaffDashboardReportDateFilters);
    dateButton.dataset.boundClick = "true";
  }

  if (newOrderButton && newOrderButton.dataset.boundClick !== "true") {
    newOrderButton.addEventListener("click", () => openStaffView("table-order"));
    newOrderButton.dataset.boundClick = "true";
  }

  updateStaffDashboardOverviewDateLabel();
}
function updateStaffRoleWorkspaceCopy(staffUser = STAFF_STATE.staffUser || {}) {
  const heroKicker = document.querySelector(".staff-dashboard-hero .staff-kicker");
  const heroCopy = document.querySelector(".staff-dashboard-hero .staff-dashboard-copy");
  const sidebarCopy = document.querySelector(".staff-sidebar-copy");
  const sidebarNote = document.querySelector(".staff-sidebar-note .staff-hint");

  if (isStaffManagerSession(staffUser)) {
    if (heroKicker) heroKicker.textContent = "Owner Workspace";
    if (heroCopy) {
      heroCopy.textContent =
        "A limited, hotel-scoped view for orders, billing, table support, rooms, reservations, inquiries, contact messages, and guest reviews. Open the section you need without leaving the workspace.";
    }
    if (sidebarCopy) {
      sidebarCopy.textContent =
        "Move between live hotel sections from one structured workspace while keeping the same limited hotel-scoped access model.";
    }
    if (sidebarNote) {
      sidebarNote.textContent =
        "Orders, rooms, reservations, inquiries, contacts, support requests, and testimonial moderation stay limited to the logged-in hotel only.";
    }
    return;
  }

  if (heroKicker) heroKicker.textContent = "Staff Workspace";
  if (heroCopy) {
    heroCopy.textContent =
      "A focused, hotel-scoped view for live orders, room visibility, billing actions, and table support. Keep day-to-day service moving without exposing manager reports or oversight sections.";
  }
  if (sidebarCopy) {
    sidebarCopy.textContent =
      "Move between live order and table-support sections while keeping this workspace focused on day-to-day hotel operations.";
  }
  if (sidebarNote) {
    sidebarNote.textContent =
      "Order records, room visibility, and table support stay limited to the logged-in hotel. Manager summaries and oversight sections stay hidden for this role.";
  }
}

function applyStaffRoleWorkspaceAccess(staffUser = STAFF_STATE.staffUser || {}) {
  const allowedViews = getAllowedStaffViews(staffUser);
  const defaultView = getDefaultStaffView(staffUser);
  const dashboardWrap = $("#staffDashboardWrap");
  const sectionCount = document.querySelector(".staff-sidebar-section-count");
  const isManager = isStaffManagerSession(staffUser);

  if (dashboardWrap) {
    dashboardWrap.dataset.staffRole = normalizeStaffRoleValue(staffUser?.role);
    dashboardWrap.dataset.staffBusinessType = getStaffFeatureConfig(staffUser).businessType;
  }

  document.querySelectorAll("[data-staff-view]").forEach((button) => {
    const view = button.dataset.staffView || "";
    const isAllowed = allowedViews.includes(view);
    button.hidden = !isAllowed;
    button.disabled = !isAllowed;
    button.tabIndex = isAllowed ? 0 : -1;

    if (!isAllowed) {
      button.classList.remove("is-active", "has-fresh-data");
      button.setAttribute("aria-selected", "false");
    }
  });

  document.querySelectorAll("[data-staff-manager-only]").forEach((element) => {
    if (element.hasAttribute("data-staff-manager-panel")) {
      if (!isManager) element.hidden = true;
      return;
    }
    element.hidden = !isManager;
  });

  if (sectionCount) {
    sectionCount.textContent = String(allowedViews.length);
    sectionCount.setAttribute("aria-label", `${allowedViews.length} available sections`);
  }

  updateStaffRoleWorkspaceCopy(staffUser);

  if (!canStaffAccessView(STAFF_STATE.activeView, staffUser)) {
    STAFF_STATE.activeView = defaultView;
  }

  document.querySelectorAll("[data-staff-requires-feature]").forEach((element) => {
    const requiredFeature = String(element.dataset.staffRequiresFeature || "").trim();
    element.hidden = !canStaffUseFeature(requiredFeature, staffUser);
  });

  renderStaffReportsCenter();
}

function isStaffCompactViewport() {
  return window.innerWidth <= 1080;
}

function isStaffMobileSidebarViewport() {
  return window.innerWidth <= 760;
}

function getStaffSidebarFocusableElements(sidebar = $("#staffSidebarNavigation")) {
  if (!sidebar) return [];

  return Array.from(
    sidebar.querySelectorAll(
      'button:not([disabled]):not([hidden]), a[href]:not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
    )
  ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);
}

function setStaffSidebarExpanded(
  isExpanded = true,
  { focusSidebar = false, restoreFocus = false } = {}
) {
  const dashboardWrap = $("#staffDashboardWrap");
  const sidebar = $("#staffSidebarNavigation");
  const toggleButton = $("#staffSidebarToggleBtn");
  const closeButton = $("#staffSidebarCloseBtn");
  const backdrop = $("#staffSidebarBackdrop");
  const expanded = !isStaffCompactViewport() ? true : !!isExpanded;
  const isMobileDrawer = isStaffMobileSidebarViewport();

  if (
    expanded &&
    isMobileDrawer &&
    document.activeElement instanceof HTMLElement &&
    !sidebar?.contains(document.activeElement)
  ) {
    staffSidebarLastFocusedElement = document.activeElement;
  }

  if (!expanded && isStaffCompactViewport() && restoreFocus) {
    const focusTarget =
      staffSidebarLastFocusedElement instanceof HTMLElement &&
      document.contains(staffSidebarLastFocusedElement)
        ? staffSidebarLastFocusedElement
        : toggleButton;
    focusTarget?.focus();
    staffSidebarLastFocusedElement = null;
  }

  if (dashboardWrap) {
    dashboardWrap.classList.toggle("is-sidebar-collapsed", !expanded);
  }

  if (sidebar) {
    sidebar.setAttribute("aria-hidden", String(isStaffCompactViewport() && !expanded));
    sidebar.inert = isStaffCompactViewport() && !expanded;
  }

  document.body.classList.toggle("is-staff-sidebar-open", isMobileDrawer && expanded);

  if (backdrop) {
    backdrop.setAttribute("aria-hidden", String(!isMobileDrawer || !expanded));
  }

  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", String(expanded));
    toggleButton.textContent = expanded ? "Close sections" : "Open sections";
  }

  if (expanded && isMobileDrawer && focusSidebar) {
    window.requestAnimationFrame(() => {
      const activeViewButton = sidebar?.querySelector("[data-staff-view].is-active:not([hidden])");
      (closeButton || activeViewButton)?.focus();
    });
  }

}

function syncStaffSidebarForViewport() {
  staffCompactViewport = isStaffCompactViewport();
  staffMobileSidebarViewport = isStaffMobileSidebarViewport();
  setStaffSidebarExpanded(!staffCompactViewport);
}

function handleStaffViewportChange() {
  const isCompact = isStaffCompactViewport();
  const isMobileDrawer = isStaffMobileSidebarViewport();
  if (
    isCompact === staffCompactViewport &&
    isMobileDrawer === staffMobileSidebarViewport
  ) return;

  staffCompactViewport = isCompact;
  staffMobileSidebarViewport = isMobileDrawer;
  setStaffSidebarExpanded(!isCompact);
}

function applyStaffPageMode() {
  document.body.classList.toggle("is-kds-display-mode", isStaffKdsDisplayMode());

  if (!isStaffKdsDisplayMode()) {
    return;
  }

  document.title = "Kitchen Display";

  const headerKicker = document.querySelector(".staff-header .staff-kicker");
  const headerTitle = document.querySelector(".staff-header .staff-title");
  const headerSub = document.querySelector(".staff-header .staff-sub");
  const loginTitle = document.querySelector("#staffLoginWrap .staff-panel-title");
  const loginHint = document.querySelector("#staffLoginWrap .staff-hint");
  const loginStatus = $("#staffLoginStatus");
  const workspaceTitle = $("#staffWorkspaceTitle");
  const workspaceBadge = $("#staffWorkspaceViewBadge");
  const workspaceDescription = $("#staffWorkspaceDescription");

  if (headerKicker) headerKicker.textContent = "Kitchen Display";
  if (headerTitle) headerTitle.textContent = "Live Kitchen Board";
  if (headerSub) {
    headerSub.innerHTML = "<b>Open one hotel's live kitchen queue on a dedicated display.</b>";
  }
  if (loginTitle) loginTitle.textContent = "Open kitchen display";
  if (loginHint) {
    loginHint.textContent =
      "Use the hotel slug and staff PIN created for that hotel. This screen opens directly into the live kitchen board.";
  }
  if (loginStatus) {
    loginStatus.textContent =
      "Enter the hotel slug and staff PIN to open this hotel's kitchen display.";
  }
  if (workspaceTitle) workspaceTitle.textContent = "Kitchen display system";
  if (workspaceBadge) workspaceBadge.textContent = "Kitchen";
  if (workspaceDescription) {
    workspaceDescription.textContent =
      "Follow live kitchen queues in one dedicated hotel-scoped display without opening the rest of the staff workspace.";
  }

  updateStaffKitchenDisplayFreshness("Kitchen refresh waiting");
  updateStaffKitchenDisplayClock();
  updateStaffKitchenDisplayAlert("", "muted");
}

function escapeHTML(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function formatMoney(value) {
  const numberValue = getNumberValue(value);
  return numberValue === null ? "Rs. 0.00" : `Rs. ${numberValue.toFixed(2)}`;
}

function formatOrderDate(value = "") {
  if (!value) return "Time not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatStaffRefreshTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStaffDisplayClock(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStaffLastUpdatedLabel(value = new Date()) {
  const time = formatStaffRefreshTime(value);
  return time ? `Updated ${time}` : "Updated just now";
}

function normalizeStatus(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isStaffGatewayControlledOrderStatus(status = "") {
  return STAFF_ORDER_PAYMENT_EXCEPTION_STATUSES.includes(normalizeStatus(status));
}

function getStaffOrderPaymentExceptionMeta(status = "") {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "payment_pending") {
    return {
      visible: true,
      className: "",
      message: "Online payment verification is still pending. Operational status changes stay locked until the payment flow resolves this order."
    };
  }

  if (normalizedStatus === "payment_failed") {
    return {
      visible: true,
      className: "is-danger",
      message: "Online payment failed or was cancelled. Operational status changes stay locked so staff cannot accidentally reactivate this order."
    };
  }

  return { visible: false, className: "", message: "" };
}

function getStaffRecordStatusLabel(status = "", type = "") {
  const normalizedStatus = normalizeStatus(status);

  if (type === "order" && STAFF_ORDER_STATUS_LABELS[normalizedStatus]) {
    return STAFF_ORDER_STATUS_LABELS[normalizedStatus];
  }

  return normalizedStatus
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "New";
}

function getStaffOrderItems(order = {}) {
  return Array.isArray(order.items) ? order.items : [];
}

function getStaffOrderTotals(order = {}) {
  return order.totals && typeof order.totals === "object" && !Array.isArray(order.totals)
    ? order.totals
    : {};
}

function getStaffOrderTotal(order = {}) {
  const totals = getStaffOrderTotals(order);
  const itemSubtotal = getStaffOrderItems(order).reduce((sum, item) => {
    const qty = getNumberValue(item?.qty) || 0;
    const price = getNumberValue(item?.price) || 0;
    return sum + qty * price;
  }, 0);

  return (
    getNumberValue(totals.gpayFinalTotal) ??
    getNumberValue(totals.final) ??
    getNumberValue(totals.total) ??
    getNumberValue(totals.normalTotal) ??
    itemSubtotal
  );
}

function getStaffOrderLineTotal(item = {}) {
  return getNumberValue(item?.lineTotal) ?? ((getNumberValue(item?.qty) || 0) * (getNumberValue(item?.price) || 0));
}

function getStaffOrderItemSummary(order = {}) {
  const items = getStaffOrderItems(order);
  const itemCount = items.length;
  const totalQty = items.reduce((sum, item) => sum + (getNumberValue(item?.qty) || 0), 0);

  return {
    itemCount,
    totalQty
  };
}

function buildStaffOrderComboSummary(item = {}) {
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

function buildStaffOrderItemMetaLines(item = {}) {
  const lines = [];
  const comboSummary = buildStaffOrderComboSummary(item);
  const originalPrice = getNumberValue(item?.originalPrice);
  const savings = getNumberValue(item?.savings);
  const price = getNumberValue(item?.price) || 0;
  const variant =
    item?.variant && typeof item.variant === "object"
      ? item.variant.name || item.variant.label || ""
      : item?.variantName || item?.variant || "";
  const addons = Array.isArray(item?.addons)
    ? item.addons
    : Array.isArray(item?.addOns)
      ? item.addOns
      : [];

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
    lines.push(`Was ${formatMoney(originalPrice)} | Save ${formatMoney(savings)}`);
  }

  if (String(variant || "").trim()) {
    lines.push(`Variant: ${String(variant).trim()}`);
  }

  const addonLabels = addons
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const label = String(entry.name || entry.label || entry.itemName || "").trim();
        const quantity = Math.max(1, Number(entry.quantity || entry.qty || 1) || 1);
        return label ? `${quantity > 1 ? `${quantity}x ` : ""}${label}` : "";
      }
      return String(entry || "").trim();
    })
    .filter(Boolean);
  if (addonLabels.length) {
    lines.push(`Add-ons: ${addonLabels.join(", ")}`);
  }

  if (String(item?.note || "").trim()) {
    lines.push(`Item note: ${String(item.note).trim()}`);
  }

  return lines;
}

function getStaffOrderPaymentStatus(order = {}) {
  return order.paymentStatus || "unpaid";
}

function getStaffOrderBillingStatus(order = {}) {
  return order.billingStatus || "not_billed";
}

function getStaffOrderTableLabel(order = {}) {
  return order.tableNumber || "No table";
}

function getStaffOrderAddonMeta(order = {}) {
  const entryType = normalizeStatus(order.orderEntryType);
  const parentOrderId = String(order.parentOrderId || "").trim();
  const sequenceLabel = String(order.orderSequenceLabel || "").trim();
  const addonSequence = Number(order.addonSequence || 0);
  const isAddon =
    entryType === "add_on" ||
    entryType === "addon" ||
    Boolean(parentOrderId);

  return {
    isAddon,
    parentOrderId,
    sequenceLabel,
    addonSequence: Number.isInteger(addonSequence) && addonSequence > 0 ? addonSequence : null,
    label: sequenceLabel || (parentOrderId ? `Add-on for #${parentOrderId}` : "Add-on order")
  };
}

function getStaffOrderId(order = {}) {
  return String(order.id || "").trim();
}

function getStaffOrderCreatedAtValue(order = {}) {
  const timestamp = new Date(order.createdAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareStaffOrderSortValues(
  firstTimestamp = 0,
  firstId = "",
  secondTimestamp = 0,
  secondId = ""
) {
  if (firstTimestamp !== secondTimestamp) {
    return secondTimestamp - firstTimestamp;
  }

  return String(secondId || "").localeCompare(String(firstId || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function compareStaffOrdersNewestFirst(firstOrder = {}, secondOrder = {}) {
  return compareStaffOrderSortValues(
    getStaffOrderCreatedAtValue(firstOrder),
    getStaffOrderId(firstOrder),
    getStaffOrderCreatedAtValue(secondOrder),
    getStaffOrderId(secondOrder)
  );
}

function dedupeStaffOrdersById(orders = []) {
  const seenOrderIds = new Set();

  return (Array.isArray(orders) ? orders : []).filter((order) => {
    const orderId = getStaffOrderId(order);
    if (!orderId) return true;
    if (seenOrderIds.has(orderId)) return false;

    seenOrderIds.add(orderId);
    return true;
  });
}

function normalizeStaffOrdersForDisplay(orders = []) {
  return dedupeStaffOrdersById(orders).sort(compareStaffOrdersNewestFirst);
}

function getStaffOrdersRenderSignature(orders = []) {
  try {
    return JSON.stringify(Array.isArray(orders) ? orders : []);
  } catch (error) {
    console.warn("Staff orders render signature fallback used:", error);
    return (Array.isArray(orders) ? orders : [])
      .map((order) => [
        getStaffOrderId(order),
        order?.status || "",
        getStaffOrderPaymentStatus(order),
        getStaffOrderBillingStatus(order),
        order?.createdAt || ""
      ].join(":"))
      .join("|");
  }
}

const STAFF_ORDER_FOCUS_ATTRIBUTES = [
  "data-staff-mark-billed",
  "data-staff-mark-paid",
  "data-staff-mark-family-billed",
  "data-staff-mark-family-paid",
  "data-staff-view-bill",
  "data-staff-record-status-select",
  "data-staff-update-record-status"
];

function getStaffOrdersFocusState() {
  const content = $("#staffOrdersContent");
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLElement) || !content?.contains(activeElement)) {
    return null;
  }

  const details = activeElement.closest("[data-staff-order-details]");
  const orderId = String(
    details?.dataset.orderId ||
    activeElement.dataset.orderId ||
    activeElement.dataset.recordId ||
    ""
  ).trim();

  if (!orderId) return null;

  if (activeElement.matches(".staff-order-details-summary")) {
    return { orderId, control: "details-summary" };
  }

  const control = STAFF_ORDER_FOCUS_ATTRIBUTES.find((attribute) =>
    activeElement.hasAttribute(attribute)
  );

  return control ? { orderId, control } : { orderId, control: "details-summary" };
}

function restoreStaffOrdersFocusState(focusState = null) {
  if (!focusState?.orderId) return;

  window.requestAnimationFrame(() => {
    const content = $("#staffOrdersContent");
    if (!content) return;

    const details = Array.from(
      content.querySelectorAll("[data-staff-order-details]")
    ).find((element) => String(element.dataset.orderId || "") === focusState.orderId);

    if (!details) return;

    let target = null;
    if (focusState.control === "details-summary") {
      target = details.querySelector(".staff-order-details-summary");
    } else {
      target = Array.from(details.querySelectorAll(`[${focusState.control}]`)).find((element) => {
        const targetOrderId = String(element.dataset.orderId || element.dataset.recordId || "");
        return !targetOrderId || targetOrderId === focusState.orderId;
      });
    }

    if (!(target instanceof HTMLElement) || target.matches(":disabled")) {
      target = details.querySelector(".staff-order-details-summary");
    }

    target?.focus({ preventScroll: true });
  });
}

function getStaffOrdersScrollAnchorState() {
  const content = $("#staffOrdersContent");
  const selectedSourceCard = getStaffSelectedOrderSourceCard();

  if (
    !content ||
    !selectedSourceCard ||
    STAFF_STATE.activeView !== "orders" ||
    document.visibilityState === "hidden"
  ) {
    return null;
  }

  const contentRect = content.getBoundingClientRect();
  const viewportHeight = Math.max(
    Number(window.innerHeight || 0),
    Number(document.documentElement?.clientHeight || 0)
  );

  if (!Number.isFinite(contentRect.top) || contentRect.top >= 0 || viewportHeight <= 0) {
    return null;
  }

  const anchorDetails = Array.from(
    content.querySelectorAll("[data-staff-order-details]")
  ).find((details) => {
    const card = details.closest(".staff-order-card");
    const rect = card?.getBoundingClientRect();
    return (
      rect &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.bottom) &&
      rect.bottom > 0 &&
      rect.top < viewportHeight
    );
  });
  const anchorCard = anchorDetails?.closest(".staff-order-card");
  const anchorRect = anchorCard?.getBoundingClientRect();
  const orderId = String(anchorDetails?.dataset.orderId || "").trim();

  if (!orderId || !anchorRect || !Number.isFinite(anchorRect.top)) {
    return null;
  }

  return {
    orderId,
    sourceCard: selectedSourceCard,
    top: anchorRect.top,
    windowScrollY: Number(window.scrollY || window.pageYOffset || 0)
  };
}

function restoreStaffOrdersScrollAnchorState(scrollAnchorState = null) {
  if (!scrollAnchorState?.orderId || typeof window.scrollBy !== "function") {
    return;
  }

  window.requestAnimationFrame(() => {
    if (
      STAFF_STATE.activeView !== "orders" ||
      getStaffSelectedOrderSourceCard() !== scrollAnchorState.sourceCard
    ) {
      return;
    }

    const content = $("#staffOrdersContent");
    const anchorDetails = Array.from(
      content?.querySelectorAll("[data-staff-order-details]") || []
    ).find((details) => String(details.dataset.orderId || "") === scrollAnchorState.orderId);
    const anchorCard = anchorDetails?.closest(".staff-order-card");
    const anchorRect = anchorCard?.getBoundingClientRect();

    if (!anchorRect || !Number.isFinite(anchorRect.top)) {
      return;
    }

    const topDelta = anchorRect.top - Number(scrollAnchorState.top || 0);
    const currentScrollY = Number(window.scrollY || window.pageYOffset || 0);

    if (
      !Number.isFinite(topDelta) ||
      Math.abs(topDelta) < 1 ||
      Math.abs(currentScrollY - Number(scrollAnchorState.windowScrollY || 0)) > 2
    ) {
      return;
    }

    window.scrollBy({
      top: topDelta,
      left: 0,
      behavior: "auto"
    });
  });
}

function getStaffElapsedMinutes(value = "") {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

function formatStaffElapsedTime(value = "") {
  const elapsedMinutes = getStaffElapsedMinutes(value);
  if (elapsedMinutes === null) {
    return "Just now";
  }

  if (elapsedMinutes < 1) {
    return "Just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h ago` : `${days}d ago`;
}

function getStaffKdsUrgencyLevel(order = {}) {
  const kitchenStatus = getStaffKdsOrderKitchenStatus(order);
  const elapsedMinutes = getStaffElapsedMinutes(order?.createdAt);

  if (elapsedMinutes === null) {
    return "";
  }

  if (kitchenStatus === "new" || kitchenStatus === "accepted") {
    if (elapsedMinutes >= 20) return "danger";
    if (elapsedMinutes >= 10) return "warning";
    return "";
  }

  if (kitchenStatus === "preparing") {
    if (elapsedMinutes >= 35) return "danger";
    if (elapsedMinutes >= 20) return "warning";
  }

  return "";
}

function buildStaffOrderCardsMarkup(orders = []) {
  const visibleOrderIds = new Set(orders.map(getStaffOrderId).filter(Boolean));
  const addOnsByParentId = orders.reduce((groups, order) => {
    const addonMeta = getStaffOrderAddonMeta(order);

    if (addonMeta.isAddon && addonMeta.parentOrderId && visibleOrderIds.has(addonMeta.parentOrderId)) {
      const groupedAddOns = groups.get(addonMeta.parentOrderId) || [];
      groupedAddOns.push(order);
      groups.set(addonMeta.parentOrderId, groupedAddOns);
    }

    return groups;
  }, new Map());
  const familyLatestCreatedAt = orders.reduce((groups, order) => {
    const addonMeta = getStaffOrderAddonMeta(order);
    const orderId = getStaffOrderId(order);
    const familyId =
      addonMeta.isAddon && addonMeta.parentOrderId && visibleOrderIds.has(addonMeta.parentOrderId)
        ? addonMeta.parentOrderId
        : orderId;

    if (!familyId) {
      return groups;
    }

    const nextTimestamp = getStaffOrderCreatedAtValue(order);
    const currentTimestamp = groups.get(familyId) || 0;
    groups.set(familyId, Math.max(currentTimestamp, nextTimestamp));
    return groups;
  }, new Map());

  return orders
    .filter((order) => {
      const addonMeta = getStaffOrderAddonMeta(order);
      return !(addonMeta.isAddon && addonMeta.parentOrderId && visibleOrderIds.has(addonMeta.parentOrderId));
    })
    .sort((firstOrder, secondOrder) => {
      const firstId = getStaffOrderId(firstOrder);
      const secondId = getStaffOrderId(secondOrder);
      const firstTimestamp = familyLatestCreatedAt.get(firstId) || getStaffOrderCreatedAtValue(firstOrder);
      const secondTimestamp = familyLatestCreatedAt.get(secondId) || getStaffOrderCreatedAtValue(secondOrder);

      return compareStaffOrderSortValues(
        firstTimestamp,
        firstId,
        secondTimestamp,
        secondId
      );
    })
    .map((order) => {
      const addonMeta = getStaffOrderAddonMeta(order);
      const orderId = getStaffOrderId(order);
      const childAddOns = orderId ? addOnsByParentId.get(orderId) || [] : [];

      if (!childAddOns.length) {
        return buildStaffOrderCard(order);
      }

      return `
        <section class="staff-order-family" aria-label="Order ${escapeHTML(orderId)} with add-ons">
          ${buildStaffOrderCard(order)}
          <div class="staff-order-family-addons">
            <p class="staff-order-family-label">${escapeHTML(childAddOns.length)} add-on ${childAddOns.length === 1 ? "order" : "orders"} for #${escapeHTML(orderId)}</p>
            ${childAddOns.map(buildStaffOrderCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function getStaffOrderSourceMeta(order = {}) {
  const source = normalizeStatus(order.orderSource);
  const orderType = normalizeStatus(order.orderType);
  const tableNumber = String(order.tableNumber || "").trim();
  const isStaffTableOrder = source === "staff";
  const isQrTableOrder =
    Boolean(tableNumber) ||
    orderType === "dine-in" ||
    source === "qr" ||
    source === "table" ||
    source === "dine-in";

  if (source === "room_service" || orderType === "room_service") {
    const roomService = getStaffOrderRoomServiceMeta(order);
    return {
      key: "room-service",
      label: "Room Service",
      detail: roomService.roomNumber ? `Room ${roomService.roomNumber}` : "Guest room",
      badgeClass: "is-important"
    };
  }

  if (isStaffTableOrder) {
    return {
      key: "staff-table",
      label: "Staff Table",
      detail: tableNumber ? `Table ${tableNumber}` : "Dine-in",
      badgeClass: "is-important"
    };
  }

  if (isQrTableOrder) {
    return {
      key: "qr-table",
      label: "QR Table",
      detail: tableNumber ? `Table ${tableNumber}` : "Dine-in",
      badgeClass: "is-important"
    };
  }

  return {
    key: "website",
    label: "Website",
    detail: "Online order",
    badgeClass: ""
  };
}

function getStaffOrderSourceKey(order = {}) {
  return getStaffOrderSourceMeta(order).key || "website";
}

function getStaffOrderSourceCardDefinition(sourceCard = "") {
  return STAFF_ORDER_SOURCE_CARD_DEFINITIONS[normalizeStatus(sourceCard)] || null;
}

function getStaffOrderSourceCardKey(order = {}) {
  const sourceKey = getStaffOrderSourceKey(order);
  const matchingEntry = Object.entries(STAFF_ORDER_SOURCE_CARD_DEFINITIONS).find(
    ([, definition]) => definition.sourceKeys.includes(sourceKey)
  );
  return matchingEntry?.[0] || "website";
}

function getStaffOrdersForSourceCard(sourceCard = "", orders = STAFF_STATE.orders) {
  const normalizedSourceCard = normalizeStatus(sourceCard);
  if (!getStaffOrderSourceCardDefinition(normalizedSourceCard)) return [];

  return (Array.isArray(orders) ? orders : []).filter(
    (order) => getStaffOrderSourceCardKey(order) === normalizedSourceCard
  );
}

function getStaffOrderSourceFreshCount(sourceCard = "") {
  const normalizedSourceCard = normalizeStatus(sourceCard);
  if (!getStaffOrderSourceCardDefinition(normalizedSourceCard)) return 0;

  return Math.max(
    0,
    Number(STAFF_STATE.orderSourceFreshCounts?.[normalizedSourceCard] || 0) || 0
  );
}

function markStaffOrderSourcesFresh(orders = []) {
  if (STAFF_STATE.notificationSummaryInitialized) return;
  const selectedSourceCard = getStaffSelectedOrderSourceCard();
  const nextFreshCounts = {
    qr: getStaffOrderSourceFreshCount("qr"),
    staff: getStaffOrderSourceFreshCount("staff"),
    website: getStaffOrderSourceFreshCount("website")
  };

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const sourceCard = getStaffOrderSourceCardKey(order);
    if (sourceCard === selectedSourceCard || !getStaffOrderSourceCardDefinition(sourceCard)) {
      return;
    }

    nextFreshCounts[sourceCard] = Number(nextFreshCounts[sourceCard] || 0) + 1;
  });

  STAFF_STATE.orderSourceFreshCounts = nextFreshCounts;
}

function clearStaffOrderSourceFreshCount(sourceCard = "") {
  const normalizedSourceCard = normalizeStatus(sourceCard);
  if (
    !getStaffOrderSourceCardDefinition(normalizedSourceCard) ||
    getStaffOrderSourceFreshCount(normalizedSourceCard) <= 0
  ) {
    return;
  }

  STAFF_STATE.orderSourceFreshCounts = {
    ...STAFF_STATE.orderSourceFreshCounts,
    [normalizedSourceCard]: 0
  };
}

function getStaffSelectedOrderSourceCard() {
  const selectedSourceCard = normalizeStatus(STAFF_STATE.selectedOrderSourceCard);
  return getStaffOrderSourceCardDefinition(selectedSourceCard) ? selectedSourceCard : "";
}

function getStaffOrderSourceAsyncState(
  sourceCard = getStaffSelectedOrderSourceCard()
) {
  const definition = getStaffOrderSourceCardDefinition(sourceCard);

  return {
    loadingTitle: definition ? `Loading ${definition.label}...` : "Loading staff orders...",
    loadingCopy: definition
      ? `Refreshing only the ${definition.label} queue while keeping your selected range and filters ready.`
      : "Fetching the current hotel-scoped order range.",
    errorTitle: definition ? `${definition.label} could not be loaded` : "Orders could not be loaded",
    errorHint: definition
      ? `Your ${definition.label} selection, range, and filters have not been changed.`
      : "Your hotel and order-source settings have not been changed."
  };
}

function getStaffOrderSourceCardKeyForFilter(sourceFilter = "") {
  const normalizedSourceFilter = normalizeStatus(sourceFilter);
  if (normalizedSourceFilter === "qr-table") return "qr";
  if (["staff-table", "room-service"].includes(normalizedSourceFilter)) return "staff";
  if (normalizedSourceFilter === "website") return "website";
  return "";
}

function syncStaffOrderSourceCardSelection() {
  const selectedSourceCard = getStaffSelectedOrderSourceCard();
  const sourceCardGrid = $("#staffOrdersSourceCards");
  const management = $("#staffOrdersManagement");
  const prompt = $("#staffOrdersSourcePrompt");

  document.querySelectorAll("[data-staff-order-source-card]").forEach((button) => {
    const isSelected = button.getAttribute("data-staff-order-source-card") === selectedSourceCard;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (sourceCardGrid) sourceCardGrid.classList.toggle("is-compact", !!selectedSourceCard);
  if (management) management.hidden = !selectedSourceCard;
  if (prompt) prompt.hidden = !!selectedSourceCard;
}

function setStaffOrderSourcePromptState({
  title = "Select an order source",
  copy = "Select QR Orders, Staff Orders, or Website Orders to view and manage that queue.",
  busy = false,
  isError = false,
  canRetry = false
} = {}) {
  const prompt = $("#staffOrdersSourcePrompt");
  const promptTitle = $("#staffOrdersSourcePromptTitle");
  const promptCopy = $("#staffOrdersSourcePromptCopy");
  const retryButton = prompt?.querySelector("[data-staff-orders-retry]");

  if (!prompt) return;
  prompt.setAttribute("aria-busy", String(!!busy));
  prompt.classList.toggle("is-error", !!isError);
  if (promptTitle) promptTitle.textContent = title;
  if (promptCopy) promptCopy.textContent = copy;
  if (retryButton) retryButton.hidden = !canRetry;
}

function renderStaffOrderSourceCards(orders = STAFF_STATE.orders) {
  const selectedSourceCard = getStaffSelectedOrderSourceCard();

  document.querySelectorAll("[data-staff-order-source-card]").forEach((button) => {
    const sourceCard = button.getAttribute("data-staff-order-source-card") || "";
    const sourceOrders = getStaffOrdersForSourceCard(sourceCard, orders);
    const receivedCount = sourceOrders.filter(
      (order) => normalizeStatus(order.status) === "new"
    ).length;
    const latestTimestamp = sourceOrders.reduce(
      (maxTimestamp, order) => Math.max(maxTimestamp, getStaffOrderCreatedAtValue(order)),
      0
    );
    const count = button.querySelector("[data-staff-order-source-count]");
    const received = button.querySelector("[data-staff-order-source-new-count]");
    const latest = button.querySelector("[data-staff-order-source-latest]");
    const freshIndicator = button.querySelector("[data-staff-order-source-fresh]");
    const freshCount = getStaffOrderSourceFreshCount(sourceCard);
    const notificationCardKey = getStaffNotificationCardKeyForOrderSource(sourceCard);
    const freshIsLowerBound = isStaffNotificationCardUnreadLowerBound(notificationCardKey);
    const displayFreshCount = formatStaffCount(freshCount, { lowerBound: freshIsLowerBound });

    button.classList.toggle("has-fresh-orders", freshCount > 0);
    button.dataset.notificationUnread = String(freshCount);
    button.dataset.notificationUnreadLowerBound = String(freshIsLowerBound);
    button.setAttribute(
      "aria-label",
      freshCount > 0
        ? `${getStaffOrderSourceCardDefinition(sourceCard)?.label || "Orders"}, ${displayFreshCount} unread notifications`
        : getStaffOrderSourceCardDefinition(sourceCard)?.label || "Orders"
    );
    if (freshIndicator) {
      freshIndicator.hidden = freshCount <= 0;
      freshIndicator.textContent = freshCount > 0 ? `${displayFreshCount} unread` : "";
      freshIndicator.setAttribute(
        "aria-label",
        `${displayFreshCount} unread order notification${freshCount === 1 && !freshIsLowerBound ? "" : "s"}`
      );
    }
    if (count) count.textContent = String(sourceOrders.length);
    if (received) received.textContent = String(receivedCount);
    if (latest) {
      latest.textContent = latestTimestamp
        ? formatOrderDate(new Date(latestTimestamp).toISOString())
        : "No activity";
    }
  });

  const selectedDefinition = getStaffOrderSourceCardDefinition(selectedSourceCard);
  const selectedOrders = getStaffOrdersForSourceCard(selectedSourceCard, orders);
  const selectedTitle = $("#staffOrdersSelectedSourceTitle");
  const selectedCopy = $("#staffOrdersSelectedSourceCopy");
  const selectedCount = $("#staffOrdersSelectedSourceCount");

  if (selectedTitle) selectedTitle.textContent = selectedDefinition?.label || "Orders";
  if (selectedCopy) selectedCopy.textContent = selectedDefinition?.description || "";
  if (selectedCount) {
    selectedCount.textContent = `${selectedOrders.length} loaded order${selectedOrders.length === 1 ? "" : "s"}`;
  }

  if (!selectedSourceCard) {
    setStaffOrderSourcePromptState();
  }
  syncStaffOrderSourceCardSelection();
}

function revealStaffOrdersManagement(sourceCard = "") {
  const normalizedSourceCard = normalizeStatus(sourceCard);
  if (!getStaffOrderSourceCardDefinition(normalizedSourceCard)) return;

  window.requestAnimationFrame(() => {
    const management = $("#staffOrdersManagement");
    if (
      !management ||
      management.hidden ||
      getStaffSelectedOrderSourceCard() !== normalizedSourceCard ||
      typeof management.scrollIntoView !== "function"
    ) {
      return;
    }

    management.scrollIntoView({
      behavior: getStaffPreferredScrollBehavior(),
      block: "start"
    });
  });
}

function selectStaffOrderSourceCard(
  sourceCard = "",
  { announce = true, revealManagement = false } = {}
) {
  const normalizedSourceCard = normalizeStatus(sourceCard);
  const definition = getStaffOrderSourceCardDefinition(normalizedSourceCard);
  const sourceInput = $("#staffOrdersSourceInput");
  const selectionStatus = $("#staffOrdersSourceSelectionStatus");

  STAFF_STATE.selectedOrderSourceCard = definition ? normalizedSourceCard : "";
  if (definition) {
    clearStaffOrderSourceFreshCount(normalizedSourceCard);
    const notificationCardKey = getStaffNotificationCardKeyForOrderSource(normalizedSourceCard);
    if (notificationCardKey && getStaffNotificationCardUnread(notificationCardKey) > 0) {
      void acknowledgeStaffNotificationCard(notificationCardKey);
    }
  }
  if (sourceInput) {
    sourceInput.value = definition?.defaultSourceFilter || "all";
  }

  updateStaffOrderTableFilterOptions(
    definition
      ? getStaffOrdersForSourceCard(normalizedSourceCard)
      : STAFF_STATE.orders
  );
  renderStaffOrderSourceCards(STAFF_STATE.orders);
  renderCurrentStaffOrders();

  if (definition && revealManagement) {
    revealStaffOrdersManagement(normalizedSourceCard);
  }

  if (announce && selectionStatus) {
    selectionStatus.textContent = definition
      ? `${definition.label} selected. ${getStaffOrdersForSourceCard(normalizedSourceCard).length} loaded orders are available.`
      : "Order source selection cleared.";
  }
}

function getStaffKdsSourceQuickfactClass(sourceKey = "") {
  const normalizedSourceKey = normalizeStatus(sourceKey);

  if (normalizedSourceKey === "qr-table") {
    return "is-source is-source-qr";
  }

  if (normalizedSourceKey === "room-service") {
    return "is-source is-source-staff";
  }

  if (normalizedSourceKey === "staff-table") {
    return "is-source is-source-staff";
  }

  return "is-source is-source-website";
}

function isStaffTableActivitySource(sourceKey = "") {
  return sourceKey === "qr-table" || sourceKey === "staff-table";
}

function getStaffPaymentBadgeClass(paymentStatus = "") {
  return normalizeStatus(paymentStatus) === "paid" ? "is-success" : "is-danger";
}

function getStaffBillingBadgeClass(billingStatus = "") {
  return normalizeStatus(billingStatus) === "billed" ? "is-success" : "is-warning";
}

function getStaffRouteTransferMeta(order = {}) {
  const routeTransfer =
    order.routeTransfer && typeof order.routeTransfer === "object" && !Array.isArray(order.routeTransfer)
      ? order.routeTransfer
      : {};
  const transferStatus = normalizeStatus(routeTransfer.transferStatus);
  const settlementStatus = normalizeStatus(routeTransfer.settlementStatus);
  const routeStatus = normalizeStatus(routeTransfer.routeStatus);
  const hasRouteSignal =
    !!transferStatus ||
    !!settlementStatus ||
    !!routeStatus ||
    !!routeTransfer.transferRequested;

  if (!hasRouteSignal) {
    return {
      visible: false,
      label: "",
      detail: "",
      badgeClass: ""
    };
  }

  if (transferStatus === "processed" || settlementStatus === "settled") {
    return {
      visible: true,
      label: "Owner Transfer: Processed",
      detail: settlementStatus ? `Settlement: ${settlementStatus}` : "",
      badgeClass: "is-success"
    };
  }

  if (["failed", "reversed", "partially_reversed"].includes(transferStatus)) {
    return {
      visible: true,
      label: `Owner Transfer: ${transferStatus.replace(/_/g, " ")}`,
      detail: routeTransfer.transferError || "Needs admin review",
      badgeClass: "is-danger"
    };
  }

  if (transferStatus || routeTransfer.transferRequested) {
    return {
      visible: true,
      label: `Owner Transfer: ${transferStatus || "requested"}`,
      detail: settlementStatus ? `Settlement: ${settlementStatus}` : "Waiting for Razorpay update",
      badgeClass: "is-warning"
    };
  }

  return {
    visible: true,
    label: `Route: ${routeStatus || "not active"}`,
    detail: "Normal platform settlement",
    badgeClass: ""
  };
}

function getStaffRecordStatusBadgeClass(status = "", type = "") {
  const normalizedStatus = normalizeStatus(status);
  const normalizedType = normalizeStatus(type);

  if (["cancelled", "closed", "payment_failed"].includes(normalizedStatus)) {
    return "is-danger";
  }

  if (
    ["completed", "converted"].includes(normalizedStatus) ||
    (normalizedType === "reservation" && ["confirmed", "seated"].includes(normalizedStatus)) ||
    (normalizedType === "inquiry" && normalizedStatus === "contacted") ||
    (normalizedType === "contact" && ["contacted", "resolved"].includes(normalizedStatus)) ||
    (normalizedType === "support" && ["acknowledged", "resolved"].includes(normalizedStatus))
  ) {
    return "is-success";
  }

  return "is-warning";
}

function buildStaffOrderItemsList(order = {}) {
  const items = getStaffOrderItems(order);
  const canViewFinancials = canStaffViewOrderFinancials(order);

  if (!items.length) {
    return `<p class="staff-order-note">No items found for this order.</p>`;
  }

  return `
    <ol class="staff-order-items">
      ${items
        .map((item) => {
          const name = item?.name || item?.id || "Item";
          const qty = getNumberValue(item?.qty) || 0;
          const price = canViewFinancials ? getNumberValue(item?.price) : null;
          const priceLabel = price === null ? "" : formatMoney(price);
          const metaLines = buildStaffOrderItemMetaLines(item);
          const metaMarkup = metaLines.length
            ? `<div class="staff-order-item-meta">${metaLines
                .map((line) => escapeHTML(line))
                .join("<br>")}</div>`
            : "";

          return `
            <li>
              <strong>${escapeHTML(name)}</strong> x ${escapeHTML(qty)}${priceLabel ? ` - ${escapeHTML(priceLabel)}` : ""}
              ${metaMarkup}
            </li>
          `;
        })
        .join("")}
    </ol>
  `;
}

function getStaffOrdersSummary(orders = []) {
  return orders.reduce(
    (summary, order) => {
      const total = getStaffOrderTotal(order);
      const paymentStatus = normalizeStatus(getStaffOrderPaymentStatus(order));
      const billingStatus = normalizeStatus(getStaffOrderBillingStatus(order));
      const sourceKey = getStaffOrderSourceKey(order);

      summary.totalOrders += 1;
      summary.totalEarnings += total;

      if (paymentStatus === "paid") {
        summary.paidOrders += 1;
        summary.paidEarnings += total;
      } else {
        summary.unpaidOrders += 1;
        summary.unpaidEarnings += total;
      }

      if (billingStatus === "billed") {
        summary.billedOrders += 1;
      } else {
        summary.unbilledOrders += 1;
      }

      if (isStaffTableActivitySource(sourceKey)) {
        summary.qrOrders += 1;
        summary.qrEarnings += total;
      } else if (sourceKey === "room-service") {
        summary.roomServiceOrders += 1;
        summary.roomServiceEarnings += total;
      } else {
        summary.websiteOrders += 1;
        summary.websiteEarnings += total;
      }

      return summary;
    },
    {
      totalOrders: 0,
      totalEarnings: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      paidEarnings: 0,
      unpaidEarnings: 0,
      billedOrders: 0,
      unbilledOrders: 0,
      qrOrders: 0,
      roomServiceOrders: 0,
      websiteOrders: 0,
      qrEarnings: 0,
      roomServiceEarnings: 0,
      websiteEarnings: 0
    }
  );
}

function getStaffOrderGroupSummary(orders = []) {
  const summary = getStaffOrdersSummary(orders);
  const latestTimestamp = orders.reduce(
    (maxTimestamp, order) => Math.max(maxTimestamp, getStaffOrderCreatedAtValue(order)),
    0
  );

  return {
    ...summary,
    latestActivityLabel: latestTimestamp ? formatOrderDate(new Date(latestTimestamp).toISOString()) : "No activity yet"
  };
}

function buildStaffSummaryCard(label, value, note, className = "") {
  const cardClassName = ["staff-summary-card", className].filter(Boolean).join(" ");
  return `
    <article class="${escapeHTML(cardClassName)}">
      <p class="staff-summary-label">${escapeHTML(label)}</p>
      <p class="staff-summary-value">${escapeHTML(value)}</p>
      <p class="staff-summary-note">${escapeHTML(note)}</p>
    </article>
  `;
}
function getStaffDashboardKpiIcon(iconName = "orders") {
  const icons = {
    orders: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 4h8M9 3h6v3H9zM7 5H5v16h14V5h-2M8 10h8M8 14h8M8 18h5" />
      </svg>
    `,
    active: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    `,
    payments: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M16 15h2" />
      </svg>
    `,
    value: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 17l5-5 4 3 7-8M15 7h5v5" />
      </svg>
    `
  };

  return icons[iconName] || icons.orders;
}

function buildStaffDashboardKpiCard({ label, value, note, iconName, className = "" } = {}) {
  const cardClassName = ["staff-summary-card", "staff-dashboard-kpi-card", className]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${escapeHTML(cardClassName)}">
      <div class="staff-dashboard-kpi-head">
        <span class="staff-dashboard-kpi-icon" aria-hidden="true">
          ${getStaffDashboardKpiIcon(iconName)}
        </span>
        <p class="staff-summary-label">${escapeHTML(label)}</p>
      </div>
      <p class="staff-summary-value">${escapeHTML(value)}</p>
      <p class="staff-summary-note">${escapeHTML(note)}</p>
    </article>
  `;
}

function getStaffDashboardActiveOrderSummary(orders = []) {
  return (Array.isArray(orders) ? orders : []).reduce(
    (summary, order) => {
      const status = normalizeStatus(order.status);

      if (status === "new" || status === "confirmed" || status === "preparing") {
        summary.total += 1;
        summary[status] += 1;
      }

      return summary;
    },
    { total: 0, new: 0, confirmed: 0, preparing: 0 }
  );
}

function getStaffDashboardOrderSourceSummary(orders = []) {
  const definitions = [
    { key: "website", label: "Website" },
    { key: "staff-table", label: "Staff table" },
    { key: "qr-table", label: "QR table" },
    { key: "room-service", label: "Room service" }
  ];
  const counts = {
    "qr-table": 0,
    "staff-table": 0,
    "room-service": 0,
    website: 0
  };

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const sourceKey = getStaffOrderSourceKey(order);
    const normalizedKey = Object.prototype.hasOwnProperty.call(counts, sourceKey)
      ? sourceKey
      : "website";
    counts[normalizedKey] += 1;
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    total,
    entries: definitions.map((definition) => ({
      ...definition,
      count: counts[definition.key],
      share: total ? (counts[definition.key] / total) * 100 : 0
    }))
  };
}

function formatStaffDashboardSourceShare(share = 0) {
  const roundedShare = Number(Number(share || 0).toFixed(1));
  return `${roundedShare}%`;
}

function renderStaffDashboardOrderSources(orders = STAFF_STATE.orders) {
  const sourceWrap = $("#staffDashboardOrderSources");
  const sourceEmpty = $("#staffDashboardOrderSourcesEmpty");
  if (!sourceWrap) return;

  if (!isStaffManagerSession()) {
    sourceWrap.hidden = true;
    sourceWrap.innerHTML = "";
    sourceWrap.setAttribute("aria-busy", "false");
    if (sourceEmpty) sourceEmpty.hidden = true;
    return;
  }

  const summary = getStaffDashboardOrderSourceSummary(orders);

  if (!summary.total) {
    sourceWrap.hidden = true;
    sourceWrap.innerHTML = "";
    sourceWrap.setAttribute("aria-busy", "false");
    if (sourceEmpty) sourceEmpty.hidden = false;
    return;
  }

  const chartLabel = [
    `Order source distribution for ${summary.total} loaded order${summary.total === 1 ? "" : "s"}.`,
    ...summary.entries.map(
      (entry) => `${entry.label}: ${entry.count}, ${formatStaffDashboardSourceShare(entry.share)}.`
    )
  ].join(" ");

  sourceWrap.hidden = false;
  sourceWrap.setAttribute("aria-busy", "false");
  if (sourceEmpty) sourceEmpty.hidden = true;
  sourceWrap.innerHTML = `
    <figure class="staff-dashboard-source-figure is-horizontal-bars" aria-label="${escapeHTML(chartLabel)}">
      <ul class="staff-dashboard-source-bars" aria-label="Order source values">
        ${summary.entries
          .map((entry) => {
            const shareLabel = formatStaffDashboardSourceShare(entry.share);
            const rowLabel = `${entry.label}: ${entry.count} order${entry.count === 1 ? "" : "s"}, ${shareLabel} of the loaded range.`;
            return `
              <li
                class="staff-dashboard-source-bar-row is-${escapeHTML(entry.key)}"
                aria-label="${escapeHTML(rowLabel)}"
              >
                <div class="staff-dashboard-source-bar-track" aria-hidden="true">
                  <span
                    class="staff-dashboard-source-bar-fill is-${escapeHTML(entry.key)}"
                    style="--staff-source-share: ${escapeHTML(entry.share.toFixed(4))}%;"
                  ></span>
                  <span class="staff-dashboard-source-bar-label">${escapeHTML(entry.label)}</span>
                  <strong>${escapeHTML(entry.count)}</strong>
                </div>
              </li>
            `;
          })
          .join("")}
      </ul>
      <figcaption class="staff-dashboard-source-caption">
        ${escapeHTML(summary.total)} loaded order${summary.total === 1 ? "" : "s"}; proportions use the current Orders range.
      </figcaption>
    </figure>
  `;
}
function renderStaffDashboardPrimaryKpis(
  orders = STAFF_STATE.orders,
  reports = STAFF_STATE.dashboardReports
) {
  if (!isStaffManagerSession()) {
    setStaffDashboardSummaryEmpty("Manager access required for the dashboard summary.");
    return;
  }

  const summaryWrap = $("#staffDashboardSummary");
  const empty = $("#staffDashboardEmpty");
  if (!summaryWrap) return;

  const loadedOrders = Array.isArray(orders) ? orders : [];
  const todaySummary =
    reports?.today && typeof reports.today === "object" ? reports.today : null;

  if (!loadedOrders.length && !todaySummary) {
    setStaffDashboardSummaryEmpty();
    return;
  }

  const loadedSummary = getStaffOrdersSummary(loadedOrders);
  const activeSummary = getStaffDashboardActiveOrderSummary(loadedOrders);
  const periodSummary = todaySummary || loadedSummary;
  const periodLabel = todaySummary ? "today" : "in the loaded order range";
  const orderCountLabel = todaySummary ? "Today's orders" : "Loaded orders";
  const paymentLabel = todaySummary ? "Pending payments" : "Loaded pending payments";
  const valueLabel = todaySummary ? "Today's order value" : "Loaded order value";

  summaryWrap.hidden = false;
  summaryWrap.setAttribute("aria-busy", "false");
  if (empty) {
    empty.hidden = true;
    empty.classList.remove("is-loading");
  }

  summaryWrap.innerHTML = [
    buildStaffDashboardKpiCard({
      label: orderCountLabel,
      value: String(periodSummary.totalOrders || 0),
      note: todaySummary
        ? "Hotel-scoped orders in today's report period"
        : "Current Orders range; today's report is unavailable",
      iconName: "orders",
      className: "is-orders"
    }),
    buildStaffDashboardKpiCard({
      label: "Active orders",
      value: String(activeSummary.total),
      note: `${activeSummary.new} new - ${activeSummary.confirmed} confirmed - ${activeSummary.preparing} preparing in the loaded range`,
      iconName: "active",
      className: "is-active-orders"
    }),
    buildStaffDashboardKpiCard({
      label: paymentLabel,
      value: formatMoney(periodSummary.unpaidEarnings || 0),
      note: `${periodSummary.unpaidOrders || 0} unpaid order${Number(periodSummary.unpaidOrders || 0) === 1 ? "" : "s"} ${periodLabel}`,
      iconName: "payments",
      className: "is-pending-payments"
    }),
    buildStaffDashboardKpiCard({
      label: valueLabel,
      value: formatMoney(periodSummary.totalEarnings || 0),
      note: `${periodSummary.paidOrders || 0} paid - ${periodSummary.unpaidOrders || 0} unpaid; includes all order totals`,
      iconName: "value",
      className: "is-order-value"
    })
  ].join("");
}

function renderStaffDashboardRecentOrders(orders = STAFF_STATE.orders) {
  const recentWrap = $("#staffDashboardRecentOrders");
  const recentEmpty = $("#staffDashboardRecentOrdersEmpty");
  if (!recentWrap) return;

  if (!isStaffManagerSession()) {
    recentWrap.hidden = true;
    recentWrap.innerHTML = "";
    recentWrap.setAttribute("aria-busy", "false");
    if (recentEmpty) recentEmpty.hidden = true;
    return;
  }

  const recentOrders = (Array.isArray(orders) ? [...orders] : [])
    .sort(compareStaffOrdersNewestFirst)
    .slice(0, 5);

  if (!recentOrders.length) {
    recentWrap.hidden = true;
    recentWrap.innerHTML = "";
    recentWrap.setAttribute("aria-busy", "false");
    if (recentEmpty) recentEmpty.hidden = false;
    return;
  }

  recentWrap.hidden = false;
  recentWrap.setAttribute("aria-busy", "false");
  if (recentEmpty) recentEmpty.hidden = true;
  recentWrap.innerHTML = `
    <div class="staff-dashboard-recent-table-wrap">
      <table class="staff-dashboard-recent-table">
        <caption class="staff-sr-only">Newest five orders from the currently loaded Orders range.</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Source</th>
            <th scope="col">Table / room</th>
            <th scope="col">Status</th>
            <th scope="col">Time</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
      ${recentOrders
        .map((order) => {
          const orderId = getStaffOrderId(order);
          const sourceMeta = getStaffOrderSourceMeta(order);
          const orderStatus = order.status || "new";
          const orderStatusLabel = getStaffRecordStatusLabel(orderStatus, "order");
          const orderStatusBadgeClass = getStaffRecordStatusBadgeClass(orderStatus, "order");
          const sourceDetail = sourceMeta.detail || sourceMeta.label;
          const locationLabel = sourceMeta.key === "website" ? "—" : sourceDetail;
          const createdAt = String(order.createdAt || "");
          const financialMarkup = canStaffViewOrderFinancials(order)
            ? `<strong class="staff-dashboard-recent-total">${escapeHTML(formatMoney(getStaffOrderTotal(order)))}</strong>`
            : `<span class="staff-dashboard-recent-total is-restricted" aria-label="Total restricted">—</span>`;

          return `
            <tr class="staff-dashboard-recent-order">
              <th scope="row" data-label="Order"><span class="staff-dashboard-recent-id">${escapeHTML(orderId ? "#" + orderId : "Order ID pending")}</span></th>
              <td data-label="Source">${escapeHTML(sourceMeta.label)}</td>
              <td data-label="Table / room">${escapeHTML(locationLabel)}</td>
              <td data-label="Status"><span class="staff-badge ${escapeHTML(orderStatusBadgeClass)}">${escapeHTML(orderStatusLabel)}</span></td>
              <td data-label="Time"><time datetime="${escapeHTML(createdAt)}">${escapeHTML(formatOrderDate(createdAt))}</time></td>
              <td class="staff-dashboard-recent-total-cell" data-label="Total">${financialMarkup}</td>
            </tr>
          `;
        })
        .join("")}
        </tbody>
      </table>
    </div>
  `;
}
function setStaffDashboardSummaryEmpty(
  message = "No orders found for this hotel in the selected range.",
  isLoading = false
) {
  const summaryWrap = $("#staffDashboardSummary");
  const insightsCopy = $("#staffDashboardAiInsightsCopy");
  const insightsWrap = $("#staffDashboardAiInsights");
  const supportSummaryWrap = $("#staffDashboardSupportSummary");
  const orderSourcesWrap = $("#staffDashboardOrderSources");
  const orderSourcesEmpty = $("#staffDashboardOrderSourcesEmpty");
  const recentOrdersWrap = $("#staffDashboardRecentOrders");
  const recentOrdersEmpty = $("#staffDashboardRecentOrdersEmpty");
  const empty = $("#staffDashboardEmpty");

  if (summaryWrap) {
    summaryWrap.setAttribute("aria-busy", String(!!isLoading));
    summaryWrap.hidden = !isLoading;
    summaryWrap.innerHTML = isLoading
      ? Array.from(
          { length: 4 },
          () => `
            <article class="staff-summary-card staff-dashboard-kpi-card is-skeleton" aria-hidden="true">
              <span class="staff-dashboard-kpi-skeleton-line is-label"></span>
              <span class="staff-dashboard-kpi-skeleton-line is-value"></span>
              <span class="staff-dashboard-kpi-skeleton-line is-note"></span>
            </article>
          `
        ).join("")
      : "";
  }

  if (isLoading) {
    setStaffDashboardTrendLoading();
  } else {
    renderStaffDashboardTrend(null);
  }

  if (insightsCopy) {
    insightsCopy.hidden = true;
    insightsCopy.textContent =
      "Read-only manager insights grounded only in the report cards already loaded for this hotel.";
  }

  if (insightsWrap) {
    insightsWrap.setAttribute("aria-busy", String(!!isLoading));
    insightsWrap.hidden = !isLoading;
    insightsWrap.innerHTML = isLoading
      ? `
          <div class="staff-manager-insights-skeleton" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        `
      : "";
  }

  if (supportSummaryWrap) {
    supportSummaryWrap.setAttribute("aria-busy", String(!!isLoading));
    supportSummaryWrap.hidden = !isLoading;
    supportSummaryWrap.innerHTML = isLoading
      ? `
          <section class="staff-dashboard-operations-card is-skeleton" aria-hidden="true">
            <span class="staff-dashboard-operation-skeleton-heading"></span>
            <span class="staff-dashboard-operation-skeleton-row"></span>
            <span class="staff-dashboard-operation-skeleton-row"></span>
            <span class="staff-dashboard-operation-skeleton-row"></span>
            <span class="staff-dashboard-operation-skeleton-row"></span>
            <span class="staff-dashboard-operation-skeleton-status"></span>
          </section>
        `
      : "";
  }

  if (orderSourcesWrap) {
    orderSourcesWrap.setAttribute("aria-busy", String(!!isLoading));
    orderSourcesWrap.hidden = !isLoading;
    orderSourcesWrap.innerHTML = isLoading
      ? `
          <div class="staff-dashboard-source-skeleton" aria-hidden="true">
            <span class="staff-dashboard-source-skeleton-bar"></span>
            <span class="staff-dashboard-source-skeleton-line"></span>
            <span class="staff-dashboard-source-skeleton-line is-short"></span>
          </div>
        `
      : "";
  }

  if (orderSourcesEmpty) {
    orderSourcesEmpty.hidden = true;
  }

  if (recentOrdersWrap) {
    recentOrdersWrap.setAttribute("aria-busy", String(!!isLoading));
    recentOrdersWrap.hidden = !isLoading;
    recentOrdersWrap.innerHTML = isLoading
      ? `
          <div class="staff-dashboard-recent-skeleton" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        `
      : "";
  }

  if (recentOrdersEmpty) {
    recentOrdersEmpty.hidden = true;
  }

  if (empty) {
    empty.hidden = false;
    empty.textContent = message;
    empty.classList.toggle("is-loading", !!isLoading);
  }
}

function renderStaffDashboardOrdersWidgetErrors(message = "Dashboard order data could not be loaded.") {
  const safeMessage = String(message || "Dashboard order data could not be loaded.").trim();
  const retryMarkup = `
    <div class="staff-dashboard-widget-state is-error" role="alert">
      <span>${escapeHTML(safeMessage)}</span>
      <button class="staff-btn secondary" type="button" data-staff-dashboard-orders-retry>Retry</button>
    </div>
  `;
  const targets = [
    "#staffDashboardSummary",
    "#staffDashboardOrderSources",
    "#staffDashboardSupportSummary",
    "#staffDashboardRecentOrders"
  ];

  targets.forEach((selector) => {
    const target = $(selector);
    if (!target) return;
    target.hidden = false;
    target.setAttribute("aria-busy", "false");
    target.innerHTML = retryMarkup;
  });

  ["#staffDashboardEmpty", "#staffDashboardOrderSourcesEmpty", "#staffDashboardRecentOrdersEmpty"]
    .forEach((selector) => {
      const target = $(selector);
      if (target) target.hidden = true;
    });

  renderStaffDashboardTrend(STAFF_STATE.dashboardTrend);
  renderStaffDashboardAiInsights(STAFF_STATE.dashboardReports);
}

function renderStaffOrdersSummary(orders = []) {
  if (!isStaffManagerSession()) {
    setStaffDashboardSummaryEmpty("Manager access required for the dashboard summary.");
    return;
  }

  renderStaffDashboardPrimaryKpis(orders, STAFF_STATE.dashboardReports);
  renderStaffDashboardOrderSources(orders);
  renderStaffDashboardRecentOrders(orders);
  renderStaffDashboardSupportSummary(STAFF_STATE.supportRequests);
}

function buildStaffReportNote(summary = {}) {
  return [
    `${summary.totalOrders || 0} order${summary.totalOrders === 1 ? "" : "s"}`,
    `${summary.paidOrders || 0} paid / ${summary.unpaidOrders || 0} unpaid`,
    `${summary.qrOrders || 0} QR / ${summary.websiteOrders || 0} website`
  ].join(" - ");
}

function getStaffReportSummary(reports = STAFF_STATE.dashboardReports, key = "") {
  if (!reports || typeof reports !== "object") {
    return {};
  }

  return reports[key] && typeof reports[key] === "object" ? reports[key] : {};
}

function buildStaffDashboardAiInsightLine(label, copy, options = {}) {
  const isFeatured = Boolean(options.isFeatured);
  const featuredBadgeLabel = String(options.featuredBadgeLabel || "Best current signal").trim() || "Best current signal";

  return `
    <li class="staff-ai-insights-item${isFeatured ? " is-featured" : ""}">
      <div class="staff-ai-insights-item-head">
        <p class="staff-ai-insights-item-label">${escapeHTML(label)}</p>
        ${
          isFeatured
            ? `<span class="staff-ai-insights-item-badge">${escapeHTML(featuredBadgeLabel)}</span>`
            : ""
        }
      </div>
      <p class="staff-ai-insights-item-copy">${escapeHTML(copy)}</p>
    </li>
  `;
}

function getStaffDashboardAiItemSalesInsight(itemSalesReports = STAFF_STATE.itemSalesReports) {
  const period = getPreferredStaffItemSalesPeriod(itemSalesReports);
  const summary = getStaffItemSalesReportSummary(itemSalesReports, period.key);
  const menuMoversLead =
    period.key === "month"
      ? "This month's menu movers"
      : period.key === "week"
        ? "Menu movers for the last 7 days"
        : "Today's menu movers";

  if (!summary || Number(summary.totalDistinctItems || 0) <= 0) {
    return {
      label: "Menu movers",
      copy: `${menuMoversLead} are still building for this hotel, so the rule-based summary is waiting before calling out top or low-selling dishes.`
    };
  }

  const topItems = Array.isArray(summary.topItems) ? summary.topItems : [];
  const lowItems = Array.isArray(summary.lowItems) ? summary.lowItems : [];
  const topItem = topItems[0] || null;
  const lowItem = lowItems[0] || null;
  const topName = String(topItem?.itemName || topItem?.itemId || "").trim();
  const lowName = String(lowItem?.itemName || lowItem?.itemId || "").trim();
  const sameLeadItem =
    topItem &&
    lowItem &&
    String(topItem.itemId || "").trim() &&
    String(topItem.itemId || "").trim() === String(lowItem.itemId || "").trim();

  if (topItem && lowItem && !sameLeadItem && topName && lowName) {
    return {
      label: "Menu movers",
      copy: `${menuMoversLead} show ${topName} leading at ${topItem.quantitySold || 0} sold for ${formatMoney(topItem.revenue || 0)}, while ${lowName} is currently the lightest seller among sold items at ${lowItem.quantitySold || 0} sold for ${formatMoney(lowItem.revenue || 0)}.`
    };
  }

  if (topItem && topName) {
    return {
      label: "Menu movers",
      copy: `${menuMoversLead} currently have ${topName} as the clearest seller at ${topItem.quantitySold || 0} sold across ${topItem.orderCount || 0} order${Number(topItem.orderCount || 0) === 1 ? "" : "s"}, bringing in ${formatMoney(topItem.revenue || 0)}.`
    };
  }

  return {
    label: "Menu movers",
    copy: `${menuMoversLead} are available, but there is not enough stable variety yet to describe top and low-selling dishes confidently.`
  };
}

function getStaffDashboardAiOperationalWatchInsight(
  reports = STAFF_STATE.dashboardReports,
  itemSalesReports = STAFF_STATE.itemSalesReports
) {
  const today = getStaffReportSummary(reports, "today");
  const week = getStaffReportSummary(reports, "week");
  const todayOrders = Number(today.totalOrders || 0);
  const todayUnbilledOrders = Number(today.unbilledOrders || 0);
  const weekUnpaidOrders = Number(week.unpaidOrders || 0);
  const weekUnpaidEarnings = Number(week.unpaidEarnings || 0);
  const hasTodayBillingWatch = todayOrders > 0 && todayUnbilledOrders > 0;
  const hasWeeklyPaymentWatch = weekUnpaidOrders > 0;
  const period = getPreferredStaffItemSalesPeriod(itemSalesReports);
  const itemSummary = getStaffItemSalesReportSummary(itemSalesReports, period.key);
  const topItem = Array.isArray(itemSummary?.topItems) ? itemSummary.topItems[0] || null : null;
  const lowItem = Array.isArray(itemSummary?.lowItems) ? itemSummary.lowItems[0] || null : null;
  const topItemId = String(topItem?.itemId || "").trim();
  const lowItemId = String(lowItem?.itemId || "").trim();
  const lowItemName = String(lowItem?.itemName || lowItemId || "").trim();
  const hasDistinctLowSeller =
    Number(itemSummary?.totalDistinctItems || 0) > 1 &&
    lowItem &&
    lowItemName &&
    (!topItemId || topItemId !== lowItemId);
  const operationalWatchLead =
    hasWeeklyPaymentWatch && hasTodayBillingWatch
      ? "The active watch across the last 7 days and today"
      : hasWeeklyPaymentWatch
        ? "The last 7 days operational watch"
        : hasTodayBillingWatch
          ? "Today's operational watch"
          : `${period.label} operational watch`;
  const watchParts = [];

  if (hasWeeklyPaymentWatch) {
    watchParts.push(
      `${weekUnpaidOrders} unpaid order${weekUnpaidOrders === 1 ? "" : "s"} from the last 7 days still hold ${formatMoney(weekUnpaidEarnings)} in pending collection`
    );
  }

  if (hasTodayBillingWatch) {
    watchParts.push(
      `${todayUnbilledOrders} of today's order${todayUnbilledOrders === 1 ? "" : "s"} still need bill closure`
    );
  }

  if (hasDistinctLowSeller) {
    watchParts.push(
      `${lowItemName} is currently the slowest-moving sold item in ${period.label.toLowerCase()} at ${lowItem.quantitySold || 0} sold`
    );
  }

  if (!watchParts.length) {
    return {
      label: "Operational watchlist",
      copy: `${operationalWatchLead} looks calm: unpaid carryover is clear, today's bill closure looks steady, and no slower-moving sold item needs a caution note yet.`
    };
  }

  return {
    label: "Operational watchlist",
    copy: `${operationalWatchLead} is ${watchParts.join("; ")}.`
  };
}

function getStaffDashboardAiSourceBalanceInsight(reports = STAFF_STATE.dashboardReports) {
  const month = getStaffReportSummary(reports, "month");
  const monthQrOrders = Number(month.qrOrders || 0);
  const monthWebsiteOrders = Number(month.websiteOrders || 0);
  const monthQrEarnings = Number(month.qrEarnings || 0);
  const monthWebsiteEarnings = Number(month.websiteEarnings || 0);
  const totalOrders = monthQrOrders + monthWebsiteOrders;

  if (totalOrders <= 0) {
    return {
      label: "Source balance",
      copy: "This month is still too quiet to flag a table versus website balance caution yet."
    };
  }

  const qrShare = monthQrOrders / totalOrders;
  const websiteShare = monthWebsiteOrders / totalOrders;
  const qrDominant = qrShare >= websiteShare;
  const dominantLabel = qrDominant ? "Table" : "Website";
  const supportingLabel = qrDominant ? "website" : "table";
  const dominantOrders = qrDominant ? monthQrOrders : monthWebsiteOrders;
  const supportingOrders = qrDominant ? monthWebsiteOrders : monthQrOrders;
  const dominantRevenue = qrDominant ? monthQrEarnings : monthWebsiteEarnings;
  const supportingRevenue = qrDominant ? monthWebsiteEarnings : monthQrEarnings;
  const dominantShare = qrDominant ? qrShare : websiteShare;
  const shareLabel = `${Math.round(dominantShare * 100)}%`;

  if (totalOrders >= 4 && dominantShare >= 0.75) {
    return {
      label: "Source balance",
      copy: `${dominantLabel} ordering is carrying about ${shareLabel} of this month's order count at ${dominantOrders} order${dominantOrders === 1 ? "" : "s"} and ${formatMoney(dominantRevenue)}, while ${supportingLabel} is still lighter at ${supportingOrders} order${supportingOrders === 1 ? "" : "s"} and ${formatMoney(supportingRevenue)}. This is worth watching before the mix becomes too one-sided.`
    };
  }

  if (totalOrders >= 4 && dominantShare >= 0.65) {
    return {
      label: "Source balance",
      copy: `${dominantLabel} ordering is the stronger lane this month at about ${shareLabel} of order count, but the mix is still broad enough that this reads as a watch item rather than a concern.`
    };
  }

  return {
    label: "Source balance",
    copy: `This month still looks reasonably balanced between table and website ordering, with ${monthQrOrders} table order${monthQrOrders === 1 ? "" : "s"} and ${monthWebsiteOrders} website order${monthWebsiteOrders === 1 ? "" : "s"}.`
  };
}

function getStaffDashboardAiQuietStateInsight(
  reports = STAFF_STATE.dashboardReports,
  itemSalesReports = STAFF_STATE.itemSalesReports
) {
  const today = getStaffReportSummary(reports, "today");
  const week = getStaffReportSummary(reports, "week");
  const month = getStaffReportSummary(reports, "month");
  const period = getPreferredStaffItemSalesPeriod(itemSalesReports);
  const itemSummary = getStaffItemSalesReportSummary(itemSalesReports, period.key);
  const todayOrders = Number(today.totalOrders || 0);
  const todayUnbilledOrders = Number(today.unbilledOrders || 0);
  const weekOrders = Number(week.totalOrders || 0);
  const weekUnpaidOrders = Number(week.unpaidOrders || 0);
  const monthOrders = Number(month.totalOrders || 0);
  const distinctSoldItems = Number(itemSummary?.totalDistinctItems || 0);
  const quietSnapshotLabel =
    todayOrders > 0
      ? "Today"
      : weekOrders > 0
        ? "Last 7 days"
        : monthOrders > 0
          ? "This month"
          : "Today, last 7 days, and this month";
  const hasMeaningfulSourcePattern = monthOrders >= 4;
  const hasMeaningfulSoldItemPattern = distinctSoldItems >= 2;

  if (
    weekUnpaidOrders > 0 ||
    todayUnbilledOrders > 0 ||
    todayOrders >= 2 ||
    weekOrders >= 4 ||
    monthOrders >= 6 ||
    hasMeaningfulSourcePattern ||
    hasMeaningfulSoldItemPattern
  ) {
    return null;
  }

  if (monthOrders <= 0) {
    return {
      label: "Quiet dashboard",
      copy: `${quietSnapshotLabel} is still very quiet for this hotel, so the rule-based summary stays cautious until more order movement builds up.`
    };
  }

  return {
    label: "Quiet dashboard",
    copy: `${quietSnapshotLabel} is the clearest quiet snapshot here, and this hotel is still in a light-activity window with ${monthOrders} month-to-date order${monthOrders === 1 ? "" : "s"} and ${weekOrders} order${weekOrders === 1 ? "" : "s"} in the last 7 days, so the current manager summary should be read as an early signal rather than a strong trend.`
  };
}

function getStaffDashboardAiConfidenceNote(
  reports = STAFF_STATE.dashboardReports,
  itemSalesReports = STAFF_STATE.itemSalesReports
) {
  const today = getStaffReportSummary(reports, "today");
  const week = getStaffReportSummary(reports, "week");
  const month = getStaffReportSummary(reports, "month");
  const period = getPreferredStaffItemSalesPeriod(itemSalesReports);
  const itemSummary = getStaffItemSalesReportSummary(itemSalesReports, period.key);
  const todayOrders = Number(today.totalOrders || 0);
  const todayUnbilledOrders = Number(today.unbilledOrders || 0);
  const weekUnpaidOrders = Number(week.unpaidOrders || 0);
  const monthQrOrders = Number(month.qrOrders || 0);
  const monthWebsiteOrders = Number(month.websiteOrders || 0);
  const hasMonthlySourceTrend =
    monthQrOrders > 0 ||
    monthWebsiteOrders > 0;
  const hasSoldItemSignal = Number(itemSummary?.totalDistinctItems || 0) > 0;
  const quietStateInsight = getStaffDashboardAiQuietStateInsight(reports, itemSalesReports);

  if (weekUnpaidOrders > 0) {
    return `Strongest signal right now: Last 7 days, because pending collection follow-up is still active.`;
  }

  if (todayUnbilledOrders > 0) {
    return `Strongest signal right now: Today, because bill closure still needs attention on live orders.`;
  }

  if (quietStateInsight) {
    if (todayOrders > 0) {
      return `Confidence is intentionally soft right now: Today offers the clearest live read, but overall activity is still light.`;
    }

    if (hasMonthlySourceTrend) {
      return `Confidence is intentionally soft right now: This month offers the clearest pattern so far, but the order sample is still light.`;
    }

    if (hasSoldItemSignal) {
      return `Confidence is intentionally soft right now: ${period.label} offers the clearest sold-item read so far, but the sample is still early.`;
    }
  }

  if (todayOrders > 0) {
    return `Strongest signal right now: Today, because the clearest live pace read is coming from current order activity.`;
  }

  if (hasMonthlySourceTrend) {
    return `Strongest signal right now: This month, because source mix is the clearest stable trend available.`;
  }

  if (hasSoldItemSignal) {
    return `Strongest signal right now: ${period.label}, because sold-item movement is the clearest stable pattern available.`;
  }

  return "Confidence is still light here because this hotel does not have enough current report movement yet.";
}

function getStaffDashboardAiFreshnessNote(
  reports = STAFF_STATE.dashboardReports,
  itemSalesReports = STAFF_STATE.itemSalesReports
) {
  const freshnessLabel = String(STAFF_STATE.dashboardReportsFreshnessLabel || "").trim();
  const quietStateInsight = getStaffDashboardAiQuietStateInsight(reports, itemSalesReports);

  if (quietStateInsight) {
    return freshnessLabel
      ? `Insight snapshot: ${freshnessLabel}. Activity is still quiet, so treat this as a light checkpoint.`
      : "Insight snapshot is waiting for the first manager report refresh while activity is still quiet.";
  }

  return freshnessLabel
    ? `Insight snapshot: ${freshnessLabel}.`
    : "Insight snapshot is waiting for the first manager report refresh.";
}

function getStaffDashboardAiFeaturedLabel(
  reports = STAFF_STATE.dashboardReports,
  itemSalesReports = STAFF_STATE.itemSalesReports
) {
  const today = getStaffReportSummary(reports, "today");
  const week = getStaffReportSummary(reports, "week");
  const month = getStaffReportSummary(reports, "month");
  const weekUnpaidOrders = Number(week.unpaidOrders || 0);
  const todayUnbilledOrders = Number(today.unbilledOrders || 0);
  const todayOrders = Number(today.totalOrders || 0);
  const monthQrOrders = Number(month.qrOrders || 0);
  const monthWebsiteOrders = Number(month.websiteOrders || 0);
  const monthTotalOrders = monthQrOrders + monthWebsiteOrders;
  const dominantShare = monthTotalOrders
    ? Math.max(monthQrOrders, monthWebsiteOrders) / monthTotalOrders
    : 0;
  const quietStateInsight = getStaffDashboardAiQuietStateInsight(reports, itemSalesReports);
  const itemPeriod = getPreferredStaffItemSalesPeriod(itemSalesReports);
  const itemSummary = getStaffItemSalesReportSummary(itemSalesReports, itemPeriod.key);
  const hasSoldItemSignal = Number(itemSummary?.totalDistinctItems || 0) > 0;

  if (weekUnpaidOrders > 0) {
    return "Payment watch";
  }

  if (todayUnbilledOrders > 0) {
    return "Operational watchlist";
  }

  if (monthTotalOrders >= 4 && dominantShare >= 0.75) {
    return "Source balance";
  }

  if (quietStateInsight) {
    return "";
  }

  if (todayOrders > 0) {
    return "Today at a glance";
  }

  if (hasSoldItemSignal) {
    return "Menu movers";
  }

  if (quietStateInsight) {
    return "Quiet dashboard";
  }

  return "Source mix";
}

function getStaffDashboardAiFeaturedBadgeLabel(featuredLabel = "") {
  const normalizedLabel = String(featuredLabel || "").trim();
  const cautionLabels = new Set(["Payment watch", "Operational watchlist", "Source balance"]);
  const calmSummaryLabels = new Set(["Today at a glance", "Source mix", "Menu movers", "Quiet dashboard"]);

  if (cautionLabels.has(normalizedLabel)) {
    return "Watch now";
  }

  if (calmSummaryLabels.has(normalizedLabel)) {
    return "Worth noting";
  }

  return "Best current signal";
}

function getStaffDashboardAiInsightItems(
  reports = STAFF_STATE.dashboardReports,
  itemSalesReports = STAFF_STATE.itemSalesReports
) {
  const today = getStaffReportSummary(reports, "today");
  const week = getStaffReportSummary(reports, "week");
  const month = getStaffReportSummary(reports, "month");

  const todayOrders = Number(today.totalOrders || 0);
  const weekUnpaidOrders = Number(week.unpaidOrders || 0);
  const monthQrOrders = Number(month.qrOrders || 0);
  const monthWebsiteOrders = Number(month.websiteOrders || 0);
  const monthQrEarnings = Number(month.qrEarnings || 0);
  const monthWebsiteEarnings = Number(month.websiteEarnings || 0);
  const todayAtAGlanceLead = "Today's at-a-glance view";
  const paymentWatchLead = "The last 7 days payment watch";
  const sourceMixLead = "This month's source mix";

  const items = [];
  const quietStateInsight = getStaffDashboardAiQuietStateInsight(
    reports,
    itemSalesReports
  );

  items.push({
    label: "Today at a glance",
    copy: todayOrders
      ? `${todayAtAGlanceLead} is running at ${formatMoney(today.totalEarnings || 0)} from ${todayOrders} order${todayOrders === 1 ? "" : "s"}, with ${today.paidOrders || 0} already marked paid.`
      : `${todayAtAGlanceLead} does not have any recorded orders yet in this hotel's manager report.`
  });

  if (quietStateInsight) {
    items.push(quietStateInsight);
  }

  items.push({
    label: "Payment watch",
    copy: weekUnpaidOrders
      ? `${paymentWatchLead} still shows ${weekUnpaidOrders} unpaid order${weekUnpaidOrders === 1 ? "" : "s"} worth ${formatMoney(week.unpaidEarnings || 0)}, so payment follow-up is still active.`
      : `${paymentWatchLead} shows all reported orders marked paid, covering ${formatMoney(week.paidEarnings || 0)} in confirmed paid revenue.`
  });

  if (monthQrOrders === 0 && monthWebsiteOrders === 0) {
    items.push({
      label: "Source mix",
      copy: `${sourceMixLead} does not have enough order-source activity yet to explain a table versus website trend.`
    });
  } else if (monthQrOrders > monthWebsiteOrders) {
    items.push({
      label: "Source mix",
      copy: `${sourceMixLead} shows table ordering leading at ${monthQrOrders} order${monthQrOrders === 1 ? "" : "s"} and ${formatMoney(monthQrEarnings)}, ahead of website ordering at ${monthWebsiteOrders} order${monthWebsiteOrders === 1 ? "" : "s"} and ${formatMoney(monthWebsiteEarnings)}.`
    });
  } else if (monthWebsiteOrders > monthQrOrders) {
    items.push({
      label: "Source mix",
      copy: `${sourceMixLead} shows website ordering leading at ${monthWebsiteOrders} order${monthWebsiteOrders === 1 ? "" : "s"} and ${formatMoney(monthWebsiteEarnings)}, ahead of table ordering at ${monthQrOrders} order${monthQrOrders === 1 ? "" : "s"} and ${formatMoney(monthQrEarnings)}.`
    });
  } else {
    items.push({
      label: "Source mix",
      copy: `${sourceMixLead} is evenly split by order count, with ${monthQrOrders} table order${monthQrOrders === 1 ? "" : "s"} and ${monthWebsiteOrders} website order${monthWebsiteOrders === 1 ? "" : "s"}, while revenue is ${formatMoney(monthQrEarnings)} versus ${formatMoney(monthWebsiteEarnings)}.`
    });
  }

  items.push(getStaffDashboardAiSourceBalanceInsight(reports));
  items.push(getStaffDashboardAiOperationalWatchInsight(reports, itemSalesReports));
  items.push(getStaffDashboardAiItemSalesInsight(itemSalesReports));

  return items;
}

function renderStaffDashboardAiInsights(reports = STAFF_STATE.dashboardReports) {
  const insightsCopy = $("#staffDashboardAiInsightsCopy");
  const insightsWrap = $("#staffDashboardAiInsights");

  if (!insightsWrap) return;

  if (!isStaffManagerSession()) {
    if (insightsCopy) insightsCopy.hidden = true;
    insightsWrap.setAttribute("aria-busy", "false");
    insightsWrap.hidden = true;
    insightsWrap.innerHTML = "";
    return;
  }

  const hasReports = reports && typeof reports === "object";
  if (!hasReports) {
    if (insightsCopy) insightsCopy.hidden = true;
    insightsWrap.setAttribute("aria-busy", "false");
    insightsWrap.hidden = !STAFF_STATE.dashboardReportsError;
    insightsWrap.innerHTML = STAFF_STATE.dashboardReportsError
      ? `
          <div class="staff-dashboard-widget-state is-error" role="alert">
            <span>Manager Insights could not be loaded.</span>
            <button class="staff-btn secondary" type="button" data-staff-dashboard-insights-retry>Retry</button>
          </div>
        `
      : "";
    return;
  }

  const itemSalesReports = STAFF_STATE.itemSalesReports;
  const insightItems = getStaffDashboardAiInsightItems(reports, itemSalesReports);
  const featuredLabel = getStaffDashboardAiFeaturedLabel(reports, itemSalesReports);
  const featuredIndex = Math.max(
    0,
    insightItems.findIndex((item) => item.label === featuredLabel)
  );
  const featuredInsight = insightItems[featuredIndex] || {
    label: "Manager summary",
    copy: "The loaded hotel reports do not yet contain a stable operational signal."
  };
  const secondaryInsights = insightItems.filter((item, index) => index !== featuredIndex);
  const featuredBadgeLabel = getStaffDashboardAiFeaturedBadgeLabel(featuredInsight.label);
  const confidenceNote = getStaffDashboardAiConfidenceNote(reports, itemSalesReports);
  const freshnessNote = getStaffDashboardAiFreshnessNote(reports, itemSalesReports);
  const sellerPeriod = getPreferredStaffItemSalesPeriod(itemSalesReports);
  const sellerSummary = getStaffItemSalesReportSummary(itemSalesReports, sellerPeriod.key);
  const topSellers = Array.isArray(sellerSummary?.topItems)
    ? sellerSummary.topItems.slice(0, 2)
    : [];
  const topSellerMarkup = STAFF_STATE.itemSalesReportsError
    ? `
        <li class="staff-manager-insights-seller is-empty">
          <span>Top sellers could not be loaded.</span>
          <button class="staff-btn secondary" type="button" data-staff-dashboard-insights-retry>Retry</button>
        </li>
      `
    : topSellers.length
      ? topSellers
        .map((item) => {
          const itemName = String(item?.itemName || item?.itemId || "Unnamed item").trim();
          const quantitySold = Number(item?.quantitySold || 0);
          return `
            <li class="staff-manager-insights-seller">
              <span>${escapeHTML(itemName)}</span>
              <small>${escapeHTML(`${quantitySold} sold`)}</small>
            </li>
          `;
        })
        .join("")
      : `
        <li class="staff-manager-insights-seller is-empty">
          <span>No sold items yet in the loaded ${escapeHTML(sellerPeriod.label.toLowerCase())} report.</span>
        </li>
      `;

  if (insightsCopy) {
    insightsCopy.hidden = true;
  }

  insightsWrap.setAttribute("aria-busy", "false");
  insightsWrap.hidden = false;
  insightsWrap.innerHTML = `
    <header class="staff-manager-insights-head">
      <div>
        <h3>Manager Insights</h3>
        <p class="staff-manager-insights-intro">Rule-based summary from the manager reports already loaded for this hotel.</p>
      </div>
      <span class="staff-manager-insights-rule-badge">Rule-based summary</span>
    </header>

    <section class="staff-manager-insights-featured" aria-label="Primary manager insight">
      <div class="staff-manager-insights-featured-head">
        <p class="staff-manager-insights-featured-label">${escapeHTML(featuredInsight.label)}</p>
        <span class="staff-manager-insights-featured-badge">${escapeHTML(featuredBadgeLabel)}</span>
      </div>
      <p class="staff-manager-insights-featured-copy">${escapeHTML(featuredInsight.copy)}</p>
    </section>

    <section class="staff-manager-insights-sellers" aria-label="Top sellers">
      <h4>Top sellers · ${escapeHTML(sellerPeriod.label)}</h4>
      <ol class="staff-manager-insights-seller-list">
        ${topSellerMarkup}
      </ol>
    </section>

    ${
      secondaryInsights.length
        ? `
            <details class="staff-manager-insights-more">
              <summary>More verified insights <span>${secondaryInsights.length}</span></summary>
              <ul class="staff-ai-insights-list">
                ${secondaryInsights
                  .map(({ label, copy }) => buildStaffDashboardAiInsightLine(label, copy))
                  .join("")}
              </ul>
            </details>
          `
        : ""
    }

    <footer class="staff-manager-insights-footer">
      <p>${escapeHTML(confidenceNote)}</p>
      <p>${escapeHTML(freshnessNote)}</p>
    </footer>
  `;
}
function getStaffItemSalesReportSummary(reports = STAFF_STATE.itemSalesReports, key = "") {
  if (!reports || typeof reports !== "object") {
    return null;
  }

  const summary = reports[key];
  return summary && typeof summary === "object" ? summary : null;
}

function getPreferredStaffItemSalesPeriod(reports = STAFF_STATE.itemSalesReports) {
  const periodOptions = [
    { key: "month", label: "This month" },
    { key: "week", label: "Last 7 days" },
    { key: "today", label: "Today" }
  ];

  return (
    periodOptions.find(({ key }) => {
      const summary = getStaffItemSalesReportSummary(reports, key);
      return summary && Number(summary.totalDistinctItems || 0) > 0;
    }) || periodOptions[0]
  );
}

function buildStaffItemSalesListMarkup(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return `
      <li class="staff-item-sales-row">
        <p class="staff-item-sales-name">No sold items yet</p>
        <p class="staff-item-sales-copy">This report window does not have enough sold-item history yet.</p>
      </li>
    `;
  }

  return items
    .map((item) => {
      const itemName = String(item?.itemName || item?.itemId || "Unnamed item").trim();
      const quantitySold = Number(item?.quantitySold || 0);
      const revenue = Number(item?.revenue || 0);
      const orderCount = Number(item?.orderCount || 0);

      return `
        <li class="staff-item-sales-row">
          <p class="staff-item-sales-name">${escapeHTML(itemName)}</p>
          <p class="staff-item-sales-copy">${escapeHTML(`${quantitySold} sold across ${orderCount} order${orderCount === 1 ? "" : "s"} - ${formatMoney(revenue)}`)}</p>
        </li>
      `;
    })
    .join("");
}

function buildStaffItemSalesCard({
  title = "",
  label = "",
  note = "",
  items = [],
  className = ""
} = {}) {
  const cardClassName = ["staff-summary-card", "staff-item-sales-card", className]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${escapeHTML(cardClassName)}">
      <p class="staff-summary-label">${escapeHTML(label)}</p>
      <p class="staff-summary-value">${escapeHTML(title)}</p>
      <p class="staff-item-sales-period">${escapeHTML(note)}</p>
      <ul class="staff-item-sales-list">
        ${buildStaffItemSalesListMarkup(items)}
      </ul>
    </article>
  `;
}

function renderStaffDashboardItemSalesReports(reports = STAFF_STATE.itemSalesReports) {
  const itemSalesCopy = $("#staffDashboardItemSalesCopy");
  const itemSalesWrap = $("#staffDashboardItemSales");

  if (!itemSalesWrap) return;

  if (!isStaffManagerSession()) {
    if (itemSalesCopy) itemSalesCopy.hidden = true;
    itemSalesWrap.hidden = true;
    itemSalesWrap.innerHTML = "";
    return;
  }

  const period = getPreferredStaffItemSalesPeriod(reports);
  const summary = getStaffItemSalesReportSummary(reports, period.key);

  if (!summary) {
    if (itemSalesCopy) itemSalesCopy.hidden = true;
    itemSalesWrap.hidden = true;
    itemSalesWrap.innerHTML = "";
    return;
  }

  const distinctItems = Number(summary.totalDistinctItems || 0);
  const unitsSold = Number(summary.totalUnitsSold || 0);
  const totalRevenue = Number(summary.totalRevenue || 0);

  if (itemSalesCopy) {
    itemSalesCopy.hidden = false;
    itemSalesCopy.textContent =
      `${period.label} sold-item snapshot for this hotel: ${distinctItems} distinct sold item${distinctItems === 1 ? "" : "s"}, ${unitsSold} unit${unitsSold === 1 ? "" : "s"}, and ${formatMoney(totalRevenue)} in item revenue. Low-selling still means low among sold items only.`;
  }

  itemSalesWrap.hidden = false;
  itemSalesWrap.innerHTML = [
    buildStaffItemSalesCard({
      label: `${period.label} top sellers`,
      title: "Top-selling items",
      note: `${distinctItems} sold item${distinctItems === 1 ? "" : "s"} in this report window`,
      items: Array.isArray(summary.topItems) ? summary.topItems : []
    }),
    buildStaffItemSalesCard({
      label: `${period.label} low sellers`,
      title: "Low-selling items",
      note: "Low means lowest among items that still sold in this report window",
      items: Array.isArray(summary.lowItems) ? summary.lowItems : [],
      className: "is-low-selling"
    })
  ].join("");
}

function destroyStaffDashboardTrendChart() {
  if (!staffDashboardTrendChart) return;

  staffDashboardTrendChart.destroy();
  staffDashboardTrendChart = null;
}

function setStaffDashboardTrendLoading() {
  destroyStaffDashboardTrendChart();
  const trendWrap = $("#staffDashboardTrend");
  const trendEmpty = $("#staffDashboardTrendEmpty");
  const trendError = $("#staffDashboardTrendError");
  const summary = $("#staffDashboardTrendSummary");
  const comparison = $("#staffDashboardTrendComparison");

  if (summary) summary.textContent = "Loading…";
  if (comparison) comparison.hidden = true;
  if (trendEmpty) trendEmpty.hidden = true;
  if (trendError) trendError.hidden = true;
  if (!trendWrap) return;

  trendWrap.hidden = false;
  trendWrap.setAttribute("aria-busy", "true");
  trendWrap.innerHTML = `
    <div class="staff-dashboard-trend-skeleton" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </div>
  `;
}

function renderStaffDashboardTrend(trend = STAFF_STATE.dashboardTrend) {
  const trendWrap = $("#staffDashboardTrend");
  const trendEmpty = $("#staffDashboardTrendEmpty");
  const trendError = $("#staffDashboardTrendError");
  const summaryTarget = $("#staffDashboardTrendSummary");
  const comparisonTarget = $("#staffDashboardTrendComparison");
  if (!trendWrap) return;

  destroyStaffDashboardTrendChart();
  trendWrap.setAttribute("aria-busy", "false");
  trendWrap.innerHTML = "";
  if (trendEmpty) trendEmpty.hidden = true;
  if (trendError) trendError.hidden = true;
  if (comparisonTarget) {
    comparisonTarget.hidden = true;
    comparisonTarget.classList.remove("is-negative");
  }

  if (!isStaffManagerSession()) {
    trendWrap.hidden = true;
    if (summaryTarget) summaryTarget.textContent = "--";
    return;
  }

  const points = Array.isArray(trend?.points) ? trend.points.slice(0, 7) : [];
  const trendSummary = trend?.summary && typeof trend.summary === "object" ? trend.summary : {};

  if (!trend && !STAFF_STATE.dashboardTrendError) {
    trendWrap.hidden = true;
    if (summaryTarget) summaryTarget.textContent = "--";
    return;
  }

  if (STAFF_STATE.dashboardTrendError || !points.length || trend?.financialsVisible === false) {
    trendWrap.hidden = true;
    if (summaryTarget) summaryTarget.textContent = "Unavailable";
    if (trendError) trendError.hidden = false;
    return;
  }

  const revenue = Number(trendSummary.revenue || 0);
  const orderCount = Number(trendSummary.orderCount || 0);
  if (summaryTarget) summaryTarget.textContent = formatMoney(revenue);

  const rawComparisonPercent = trendSummary.comparisonPercent;
  const comparisonPercent = Number(rawComparisonPercent);
  if (
    comparisonTarget &&
    rawComparisonPercent !== null &&
    rawComparisonPercent !== undefined &&
    Number.isFinite(comparisonPercent)
  ) {
    comparisonTarget.textContent = `${comparisonPercent >= 0 ? "+" : "-"} ${Math.abs(comparisonPercent).toFixed(1)}%`;
    comparisonTarget.classList.toggle("is-negative", comparisonPercent < 0);
    comparisonTarget.hidden = false;
  }

  if (!orderCount && !revenue) {
    trendWrap.hidden = true;
    if (trendEmpty) trendEmpty.hidden = false;
    return;
  }

  if (typeof window.Chart !== "function") {
    trendWrap.hidden = true;
    if (summaryTarget) summaryTarget.textContent = "Unavailable";
    if (trendError) trendError.hidden = false;
    console.error("Chart.js is unavailable; the dashboard trend cannot be rendered.");
    return;
  }

  const revenueValues = points.map((point) => Math.max(0, Number(point.revenue || 0)));
  const orderValues = points.map((point) => Math.max(0, Number(point.orderCount || 0)));
  const useRevenueScale = Math.max(...revenueValues) > 0;
  const values = useRevenueScale ? revenueValues : orderValues;
  const accessibleSummary = `Last 7 days: ${formatMoney(revenue)} recognized revenue across ${orderCount} order${orderCount === 1 ? "" : "s"}.`;

  trendWrap.hidden = false;
  trendWrap.innerHTML = `<canvas id="staffDashboardTrendCanvas" role="img" aria-label="${escapeHTML(accessibleSummary)}"></canvas>`;

  const canvas = $("#staffDashboardTrendCanvas");
  const context = canvas?.getContext("2d");
  if (!context) {
    trendWrap.hidden = true;
    if (summaryTarget) summaryTarget.textContent = "Unavailable";
    if (trendError) trendError.hidden = false;
    return;
  }

  const fill = context.createLinearGradient(0, 0, 0, 170);
  fill.addColorStop(0, "rgba(185, 95, 70, 0.30)");
  fill.addColorStop(1, "rgba(185, 95, 70, 0.02)");
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    staffDashboardTrendChart = new window.Chart(context, {
      type: "line",
      data: {
        labels: points.map((point) => String(point.label || "")),
        datasets: [
          {
            label: useRevenueScale ? "Recognized revenue" : "Orders",
            data: values,
            borderColor: "#ad6049",
            backgroundColor: fill,
            borderWidth: 2.5,
            fill: true,
            tension: 0.34,
            cubicInterpolationMode: "monotone",
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#fffdf9",
            pointBorderColor: "#ad6049",
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : { duration: 320 },
        interaction: { mode: "index", intersect: false },
        layout: { padding: { top: 8, right: 4, bottom: 0, left: 2 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: "#2f2721",
            titleColor: "#fffdf9",
            bodyColor: "#fffdf9",
            padding: 10,
            callbacks: {
              label(tooltipContext) {
                const point = points[tooltipContext.dataIndex] || {};
                const pointRevenue = Number(point.revenue || 0);
                const pointOrders = Number(point.orderCount || 0);
                return [
                  `${formatMoney(pointRevenue)} recognized revenue`,
                  `${pointOrders} order${pointOrders === 1 ? "" : "s"}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: { color: "#796e65", font: { size: 10 }, maxRotation: 0, minRotation: 0 }
          },
          y: {
            beginAtZero: true,
            grace: "12%",
            border: { display: false },
            grid: { color: "rgba(126, 96, 72, 0.10)", drawTicks: false },
            ticks: { display: false, maxTicksLimit: 4 }
          }
        }
      }
    });
  } catch (error) {
    destroyStaffDashboardTrendChart();
    trendWrap.hidden = true;
    if (summaryTarget) summaryTarget.textContent = "Unavailable";
    if (trendError) trendError.hidden = false;
    console.error("Unable to render the dashboard trend chart.", error);
  }
}

function renderStaffDashboardReports(reports = STAFF_STATE.dashboardReports) {
  renderStaffDashboardPrimaryKpis(STAFF_STATE.orders, reports);
  renderStaffDashboardTrend(STAFF_STATE.dashboardTrend);
  renderStaffDashboardAiInsights(reports);
}

function renderStaffOrdersQuickReports(reports = STAFF_STATE.dashboardReports) {
  const reportsCopy = $("#staffOrdersReportsCopy");
  const reportsWrap = $("#staffOrdersReports");
  if (!reportsWrap) return;

  if (!isStaffManagerSession()) {
    if (reportsCopy) reportsCopy.hidden = true;
    reportsWrap.hidden = true;
    reportsWrap.innerHTML = "";
    return;
  }

  const hasReports = reports && typeof reports === "object";
  if (!hasReports) {
    if (reportsCopy) reportsCopy.hidden = true;
    reportsWrap.hidden = true;
    reportsWrap.innerHTML = "";
    return;
  }

  const activeRange = $("#staffOrdersRangeInput")?.value || "";
  const periods = [
    { key: "today", label: "Today" },
    { key: "week", label: "Last 7 days" },
    { key: "month", label: "This month" }
  ];

  if (reportsCopy) reportsCopy.hidden = false;
  reportsWrap.hidden = false;
  reportsWrap.innerHTML = periods
    .map(({ key, label }) => {
      const summary = reports[key] && typeof reports[key] === "object" ? reports[key] : {};
      const isActivePeriod = key === activeRange;
      return buildStaffSummaryCard(
        `${label} report`,
        formatMoney(summary.totalEarnings || 0),
        buildStaffReportNote(summary),
        isActivePeriod ? "is-active-period" : ""
      );
    })
    .join("");
}

function getDefaultStaffBusinessReportType() {
  if (canStaffUseFeature("food_reports")) return "food";
  if (canStaffUseFeature("room_reports")) return "rooms";
  if (canStaffUseFeature("combined_reports")) return "combined";
  return "";
}

function canStaffUseReportType(reportType = "") {
  const featureByType = {
    food: "food_reports",
    rooms: "room_reports",
    combined: "combined_reports"
  };
  return canStaffUseFeature(featureByType[reportType] || "");
}

function renderStaffReportsCenter() {
  const defaultType = getDefaultStaffBusinessReportType();

  if (!canStaffUseReportType(STAFF_STATE.businessReportType)) {
    STAFF_STATE.businessReportType = defaultType;
    STAFF_STATE.businessReport = null;
    STAFF_STATE.businessReportLoaded = false;
  }

  document.querySelectorAll("[data-staff-report-type]").forEach((button) => {
    const reportType = String(button.dataset.staffReportType || "").trim();
    const isAllowed = canStaffUseReportType(reportType);
    button.disabled = !isAllowed;
    button.setAttribute("aria-pressed", String(reportType === STAFF_STATE.businessReportType));
    button.classList.toggle("is-active", reportType === STAFF_STATE.businessReportType);
  });
}

function setStaffReportsLoading(message = "Loading business reports...", isLoading = true) {
  const summary = $("#staffReportsSummary");
  const recommendations = $("#staffReportsRecommendations");
  const content = $("#staffReportsContent");
  const printButton = $("#staffReportsPrintBtn");
  const csvButton = $("#staffReportsCsvBtn");
  const excelButton = $("#staffReportsExcelBtn");

  [printButton, csvButton, excelButton].forEach((button) => {
    if (button) button.disabled = true;
  });

  if (summary) {
    summary.hidden = true;
    summary.innerHTML = "";
  }

  if (recommendations) {
    recommendations.hidden = true;
    recommendations.innerHTML = "";
  }

  if (content) {
    content.className = `staff-empty staff-section-stage${isLoading ? " is-loading" : ""}`;
    content.textContent = message;
  }
}

function buildStaffReportsTable(title = "", rows = [], columns = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  return `
    <section class="staff-summary-card">
      <p class="staff-summary-label">${escapeHTML(title)}</p>
      ${
        safeRows.length
          ? `
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; min-width:560px;">
                <thead>
                  <tr>
                    ${safeColumns.map((column) => `<th style="text-align:left; padding:10px; border-bottom:1px solid var(--staff-border); color:var(--staff-text-strong);">${escapeHTML(column.label)}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${safeRows
                    .map((row) => `
                      <tr>
                        ${safeColumns
                          .map((column) => `<td style="padding:10px; border-bottom:1px solid var(--staff-border);">${escapeHTML(column.format ? column.format(row) : row?.[column.key] || "")}</td>`)
                          .join("")}
                      </tr>
                    `)
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          : `<p class="staff-empty-copy">No report rows available for this period.</p>`
      }
    </section>
  `;
}

function renderStaffFoodBusinessReport(report = STAFF_STATE.businessReport) {
  const summaryWrap = $("#staffReportsSummary");
  const recommendationsWrap = $("#staffReportsRecommendations");
  const content = $("#staffReportsContent");

  if (!summaryWrap || !content) return;

  if (!report || typeof report !== "object") {
    setStaffReportsLoading("No business report data is available yet.", false);
    return;
  }

  const printButton = $("#staffReportsPrintBtn");
  const csvButton = $("#staffReportsCsvBtn");
  const excelButton = $("#staffReportsExcelBtn");

  const summary = report.summary || {};
  const items = report.items || {};
  const customers = report.customers || {};
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  const topItems = Array.isArray(items.topItems) ? items.topItems : [];
  const lowItems = Array.isArray(items.lowItems) ? items.lowItems : [];
  const topCustomers = Array.isArray(customers.topCustomers) ? customers.topCustomers : [];
  const staffPerformance = Array.isArray(report.staffPerformance) ? report.staffPerformance : [];
  const paymentStatuses = Array.isArray(report.payments?.byStatus) ? report.payments.byStatus : [];
  const orderSources = Array.isArray(report.orderSources) ? report.orderSources : [];
  const tables = Array.isArray(report.tables) ? report.tables : [];
  const topCombos = Array.isArray(report.combos?.topCombos) ? report.combos.topCombos : [];

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Net food revenue",
      formatMoney(summary.totalRevenue || 0),
      `Gross ${formatMoney(summary.grossRevenue || summary.totalRevenue || 0)} - refunds ${formatMoney(summary.refunds || 0)}`
    ),
    buildStaffSummaryCard(
      "Paid revenue",
      formatMoney(summary.paidRevenue || 0),
      `${summary.paidOrders || 0} paid / ${summary.unpaidOrders || 0} unpaid`
    ),
    buildStaffSummaryCard(
      "Average order",
      formatMoney(summary.averageOrderValue || 0),
      `Highest order ${formatMoney(summary.highestOrderValue || 0)}`
    ),
    buildStaffSummaryCard(
      "Tax and discounts",
      formatMoney(summary.taxes || 0),
      `${formatMoney(summary.discounts || 0)} discounts; ${customers.repeatCustomers || 0} repeat customers`
    )
  ].join("");

  if (recommendationsWrap) {
    recommendationsWrap.hidden = false;
    recommendationsWrap.innerHTML = `
      <section class="staff-summary-card">
        <p class="staff-summary-label">Report Recommendations</p>
        <ul class="staff-item-sales-list">
          ${recommendations.map((item) => `<li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(item)}</p></li>`).join("")}
        </ul>
      </section>
    `;
  }

  content.className = "staff-section-stage";
  content.innerHTML = [
    buildStaffReportsTable("Top-selling items", topItems, [
      { label: "Item", key: "itemName" },
      { label: "Qty", format: (row) => String(row.quantitySold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "Orders", format: (row) => String(row.orderCount || 0) }
    ]),
    buildStaffReportsTable("Low-selling items", lowItems, [
      { label: "Item", key: "itemName" },
      { label: "Qty", format: (row) => String(row.quantitySold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "Last ordered", format: (row) => row.lastOrderedAt ? formatOrderDate(row.lastOrderedAt) : "" }
    ]),
    buildStaffReportsTable("Top customers", topCustomers, [
      { label: "Customer", key: "customerName" },
      { label: "Phone", key: "phoneMasked" },
      { label: "Orders", format: (row) => String(row.totalOrders || 0) },
      { label: "Spend", format: (row) => formatMoney(row.totalSpend || 0) }
    ]),
    buildStaffReportsTable("Staff performance", staffPerformance, [
      { label: "Staff", key: "staffName" },
      { label: "Orders", format: (row) => String(row.ordersTaken || 0) },
      { label: "Sales", format: (row) => formatMoney(row.totalSales || 0) },
      { label: "Avg", format: (row) => formatMoney(row.averageOrderValue || 0) }
    ]),
    buildStaffReportsTable("Payment status", paymentStatuses, [
      { label: "Status", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Amount", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Payment methods", report.payments?.byMethod || [], [
      { label: "Method", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Amount", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Order status", report.orderStatuses || [], [
      { label: "Status", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Order sources", orderSources, [
      { label: "Source", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Table activity", tables, [
      { label: "Table", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Combo performance", topCombos, [
      { label: "Combo", key: "itemName" },
      { label: "Qty", format: (row) => String(row.quantitySold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "Orders", format: (row) => String(row.orderCount || 0) }
    ]),
    buildStaffReportsTable("Cancellations", report.cancellations || [], [
      { label: "Order", key: "orderId" },
      { label: "Source", key: "source" },
      { label: "Amount", format: (row) => formatMoney(row.amount || 0) },
      { label: "Reason", key: "reason" }
    ])
  ].join("");

  if (printButton) {
    printButton.disabled = false;
  }
  if (csvButton) csvButton.disabled = false;
  if (excelButton) excelButton.disabled = false;
}

function enableStaffReportExports() {
  [$("#staffReportsPrintBtn"), $("#staffReportsCsvBtn"), $("#staffReportsExcelBtn")]
    .forEach((button) => {
      if (button) button.disabled = false;
    });
}

function renderStaffRoomBusinessReport(report = STAFF_STATE.businessReport) {
  const summaryWrap = $("#staffReportsSummary");
  const recommendationsWrap = $("#staffReportsRecommendations");
  const content = $("#staffReportsContent");
  if (!summaryWrap || !content) return;

  const summary = report?.summary || {};
  const roomPerformance = Array.isArray(report?.roomPerformance) ? report.roomPerformance : [];
  const roomTypePerformance = Array.isArray(report?.roomTypePerformance) ? report.roomTypePerformance : [];
  const bookingStatuses = Array.isArray(report?.bookingStatuses) ? report.bookingStatuses : [];
  const bookingSources = Array.isArray(report?.bookingSources) ? report.bookingSources : [];
  const guestStays = Array.isArray(report?.guestStays) ? report.guestStays : [];

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard("Net room revenue", formatMoney(summary.netRoomRevenue || 0), `Gross ${formatMoney(summary.grossRoomRevenue || 0)} - refunds ${formatMoney(summary.refunds || 0)}`),
    buildStaffSummaryCard("Occupancy", `${Number(summary.occupancyRate || 0).toFixed(1)}%`, `${summary.roomNightsSold || 0} sold / ${summary.availableRoomNights || 0} available room nights`),
    buildStaffSummaryCard("ADR", formatMoney(summary.adr || 0), `${summary.totalBookings || 0} booking${Number(summary.totalBookings || 0) === 1 ? "" : "s"}`),
    buildStaffSummaryCard("Pending room amount", formatMoney(summary.unpaidAmount || 0), `${summary.availableRooms || 0} sellable / ${summary.maintenanceRooms || 0} maintenance rooms`)
  ].join("");

  if (recommendationsWrap) {
    recommendationsWrap.hidden = false;
    recommendationsWrap.innerHTML = `
      <section class="staff-summary-card">
        <p class="staff-summary-label">Room report basis</p>
        <ul class="staff-item-sales-list">
          <li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(report?.basis?.occupancyFormula || "Occupied room nights / available room nights x 100")}</p></li>
          <li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(report?.basis?.revenueRecognition || "Room values use overlapping stay nights.")}</p></li>
          <li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(report?.basis?.maintenanceBasis || "Maintenance uses current room state.")}</p></li>
        </ul>
      </section>`;
  }

  content.className = "staff-section-stage";
  content.innerHTML = [
    buildStaffReportsTable("Booking status", bookingStatuses, [
      { label: "Status", key: "label" },
      { label: "Bookings", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Booking channel", report?.bookingSourceGroups || [], [
      { label: "Channel", key: "label" },
      { label: "Bookings", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Booking source", bookingSources, [
      { label: "Source", key: "label" },
      { label: "Bookings", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Room performance", roomPerformance, [
      { label: "Room", key: "roomNumber" },
      { label: "Type", key: "roomType" },
      { label: "Nights", format: (row) => String(row.nightsSold || 0) },
      { label: "Occupancy", format: (row) => `${Number(row.occupancyRate || 0).toFixed(1)}%` },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "ADR", format: (row) => formatMoney(row.averageRate || 0) }
    ]),
    buildStaffReportsTable("Room-type performance", roomTypePerformance, [
      { label: "Room type", key: "roomType" },
      { label: "Rooms", format: (row) => String(row.totalRooms || 0) },
      { label: "Nights sold", format: (row) => String(row.nightsSold || 0) },
      { label: "Occupancy", format: (row) => `${Number(row.occupancyRate || 0).toFixed(1)}%` },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "ADR", format: (row) => formatMoney(row.adr || 0) }
    ]),
    buildStaffReportsTable("Guest stays", guestStays, [
      { label: "Guest", key: "guestName" },
      { label: "Phone", key: "phoneMasked" },
      { label: "Room", key: "roomNumber" },
      { label: "Check-in", key: "checkInDate" },
      { label: "Check-out", key: "checkOutDate" },
      { label: "Status", key: "status" }
    ])
  ].join("");
  enableStaffReportExports();
}

function renderStaffCombinedBusinessReport(report = STAFF_STATE.businessReport) {
  const summaryWrap = $("#staffReportsSummary");
  const recommendationsWrap = $("#staffReportsRecommendations");
  const content = $("#staffReportsContent");
  if (!summaryWrap || !content) return;
  const summary = report?.summary || {};

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard("Combined revenue", formatMoney(summary.combinedRevenue || 0), "Food plus Room revenue"),
    buildStaffSummaryCard("Food revenue", formatMoney(summary.foodRevenue || 0), `${summary.foodOrders || 0} food order${Number(summary.foodOrders || 0) === 1 ? "" : "s"}`),
    buildStaffSummaryCard("Room revenue", formatMoney(summary.roomRevenue || 0), `${summary.roomBookings || 0} room booking${Number(summary.roomBookings || 0) === 1 ? "" : "s"}`),
    buildStaffSummaryCard("Room Service", formatMoney(summary.roomServiceRevenue || 0), "Included once inside Food revenue")
  ].join("");

  if (recommendationsWrap) {
    recommendationsWrap.hidden = false;
    recommendationsWrap.innerHTML = `
      <section class="staff-summary-card">
        <p class="staff-summary-label">Verified accounting rules</p>
        <ul class="staff-item-sales-list">
          <li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(report?.basis?.accountingRule || "Combined revenue = Food revenue + Room revenue.")}</p></li>
          <li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(report?.basis?.roomServiceTreatment || "Room Service is counted once.")}</p></li>
          <li class="staff-item-sales-row"><p class="staff-item-sales-copy">${escapeHTML(report?.basis?.paymentRule || "Payment summaries remain separate.")}</p></li>
        </ul>
      </section>`;
  }

  content.className = "staff-section-stage";
  content.innerHTML = [
    buildStaffReportsTable("Food order sources", report?.food?.orderSources || [], [
      { label: "Source", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Room booking channels", report?.rooms?.bookingSourceGroups || [], [
      { label: "Channel", key: "label" },
      { label: "Bookings", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Room booking sources", report?.rooms?.bookingSources || [], [
      { label: "Source", key: "label" },
      { label: "Bookings", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ]),
    buildStaffReportsTable("Room performance", report?.rooms?.roomPerformance || [], [
      { label: "Room", key: "roomNumber" },
      { label: "Nights", format: (row) => String(row.nightsSold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "ADR", format: (row) => formatMoney(row.averageRate || 0) }
    ])
  ].join("");
  enableStaffReportExports();
}

function renderStaffBusinessReport(report = STAFF_STATE.businessReport) {
  renderStaffReportsCenter();
  const reportType = String(report?.reportType || STAFF_STATE.businessReportType || "food").trim();
  if (reportType === "rooms") {
    renderStaffRoomBusinessReport(report);
    return;
  }
  if (reportType === "combined") {
    renderStaffCombinedBusinessReport(report);
    return;
  }
  renderStaffFoodBusinessReport(report);
}

function getStaffOrdersAttentionSummary(orders = []) {
  return orders.reduce(
    (summary, order) => {
      const total = getStaffOrderTotal(order);
      const orderStatus = normalizeStatus(order.status);
      const paymentStatus = normalizeStatus(getStaffOrderPaymentStatus(order));
      const billingStatus = normalizeStatus(getStaffOrderBillingStatus(order));

      if (orderStatus === "new") {
        summary.newOrders += 1;
      }

      if (paymentStatus !== "paid") {
        summary.unpaidOrders += 1;
        summary.unpaidAmount += total;
      }

      if (billingStatus !== "billed") {
        summary.unbilledOrders += 1;
        summary.unbilledAmount += total;
      }

      return summary;
    },
    {
      newOrders: 0,
      unpaidOrders: 0,
      unpaidAmount: 0,
      unbilledOrders: 0,
      unbilledAmount: 0
    }
  );
}

function getStaffOrdersOperationalSummary(orders = []) {
  return orders.reduce(
    (summary, order) => {
      const orderStatus = normalizeStatus(order.status);
      const paymentStatus = normalizeStatus(getStaffOrderPaymentStatus(order));

      summary.totalOrders += 1;
      summary.loadedOrderValue += getStaffOrderTotal(order);

      if (orderStatus === "new") summary.receivedOrders += 1;
      if (orderStatus === "confirmed") summary.confirmedOrders += 1;
      if (orderStatus === "preparing") summary.preparingOrders += 1;
      if (orderStatus === "completed") summary.completedOrders += 1;
      if (paymentStatus !== "paid") summary.pendingPaymentOrders += 1;

      return summary;
    },
    {
      totalOrders: 0,
      receivedOrders: 0,
      confirmedOrders: 0,
      preparingOrders: 0,
      completedOrders: 0,
      pendingPaymentOrders: 0,
      loadedOrderValue: 0
    }
  );
}

function clearStaffOrdersOperationalSummary() {
  const copy = $("#staffOrdersOperationalCopy");
  const wrap = $("#staffOrdersOperationalSummary");

  if (copy) copy.hidden = true;
  if (!wrap) return;

  wrap.hidden = true;
  wrap.innerHTML = "";
}

function renderStaffOrdersOperationalSummary(orders = []) {
  const copy = $("#staffOrdersOperationalCopy");
  const wrap = $("#staffOrdersOperationalSummary");
  if (!wrap) return;

  if (!orders.length) {
    clearStaffOrdersOperationalSummary();
    return;
  }

  const summary = getStaffOrdersOperationalSummary(orders);
  const rangeLabel = getStaffSelectedRangeLabel();
  const cards = [
    buildStaffSummaryCard(
      "Received",
      `${summary.receivedOrders}`,
      "New orders waiting in the loaded queue",
      "is-orders-received"
    ),
    buildStaffSummaryCard(
      "Confirmed",
      `${summary.confirmedOrders}`,
      "Accepted orders awaiting further progress",
      "is-orders-confirmed"
    ),
    buildStaffSummaryCard(
      "Preparing",
      `${summary.preparingOrders}`,
      "Orders currently marked as preparing",
      "is-orders-preparing"
    ),
    buildStaffSummaryCard(
      "Completed",
      `${summary.completedOrders}`,
      `Completed orders in ${rangeLabel.toLowerCase()}`,
      "is-orders-completed"
    )
  ];

  if (isStaffManagerSession()) {
    cards.push(
      buildStaffSummaryCard(
        "Pending payment",
        `${summary.pendingPaymentOrders}`,
        "Loaded orders not yet marked paid",
        "is-orders-payment"
      ),
      buildStaffSummaryCard(
        "Loaded order value",
        formatMoney(summary.loadedOrderValue),
        `${summary.totalOrders} loaded order${summary.totalOrders === 1 ? "" : "s"}; not a settlement total`,
        "is-orders-value"
      )
    );
  }

  if (copy) {
    copy.hidden = false;
    copy.textContent = isStaffManagerSession()
      ? `Operational and manager-authorized totals for ${rangeLabel.toLowerCase()}.`
      : `Operational counts for ${rangeLabel.toLowerCase()}. Financial totals require manager access.`;
  }

  wrap.hidden = false;
  wrap.innerHTML = cards.join("");
}

function renderStaffOrdersAttentionSummary(orders = []) {
  const copy = $("#staffOrdersAttentionCopy");
  const wrap = $("#staffOrdersAttentionSummary");
  if (!wrap) return;

  if (!orders.length) {
    if (copy) copy.hidden = true;
    wrap.hidden = true;
    wrap.innerHTML = "";
    return;
  }

  const summary = getStaffOrdersAttentionSummary(orders);

  if (copy) copy.hidden = false;
  const cards = [
    buildStaffSummaryCard(
      "New orders",
      `${summary.newOrders}`,
      summary.newOrders
        ? "Fresh orders still waiting for acknowledgement"
        : "No newly received orders in this view",
      "is-attention-new"
    ),
    buildStaffSummaryCard(
      "Unpaid",
      `${summary.unpaidOrders}`,
      isStaffManagerSession()
        ? `${formatMoney(summary.unpaidAmount)} still pending payment`
        : "Orders still pending payment confirmation",
      "is-attention-payment"
    )
  ];

  if (isStaffManagerSession()) {
    cards.push(
      buildStaffSummaryCard(
        "Unbilled",
        `${summary.unbilledOrders}`,
        `${formatMoney(summary.unbilledAmount)} still open for billing`,
        "is-attention-billing"
      )
    );
  }

  wrap.hidden = false;
  wrap.innerHTML = cards.join("");
}

function countStaffRecordsByStatus(records = []) {
  return records.reduce(
    (counts, record) => {
      const status = normalizeStatus(record.status) || "new";
      counts.total += 1;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { total: 0 }
  );
}

function renderStaffReservationsSummary(reservations = []) {
  const summaryWrap = $("#staffReservationsSummary");
  if (!summaryWrap) return;

  if (!reservations.length) {
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const counts = countStaffRecordsByStatus(reservations);

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Reservations",
      `${counts.total}`,
      "Total reservation requests in this view"
    ),
    buildStaffSummaryCard(
      "New",
      `${counts.new || 0}`,
      "Fresh requests waiting for attention"
    ),
    buildStaffSummaryCard(
      "Confirmed",
      `${counts.confirmed || 0}`,
      "Reservations confirmed by the hotel"
    ),
    buildStaffSummaryCard(
      "Completed / Cancelled",
      `${(counts.completed || 0) + (counts.cancelled || 0)}`,
      `${counts.completed || 0} completed - ${counts.cancelled || 0} cancelled`
    )
  ].join("");
}

function renderStaffRoomsSummary(rooms = STAFF_STATE.rooms, bookings = STAFF_STATE.roomBookings) {
  const summaryWrap = $("#staffRoomsSummary");
  renderStaffDashboardRoomSummary(rooms, bookings, STAFF_STATE.roomOperationsRooms);
  if (!summaryWrap) return;

  if (!rooms.length && !bookings.length) {
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const roomCounts = rooms.reduce(
    (counts, room) => {
      const status = normalizeStatus(room.status) || "available";
      counts.total += 1;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { total: 0 }
  );
  const bookingCounts = bookings.reduce(
    (counts, booking) => {
      const status = normalizeStatus(booking.booking_status) || "pending";
      counts.total += 1;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { total: 0 }
  );

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Rooms",
      `${roomCounts.total}`,
      `${roomCounts.available || 0} available - ${roomCounts.occupied || 0} occupied`
    ),
    buildStaffSummaryCard(
      "Maintenance",
      `${(roomCounts.maintenance || 0) + (roomCounts.cleaning || 0)}`,
      `${roomCounts.maintenance || 0} maintenance - ${roomCounts.cleaning || 0} cleaning`
    ),
    buildStaffSummaryCard(
      "Bookings",
      `${bookingCounts.total}`,
      `${bookingCounts.confirmed || 0} confirmed - ${bookingCounts.pending || 0} pending`
    ),
    buildStaffSummaryCard(
      "Checked in",
      `${bookingCounts.checked_in || 0}`,
      "Guests currently checked in from loaded bookings"
    )
  ].join("");
}

function renderStaffDashboardRoomSummary(
  rooms = STAFF_STATE.rooms,
  bookings = STAFF_STATE.roomBookings,
  operationRooms = STAFF_STATE.roomOperationsRooms
) {
  const summaryWrap = $("#staffDashboardRoomSummary");
  if (!summaryWrap || !canStaffUseFeature("rooms")) return;

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeOperationRooms = Array.isArray(operationRooms) ? operationRooms : [];
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const availableRooms = safeOperationRooms.filter(
    (room) => normalizeStatus(room.liveStatus) === "available"
  ).length;
  const occupiedRooms = safeOperationRooms.filter(
    (room) => normalizeStatus(room.liveStatus) === "occupied"
  ).length;
  const arrivals = safeBookings.filter((booking) => booking.check_in_date === todayKey).length;
  const departures = safeBookings.filter((booking) => booking.check_out_date === todayKey).length;
  const pendingAmount = isStaffManagerSession()
    ? safeBookings.reduce((sum, booking) => sum + Number(booking.balance_amount || 0), 0)
    : null;

  if (!safeRooms.length && !safeBookings.length) {
    summaryWrap.innerHTML = '<p class="staff-empty-copy">No room inventory or bookings are available yet.</p>';
    return;
  }

  summaryWrap.innerHTML = [
    buildStaffSummaryCard("Available rooms", String(availableRooms), `${safeRooms.length} rooms in current inventory`),
    buildStaffSummaryCard("Occupied rooms", String(occupiedRooms), "Checked-in stays in the current operations window"),
    buildStaffSummaryCard("Today's check-ins", String(arrivals), `${departures} checkout${departures === 1 ? "" : "s"} today`),
    pendingAmount === null
      ? buildStaffSummaryCard("Bookings", String(safeBookings.length), "Financial totals require owner access")
      : buildStaffSummaryCard("Pending room payments", formatMoney(pendingAmount), `${safeBookings.length} loaded booking${safeBookings.length === 1 ? "" : "s"}`)
  ].join("");
}

function renderStaffInquiriesSummary(inquiries = []) {
  const summaryWrap = $("#staffInquiriesSummary");
  if (!summaryWrap) return;

  if (!inquiries.length) {
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const counts = countStaffRecordsByStatus(inquiries);

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Inquiries",
      `${counts.total}`,
      "Total inquiry requests in this view"
    ),
    buildStaffSummaryCard(
      "New",
      `${counts.new || 0}`,
      "Fresh inquiries waiting for reply"
    ),
    buildStaffSummaryCard(
      "Contacted",
      `${counts.contacted || 0}`,
      "Guests already contacted"
    ),
    buildStaffSummaryCard(
      "Converted / Closed",
      `${(counts.converted || 0) + (counts.closed || 0)}`,
      `${counts.converted || 0} converted - ${counts.closed || 0} closed`
    )
  ].join("");
}

function renderStaffContactsSummary(contactSubmissions = []) {
  const summaryWrap = $("#staffContactsSummary");
  if (!summaryWrap) return;

  if (!contactSubmissions.length) {
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const counts = countStaffRecordsByStatus(contactSubmissions);

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Contact messages",
      `${counts.total}`,
      "Total contact form messages in this view"
    ),
    buildStaffSummaryCard(
      "New",
      `${counts.new || 0}`,
      "Fresh contact messages waiting for reply"
    ),
    buildStaffSummaryCard(
      "Contacted",
      `${counts.contacted || 0}`,
      "Guests already contacted"
    ),
    buildStaffSummaryCard(
      "Resolved / Closed",
      `${(counts.resolved || 0) + (counts.closed || 0)}`,
      `${counts.resolved || 0} resolved - ${counts.closed || 0} closed`
    )
  ].join("");
}

function getStaffSupportRequestCounts(supportRequests = []) {
  return supportRequests.reduce(
    (summary, supportRequest) => {
      const status = normalizeStatus(supportRequest.status) || "new";
      const requestType = normalizeStatus(supportRequest.requestType);

      summary.total += 1;
      summary[status] = (summary[status] || 0) + 1;

      if (requestType === "bill") {
        summary.bill += 1;
      } else if (requestType === "help") {
        summary.help += 1;
      }

      return summary;
    },
    { total: 0, bill: 0, help: 0 }
  );
}

function getStaffOpenSupportRequestCount(supportRequests = STAFF_STATE.supportRequests) {
  const counts = getStaffSupportRequestCounts(supportRequests);
  return (counts.new || 0) + (counts.acknowledged || 0);
}

function getStaffDashboardPreparingCount() {
  if (STAFF_STATE.kdsOrdersLoaded) {
    return Number(getStaffKdsStatusCounts(STAFF_STATE.kdsOrders).preparing || 0);
  }

  return Number(getStaffOrderStatusNavigationCounts(STAFF_STATE.orders).preparing || 0);
}

function updateStaffDashboardOperationalStatusMirrors() {
  const liveTarget = $("#staffDashboardOperationsLiveStatus");
  const kitchenTarget = $("#staffDashboardOperationsKitchenStatus");
  const liveSource = $("#staffLiveRefreshStatus");
  const kitchenSource = $("#staffKitchenDisplayFreshness");

  if (liveTarget) {
    liveTarget.textContent = liveSource?.textContent || "Live updates on";
    liveTarget.classList.toggle("is-live", !!liveSource?.classList.contains("is-live"));
    liveTarget.classList.toggle("is-warning", !!liveSource?.classList.contains("is-warning"));
    liveTarget.classList.toggle("is-muted", !!liveSource?.classList.contains("is-muted"));
  }

  if (kitchenTarget) {
    const preparingCount = getStaffDashboardPreparingCount();
    const freshness = String(kitchenSource?.textContent || "Kitchen refresh waiting").trim();
    kitchenTarget.textContent = `${freshness} · ${preparingCount} preparing`;
    kitchenTarget.title = STAFF_STATE.kdsOrdersLoaded
      ? "Preparing count uses the loaded KDS queue."
      : "Preparing count uses the current loaded Orders range.";
  }
}
function renderStaffDashboardSupportSummary(supportRequests = []) {
  const summaryWrap = $("#staffDashboardSupportSummary");
  if (!summaryWrap) return;

  if (!isStaffManagerSession()) {
    summaryWrap.setAttribute("aria-busy", "false");
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const orderStatusCounts = getStaffOrderStatusNavigationCounts(STAFF_STATE.orders);
  const orderSummary = getStaffOrdersSummary(STAFF_STATE.orders);
  const counts = getStaffSupportRequestCounts(supportRequests);
  const openCount = getStaffOpenSupportRequestCount(supportRequests);
  const supportDataAvailable =
    STAFF_STATE.supportRequestsLoaded && supportRequests === STAFF_STATE.supportRequests;
  const metrics = [
    {
      label: "New orders",
      value: String(orderStatusCounts.new || 0),
      note: "Waiting for confirmation in the loaded Orders range",
      className: "is-new-orders"
    },
    {
      label: "In progress",
      value: String((orderStatusCounts.confirmed || 0) + (orderStatusCounts.preparing || 0)),
      note: `${orderStatusCounts.confirmed || 0} confirmed - ${orderStatusCounts.preparing || 0} preparing`,
      className: "is-in-progress"
    },
    {
      label: "Billing pending",
      value: String(orderSummary.unbilledOrders || 0),
      note: "Unbilled orders in the loaded Orders range",
      className: "is-billing-pending"
    },
    {
      label: "Open support",
      value: supportDataAvailable ? String(openCount) : "—",
      note: supportDataAvailable
        ? `${counts.new || 0} new - ${counts.acknowledged || 0} acknowledged`
        : "Support refresh pending or unavailable",
      className: "is-open-support"
    }
  ];

  summaryWrap.setAttribute("aria-busy", "false");
  summaryWrap.hidden = false;
  summaryWrap.innerHTML = `
    <section class="staff-dashboard-operations-card" aria-label="Operational attention summary">
      <header class="staff-dashboard-operations-head">
        <h3>Operational Attention</h3>
      </header>
      <ul class="staff-dashboard-operations-metrics" aria-label="Operational attention values">
        ${metrics
          .map(
            (metric) => `
              <li class="staff-dashboard-operation-metric ${escapeHTML(metric.className)}">
                <span class="staff-dashboard-operation-dot" aria-hidden="true"></span>
                <span class="staff-dashboard-operation-label">${escapeHTML(metric.label)}</span>
                <strong>${escapeHTML(metric.value)}</strong>
                <span class="staff-sr-only">${escapeHTML(metric.note)}</span>
              </li>
            `
          )
          .join("")}
      </ul>
      <div class="staff-dashboard-operation-statuses">
        <span id="staffDashboardOperationsLiveStatus" class="staff-dashboard-operation-status is-live" aria-live="polite">Live updates on</span>
        <span id="staffDashboardOperationsKitchenStatus" class="staff-dashboard-operation-status is-kitchen" aria-live="polite">Kitchen refresh waiting</span>
      </div>
      <p class="staff-dashboard-operations-copy">Counts use current loaded Orders and Support ranges.</p>
    </section>
  `;
  updateStaffDashboardOperationalStatusMirrors();
}
function renderStaffSupportSummary(supportRequests = []) {
  const summaryWrap = $("#staffSupportSummary");
  if (!summaryWrap) return;

  if (!supportRequests.length) {
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const counts = getStaffSupportRequestCounts(supportRequests);

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Support requests",
      `${counts.total}`,
      "Total table requests in this view"
    ),
    buildStaffSummaryCard(
      "Bill requests",
      `${counts.bill || 0}`,
      "Customers asking to close the bill"
    ),
    buildStaffSummaryCard(
      "Help requests",
      `${counts.help || 0}`,
      "Customers asking for staff assistance"
    ),
    buildStaffSummaryCard(
      "Open / Resolved",
      `${(counts.new || 0) + (counts.acknowledged || 0)} open / ${counts.resolved || 0} resolved`,
      `${counts.closed || 0} closed`
    )
  ].join("");
}

function renderStaffTestimonialsSummary(testimonials = []) {
  const summaryWrap = $("#staffTestimonialsSummary");
  if (!summaryWrap) return;

  if (!testimonials.length) {
    summaryWrap.hidden = true;
    summaryWrap.innerHTML = "";
    return;
  }

  const counts = testimonials.reduce(
    (summary, testimonial) => {
      summary.total += 1;

      if (testimonial.isApproved === true) {
        summary.approved += 1;
      } else {
        summary.pending += 1;
      }

      if (testimonial.isArchived === true || testimonial.isActive === false) {
        summary.hidden += 1;
      }

      return summary;
    },
    { total: 0, approved: 0, pending: 0, hidden: 0 }
  );

  summaryWrap.hidden = false;
  summaryWrap.innerHTML = [
    buildStaffSummaryCard(
      "Testimonials",
      `${counts.total}`,
      "Total guest reviews in this view"
    ),
    buildStaffSummaryCard(
      "Pending approval",
      `${counts.pending}`,
      "Reviews waiting before public display"
    ),
    buildStaffSummaryCard(
      "Approved",
      `${counts.approved}`,
      "Reviews allowed by approval status"
    ),
    buildStaffSummaryCard(
      "Inactive / Archived",
      `${counts.hidden}`,
      "Still hidden even if approved"
    )
  ].join("");
}

function getStaffSelectedSourceFilter() {
  return $("#staffOrdersSourceInput")?.value || "all";
}

function getStaffSelectedTableFilter() {
  return $("#staffOrdersTableInput")?.value || "all";
}

function getStaffSelectedPaymentFilter() {
  return $("#staffOrdersPaymentInput")?.value || "all";
}

function getStaffSelectedBillingFilter() {
  return $("#staffOrdersBillingInput")?.value || "all";
}

function getStaffSelectedOrderStatusFilter() {
  return $("#staffOrdersStatusInput")?.value || "all";
}

function getStaffOrderStatusNavigationCounts(orders = STAFF_STATE.orders) {
  return (Array.isArray(orders) ? orders : []).reduce(
    (counts, order) => {
      const status = normalizeStatus(order.status);
      counts.all += 1;

      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      }

      return counts;
    },
    {
      all: 0,
      new: 0,
      confirmed: 0,
      preparing: 0,
      completed: 0,
      cancelled: 0,
      payment_pending: 0,
      payment_failed: 0
    }
  );
}

function renderStaffOrdersStatusNavigation() {
  const selectedStatus = getStaffSelectedOrderStatusFilter();
  const counts = getStaffOrderStatusNavigationCounts(
    getStaffOrdersForSourceCard(getStaffSelectedOrderSourceCard())
  );

  document.querySelectorAll("[data-staff-order-status-filter]").forEach((button) => {
    const status = button.getAttribute("data-staff-order-status-filter") || "all";
    const isActive = status === selectedStatus;
    const count = button.querySelector("[data-staff-order-status-count]");

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    if (count) count.textContent = String(counts[status] || 0);
  });

  const activeFilterCount = $("#staffOrdersActiveFilterCount");
  if (activeFilterCount) {
    const count = getStaffSelectedFilterLabels().length;
    activeFilterCount.textContent = count
      ? `${count} active filter${count === 1 ? "" : "s"}`
      : "No active filters";
  }
}

function isStaffAttentionFilterEnabled() {
  return $("#staffOrdersAttentionToggle")?.getAttribute("aria-pressed") === "true";
}

function setStaffAttentionFilterEnabled(isEnabled) {
  const button = $("#staffOrdersAttentionToggle");
  if (!button) return;

  const pressed = isEnabled ? "true" : "false";
  button.setAttribute("aria-pressed", pressed);
  button.classList.toggle("is-active", !!isEnabled);
}

function getStaffOrdersSearchTerm() {
  return String($("#staffOrdersSearchInput")?.value || "").trim().toLowerCase();
}

function getStaffSelectedRecordStatusFilter(selector) {
  return $(selector)?.value || "all";
}

function getStaffSelectedApprovalFilter() {
  return $("#staffTestimonialsApprovalInput")?.value || "all";
}

function filterStaffRecordsByStatus(records = [], statusFilter = "all") {
  if (statusFilter === "all") {
    return records;
  }

  return records.filter((record) => normalizeStatus(record.status) === statusFilter);
}

function getStaffSelectedRangeLabel() {
  const input = $("#staffOrdersRangeInput");
  return input?.selectedOptions?.[0]?.textContent?.trim() || "selected range";
}

function getStaffSelectedFilterLabels() {
  const sourceInput = $("#staffOrdersSourceInput");
  const tableInput = $("#staffOrdersTableInput");
  const paymentInput = $("#staffOrdersPaymentInput");
  const billingInput = $("#staffOrdersBillingInput");
  const statusInput = $("#staffOrdersStatusInput");
  const searchTerm = getStaffOrdersSearchTerm();
  const attentionOnly = isStaffAttentionFilterEnabled();
  const selectedDefinition = getStaffOrderSourceCardDefinition(
    getStaffSelectedOrderSourceCard()
  );
  const sourceFilterIsSecondary =
    sourceInput &&
    sourceInput.value !== "all" &&
    sourceInput.value !== selectedDefinition?.defaultSourceFilter;
  const sourceFilterLabel = sourceFilterIsSecondary
    ? sourceInput.selectedOptions?.[0]?.textContent?.trim() || sourceInput.value
    : "";

  return [
    tableInput,
    paymentInput,
    billingInput,
    statusInput
  ]
    .filter((input) => input && input.value !== "all")
    .map((input) => input.selectedOptions?.[0]?.textContent?.trim() || input.value)
    .concat(sourceFilterLabel ? [sourceFilterLabel] : [])
    .concat(attentionOnly ? ["Needs attention"] : [])
    .concat(searchTerm ? [`Search: ${searchTerm}`] : []);
}

function getStaffOrderSearchBlob(order = {}) {
  const createdByStaff = order.createdByStaff && typeof order.createdByStaff === "object"
    ? order.createdByStaff
    : {};

  return [
    order.id,
    order.customerName,
    order.customerPhone,
    order.customerAddress,
    order.tableNumber,
    order.orderSequenceLabel,
    order.billNumber,
    order.createdByStaffId,
    createdByStaff.displayName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getStaffAvailableTableNumbers(orders = STAFF_STATE.orders) {
  return Array.from(
    new Set(
      orders
        .map((order) => String(order.tableNumber || "").trim())
        .filter(Boolean)
    )
  ).sort((firstTable, secondTable) =>
    firstTable.localeCompare(secondTable, undefined, {
      numeric: true,
      sensitivity: "base"
    })
  );
}

function updateStaffOrderTableFilterOptions(orders = STAFF_STATE.orders) {
  const tableInput = $("#staffOrdersTableInput");
  if (!tableInput) return;

  const previousValue = tableInput.value || "all";
  const tableNumbers = getStaffAvailableTableNumbers(orders);

  tableInput.innerHTML = [
    '<option value="all" selected>All tables</option>',
    ...tableNumbers.map((tableNumber) => `<option value="${escapeHTML(tableNumber)}">${escapeHTML(tableNumber)}</option>`)
  ].join("");

  if (tableNumbers.includes(previousValue)) {
    tableInput.value = previousValue;
  } else {
    tableInput.value = "all";
  }
}

function getStaffVisibleOrders() {
  const sourceFilter = getStaffSelectedSourceFilter();
  const tableFilter = getStaffSelectedTableFilter();
  const paymentFilter = getStaffSelectedPaymentFilter();
  const billingFilter = getStaffSelectedBillingFilter();
  const orderStatusFilter = getStaffSelectedOrderStatusFilter();
  const attentionOnly = isStaffAttentionFilterEnabled();
  const searchTerm = getStaffOrdersSearchTerm();

  return getStaffOrdersForSourceCard(
    getStaffSelectedOrderSourceCard(),
    STAFF_STATE.orders
  ).filter((order) => {
    const sourceMatches =
      sourceFilter === "all" || getStaffOrderSourceKey(order) === sourceFilter;
    const tableMatches =
      tableFilter === "all" || String(order.tableNumber || "").trim() === tableFilter;
    const paymentStatus = normalizeStatus(getStaffOrderPaymentStatus(order));
    const paymentMatches =
      paymentFilter === "all" ||
      (paymentFilter === "paid" && paymentStatus === "paid") ||
      (paymentFilter === "unpaid" && paymentStatus !== "paid");
    const billingStatus = normalizeStatus(getStaffOrderBillingStatus(order));
    const billingMatches =
      billingFilter === "all" ||
      (billingFilter === "billed" && billingStatus === "billed") ||
      (billingFilter === "unbilled" && billingStatus !== "billed");
    const orderStatusMatches =
      orderStatusFilter === "all" ||
      normalizeStatus(order.status) === orderStatusFilter;
    const needsAttention =
      normalizeStatus(order.status) === "new" ||
      paymentStatus !== "paid" ||
      billingStatus !== "billed";
    const attentionMatches = !attentionOnly || needsAttention;
    const searchMatches =
      !searchTerm || getStaffOrderSearchBlob(order).includes(searchTerm);

    return sourceMatches && tableMatches && paymentMatches && billingMatches && orderStatusMatches && attentionMatches && searchMatches;
  });
}

function renderCurrentStaffOrders() {
  if (staffOrdersSearchTimer) {
    window.clearTimeout(staffOrdersSearchTimer);
    staffOrdersSearchTimer = null;
  }

  renderStaffOrdersStatusNavigation();
  renderStaffOrders(getStaffVisibleOrders());
}

function getStaffVisibleReservations() {
  return filterStaffRecordsByStatus(
    STAFF_STATE.reservations,
    getStaffSelectedRecordStatusFilter("#staffReservationsStatusInput")
  );
}

function getStaffSelectedRoomBookingStatusFilter() {
  return $("#staffRoomsStatusInput")?.value || "all";
}

function getStaffRoomBookingFilterValues() {
  return {
    status: getStaffSelectedRoomBookingStatusFilter(),
    paymentStatus: $("#staffRoomsPaymentStatusInput")?.value || "all",
    source: ["website", "manual", "legacy"].includes(STAFF_STATE.roomBookingSource)
      ? STAFF_STATE.roomBookingSource
      : "website",
    search: String($("#staffRoomsSearchInput")?.value || "").trim(),
    sort: $("#staffRoomsSortInput")?.value || "created_desc",
    fromDate: $("#staffRoomsFromDateInput")?.value || "",
    toDate: $("#staffRoomsToDateInput")?.value || "",
    page: Math.max(1, Number(STAFF_STATE.roomBookingPage || 1) || 1),
    limit: $("#staffRoomsLimitInput")?.value || "25"
  };
}

function buildStaffRoomBookingQueryString() {
  const filters = getStaffRoomBookingFilterValues();
  const params = new URLSearchParams();
  const limit = Number(filters.limit || 25);

  params.set("source", filters.source);
  params.set("page", String(filters.page));
  params.set("limit", Number.isInteger(limit) && limit >= 15 && limit <= 50 ? String(limit) : "25");
  params.set("sort", filters.sort || "created_desc");
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus && filters.paymentStatus !== "all" && isStaffManagerSession()) {
    params.set("paymentStatus", filters.paymentStatus);
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  return params.toString();
}

function restoreStaffRoomBookingFiltersFromUrl() {
  if (STAFF_STATE.roomBookingUrlInitialized) return;
  STAFF_STATE.roomBookingUrlInitialized = true;
  const params = new URL(window.location.href).searchParams;
  const controls = [
    ["roomStatus", "#staffRoomsStatusInput"],
    ["roomPayment", "#staffRoomsPaymentStatusInput"],
    ["roomSearch", "#staffRoomsSearchInput"],
    ["roomSort", "#staffRoomsSortInput"],
    ["roomFrom", "#staffRoomsFromDateInput"],
    ["roomTo", "#staffRoomsToDateInput"],
    ["roomLimit", "#staffRoomsLimitInput"]
  ];
  controls.forEach(([paramName, selector]) => {
    const value = params.get(paramName);
    const control = $(selector);
    if (value === null || !control) return;
    if (control instanceof HTMLSelectElement && ![...control.options].some((option) => option.value === value)) return;
    control.value = value;
  });
  const page = Number(params.get("roomPage") || 1);
  STAFF_STATE.roomBookingPage = Number.isInteger(page) && page > 0 ? page : 1;
}

function syncStaffRoomBookingUrl({ bookingId, removeBooking = false } = {}) {
  const filters = getStaffRoomBookingFilterValues();
  const url = new URL(window.location.href);
  const values = {
    roomStatus: filters.status,
    roomPayment: isStaffManagerSession() ? filters.paymentStatus : "all",
    roomSearch: filters.search,
    roomSort: filters.sort,
    roomFrom: filters.fromDate,
    roomTo: filters.toDate,
    roomLimit: String(filters.limit || 25),
    roomPage: String(filters.page || 1)
  };
  Object.entries(values).forEach(([key, value]) => {
    if (!value || value === "all" || (key === "roomSort" && value === "created_desc")) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  if (removeBooking) url.searchParams.delete("roomBooking");
  else if (bookingId !== undefined) url.searchParams.set("roomBooking", String(bookingId));
  window.history.replaceState({ ...(window.history.state || {}), roomView: "bookings", roomSource: STAFF_STATE.roomBookingSource }, "", url);
}

function getStaffVisibleRoomBookings() {
  return STAFF_STATE.roomBookings;
}

function getStaffManualBookingRoomOptions() {
  return STAFF_STATE.rooms.filter((room) => {
    const status = normalizeStatus(room.status) || "available";
    return room.is_active !== false && status === "available";
  });
}

function getStaffVisibleInquiries() {
  return filterStaffRecordsByStatus(
    STAFF_STATE.inquiries,
    getStaffSelectedRecordStatusFilter("#staffInquiriesStatusInput")
  );
}

function getStaffVisibleContacts() {
  return filterStaffRecordsByStatus(
    STAFF_STATE.contactSubmissions,
    getStaffSelectedRecordStatusFilter("#staffContactsStatusInput")
  );
}

function getStaffVisibleSupportRequests() {
  return filterStaffRecordsByStatus(
    STAFF_STATE.supportRequests,
    getStaffSelectedRecordStatusFilter("#staffSupportStatusInput")
  );
}

function getStaffVisibleTestimonials() {
  const approvalFilter = getStaffSelectedApprovalFilter();

  if (approvalFilter === "approved") {
    return STAFF_STATE.testimonials.filter((testimonial) => testimonial.isApproved === true);
  }

  if (approvalFilter === "pending") {
    return STAFF_STATE.testimonials.filter((testimonial) => testimonial.isApproved !== true);
  }

  return STAFF_STATE.testimonials;
}

function getStaffSelectedRecordStatusLabel(selector) {
  const input = $(selector);
  return input?.selectedOptions?.[0]?.textContent?.trim() || "selected status";
}

function getStaffReservationsEmptyMessage() {
  if (!STAFF_STATE.reservations.length) {
    return "No reservations found for this hotel and selected range.";
  }

  return `No reservations match ${escapeHTML(getStaffSelectedRecordStatusLabel("#staffReservationsStatusInput"))}.`;
}

function getStaffRoomsEmptyMessage() {
  if (!STAFF_STATE.rooms.length && !STAFF_STATE.roomBookings.length) {
    return "No rooms or room bookings found for this hotel.";
  }

  const input = $("#staffRoomsStatusInput");
  const label = input?.selectedOptions?.[0]?.textContent?.trim() || "selected booking status";
  return `No room bookings match ${escapeHTML(label)}.`;
}

function getStaffInquiriesEmptyMessage() {
  if (!STAFF_STATE.inquiries.length) {
    return "No inquiries found for this hotel and selected range.";
  }

  return `No inquiries match ${escapeHTML(getStaffSelectedRecordStatusLabel("#staffInquiriesStatusInput"))}.`;
}

function getStaffContactsEmptyMessage() {
  if (!STAFF_STATE.contactSubmissions.length) {
    return "No contact messages found for this hotel and selected range.";
  }

  return `No contact messages match ${escapeHTML(getStaffSelectedRecordStatusLabel("#staffContactsStatusInput"))}.`;
}

function getStaffSupportEmptyMessage() {
  if (!STAFF_STATE.supportRequests.length) {
    return "No table support requests found for this hotel and selected range.";
  }

  return `No table support requests match ${escapeHTML(getStaffSelectedRecordStatusLabel("#staffSupportStatusInput"))}.`;
}

function getStaffTestimonialsEmptyMessage() {
  if (!STAFF_STATE.testimonials.length) {
    return "No testimonials found for this hotel and selected range.";
  }

  const input = $("#staffTestimonialsApprovalInput");
  const label = input?.selectedOptions?.[0]?.textContent?.trim() || "selected approval filter";
  return `No testimonials match ${escapeHTML(label)}.`;
}

function renderCurrentStaffReservations() {
  const reservations = getStaffVisibleReservations();
  renderStaffReservationsSummary(reservations);
  renderStaffRecordList(
    "#staffReservationsContent",
    reservations,
    buildStaffReservationCard,
    getStaffReservationsEmptyMessage()
  );
}

const STAFF_ROOM_DRAFT_CONTROL_SELECTORS = Object.freeze([
  "[data-staff-room-booking-status-select]",
  "[data-staff-room-payment-amount]",
  "[data-staff-room-payment-method]",
  "[data-staff-room-payment-transaction]",
  "[data-staff-room-payment-notes]",
  "[data-staff-room-refund-amount]",
  "[data-staff-room-refund-method]",
  "[data-staff-room-refund-transaction]",
  "[data-staff-room-refund-reason]"
]);

function captureStaffRoomBookingDrafts() {
  const content = $("#staffRoomsContent");
  if (!content) return [];

  const activeElement = document.activeElement;
  return STAFF_ROOM_DRAFT_CONTROL_SELECTORS.flatMap((selector) =>
    Array.from(content.querySelectorAll(selector)).map((control) => ({
      selector,
      bookingId: String(control.dataset.bookingId || ""),
      value: control.value,
      wasFocused: control === activeElement,
      selectionStart: control === activeElement ? control.selectionStart : null,
      selectionEnd: control === activeElement ? control.selectionEnd : null
    }))
  );
}

function restoreStaffRoomBookingDrafts(drafts = []) {
  const content = $("#staffRoomsContent");
  if (!content || !Array.isArray(drafts) || drafts.length === 0) return;

  let focusDraft = null;
  let focusControl = null;

  drafts.forEach((draft) => {
    const control = Array.from(content.querySelectorAll(draft.selector)).find(
      (candidate) => String(candidate.dataset.bookingId || "") === draft.bookingId
    );
    if (!control || control.disabled) return;

    control.value = draft.value;
    if (draft.selector === "[data-staff-room-booking-status-select]") {
      updateStaffRoomBookingStatusButtonState(control);
    }
    if (draft.wasFocused) {
      focusDraft = draft;
      focusControl = control;
    }
  });

  if (focusControl && document.activeElement === document.body) {
    focusControl.focus({ preventScroll: true });
    if (
      Number.isInteger(focusDraft?.selectionStart) &&
      Number.isInteger(focusDraft?.selectionEnd) &&
      typeof focusControl.setSelectionRange === "function"
    ) {
      try {
        focusControl.setSelectionRange(focusDraft.selectionStart, focusDraft.selectionEnd);
      } catch {}
    }
  }
}

function getStaffRoomBookingSourceLabel(source = STAFF_STATE.roomBookingSource) {
  return source === "manual" ? "Manual Bookings" : source === "legacy" ? "Legacy / Other" : "Website Bookings";
}

function renderStaffRoomBookingSourceHub() {
  const summary = STAFF_STATE.roomBookingSummary || {};
  ["website", "manual", "legacy"].forEach((source) => {
    const values = summary[source] || { total: 0, pending: 0, today: 0 };
    document.querySelectorAll(`[data-room-source-count="${source}"]`).forEach((element) => { element.textContent = String(values.total || 0); });
    document.querySelectorAll(`[data-room-source-pending="${source}"]`).forEach((element) => { element.textContent = String(values.pending || 0); });
    document.querySelectorAll(`[data-room-source-today="${source}"]`).forEach((element) => { element.textContent = String(values.today || 0); });
    const button = document.querySelector(`[data-room-booking-source="${source}"]`);
    if (button) {
      button.hidden = source === "legacy" && Number(values.total || 0) <= 0;
      button.setAttribute("aria-pressed", String(source === STAFF_STATE.roomBookingSource));
    }
  });

  const unread = getStaffNotificationCardUnread("website-room-bookings");
  const unreadLabel = formatStaffCount(unread, {
    lowerBound: isStaffNotificationCardUnreadLowerBound("website-room-bookings")
  });
  const websiteCard = document.querySelector('[data-room-booking-source="website"]');
  websiteCard?.classList.toggle("has-unread", unread > 0);
  document.querySelectorAll('[data-room-source-unread="website"], [data-room-bookings-unread]').forEach((element) => {
    element.hidden = unread <= 0;
    element.textContent = unread > 0 ? unreadLabel : "";
    element.setAttribute("aria-label", unread > 0 ? `${unreadLabel} unread website booking notification${unread === 1 ? "" : "s"}` : "");
  });

  const heading = $("#staffRoomBookingsHeading");
  if (heading) heading.textContent = getStaffRoomBookingSourceLabel();
  const pagination = STAFF_STATE.roomBookingPagination || {};
  const page = Math.max(1, Number(pagination.page || 1) || 1);
  const totalPages = Math.max(1, Number(pagination.totalPages || 1) || 1);
  const pageLabel = $("#staffRoomsPageLabel");
  if (pageLabel) pageLabel.textContent = `Page ${page} of ${totalPages} · ${Number(pagination.total || 0)} booking${Number(pagination.total || 0) === 1 ? "" : "s"}`;
  const previousButton = $("#staffRoomsPreviousPageBtn");
  const nextButton = $("#staffRoomsNextPageBtn");
  if (previousButton) previousButton.disabled = pagination.hasPrevious !== true;
  if (nextButton) nextButton.disabled = pagination.hasNext !== true;
}

function selectStaffRoomBookingSource(source = "website", { historyMode = "push", load = true, acknowledge = true } = {}) {
  const safeSource = ["website", "manual", "legacy"].includes(source) ? source : "website";
  STAFF_STATE.roomBookingSource = safeSource;
  STAFF_STATE.roomBookingPage = 1;
  restoreStaffRoomBookingFiltersFromUrl();
  renderStaffRoomBookingSourceHub();

  if (historyMode !== "none") {
    const url = new URL(window.location.href);
    url.searchParams.set("roomView", "bookings");
    url.searchParams.set("roomSource", safeSource);
    const state = { ...(window.history.state || {}), roomView: "bookings", roomSource: safeSource };
    window.history[historyMode === "replace" ? "replaceState" : "pushState"](state, "", url);
  }
  if (safeSource === "website" && acknowledge && getStaffNotificationCardUnread("website-room-bookings") > 0) {
    void acknowledgeStaffNotificationCard("website-room-bookings");
  }
  if (load) void loadStaffRoomBookings();
}
function renderCurrentStaffRooms() {
  const bookings = getStaffVisibleRoomBookings();
  renderStaffRoomsSummary(STAFF_STATE.rooms, bookings);
  renderStaffRoomBookingRoomOptions();
  renderStaffRoomServiceBookingOptions();
  renderStaffRoomServiceMenuOptions();
  renderStaffRoomBookingSourceHub();
  renderStaffRoomsList([], bookings, getStaffRoomsEmptyMessage());
  updateStaffRoomOperationsHomeSummary();
  renderStaffRoomAvailabilityGrid();
}

function renderCurrentStaffInquiries() {
  const inquiries = getStaffVisibleInquiries();
  renderStaffInquiriesSummary(inquiries);
  renderStaffRecordList(
    "#staffInquiriesContent",
    inquiries,
    buildStaffInquiryCard,
    getStaffInquiriesEmptyMessage()
  );
}

function renderCurrentStaffContacts() {
  const contactSubmissions = getStaffVisibleContacts();
  renderStaffContactsSummary(contactSubmissions);
  renderStaffRecordList(
    "#staffContactsContent",
    contactSubmissions,
    buildStaffContactCard,
    getStaffContactsEmptyMessage()
  );
}

function renderCurrentStaffSupportRequests() {
  const supportRequests = getStaffVisibleSupportRequests();
  renderStaffSupportSummary(supportRequests);
  renderStaffRecordList(
    "#staffSupportContent",
    supportRequests,
    buildStaffSupportRequestCard,
    getStaffSupportEmptyMessage()
  );
}

function renderCurrentStaffTestimonials() {
  const testimonials = getStaffVisibleTestimonials();
  renderStaffTestimonialsSummary(testimonials);
  renderStaffRecordList(
    "#staffTestimonialsContent",
    testimonials,
    buildStaffTestimonialCard,
    getStaffTestimonialsEmptyMessage()
  );
}

function resetStaffViewFilters() {
  if (staffOrdersSearchTimer) {
    window.clearTimeout(staffOrdersSearchTimer);
    staffOrdersSearchTimer = null;
  }

  const searchInput = $("#staffOrdersSearchInput");
  const sourceInput = $("#staffOrdersSourceInput");
  const tableInput = $("#staffOrdersTableInput");
  const paymentInput = $("#staffOrdersPaymentInput");
  const billingInput = $("#staffOrdersBillingInput");
  const statusInput = $("#staffOrdersStatusInput");

  const selectedDefinition = getStaffOrderSourceCardDefinition(
    getStaffSelectedOrderSourceCard()
  );

  if (searchInput) searchInput.value = "";
  if (sourceInput) sourceInput.value = selectedDefinition?.defaultSourceFilter || "all";
  if (tableInput) tableInput.value = "all";
  if (paymentInput) paymentInput.value = "all";
  if (billingInput) billingInput.value = "all";
  if (statusInput) statusInput.value = "all";
  setStaffAttentionFilterEnabled(false);

  renderCurrentStaffOrders();
}

function renderStaffFilterStatus(visibleOrders = []) {
  const status = $("#staffOrdersFilterStatus");
  if (!status) return;

  if (!STAFF_STATE.orders.length) {
    status.hidden = true;
    status.textContent = "";
    return;
  }

  const visibleCount = visibleOrders.length;
  const totalCount = getStaffOrdersForSourceCard(
    getStaffSelectedOrderSourceCard()
  ).length;
  const visibleOrderWord = visibleCount === 1 ? "order" : "orders";
  const activeFilters = getStaffSelectedFilterLabels();
  const activeFilterText = activeFilters.length
    ? `Active filters: ${activeFilters.join(", ")}.`
    : "No extra filters active.";

  status.hidden = false;
  status.textContent = `Showing ${visibleCount} ${visibleOrderWord} of ${totalCount} total from ${getStaffSelectedRangeLabel()}. ${activeFilterText}`;
}

function clearStaffFilterStatus() {
  const status = $("#staffOrdersFilterStatus");
  if (!status) return;

  status.hidden = true;
  status.textContent = "";
}

function setStaffOrdersActionStatus(message = "", tone = "success") {
  const status = $("#staffOrdersActionStatus");
  if (!status) return;

  const normalizedTone = ["success", "warning", "error"].includes(tone)
    ? tone
    : "success";
  status.hidden = !message;
  status.textContent = message;
  status.className = [
    "staff-orders-action-status",
    normalizedTone === "success" ? "" : `is-${normalizedTone}`
  ].filter(Boolean).join(" ");
}

function clearStaffOrdersActionStatus() {
  setStaffOrdersActionStatus("");
}

function getStaffEmptyOrdersState() {
  const rangeLabel = getStaffSelectedRangeLabel();
  const activeFilters = getStaffSelectedFilterLabels();
  const selectedStatus = getStaffSelectedOrderStatusFilter();
  const selectedSourceCard = getStaffSelectedOrderSourceCard();
  const selectedDefinition = getStaffOrderSourceCardDefinition(selectedSourceCard);
  const selectedSourceOrders = getStaffOrdersForSourceCard(selectedSourceCard);

  if (!STAFF_STATE.orders.length) {
    return {
      kicker: "Order queue",
      title: `No orders in ${rangeLabel.toLowerCase()}`,
      message: "Incoming orders will appear here automatically when they are available for this hotel.",
      canClearFilters: false
    };
  }

  if (selectedDefinition && !selectedSourceOrders.length) {
    return {
      kicker: selectedDefinition.label,
      title: `No ${selectedDefinition.label.toLowerCase()} found`,
      message: `No ${selectedDefinition.label.toLowerCase()} are available for ${rangeLabel.toLowerCase()}. Incoming orders will update this source card automatically.`,
      canClearFilters: false
    };
  }

  if (selectedStatus === "new" && activeFilters.length === 1) {
    return {
      kicker: "Queue clear",
      title: "No new orders right now",
      message: "Incoming orders will appear here automatically. Other order statuses remain available from the status navigation.",
      canClearFilters: true
    };
  }

  if (activeFilters.length) {
    return {
      kicker: "No matches",
      title: "No orders match these filters",
      message: `Active filters: ${activeFilters.join(", ")}. Clear them to return to the full loaded queue.`,
      canClearFilters: true
    };
  }

  return {
    kicker: "Order queue",
    title: "No orders found",
    message: "No orders are available for the selected hotel and range.",
    canClearFilters: false
  };
}

function renderStaffOrdersEmptyState() {
  const content = $("#staffOrdersContent");
  if (!content) return;

  const state = getStaffEmptyOrdersState();
  content.className = "staff-orders-state staff-section-stage";
  content.setAttribute("tabindex", "-1");
  content.setAttribute("role", "status");
  content.setAttribute("aria-busy", "false");
  content.innerHTML = `
    <div class="staff-orders-state-head">
      <p class="staff-orders-state-kicker">${escapeHTML(state.kicker)}</p>
      <h3 class="staff-orders-state-title">${escapeHTML(state.title)}</h3>
      <p class="staff-orders-state-copy">${escapeHTML(state.message)}</p>
    </div>
    ${
      state.canClearFilters
        ? '<div class="staff-orders-state-actions"><button class="staff-btn secondary" type="button" data-staff-clear-order-filters>Clear filters</button></div>'
        : ""
    }
  `;
}

function renderStaffOrdersLoadError(message = "Orders could not be loaded.") {
  const content = $("#staffOrdersContent");
  const selectedSourceCard = getStaffSelectedOrderSourceCard();
  const sourceState = getStaffOrderSourceAsyncState(selectedSourceCard);
  const errorMessage = String(message || "Please try again.").trim() || "Please try again.";

  if (!selectedSourceCard) {
    setStaffOrderSourcePromptState({
      title: sourceState.errorTitle,
      copy: `Please try again. ${sourceState.errorHint}`,
      isError: true,
      canRetry: true
    });
  }
  if (!content) return;

  content.className = "staff-orders-state staff-section-stage is-error";
  content.setAttribute("tabindex", "-1");
  content.setAttribute("role", "alert");
  content.setAttribute("aria-busy", "false");
  content.innerHTML = `
    <div class="staff-orders-state-head">
      <p class="staff-orders-state-kicker">Refresh interrupted</p>
      <h3 class="staff-orders-state-title">${escapeHTML(sourceState.errorTitle)}</h3>
      <p class="staff-orders-state-copy">${escapeHTML(errorMessage)} ${escapeHTML(sourceState.errorHint)}</p>
    </div>
    <div class="staff-orders-state-actions">
      <button class="staff-btn" type="button" data-staff-orders-retry>Try again</button>
    </div>
  `;
}

function buildStaffBillTotalsRows(order = {}) {
  const totals = getStaffOrderTotals(order);
  const rows = [];
  const subtotal = getNumberValue(totals.subtotal);
  const gst = getNumberValue(totals.gst);
  const deliveryCharge = getNumberValue(totals.deliveryCharge);
  const normalTotal = getNumberValue(totals.normalTotal);
  const upiDiscountPercent = getNumberValue(totals.upiDiscountPercent);
  const gpayDiscount = getNumberValue(totals.gpayDiscount);
  const gpayFinalTotal = getNumberValue(totals.gpayFinalTotal);

  if (subtotal !== null) {
    rows.push(`<tr><th>Subtotal</th><td>${escapeHTML(formatMoney(subtotal))}</td></tr>`);
  }

  if (gst !== null) {
    rows.push(`<tr><th>GST</th><td>${escapeHTML(formatMoney(gst))}</td></tr>`);
  }

  if (deliveryCharge !== null && deliveryCharge > 0) {
    rows.push(
      `<tr><th>Delivery Charge</th><td>${escapeHTML(formatMoney(deliveryCharge))}</td></tr>`
    );
  }

  if (normalTotal !== null) {
    rows.push(`<tr><th>Original Total</th><td>${escapeHTML(formatMoney(normalTotal))}</td></tr>`);
  }

  if (gpayDiscount !== null) {
    const discountLabel = upiDiscountPercent !== null
      ? `Google Pay Discount (${formatDiscountPercent(upiDiscountPercent)})`
      : "Google Pay Discount";
    rows.push(`<tr><th>${escapeHTML(discountLabel)}</th><td>-${escapeHTML(formatMoney(gpayDiscount))}</td></tr>`);
  }

  if (gpayFinalTotal !== null) {
    rows.push(`<tr><th>Final Paid Amount</th><td>${escapeHTML(formatMoney(gpayFinalTotal))}</td></tr>`);
  } else {
    rows.push(`<tr><th>Total</th><td>${escapeHTML(formatMoney(getStaffOrderTotal(order)))}</td></tr>`);
  }

  return rows.join("");
}

function getStaffOrderChildAddOns(parentOrder = {}) {
  const parentOrderId = getStaffOrderId(parentOrder);
  if (!parentOrderId) return [];

  return STAFF_STATE.orders
    .filter((order) => {
      const addonMeta = getStaffOrderAddonMeta(order);
      return addonMeta.isAddon && addonMeta.parentOrderId === parentOrderId;
    })
    .sort((firstOrder, secondOrder) => {
      const firstMeta = getStaffOrderAddonMeta(firstOrder);
      const secondMeta = getStaffOrderAddonMeta(secondOrder);
      const firstSequence = firstMeta.addonSequence || Number.MAX_SAFE_INTEGER;
      const secondSequence = secondMeta.addonSequence || Number.MAX_SAFE_INTEGER;

      if (firstSequence !== secondSequence) {
        return firstSequence - secondSequence;
      }

      return new Date(firstOrder.createdAt || 0) - new Date(secondOrder.createdAt || 0);
    });
}

function getStaffOrderFamilyTotal(parentOrder = {}, childAddOns = []) {
  return [parentOrder, ...childAddOns].reduce(
    (sum, order) => sum + getStaffOrderTotal(order),
    0
  );
}

function getStaffOrderFamilyActionHint(order = {}, childAddOns = []) {
  const addonMeta = getStaffOrderAddonMeta(order);

  if (addonMeta.isAddon) {
    return addonMeta.parentOrderId
      ? `This add-on is billed separately from parent order #${addonMeta.parentOrderId}.`
      : "This add-on is billed separately from its parent order.";
  }

  if (!childAddOns.length) {
    return "";
  }

  return `${childAddOns.length} add-on ${childAddOns.length === 1 ? "order is" : "orders are"} linked to this table order. Billing and payment actions still update only the selected order.`;
}

function isStaffOrderBilled(order = {}) {
  return normalizeStatus(getStaffOrderBillingStatus(order)) === "billed";
}

function isStaffOrderPaid(order = {}) {
  return normalizeStatus(getStaffOrderPaymentStatus(order)) === "paid";
}

function isStaffOrderFamilyFullyBilled(parentOrder = {}, childAddOns = []) {
  return [parentOrder, ...childAddOns].every(isStaffOrderBilled);
}

function isStaffOrderFamilyFullyPaid(parentOrder = {}, childAddOns = []) {
  return [parentOrder, ...childAddOns].every(isStaffOrderPaid);
}

function buildStaffBillItemsRows(order = {}) {
  const items = getStaffOrderItems(order);

  if (!items.length) {
    return `<tr><td colspan="5">No items found for this order.</td></tr>`;
  }

  return items
    .map((item, index) => {
      const qty = getNumberValue(item?.qty) || 0;
      const price = getNumberValue(item?.price) || 0;
      const lineTotal = getStaffOrderLineTotal(item);
      const itemMetaMarkup = buildStaffOrderItemMetaLines(item)
        .map((line) => `<span class="bill-item-meta">${escapeHTML(line)}</span>`)
        .join("");

      return `
        <tr>
          <td>${escapeHTML(index + 1)}</td>
          <td>
            <div class="bill-item-name">
              <strong>${escapeHTML(item?.name || item?.id || "Item")}</strong>
              ${itemMetaMarkup}
            </div>
          </td>
          <td>${escapeHTML(qty)}</td>
          <td>${escapeHTML(formatMoney(price))}</td>
          <td>${escapeHTML(formatMoney(lineTotal))}</td>
        </tr>
      `;
    })
    .join("");
}

function buildStaffBillAddonSections(childAddOns = []) {
  if (!childAddOns.length) return "";

  return `
    <section class="addon-section">
      <h3>Additional table orders</h3>
      ${childAddOns
        .map((addOn) => {
          const addonMeta = getStaffOrderAddonMeta(addOn);

          return `
            <article class="addon-bill">
              <div class="addon-bill-head">
                <strong>${escapeHTML(addonMeta.label || `Add-on Order ${addOn.id || ""}`)}</strong>
                <span>${escapeHTML(formatOrderDate(addOn.createdAt))}</span>
              </div>
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
                <tbody>${buildStaffBillItemsRows(addOn)}</tbody>
              </table>
              <p class="addon-total">Add-on total: ${escapeHTML(formatMoney(getStaffOrderTotal(addOn)))}</p>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

function getStaffBillTitle(order = {}) {
  const addonMeta = getStaffOrderAddonMeta(order);

  if (addonMeta.isAddon) {
    return addonMeta.sequenceLabel || `Add-on Order ${order.id || ""}`;
  }

  return order.billNumber || `Draft Bill - Order ${order.id || ""}`;
}

function buildStaffBillPrintDocument(order = {}) {
  const sourceMeta = getStaffOrderSourceMeta(order);
  const sourceDetail = sourceMeta.detail ? ` (${sourceMeta.detail})` : "";
  const addonMeta = getStaffOrderAddonMeta(order);
  const childAddOns = addonMeta.isAddon ? [] : getStaffOrderChildAddOns(order);
  const itemRows = buildStaffBillItemsRows(order);
  const addonSections = buildStaffBillAddonSections(childAddOns);
  const familyTotal = getStaffOrderFamilyTotal(order, childAddOns);
  const hasChildAddOns = childAddOns.length > 0;
  const createdByLabel = getStaffOrderCreatedByLabel(order);

  const billTitle = getStaffBillTitle(order);

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
    .addon-section { margin-top: 22px; padding-top: 16px; border-top: 1px solid #ddd; }
    .addon-section h3 { margin: 0 0 12px; font-size: 16px; }
    .addon-bill { margin-top: 14px; padding: 12px; border: 1px solid #ddd; border-radius: 10px; }
    .addon-bill-head { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .addon-total,
    .family-total { margin: 12px 0 0; text-align: right; font-weight: 700; }
    .family-total { padding-top: 12px; border-top: 2px solid #111; }
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
        <h1>${escapeHTML(order.hotelName || "Hotel")}</h1>
        <h2>${escapeHTML(billTitle)}</h2>
      </div>
      <div class="muted">
        <p>Order: ${escapeHTML(order.id || "")}</p>
        ${addonMeta.isAddon ? `<p>Add-on: ${escapeHTML(addonMeta.label)}</p>` : ""}
        ${addonMeta.parentOrderId ? `<p>Parent Order: ${escapeHTML(addonMeta.parentOrderId)}</p>` : ""}
        ${order.billNumber ? `<p>Bill Number: ${escapeHTML(order.billNumber)}</p>` : ""}
        <p>Created: ${escapeHTML(formatOrderDate(order.createdAt))}</p>
        <p>Billed: ${escapeHTML(order.billedAt || "Not billed yet")}</p>
      </div>
    </header>

    <section class="grid">
      <div class="row"><strong>Customer:</strong> ${escapeHTML(order.customerName || "Not provided")}</div>
      <div class="row"><strong>Phone:</strong> ${escapeHTML(order.customerPhone || "Not provided")}</div>
      <div class="row"><strong>Address:</strong> ${escapeHTML(order.customerAddress || "Not provided")}</div>
      <div class="row"><strong>Table:</strong> ${escapeHTML(getStaffOrderTableLabel(order))}</div>
      <div class="row"><strong>Order Type:</strong> ${escapeHTML(order.orderType || "dine-in")}</div>
      <div class="row"><strong>Payment:</strong> ${escapeHTML(order.paymentMethod || "")}</div>
      <div class="row"><strong>Payment Status:</strong> ${escapeHTML(getStaffOrderPaymentStatus(order))}</div>
      <div class="row"><strong>Billing Status:</strong> ${escapeHTML(getStaffOrderBillingStatus(order))}</div>
      <div class="row"><strong>Source:</strong> ${escapeHTML(sourceMeta.label + sourceDetail)}</div>
      ${createdByLabel ? `<div class="row"><strong>Taken By:</strong> ${escapeHTML(createdByLabel)}</div>` : ""}
      ${addonMeta.isAddon ? `<div class="row"><strong>Add-on:</strong> ${escapeHTML(addonMeta.label)}</div>` : ""}
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
      <tbody>${buildStaffBillTotalsRows(order)}</tbody>
    </table>
    ${addonSections}
    ${hasChildAddOns ? `<p class="family-total">Combined table total: ${escapeHTML(formatMoney(familyTotal))}</p>` : ""}

    <div class="note">
      <strong>Note:</strong> ${escapeHTML(order.note || "No note")}
    </div>
  </div>
</body>
</html>`;
}

function buildStaffReportPrintRows(rows = [], columns = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  if (!safeRows.length) {
    return `<tr><td colspan="${Math.max(1, safeColumns.length)}">No data available.</td></tr>`;
  }

  return safeRows
    .map((row) => `
      <tr>
        ${safeColumns
          .map((column) => `<td>${escapeHTML(column.format ? column.format(row) : row?.[column.key] || "")}</td>`)
          .join("")}
      </tr>
    `)
    .join("");
}

function buildStaffReportPrintTable(title = "", rows = [], columns = []) {
  return `
    <section class="report-section">
      <h2>${escapeHTML(title)}</h2>
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHTML(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>${buildStaffReportPrintRows(rows, columns)}</tbody>
      </table>
    </section>
  `;
}

function buildStaffModuleReportPrintDocument(report = {}) {
  const reportType = report.reportType === "rooms" ? "Room" : "Combined";
  const summary = report.summary || {};
  const period = report.period || {};
  const summaryRows = Object.entries(summary).map(([metric, value]) => ({ metric, value }));
  const tables = report.reportType === "rooms"
    ? [
        buildStaffReportPrintTable("Summary", summaryRows, [
          { label: "Metric", key: "metric" },
          { label: "Value", key: "value" }
        ]),
        buildStaffReportPrintTable("Booking status", report.bookingStatuses || [], [
          { label: "Status", key: "label" },
          { label: "Bookings", key: "orders" },
          { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
        ]),
        buildStaffReportPrintTable("Room performance", report.roomPerformance || [], [
          { label: "Room", key: "roomNumber" },
          { label: "Type", key: "roomType" },
          { label: "Nights", key: "nightsSold" },
          { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
          { label: "ADR", format: (row) => formatMoney(row.averageRate || 0) }
        ])
      ]
    : [
        buildStaffReportPrintTable("Summary", summaryRows, [
          { label: "Metric", key: "metric" },
          { label: "Value", key: "value" }
        ]),
        buildStaffReportPrintTable("Food order sources", report.food?.orderSources || [], [
          { label: "Source", key: "label" },
          { label: "Orders", key: "orders" },
          { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
        ]),
        buildStaffReportPrintTable("Room booking sources", report.rooms?.bookingSources || [], [
          { label: "Source", key: "label" },
          { label: "Bookings", key: "orders" },
          { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
        ])
      ];

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHTML(reportType)} Reports</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#151515}.actions{text-align:right}button{padding:10px 14px;background:#111;color:#fff;border:0;border-radius:8px}header{border-bottom:2px solid #111;margin-bottom:18px;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin:8px 0 20px}th,td{border:1px solid #ccc;padding:7px;text-align:left;font-size:12px}th{background:#f3f3f3}.report-section{break-inside:avoid}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div><header><h1>${escapeHTML(report.hotelName || report.hotelSlug || "Hotel")} - ${escapeHTML(reportType)} Reports</h1><p>${escapeHTML(period.label || "Business report")}</p><p>${escapeHTML(report.basis?.accountingRule || report.basis?.occupancyFormula || "Hotel-scoped report")}</p></header>${tables.join("")}<footer>Hotel-scoped owner report.</footer></body></html>`;
}

function buildStaffReportPrintDocument(report = STAFF_STATE.businessReport) {
  if (report?.reportType === "rooms" || report?.reportType === "combined") {
    return buildStaffModuleReportPrintDocument(report);
  }
  const summary = report?.summary || {};
  const items = report?.items || {};
  const customers = report?.customers || {};
  const period = report?.period || {};
  const recommendations = Array.isArray(report?.recommendations) ? report.recommendations : [];
  const generatedLabel = period.generatedAt ? formatOrderDate(period.generatedAt) : formatOrderDate(new Date().toISOString());
  const periodLabel = period.label || "Business report";
  const title = `${report?.hotelName || "Hotel"} - ${periodLabel} Report`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { margin: 0; font-family: Arial, sans-serif; color: #151515; background: #fff; }
    .report { max-width: 980px; margin: 0 auto; }
    .actions { display: flex; justify-content: flex-end; margin: 0 0 18px; }
    button { border: 0; border-radius: 8px; background: #111; color: #fff; padding: 10px 14px; cursor: pointer; }
    .report-header { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 18px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 24px; line-height: 1.2; }
    h2 { font-size: 16px; margin: 0 0 10px; }
    .muted { color: #555; font-size: 12px; line-height: 1.55; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
    .summary-card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
    .summary-card span { display: block; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    .summary-card strong { display: block; margin-top: 7px; font-size: 18px; }
    .report-section { break-inside: avoid; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d6d6d6; padding: 7px; text-align: left; font-size: 12px; vertical-align: top; }
    th { background: #f3f3f3; font-weight: 700; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    li { margin: 5px 0; font-size: 12px; line-height: 1.45; }
    footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; color: #666; font-size: 11px; text-align: center; }
    @media print {
      .actions { display: none; }
      .report { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="report">
    <div class="actions">
      <button type="button" onclick="window.print()">Print / Save PDF</button>
    </div>
    <header class="report-header">
      <div>
        <h1>${escapeHTML(report?.hotelName || "Hotel")}</h1>
        <p class="muted">${escapeHTML(periodLabel)} business report</p>
      </div>
      <div class="muted">
        <p>Generated: ${escapeHTML(generatedLabel)}</p>
        <p>Range: ${escapeHTML(period.range || "")}</p>
        ${period.from ? `<p>From: ${escapeHTML(formatOrderDate(period.from))}</p>` : ""}
        ${period.to ? `<p>To: ${escapeHTML(formatOrderDate(period.to))}</p>` : ""}
      </div>
    </header>

    <section class="summary-grid">
      <article class="summary-card"><span>Total Revenue</span><strong>${escapeHTML(formatMoney(summary.totalRevenue || 0))}</strong></article>
      <article class="summary-card"><span>Total Orders</span><strong>${escapeHTML(String(summary.totalOrders || 0))}</strong></article>
      <article class="summary-card"><span>Paid Revenue</span><strong>${escapeHTML(formatMoney(summary.paidRevenue || 0))}</strong></article>
      <article class="summary-card"><span>Pending Amount</span><strong>${escapeHTML(formatMoney(summary.unpaidAmount || 0))}</strong></article>
    </section>

    <section class="report-section">
      <h2>Recommendations</h2>
      <ul>${recommendations.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
    </section>

    ${buildStaffReportPrintTable("Top-selling items", items.topItems || [], [
      { label: "Item", key: "itemName" },
      { label: "Qty", format: (row) => String(row.quantitySold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "Orders", format: (row) => String(row.orderCount || 0) }
    ])}
    ${buildStaffReportPrintTable("Low-selling items", items.lowItems || [], [
      { label: "Item", key: "itemName" },
      { label: "Qty", format: (row) => String(row.quantitySold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "Last ordered", format: (row) => row.lastOrderedAt ? formatOrderDate(row.lastOrderedAt) : "" }
    ])}
    ${buildStaffReportPrintTable("Top customers", customers.topCustomers || [], [
      { label: "Customer", key: "customerName" },
      { label: "Phone", key: "phoneMasked" },
      { label: "Orders", format: (row) => String(row.totalOrders || 0) },
      { label: "Spend", format: (row) => formatMoney(row.totalSpend || 0) }
    ])}
    ${buildStaffReportPrintTable("Staff performance", report?.staffPerformance || [], [
      { label: "Staff", key: "staffName" },
      { label: "Orders", format: (row) => String(row.ordersTaken || 0) },
      { label: "Sales", format: (row) => formatMoney(row.totalSales || 0) },
      { label: "Average", format: (row) => formatMoney(row.averageOrderValue || 0) }
    ])}
    ${buildStaffReportPrintTable("Payment status", report?.payments?.byStatus || [], [
      { label: "Status", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Amount", format: (row) => formatMoney(row.revenue || 0) }
    ])}
    ${buildStaffReportPrintTable("Order sources", report?.orderSources || [], [
      { label: "Source", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ])}
    ${buildStaffReportPrintTable("Table activity", report?.tables || [], [
      { label: "Table", key: "label" },
      { label: "Orders", format: (row) => String(row.orders || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) }
    ])}
    ${buildStaffReportPrintTable("Combo performance", report?.combos?.topCombos || [], [
      { label: "Combo", key: "itemName" },
      { label: "Qty", format: (row) => String(row.quantitySold || 0) },
      { label: "Revenue", format: (row) => formatMoney(row.revenue || 0) },
      { label: "Orders", format: (row) => String(row.orderCount || 0) }
    ])}
    <footer>Generated by Restaurants Management platform. Hotel-scoped owner report.</footer>
  </main>
</body>
</html>`;
}

function openStaffBusinessReportPrint() {
  if (!STAFF_STATE.businessReport) {
    window.alert("Load a report before exporting.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    window.alert("Please allow popups to open the report export view.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildStaffReportPrintDocument(STAFF_STATE.businessReport));
  printWindow.document.close();
  printWindow.focus();
}

function getStaffReportExportSections(report = STAFF_STATE.businessReport) {
  if (!report || typeof report !== "object") return [];
  const summaryRows = Object.entries(report.summary || {}).map(([metric, value]) => ({ metric, value }));

  if (report.reportType === "rooms") {
    return [
      { title: "Summary", rows: summaryRows },
      { title: "Booking Status", rows: report.bookingStatuses || [] },
      { title: "Booking Sources", rows: report.bookingSources || [] },
      { title: "Room Performance", rows: report.roomPerformance || [] },
      { title: "Room Type Performance", rows: report.roomTypePerformance || [] },
      { title: "Guest Stays", rows: report.guestStays || [] },
      { title: "Payments", rows: report.payments?.byMethod || [] },
      { title: "Maintenance", rows: report.maintenance || [] }
    ];
  }

  if (report.reportType === "combined") {
    return [
      { title: "Summary", rows: summaryRows },
      { title: "Food Sources", rows: report.food?.orderSources || [] },
      { title: "Room Sources", rows: report.rooms?.bookingSources || [] },
      { title: "Room Performance", rows: report.rooms?.roomPerformance || [] }
    ];
  }

  return [
    { title: "Summary", rows: summaryRows },
    { title: "Order Status", rows: report.orderStatuses || [] },
    { title: "Order Sources", rows: report.orderSources || [] },
    { title: "Top Items", rows: report.items?.topItems || [] },
    { title: "Low Items", rows: report.items?.lowItems || [] },
    { title: "Customers", rows: report.customers?.topCustomers || [] },
    { title: "Staff Performance", rows: report.staffPerformance || [] },
    { title: "Payments", rows: report.payments?.byMethod || [] },
    { title: "Tables", rows: report.tables || [] },
    { title: "Cancellations", rows: report.cancellations || [] },
    { title: "Combos", rows: report.combos?.topCombos || [] }
  ];
}

function getStaffSpreadsheetCellValue(value) {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  // Excel-compatible exports must neutralize formulas even when an attacker
  // prefixes the trigger with spaces, tabs, or line breaks.
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function buildStaffReportCsv(report = STAFF_STATE.businessReport) {
  const lines = [
    ["Hotel", report?.hotelName || report?.hotelSlug || ""],
    ["Report Type", report?.reportType || "food"],
    ["Period", report?.period?.label || ""],
    []
  ];

  getStaffReportExportSections(report).forEach((section) => {
    const rows = Array.isArray(section.rows) ? section.rows : [];
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
    lines.push([section.title]);
    if (headers.length) {
      lines.push(headers);
      rows.forEach((row) => lines.push(headers.map((header) => row?.[header])));
    } else {
      lines.push(["No data"]);
    }
    lines.push([]);
  });

  return lines.map((row) => row.map((value) => {
    const safeValue = getStaffSpreadsheetCellValue(value).replace(/"/g, '""');
    return `"${safeValue}"`;
  }).join(",")).join("\r\n");
}

function buildStaffReportExcelHtml(report = STAFF_STATE.businessReport) {
  const sections = getStaffReportExportSections(report).map((section) => {
    const rows = Array.isArray(section.rows) ? section.rows : [];
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
    return `<h2>${escapeHTML(section.title)}</h2><table border="1"><thead><tr>${headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHTML(getStaffSpreadsheetCellValue(row?.[header]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHTML(report?.hotelName || report?.hotelSlug || "Hotel")}</h1><p>${escapeHTML(report?.period?.label || "")}</p>${sections}</body></html>`;
}

function downloadStaffBusinessReport(format = "csv") {
  const report = STAFF_STATE.businessReport;
  if (!report) {
    window.alert("Load a report before exporting.");
    return;
  }

  const hotelPart = String(report.hotelSlug || report.hotelName || "hotel").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "hotel";
  const typePart = String(report.reportType || "food").replace(/[^a-z0-9_-]+/gi, "-");
  const isExcel = format === "excel";
  const content = isExcel ? buildStaffReportExcelHtml(report) : buildStaffReportCsv(report);
  const blob = new Blob([isExcel ? content : `\uFEFF${content}`], {
    type: isExcel ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${hotelPart}-${typePart}-report.${isExcel ? "xls" : "csv"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadStaffFoodOrderBill(orderId = "") {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    window.alert("Order not found in the current staff list.");
    return;
  }
  if (!window.FoodOrderReceipt) {
    window.alert("The thermal food bill preview is not available yet.");
    return;
  }

  window.FoodOrderReceipt.openLoading(normalizedOrderId);
  try {
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/food-order-bill/orders/${encodeURIComponent(normalizedOrderId)}`
    );
    window.FoodOrderReceipt.showBill(result.bill, normalizedOrderId);
  } catch (error) {
    console.error("Food order bill load failed:", error);
    window.FoodOrderReceipt.showError(
      error.message || "The food bill could not be loaded. Please try again.",
      normalizedOrderId
    );
  }
}

function openStaffOrderBill(order = {}) {
  return loadStaffFoodOrderBill(order.id || "");
}

window.loadStaffFoodOrderBill = loadStaffFoodOrderBill;

function getStaffOrderCreatedByLabel(order = {}) {
  const createdByStaff = order.createdByStaff && typeof order.createdByStaff === "object"
    ? order.createdByStaff
    : {};
  const displayName = String(createdByStaff.displayName || "").trim();
  const createdByStaffId = String(order.createdByStaffId || createdByStaff.id || "").trim();

  if (displayName) {
    return `Staff - ${displayName}`;
  }

  return createdByStaffId ? `Staff #${createdByStaffId}` : "";
}

function getStaffOrderRoomServiceMeta(order = {}) {
  const roomService =
    order.roomService && typeof order.roomService === "object" && !Array.isArray(order.roomService)
      ? order.roomService
      : {};
  const roomId = String(order.room_id || roomService.roomId || "").trim();
  const roomBookingId = String(order.room_booking_id || roomService.roomBookingId || "").trim();
  const roomNumber = String(order.room_number || roomService.roomNumber || "").trim();
  const guestName = String(order.room_service_guest_name || roomService.guestName || "").trim();
  const chargeToRoom = order.room_service_charge_to_room === true || roomService.chargeToRoom === true;
  const visible = !!(roomId || roomBookingId || roomNumber || guestName || chargeToRoom);

  return {
    visible,
    roomId,
    roomBookingId,
    roomNumber,
    guestName,
    chargeToRoom,
    label: roomNumber ? `Room ${roomNumber}` : "Room service"
  };
}

function buildStaffOrderRoomServiceMetaSpans(order = {}) {
  const roomService = getStaffOrderRoomServiceMeta(order);

  if (!roomService.visible) return "";

  return [
    `<span>Room service: ${escapeHTML(roomService.label)}</span>`,
    roomService.roomBookingId ? `<span>Room booking: ${escapeHTML(roomService.roomBookingId)}</span>` : "",
    roomService.guestName ? `<span>Room guest: ${escapeHTML(roomService.guestName)}</span>` : "",
    roomService.chargeToRoom ? "<span>Billing: Add food bill to room</span>" : ""
  ].filter(Boolean).join("");
}

function getStaffOrderRounds(order = {}) {
  return (Array.isArray(order.rounds) ? order.rounds : [])
    .filter((round) => Number(round?.sequence || 0) >= 2)
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0));
}

function buildStaffOrderRoundItemsMarkup(items = [], canViewFinancials = true) {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) return '<p class="staff-empty">No valid items in this round.</p>';
  return `<ul class="staff-order-round-items">${safeItems.map((item) => {
    const meta = buildStaffOrderItemMetaLines(item);
    return `<li><span><strong>${escapeHTML(item.name || item.id || "Item")}</strong> x${escapeHTML(item.qty || 0)}${meta.length ? `<small>${meta.map(escapeHTML).join("<br>")}</small>` : ""}</span>${canViewFinancials ? `<strong>${escapeHTML(formatMoney(getStaffOrderLineTotal(item)))}</strong>` : ""}</li>`;
  }).join("")}</ul>`;
}

function buildStaffOrderRoundsMarkup(order = {}) {
  if (String(STAFF_STATE.selectedTableOrderId || "") !== String(order.id || "")) return "";
  const rounds = getStaffOrderRounds(order);
  const canViewFinancials = canStaffViewOrderFinancials(order);
  const originalItems = getStaffOrderItems(order).filter((item) => !Number(item?.orderRoundSequence || 0));
  const allRounds = [{
    sequence: 1,
    kotReference: `KOT-${order.id}-01`,
    status: order.kitchenStatus || order.effectiveKitchenStatus || order.status || "new",
    createdAt: order.createdAt,
    items: originalItems,
    note: order.note || ""
  }, ...rounds];

  return `
    <section class="staff-order-rounds" aria-label="Order rounds and kitchen batches">
      <div class="staff-order-rounds-head">
        <div><p>Kitchen history</p><h4>${escapeHTML(String(allRounds.length))} service round${allRounds.length === 1 ? "" : "s"}</h4></div>
        <span class="staff-badge">Same order #${escapeHTML(order.id || "")}</span>
      </div>
      ${allRounds.map((round) => `
        <article class="staff-order-round" data-order-round="${escapeHTML(round.sequence)}" tabindex="-1">
          <header>
            <div><strong>Round ${escapeHTML(round.sequence)}</strong><span>${escapeHTML(round.kotReference || "Kitchen batch")}</span></div>
            <span class="staff-badge ${getStaffKdsStatusBadgeClass(round.status)}">${escapeHTML(getStaffKdsStatusLabel(round.status))}</span>
          </header>
          <p>${escapeHTML(formatOrderDate(round.createdAt))}${round.sequence > 1 ? " · New items only" : " · Original order"}</p>
          ${buildStaffOrderRoundItemsMarkup(round.items, canViewFinancials)}
          ${round.note ? `<p class="staff-order-note"><strong>Kitchen note:</strong> ${escapeHTML(round.note)}</p>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function buildStaffOrderCard(order = {}) {
  const orderId = order.id || "";
  const paymentStatus = getStaffOrderPaymentStatus(order);
  const billingStatus = getStaffOrderBillingStatus(order);
  const tableLabel = getStaffOrderTableLabel(order);
  const sourceMeta = getStaffOrderSourceMeta(order);
  const sourceBadgeClass = sourceMeta.badgeClass ? ` ${sourceMeta.badgeClass}` : "";
  const sourceDetail = sourceMeta.detail ? ` (${sourceMeta.detail})` : "";
  const paymentBadgeClass = getStaffPaymentBadgeClass(paymentStatus);
  const billingBadgeClass = getStaffBillingBadgeClass(billingStatus);
  const orderStatus = order.status || "new";
  const orderStatusLabel = getStaffRecordStatusLabel(orderStatus, "order");
  const orderStatusBadgeClass = getStaffRecordStatusBadgeClass(orderStatus, "order");
  const normalizedOrderStatus = normalizeStatus(orderStatus);
  const routeTransferMeta = getStaffRouteTransferMeta(order);
  const paymentExceptionMeta = getStaffOrderPaymentExceptionMeta(orderStatus);
  const canViewFinancials = canStaffViewOrderFinancials(order);
  const roomServiceMeta = getStaffOrderRoomServiceMeta(order);
  const addonMeta = getStaffOrderAddonMeta(order);
  const childAddOns = addonMeta.isAddon ? [] : getStaffOrderChildAddOns(order);
  const safeOrderId = escapeHTML(orderId);
  const addonCardClass = addonMeta.isAddon ? " is-addon" : "";
  const freshOrderCardClass = normalizedOrderStatus === "new" && !addonMeta.isAddon ? " is-new-order" : "";
  const titlePrefix = addonMeta.isAddon ? `${addonMeta.label} - ` : "";
  const customerIdentity = order.customerName || order.customerPhone || sourceMeta.label;
  const familyActionHint = getStaffOrderFamilyActionHint(order, childAddOns);
  const createdByLabel = getStaffOrderCreatedByLabel(order);
  const itemSummary = getStaffOrderItemSummary(order);
  const elapsedLabel = formatStaffElapsedTime(order.createdAt);
  const isExpanded = STAFF_STATE.expandedOrderIds.has(String(orderId));
  const canManageBilling = canViewFinancials;
  const markBilledDisabled =
    !orderId || normalizeStatus(billingStatus) === "billed" ? "disabled" : "";
  const markPaidDisabled =
    !orderId || normalizeStatus(paymentStatus) === "paid" ? "disabled" : "";
  const markBilledLabel = markBilledDisabled
    ? "Billed"
    : childAddOns.length
      ? "Mark Parent Billed"
      : "Mark Billed";
  const markPaidLabel = markPaidDisabled
    ? "Paid"
    : childAddOns.length
      ? "Mark Parent Paid"
      : "Mark Paid";
  const markFamilyBilledDisabled =
    !orderId || !childAddOns.length || isStaffOrderFamilyFullyBilled(order, childAddOns) ? "disabled" : "";
  const markFamilyPaidDisabled =
    !orderId || !childAddOns.length || isStaffOrderFamilyFullyPaid(order, childAddOns) ? "disabled" : "";
  const markFamilyBilledLabel = markFamilyBilledDisabled ? "Full Table Billed" : "Mark Full Table Billed";
  const markFamilyPaidLabel = markFamilyPaidDisabled ? "Full Table Paid" : "Mark Full Table Paid";
  const note = order.note ? `<p class="staff-order-note"><strong>Note:</strong> ${escapeHTML(order.note)}</p>` : "";
  const addMoreItemsButton = order.canAddItems === true
    ? `<button class="staff-btn staff-add-more-items-btn" type="button" data-staff-add-more-items data-order-id="${safeOrderId}" aria-controls="staffTakeOrderCreateView">Add More Items</button>`
    : "";
  const billingActionButtons = canManageBilling
    ? `
        <button class="staff-btn secondary" type="button" data-staff-mark-billed data-order-id="${safeOrderId}" ${markBilledDisabled}>
          ${escapeHTML(markBilledLabel)}
        </button>
        <button class="staff-btn secondary" type="button" data-staff-mark-paid data-order-id="${safeOrderId}" ${markPaidDisabled}>
          ${escapeHTML(markPaidLabel)}
        </button>
        ${
          childAddOns.length
            ? `
              <button class="staff-btn secondary" type="button" data-staff-mark-family-billed data-order-id="${safeOrderId}" ${markFamilyBilledDisabled}>
                ${escapeHTML(markFamilyBilledLabel)}
              </button>
              <button class="staff-btn secondary" type="button" data-staff-mark-family-paid data-order-id="${safeOrderId}" ${markFamilyPaidDisabled}>
                ${escapeHTML(markFamilyPaidLabel)}
              </button>
            `
            : ""
        }
      `
    : "";

  return `
    <article class="staff-order-card${addonCardClass}${freshOrderCardClass}">
      <div class="staff-order-topline">
        <div class="staff-order-title-block">
          <h3 class="staff-order-title">${escapeHTML(titlePrefix)}Order #${safeOrderId}</h3>
          <p class="staff-order-subtitle">${escapeHTML(customerIdentity)}</p>
        </div>
        <span class="staff-order-time" title="${escapeHTML(formatOrderDate(order.createdAt))}">${escapeHTML(elapsedLabel)}</span>
      </div>

      <div class="staff-order-quickfacts">
        ${normalizedOrderStatus === "new" && !addonMeta.isAddon ? '<span class="staff-badge is-alert">Fresh order</span>' : ""}
        ${addonMeta.isAddon ? `<span class="staff-badge is-addon">Add-on${addonMeta.parentOrderId ? ` for #${escapeHTML(addonMeta.parentOrderId)}` : ""}</span>` : ""}
        <span class="staff-badge${sourceBadgeClass}">${escapeHTML(sourceMeta.label + sourceDetail)}</span>
        <span class="staff-badge is-important">${escapeHTML(roomServiceMeta.visible ? roomServiceMeta.label : tableLabel)}</span>
        <span class="staff-badge">${escapeHTML(`${itemSummary.itemCount} item${itemSummary.itemCount === 1 ? "" : "s"} / ${itemSummary.totalQty} qty`)}</span>
        ${canViewFinancials ? `<span class="staff-badge">Total: ${escapeHTML(formatMoney(getStaffOrderTotal(order)))}</span>` : ""}
        <span class="staff-badge ${orderStatusBadgeClass}">Status: ${escapeHTML(orderStatusLabel)}</span>
        <span class="staff-badge ${paymentBadgeClass}">Payment: ${escapeHTML(paymentStatus)}</span>
      </div>

      <details class="staff-order-details" data-staff-order-details data-order-id="${safeOrderId}" ${isExpanded ? "open" : ""}>
        <summary class="staff-order-details-summary">
          <span>View full details and actions</span>
        </summary>

        <div class="staff-order-detail-content">
          ${
            paymentExceptionMeta.visible
              ? `<p class="staff-order-payment-exception ${escapeHTML(paymentExceptionMeta.className)}">${escapeHTML(paymentExceptionMeta.message)}</p>`
              : ""
          }
          <div class="staff-order-badges">
            <span class="staff-badge ${billingBadgeClass}">Billing: ${escapeHTML(billingStatus)}</span>
            <span class="staff-badge">Created: ${escapeHTML(formatOrderDate(order.createdAt))}</span>
            ${
              canViewFinancials && routeTransferMeta.visible
                ? `<span class="staff-badge ${routeTransferMeta.badgeClass}" title="${escapeHTML(routeTransferMeta.detail)}">${escapeHTML(routeTransferMeta.label)}</span>`
                : ""
            }
          </div>

          <div class="staff-order-meta">
            <span>Customer: ${escapeHTML(order.customerName || "Not provided")}</span>
            <span>Phone: ${escapeHTML(order.customerPhone || "Not provided")}</span>
            <span>Address: ${escapeHTML(order.customerAddress || "Not provided")}</span>
            ${canViewFinancials ? `<span>Method: ${escapeHTML(order.paymentMethod || "Not provided")}</span>` : ""}
            ${buildStaffOrderRoomServiceMetaSpans(order)}
            ${createdByLabel ? `<span>Taken By: ${escapeHTML(createdByLabel)}</span>` : ""}
            ${addonMeta.sequenceLabel ? `<span>Sequence: ${escapeHTML(addonMeta.sequenceLabel)}</span>` : ""}
            ${addonMeta.parentOrderId ? `<span>Parent order: #${escapeHTML(addonMeta.parentOrderId)}</span>` : ""}
            ${canViewFinancials && order.billNumber ? `<span>Bill: ${escapeHTML(order.billNumber)}</span>` : ""}
            ${
              canViewFinancials && routeTransferMeta.visible && routeTransferMeta.detail
                ? `<span>${escapeHTML(routeTransferMeta.detail)}</span>`
                : ""
            }
          </div>

          ${buildStaffOrderItemsList(order)}
          ${note}
          ${buildStaffOrderRoundsMarkup(order)}
          ${familyActionHint ? `<p class="staff-order-family-hint">${escapeHTML(familyActionHint)}</p>` : ""}

          <div class="staff-order-actions">
            ${addMoreItemsButton}
            ${billingActionButtons}
            ${
              canViewFinancials
                ? `<button class="staff-btn secondary" type="button" data-staff-view-bill data-order-id="${safeOrderId}">View Bill</button>`
                : ""
            }
          </div>
          ${buildStaffRecordStatusControls("order", order, STAFF_ORDER_STATUS_OPTIONS)}
        </div>
      </details>
    </article>
  `;
}

function buildStaffOrderSourceGroup(sourceKey, orders = []) {
  if (!orders.length) {
    return "";
  }

  const sourceGroupMeta = {
    "qr-table": {
      title: "QR Table Orders",
      accentClass: "is-qr-table",
      note: "Orders placed after scanning a table QR code, shown by latest table activity first."
    },
    "staff-table": {
      title: "Staff Table Orders",
      accentClass: "is-staff-table",
      note: "Orders entered by staff from the table order pad, shown by latest table activity first."
    },
    "room-service": {
      title: "Room Service Orders",
      accentClass: "is-room-service",
      note: "Food orders linked to checked-in room bookings, shown by latest room activity first."
    },
    website: {
      title: "Website Orders",
      accentClass: "is-website",
      note: "Orders placed from the normal public website flow, shown by latest order activity first."
    }
  };
  const meta = sourceGroupMeta[sourceKey] || sourceGroupMeta.website;
  const summary = getStaffOrderGroupSummary(orders);
  const countLabel = `${summary.totalOrders} order${summary.totalOrders === 1 ? "" : "s"}`;
  const canViewFinancials =
    isStaffManagerSession() && orders.every((order) => order?.financialsVisible !== false);

  return `
    <section class="staff-order-group ${escapeHTML(meta.accentClass)}" aria-label="${escapeHTML(meta.title)}">
      <div class="staff-order-group-header">
        <div>
          <h3 class="staff-order-group-title">${escapeHTML(meta.title)}</h3>
          <p class="staff-order-group-note">${escapeHTML(meta.note)}</p>
        </div>
        <div class="staff-order-group-metrics">
          <span class="staff-order-group-count">${escapeHTML(countLabel)}</span>
          ${canViewFinancials ? `<span class="staff-order-group-count">Total: ${escapeHTML(formatMoney(summary.totalEarnings))}</span>` : ""}
          ${canViewFinancials ? `<span class="staff-order-group-count">${escapeHTML(`${summary.paidOrders} paid / ${summary.unpaidOrders} unpaid`)}</span>` : ""}
          ${canViewFinancials ? `<span class="staff-order-group-count">${escapeHTML(`${summary.billedOrders} billed / ${summary.unbilledOrders} open`)}</span>` : ""}
          <span class="staff-order-group-count">Latest: ${escapeHTML(summary.latestActivityLabel)}</span>
        </div>
      </div>
      <div class="staff-order-group-list">
        ${buildStaffOrderCardsMarkup(orders)}
      </div>
    </section>
  `;
}

function buildStaffOrdersListMarkup(orders = []) {
  if (getStaffSelectedSourceFilter() !== "all") {
    return buildStaffOrderCardsMarkup(orders);
  }

  const qrOrders = orders.filter((order) => getStaffOrderSourceKey(order) === "qr-table");
  const staffTableOrders = orders.filter((order) => getStaffOrderSourceKey(order) === "staff-table");
  const roomServiceOrders = orders.filter((order) => getStaffOrderSourceKey(order) === "room-service");
  const websiteOrders = orders.filter((order) => getStaffOrderSourceKey(order) === "website");

  return [
    buildStaffOrderSourceGroup("qr-table", qrOrders),
    buildStaffOrderSourceGroup("staff-table", staffTableOrders),
    buildStaffOrderSourceGroup("room-service", roomServiceOrders),
    buildStaffOrderSourceGroup("website", websiteOrders)
  ].join("");
}

function getStaffKdsStatusLabel(status = "") {
  const normalizedStatus = normalizeStatus(status);
  return STAFF_KDS_STATUS_LABELS[normalizedStatus] || getStaffRecordStatusLabel(status);
}

function getStaffKdsStatusBadgeClass(status = "") {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "ready" || normalizedStatus === "served") {
    return "is-success";
  }

  if (normalizedStatus === "preparing" || normalizedStatus === "accepted") {
    return "is-warning";
  }

  if (normalizedStatus === "delayed" || normalizedStatus === "cancelled") {
    return "is-danger";
  }

  return "is-important";
}

function getStaffKdsSummaryCardClass(status = "", count = 0) {
  const normalizedStatus = normalizeStatus(status);
  const normalizedCount = Number(count || 0);
  const classNames = ["staff-summary-card", "staff-kds-summary-card"];

  if (normalizedStatus === "new" || normalizedStatus === "accepted" || normalizedStatus === "preparing" || normalizedStatus === "ready") {
    classNames.push("is-kds-active-stage");
    classNames.push(`is-kds-${normalizedStatus}-stage`);
  } else if (normalizedStatus === "served" || normalizedStatus === "cancelled") {
    classNames.push("is-kds-quiet-stage");
  } else if (normalizedStatus === "delayed") {
    classNames.push("is-kds-delayed-stage");
  }

  if (normalizedCount > 0) {
    classNames.push("has-kds-count");
  } else {
    classNames.push("is-kds-empty-stage");
  }

  return classNames.join(" ");
}

function getStaffKdsActionOptions(order = {}) {
  const status = getStaffKdsOrderKitchenStatus(order);

  if (status === "new") {
    return [
      { status: "accepted", label: "Accept" },
      { status: "preparing", label: "Preparing" }
    ];
  }

  if (status === "accepted") {
    return [
      { status: "preparing", label: "Preparing" },
      { status: "delayed", label: "Delay" }
    ];
  }

  if (status === "preparing") {
    return [
      { status: "ready", label: "Ready" },
      { status: "delayed", label: "Delay" }
    ];
  }

  if (status === "delayed") {
    return [
      { status: "preparing", label: "Resume Prep" },
      { status: "ready", label: "Ready" }
    ];
  }

  if (status === "ready") {
    return [{ status: "served", label: "Picked Up / Served" }];
  }

  return [];
}

function getStaffKdsViewMode() {
  const role = String(STAFF_STATE.kdsCapabilities?.role || STAFF_STATE.staffUser?.kdsRole || "general").toLowerCase();
  let mode = String(STAFF_STATE.kdsViewMode || "kitchen").toLowerCase();
  if (!STAFF_KDS_VIEW_MODES.includes(mode)) mode = role === "expo" ? "expo" : "kitchen";
  if (mode === "manager" && STAFF_STATE.kdsCapabilities?.canManage !== true) mode = role === "expo" ? "expo" : "kitchen";
  return mode;
}

function getStaffKdsAllowedActions(order = {}) {
  const viewMode = getStaffKdsViewMode();
  return getStaffKdsActionOptions(order).filter((action) =>
    action.status === "served"
      ? viewMode !== "kitchen" && STAFF_STATE.kdsCapabilities?.canServe !== false
      : viewMode !== "expo" && STAFF_STATE.kdsCapabilities?.canPrepare !== false
  );
}

function buildStaffKdsActionButtons(order = {}) {
  const orderId = String(order.id || "").trim();
  const actions = getStaffKdsAllowedActions(order);
  const roundSequence = Number(order.roundSequence || 0);
  const roundVersion = Math.max(1, Number(order.roundVersion || 1));
  const orderVersion = Math.max(1, Number(order.version || 1));

  if (!orderId || !actions.length) {
    return "";
  }

  return `
    <div class="staff-order-actions staff-kds-actions">
      ${actions
        .map(
          (action) => `
            <button
              class="staff-btn secondary staff-kds-action-btn"
              type="button"
              data-staff-kds-update-status
              data-order-id="${escapeHTML(orderId)}"
              data-order-version="${escapeHTML(orderVersion)}"
              ${roundSequence >= 2 ? `data-round-sequence="${escapeHTML(roundSequence)}" data-round-version="${escapeHTML(roundVersion)}"` : ""}
              data-kitchen-status="${escapeHTML(action.status)}">
              ${escapeHTML(action.label)}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function buildStaffKdsSummaryCard(status = "", count = 0) {
  const isActiveFilter = getStaffSelectedKdsStatusFilter() === normalizeStatus(status);
  const cardClassName = [
    getStaffKdsSummaryCardClass(status, count),
    isActiveFilter ? "is-kds-selected-filter" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const note = isActiveFilter
    ? `Viewing ${getStaffKdsStatusLabel(status).toLowerCase()} orders only.`
    : `Orders currently in ${getStaffKdsStatusLabel(status).toLowerCase()}.`;

  return `
    <article
      class="${escapeHTML(cardClassName)}"
      data-staff-kds-summary-filter="${escapeHTML(normalizeStatus(status))}"
      role="button"
      tabindex="0"
      aria-pressed="${isActiveFilter ? "true" : "false"}"
      aria-label="${escapeHTML(`Show ${getStaffKdsStatusLabel(status)} kitchen orders`)}">
      <p class="staff-summary-label">${escapeHTML(getStaffKdsStatusLabel(status))}</p>
      <strong class="staff-summary-value">${escapeHTML(String(count || 0))}</strong>
      <p class="staff-summary-note">${escapeHTML(note)}</p>
    </article>
  `;
}

function renderStaffKdsSummary(counts = STAFF_STATE.kdsCounts) {
  const summary = $("#staffKdsSummary");
  if (!summary) return;

  const normalizedCounts =
    counts && typeof counts === "object" && !Array.isArray(counts) ? counts : {};
  const boardCounts = {
    new: Number(normalizedCounts.new || 0) + Number(normalizedCounts.accepted || 0),
    preparing: Number(normalizedCounts.preparing || 0) + Number(normalizedCounts.delayed || 0),
    ready: Number(normalizedCounts.ready || 0),
    delayed: Number(normalizedCounts.delayed || 0)
  };

  summary.innerHTML = ["new", "preparing", "ready", "delayed"].map((status) =>
    buildStaffKdsSummaryCard(status, boardCounts[status] || 0)
  ).join("");
  summary.hidden = false;
}

function buildStaffKdsOrderCard(order = {}) {
  const kitchenStatus = getStaffKdsOrderKitchenStatus(order);
  const isFreshKdsOrder = isStaffKdsOrderFresh(order);
  const urgencyLevel = getStaffKdsUrgencyLevel(order);
  const sourceMeta = getStaffOrderSourceMeta(order);
  const sourceQuickfactClass = getStaffKdsSourceQuickfactClass(sourceMeta.key);
  const roomServiceMeta = getStaffOrderRoomServiceMeta(order);
  const tableLabel = getStaffOrderTableLabel(order);
  const elapsedLabel = formatStaffElapsedTime(order.createdAt);
  const paymentStatus = getStaffOrderPaymentStatus(order);
  const billingStatus = getStaffOrderBillingStatus(order);
  const createdByLabel = getStaffOrderCreatedByLabel(order);
  const itemSummary = getStaffOrderItemSummary(order);
  const canViewFinancials = canStaffViewOrderFinancials(order);
  const kitchenBadgeClass = getStaffKdsStatusBadgeClass(kitchenStatus);
  const note = order.note
    ? `<p class="staff-order-note staff-kds-note"><strong>Kitchen Note:</strong> ${escapeHTML(order.note)}</p>`
    : "";
  const urgencyCardClass = urgencyLevel ? ` is-kds-${urgencyLevel}` : "";
  const urgencyTimeClass = urgencyLevel ? ` is-${urgencyLevel}` : "";
  const urgencyElapsedClass = urgencyLevel ? ` is-${urgencyLevel}` : "";

  return `
    <article class="staff-order-card staff-kds-card staff-kds-card--${escapeHTML(kitchenStatus)}${order.isAdditionRound ? " is-kds-addition" : ""}${isFreshKdsOrder ? " is-kds-fresh" : ""}${urgencyCardClass}" data-kds-ticket-id="${escapeHTML(order.kdsTicketId || order.id || "")}">
      <div class="staff-kds-primary-identity">
        <strong>${roomServiceMeta.visible ? escapeHTML(roomServiceMeta.label) : `TABLE ${escapeHTML(tableLabel)}`}</strong>
        <span data-staff-kds-created-at="${escapeHTML(order.createdAt || "")}" aria-live="off">${escapeHTML(elapsedLabel)}</span>
      </div>
      <div class="staff-order-topline">
        <div class="staff-order-title-block">
          <h3 class="staff-order-title">Order #${escapeHTML(order.id || "")}${Number(order.roundSequence || 0) ? ` · Round ${escapeHTML(order.roundSequence)}` : ""}</h3>
          ${order.kotReference ? `<p class="staff-order-subtitle">${escapeHTML(order.kotReference)}${order.isAdditionRound ? " · New items only" : " · Original order"}</p>` : ""}
          <p class="staff-order-subtitle staff-kds-elapsed-label${urgencyElapsedClass}" data-staff-kds-created-at="${escapeHTML(order.createdAt || "")}" aria-live="off">${escapeHTML(elapsedLabel)}</p>
        </div>
        <span class="staff-order-time staff-kds-order-time${urgencyTimeClass}">${escapeHTML(formatOrderDate(order.createdAt))}</span>
      </div>

      <div class="staff-kds-quickline">
        <span class="staff-kds-quickfact is-table">Table: ${escapeHTML(tableLabel)}</span>
        ${roomServiceMeta.visible ? `<span class="staff-kds-quickfact is-table">${escapeHTML(roomServiceMeta.label)}</span>` : ""}
        <span class="staff-kds-quickfact ${escapeHTML(sourceQuickfactClass)}">Source: ${escapeHTML(sourceMeta.label)}</span>
        ${createdByLabel ? `<span class="staff-kds-quickfact">Taken By: ${escapeHTML(createdByLabel)}</span>` : ""}
      </div>

      <div class="staff-order-badges">
        ${isFreshKdsOrder ? '<span class="staff-badge is-alert">New to kitchen</span>' : ""}
        ${order.isAdditionRound ? '<span class="staff-badge is-alert">ADDED ITEMS &middot; NEW ITEMS ONLY</span>' : ""}
        <span class="staff-badge ${kitchenBadgeClass}">${escapeHTML(getStaffKdsStatusLabel(kitchenStatus))}</span>
        <span class="staff-badge staff-kds-secondary-badge">Payment: ${escapeHTML(paymentStatus)}</span>
        <span class="staff-badge staff-kds-secondary-badge">Billing: ${escapeHTML(billingStatus)}</span>
      </div>

      <div class="staff-order-meta">
        <span>Order type: ${escapeHTML(order.orderType || "Not provided")}</span>
        ${canViewFinancials ? `<span>Total: ${escapeHTML(formatMoney(getStaffOrderTotal(order)))}</span>` : ""}
      </div>

      <p class="staff-kds-item-summary">
        ${escapeHTML(String(itemSummary.itemCount || 0))} item${itemSummary.itemCount === 1 ? "" : "s"} |
        ${escapeHTML(String(itemSummary.totalQty || 0))} qty total
      </p>

      ${buildStaffOrderItemsList(order)}
      ${note}
      ${buildStaffKdsActionButtons(order)}
    </article>
  `;
}

function getStaffKdsColumnEmptyMessage(status = "") {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "new") {
    return "No new orders are waiting for the kitchen right now.";
  }

  if (normalizedStatus === "accepted") {
    return "No accepted orders are waiting to enter prep.";
  }

  if (normalizedStatus === "preparing") {
    return "No dishes are actively being prepared right now.";
  }

  if (normalizedStatus === "ready") {
    return "Nothing is waiting at the ready stage right now.";
  }

  if (normalizedStatus === "served") {
    return "No served kitchen orders are visible in this view.";
  }

  if (normalizedStatus === "delayed") {
    return "No delayed kitchen orders need attention right now.";
  }

  if (normalizedStatus === "cancelled") {
    return "No cancelled kitchen orders are visible in this view.";
  }

  return "No orders are in this stage right now.";
}

function getStaffKdsColumnSubtitle(status = "") {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "new") {
    return "Waiting to accept";
  }

  if (normalizedStatus === "accepted") {
    return "Queued for prep";
  }

  if (normalizedStatus === "preparing") {
    return "In prep now";
  }

  if (normalizedStatus === "ready") {
    return "Ready to serve";
  }

  if (normalizedStatus === "served") {
    return "Finished in kitchen";
  }

  if (normalizedStatus === "delayed") {
    return "Needs kitchen attention";
  }

  if (normalizedStatus === "cancelled") {
    return "Stopped before service";
  }

  return "Kitchen stage";
}

function getStaffKdsColumnSummaryText(status = "", orders = []) {
  const baseSubtitle = getStaffKdsColumnSubtitle(status);
  const normalizedStatus = normalizeStatus(status);
  const safeOrders = Array.isArray(orders) ? orders : [];

  if (!safeOrders.length) {
    return baseSubtitle;
  }

  if (normalizedStatus === "delayed") {
    const delayedCount = safeOrders.length;
    return `${baseSubtitle}. ${delayedCount} delayed order${delayedCount === 1 ? "" : "s"} need review.`;
  }

  const urgentCount = safeOrders.filter((order) => getStaffKdsUrgencyLevel(order) === "danger").length;
  const watchCount = safeOrders.filter((order) => getStaffKdsUrgencyLevel(order) === "warning").length;

  if (!urgentCount && !watchCount) {
    return baseSubtitle;
  }

  const pressureParts = [];
  if (urgentCount) {
    pressureParts.push(`${urgentCount} urgent`);
  }
  if (watchCount) {
    pressureParts.push(`${watchCount} watch list`);
  }

  return `${baseSubtitle}. ${pressureParts.join(", ")}.`;
}

function buildStaffKdsColumn(status = "", orders = []) {
  const label = getStaffKdsStatusLabel(status);
  const badgeClass = getStaffKdsStatusBadgeClass(status);
  const normalizedStatus = normalizeStatus(status);
  const isActiveFilter = getStaffSelectedKdsStatusFilter() === normalizedStatus;
  const emptyClassName =
    normalizedStatus === "new" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "preparing" ||
    normalizedStatus === "ready"
      ? "staff-empty staff-kds-empty is-kds-active-empty"
      : "staff-empty staff-kds-empty";

  return `
    <section class="staff-kds-column staff-kds-column--${escapeHTML(status)}" aria-label="${escapeHTML(label)} orders">
      <div
        class="staff-kds-column-head${isActiveFilter ? " is-kds-selected-filter" : ""}"
        data-staff-kds-column-filter="${escapeHTML(normalizedStatus)}"
        role="button"
        tabindex="0"
        aria-pressed="${isActiveFilter ? "true" : "false"}"
        aria-label="${escapeHTML(`Show ${label} kitchen orders`)}">
        <div>
          <p class="staff-kds-column-kicker">${escapeHTML(label)}</p>
          <h3 class="staff-kds-column-title">${escapeHTML(String(orders.length || 0))} order${orders.length === 1 ? "" : "s"}</h3>
          <p class="staff-kds-column-subtitle">${escapeHTML(getStaffKdsColumnSummaryText(status, orders))}</p>
        </div>
        <span class="staff-badge ${badgeClass}">${escapeHTML(label)}</span>
      </div>
      <div class="staff-kds-column-list">
        ${orders.length
          ? orders.map((order) => buildStaffKdsOrderCard(order)).join("")
          : `<div class="${escapeHTML(emptyClassName)}">${escapeHTML(getStaffKdsColumnEmptyMessage(status))}</div>`}
      </div>
    </section>
  `;
}

function sortStaffKdsOrdersForColumn(orders = []) {
  const sortMode = getStaffSelectedKdsSortMode();

  return [...(Array.isArray(orders) ? orders : [])].sort((firstOrder, secondOrder) => {
    const urgencyWeight = { danger: 3, warning: 2, "": 1 };
    const urgencyDelta = (urgencyWeight[getStaffKdsUrgencyLevel(secondOrder)] || 1) -
      (urgencyWeight[getStaffKdsUrgencyLevel(firstOrder)] || 1);
    if (urgencyDelta) return urgencyDelta;
    const additionDelta = Number(secondOrder?.isAdditionRound === true) - Number(firstOrder?.isAdditionRound === true);
    if (additionDelta) return additionDelta;

    const firstCreatedAt = getStaffOrderCreatedAtValue(firstOrder);
    const secondCreatedAt = getStaffOrderCreatedAtValue(secondOrder);

    if (firstCreatedAt !== secondCreatedAt) {
      return sortMode === "oldest"
        ? firstCreatedAt - secondCreatedAt
        : secondCreatedAt - firstCreatedAt;
    }

    return sortMode === "oldest"
      ? String(firstOrder?.id || "").localeCompare(String(secondOrder?.id || ""), undefined, {
          numeric: true,
          sensitivity: "base"
        })
      : String(secondOrder?.id || "").localeCompare(String(firstOrder?.id || ""), undefined, {
          numeric: true,
          sensitivity: "base"
        });
  });
}

function getStaffKdsBoardStage(order = {}) {
  const status = getStaffKdsOrderKitchenStatus(order);
  if (status === "new" || status === "accepted") return "new";
  if (status === "preparing" || status === "delayed") return "preparing";
  if (status === "ready") return "ready";
  return "";
}

function renderStaffKdsOrders(orders = STAFF_STATE.kdsOrders) {
  const content = $("#staffKdsContent");
  if (!content) return;

  if (!Array.isArray(orders) || !orders.length) {
    content.className = "staff-empty staff-section-stage";
    content.textContent = getStaffKdsEmptyMessage();
    return;
  }

  const groupedOrders = STAFF_KDS_BOARD_COLUMNS.reduce((groups, status) => {
    groups[status] = [];
    return groups;
  }, {});

  orders.forEach((order) => {
    const boardStage = getStaffKdsBoardStage(order);
    if (boardStage && groupedOrders[boardStage]) groupedOrders[boardStage].push(order);
  });

  const visibleColumns = getStaffKdsViewMode() === "expo" ? ["ready"] : STAFF_KDS_BOARD_COLUMNS;
  content.className = "staff-kds-grid staff-section-stage";
  content.setAttribute("data-kds-view-mode", getStaffKdsViewMode());
  content.innerHTML = visibleColumns.map((status) =>
    buildStaffKdsColumn(status, sortStaffKdsOrdersForColumn(groupedOrders[status] || []))
  ).join("");
}

function getStaffSelectedKdsFilterLabels() {
  const statusInput = $("#staffKdsStatusInput");
  const sortInput = $("#staffKdsSortInput");

  return []
    .concat(
      statusInput && statusInput.value !== "all"
        ? [statusInput.selectedOptions?.[0]?.textContent?.trim() || statusInput.value]
        : []
    )
    .concat(
      sortInput && sortInput.value !== "newest"
        ? [sortInput.selectedOptions?.[0]?.textContent?.trim() || sortInput.value]
        : []
    )
    .concat(isStaffKdsHideServedEnabled() ? ["Hide served"] : [])
    .concat(isStaffKdsHideCancelledEnabled() ? ["Hide cancelled"] : []);
}

function getStaffKdsActivePresetKey() {
  const statusFilter = getStaffSelectedKdsStatusFilter();
  const sortMode = getStaffSelectedKdsSortMode();
  const hideServed = isStaffKdsHideServedEnabled();
  const hideCancelled = isStaffKdsHideCancelledEnabled();

  if (statusFilter === "all" && sortMode === "oldest" && hideServed && hideCancelled) {
    return "service-focus";
  }

  if (statusFilter === "new" && sortMode === "newest" && hideServed && hideCancelled) {
    return "rush-watch";
  }

  if (statusFilter === "preparing" && sortMode === "oldest" && hideServed && hideCancelled) {
    return "prep-focus";
  }

  return "";
}

function getStaffKdsActivePresetLabel() {
  const activePresetKey = getStaffKdsActivePresetKey();

  if (activePresetKey === "service-focus") {
    return "Service Focus";
  }

  if (activePresetKey === "rush-watch") {
    return "Rush Watch";
  }

  if (activePresetKey === "prep-focus") {
    return "Prep Focus";
  }

  return "Custom view";
}

function getStaffVisibleKdsOrders() {
  const statusFilter = getStaffSelectedKdsStatusFilter();
  const hideServed = isStaffKdsHideServedEnabled();
  const hideCancelled = isStaffKdsHideCancelledEnabled();

  return STAFF_STATE.kdsOrders.filter((order) => {
    const kitchenStatus = getStaffKdsOrderKitchenStatus(order);
    const statusMatches = statusFilter === "all" || kitchenStatus === statusFilter;
    const servedMatches = !hideServed || kitchenStatus !== "served";
    const cancelledMatches = !hideCancelled || kitchenStatus !== "cancelled";
    const sourceMatches = STAFF_STATE.kdsSourceFilter === "all" ||
      getStaffOrderSourceMeta(order).key === STAFF_STATE.kdsSourceFilter;
    const additionMatches = !STAFF_STATE.kdsAdditionsOnly || order.isAdditionRound === true;
    const viewMatches = getStaffKdsViewMode() !== "expo" || kitchenStatus === "ready";
    const activeBoardTicket = Boolean(getStaffKdsBoardStage(order));

    return statusMatches && servedMatches && cancelledMatches && sourceMatches &&
      additionMatches && viewMatches && activeBoardTicket;
  });
}

function renderStaffKdsFilterStatus(visibleOrders = []) {
  const status = $("#staffKdsFilterStatus");
  if (!status) return;

  if (!STAFF_STATE.kdsOrders.length) {
    status.hidden = true;
    status.textContent = "";
    return;
  }

  const visibleCount = visibleOrders.length;
  const totalCount = STAFF_STATE.kdsOrders.length;
  const visibleOrderWord = visibleCount === 1 ? "order" : "orders";
  const activeFilters = getStaffSelectedKdsFilterLabels();
  const activePresetLabel = getStaffKdsActivePresetLabel();
  const activeFilterText = activeFilters.length
    ? `Active filters: ${activeFilters.join(", ")}.`
    : "No extra filters active.";

  status.hidden = false;
  status.textContent = `Showing ${visibleCount} ${visibleOrderWord} of ${totalCount} loaded kitchen orders. Preset: ${activePresetLabel}. ${activeFilterText}`;
}

function clearStaffKdsFilterStatus() {
  const status = $("#staffKdsFilterStatus");
  if (!status) return;

  status.hidden = true;
  status.textContent = "";
}

function toggleStaffKdsStageFilter(status = "") {
  const normalizedStatus = normalizeStatus(status);
  if (!STAFF_KDS_STATUS_ORDER.includes(normalizedStatus)) {
    return;
  }

  STAFF_STATE.kdsStatusFilter =
    getStaffSelectedKdsStatusFilter() === normalizedStatus ? "all" : normalizedStatus;
  STAFF_STATE.kdsDefaultVisibilityApplied = true;
  syncStaffKdsFilterControls();
  saveStaffKdsPreferences();
  renderCurrentStaffKds();
}

function toggleStaffKdsSummaryFilter(status = "") {
  toggleStaffKdsStageFilter(status);
}

function resetStaffKdsFilters() {
  STAFF_STATE.kdsStatusFilter = "all";
  STAFF_STATE.kdsSourceFilter = "all";
  STAFF_STATE.kdsAdditionsOnly = false;
  STAFF_STATE.kdsHideServed = false;
  STAFF_STATE.kdsHideCancelled = false;
  STAFF_STATE.kdsSortMode = "newest";
  STAFF_STATE.kdsDefaultVisibilityApplied = true;
  syncStaffKdsFilterControls();
  saveStaffKdsPreferences();
  renderCurrentStaffKds();
}

function applyStaffKdsServiceFocusPreset() {
  STAFF_STATE.kdsStatusFilter = "all";
  STAFF_STATE.kdsHideServed = true;
  STAFF_STATE.kdsHideCancelled = true;
  STAFF_STATE.kdsSortMode = "oldest";
  STAFF_STATE.kdsDefaultVisibilityApplied = true;
  syncStaffKdsFilterControls();
  saveStaffKdsPreferences();
  renderCurrentStaffKds();
}

function applyStaffKdsRushWatchPreset() {
  STAFF_STATE.kdsStatusFilter = "new";
  STAFF_STATE.kdsHideServed = true;
  STAFF_STATE.kdsHideCancelled = true;
  STAFF_STATE.kdsSortMode = "newest";
  STAFF_STATE.kdsDefaultVisibilityApplied = true;
  syncStaffKdsFilterControls();
  saveStaffKdsPreferences();
  renderCurrentStaffKds();
}

function applyStaffKdsPrepFocusPreset() {
  STAFF_STATE.kdsStatusFilter = "preparing";
  STAFF_STATE.kdsHideServed = true;
  STAFF_STATE.kdsHideCancelled = true;
  STAFF_STATE.kdsSortMode = "oldest";
  STAFF_STATE.kdsDefaultVisibilityApplied = true;
  syncStaffKdsFilterControls();
  saveStaffKdsPreferences();
  renderCurrentStaffKds();
}

function getStaffKdsEmptyMessage() {
  if (!STAFF_STATE.kdsOrders.length) {
    return "No active kitchen orders. New orders will appear automatically.";
  }

  const activeFilters = getStaffSelectedKdsFilterLabels();
  if (activeFilters.length) {
    return `No kitchen orders match these filters: ${escapeHTML(activeFilters.join(", "))}. Use Clear Filters to see all loaded kitchen orders.`;
  }

  return "No kitchen orders match the current kitchen view.";
}

function renderStaffKdsRetryState(message = "Failed to load kitchen board.") {
  const content = $("#staffKdsContent");
  if (!content) return;

  content.className = "staff-empty staff-section-stage";
  content.innerHTML = `
    <p class="staff-empty-copy">${escapeHTML(message)}</p>
    <div class="staff-empty-actions">
      <button class="staff-btn secondary" type="button" data-staff-kds-retry>
        Retry Kitchen Board
      </button>
    </div>
  `;
}

function renderCurrentStaffKds() {
  syncStaffKdsFilterControls();
  const visibleOrders = getStaffVisibleKdsOrders();
  renderStaffKdsFilterStatus(visibleOrders);
  renderStaffKdsOrders(visibleOrders);
}

function applyStaffKdsDefaultVisibility() {
  if (STAFF_STATE.kdsDefaultVisibilityApplied) {
    return;
  }

  STAFF_STATE.kdsHideServed = true;
  STAFF_STATE.kdsHideCancelled = true;
  STAFF_STATE.kdsDefaultVisibilityApplied = true;
  saveStaffKdsPreferences();
}

function setStaffRecordsLoading(selector, message, isLoading = true) {
  const content = $(selector);
  if (!content) return;

  content.className = isLoading
    ? "staff-empty staff-section-stage is-loading"
    : "staff-empty staff-section-stage";
  content.textContent = message;
}

function buildStaffRecordStatusOptions(statuses = [], selectedStatus = "", type = "") {
  const normalizedSelectedStatus = normalizeStatus(selectedStatus);
  const includesSelectedStatus = statuses.some(
    (status) => normalizeStatus(status) === normalizedSelectedStatus
  );
  const readOnlySelectedOption =
    type === "order" &&
    !includesSelectedStatus &&
    isStaffGatewayControlledOrderStatus(normalizedSelectedStatus)
      ? `<option value="${escapeHTML(normalizedSelectedStatus)}" selected>${escapeHTML(getStaffRecordStatusLabel(normalizedSelectedStatus, type))} (gateway controlled)</option>`
      : "";

  return [
    readOnlySelectedOption,
    ...statuses
    .map((status) => {
      const isSelected = normalizeStatus(status) === normalizedSelectedStatus ? "selected" : "";
      const label = getStaffRecordStatusLabel(status, type);

      return `<option value="${escapeHTML(status)}" ${isSelected}>${escapeHTML(label)}</option>`;
    })
  ].filter(Boolean).join("");
}

function buildStaffRecordStatusControls(type = "", record = {}, statuses = []) {
  const recordId = record.id || "";
  const safeRecordId = escapeHTML(recordId);
  const selectedStatus = record.status || "new";
  const isGatewayControlledOrder =
    type === "order" && isStaffGatewayControlledOrderStatus(selectedStatus);
  const selectDisabled = recordId && !isGatewayControlledOrder ? "" : "disabled";
  const buttonDisabled = "disabled";
  const recordLabel = type === "order" ? "order" : type || "record";
  const statusSelectLabel = `Status for ${recordLabel} ${recordId || "without an id"}`;
  const statusButtonLabel = `Apply selected status to ${recordLabel} ${recordId || "without an id"}`;

  return `
    <div class="staff-order-actions staff-record-status-actions">
      <span class="staff-status-control-label">Update status</span>
      <select class="staff-select staff-status-select" aria-label="${escapeHTML(statusSelectLabel)}" data-staff-record-status-select data-record-type="${escapeHTML(type)}" data-record-id="${safeRecordId}" data-current-status="${escapeHTML(selectedStatus)}" ${selectDisabled}>
        ${buildStaffRecordStatusOptions(statuses, selectedStatus, type)}
      </select>
      <button class="staff-btn secondary" type="button" aria-label="${escapeHTML(statusButtonLabel)}" data-staff-update-record-status data-record-type="${escapeHTML(type)}" data-record-id="${safeRecordId}" ${buttonDisabled}>
        Update Status
      </button>
      ${
        isGatewayControlledOrder
          ? '<p class="staff-status-control-note">Gateway-controlled payment state. Operational status updates are disabled.</p>'
          : ""
      }
    </div>
  `;
}

function clearStaffRecordSummary(selector) {
  const summaryWrap = $(selector);
  if (!summaryWrap) return;

  summaryWrap.hidden = true;
  summaryWrap.innerHTML = "";
}

function buildStaffReservationCard(reservation = {}) {
  const status = reservation.status || "new";
  const statusBadgeClass = getStaffRecordStatusBadgeClass(status, "reservation");

  return `
    <article class="staff-order-card">
      <div class="staff-order-topline">
        <h3 class="staff-order-title">Reservation #${escapeHTML(reservation.id || "")}</h3>
        <span class="staff-order-time">${escapeHTML(formatOrderDate(reservation.createdAt))}</span>
      </div>

      <div class="staff-order-badges">
        <span class="staff-badge is-important">Guests: ${escapeHTML(reservation.guests || "Not provided")}</span>
        <span class="staff-badge">Date: ${escapeHTML(reservation.date || "Not provided")}</span>
        <span class="staff-badge">Time: ${escapeHTML(reservation.time || "Not provided")}</span>
        <span class="staff-badge ${statusBadgeClass}">Status: ${escapeHTML(status)}</span>
      </div>

      <div class="staff-order-meta">
        <span>Name: ${escapeHTML(reservation.name || "Not provided")}</span>
        <span>Phone: ${escapeHTML(reservation.phone || "Not provided")}</span>
        <span>Hotel: ${escapeHTML(reservation.hotelName || reservation.hotelSlug || "This hotel")}</span>
      </div>

      <p class="staff-order-note"><strong>Note:</strong> ${escapeHTML(reservation.note || "No note")}</p>
      ${buildStaffRecordStatusControls("reservation", reservation, STAFF_RESERVATION_STATUS_OPTIONS)}
    </article>
  `;
}

function getStaffRoomOperationsDateValue(date = new Date()) {
  const safeDate = date instanceof Date ? date : new Date(date);
  const offsetMs = safeDate.getTimezoneOffset() * 60 * 1000;
  return new Date(safeDate.getTime() - offsetMs).toISOString().slice(0, 10);
}

function ensureStaffRoomOperationsDates() {
  const checkInInput = $("#staffRoomOperationsCheckInInput");
  const checkOutInput = $("#staffRoomOperationsCheckOutInput");
  if (!checkInInput || !checkOutInput) return null;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (!checkInInput.value) checkInInput.value = getStaffRoomOperationsDateValue(today);
  if (!checkOutInput.value) checkOutInput.value = getStaffRoomOperationsDateValue(tomorrow);

  if (checkOutInput.value <= checkInInput.value) {
    const nextDate = new Date(`${checkInInput.value}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + 1);
    checkOutInput.value = getStaffRoomOperationsDateValue(nextDate);
  }

  return {
    checkInDate: checkInInput.value,
    checkOutDate: checkOutInput.value
  };
}

function showStaffRoomOperationsView(view = "home", { focus = true, historyMode = "push" } = {}) {
  const safeView = ["home", "availability", "bookings", "booking", "service"].includes(view)
    ? view
    : "home";

  document.querySelectorAll("[data-staff-room-operations-view]").forEach((panel) => {
    panel.hidden = panel.dataset.staffRoomOperationsView !== safeView;
  });

  STAFF_STATE.roomOperationsView = safeView;
  if (typeof window.syncProfessionalRoomNavigation === "function") {
    window.syncProfessionalRoomNavigation(safeView, { historyMode });
  }

  if (safeView === "availability") {
    ensureStaffRoomOperationsDates();
    renderStaffRoomAvailabilityGrid();
  }

  if (focus) {
    const activePanel = document.querySelector(
      `[data-staff-room-operations-view="${safeView}"]`
    );
    const focusTarget = activePanel?.querySelector("h4, button, input, select");
    if (focusTarget instanceof HTMLElement) {
      if (/^H[1-6]$/.test(focusTarget.tagName) && !focusTarget.hasAttribute("tabindex")) {
        focusTarget.setAttribute("tabindex", "-1");
      }
      focusTarget.focus({ preventScroll: false });
    }
  }
}

function getStaffRoomOperationStatus(room = {}) {
  return normalizeStatus(room.liveStatus || room.status) || "available";
}

function getStaffRoomOperationStatusLabel(status = "") {
  const labels = {
    available: "Available",
    pending: "Pending confirmation",
    booked: "Booked",
    occupied: "Occupied",
    cleaning: "Cleaning",
    maintenance: "Maintenance",
    inactive: "Inactive"
  };

  return labels[normalizeStatus(status)] || getStaffRecordStatusLabel(status || "available");
}

function getStaffRoomOperationPriority(status = "") {
  const priorities = {
    pending: 1,
    occupied: 2,
    booked: 3,
    available: 4,
    cleaning: 5,
    maintenance: 6,
    inactive: 7
  };

  return priorities[normalizeStatus(status)] || 99;
}

function compareStaffRoomNumbers(left = {}, right = {}) {
  return String(left.room_number || left.id || "").localeCompare(
    String(right.room_number || right.id || ""),
    undefined,
    { numeric: true, sensitivity: "base" }
  );
}

function getVisibleStaffRoomOperations() {
  const query = String($("#staffRoomOperationsSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  const statusFilter = normalizeStatus($("#staffRoomOperationsStatusInput")?.value || "all");

  return STAFF_STATE.roomOperationsRooms
    .filter((room) => {
      const status = getStaffRoomOperationStatus(room);
      if (statusFilter && statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;

      const booking = room.blockingBooking || {};
      return [
        room.room_number,
        room.title,
        room.floor,
        room.bed_type,
        room.room_type_id,
        room.id,
        booking.id,
        booking.booking_source
      ].some((value) => String(value || "").toLowerCase().includes(query));
    })
    .sort((left, right) => {
      const statusDifference =
        getStaffRoomOperationPriority(getStaffRoomOperationStatus(left)) -
        getStaffRoomOperationPriority(getStaffRoomOperationStatus(right));
      return statusDifference || compareStaffRoomNumbers(left, right);
    });
}

function buildStaffRoomOperationTile(room = {}) {
  const roomId = String(room.id || "");
  const roomNumber = String(room.room_number || room.id || "Room");
  const status = getStaffRoomOperationStatus(room);
  const statusLabel = getStaffRoomOperationStatusLabel(status);
  const booking = room.blockingBooking || {};
  const periodLabel = booking.check_in_date && booking.check_out_date
    ? `${booking.check_in_date} to ${booking.check_out_date}`
    : "No blocking stay in this period";

  return `
    <button
      class="staff-room-tile"
      type="button"
      data-staff-room-open-detail="${escapeHTML(roomId)}"
      data-status="${escapeHTML(status)}"
      aria-label="Room ${escapeHTML(roomNumber)}, ${escapeHTML(statusLabel)}. Open details.">
      <span class="staff-room-tile-number">Room ${escapeHTML(roomNumber)}</span>
      <span class="staff-room-tile-status">${escapeHTML(statusLabel)}</span>
      <span class="staff-room-tile-meta">
        <span>${escapeHTML(room.title || room.bed_type || `Room type ${room.room_type_id || "not set"}`)}</span>
        <span>${escapeHTML(room.floor ? `Floor ${room.floor}` : "Floor not set")}</span>
        <span>${escapeHTML(periodLabel)}</span>
      </span>
    </button>
  `;
}

function updateStaffRoomOperationsHomeSummary() {
  const counts = STAFF_STATE.roomOperationsRooms.reduce((result, room) => {
    const status = getStaffRoomOperationStatus(room);
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  const pendingBookings = ["website", "manual", "legacy"].reduce(
    (total, source) => total + Math.max(0, Number(STAFF_STATE.roomBookingSummary?.[source]?.pending || 0) || 0),
    0
  );
  const attentionCount =
    (counts.pending || 0) + (counts.cleaning || 0) + (counts.maintenance || 0);
  const values = {
    staffRoomHomeAvailableCount: counts.available || 0,
    staffRoomHomePendingCount: pendingBookings,
    staffRoomHomeOccupiedCount: counts.occupied || 0,
    staffRoomHomeAttentionCount: attentionCount
  };

  Object.entries(values).forEach(([id, value]) => {
    const target = document.getElementById(id);
    if (target) target.textContent = String(value);
  });
}

function renderStaffRoomAvailabilityGrid() {
  const grid = $("#staffRoomAvailabilityGrid");
  const status = $("#staffRoomOperationsStatus");
  const period = $("#staffRoomAvailabilityPeriod");
  if (!grid) return;

  const rooms = getVisibleStaffRoomOperations();
  const { checkInDate, checkOutDate } = STAFF_STATE.roomOperationsPeriod;

  if (period && checkInDate && checkOutDate) {
    period.textContent = `${checkInDate} to ${checkOutDate} · check-out is exclusive`;
  }

  const roomsByFloor = rooms.reduce((groups, room) => {
    const floor = String(room.floor || "Unassigned");
    if (!groups.has(floor)) groups.set(floor, []);
    groups.get(floor).push(room);
    return groups;
  }, new Map());
  grid.innerHTML = rooms.length
    ? [...roomsByFloor.entries()].map(([floor, floorRooms]) => `
        <section class="staff-room-floor-group" aria-label="${escapeHTML(floor)} floor rooms">
          <div class="staff-room-floor-head"><strong>${escapeHTML(floor === "Unassigned" ? floor : `Floor ${floor}`)}</strong><span>${floorRooms.length} room${floorRooms.length === 1 ? "" : "s"}</span></div>
          <div class="staff-room-floor-grid">${floorRooms.map(buildStaffRoomOperationTile).join("")}</div>
        </section>
      `).join("")
    : '<div class="staff-room-grid-empty">No rooms match the selected dates, status, and search.</div>';

  if (status) {
    status.hidden = false;
    status.className = "staff-status";
    status.textContent = `${rooms.length} of ${STAFF_STATE.roomOperationsRooms.length} rooms shown for this stay period.`;
  }

  updateStaffRoomOperationsHomeSummary();
}

async function loadStaffRoomOperations({ silent = false } = {}) {
  const dates = ensureStaffRoomOperationsDates();
  const grid = $("#staffRoomAvailabilityGrid");
  const status = $("#staffRoomOperationsStatus");
  if (!dates) return;

  if (dates.checkOutDate <= dates.checkInDate) {
    if (status) {
      status.className = "staff-status is-error";
      status.textContent = "Check-out date must be after check-in date.";
    }
    return;
  }

  try {
    if (!silent) {
      if (grid) grid.setAttribute("aria-busy", "true");
      if (status) {
        status.hidden = false;
        status.className = "staff-status";
        status.textContent = "Loading shared room availability...";
      }
    }

    const params = new URLSearchParams(dates);
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/room-booking/operations?${params.toString()}`
    );

    STAFF_STATE.roomOperationsRooms = Array.isArray(result.rooms) ? result.rooms : [];
    STAFF_STATE.roomOperationsPeriod = {
      checkInDate: result.checkInDate || dates.checkInDate,
      checkOutDate: result.checkOutDate || dates.checkOutDate
    };
    renderStaffRoomAvailabilityGrid();
  } catch (error) {
    console.error("Staff room operations load failed:", error);
    if (!silent) {
      if (status) {
        status.hidden = false;
        status.className = "staff-status is-error";
        status.textContent = error.message || "Failed to load shared room availability.";
      }
      if (grid) {
        grid.innerHTML = '<div class="staff-room-grid-empty">Room availability could not be loaded. Existing booking records remain available below.</div>';
      }
    }
  } finally {
    if (grid) grid.setAttribute("aria-busy", "false");
  }
}

function buildStaffRoomDetailMarkup(room = {}, detail = null) {
  const booking = detail?.booking || null;
  const status = getStaffRoomOperationStatus(room);
  const roomNumber = room.room_number || room.id || "";
  const fields = [
    ["Room", `Room ${roomNumber}`],
    ["Status", getStaffRoomOperationStatusLabel(status)],
    ["Floor", room.floor || "Not set"],
    ["Capacity", room.capacity || room.max_adults || "Not set"],
    ["Bed", room.bed_type || "Not set"],
    ["Room type", room.title || room.room_type_id || "Not set"]
  ];

  if (booking) {
    fields.push(
      ["Booking reference", `#${booking.id}`],
      ["Source", booking.booking_source || "Not set"],
      ["Stay", `${booking.check_in_date || "—"} to ${booking.check_out_date || "—"}`],
      ["Guest", booking.guest_name || "Not set"],
      ["Phone", booking.guest_phone || "Not set"],
      ["Guests", `${booking.adults || 0} adults · ${booking.children || 0} children`]
    );

    if (Object.prototype.hasOwnProperty.call(booking, "total_amount")) {
      fields.push(
        ["Payment", booking.payment_status || "unpaid"],
        ["Balance", formatMoney(booking.balance_amount || 0)]
      );
    }
  }

  const actionMarkup = status === "available"
    ? `<button class="staff-btn" type="button" data-staff-room-book-room="${escapeHTML(room.id || "")}">Create booking for this room</button>`
    : status === "occupied" && (booking?.id || room.blockingBooking?.id)
      ? `<button class="staff-btn" type="button" data-staff-room-service-booking="${escapeHTML(booking?.id || room.blockingBooking?.id || "")}">Create room service order</button>`
      : "";

  return `
    <span class="staff-room-detail-status">${escapeHTML(getStaffRoomOperationStatusLabel(status))}</span>
    <div class="staff-room-detail-grid">
      ${fields.map(([label, value]) => `
        <div class="staff-room-detail-field">
          <span>${escapeHTML(label)}</span>
          <strong>${escapeHTML(value)}</strong>
        </div>
      `).join("")}
    </div>
    ${booking?.notes ? `<p class="staff-order-note"><strong>Booking note:</strong> ${escapeHTML(booking.notes)}</p>` : ""}
    <div class="staff-room-detail-actions">
      ${actionMarkup}
      ${booking ? '<button class="staff-btn secondary" type="button" data-staff-room-open-records>Open booking actions</button>' : ""}
    </div>
  `;
}

async function openStaffRoomOperationDetail(roomId = "", trigger = null) {
  const room = STAFF_STATE.roomOperationsRooms.find(
    (candidate) => String(candidate.id) === String(roomId)
  );
  const dialog = $("#staffRoomOperationsDrawer");
  const title = $("#staffRoomOperationsDrawerTitle");
  const content = $("#staffRoomOperationsDrawerContent");
  if (!room || !dialog || !content) return;

  STAFF_STATE.selectedRoomOperationId = String(room.id);
  STAFF_STATE.selectedRoomOperationTrigger = trigger instanceof HTMLElement ? trigger : null;
  if (title) title.textContent = `Room ${room.room_number || room.id}`;
  content.innerHTML = buildStaffRoomDetailMarkup(room);

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }

  const bookingId = room.blockingBooking?.id;
  if (!bookingId) return;

  content.insertAdjacentHTML("beforeend", '<p class="staff-status" data-staff-room-detail-loading>Loading authorized booking details...</p>');

  try {
    const detail = await staffFetchJson(
      `${STAFF_API_BASE}/room-booking/bookings/${encodeURIComponent(bookingId)}`
    );
    STAFF_STATE.roomOperationDetails[String(room.id)] = detail;
    if (
      detail?.booking?.id &&
      !STAFF_STATE.roomBookings.some(
        (booking) => String(booking.id) === String(detail.booking.id)
      )
    ) {
      STAFF_STATE.roomBookings = [...STAFF_STATE.roomBookings, detail.booking];
      renderStaffRoomServiceBookingOptions();
    }
    if (dialog.open && STAFF_STATE.selectedRoomOperationId === String(room.id)) {
      content.innerHTML = buildStaffRoomDetailMarkup(room, detail);
    }
  } catch (error) {
    const loading = content.querySelector("[data-staff-room-detail-loading]");
    if (loading) {
      loading.className = "staff-status is-error";
      loading.textContent = error.message || "Booking details could not be loaded.";
    }
  }
}

function closeStaffRoomOperationDetail() {
  const dialog = $("#staffRoomOperationsDrawer");
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
  STAFF_STATE.selectedRoomOperationTrigger?.focus?.();
}

async function openStaffRoomBookingForRoom(roomId = "") {
  const room = STAFF_STATE.roomOperationsRooms.find(
    (candidate) => String(candidate.id) === String(roomId)
  );
  if (!room || getStaffRoomOperationStatus(room) !== "available") return;

  closeStaffRoomOperationDetail();
  showStaffRoomOperationsView("booking");
  const dates = ensureStaffRoomOperationsDates();
  if (dates) {
    const checkInInput = $("#staffRoomBookingCheckInInput");
    const checkOutInput = $("#staffRoomBookingCheckOutInput");
    if (checkInInput) checkInInput.value = dates.checkInDate;
    if (checkOutInput) checkOutInput.value = dates.checkOutDate;
  }

  await checkStaffRoomBookingAvailability();
  const roomInput = $("#staffRoomBookingRoomInput");
  if (roomInput && [...roomInput.options].some((option) => option.value === String(room.id))) {
    roomInput.value = String(room.id);
    setStaffRoomBookingStatus(`Room ${room.room_number || room.id} selected for ${dates?.checkInDate || "the chosen date"}.`);
  }
}

function openStaffRoomServiceForBooking(bookingId = "") {
  closeStaffRoomOperationDetail();
  showStaffRoomOperationsView("service");
  const bookingInput = $("#staffRoomServiceBookingInput");
  if (bookingInput && [...bookingInput.options].some((option) => option.value === String(bookingId))) {
    bookingInput.value = String(bookingId);
  }
}

function buildStaffRoomCard(room = {}) {
  const status = normalizeStatus(room.status) || "available";
  const statusBadgeClass = getStaffRecordStatusBadgeClass(status, "room");
  const roomNumber = room.room_number || room.roomNumber || "";
  const title = room.title || room.room_name || room.name || "";
  const capacity = room.capacity || room.max_adults || "";
  const hasFinancialFields =
    Object.prototype.hasOwnProperty.call(room, "base_price") ||
    Object.prototype.hasOwnProperty.call(room, "discount_price");

  return `
    <article class="staff-order-card">
      <div class="staff-order-topline">
        <h3 class="staff-order-title">Room ${escapeHTML(roomNumber || room.id || "")}</h3>
        <span class="staff-order-time">${escapeHTML(status ? getStaffRecordStatusLabel(status) : "Available")}</span>
      </div>

      <div class="staff-order-badges">
        <span class="staff-badge ${statusBadgeClass}">Status: ${escapeHTML(getStaffRecordStatusLabel(status))}</span>
        ${room.floor ? `<span class="staff-badge">Floor: ${escapeHTML(room.floor)}</span>` : ""}
        ${capacity ? `<span class="staff-badge">Capacity: ${escapeHTML(capacity)}</span>` : ""}
        ${room.bed_type ? `<span class="staff-badge">Bed: ${escapeHTML(room.bed_type)}</span>` : ""}
        ${hasFinancialFields ? `<span class="staff-badge is-important">Price: ${escapeHTML(formatMoney(room.discount_price ?? room.base_price ?? 0))}</span>` : ""}
      </div>

      <div class="staff-order-meta">
        <span>Title: ${escapeHTML(title || "Not provided")}</span>
        <span>Room ID: ${escapeHTML(room.id || "Not provided")}</span>
        <span>Type ID: ${escapeHTML(room.room_type_id || "Not linked")}</span>
      </div>

      ${room.description ? `<p class="staff-order-note"><strong>Description:</strong> ${escapeHTML(room.description)}</p>` : ""}
    </article>
  `;
}

function buildStaffRoomBookingDetailField(label = "", value = "") {
  const safeValue = value === null || value === undefined || value === "" ? "Not provided" : String(value);
  return '<div class="staff-room-booking-detail-field"><span>' + escapeHTML(label) +
    '</span><strong>' + escapeHTML(safeValue) + '</strong></div>';
}

function buildStaffRoomBookingDetailSection(title = "", fields = [], extraMarkup = "") {
  const sectionKey = String(title || "section").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return '<section class="staff-room-booking-detail-section" data-staff-room-booking-detail-section="' +
    escapeHTML(sectionKey) + '" tabindex="-1"><h5>' + escapeHTML(title) + '</h5>' +
    (fields.length ? '<div class="staff-room-booking-detail-grid">' +
      fields.map((field) => buildStaffRoomBookingDetailField(field[0], field[1])).join("") +
      '</div>' : "") + extraMarkup + '</section>';
}

function buildStaffRoomBookingPaymentsMarkup(payments = []) {
  if (!payments.length) return '<p class="staff-hint">No payment entries have been recorded.</p>';
  return '<ul class="staff-room-booking-payment-list">' + payments.map((payment) => {
    const details = [
      getStaffRecordStatusLabel(payment.payment_method || "other"),
      getStaffRecordStatusLabel(payment.payment_status || "recorded"),
      formatOrderDate(payment.paid_at || payment.created_at)
    ].filter(Boolean).join(" · ");
    return '<li><span><strong>' + escapeHTML(formatMoney(payment.amount || 0)) +
      '</strong><small>' + escapeHTML(details) + '</small></span>' +
      (payment.transaction_id ? '<small>Txn ' + escapeHTML(payment.transaction_id) + '</small>' : "") +
      '</li>';
  }).join("") + '</ul>';
}

function buildStaffRoomBookingActivityMarkup(activity = []) {
  if (!activity.length) return '<p class="staff-hint">Booking creation is the only recorded activity available.</p>';
  return '<ul class="staff-room-booking-activity-list">' + activity.map((item) => {
    const detail = [
      item.actorRole ? getStaffRecordStatusLabel(item.actorRole) : "",
      item.paymentMethod ? getStaffRecordStatusLabel(item.paymentMethod) : "",
      Number(item.amount || 0) > 0 ? formatMoney(item.amount) : "",
      item.reason || ""
    ].filter(Boolean).join(" · ");
    return '<li><span><strong>' + escapeHTML(item.label || "Booking updated") +
      '</strong>' + (detail ? '<small>' + escapeHTML(detail) + '</small>' : "") +
      '</span><small>' + escapeHTML(formatOrderDate(item.timestamp)) + '</small></li>';
  }).join("") + '</ul>';
}

function buildStaffRoomBookingDetailMarkup(detail = {}) {
  const booking = detail.booking || {};
  const room = detail.room || {};
  const permissions = detail.permissions || {};
  const canManage = permissions.canManageBooking === true && isStaffManagerSession();
  const canViewFinancials = permissions.canViewFinancials === true;
  const hasFinancialFields = canViewFinancials && Object.prototype.hasOwnProperty.call(booking, "total_amount");
  const sourceLabel = booking.booking_source_label || booking.booking_source || "Legacy / Unknown";
  const roomNumber = room.room_number || booking.room_number || booking.room_id || "Unassigned";
  const roomType = room.title || room.room_type_id || "Not set";
  const taxSnapshot = booking.tax_snapshot && typeof booking.tax_snapshot === "object" ? booking.tax_snapshot : {};
  const overview = buildStaffRoomBookingDetailSection("Overview", [
    ["Booking reference", "#" + (booking.id || "")],
    ["Source", sourceLabel],
    ["Booking status", getStaffRecordStatusLabel(booking.booking_status || "pending")],
    ["Payment status", canViewFinancials ? getStaffRecordStatusLabel(booking.payment_status || "unpaid") : "Manager-only"],
    ["Created", formatOrderDate(booking.created_at)],
    ["Last updated", formatOrderDate(booking.updated_at)]
  ]);
  const guestFields = [
    ["Guest name", booking.guest_name],
    ["Phone", booking.guest_phone],
    ["Email", booking.guest_email],
    ["Company", booking.guest_company_name]
  ];
  if (canViewFinancials) guestFields.push(["GSTIN", booking.guest_gstin], ["Place of supply", booking.guest_place_of_supply]);
  if (permissions.canViewIdentityProof === true) guestFields.push(["Identity proof", booking.guest_id_proof]);
  const guest = buildStaffRoomBookingDetailSection("Guest", guestFields);
  const stay = buildStaffRoomBookingDetailSection("Stay & Room", [
    ["Check-in", booking.check_in_date],
    ["Check-out", booking.check_out_date],
    ["Nights", Number(booking.total_nights || 0)],
    ["Assigned room", "Room " + roomNumber],
    ["Room type", roomType],
    ["Floor", room.floor || "Not set"],
    ["Guests", String(Number(booking.adults || 0)) + " adults · " + String(Number(booking.children || 0)) + " children"]
  ]);
  const pricing = canViewFinancials
    ? buildStaffRoomBookingDetailSection("Pricing & GST", [
        ["Room subtotal", formatMoney(booking.room_price || 0)],
        ["Discount", formatMoney(booking.discount_amount || 0)],
        ["Tax", formatMoney(booking.tax_amount || 0)],
        ["Total", formatMoney(booking.total_amount || 0)],
        ["Advance paid", formatMoney(booking.advance_paid || 0)],
        ["Balance", formatMoney(booking.balance_amount || 0)],
        ["Pricing version", booking.pricing_version || "Not set"],
        ["GST rule", taxSnapshot.ruleName || taxSnapshot.rule_name || booking.tax_rule_id || "Not set"]
      ])
    : buildStaffRoomBookingDetailSection("Pricing & GST", [], '<p class="staff-hint">Financial and GST details are available to Managers only.</p>');
  const payments = buildStaffRoomBookingDetailSection("Payments", [],
    canViewFinancials ? buildStaffRoomBookingPaymentsMarkup(Array.isArray(detail.payments) ? detail.payments : [])
      : '<p class="staff-hint">Payment history is available to Managers only.</p>');
  const specialRequests = buildStaffRoomBookingDetailSection("Special Requests", [],
    booking.notes ? '<p class="staff-order-note">' + escapeHTML(booking.notes) + '</p>'
      : '<p class="staff-hint">No special requests or booking notes.</p>');
  const activity = buildStaffRoomBookingDetailSection("Activity History", [],
    buildStaffRoomBookingActivityMarkup(Array.isArray(detail.activity) ? detail.activity : []));
  let actions = "";
  if (canManage) {
    const cachedSummary = STAFF_STATE.roomCheckoutSummaries?.[String(booking.id || "")];
    const cachedBill = STAFF_STATE.roomCheckoutBills?.[String(booking.id || "")];
    const cachedMarkup = cachedSummary && cachedBill ? buildStaffRoomCheckoutSummaryMarkup(cachedSummary, cachedBill) : "";
    actions = '<section class="staff-room-booking-detail-section"><h5>Management Actions</h5>' +
      '<article class="staff-order-card staff-room-booking-detail-actions-card">' +
      buildStaffRoomBookingStatusControls(booking) +
      (hasFinancialFields ? buildStaffRoomBookingPaymentControls(booking) : "") +
      (hasFinancialFields ? buildStaffRoomBookingRefundControls(booking) : "") +
      (hasFinancialFields ? buildStaffRoomCheckoutSummaryControls(booking) : "") +
      '<div class="staff-room-checkout-summary" data-staff-room-checkout-summary="' +
      escapeHTML(booking.id || "") + '"' + (cachedMarkup ? "" : " hidden") + '>' +
      cachedMarkup + '</div></article></section>';
  }
  return overview + guest + stay + pricing + payments + specialRequests + activity + actions;
}

function finishStaffRoomBookingDetailClose() {
  STAFF_STATE.roomBookingDetailRequestId += 1;
  document.querySelectorAll(".staff-room-booking-summary-card.is-selected").forEach((card) => {
    card.classList.remove("is-selected");
    card.removeAttribute("aria-current");
  });
  STAFF_STATE.selectedRoomBookingId = "";
  const trigger = STAFF_STATE.selectedRoomBookingTrigger;
  STAFF_STATE.selectedRoomBookingTrigger = null;
  syncStaffRoomBookingUrl({ removeBooking: true });
  trigger?.focus?.();
}

function closeStaffRoomBookingDetail() {
  const dialog = $("#staffRoomBookingDetailDialog");
  if (dialog?.open && typeof dialog.close === "function") { dialog.close(); return; }
  dialog?.removeAttribute("open");
  finishStaffRoomBookingDetailClose();
}

async function openStaffRoomBookingDetail(bookingId = "", trigger = null) {
  const safeBookingId = String(bookingId || "").trim();
  const dialog = $("#staffRoomBookingDetailDialog");
  const title = $("#staffRoomBookingDetailTitle");
  const source = $("#staffRoomBookingDetailSource");
  const content = $("#staffRoomBookingDetailContent");
  if (!safeBookingId || !dialog || !content) return;
  const summary = STAFF_STATE.roomBookings.find((booking) => String(booking.id) === safeBookingId) || {};
  STAFF_STATE.selectedRoomBookingId = safeBookingId;
  STAFF_STATE.selectedRoomBookingTrigger = trigger instanceof HTMLElement ? trigger : null;
  syncStaffRoomBookingUrl({ bookingId: safeBookingId });
  if (title) title.textContent = "Booking #" + safeBookingId;
  if (source) source.textContent = summary.booking_source_label || getStaffRoomBookingSourceLabel();
  document.querySelectorAll(".staff-room-booking-summary-card.is-selected").forEach((card) => {
    const selected = String(card.dataset.bookingId || "") === safeBookingId;
    card.classList.toggle("is-selected", selected);
    if (selected) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  });
  const cachedCandidate = STAFF_STATE.roomBookingDetails?.[safeBookingId];
  const summaryVersion = String(summary.version || summary.updated_at || "");
  const cachedVersion = String(cachedCandidate?.version || cachedCandidate?.booking?.version || cachedCandidate?.booking?.updated_at || "");
  const cached = cachedCandidate && (!summaryVersion || summaryVersion === cachedVersion) ? cachedCandidate : null;
  if (cachedCandidate && !cached) delete STAFF_STATE.roomBookingDetails[safeBookingId];
  content.setAttribute("aria-busy", "true");
  content.innerHTML = cached ? buildStaffRoomBookingDetailMarkup(cached) :
    '<div class="staff-room-booking-detail-skeleton" aria-hidden="true"></div>' +
    '<div class="staff-room-booking-detail-skeleton" aria-hidden="true"></div>' +
    '<p class="staff-status">Loading authorized booking details…</p>';
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else dialog.setAttribute("open", "");
  title?.focus?.();
  const requestId = ++STAFF_STATE.roomBookingDetailRequestId;
  try {
    const detail = await staffFetchJson(STAFF_API_BASE + "/room-booking/bookings/" + encodeURIComponent(safeBookingId));
    if (requestId !== STAFF_STATE.roomBookingDetailRequestId ||
        STAFF_STATE.selectedRoomBookingId !== safeBookingId || !dialog.open) return;
    STAFF_STATE.roomBookingDetails = { ...STAFF_STATE.roomBookingDetails, [safeBookingId]: detail };
    content.innerHTML = buildStaffRoomBookingDetailMarkup(detail);
    const requestedSection = String(trigger?.dataset?.staffRoomBookingDetailSection || "").trim();
    if (requestedSection) {
      window.requestAnimationFrame(() => {
        const section = content.querySelector('[data-staff-room-booking-detail-section="' + CSS.escape(requestedSection) + '"]');
        section?.focus?.({ preventScroll: true });
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
        section?.scrollIntoView?.({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
  } catch (error) {
    if (requestId !== STAFF_STATE.roomBookingDetailRequestId) return;
    console.error("Staff room booking detail load failed:", error);
    content.innerHTML = '<div class="staff-status is-error">' +
      escapeHTML(error.message || "Booking details could not be loaded.") +
      '</div><button class="staff-btn secondary" type="button" data-staff-retry-room-booking-detail="' +
      escapeHTML(safeBookingId) + '">Retry</button>';
  } finally {
    if (requestId === STAFF_STATE.roomBookingDetailRequestId) content.setAttribute("aria-busy", "false");
  }
}

async function refreshStaffRoomBookingAfterAction(bookingId = "") {
  const safeBookingId = String(bookingId || "").trim();
  await loadStaffRoomBookings({ silent: true });
  const dialog = $("#staffRoomBookingDetailDialog");
  if (safeBookingId && dialog?.open && STAFF_STATE.selectedRoomBookingId === safeBookingId) {
    const latestTrigger = document.querySelector(
      '[data-staff-room-booking-detail="' + CSS.escape(safeBookingId) + '"]'
    );
    await openStaffRoomBookingDetail(
      safeBookingId,
      latestTrigger || STAFF_STATE.selectedRoomBookingTrigger
    );
  }
}
function buildStaffRoomBookingCard(booking = {}) {
  const status = normalizeStatus(booking.booking_status) || "pending";
  const sourceGroup = normalizeStatus(booking.booking_source_group || "legacy");
  const sourceLabel = booking.booking_source_label || booking.booking_source || "Legacy / Unknown";
  const isUnread = sourceGroup === "website" && getStaffNotificationCardUnread("website-room-bookings") > 0;
  const statusClass = getStaffRecordStatusBadgeClass(status, "room-booking");
  const paymentStatus = normalizeStatus(booking.payment_status || "");
  const hasFinancials = Object.prototype.hasOwnProperty.call(booking, "payment_status");
  const roomLabel = booking.room_number ? "Room " + booking.room_number :
    booking.room_id ? "Room ID " + booking.room_id : "Unassigned";
  const roomType = booking.room_type ? " · " + booking.room_type : "";
  const guests = String(Number(booking.adults || 0) + Number(booking.children || 0));
  const actionRequired = String(booking.action_required || "").trim();
  return '<article class="staff-room-booking-summary-card' + (isUnread ? " has-fresh-data" : "") +
    '" data-booking-source-group="' + escapeHTML(sourceGroup) + '" data-booking-id="' + escapeHTML(booking.id || "") + '">' +
    '<div class="staff-room-booking-summary-primary"><div class="staff-room-booking-summary-reference"><strong>' +
    escapeHTML(booking.booking_reference || ("#" + (booking.id || ""))) + '</strong><span class="staff-badge">' +
    escapeHTML(sourceLabel) + '</span></div><span class="staff-room-booking-summary-guest">' +
    escapeHTML(booking.guest_name || "Guest name not provided") + '</span><span class="staff-room-booking-summary-created">Created ' +
    escapeHTML(formatOrderDate(booking.created_at || booking.createdAt)) + '</span></div>' +
    '<div class="staff-room-booking-summary-facts">' +
    '<div class="staff-room-booking-summary-fact"><span>Stay</span><strong>' +
    escapeHTML((booking.check_in_date || "—") + " → " + (booking.check_out_date || "—")) + '</strong></div>' +
    '<div class="staff-room-booking-summary-fact"><span>Room</span><strong>' + escapeHTML(roomLabel + roomType) + '</strong></div>' +
    '<div class="staff-room-booking-summary-fact"><span>Guests / nights</span><strong>' +
    escapeHTML(guests + " guests · " + Number(booking.total_nights || 0) + " nights") + '</strong></div>' +
    '<div class="staff-room-booking-summary-fact"><span>Booking</span><strong><span class="staff-badge ' +
    escapeHTML(statusClass) + '">' + escapeHTML(getStaffRecordStatusLabel(status)) + '</span></strong></div>' +
    '<div class="staff-room-booking-summary-fact"><span>Payment</span><strong>' +
    (hasFinancials ? '<span class="staff-badge ' + (paymentStatus === "paid" ? "is-success" : "is-warning") + '">' +
      escapeHTML(getStaffRecordStatusLabel(paymentStatus || "unpaid")) + '</span>' : "Manager-only") + '</strong></div>' +
    '<div class="staff-room-booking-summary-fact"><span>Advance / balance</span><strong>' +
    (hasFinancials ? escapeHTML(formatMoney(booking.advance_paid || 0) + " / " + formatMoney(booking.balance_amount || 0)) : "Manager-only") + '</strong></div></div>' +
    '<div class="staff-room-booking-summary-actions">' +
    (actionRequired ? '<span class="staff-room-booking-action-required">' + escapeHTML(actionRequired) + '</span>' : '<span></span>') +
    '<div class="staff-room-booking-summary-action-row"><button class="staff-btn secondary" type="button" data-staff-room-booking-detail="' + escapeHTML(booking.id || "") +
    '" aria-label="Open booking ' + escapeHTML(booking.id || "") + ' details">View Details</button>' +
    '<details class="staff-room-booking-more"><summary aria-label="More options for booking ' + escapeHTML(booking.id || "") + '">â‹®</summary>' +
    '<div class="staff-room-booking-more-menu"><button type="button" data-staff-room-booking-detail="' + escapeHTML(booking.id || "") +
    '" data-staff-room-booking-detail-section="guest">Guest &amp; stay</button>' +
    (isStaffManagerSession() ? '<button type="button" data-staff-room-booking-detail="' + escapeHTML(booking.id || "") +
      '" data-staff-room-booking-detail-section="payments">Payments &amp; actions</button>' : "") +
    '</div></details></div></div></article>';
}
function buildStaffRoomCheckoutSummaryControls(booking = {}) {
  const bookingId = String(booking.id || "").trim();

  return `
    <div class="staff-order-actions staff-record-status-actions">
      <span class="staff-status-control-label">Checkout</span>
      <button
        class="staff-btn secondary"
        type="button"
        data-staff-room-checkout-summary-btn
        data-booking-id="${escapeHTML(bookingId)}"
        ${bookingId ? "" : "disabled"}>
        ${STAFF_STATE.roomCheckoutSummaries?.[bookingId] ? "Refresh Checkout Summary" : "Checkout Summary"}
      </button>
    </div>
  `;
}

function buildStaffRoomBookingStatusControls(booking = {}) {
  const bookingId = String(booking.id || "").trim();
  const status = normalizeStatus(booking.booking_status) || "pending";
  const isClosed = ["checked_out", "cancelled", "no_show"].includes(status);
  const selectDisabled = !bookingId || isClosed ? "disabled" : "";
  const allowedOptions = STAFF_ROOM_BOOKING_STATUS_TRANSITIONS[status] || [status];

  return `
    <div class="staff-order-actions staff-record-status-actions">
      <span class="staff-status-control-label">Room status</span>
      <select
        class="staff-select staff-status-select"
        data-staff-room-booking-status-select
        data-booking-id="${escapeHTML(bookingId)}"
        data-current-status="${escapeHTML(status)}"
        ${selectDisabled}>
        ${allowedOptions.map((option) => `
          <option value="${escapeHTML(option)}" ${option === status ? "selected" : ""}>
            ${escapeHTML(getStaffRecordStatusLabel(option))}
          </option>
        `).join("")}
      </select>
      <button
        class="staff-btn secondary"
        type="button"
        data-staff-update-room-booking-status
        data-booking-id="${escapeHTML(bookingId)}"
        disabled>
        Update Room Status
      </button>
      ${isClosed ? '<span class="staff-hint">Closed bookings cannot be moved from this status.</span>' : ""}
    </div>
  `;
}

function buildStaffRoomCheckoutInvoiceDocument(bill = {}) {
  return window.RoomCheckoutReceipt.buildPrintDocument(bill);
}

function openStaffRoomCheckoutInvoice(bill = {}) {
  if (!window.RoomCheckoutReceipt.openPrintWindow(bill)) {
    window.alert("Popup blocked. Please allow popups to print or save the checkout bill as PDF.");
  }
}

function getStaffRoomCombinedCheckoutSafeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100) / 100
    : 0;
}

function buildStaffRoomCombinedCheckoutIdempotencyKey(scope = "staff", bookingId = "") {
  const safeScope = String(scope || "staff").replace(/[^A-Za-z0-9._:-]/g, "-");
  const safeBookingId = String(bookingId || "booking").replace(/[^A-Za-z0-9._:-]/g, "-");
  return `${safeScope}:room-combined-checkout:${safeBookingId}:${Date.now()}`;
}

function buildStaffRoomCombinedCheckoutRequest(summary = {}, options = {}) {
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
    endpoint: `${STAFF_API_BASE}/room-booking/bookings/${encodeURIComponent(bookingId)}/combined-checkout`,
    payload: {
      amount: getStaffRoomCombinedCheckoutSafeAmount(totals.finalPayableAmount),
      paymentMethod,
      transactionId: String(options.transactionId || "").trim(),
      notes: String(options.notes || "").trim(),
      currency: String(options.currency || "INR").trim().toUpperCase(),
      idempotencyKey: String(
        options.idempotencyKey || buildStaffRoomCombinedCheckoutIdempotencyKey("staff", bookingId)
      )
    }
  };
}

async function postStaffRoomCombinedCheckout(summary = {}, options = {}) {
  if (!isStaffRoomCombinedCheckoutFrontendEnabled()) {
    throw new Error(getStaffRoomCombinedCheckoutHintText());
  }

  const request = buildStaffRoomCombinedCheckoutRequest(summary, options);
  return staffFetchJson(request.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request.payload)
  });
}

async function handleStaffRoomCombinedCheckoutButton(button) {
  const bookingId = String(button?.dataset?.bookingId || "").trim();

  if (!isStaffRoomCombinedCheckoutFrontendEnabled()) {
    window.alert(getStaffRoomCombinedCheckoutHintText());
    return;
  }

  const summary = STAFF_STATE.roomCheckoutSummaries?.[bookingId];

  if (!summary) {
    window.alert("Load the checkout summary before finalizing combined checkout.");
    return;
  }

  let request;
  try {
    request = buildStaffRoomCombinedCheckoutRequest(summary, { bookingId });
  } catch (error) {
    window.alert(error.message || "Unable to prepare combined checkout request.");
    return;
  }

  const confirmed = window.confirm(
    `Finalize combined checkout for booking ${bookingId}? This will submit ${formatMoney(request.payload.amount)} to the backend settlement endpoint.`
  );

  if (!confirmed) {
    return;
  }

  const originalText = button.textContent;

  try {
    setStaffActionBusyState(button, true);
    button.textContent = "Finalizing...";
    const result = await postStaffRoomCombinedCheckout(summary, {
      bookingId,
      idempotencyKey: request.payload.idempotencyKey
    });
    window.alert(result.message || "Combined checkout completed.");
    if (result.checkoutBill) {
      STAFF_STATE.roomCheckoutBills = {
        ...STAFF_STATE.roomCheckoutBills,
        [bookingId]: result.checkoutBill
      };
    }
    await loadStaffRooms();
    const refreshedSummaryButton = Array.from(
      document.querySelectorAll("[data-staff-room-checkout-summary-btn]")
    ).find((candidate) => String(candidate.dataset.bookingId || "") === bookingId);
    if (refreshedSummaryButton) {
      await handleStaffRoomCheckoutSummary(refreshedSummaryButton);
    }
  } catch (error) {
    console.error("Staff combined checkout failed:", error);
    window.alert(error.message || "Failed to finalize combined checkout.");
    button.textContent = originalText;
    button.disabled = false;
  } finally {
    setStaffActionBusyState(button, false);
  }
}

function buildStaffRoomCheckoutSummaryMarkup(summary = {}, bill = {}) {
  const bookingId = String(bill.bookingReference || summary.booking?.id || "")
    .split("-")
    .pop();
  const finalizeButton = bill.provisional
    ? `<button class="staff-btn secondary" type="button" data-staff-finalize-room-combined-checkout data-booking-id="${escapeHTML(summary.booking?.id || bookingId)}" ${getStaffRoomCombinedCheckoutDisabledAttribute()}>Finalize Combined Checkout</button>`
    : "";
  return window.RoomCheckoutReceipt.buildCheckoutPanel({
    bill,
    finalizeButton,
    bookingId: summary.booking?.id || bookingId
  });
}

async function handleStaffRoomCheckoutSummary(button) {
  const bookingId = String(button?.dataset?.bookingId || "").trim();
  const card = button?.closest(".staff-order-card");
  const target = card?.querySelector(`[data-staff-room-checkout-summary="${CSS.escape(bookingId)}"]`);

  if (!bookingId || !target) return;

  setStaffActionBusyState(button, true);
  target.hidden = false;
  target.innerHTML = '<div class="staff-status room-receipt-loading">Loading secure checkout bill…</div>';

  try {
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/room-checkout-bill/bookings/${encodeURIComponent(bookingId)}`
    );
    const summary = result.summary || STAFF_STATE.roomCheckoutSummaries?.[bookingId] || {};
    const bill = result.bill || {};
    STAFF_STATE.roomCheckoutSummaries = {
      ...STAFF_STATE.roomCheckoutSummaries,
      [bookingId]: summary
    };
    STAFF_STATE.roomCheckoutBills = {
      ...STAFF_STATE.roomCheckoutBills,
      [bookingId]: bill
    };
    const currentTarget = Array.from(
      document.querySelectorAll("[data-staff-room-checkout-summary]")
    ).find((candidate) => String(candidate.dataset.staffRoomCheckoutSummary || "") === bookingId);
    if (currentTarget) {
      currentTarget.hidden = false;
      currentTarget.innerHTML = buildStaffRoomCheckoutSummaryMarkup(summary, bill);
    }
  } catch (error) {
    console.error("Staff room checkout bill fetch failed:", error);
    const currentTarget = Array.from(
      document.querySelectorAll("[data-staff-room-checkout-summary]")
    ).find((candidate) => String(candidate.dataset.staffRoomCheckoutSummary || "") === bookingId);
    if (currentTarget) {
      currentTarget.hidden = false;
      currentTarget.innerHTML = `<div class="staff-status is-error">${escapeHTML(error.message || "Failed to load checkout bill.")}</div>`;
    }
  } finally {
    setStaffActionBusyState(button, false);
  }
}

function buildStaffRoomBookingPaymentControls(booking = {}) {
  const bookingId = String(booking.id || "").trim();
  const status = normalizeStatus(booking.booking_status) || "pending";
  const paymentStatus = normalizeStatus(booking.payment_status || "unpaid");
  const balanceAmount = Math.max(0, Number(booking.balance_amount || 0));
  const isPaymentClosed = status === "cancelled" || paymentStatus === "paid" || balanceAmount <= 0;
  const disabled = !bookingId || isPaymentClosed ? "disabled" : "";

  return `
    <div class="staff-order-actions staff-record-status-actions">
      <span class="staff-status-control-label">Room payment</span>
      <input
        class="staff-input"
        type="number"
        min="0.01"
        step="0.01"
        value="${escapeHTML(balanceAmount ? balanceAmount.toFixed(2) : "")}"
        placeholder="Amount"
        data-staff-room-payment-amount
        data-booking-id="${escapeHTML(bookingId)}"
        ${disabled}
      />
      <select
        class="staff-select"
        data-staff-room-payment-method
        data-booking-id="${escapeHTML(bookingId)}"
        ${disabled}>
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="bank_transfer">Bank transfer</option>
        <option value="other">Other</option>
      </select>
      <input
        class="staff-input"
        maxlength="200"
        placeholder="Transaction ID optional"
        data-staff-room-payment-transaction
        data-booking-id="${escapeHTML(bookingId)}"
        ${disabled}
      />
      <input
        class="staff-input"
        maxlength="1000"
        placeholder="Payment note optional"
        data-staff-room-payment-notes
        data-booking-id="${escapeHTML(bookingId)}"
        ${disabled}
      />
      <button
        class="staff-btn secondary"
        type="button"
        data-staff-record-room-payment
        data-booking-id="${escapeHTML(bookingId)}"
        data-balance-amount="${escapeHTML(String(balanceAmount))}"
        ${disabled}>
        Record Room Payment
      </button>
      ${isPaymentClosed ? `<span class="staff-hint">${escapeHTML(status === "cancelled" ? "Cancelled bookings cannot collect payment." : "Room payment is already complete.")}</span>` : ""}
    </div>
  `;
}

function buildStaffRoomBookingRefundControls(booking = {}) {
  const bookingId = String(booking.id || "").trim();
  const refundableAmount = Math.max(0, Number(booking.advance_paid || 0));
  const disabled = !bookingId || refundableAmount <= 0 ? "disabled" : "";
  return `
    <div class="staff-order-actions staff-record-status-actions">
      <span class="staff-status-control-label">Manager refund</span>
      <input class="staff-input" type="number" min="0.01" step="0.01"
        max="${escapeHTML(refundableAmount.toFixed(2))}"
        placeholder="Refund amount" data-staff-room-refund-amount
        data-booking-id="${escapeHTML(bookingId)}" ${disabled} />
      <select class="staff-select" data-staff-room-refund-method
        data-booking-id="${escapeHTML(bookingId)}" ${disabled}>
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="bank_transfer">Bank transfer</option>
        <option value="other">Other</option>
      </select>
      <input class="staff-input" maxlength="200" placeholder="Transaction ID optional"
        data-staff-room-refund-transaction data-booking-id="${escapeHTML(bookingId)}" ${disabled} />
      <input class="staff-input" maxlength="2000" placeholder="Refund reason (required)"
        data-staff-room-refund-reason data-booking-id="${escapeHTML(bookingId)}" ${disabled} />
      <button class="staff-btn secondary" type="button"
        data-staff-record-room-refund
        data-booking-id="${escapeHTML(bookingId)}"
        data-refundable-amount="${escapeHTML(String(refundableAmount))}"
        ${disabled}>Record Refund</button>
      <span class="staff-hint">Maximum refundable Room amount: ${escapeHTML(formatMoney(refundableAmount))}</span>
    </div>
  `;
}

function buildStaffInquiryCard(inquiry = {}) {
  const status = inquiry.status || "new";
  const statusBadgeClass = getStaffRecordStatusBadgeClass(status, "inquiry");

  return `
    <article class="staff-order-card">
      <div class="staff-order-topline">
        <h3 class="staff-order-title">Inquiry #${escapeHTML(inquiry.id || "")}</h3>
        <span class="staff-order-time">${escapeHTML(formatOrderDate(inquiry.createdAt))}</span>
      </div>

      <div class="staff-order-badges">
        <span class="staff-badge is-important">Event: ${escapeHTML(inquiry.eventType || "Not provided")}</span>
        <span class="staff-badge">Date: ${escapeHTML(inquiry.date || "Not provided")}</span>
        <span class="staff-badge">Guests: ${escapeHTML(inquiry.guests || "Not provided")}</span>
        <span class="staff-badge ${statusBadgeClass}">Status: ${escapeHTML(status)}</span>
      </div>

      <div class="staff-order-meta">
        <span>Name: ${escapeHTML(inquiry.name || "Not provided")}</span>
        <span>Phone: ${escapeHTML(inquiry.phone || "Not provided")}</span>
        <span>Hotel: ${escapeHTML(inquiry.hotelName || inquiry.hotelSlug || "This hotel")}</span>
      </div>

      <p class="staff-order-note"><strong>Requirements:</strong> ${escapeHTML(inquiry.specialRequirements || "No requirements")}</p>
      ${buildStaffRecordStatusControls("inquiry", inquiry, STAFF_INQUIRY_STATUS_OPTIONS)}
    </article>
  `;
}

function buildStaffContactCard(contactSubmission = {}) {
  const status = contactSubmission.status || "new";
  const statusBadgeClass = getStaffRecordStatusBadgeClass(status, "contact");

  return `
    <article class="staff-order-card">
      <div class="staff-order-topline">
        <h3 class="staff-order-title">Contact #${escapeHTML(contactSubmission.id || "")}</h3>
        <span class="staff-order-time">${escapeHTML(formatOrderDate(contactSubmission.createdAt))}</span>
      </div>

      <div class="staff-order-badges">
        <span class="staff-badge is-important">Website contact</span>
        <span class="staff-badge">Sheet: ${escapeHTML(contactSubmission.googleSheetStatus || "not tracked")}</span>
        <span class="staff-badge ${statusBadgeClass}">Status: ${escapeHTML(status)}</span>
      </div>

      <div class="staff-order-meta">
        <span>Name: ${escapeHTML(contactSubmission.name || "Not provided")}</span>
        <span>Email: ${escapeHTML(contactSubmission.email || "Not provided")}</span>
        <span>Hotel: ${escapeHTML(contactSubmission.hotelName || contactSubmission.hotelSlug || "This hotel")}</span>
      </div>

      <p class="staff-order-note"><strong>Subject:</strong> ${escapeHTML(contactSubmission.subject || "No subject")}</p>
      <p class="staff-order-note"><strong>Message:</strong> ${escapeHTML(contactSubmission.message || "No message")}</p>
      ${buildStaffRecordStatusControls("contact", contactSubmission, STAFF_CONTACT_STATUS_OPTIONS)}
    </article>
  `;
}

function getStaffSupportRequestOrderContext(supportRequest = {}) {
  const orderId = String(supportRequest.orderId || "").trim();
  if (!orderId) return null;

  const order = findStaffOrder(orderId);
  if (!order) return null;

  const paymentStatus = normalizeStatus(order.paymentStatus);
  const billingStatus = normalizeStatus(order.billingStatus);
  const billNumber = String(order.billNumber || "").trim();
  const customerBillReady =
    Boolean(billNumber) ||
    ["billed", "closed"].includes(billingStatus) ||
    paymentStatus === "paid";

  return {
    order,
    paymentStatus,
    billingStatus,
    billNumber,
    customerBillReady
  };
}

function buildStaffSupportRequestCard(supportRequest = {}) {
  const status = supportRequest.status || "new";
  const statusBadgeClass = getStaffRecordStatusBadgeClass(status, "support");
  const requestType = normalizeStatus(supportRequest.requestType);
  const requestLabel = requestType === "bill" ? "Bill request" : "Staff help";
  const isNewSupportRequest = normalizeStatus(status) === "new";
  const orderContext = getStaffSupportRequestOrderContext(supportRequest);
  const paymentBadgeClass = orderContext?.paymentStatus === "paid" ? "is-success" : "is-warning";
  const billingBadgeClass =
    orderContext && ["billed", "closed"].includes(orderContext.billingStatus)
      ? "is-success"
      : "is-warning";
  const trackingNote = requestType !== "bill" || !orderContext
    ? ""
    : orderContext.customerBillReady
      ? `Customer bill is now visible on tracking${orderContext.billNumber ? ` as ${orderContext.billNumber}` : ""}.`
      : "Customer bill is not visible on tracking yet. Mark billed or paid when the bill is ready.";

  return `
    <article class="staff-order-card ${isNewSupportRequest ? "is-new-support" : ""}">
      <div class="staff-order-topline">
        <h3 class="staff-order-title">Support #${escapeHTML(supportRequest.id || "")}</h3>
        <span class="staff-order-time">${escapeHTML(formatOrderDate(supportRequest.createdAt))}</span>
      </div>

      <div class="staff-order-badges">
        ${isNewSupportRequest ? '<span class="staff-badge is-alert">Needs attention</span>' : ""}
        <span class="staff-badge is-important">${escapeHTML(requestLabel)}</span>
        <span class="staff-badge">Order #${escapeHTML(supportRequest.orderId || "Not linked")}</span>
        <span class="staff-badge">Table: ${escapeHTML(supportRequest.tableNumber || "Not provided")}</span>
        ${orderContext ? `<span class="staff-badge ${paymentBadgeClass}">Payment: ${escapeHTML(getStaffRecordStatusLabel(orderContext.paymentStatus || "pending"))}</span>` : ""}
        ${orderContext ? `<span class="staff-badge ${billingBadgeClass}">Billing: ${escapeHTML(getStaffRecordStatusLabel(orderContext.billingStatus || "not_billed"))}</span>` : ""}
        ${orderContext?.billNumber ? `<span class="staff-badge is-success">Bill: ${escapeHTML(orderContext.billNumber)}</span>` : ""}
        <span class="staff-badge ${statusBadgeClass}">Status: ${escapeHTML(status)}</span>
      </div>

      <div class="staff-order-meta">
        <span>Hotel: ${escapeHTML(supportRequest.hotelName || supportRequest.hotelSlug || "This hotel")}</span>
        <span>Order status: ${escapeHTML(supportRequest.orderStatus ? getStaffRecordStatusLabel(supportRequest.orderStatus, "order") : "Not tracked")}</span>
        <span>Source: ${escapeHTML(supportRequest.source || "order_tracking")}</span>
      </div>

      <p class="staff-order-note"><strong>Message:</strong> ${escapeHTML(supportRequest.message || "No message")}</p>
      ${trackingNote ? `<p class="staff-order-note"><strong>Tracking:</strong> ${escapeHTML(trackingNote)}</p>` : ""}
      ${buildStaffRecordStatusControls("support", supportRequest, STAFF_SUPPORT_STATUS_OPTIONS)}
    </article>
  `;
}

function buildStaffTestimonialCard(testimonial = {}) {
  const testimonialId = testimonial.id || "";
  const safeTestimonialId = escapeHTML(testimonialId);
  const isApproved = testimonial.isApproved === true;
  const isHidden = testimonial.isArchived === true || testimonial.isActive === false;
  const moderationStatus = testimonial.moderationStatus || (isApproved ? "approved" : isHidden ? "rejected" : "pending");
  const approvalBadgeClass = moderationStatus === "approved"
    ? "is-success"
    : moderationStatus === "rejected"
      ? "is-danger"
      : "is-warning";
  const moderationLabel = moderationStatus === "approved"
    ? "Approved"
    : moderationStatus === "rejected"
      ? "Rejected"
      : "Pending approval";
  const visibilityLabel = isHidden ? "Hidden by active/archive state" : "Eligible for public display";
  const stars = Number.isFinite(Number(testimonial.stars)) ? Number(testimonial.stars) : 5;
  const avatar = window.ReviewAvatar?.resolveReviewAvatar(testimonial.avatar || "").src || "./img/default-review-avatar.v1.svg";

  return `
    <article class="staff-order-card">
      <div class="staff-review-card__identity">
        <img class="staff-review-card__avatar" data-review-avatar src="${escapeHTML(avatar)}" alt="" width="56" height="56" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <div class="staff-review-card__identity-copy">
          <div class="staff-order-topline">
            <h3 class="staff-order-title">Testimonial #${safeTestimonialId}</h3>
            <span class="staff-order-time">${escapeHTML(formatOrderDate(testimonial.createdAt))}</span>
          </div>
          <strong>${escapeHTML(testimonial.name || "Guest")}</strong>
          <span>${escapeHTML(testimonial.role || "Guest")}</span>
        </div>
      </div>

      <div class="staff-order-badges">
        <span class="staff-badge is-important">${escapeHTML(stars)} star${stars === 1 ? "" : "s"}</span>
        <span class="staff-badge ${approvalBadgeClass}">${moderationLabel}</span>
        <span class="staff-badge ${isHidden ? "is-danger" : "is-success"}">${escapeHTML(visibilityLabel)}</span>
      </div>

      <div class="staff-order-meta">
        <span>Name: ${escapeHTML(testimonial.name || "Guest")}</span>
        <span>Role: ${escapeHTML(testimonial.role || "Guest")}</span>
        <span>Hotel: ${escapeHTML(testimonial.hotelSlug || "This hotel")}</span>
      </div>

      <p class="staff-order-note"><strong>Review:</strong> ${escapeHTML(testimonial.text || "No review text")}</p>
      <div class="staff-order-actions">
        <button
          class="staff-btn secondary"
          type="button"
          data-staff-toggle-testimonial-approval
          data-testimonial-id="${safeTestimonialId}"
          data-approved="${escapeHTML(String(isApproved))}"
          data-testimonial-action="${isApproved ? "unapprove" : "approve"}"
          ${testimonialId ? "" : "disabled"}>
          ${isApproved ? "Unapprove" : "Approve"}
        </button>
        ${moderationStatus === "pending" ? `
          <button
            class="staff-btn secondary"
            type="button"
            data-staff-toggle-testimonial-approval
            data-testimonial-id="${safeTestimonialId}"
            data-approved="false"
            data-testimonial-action="reject"
            ${testimonialId ? "" : "disabled"}>
            Reject
          </button>
        ` : ""}
      </div>
    </article>
  `;
}

function renderStaffRecordList(selector, records = [], buildCard, emptyMessage = "No records found.") {
  const content = $(selector);
  if (!content) return;

  if (!records.length) {
    content.className = "staff-empty staff-section-stage";
    content.textContent = emptyMessage;
    return;
  }

  content.className = "staff-orders-list staff-section-stage";
  content.removeAttribute("tabindex");
  content.innerHTML = records.map(buildCard).join("");
  window.ReviewAvatar?.bindReviewAvatars(content);
}

function renderStaffRoomsList(rooms = [], bookings = [], emptyMessage = "No rooms found.") {
  const content = $("#staffRoomsContent");
  if (!content) return;
  if (!bookings.length) {
    content.className = "staff-empty staff-section-stage";
    content.textContent = emptyMessage;
    return;
  }
  content.className = "staff-room-booking-list staff-section-stage";
  content.innerHTML = bookings.map(buildStaffRoomBookingCard).join("");
}
function setStaffRoomBookingStatus(message = "", isError = false) {
  const status = $("#staffRoomBookingStatus");
  if (!status) return;

  status.hidden = !message;
  status.textContent = message;
  status.classList.toggle("is-error", !!isError);
}

function renderStaffRoomBookingRoomOptions() {
  const select = $("#staffRoomBookingRoomInput");
  if (!select) return;

  const previousValue = select.value || "";
  const rooms = getStaffManualBookingRoomOptions();

  if (!rooms.length) {
    select.innerHTML = '<option value="">No available rooms loaded</option>';
    select.value = "";
    return;
  }

  select.innerHTML = [
    '<option value="">Select room</option>',
    ...rooms.map((room) => {
      const roomNumber = room.room_number || room.id || "";
      const title = room.title ? ` - ${room.title}` : "";
      const floor = room.floor ? ` (${room.floor})` : "";
      return `<option value="${escapeHTML(room.id)}">Room ${escapeHTML(roomNumber)}${escapeHTML(title)}${escapeHTML(floor)}</option>`;
    })
  ].join("");

  if (rooms.some((room) => String(room.id) === String(previousValue))) {
    select.value = previousValue;
  }
}

function renderStaffRoomBookingRoomOptionsFromRooms(rooms = [], message = "") {
  const select = $("#staffRoomBookingRoomInput");
  if (!select) return;
  const previousValue = select.value || "";

  if (!rooms.length) {
    select.innerHTML = '<option value="">No rooms available for selected dates</option>';
    select.value = "";
    if (message) {
      setStaffRoomBookingStatus(message, false);
    }
    return;
  }

  select.innerHTML = [
    '<option value="">Select available room</option>',
    ...rooms.map((room) => {
      const roomNumber = room.room_number || room.id || "";
      const title = room.title ? ` - ${room.title}` : "";
      const floor = room.floor ? ` (${room.floor})` : "";
      return `<option value="${escapeHTML(room.id)}">Room ${escapeHTML(roomNumber)}${escapeHTML(title)}${escapeHTML(floor)}</option>`;
    })
  ].join("");

  if (rooms.some((room) => String(room.id) === String(previousValue))) {
    select.value = previousValue;
  }

  if (message) {
    setStaffRoomBookingStatus(message, false);
  }
}

function setStaffRoomServiceStatus(message = "", isError = false) {
  const status = $("#staffRoomServiceStatus");
  if (!status) return;

  status.hidden = !message;
  status.textContent = message;
  status.classList.toggle("is-error", !!isError);
}

function getStaffCheckedInRoomBookings() {
  const candidates = [
    ...STAFF_STATE.roomBookings,
    ...STAFF_STATE.roomOperationsRooms.map((room) => room.blockingBooking).filter(Boolean)
  ];
  return Array.from(
    new Map(
      candidates
        .filter((booking) => normalizeStatus(booking.booking_status) === "checked_in")
        .map((booking) => [String(booking.id), booking])
    ).values()
  );
}

function renderStaffRoomServiceBookingOptions() {
  const select = $("#staffRoomServiceBookingInput");
  if (!select) return;

  const previousValue = select.value || "";
  const bookings = getStaffCheckedInRoomBookings();

  if (!bookings.length) {
    select.innerHTML = '<option value="">No checked-in bookings loaded</option>';
    select.value = "";
    return;
  }

  select.innerHTML = [
    '<option value="">Select checked-in booking</option>',
    ...bookings.map((booking) => {
      const roomNumber = booking.rooms?.room_number || booking.room_number || booking.room_id || "";
      const guestName = booking.guest_name || "Guest";
      return `<option value="${escapeHTML(booking.id)}">Room ${escapeHTML(roomNumber || "?")} - ${escapeHTML(guestName)}</option>`;
    })
  ].join("");

  if (bookings.some((booking) => String(booking.id) === String(previousValue))) {
    select.value = previousValue;
  }
}

function renderStaffRoomServiceMenuOptions() {
  const select = $("#staffRoomServiceMenuInput");
  if (!select) return;

  const previousValue = select.value || "";
  const items = STAFF_STATE.tableOrderMenu;

  if (!items.length) {
    select.innerHTML = '<option value="">Refresh menu to load items</option>';
    select.value = "";
    return;
  }

  select.innerHTML = [
    '<option value="">Select menu item</option>',
    ...items.map((item) => {
      const category = item.category ? ` - ${getStaffTableOrderCategoryLabel(item.category)}` : "";
      return `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}${escapeHTML(category)} (${escapeHTML(formatMoney(item.price))})</option>`;
    })
  ].join("");

  if (items.some((item) => String(item.id) === String(previousValue))) {
    select.value = previousValue;
  }
}

function getStaffRoomServiceCartQty(itemId = "") {
  return Number(STAFF_STATE.roomServiceCart[String(itemId || "").trim()] || 0) || 0;
}

function setStaffRoomServiceCartQty(itemId = "", qty = 0) {
  const normalizedItemId = String(itemId || "").trim();
  const nextQty = Math.max(0, Math.min(100, Number(qty) || 0));

  if (!normalizedItemId) return;

  if (nextQty > 0) {
    STAFF_STATE.roomServiceCart = {
      ...STAFF_STATE.roomServiceCart,
      [normalizedItemId]: nextQty
    };
  } else {
    const nextCart = { ...STAFF_STATE.roomServiceCart };
    delete nextCart[normalizedItemId];
    STAFF_STATE.roomServiceCart = nextCart;
  }

  renderStaffRoomServiceCart();
}

function getStaffRoomServiceCartEntries() {
  return Object.entries(STAFF_STATE.roomServiceCart)
    .map(([itemId, qty]) => {
      const item = getStaffTableOrderMenuItem(itemId);
      const quantity = Number(qty || 0) || 0;

      if (!item || quantity <= 0) {
        return null;
      }

      return {
        ...item,
        qty: quantity,
        lineTotal: item.price * quantity
      };
    })
    .filter(Boolean);
}

function renderStaffRoomServiceCart() {
  const cart = $("#staffRoomServiceCart");
  if (!cart) return;

  const entries = getStaffRoomServiceCartEntries();

  if (!entries.length) {
    cart.className = "staff-status";
    cart.textContent = "No room service items added yet.";
    return;
  }

  const total = entries.reduce((sum, item) => sum + item.lineTotal, 0);
  cart.className = "staff-status";
  cart.innerHTML = `
    <strong class="staff-table-order-cart-title">Room service items</strong>
    <ul class="staff-table-order-cart-list">
      ${entries.map((item) => `
        <li class="staff-table-order-cart-row">
          <div>
            <strong>${escapeHTML(item.name)}</strong>
            ${buildStaffTableOrderCartMetaMarkup(item)}
          </div>
          <span>${escapeHTML(item.qty)} x ${escapeHTML(formatMoney(item.price))}</span>
          <button class="staff-btn secondary" type="button" data-staff-room-service-remove="${escapeHTML(item.id)}">Remove</button>
        </li>
      `).join("")}
    </ul>
    <div class="staff-table-order-cart-total">
      <span>Total</span>
      <strong>${escapeHTML(formatMoney(total))}</strong>
    </div>
  `;
}

function addSelectedStaffRoomServiceItem() {
  const itemId = String($("#staffRoomServiceMenuInput")?.value || "").trim();
  const qty = Number.parseInt(String($("#staffRoomServiceQtyInput")?.value || "1"), 10);

  if (!itemId) {
    setStaffRoomServiceStatus("Select a menu item before adding.", true);
    return;
  }

  if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
    setStaffRoomServiceStatus("Quantity must be between 1 and 100.", true);
    return;
  }

  setStaffRoomServiceCartQty(itemId, getStaffRoomServiceCartQty(itemId) + qty);
  setStaffRoomServiceStatus("Item added to room service order.", false);
  const qtyInput = $("#staffRoomServiceQtyInput");
  if (qtyInput) qtyInput.value = "1";
}

function clearStaffRoomServiceForm({ keepStatus = false } = {}) {
  const form = $("#staffRoomServiceOrderForm");
  form?.reset();
  STAFF_STATE.roomServiceCart = {};
  renderStaffRoomServiceBookingOptions();
  renderStaffRoomServiceMenuOptions();
  renderStaffRoomServiceCart();

  if (!keepStatus) {
    setStaffRoomServiceStatus("", false);
  }
}

function syncStaffRoomNegotiatedRateFields({ clearDisabled = true } = {}) {
  const enabledInput = $("#staffRoomNegotiatedRateEnabledInput");
  const fields = $("#staffRoomNegotiatedRateFields");
  const rateInput = $("#staffRoomNegotiatedNightlyRateInput");
  const reasonInput = $("#staffRoomNegotiatedRateReasonInput");
  const enabled =
    isStaffManagerSession() &&
    enabledInput?.checked === true;

  if (enabledInput && !isStaffManagerSession()) enabledInput.checked = false;
  if (fields) fields.hidden = !enabled;
  [rateInput, reasonInput].forEach((input) => {
    if (!input) return;
    input.disabled = !enabled;
    input.required = enabled;
    if (!enabled && clearDisabled) input.value = "";
  });
}

let STAFF_ROOM_ADVANCE_POLICY = {
  advanceMode: "optional",
  minimumType: "fixed",
  minimumValue: 0,
  allowZeroAdvance: true,
  allowMultiplePayments: true,
  allowSplitPayments: true,
  allowStaffAdvance: false,
  allowedPaymentMethods: ["cash", "upi", "card", "bank_transfer"],
  currency: "INR",
  version: 1,
  schemaReady: false
};

function syncStaffRoomAdvanceFields() {
  const option = $("#staffRoomAdvanceOptionInput")?.value || "no_advance";
  const amountField = $("#staffRoomAdvanceAmountField");
  const methodField = $("#staffRoomAdvanceMethodField");
  const amountInput = $("#staffRoomAdvanceAmountInput");
  const methodInput = $("#staffRoomAdvanceMethodInput");
  const splitFields = [...document.querySelectorAll(".staff-room-advance-split")];
  const summary = $("#staffRoomAdvanceSummary");
  const advanceDisabled = STAFF_ROOM_ADVANCE_POLICY.advanceMode === "disabled";
  const canUseAdvance = isStaffManagerSession() || STAFF_ROOM_ADVANCE_POLICY.allowStaffAdvance;
  if (advanceDisabled || !canUseAdvance) {
    const optionInput = $("#staffRoomAdvanceOptionInput");
    if (optionInput) {
      optionInput.value = "no_advance";
      optionInput.disabled = true;
    }
  } else if ($("#staffRoomAdvanceOptionInput")) {
    $("#staffRoomAdvanceOptionInput").disabled = false;
  }
  const effectiveOption = $("#staffRoomAdvanceOptionInput")?.value || "no_advance";
  const needsAmount = ["partial", "split"].includes(effectiveOption);
  const needsMethod = effectiveOption !== "no_advance";
  if (amountField) amountField.hidden = !needsAmount;
  if (methodField) methodField.hidden = !needsMethod;
  splitFields.forEach((field) => {
    field.hidden = effectiveOption !== "split" || !STAFF_ROOM_ADVANCE_POLICY.allowSplitPayments;
  });
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
    summary.textContent = advanceDisabled
      ? "Advance payment is disabled for this hotel."
      : !canUseAdvance
        ? "Manager policy does not permit Staff to record an advance."
        : effectiveOption === "no_advance"
          ? "No payment will be collected during booking creation."
          : effectiveOption === "full"
            ? "The backend will collect the exact verified booking total."
            : effectiveOption === "split"
              ? "The backend verifies both payment lines and their combined amount."
              : "The backend verifies this amount against the booking total and policy.";
  }
}

function getStaffRoomAdvancePayload() {
  const option = $("#staffRoomAdvanceOptionInput")?.value || "no_advance";
  if (option === "no_advance") return { advanceOption: option };
  const paymentMethod = $("#staffRoomAdvanceMethodInput")?.value || "";
  if (!paymentMethod) throw new Error("Select an advance payment method.");
  if (option === "full") return { advanceOption: option, paymentMethod };
  const amount = Number($("#staffRoomAdvanceAmountInput")?.value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an advance amount greater than zero.");
  }
  if (option === "partial") {
    return { advanceOption: option, advanceAmount: amount, paymentMethod };
  }
  if (!STAFF_ROOM_ADVANCE_POLICY.allowSplitPayments) {
    throw new Error("Split advance payments are disabled for this hotel.");
  }
  const secondAmount = Number($("#staffRoomAdvanceSecondAmountInput")?.value || 0);
  const secondMethod = $("#staffRoomAdvanceSecondMethodInput")?.value || "";
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

function applyStaffRoomAdvanceMethodPolicy() {
  const allowed = new Set(STAFF_ROOM_ADVANCE_POLICY.allowedPaymentMethods || []);
  ["staffRoomAdvanceMethodInput", "staffRoomAdvanceSecondMethodInput"].forEach((id) => {
    const select = $(`#${id}`);
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

function fillStaffRoomAdvancePolicy(policy = {}) {
  STAFF_ROOM_ADVANCE_POLICY = { ...STAFF_ROOM_ADVANCE_POLICY, ...policy };
  const valueMap = {
    staffRoomAdvancePolicyModeInput: STAFF_ROOM_ADVANCE_POLICY.advanceMode,
    staffRoomAdvancePolicyMinimumTypeInput: STAFF_ROOM_ADVANCE_POLICY.minimumType,
    staffRoomAdvancePolicyMinimumValueInput: STAFF_ROOM_ADVANCE_POLICY.minimumValue,
    staffRoomAdvancePolicyVersionInput: STAFF_ROOM_ADVANCE_POLICY.version
  };
  Object.entries(valueMap).forEach(([id, value]) => {
    const input = $(`#${id}`);
    if (input) input.value = String(value ?? "");
  });
  const checks = {
    staffRoomAdvancePolicyZeroInput: STAFF_ROOM_ADVANCE_POLICY.allowZeroAdvance,
    staffRoomAdvancePolicyMultipleInput: STAFF_ROOM_ADVANCE_POLICY.allowMultiplePayments,
    staffRoomAdvancePolicySplitInput: STAFF_ROOM_ADVANCE_POLICY.allowSplitPayments,
    staffRoomAdvancePolicyStaffInput: STAFF_ROOM_ADVANCE_POLICY.allowStaffAdvance
  };
  Object.entries(checks).forEach(([id, value]) => {
    const input = $(`#${id}`);
    if (input) input.checked = value === true;
  });
  const allowedMethods = new Set(STAFF_ROOM_ADVANCE_POLICY.allowedPaymentMethods || []);
  document.querySelectorAll("[data-staff-room-advance-method]").forEach((input) => {
    input.checked = allowedMethods.has(input.dataset.staffRoomAdvanceMethod || "");
  });
  applyStaffRoomAdvanceMethodPolicy();
  syncStaffRoomAdvanceFields();
}

async function loadStaffRoomAdvancePolicy() {
  const result = await staffFetchJson(`${STAFF_API_BASE}/room-booking/advance-policy`);
  fillStaffRoomAdvancePolicy(result.policy || {});
}

async function loadStaffRoomAdvancePolicySafely() {
  try {
    await loadStaffRoomAdvancePolicy();
  } catch (error) {
    const status = $("#staffRoomAdvancePolicyStatus");
    if (status) {
      status.textContent =
        error.message || "Advance policy is unavailable.";
    }
    syncStaffRoomAdvanceFields();
  }
}

async function saveStaffRoomAdvancePolicy() {
  if (!isStaffManagerSession()) return;
  const button = $("#staffRoomAdvancePolicySaveBtn");
  const status = $("#staffRoomAdvancePolicyStatus");
  const payload = {
    advanceMode: $("#staffRoomAdvancePolicyModeInput")?.value || "optional",
    minimumType: $("#staffRoomAdvancePolicyMinimumTypeInput")?.value || "fixed",
    minimumValue: Number($("#staffRoomAdvancePolicyMinimumValueInput")?.value || 0),
    allowZeroAdvance: $("#staffRoomAdvancePolicyZeroInput")?.checked === true,
    allowMultiplePayments: $("#staffRoomAdvancePolicyMultipleInput")?.checked === true,
    allowSplitPayments: $("#staffRoomAdvancePolicySplitInput")?.checked === true,
    allowStaffAdvance: $("#staffRoomAdvancePolicyStaffInput")?.checked === true,
    allowedPaymentMethods: [...document.querySelectorAll("[data-staff-room-advance-method]:checked")]
      .map((input) => input.dataset.staffRoomAdvanceMethod)
      .filter(Boolean),
    currency: "INR",
    automaticCancellationEnabled: false,
    version: Number($("#staffRoomAdvancePolicyVersionInput")?.value || 1)
  };
  if (!payload.allowedPaymentMethods.length) {
    if (status) status.textContent = "Enable at least one Room payment method.";
    return;
  }
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }
    if (status) status.textContent = "Saving hotel-scoped advance policy...";
    const result = await staffFetchJson(`${STAFF_API_BASE}/room-booking/advance-policy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    fillStaffRoomAdvancePolicy(result.policy || payload);
    if (status) status.textContent = "Advance policy saved. Automatic cancellation remains disabled.";
  } catch (error) {
    if (status) status.textContent = error.message || "Failed to save advance policy.";
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save Advance Policy";
    }
  }
}

function resetStaffRoomBookingForm() {
  const form = $("#staffRoomBookingForm");
  if (!form) return;

  form.reset();
  const adultsInput = $("#staffRoomBookingAdultsInput");
  const childrenInput = $("#staffRoomBookingChildrenInput");
  const sourceInput = $("#staffRoomBookingSourceInput");
  if (adultsInput) adultsInput.value = "1";
  if (childrenInput) childrenInput.value = "0";
  if (sourceInput) sourceInput.value = "staff";
  const advanceOptionInput = $("#staffRoomAdvanceOptionInput");
  if (advanceOptionInput) advanceOptionInput.value = "no_advance";
  syncStaffRoomAdvanceFields();
  syncStaffRoomNegotiatedRateFields();
  renderStaffRoomBookingRoomOptions();
  setStaffRoomBookingStatus("");
}

function getStaffRoomBookingAvailabilityCriteria() {
  const checkInDate = $("#staffRoomBookingCheckInInput")?.value || "";
  const checkOutDate = $("#staffRoomBookingCheckOutInput")?.value || "";
  const checkInMs = Date.parse(checkInDate);
  const checkOutMs = Date.parse(checkOutDate);
  const adults = Number($("#staffRoomBookingAdultsInput")?.value || 1);
  const children = Number($("#staffRoomBookingChildrenInput")?.value || 0);

  if (
    !checkInDate ||
    !checkOutDate ||
    !Number.isFinite(checkInMs) ||
    !Number.isFinite(checkOutMs) ||
    checkOutMs <= checkInMs
  ) {
    throw new Error("Check-out date must be after check-in date.");
  }

  if (!Number.isInteger(adults) || adults < 1 || adults > 100) {
    throw new Error("Enter a valid adult guest count.");
  }

  if (!Number.isInteger(children) || children < 0 || children > 100) {
    throw new Error("Enter a valid children guest count.");
  }

  return {
    checkInDate,
    checkOutDate,
    adults,
    children
  };
}

async function checkStaffRoomBookingAvailability() {
  const criteria = getStaffRoomBookingAvailabilityCriteria();
  const params = new URLSearchParams({
    checkInDate: criteria.checkInDate,
    checkOutDate: criteria.checkOutDate,
    adults: String(criteria.adults),
    children: String(criteria.children)
  });

  const result = await staffFetchJson(
    `${STAFF_API_BASE}/room-booking/availability?${params.toString()}`
  );
  const rooms = Array.isArray(result.rooms) ? result.rooms : [];
  renderStaffRoomBookingRoomOptionsFromRooms(
    rooms,
    rooms.length
      ? `${rooms.length} available room${rooms.length === 1 ? "" : "s"} found for selected dates.`
      : "No rooms are available for the selected dates and guest count."
  );
}

const ROOM_BOOKING_CONFLICT_CODE = "ROOM_ALREADY_BOOKED";
const ROOM_BOOKING_CONFLICT_MESSAGE =
  "This room is already booked for selected dates. Please choose another room or date.";

function getStaffRoomBookingErrorMessage(error, fallback = "Failed to create room booking.") {
  return error?.code === ROOM_BOOKING_CONFLICT_CODE
    ? ROOM_BOOKING_CONFLICT_MESSAGE
    : error?.message || fallback;
}

function getStaffRoomBookingPayloadFromForm() {
  const roomId = Number($("#staffRoomBookingRoomInput")?.value || 0);
  const checkInDate = $("#staffRoomBookingCheckInInput")?.value || "";
  const checkOutDate = $("#staffRoomBookingCheckOutInput")?.value || "";
  const checkInMs = Date.parse(checkInDate);
  const checkOutMs = Date.parse(checkOutDate);
  const adults = Number($("#staffRoomBookingAdultsInput")?.value || 1);
  const children = Number($("#staffRoomBookingChildrenInput")?.value || 0);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw new Error("Select an available room first.");
  }

  if (
    !checkInDate ||
    !checkOutDate ||
    !Number.isFinite(checkInMs) ||
    !Number.isFinite(checkOutMs) ||
    checkOutMs <= checkInMs
  ) {
    throw new Error("Check-out date must be after check-in date.");
  }

  if (!Number.isInteger(adults) || adults < 1 || adults > 100) {
    throw new Error("Enter a valid adult guest count.");
  }

  if (!Number.isInteger(children) || children < 0 || children > 100) {
    throw new Error("Enter a valid children guest count.");
  }

  const payload = {
    roomId,
    guestName: $("#staffRoomBookingGuestNameInput")?.value.trim() || "",
    guestPhone: $("#staffRoomBookingGuestPhoneInput")?.value.trim() || "",
    guestEmail: $("#staffRoomBookingGuestEmailInput")?.value.trim() || "",
    guestCompanyName: $("#staffRoomBookingCompanyInput")?.value.trim() || "",
    guestGstin: $("#staffRoomBookingGstinInput")?.value.trim().toUpperCase() || "",
    guestPlaceOfSupply: $("#staffRoomBookingPlaceOfSupplyInput")?.value.trim() || "",
    guestIdProof: $("#staffRoomBookingIdProofInput")?.value.trim() || "",
    checkInDate,
    checkOutDate,
    adults,
    children,
    bookingSource: $("#staffRoomBookingSourceInput")?.value || "staff",
    notes: $("#staffRoomBookingNotesInput")?.value.trim() || "",
    ...getStaffRoomAdvancePayload()
  };

  if (
    isStaffManagerSession() &&
    $("#staffRoomNegotiatedRateEnabledInput")?.checked === true
  ) {
    const negotiatedNightlyRate = Number(
      $("#staffRoomNegotiatedNightlyRateInput")?.value || 0
    );
    const negotiatedRateReason =
      $("#staffRoomNegotiatedRateReasonInput")?.value.trim() || "";
    if (!Number.isFinite(negotiatedNightlyRate) || negotiatedNightlyRate <= 0) {
      throw new Error("Enter a negotiated nightly rate greater than zero.");
    }
    if (negotiatedRateReason.length < 5) {
      throw new Error("Enter a clear manager approval reason of at least 5 characters.");
    }
    payload.negotiatedNightlyRate = Math.round(negotiatedNightlyRate * 100) / 100;
    payload.negotiatedRateReason = negotiatedRateReason;
  }

  return payload;
}

async function handleStaffRoomBookingSubmit(event) {
  event.preventDefault();

  const form = $("#staffRoomBookingForm");
  const submitButton = $("#staffRoomBookingSubmitBtn");

  try {
    const payload = getStaffRoomBookingPayloadFromForm();
    if (
      payload.negotiatedNightlyRate &&
      !window.confirm(
        `Create this booking at ${formatMoney(payload.negotiatedNightlyRate)} per night?\n\n` +
        `Manager reason: ${payload.negotiatedRateReason}\n\n` +
        "The configured Room rate will remain unchanged and this approval will be audited."
      )
    ) {
      setStaffRoomBookingStatus("Negotiated-rate booking was not created.");
      return;
    }
    form.dataset.roomBookingIdempotencyKey =
      form.dataset.roomBookingIdempotencyKey ||
      (window.crypto?.randomUUID?.() || `room-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setStaffFormDisabled(form, true);
    setStaffRoomBookingStatus(
      payload.advanceOption === "no_advance"
        ? "Creating room booking..."
        : "Creating booking and recording advance..."
    );

    const bookingResult = await staffFetchJson(`${STAFF_API_BASE}/room-booking/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": form.dataset.roomBookingIdempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const operationsCheckInInput = $("#staffRoomOperationsCheckInInput");
    const operationsCheckOutInput = $("#staffRoomOperationsCheckOutInput");
    if (operationsCheckInInput) operationsCheckInInput.value = payload.checkInDate;
    if (operationsCheckOutInput) operationsCheckOutInput.value = payload.checkOutDate;
    resetStaffRoomBookingForm();
    delete form.dataset.roomBookingIdempotencyKey;
    const verifiedSummary = bookingResult.summary;
    setStaffRoomBookingStatus(
      verifiedSummary
        ? `Booking created. Paid ${formatMoney(verifiedSummary.paidAmount)}; balance ${formatMoney(verifiedSummary.balance)}.`
        : "Room booking created successfully."
    );
    await loadStaffRooms();
    showStaffRoomOperationsView("availability");
    const operationsStatus = $("#staffRoomOperationsStatus");
    if (operationsStatus) {
      operationsStatus.hidden = false;
      operationsStatus.className = "staff-status";
      operationsStatus.textContent = "Booking created. The shared room view has been refreshed.";
    }
  } catch (error) {
    console.error("Staff room booking submit failed:", error);
    setStaffRoomBookingStatus(getStaffRoomBookingErrorMessage(error), true);
  } finally {
    setStaffFormDisabled(form, false);
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function updateStaffRoomBookingStatusButtonState(select) {
  const actions = select?.closest(".staff-record-status-actions");
  const button = actions?.querySelector("[data-staff-update-room-booking-status]");
  if (!button) return;

  const nextStatus = select?.value || "";
  const currentStatus = select?.dataset.currentStatus || "";
  button.disabled = !nextStatus || nextStatus === currentStatus || select.disabled;
}

function getStaffRoomBookingStatusConfirmMessage(bookingId = "", status = "") {
  const statusLabel = getStaffRecordStatusLabel(status);
  return [
    `Update room booking ${bookingId} to "${statusLabel}"?`,
    "",
    "This only changes the room booking status. It does not collect payment, update food orders, or generate checkout billing."
  ].join("\n");
}

async function patchStaffRoomBookingStatus(bookingId, bookingStatus) {
  return staffFetchJson(
    `${STAFF_API_BASE}/room-booking/bookings/${encodeURIComponent(bookingId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bookingStatus })
    }
  );
}

async function handleStaffRoomBookingStatusUpdate(button) {
  const bookingId = button?.dataset.bookingId || "";
  const actions = button?.closest(".staff-record-status-actions");
  const select = actions?.querySelector("[data-staff-room-booking-status-select]");
  const bookingStatus = select?.value || "";

  if (!bookingId || !bookingStatus) {
    window.alert("Room booking status update is missing booking details.");
    return;
  }

  if (!window.confirm(getStaffRoomBookingStatusConfirmMessage(bookingId, bookingStatus))) {
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Updating...";
    await patchStaffRoomBookingStatus(bookingId, bookingStatus);
    await refreshStaffRoomBookingAfterAction(bookingId);
  } catch (error) {
    console.error("Staff room booking status update failed:", error);
    window.alert(error.message || "Failed to update room booking status");
  } finally {
    button.textContent = "Update Room Status";
  }
}

function getStaffRoomPaymentFieldValue(actions, selector) {
  return actions?.querySelector(selector)?.value?.trim() || "";
}

function getStaffRoomPaymentConfirmMessage({ bookingId = "", amount = 0, paymentMethod = "" } = {}) {
  return [
    `Record ${formatMoney(amount)} payment for room booking ${bookingId}?`,
    `Method: ${getStaffRecordStatusLabel(paymentMethod)}`,
    "",
    "This updates only the room booking payment balance. It does not update food orders, KDS, or combined checkout billing."
  ].join("\n");
}

async function recordStaffRoomBookingPayment(bookingId, payload) {
  return staffFetchJson(
    `${STAFF_API_BASE}/room-booking/bookings/${encodeURIComponent(bookingId)}/payments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
}

async function handleStaffRoomBookingPayment(button) {
  const bookingId = button?.dataset.bookingId || "";
  const balanceAmount = Number(button?.dataset.balanceAmount || 0);
  const actions = button?.closest(".staff-record-status-actions");
  const amount = Number(getStaffRoomPaymentFieldValue(actions, "[data-staff-room-payment-amount]"));
  const paymentMethod = getStaffRoomPaymentFieldValue(actions, "[data-staff-room-payment-method]");
  const transactionId = getStaffRoomPaymentFieldValue(actions, "[data-staff-room-payment-transaction]");
  const notes = getStaffRoomPaymentFieldValue(actions, "[data-staff-room-payment-notes]");

  if (!bookingId) {
    window.alert("Room booking payment is missing booking details.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    window.alert("Enter a valid room payment amount.");
    return;
  }

  if (Number.isFinite(balanceAmount) && balanceAmount > 0 && amount > balanceAmount) {
    window.alert("Payment amount cannot be greater than the current room booking balance.");
    return;
  }

  if (!paymentMethod) {
    window.alert("Select a payment method.");
    return;
  }

  if (!window.confirm(getStaffRoomPaymentConfirmMessage({ bookingId, amount, paymentMethod }))) {
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Recording...";
    const idempotencyKey = button.dataset.paymentRequestId ||
      `room-payment-${bookingId}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    button.dataset.paymentRequestId = idempotencyKey;
    await recordStaffRoomBookingPayment(bookingId, {
      amount,
      paymentMethod,
      paymentStatus: "paid",
      transactionId,
      notes,
      idempotencyKey
    });
    delete button.dataset.paymentRequestId;
    await refreshStaffRoomBookingAfterAction(bookingId);
  } catch (error) {
    console.error("Staff room booking payment failed:", error);
    window.alert(error.message || "Failed to record room booking payment");
  } finally {
    button.disabled = false;
    button.textContent = "Record Room Payment";
  }
}

async function handleStaffRoomBookingRefund(button) {
  const bookingId = String(button?.dataset.bookingId || "").trim();
  const actions = button?.closest(".staff-record-status-actions");
  const amount = Number(getStaffRoomPaymentFieldValue(actions, "[data-staff-room-refund-amount]"));
  const paymentMethod = getStaffRoomPaymentFieldValue(actions, "[data-staff-room-refund-method]");
  const transactionId = getStaffRoomPaymentFieldValue(actions, "[data-staff-room-refund-transaction]");
  const reason = getStaffRoomPaymentFieldValue(actions, "[data-staff-room-refund-reason]");
  const maximum = Number(button?.dataset.refundableAmount || 0);
  if (!bookingId || !Number.isFinite(amount) || amount <= 0) {
    window.alert("Enter a valid Room refund amount.");
    return;
  }
  if (maximum > 0 && amount > maximum) {
    window.alert("Refund amount cannot exceed the currently paid Room amount.");
    return;
  }
  if (!paymentMethod || reason.length < 2) {
    window.alert("Select a refund method and enter a reason.");
    return;
  }
  if (!window.confirm(`Record ${formatMoney(amount)} refund for room booking ${bookingId}?`)) return;
  try {
    button.disabled = true;
    button.textContent = "Refunding...";
    const idempotencyKey = button.dataset.refundRequestId ||
      `room-refund-${bookingId}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    button.dataset.refundRequestId = idempotencyKey;
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/room-booking/bookings/${encodeURIComponent(bookingId)}/refunds`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod, transactionId, reason, idempotencyKey })
      }
    );
    delete button.dataset.refundRequestId;
    if (result.creditNote?.creditNoteNumber) {
      window.alert(`Refund recorded. Credit note: ${result.creditNote.creditNoteNumber}`);
    }
    await refreshStaffRoomBookingAfterAction(bookingId);
  } catch (error) {
    console.error("Staff room refund failed:", error);
    window.alert(error.message || "Failed to record Room refund");
  } finally {
    button.disabled = false;
    button.textContent = "Record Refund";
  }
}

function renderStaffOrders(orders = []) {
  const content = $("#staffOrdersContent");
  if (!content) return;

  renderStaffOrdersQuickReports(STAFF_STATE.dashboardReports);
  renderStaffOrdersAttentionSummary(orders);
  renderStaffFilterStatus(orders);

  if (!orders.length) {
    renderStaffOrdersEmptyState();
    return;
  }

  content.className = "staff-orders-list staff-section-stage";
  content.removeAttribute("role");
  content.setAttribute("aria-busy", "false");
  content.innerHTML = buildStaffOrdersListMarkup(orders);
}

function normalizeStaffTableOrderMenuItem(item = {}) {
  const id = String(item.id || item.itemId || item.item_id || "").trim();
  const name = String(item.name || "").trim();

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    desc: String(item.desc || item.description || "").trim(),
    price: Number(item.price || 0) || 0,
    category: String(item.category || "others").trim() || "others",
    categoryName: String(item.categoryName || "").trim(),
    imageMeta: item.imageMeta && typeof item.imageMeta === "object" ? item.imageMeta : null,
    badge: String(item.badge || "").trim(),
    tag: String(item.tag || "").trim(),
    itemType: String(item.itemType || item.item_type || "single").trim() || "single",
    comboItems: Array.isArray(item.comboItems) ? item.comboItems : [],
    originalPrice: Number(item.originalPrice || 0) || 0,
    savings: Number(item.savings || 0) || 0
  };
}

function getStaffTableOrderCategoryLabel(category = "") {
  const configured = STAFF_STATE.tableOrderMenuCategories.find((entry) => entry.key === category);
  if (configured?.name) return configured.name;
  const normalized = String(category || "")
    .trim()
    .replace(/[-_]+/g, " ");

  if (!normalized) {
    return "Others";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStaffTableOrderAvailableCategories() {
  const availableItemCategories = new Set(
    STAFF_STATE.tableOrderMenu.map((item) => String(item.category || "").trim()).filter(Boolean)
  );
  const configuredOrder = STAFF_STATE.tableOrderMenuCategories
    .map((category) => String(category.key || "").trim())
    .filter((category) => availableItemCategories.has(category));
  if (configuredOrder.length) return configuredOrder;
  return Array.from(
    availableItemCategories
  ).sort((a, b) => a.localeCompare(b));
}

function getFilteredStaffTableOrderMenuItems() {
  const categoryFilter = String(STAFF_STATE.tableOrderMenuCategory || "all").trim() || "all";
  const searchQuery = String(STAFF_STATE.tableOrderMenuQuery || "")
    .trim()
    .toLowerCase();

  return STAFF_STATE.tableOrderMenu.filter((item) => {
    const itemCategory = String(item.category || "others").trim() || "others";
    const categoryMatches = categoryFilter === "all" || itemCategory === categoryFilter;
    const comboChildNames = Array.isArray(item.comboItems)
      ? item.comboItems.map((comboItem) => comboItem?.name || comboItem?.itemId).filter(Boolean)
      : [];
    const searchBlob = [item.name, item.desc, item.category, item.badge, item.tag, ...comboChildNames]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchMatches = !searchQuery || searchBlob.includes(searchQuery);

    return categoryMatches && searchMatches;
  });
}

function getStaffTableOrderMenuItem(itemId = "") {
  const normalizedItemId = String(itemId || "").trim();
  return STAFF_STATE.tableOrderMenu.find((item) => item.id === normalizedItemId) || null;
}

function getStaffTableOrderItemQty(itemId = "") {
  return Number(STAFF_STATE.tableOrderCart[String(itemId || "").trim()] || 0) || 0;
}

function updateStaffTableOrderMenuItemQuantity(itemId = "", qty = 0) {
  const normalizedItemId = String(itemId || "").trim();
  if (!normalizedItemId) return;
  const safeId =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(normalizedItemId)
      : normalizedItemId.replace(/[^a-zA-Z0-9_-]/g, "");
  const itemCard = document.querySelector(
    `[data-staff-table-order-menu-item="${safeId}"]`
  );
  if (!itemCard) return;

  const quantity = Math.max(0, Number(qty || 0) || 0);
  const quantityValue = itemCard.querySelector(".staff-table-order-qty-value");
  const minusButton = itemCard.querySelector("[data-staff-table-order-minus]");
  if (quantityValue) quantityValue.textContent = String(quantity);
  if (minusButton) minusButton.disabled = quantity <= 0;
}

function setStaffTableOrderItemQty(itemId = "", qty = 0) {
  const normalizedItemId = String(itemId || "").trim();
  const nextQty = Math.max(0, Math.min(100, Number(qty) || 0));

  if (!normalizedItemId) return;

  if (nextQty > 0) {
    STAFF_STATE.tableOrderCart = {
      ...STAFF_STATE.tableOrderCart,
      [normalizedItemId]: nextQty
    };
  } else {
    const nextCart = { ...STAFF_STATE.tableOrderCart };
    delete nextCart[normalizedItemId];
    STAFF_STATE.tableOrderCart = nextCart;
  }

  updateStaffTableOrderMenuItemQuantity(normalizedItemId, nextQty);
  renderStaffTableOrderCart();
  syncStaffTakeOrderProgress();
}

function getStaffTableOrderCartEntries() {
  return Object.entries(STAFF_STATE.tableOrderCart)
    .map(([itemId, qty]) => {
      const item = getStaffTableOrderMenuItem(itemId);
      const quantity = Number(qty || 0) || 0;

      if (!item || quantity <= 0) {
        return null;
      }

      return {
        ...item,
        qty: quantity,
        note: String(STAFF_STATE.tableOrderItemNotes[itemId] || "").trim(),
        lineTotal: item.price * quantity
      };
    })
    .filter(Boolean);
}

function getStaffTableOrderCartTotal(entries = getStaffTableOrderCartEntries()) {
  return entries.reduce((sum, item) => sum + item.lineTotal, 0);
}

function setStaffTableOrderSubmitDisabled(isDisabled) {
  document.querySelectorAll("[data-staff-table-order-submit]").forEach((button) => {
    button.disabled = !!isDisabled;
  });
}

function setStaffTableOrderSubmitBusy(isBusy) {
  document.querySelectorAll("[data-staff-table-order-submit]").forEach((button) => {
    setStaffActionBusyState(button, isBusy);
  });
}

function closeStaffTableOrderMobileSheet() {
  const sheet = $("#staffTableOrderMobileSheet");
  if (sheet?.open) sheet.close();
}

function getStaffPreferredScrollBehavior() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ? "auto"
    : "smooth";
}

function renderStaffTableOrderMobileCart(entries = getStaffTableOrderCartEntries()) {
  const bar = $("#staffTableOrderMobileBar");
  const itemLabel = $("#staffTableOrderMobileBarItems");
  const totalLabel = $("#staffTableOrderMobileBarTotal");
  const content = $("#staffTableOrderMobileSheetContent");
  const createView = $("#staffTakeOrderCreateView");
  const safeEntries = Array.isArray(entries) ? entries : [];
  const totalQty = safeEntries.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const subtotal = getStaffTableOrderCartTotal(safeEntries);
  const hasItems = safeEntries.length > 0;

  if (bar) bar.hidden = !hasItems;
  createView?.classList.toggle("has-mobile-cart", hasItems);
  if (itemLabel) itemLabel.textContent = `${totalQty} item${totalQty === 1 ? "" : "s"}`;
  if (totalLabel) totalLabel.textContent = formatMoney(subtotal);

  if (!hasItems) {
    closeStaffTableOrderMobileSheet();
    if (content) content.innerHTML = "";
    return;
  }

  if (content) {
    const tableNumber = String($("#staffTableOrderTableInput")?.value || "").trim() || "Not selected";
    const guestName = String($("#staffTableOrderCustomerNameInput")?.value || "").trim() || "Table Guest";
    const note = String($("#staffTableOrderNoteInput")?.value || "").trim();
    content.innerHTML = `
      <div class="staff-table-order-mobile-sheet-summary">
        <div class="staff-take-order-table-fact"><span>Table</span><strong>${escapeHTML(tableNumber)}</strong></div>
        <div class="staff-take-order-table-fact"><span>Guest</span><strong>${escapeHTML(guestName)}</strong></div>
        <div class="staff-take-order-table-fact"><span>Items</span><strong>${escapeHTML(totalQty)}</strong></div>
        <div class="staff-take-order-table-fact"><span>Estimated subtotal</span><strong>${escapeHTML(formatMoney(subtotal))}</strong></div>
      </div>
      <ul class="staff-table-order-cart-list">
        ${safeEntries.map((item) => `
          <li class="staff-table-order-cart-row">
            <div>
              <span>${escapeHTML(item.name)} x${escapeHTML(item.qty)}</span>
              ${buildStaffTableOrderCartMetaMarkup(item)}
              <label class="staff-table-order-item-note-label">
                Kitchen note for ${escapeHTML(item.name)}
                <input class="staff-input" type="text" maxlength="500" value="${escapeHTML(item.note || "")}" data-staff-table-order-item-note="${escapeHTML(item.id)}" placeholder="Optional, e.g. less spicy" />
              </label>
            </div>
            <strong>${escapeHTML(formatMoney(item.lineTotal))}</strong>
          </li>
        `).join("")}
      </ul>
      ${note ? `<p class="staff-table-order-item-meta"><strong>Order note:</strong> ${escapeHTML(note)}</p>` : ""}
    `;
  }
}

function openStaffTableOrderMobileSheet() {
  const sheet = $("#staffTableOrderMobileSheet");
  if (!sheet || !getStaffTableOrderCartEntries().length) return;

  renderStaffTableOrderMobileCart();
  if (typeof sheet.showModal === "function" && !sheet.open) {
    sheet.showModal();
  }
}

function setStaffTableOrderStatus(message = "", tone = "muted") {
  const status = $("#staffTableOrderStatus");
  if (!status) return;

  status.hidden = !message;
  status.textContent = message;
  status.dataset.statusTone = tone;
}

function syncStaffTakeOrderProgress() {
  const tableNumber = String($("#staffTableOrderTableInput")?.value || "").trim();
  const guestDetails = [
    $("#staffTableOrderCustomerNameInput")?.value,
    $("#staffTableOrderCustomerPhoneInput")?.value,
    $("#staffTableOrderNoteInput")?.value
  ].some((value) => String(value || "").trim());
  const entries = getStaffTableOrderCartEntries();
  const totalQty = entries.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const currentStep = !tableNumber ? "table" : !entries.length ? "menu" : "review";
  const stepState = {
    table: {
      complete: !!tableNumber,
      status: tableNumber ? `Table ${tableNumber}` : "Required"
    },
    guest: {
      complete: guestDetails,
      status: guestDetails ? "Details added" : "Optional"
    },
    menu: {
      complete: entries.length > 0,
      status: entries.length ? `${totalQty} selected` : "Add items"
    },
    review: {
      complete: false,
      status: tableNumber && entries.length ? "Ready" : "Waiting"
    }
  };

  document.querySelectorAll("[data-staff-take-order-progress]").forEach((step) => {
    const key = step.dataset.staffTakeOrderProgress || "";
    const state = stepState[key];
    if (!state) return;

    const isCurrent = key === currentStep;
    step.classList.toggle("is-current", isCurrent);
    step.classList.toggle("is-complete", state.complete);
    if (isCurrent) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }

    const status = step.querySelector("[data-staff-take-order-progress-status]");
    if (status) status.textContent = state.status;
  });
}

function getStaffTableOrderSubmitErrorMessage(error) {
  const details = Array.isArray(error?.responseData?.details)
    ? error.responseData.details
    : [];
  const itemDetail = details.find((detail) => {
    const path = Array.isArray(detail?.path) ? detail.path : [];
    return path.includes("items") && String(detail?.message || "").trim();
  });

  return String(itemDetail?.message || error?.message || "Failed to place order.").trim();
}

function isStaffTableOrderItemValidationError(error) {
  if (Number(error?.status || 0) !== 400) return false;

  return Array.isArray(error?.responseData?.details) && error.responseData.details.some((detail) => {
    const path = Array.isArray(detail?.path) ? detail.path : [];
    return path.includes("items");
  });
}

function isStaffTableOrderConflictError(error) {
  return String(error?.responseData?.code || error?.code || "").trim().toUpperCase() ===
    "TABLE_HAS_ACTIVE_ORDER";
}

function setStaffTableOrderConflict(activeOrder = null, tableNumber = "") {
  const actions = $("#staffTableOrderConflictActions");
  const normalizedOrder =
    activeOrder && typeof activeOrder === "object" && !Array.isArray(activeOrder)
      ? {
          id: String(activeOrder.id || activeOrder.orderReference || "").trim(),
          status: String(activeOrder.status || "").trim(),
          tableNumber: String(activeOrder.tableNumber || tableNumber || "").trim()
        }
      : null;

  STAFF_STATE.tableOrderConflict = normalizedOrder?.id ? normalizedOrder : null;
  if (actions) actions.hidden = !STAFF_STATE.tableOrderConflict;
}

async function checkStaffTableOrderAvailability(tableNumber = "") {
  const params = new URLSearchParams({ tableNumber: String(tableNumber || "").trim() });
  return staffFetchJson(`${STAFF_API_BASE}/orders/active-table?${params.toString()}`);
}

function showStaffTableOrderConflict(activeOrder = null, tableNumber = "") {
  setStaffTableOrderConflict(activeOrder, tableNumber);
  const conflict = STAFF_STATE.tableOrderConflict;
  const safeTableNumber = conflict?.tableNumber || String(tableNumber || "").trim() || "This table";
  setStaffTableOrderStatus(
    `${safeTableNumber} already has an active order. Open the existing order instead of creating a second one.`,
    "warning"
  );
}

function normalizeStaffTableOrderingState(ordering = null) {
  if (!ordering || typeof ordering !== "object" || Array.isArray(ordering)) {
    return { ...DEFAULT_STAFF_TABLE_ORDERING_STATE };
  }

  return {
    staffOrderingEnabled: ordering.staffOrderingEnabled !== false,
    enforceTableMaster: ordering.enforceTableMaster === true,
    secureOnlinePaymentEnabled: ordering.secureOnlinePaymentEnabled !== false,
    cashOnDeliveryEnabled: ordering.cashOnDeliveryEnabled !== false,
    manualUpiPaymentEnabled: ordering.manualUpiPaymentEnabled !== false,
    title: String(ordering.title || "").trim(),
    message: String(ordering.message || "").trim(),
    icon: String(ordering.icon || "").trim()
  };
}

function getStaffTableOrderingState() {
  return normalizeStaffTableOrderingState(STAFF_STATE.tableOrdering);
}

function syncStaffPaymentMethodSettingsForm(ordering = getStaffTableOrderingState()) {
  const secureOnlineInput = $("#staffSecureOnlinePaymentEnabledInput");
  const cashOnDeliveryInput = $("#staffCashOnDeliveryEnabledInput");
  const manualUpiInput = $("#staffManualUpiPaymentEnabledInput");
  if (secureOnlineInput) {
    secureOnlineInput.checked = ordering.secureOnlinePaymentEnabled !== false;
  }
  if (cashOnDeliveryInput) {
    cashOnDeliveryInput.checked = ordering.cashOnDeliveryEnabled !== false;
  }
  if (manualUpiInput) {
    manualUpiInput.checked = ordering.manualUpiPaymentEnabled !== false;
  }
}

function setStaffPaymentMethodSettingsStatus(message = "", tone = "muted") {
  const status = $("#staffPaymentMethodSettingsStatus");
  if (!status) return;
  status.hidden = !message;
  status.textContent = String(message || "");
  status.classList.toggle("is-error", tone === "error");
  status.classList.toggle("is-success", tone === "success");
}

async function handleStaffPaymentMethodSettingsSubmit(event) {
  event.preventDefault();
  if (!isStaffManagerSession()) {
    setStaffPaymentMethodSettingsStatus(
      "Manager access is required to change customer payment methods.",
      "error"
    );
    return;
  }

  const form = event.currentTarget;
  const button = $("#staffSavePaymentMethodSettingsBtn");
  const payload = {
    secureOnlinePaymentEnabled: $("#staffSecureOnlinePaymentEnabledInput")?.checked === true,
    cashOnDeliveryEnabled: $("#staffCashOnDeliveryEnabledInput")?.checked === true,
    manualUpiPaymentEnabled: $("#staffManualUpiPaymentEnabledInput")?.checked === true
  };
  if (!Object.values(payload).some(Boolean)) {
    setStaffPaymentMethodSettingsStatus(
      "Enable at least one customer payment method.",
      "error"
    );
    return;
  }

  try {
    setStaffFormDisabled(form, true);
    if (button) button.textContent = "Saving...";
    setStaffPaymentMethodSettingsStatus(
      "Saving payment methods for this hotel...",
      "muted"
    );
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/ordering-settings/payment-methods`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    STAFF_STATE.tableOrdering = normalizeStaffTableOrderingState({
      ...getStaffTableOrderingState(),
      ...(result.ordering || payload)
    });
    syncStaffPaymentMethodSettingsForm();
    setStaffPaymentMethodSettingsStatus(
      result.message || "Customer payment methods saved for this hotel.",
      "success"
    );
  } catch (error) {
    setStaffPaymentMethodSettingsStatus(
      error.message || "Failed to save customer payment methods.",
      "error"
    );
  } finally {
    setStaffFormDisabled(form, false);
    if (button) button.textContent = "Save Payment Methods";
  }
}

function getStaffTableOrderingDisabledMessage() {
  const ordering = getStaffTableOrderingState();
  const title = ordering.title || "Staff Ordering is Currently Unavailable";
  const message =
    ordering.message ||
    "This hotel is not accepting staff-assisted orders right now. Please check with the manager and try again later.";

  return `${ordering.icon ? `${ordering.icon} ` : ""}${title}: ${message}`;
}

function isStaffOrderingDisabledApiError(error) {
  return String(error?.responseData?.code || "").trim().toUpperCase() === "STAFF_ORDERING_DISABLED";
}

function getStaffOrderingDisabledStatusMessage(error) {
  const ordering =
    error?.responseData?.ordering &&
    typeof error.responseData.ordering === "object" &&
    !Array.isArray(error.responseData.ordering)
      ? error.responseData.ordering
      : {};
  const title = String(ordering.title || "").trim();
  const message = String(ordering.message || error?.message || "").trim();

  if (title && message && !message.startsWith(title)) {
    return `${title}: ${message}`;
  }

  return message || title || "Staff ordering is unavailable for this hotel right now.";
}

function setStaffTableOrderMenuLoading(message = "Loading menu...") {
  const content = $("#staffTableOrderMenuContent");
  if (!content) return;

  content.className = "staff-empty is-loading";
  content.textContent = message;
}

function showStaffTakeOrderSubview(view = "home", { focus = true } = {}) {
  const allowedViews = ["home", "tables", "create"];
  const nextView = allowedViews.includes(view) ? view : "home";
  const home = $("#staffTakeOrderHome");
  const tables = $("#staffTakeOrderTablesView");
  const create = $("#staffTakeOrderCreateView");

  STAFF_STATE.tableOrderSubview = nextView;

  if (home) home.hidden = nextView !== "home";
  if (tables) tables.hidden = nextView !== "tables";
  if (create) create.hidden = nextView !== "create";
  if (nextView !== "create") closeStaffTableOrderMobileSheet();

  if (nextView === "home" && !STAFF_STATE.tableOrderMenuLoaded) {
    setStaffSectionLastUpdated("#staffTableOrderLastUpdated", "Choose an action");
  }

  if (nextView === "create") {
    syncStaffTakeOrderProgress();
    if (!STAFF_STATE.tableOrderMenuLoaded) {
      void loadStaffTableOrderMenu();
    } else {
      renderStaffTableOrderMenu();
      renderStaffTableOrderCart();
    }
  }

  if (nextView === "tables") {
    if (!STAFF_STATE.tableActivityLoaded) {
      void loadStaffTableActivity();
    } else {
      renderStaffTableActivity();
    }
  }

  if (!focus) return;

  const focusTarget =
    nextView === "tables"
      ? $("#staffTakeOrderTablesHeading")
      : nextView === "create"
        ? $("#staffTakeOrderCreateHeading")
        : $("#staffTakeOrderOpenTablesBtn");

  window.requestAnimationFrame(() => {
    focusTarget?.focus({ preventScroll: true });
  });
}

function createStaffOrderAdditionIdempotencyKey() {
  if (window.crypto?.randomUUID) return `staff-add-${window.crypto.randomUUID()}`;
  return `staff-add-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function syncStaffTableOrderMode() {
  const isAddition = STAFF_STATE.tableOrderMode === "add" && STAFF_STATE.tableOrderTarget;
  const target = STAFF_STATE.tableOrderTarget || {};
  const heading = $("#staffTakeOrderCreateHeading");
  const tableInput = $("#staffTableOrderTableInput");
  const customerNameInput = $("#staffTableOrderCustomerNameInput");
  const customerPhoneInput = $("#staffTableOrderCustomerPhoneInput");

  if (heading) {
    heading.textContent = isAddition
      ? `Add More Items · Table ${target.tableNumber || ""} · Order #${target.id || ""}`
      : "Staff-assisted dine-in order";
  }
  document.querySelectorAll("[data-staff-table-order-submit]").forEach((button) => {
    button.textContent = isAddition ? "Add Items and Send to Kitchen" : "Place Table Order";
  });
  if (isAddition) {
    if (tableInput) {
      tableInput.value = target.tableNumber || "";
      tableInput.readOnly = true;
    }
    if (customerNameInput) {
      customerNameInput.value = target.customerName || "";
      customerNameInput.readOnly = true;
    }
    if (customerPhoneInput) {
      customerPhoneInput.value = target.customerPhone || "";
      customerPhoneInput.readOnly = true;
    }
  } else {
    if (customerNameInput) customerNameInput.readOnly = false;
    if (customerPhoneInput) customerPhoneInput.readOnly = false;
  }
}

function resetStaffTableOrderAdditionMode() {
  STAFF_STATE.tableOrderMode = "create";
  STAFF_STATE.tableOrderTarget = null;
  STAFF_STATE.tableOrderIdempotencyKey = "";
  syncStaffTableOrderMode();
}

async function openStaffAddMoreItems(orderId = "") {
  const normalizedOrderId = String(orderId || "").trim();
  const order = findStaffOrder(normalizedOrderId);
  if (!order || order.canAddItems !== true) {
    setStaffTableOrderDetailNotice(
      order?.addItemsBlockedReason || "This order is no longer open for additional items.",
      "warning"
    );
    return;
  }

  STAFF_STATE.tableOrderMode = "add";
  STAFF_STATE.tableOrderTarget = { ...order };
  STAFF_STATE.selectedTableOrderId = normalizedOrderId;
  STAFF_STATE.selectedTableNumber = String(order.tableNumber || "").trim();
  STAFF_STATE.selectedTableOrder = { ...order };
  STAFF_STATE.tableOrderCart = {};
  STAFF_STATE.tableOrderItemNotes = {};
  STAFF_STATE.tableOrderIdempotencyKey = createStaffOrderAdditionIdempotencyKey();
  const noteInput = $("#staffTableOrderNoteInput");
  if (noteInput) noteInput.value = "";
  syncStaffTableOrderMode();
  openStaffView("table-order");
  showStaffTakeOrderSubview("create", { focus: true });
  if (!STAFF_STATE.tableOrderMenuLoaded) await loadStaffTableOrderMenu();
  renderStaffTableOrderMenu();
  renderStaffTableOrderCart();
  setStaffTableOrderStatus(
    `Selecting only new items for Table ${order.tableNumber}. Existing items stay read-only.`,
    "muted"
  );
}

function getStaffTableActivityFilterStatuses(filterKey = STAFF_STATE.tableActivityStatus) {
  const normalizedFilter = String(filterKey || "all").trim().toLowerCase();
  return STAFF_TABLE_ACTIVITY_FILTERS[normalizedFilter] || STAFF_TABLE_ACTIVITY_FILTERS.all;
}

function getStaffTableActivityCounts(tables = STAFF_STATE.tableFloor) {
  const safeTables = Array.isArray(tables) ? tables : [];
  return Object.keys(STAFF_TABLE_ACTIVITY_FILTERS).reduce((counts, filterKey) => {
    counts[filterKey] = filterKey === "all"
      ? safeTables.length
      : safeTables.filter((table) => normalizeStatus(table.liveStatus) === filterKey).length;
    return counts;
  }, {});
}

function getFilteredStaffTableActivity() {
  const query = String(STAFF_STATE.tableActivityQuery || "").trim().toLowerCase();
  const filterKey = String(STAFF_STATE.tableActivityStatus || "all").trim().toLowerCase();

  return STAFF_STATE.tableFloor.filter((table) => {
    const statusMatches = filterKey === "all" || normalizeStatus(table.liveStatus) === filterKey;
    const searchBlob = [table.tableCode, table.tableName, table.areaName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return statusMatches && (!query || searchBlob.includes(query));
  });
}

function getStaffTableActivityStatusLabel(table = {}) {
  const status = normalizeStatus(table.liveStatus);
  if (status === "billing_pending") return "Billing Pending";
  if (status === "available") return "Available";
  if (status === "ready") return "Ready";
  if (status === "preparing") return "Preparing";
  if (status === "new") return "New";
  if (status === "confirmed") return "Confirmed";
  if (status === "maintenance") return "Maintenance";
  if (status === "cleaning") return "Cleaning";
  return getStaffRecordStatusLabel(status || "inactive", "table");
}

function buildStaffTableActivityCard(table = {}) {
  const tableId = String(table.id || "").trim();
  const order = table.activeOrder || null;
  const orderId = String(order?.id || "").trim();
  const tableNumber = String(table.tableCode || "").trim() || "Not provided";
  const status = normalizeStatus(table.liveStatus || "available");
  const isSelected = orderId && orderId === String(STAFF_STATE.selectedTableOrderId || "");
  let action = '<button class="staff-btn secondary" type="button" disabled>Unavailable</button>';

  if (status === "available") {
    action = '<button class="staff-btn" type="button" data-staff-select-available-table="' + escapeHTML(tableId) + '">Create Order</button>';
  } else if (orderId) {
    action = '<button class="staff-btn" type="button" data-staff-open-table-order="' + escapeHTML(orderId) + '" aria-controls="staffTakeOrderDetailPanel" aria-expanded="' + String(isSelected) + '">Open Order</button>';
  }

  return '<article class="staff-take-order-table-card is-' + escapeHTML(status) + (isSelected ? ' is-selected' : '') + '" data-staff-table-id="' + escapeHTML(tableId) + '">' +
    '<div class="staff-take-order-table-card-head"><div><p>Table</p><h5>' + escapeHTML(tableNumber) + '</h5></div>' +
    '<span class="staff-take-order-table-status">' + escapeHTML(getStaffTableActivityStatusLabel(table)) + '</span></div>' +
    (table.tableName && table.tableName !== "Table " + tableNumber ? '<p class="staff-take-order-table-name">' + escapeHTML(table.tableName) + '</p>' : '') +
    (table.areaName ? '<p class="staff-take-order-table-area">' + escapeHTML(table.areaName) + '</p>' : '') +
    action + '</article>';
}

function renderStaffTableActivity() {
  const content = $("#staffTakeOrderTableContent");
  const summary = $("#staffTakeOrderTableSummary");
  const searchInput = $("#staffTakeOrderTableSearchInput");
  if (!content) return;

  if (searchInput && searchInput.value !== STAFF_STATE.tableActivityQuery) {
    searchInput.value = STAFF_STATE.tableActivityQuery;
  }

  const counts = getStaffTableActivityCounts();
  document.querySelectorAll("[data-staff-table-activity-status]").forEach((button) => {
    const filterKey = button.dataset.staffTableActivityStatus || "all";
    const isActive = filterKey === STAFF_STATE.tableActivityStatus;
    const count = button.querySelector("[data-staff-table-activity-count]");
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    if (count) count.textContent = String(counts[filterKey] || 0);
  });

  const tables = getFilteredStaffTableActivity();
  if (summary) {
    summary.textContent = tables.length + " of " + STAFF_STATE.tableFloor.length +
      " configured table" + (STAFF_STATE.tableFloor.length === 1 ? "" : "s") +
      ". Active tables are newest first; available tables follow display order.";
  }

  if (!STAFF_STATE.tableFloor.length) {
    content.className = "staff-empty staff-section-stage";
    content.textContent = "No restaurant tables are configured for this hotel yet.";
    renderStaffTableOrderDetail();
    return;
  }

  if (!tables.length) {
    content.className = "staff-empty staff-section-stage";
    content.textContent = "No configured tables match the current search and filter.";
    renderStaffTableOrderDetail();
    return;
  }

  content.className = "staff-take-order-table-grid";
  content.innerHTML = tables.map(buildStaffTableActivityCard).join("");
  renderStaffTableOrderDetail();
}

function getStaffTableActivityRenderSignature(tables = []) {
  return JSON.stringify(
    (Array.isArray(tables) ? tables : []).map((table) => {
      const order = table?.activeOrder || {};
      return [
        table?.id || "",
        table?.tableCode || table?.tableNumber || "",
        table?.operationalStatus || "",
        table?.displayOrder || 0,
        order?.id || "",
        order?.status || "",
        order?.kitchenStatus || "",
        order?.effectiveKitchenStatus || "",
        order?.paymentStatus || "",
        order?.billingStatus || ""
      ];
    })
  );
}

function mergeStaffSelectedTableOrderSummary(currentOrder = null, summaryOrder = null) {
  if (
    !currentOrder ||
    !summaryOrder ||
    String(currentOrder.id || "") !== String(summaryOrder.id || "")
  ) {
    return currentOrder;
  }

  return {
    ...summaryOrder,
    ...currentOrder,
    status: summaryOrder.status || currentOrder.status,
    kitchenStatus: summaryOrder.kitchenStatus || currentOrder.kitchenStatus,
    effectiveKitchenStatus:
      summaryOrder.effectiveKitchenStatus || currentOrder.effectiveKitchenStatus,
    paymentStatus: summaryOrder.paymentStatus || currentOrder.paymentStatus,
    billingStatus: summaryOrder.billingStatus || currentOrder.billingStatus
  };
}

async function loadStaffTableActivity({ silent = false } = {}) {
  const content = $("#staffTakeOrderTableContent");
  const refreshButton = $("#staffTakeOrderRefreshTablesBtn");
  const previousScrollTop = window.scrollY;
  const previousRenderSignature = STAFF_STATE.tableActivityRenderSignature;

  if (!silent && content) {
    content.className = "staff-empty staff-section-stage is-loading";
    content.textContent = "Loading the restaurant floor...";
  }

  setStaffActionBusyState(refreshButton, true);

  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/floor");
    const nextFloor = Array.isArray(result.tables) ? result.tables : [];
    const nextActivity = normalizeStaffOrdersForDisplay(
      nextFloor.map((table) => table.activeOrder).filter(Boolean)
    );
    const nextRenderSignature = getStaffTableActivityRenderSignature(nextFloor);
    STAFF_STATE.tableFloor = nextFloor;
    STAFF_STATE.tableActivity = nextActivity;
    STAFF_STATE.tableActivityLoaded = true;
    STAFF_STATE.tableActivityRenderSignature = nextRenderSignature;
    const selectedActiveOrder = nextActivity.find(
      (order) => String(order.id) === String(STAFF_STATE.selectedTableOrderId)
    );
    if (selectedActiveOrder) {
      STAFF_STATE.selectedTableOrder = mergeStaffSelectedTableOrderSummary(
        STAFF_STATE.selectedTableOrder,
        selectedActiveOrder
      );
    }
    if (!silent || nextRenderSignature !== previousRenderSignature) {
      renderStaffTableActivity();
      if (silent) window.scrollTo({ top: previousScrollTop, behavior: "auto" });
    }
  } catch (error) {
    console.error("Staff table floor load failed:", error);
    STAFF_STATE.tableActivityLoaded = false;
    if (content && !silent) {
      content.className = "staff-empty staff-section-stage";
      content.innerHTML = escapeHTML(error.message || "The restaurant floor could not be loaded.") +
        ' <button class="staff-btn secondary" type="button" data-staff-retry-table-activity>Retry</button>';
    }
    if (silent) throw error;
  } finally {
    setStaffActionBusyState(refreshButton, false);
  }
}

async function selectAvailableRestaurantTable(tableId = "") {
  const normalizedId = String(tableId || "").trim();
  if (!normalizedId) return;

  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/" + encodeURIComponent(normalizedId) + "/availability");
    if (!result.available) {
      if (result.activeOrder?.id) {
        STAFF_STATE.tableActivity = replaceStaffOrderInCollection(STAFF_STATE.tableActivity, result.activeOrder);
        await openStaffOrderFromTableActivity(result.activeOrder.id);
        setStaffTableOrderDetailNotice("This table now has an active order. The latest order has been opened.", "warning");
      } else {
        await loadStaffTableActivity();
      }
      return;
    }

    const input = $("#staffTableOrderTableInput");
    STAFF_STATE.selectedRestaurantTableId = String(result.table?.id || normalizedId);
    if (input) {
      input.value = String(result.table?.tableCode || "");
      input.readOnly = true;
      input.dataset.restaurantTableId = STAFF_STATE.selectedRestaurantTableId;
    }
    showStaffTakeOrderSubview("create");
    setStaffTableOrderStatus("Table " + String(result.table?.tableCode || "") + " selected.", "success");
    syncStaffTakeOrderProgress();
    window.requestAnimationFrame(() => $("#staffTableOrderCustomerNameInput")?.focus({ preventScroll: true }));
  } catch (error) {
    setStaffTableOrderStatus(error.message || "Table availability could not be confirmed.", "warning");
  }
}

function setStaffTableMasterStatus(message = "", tone = "success") {
  const status = $("#staffTableMasterStatus");
  if (!status) return;
  status.hidden = !message;
  status.textContent = message;
  status.dataset.statusTone = tone;
}

function renderStaffTableMaster() {
  const list = $("#staffTableMasterList");
  if (!list) return;

  if (!STAFF_STATE.tableMaster.length) {
    list.className = "staff-table-master-list staff-empty";
    list.textContent = "No tables configured yet. Add one table or use bulk create.";
    return;
  }

  list.className = "staff-table-master-list";
  list.innerHTML = STAFF_STATE.tableMaster.map((table) => {
    const id = escapeHTML(table.id);
    return '<article class="staff-table-master-row" data-staff-table-master-row="' + id + '">' +
      '<input class="staff-input" data-table-field="tableCode" value="' + escapeHTML(table.tableCode) + '" aria-label="Table code" />' +
      '<input class="staff-input" data-table-field="tableName" value="' + escapeHTML(table.tableName) + '" aria-label="Table name" />' +
      '<input class="staff-input" data-table-field="areaName" value="' + escapeHTML(table.areaName || "") + '" aria-label="Area" placeholder="Area" />' +
      '<input class="staff-input" data-table-field="displayOrder" type="number" min="0" value="' + escapeHTML(table.displayOrder) + '" aria-label="Display order" />' +
      '<input class="staff-input" data-table-field="capacity" type="number" min="1" max="100" value="' + escapeHTML(table.capacity ?? "") + '" aria-label="Capacity" placeholder="Capacity" />' +
      '<select class="staff-input" data-table-field="operationalStatus" aria-label="Operational status">' +
        '<option value="active"' + (table.operationalStatus === "active" ? " selected" : "") + '>Active</option>' +
        '<option value="maintenance"' + (table.operationalStatus === "maintenance" ? " selected" : "") + '>Maintenance</option>' +
        '<option value="cleaning"' + (table.operationalStatus === "cleaning" ? " selected" : "") + '>Cleaning</option>' +
      '</select>' +
      '<label class="staff-table-master-active"><input type="checkbox" data-table-field="isActive"' + (table.isActive ? " checked" : "") + ' /> Enabled</label>' +
      '<div class="staff-actions">' +
        '<button class="staff-btn" type="button" data-staff-save-table="' + id + '">Save</button>' +
        '<button class="staff-btn secondary" type="button" data-staff-table-qr="' + id + '">QR Link</button>' +
        '<button class="staff-btn secondary" type="button" data-staff-table-qr-rotate="' + id + '">Rotate QR</button>' +
        '<button class="staff-btn danger" type="button" data-staff-table-qr-revoke="' + id + '">Revoke QR</button>' +
      '</div>' +
    '</article>';
  }).join("");
}

async function loadStaffTableMaster() {
  const list = $("#staffTableMasterList");
  if (list) {
    list.className = "staff-table-master-list staff-empty is-loading";
    list.textContent = "Loading configured tables...";
  }

  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables");
    STAFF_STATE.tableMaster = Array.isArray(result.tables) ? result.tables : [];
    STAFF_STATE.tableMasterLoaded = true;
    const enforcement = $("#staffTableMasterEnforcementInput");
    if (enforcement) enforcement.checked = getStaffTableOrderingState().enforceTableMaster;
    renderStaffTableMaster();
  } catch (error) {
    STAFF_STATE.tableMasterLoaded = false;
    if (list) {
      list.className = "staff-table-master-list staff-empty";
      list.textContent = error.message || "Table management could not be loaded.";
    }
  }
}

function tableMasterFormPayload(form) {
  const data = new FormData(form);
  return {
    tableCode: String(data.get("tableCode") || "").trim(),
    tableName: String(data.get("tableName") || "").trim(),
    areaName: String(data.get("areaName") || "").trim(),
    displayOrder: Number(data.get("displayOrder") || 0),
    capacity: String(data.get("capacity") || "").trim() || null,
    operationalStatus: "active",
    isActive: true
  };
}

async function handleAddRestaurantTable(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  setStaffActionBusyState(button, true);
  setStaffTableMasterStatus("Creating table...", "muted");
  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tableMasterFormPayload(form))
    });
    form.reset();
    setStaffTableMasterStatus(result.message || "Table created.", "success");
    await Promise.all([loadStaffTableMaster(), loadStaffTableActivity({ silent: true })]);
  } catch (error) {
    setStaffTableMasterStatus(error.message || "Table could not be created.", "warning");
  } finally {
    setStaffActionBusyState(button, false);
  }
}

function updateBulkTablePreview() {
  const form = $("#staffBulkTableForm");
  const preview = $("#staffBulkTablePreview");
  if (!form || !preview) return;
  const data = new FormData(form);
  const prefix = String(data.get("prefix") || "");
  const start = Number(data.get("start") || 0);
  const end = Number(data.get("end") || 0);
  const count = Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start + 1 : 0;
  preview.textContent = count > 0
    ? "Preview: " + prefix + start + " through " + prefix + end + " (" + count + " tables)"
    : "Enter a valid start and end range.";
}

async function handleBulkRestaurantTables(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = {
    prefix: String(data.get("prefix") || "").trim(),
    start: Number(data.get("start")),
    end: Number(data.get("end")),
    areaName: String(data.get("areaName") || "").trim(),
    capacity: String(data.get("capacity") || "").trim() || null
  };
  const count = payload.end - payload.start + 1;
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    setStaffTableMasterStatus("Bulk range must contain between 1 and 500 tables.", "warning");
    return;
  }
  if (!window.confirm("Create up to " + count + " hotel-scoped tables? Existing codes will be skipped.")) return;

  const button = form.querySelector('button[type="submit"]');
  setStaffActionBusyState(button, true);
  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setStaffTableMasterStatus(result.message || "Bulk table creation complete.", "success");
    await Promise.all([loadStaffTableMaster(), loadStaffTableActivity({ silent: true })]);
  } catch (error) {
    setStaffTableMasterStatus(error.message || "Bulk table creation failed.", "warning");
  } finally {
    setStaffActionBusyState(button, false);
  }
}

async function saveRestaurantTable(tableId = "") {
  const row = document.querySelector('[data-staff-table-master-row="' + tableId + '"]');
  const current = STAFF_STATE.tableMaster.find((table) => String(table.id) === String(tableId));
  if (!row || !current) return;

  const value = (field) => row.querySelector('[data-table-field="' + field + '"]');
  const payload = {
    tableCode: value("tableCode")?.value || "",
    tableName: value("tableName")?.value || "",
    areaName: value("areaName")?.value || "",
    displayOrder: Number(value("displayOrder")?.value || 0),
    capacity: String(value("capacity")?.value || "").trim() || null,
    operationalStatus: value("operationalStatus")?.value || "active",
    isActive: value("isActive")?.checked === true,
    rowVersion: current.rowVersion
  };

  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/" + encodeURIComponent(tableId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setStaffTableMasterStatus(result.message || "Table updated.", "success");
    await Promise.all([loadStaffTableMaster(), loadStaffTableActivity({ silent: true })]);
  } catch (error) {
    setStaffTableMasterStatus(error.message || "Table could not be updated.", "warning");
  }
}

async function copyRestaurantTableQrLink(url = "", promptTitle = "Copy this QR link") {
  const link = String(url || "").trim();
  if (!link) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch (error) {
      console.warn("Table QR link clipboard copy failed; showing manual copy dialog:", error);
    }
  }

  window.prompt(promptTitle, link);
  return false;
}

async function generateRestaurantTableQr(tableId = "") {
  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/" + encodeURIComponent(tableId) + "/qr", {
      method: "POST"
    });
    const copied = await copyRestaurantTableQrLink(result.url, "Copy this canonical QR link");
    if (copied) {
      setStaffTableMasterStatus("Canonical QR link copied for Table " + result.table.tableCode + ".", "success");
    } else {
      setStaffTableMasterStatus("Canonical QR link ready for Table " + result.table.tableCode + ". Copy it from the dialog.", "success");
    }
  } catch (error) {
    if (error?.code === "QR_TOKEN_ROTATION_REQUIRED") {
      const rotateNow = window.confirm(
        "This saved QR link cannot be copied after the server security key changed. Rotate it now? The old printed QR will stop working and must be reprinted."
      );
      if (rotateNow) {
        await rotateRestaurantTableQr(tableId, { skipConfirmation: true });
      } else {
        setStaffTableMasterStatus(error.message, "warning");
      }
      return;
    }
    setStaffTableMasterStatus(error.message || "QR link could not be generated.", "warning");
  }
}

async function saveTableMasterEnforcement() {
  const enabled = $("#staffTableMasterEnforcementInput")?.checked === true;
  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/table-master/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enforceTableMaster: enabled })
    });
    STAFF_STATE.tableOrdering = {
      ...getStaffTableOrderingState(),
      enforceTableMaster: result.enforceTableMaster === true
    };
    setStaffTableMasterStatus(result.message || "Table enforcement updated.", "success");
  } catch (error) {
    const input = $("#staffTableMasterEnforcementInput");
    if (input) input.checked = !enabled;
    setStaffTableMasterStatus(error.message || "Table enforcement could not be updated.", "warning");
  }
}

async function rotateRestaurantTableQr(tableId = "", { skipConfirmation = false } = {}) {
  if (
    !skipConfirmation &&
    !window.confirm("Rotate this table QR now? The currently printed QR will stop working and must be reprinted.")
  ) return;
  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/" + encodeURIComponent(tableId) + "/qr/rotate", {
      method: "POST"
    });
    const copied = await copyRestaurantTableQrLink(result.url, "Copy and reprint this new secure QR link");
    setStaffTableMasterStatus(
      copied
        ? "New secure QR link copied. Reprint Table " + result.table.tableCode + " now."
        : "New secure QR link ready. Copy it from the dialog and reprint Table " + result.table.tableCode + " now.",
      "warning"
    );
  } catch (error) {
    setStaffTableMasterStatus(error.message || "QR link could not be rotated.", "warning");
  }
}

async function revokeRestaurantTableQr(tableId = "") {
  if (!window.confirm("Revoke QR ordering for this table? The printed QR will stop working immediately.")) return;
  try {
    const result = await staffFetchJson(STAFF_API_BASE + "/tables/" + encodeURIComponent(tableId) + "/qr/revoke", {
      method: "POST"
    });
    setStaffTableMasterStatus(result.message || "Table QR revoked.", "success");
  } catch (error) {
    setStaffTableMasterStatus(error.message || "QR link could not be revoked.", "warning");
  }
}
function setStaffTableOrderDetailNotice(message = "", tone = "success") {
  STAFF_STATE.tableOrderDetailNotice = String(message || "").trim();
  const status = $("#staffTakeOrderDetailStatus");
  if (!status) return;

  status.hidden = !STAFF_STATE.tableOrderDetailNotice;
  status.textContent = STAFF_STATE.tableOrderDetailNotice;
  status.className = `staff-orders-action-status${tone === "success" ? "" : ` is-${tone}`}`;
}

function renderStaffTableOrderDetail() {
  const workspace = $("#staffTakeOrderTableWorkspace");
  const panel = $("#staffTakeOrderDetailPanel");
  const content = $("#staffTakeOrderDetailContent");
  const heading = $("#staffTakeOrderDetailHeading");
  if (!workspace || !panel || !content) return;

  const order = STAFF_STATE.selectedTableOrder;
  const orderId = String(STAFF_STATE.selectedTableOrderId || "");
  const isOpen = !!orderId;

  workspace.classList.toggle("has-detail", isOpen);
  panel.hidden = !isOpen;
  if (!isOpen) {
    content.innerHTML = "";
    setStaffTableOrderDetailNotice("");
    return;
  }

  if (heading) {
    heading.textContent = order
      ? `Table ${order.tableNumber || STAFF_STATE.selectedTableNumber || ""} - Order #${orderId}`
      : `Loading order #${orderId}`;
  }

  if (!order) {
    content.className = "staff-take-order-detail-content is-loading";
    content.setAttribute("role", "status");
    content.textContent = "Loading selected order details...";
    return;
  }

  STAFF_STATE.expandedOrderIds.add(orderId);
  content.className = "staff-take-order-detail-content";
  content.removeAttribute("role");
  content.innerHTML = buildStaffOrderCard(order);
  const details = content.querySelector("[data-staff-order-details]");
  if (details) details.open = true;

  const activeStatuses = getStaffTableActivityFilterStatuses();
  if (
    STAFF_STATE.tableActivityStatus !== "all" &&
    !activeStatuses.includes(normalizeStatus(order.status))
  ) {
    setStaffTableOrderDetailNotice(
      `This order no longer belongs to the ${getStaffRecordStatusLabel(STAFF_STATE.tableActivityStatus, "order")} filter. It will remain open until you return to the table list.`,
      "warning"
    );
  } else if (STAFF_STATE.tableOrderDetailNotice) {
    setStaffTableOrderDetailNotice(STAFF_STATE.tableOrderDetailNotice);
  }

  panel.scrollTop = Number(STAFF_STATE.tableOrderDetailScrollTop || 0);
}

function getStaffSelectedTableOrderRenderSignature(order = null) {
  return order ? JSON.stringify(order) : "";
}

async function loadSelectedStaffTableOrder({ announceConflict = false, silent = false } = {}) {
  const orderId = String(STAFF_STATE.selectedTableOrderId || "").trim();
  if (!orderId) return null;

  if (staffSelectedTableOrderRequestController) {
    staffSelectedTableOrderRequestController.abort();
  }
  const requestController = new AbortController();
  staffSelectedTableOrderRequestController = requestController;
  const previousRenderSignature = STAFF_STATE.selectedTableOrderRenderSignature;
  const params = new URLSearchParams();
  if (STAFF_STATE.selectedTableNumber) {
    params.set("tableNumber", STAFF_STATE.selectedTableNumber);
  }

  try {
    const query = params.toString();
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/orders/table-activity/${encodeURIComponent(orderId)}${query ? `?${query}` : ""}`,
      { signal: requestController.signal }
    );
    if (
      requestController.signal.aborted ||
      String(STAFF_STATE.selectedTableOrderId) !== orderId
    ) {
      return null;
    }
    const nextOrder = result.order || null;
    const nextRenderSignature = getStaffSelectedTableOrderRenderSignature(nextOrder);
    STAFF_STATE.selectedTableOrder = nextOrder;
    STAFF_STATE.selectedTableOrderRenderSignature = nextRenderSignature;
    if (!silent || nextRenderSignature !== previousRenderSignature) {
      renderStaffTableOrderDetail();
    }
    if (announceConflict) {
      setStaffTableOrderDetailNotice(
        "This order was updated by another staff member. The latest order details have been loaded.",
        "warning"
      );
    }
    return STAFF_STATE.selectedTableOrder;
  } catch (error) {
    if (error?.name === "AbortError") return null;
    if (String(STAFF_STATE.selectedTableOrderId) !== orderId) return null;
    console.error("Selected table order load failed:", error);
    if (!silent) {
      const content = $("#staffTakeOrderDetailContent");
      if (content) {
        content.className = "staff-take-order-detail-content staff-empty";
        content.innerHTML = `${escapeHTML(error.message || "The selected order could not be loaded.")} <button class="staff-btn secondary" type="button" data-staff-retry-selected-table-order>Retry</button>`;
      }
    }
    throw error;
  } finally {
    if (staffSelectedTableOrderRequestController === requestController) {
      staffSelectedTableOrderRequestController = null;
    }
  }
}

function closeStaffTableOrderDetail({ restoreFocus = true } = {}) {
  const orderId = String(STAFF_STATE.selectedTableOrderId || "");
  STAFF_STATE.tableOrderDetailScrollTop = $("#staffTakeOrderDetailPanel")?.scrollTop || 0;
  if (staffSelectedTableOrderRequestController) {
    staffSelectedTableOrderRequestController.abort();
    staffSelectedTableOrderRequestController = null;
  }
  STAFF_STATE.selectedTableOrderId = "";
  STAFF_STATE.selectedTableNumber = "";
  STAFF_STATE.selectedTableOrder = null;
  STAFF_STATE.selectedTableOrderRenderSignature = "";
  STAFF_STATE.tableOrderDetailNotice = "";
  renderStaffTableActivity();
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: STAFF_STATE.tableActivityScrollTop || 0, behavior: "auto" });
    if (restoreFocus && orderId) {
      const safeId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(orderId)
        : orderId.replace(/[^a-zA-Z0-9_-]/g, "");
      document.querySelector(`[data-staff-open-table-order="${safeId}"]`)?.focus({ preventScroll: true });
    }
  });
}

async function openStaffOrderFromTableActivity(
  orderId = "",
  { confirmedOrder = null } = {}
) {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) return;

  const activeOrder = STAFF_STATE.tableActivity.find(
    (order) => String(order.id) === normalizedOrderId
  );
  const conflictOrder =
    String(STAFF_STATE.tableOrderConflict?.id || "") === normalizedOrderId
      ? STAFF_STATE.tableOrderConflict
      : null;
  if (STAFF_STATE.tableOrderSubview !== "tables") {
    showStaffTakeOrderSubview("tables", { focus: false });
  }
  STAFF_STATE.tableActivityScrollTop = window.scrollY;
  STAFF_STATE.selectedTableOrderId = normalizedOrderId;
  const confirmedDetail =
    String(confirmedOrder?.id || "") === normalizedOrderId ? confirmedOrder : null;
  STAFF_STATE.selectedTableNumber = String(
    confirmedDetail?.tableNumber ||
      activeOrder?.tableNumber ||
      conflictOrder?.tableNumber ||
      ""
  ).trim();
  STAFF_STATE.selectedTableOrder = confirmedDetail;
  STAFF_STATE.selectedTableOrderRenderSignature =
    getStaffSelectedTableOrderRenderSignature(confirmedDetail);
  STAFF_STATE.tableOrderDetailScrollTop = 0;
  STAFF_STATE.tableOrderDetailNotice = "";
  renderStaffTableActivity();

  window.requestAnimationFrame(() => {
    $("#staffTakeOrderDetailPanel")?.focus({ preventScroll: true });
  });

  try {
    await loadSelectedStaffTableOrder({ silent: Boolean(confirmedDetail) });
  } catch (error) {
    // The detail panel owns the isolated retry state.
  }
}
function renderStaffTableOrderMenuFilters({ visibleCount = null } = {}) {
  const categoryFilter = $("#staffTableOrderCategoryFilter");
  const categoryPills = $("#staffTableOrderCategoryPills");
  const searchInput = $("#staffTableOrderSearchInput");
  const summary = $("#staffTableOrderFilterSummary");
  const categories = getStaffTableOrderAvailableCategories();

  if (
    STAFF_STATE.tableOrderMenuCategory !== "all" &&
    !categories.includes(STAFF_STATE.tableOrderMenuCategory)
  ) {
    STAFF_STATE.tableOrderMenuCategory = "all";
  }

  if (searchInput && searchInput.value !== STAFF_STATE.tableOrderMenuQuery) {
    searchInput.value = STAFF_STATE.tableOrderMenuQuery;
  }

  if (categoryFilter) {
    categoryFilter.innerHTML = [
      '<option value="all">All categories</option>',
      ...categories.map(
        (category) =>
          `<option value="${escapeHTML(category)}">${escapeHTML(getStaffTableOrderCategoryLabel(category))}</option>`
      )
    ].join("");

    categoryFilter.value = STAFF_STATE.tableOrderMenuCategory;
  }

  if (categoryPills) {
    const categoryCounts = STAFF_STATE.tableOrderMenu.reduce((counts, item) => {
      const category = String(item.category || "others").trim() || "others";
      counts[category] = Number(counts[category] || 0) + 1;
      return counts;
    }, {});
    const pillItems = [
      { value: "all", label: "All Items", count: STAFF_STATE.tableOrderMenu.length },
      ...categories.map((category) => ({
        value: category,
        label: getStaffTableOrderCategoryLabel(category),
        count: categoryCounts[category] || 0
      }))
    ];

    categoryPills.innerHTML = pillItems.map((item) => {
      const isActive = item.value === STAFF_STATE.tableOrderMenuCategory;
      return `
        <button
          class="staff-table-order-category-pill${isActive ? " is-active" : ""}"
          type="button"
          data-staff-table-order-category="${escapeHTML(item.value)}"
          aria-pressed="${String(isActive)}"
        >
          ${escapeHTML(item.label)} <span>${escapeHTML(item.count)}</span>
        </button>
      `;
    }).join("");
  }

  if (summary) {
    const filteredCount = getFilteredStaffTableOrderMenuItems().length;
    const totalCount = STAFF_STATE.tableOrderMenu.length;
    const activeCategory =
      STAFF_STATE.tableOrderMenuCategory === "all"
        ? "All categories"
        : getStaffTableOrderCategoryLabel(STAFF_STATE.tableOrderMenuCategory);
    const trimmedQuery = String(STAFF_STATE.tableOrderMenuQuery || "").trim();
    const normalizedVisibleCount = Number.isFinite(Number(visibleCount))
      ? Math.max(0, Number(visibleCount))
      : filteredCount;
    const countLabel =
      normalizedVisibleCount < filteredCount
        ? `Showing ${normalizedVisibleCount} of ${filteredCount} matches (${totalCount} total)`
        : `${filteredCount} of ${totalCount} items`;
    const bits = [countLabel, activeCategory];

    if (trimmedQuery) {
      bits.push(`Search: "${trimmedQuery}"`);
    }

    summary.textContent = bits.join(" | ");
  }
}

function resetStaffTableOrderMenuRenderLimit() {
  STAFF_STATE.tableOrderMenuRenderLimit = STAFF_TABLE_ORDER_RENDER_BATCH_SIZE;
}

function setStaffTableOrderMenuCategory(category = "all") {
  STAFF_STATE.tableOrderMenuCategory = String(category || "all").trim() || "all";
  resetStaffTableOrderMenuRenderLimit();
  renderStaffTableOrderMenu();
}

function buildStaffTableOrderMenuItemMarkup(item = {}) {
  const qty = getStaffTableOrderItemQty(item.id);
  const metaParts = [
    item.category,
    item.badge || (item.itemType === "combo" ? "Combo" : ""),
    item.tag
  ].filter(Boolean);
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
    <article class="staff-table-order-item" role="listitem" data-staff-table-order-menu-item="${escapeHTML(item.id)}">
      <div class="staff-table-order-item-head">
        <div>
          <h4 class="staff-table-order-item-title">${escapeHTML(item.name)}</h4>
          ${metaParts.length ? `<p class="staff-table-order-item-meta">${escapeHTML(metaParts.join(" / "))}</p>` : ""}
        </div>
        <span class="staff-table-order-item-price">${escapeHTML(formatMoney(item.price))}</span>
      </div>
      ${item.desc ? `<p class="staff-table-order-item-meta is-description">${escapeHTML(item.desc)}</p>` : ""}
      ${comboSummary ? `<p class="staff-table-order-item-meta">Includes: ${escapeHTML(comboSummary)}</p>` : ""}
      ${
        showComboSavings
          ? `<p class="staff-table-order-item-meta">Was ${escapeHTML(formatMoney(item.originalPrice || 0))} | Save ${escapeHTML(formatMoney(item.savings || 0))}</p>`
          : ""
      }
      <div class="staff-table-order-qty" aria-label="Quantity for ${escapeHTML(item.name)}">
        <button class="staff-btn secondary" type="button" data-staff-table-order-minus="${escapeHTML(item.id)}" aria-label="Remove one ${escapeHTML(item.name)}" ${qty <= 0 ? "disabled" : ""}>-</button>
        <span class="staff-table-order-qty-value" aria-live="polite">${escapeHTML(qty)}</span>
        <button class="staff-btn secondary" type="button" data-staff-table-order-plus="${escapeHTML(item.id)}" aria-label="Add one ${escapeHTML(item.name)}">+</button>
      </div>
    </article>
  `;
}

function renderStaffTableOrderMenu() {
  const content = $("#staffTableOrderMenuContent");
  if (!content) return;

  if (!STAFF_STATE.tableOrderMenuLoaded) {
    content.className = "staff-empty";
    content.removeAttribute("role");
    content.textContent = "Open this view to load the menu.";
    return;
  }

  if (!STAFF_STATE.tableOrderMenu.length) {
    content.className = "staff-empty";
    content.removeAttribute("role");
    content.textContent = "No available menu items found for this hotel.";
    renderStaffTableOrderMenuFilters();
    return;
  }

  const filteredItems = getFilteredStaffTableOrderMenuItems();
  const renderLimit = Math.max(
    STAFF_TABLE_ORDER_RENDER_BATCH_SIZE,
    Number(STAFF_STATE.tableOrderMenuRenderLimit || 0)
  );
  const visibleItems = filteredItems.slice(0, renderLimit);
  renderStaffTableOrderMenuFilters({ visibleCount: visibleItems.length });

  if (!filteredItems.length) {
    const detailBits = [];

    if (STAFF_STATE.tableOrderMenuCategory !== "all") {
      detailBits.push(getStaffTableOrderCategoryLabel(STAFF_STATE.tableOrderMenuCategory));
    }

    if (String(STAFF_STATE.tableOrderMenuQuery || "").trim()) {
      detailBits.push(`search "${String(STAFF_STATE.tableOrderMenuQuery || "").trim()}"`);
    }

    content.className = "staff-empty";
    content.removeAttribute("role");
    content.textContent = detailBits.length
      ? `No menu items match ${detailBits.join(" and ")}.`
      : "No menu items match the current filters.";
    return;
  }

  const remainingCount = Math.max(0, filteredItems.length - visibleItems.length);
  content.className = "staff-table-order-menu-grid";
  content.setAttribute("role", "list");
  content.innerHTML = [
    ...visibleItems.map((item) => buildStaffTableOrderMenuItemMarkup(item)),
    remainingCount
      ? `
        <div class="staff-table-order-load-more">
          <button
            class="staff-btn secondary"
            type="button"
            data-staff-table-order-load-more
            aria-label="Show ${Math.min(STAFF_TABLE_ORDER_RENDER_BATCH_SIZE, remainingCount)} more menu items"
          >
            Show more items (${remainingCount} remaining)
          </button>
        </div>
      `
      : ""
  ].join("");
}

function renderStaffTableOrderCart() {
  const summary = $("#staffTableOrderCartSummary");
  if (!summary) return;

  const entries = getStaffTableOrderCartEntries();
  syncStaffTakeOrderProgress();
  renderStaffTableOrderMobileCart(entries);
  const ordering = getStaffTableOrderingState();
  const status = $("#staffTableOrderStatus");

  if (!entries.length) {
    summary.innerHTML = `<p class="staff-empty">No items selected.</p>`;
    setStaffTableOrderSubmitDisabled(true);
    if (!ordering.staffOrderingEnabled) {
      setStaffTableOrderStatus(getStaffTableOrderingDisabledMessage(), "warning");
      if (status) {
        status.dataset.orderingDisabled = "true";
      }
    } else if (status?.dataset.orderingDisabled === "true") {
      delete status.dataset.orderingDisabled;
      setStaffTableOrderStatus("");
    }
    return;
  }

  summary.innerHTML = `
    <ul class="staff-table-order-cart-list">
      ${entries.map((item) => `
        <li class="staff-table-order-cart-row">
          <div>
            <span>${escapeHTML(item.name)} x${escapeHTML(item.qty)}</span>
            ${buildStaffTableOrderCartMetaMarkup(item)}
            <label class="staff-table-order-item-note-label">
              Kitchen note for ${escapeHTML(item.name)}
              <input class="staff-input" type="text" maxlength="500" value="${escapeHTML(item.note || "")}" data-staff-table-order-item-note="${escapeHTML(item.id)}" placeholder="Optional, e.g. less spicy" />
            </label>
          </div>
          <strong>${escapeHTML(formatMoney(item.lineTotal))}</strong>
        </li>
      `).join("")}
    </ul>
    <div class="staff-table-order-cart-total">
      <span>Subtotal</span>
      <strong>${escapeHTML(formatMoney(getStaffTableOrderCartTotal(entries)))}</strong>
    </div>
    ${STAFF_STATE.tableOrderMode === "add" && STAFF_STATE.tableOrderTarget && canStaffViewOrderFinancials(STAFF_STATE.tableOrderTarget) ? `
      <div class="staff-table-order-addition-totals" aria-label="Order total estimate">
        <span>Existing order <strong>${escapeHTML(formatMoney(getStaffOrderTotal(STAFF_STATE.tableOrderTarget)))}</strong></span>
        <span>New items <strong>${escapeHTML(formatMoney(getStaffTableOrderCartTotal(entries)))}</strong></span>
        <span>Estimated updated total <strong>${escapeHTML(formatMoney(getStaffOrderTotal(STAFF_STATE.tableOrderTarget) + getStaffTableOrderCartTotal(entries)))}</strong></span>
        <small>The backend will validate current prices and return the trusted final total.</small>
      </div>
    ` : ""}
  `;

  if (!ordering.staffOrderingEnabled) {
    setStaffTableOrderSubmitDisabled(true);
    setStaffTableOrderStatus(getStaffTableOrderingDisabledMessage(), "warning");
    if (status) {
      status.dataset.orderingDisabled = "true";
    }
    return;
  }

  if (status?.dataset.orderingDisabled === "true") {
    delete status.dataset.orderingDisabled;
    setStaffTableOrderStatus("");
  }

  setStaffTableOrderSubmitDisabled(false);
}

function buildStaffTableOrderCartMetaMarkup(item = {}) {
  const lines = buildStaffOrderItemMetaLines(item);
  if (!lines.length) {
    return "";
  }

  return `<div class="staff-table-order-cart-meta">${lines.map((line) => escapeHTML(line)).join("<br>")}</div>`;
}

async function loadStaffTableOrderMenu({ silent = false } = {}) {
  try {
    if (!silent) {
      setStaffTableOrderMenuLoading();
      setStaffSectionLastUpdated("#staffTableOrderLastUpdated", "Refreshing menu...");
    }

    const result = await staffFetchJson(`${STAFF_API_BASE}/menu`);
    const nextMenu = Array.isArray(result.items)
      ? result.items.map(normalizeStaffTableOrderMenuItem).filter(Boolean)
      : [];
    const nextCategories = Array.isArray(result.categories)
      ? result.categories.filter((category) => category && category.key && category.name)
      : [];
    const nextMenuVersion =
      String(result.menuVersion || "").trim() ||
      JSON.stringify(nextMenu.map((item) => [item.id, item.price, item.category, item.itemType]));
    const menuChanged =
      !STAFF_STATE.tableOrderMenuLoaded ||
      nextMenuVersion !== STAFF_STATE.tableOrderMenuVersion;
    STAFF_STATE.tableOrderMenu = nextMenu;
    STAFF_STATE.tableOrderMenuCategories = nextCategories;
    STAFF_STATE.tableOrderMenuVersion = nextMenuVersion;
    STAFF_STATE.tableOrderMenuLoaded = true;
    if (menuChanged) {
      resetStaffTableOrderMenuRenderLimit();
      renderStaffTableOrderMenu();
      renderStaffTableOrderCart();
      renderStaffRoomServiceMenuOptions();
      renderStaffRoomServiceCart();
    }
    setStaffSectionLastUpdated("#staffTableOrderLastUpdated", getStaffLastUpdatedLabel());
  } catch (error) {
    console.error("Staff table order menu load failed:", error);
    STAFF_STATE.tableOrderMenuLoaded = true;
    const content = $("#staffTableOrderMenuContent");
    if (content) {
      content.className = "staff-empty";
      content.textContent = error.message || "Failed to load menu.";
    }
    setStaffSectionLastUpdated("#staffTableOrderLastUpdated", "Menu load failed");
  }
}

function clearStaffTableOrderForm({ keepStatus = false } = {}) {
  $("#staffTableOrderForm")?.reset();
  const tableInput = $("#staffTableOrderTableInput");
  if (tableInput) {
    tableInput.readOnly = false;
    delete tableInput.dataset.restaurantTableId;
  }
  STAFF_STATE.selectedRestaurantTableId = "";
  STAFF_STATE.tableOrderCart = {};
  STAFF_STATE.tableOrderItemNotes = {};
  STAFF_STATE.tableOrderIdempotencyKey = "";
  setStaffTableOrderConflict(null);
  renderStaffTableOrderMenu();
  renderStaffTableOrderCart();
  syncStaffTakeOrderProgress();

  if (!keepStatus) {
    setStaffTableOrderStatus("");
  }
}

async function ensureStaffRoomServiceMenuLoaded() {
  if (STAFF_STATE.tableOrderMenuLoaded && STAFF_STATE.tableOrderMenu.length) {
    renderStaffRoomServiceMenuOptions();
    return true;
  }

  await loadStaffTableOrderMenu({ silent: true });
  renderStaffRoomServiceMenuOptions();
  return STAFF_STATE.tableOrderMenu.length > 0;
}

async function handleStaffRoomServiceOrderSubmit(event) {
  event.preventDefault();

  const form = $("#staffRoomServiceOrderForm");
  const submitButton = $("#staffRoomServiceSubmitBtn");
  const roomBookingId = String($("#staffRoomServiceBookingInput")?.value || "").trim();
  const entries = getStaffRoomServiceCartEntries();
  const chargeToRoom = $("#staffRoomServiceChargeToRoomInput")?.checked === true;
  const paymentMethod = chargeToRoom
    ? "Room Bill"
    : String($("#staffRoomServicePaymentMethodInput")?.value || "COD").trim() || "COD";
  const note = String($("#staffRoomServiceNoteInput")?.value || "").trim();

  if (!form || !roomBookingId) {
    setStaffRoomServiceStatus("Select a checked-in room booking.", true);
    return;
  }

  if (!entries.length) {
    setStaffRoomServiceStatus("Add at least one menu item.", true);
    return;
  }

  setStaffActionBusyState(submitButton, true);
  setStaffRoomServiceStatus("Creating room service order...", false);

  try {
    await staffFetchJson(`${STAFF_API_BASE}/room-service-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomBookingId,
        paymentMethod,
        chargeToRoom,
        note,
        items: entries.map((item) => ({
          id: item.id,
          qty: item.qty,
          ...(item.note ? { note: item.note } : {})
        }))
      })
    });

    clearStaffRoomServiceForm({ keepStatus: true });
    setStaffRoomServiceStatus("Room service order saved.", false);
    await Promise.all([
      loadStaffOrders({ silent: true }),
      STAFF_STATE.kdsOrdersLoaded ? loadStaffKdsOrders({ silent: true }) : Promise.resolve()
    ]);
  } catch (error) {
    console.error("Staff room service order submit failed:", error);
    setStaffRoomServiceStatus(error.message || "Failed to create room service order.", true);
  } finally {
    setStaffActionBusyState(submitButton, false);
  }
}

async function submitStaffOrderItemAddition({ tableNumber, note, entries }) {
  const target = STAFF_STATE.tableOrderTarget;
  const orderId = String(target?.id || "").trim();
  if (!orderId || target?.canAddItems !== true) {
    setStaffTableOrderStatus(target?.addItemsBlockedReason || "This order is no longer open for additional items.", "warning");
    return;
  }

  const idempotencyKey = STAFF_STATE.tableOrderIdempotencyKey || createStaffOrderAdditionIdempotencyKey();
  STAFF_STATE.tableOrderIdempotencyKey = idempotencyKey;
  setStaffTableOrderSubmitBusy(true);
  setStaffTableOrderStatus("Adding the new round and sending only these items to kitchen...", "muted");

  try {
    const result = await staffFetchJson(`${STAFF_API_BASE}/orders/${encodeURIComponent(orderId)}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        tableNumber,
        expectedVersion: Math.max(1, Number(target.version || 1)),
        note,
        items: entries.map((item) => ({
          id: item.id,
          qty: item.qty,
          ...(item.note ? { note: item.note } : {})
        }))
      })
    });

    const updatedOrder = result.order || null;
    const roundSequence = Number(result.round?.sequence || 0);
    resetStaffTableOrderAdditionMode();
    clearStaffTableOrderForm({ keepStatus: true });
    closeStaffTableOrderMobileSheet();
    showStaffTakeOrderSubview("tables", { focus: false });
    await Promise.all([
      loadStaffTableActivity({ silent: true }),
      loadStaffOrders({ silent: true }),
      STAFF_STATE.kdsOrdersLoaded ? loadStaffKdsOrders({ silent: true }) : Promise.resolve()
    ]);
    if (updatedOrder?.id) {
      await openStaffOrderFromTableActivity(updatedOrder.id);
      setStaffTableOrderDetailNotice(
        result.duplicate
          ? "This request was already completed; no duplicate items or KOT were created."
          : `Round ${roundSequence || "added"} was sent to kitchen with new items only.`,
        "success"
      );
      if (roundSequence >= 2) {
        window.requestAnimationFrame(() => {
          document.querySelector(`[data-order-round="${roundSequence}"]`)?.focus({ preventScroll: false });
        });
      }
    }
  } catch (error) {
    console.error("Staff active order item addition failed:", error);
    const conflictCodes = new Set([
      "ORDER_VERSION_CONFLICT", "TABLE_CHANGED", "ORDER_CLOSED", "PAYMENT_LOCKED", "BILLING_LOCKED"
    ]);
    if (error?.status === 409 && conflictCodes.has(error.responseData?.code)) {
      await loadSelectedStaffTableOrder({ announceConflict: true }).catch(() => {});
      if (STAFF_STATE.selectedTableOrder) {
        STAFF_STATE.tableOrderTarget = { ...STAFF_STATE.selectedTableOrder };
        syncStaffTableOrderMode();
      }
      setStaffTableOrderStatus(
        `${error.message || "The order changed."} Your new-items cart is preserved for review.`,
        "warning"
      );
      return;
    }
    if (isStaffTableOrderItemValidationError(error)) {
      await loadStaffTableOrderMenu({ silent: true });
    }
    setStaffTableOrderStatus(error.message || "The new items could not be added.", "warning");
  } finally {
    setStaffTableOrderSubmitBusy(false);
    setStaffTableOrderSubmitDisabled(!getStaffTableOrderCartEntries().length);
  }
}

async function handleStaffTableOrderSubmit(event) {
  event.preventDefault();

  const form = $("#staffTableOrderForm");
  const tableNumber = String($("#staffTableOrderTableInput")?.value || "").trim();
  const customerName = String($("#staffTableOrderCustomerNameInput")?.value || "").trim();
  const customerPhone = String($("#staffTableOrderCustomerPhoneInput")?.value || "").trim();
  const note = String($("#staffTableOrderNoteInput")?.value || "").trim();
  const entries = getStaffTableOrderCartEntries();

  if (!form || !tableNumber) {
    setStaffTableOrderStatus("Table number is required.", "warning");
    return;
  }

  if (!entries.length) {
    setStaffTableOrderStatus("Add at least one menu item.", "warning");
    return;
  }

  if (STAFF_STATE.tableOrderMode === "add") {
    await submitStaffOrderItemAddition({ tableNumber, note, entries });
    return;
  }

  setStaffTableOrderSubmitBusy(true);
  setStaffTableOrderConflict(null);
  setStaffTableOrderStatus("Checking table availability...", "muted");

  try {
    const availability = await checkStaffTableOrderAvailability(tableNumber);

    if (availability.hasActiveOrder && availability.activeOrder) {
      showStaffTableOrderConflict(availability.activeOrder, tableNumber);
      return;
    }

    setStaffTableOrderStatus("Placing order...", "muted");
    const createResult = await staffFetchJson(`${STAFF_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tableNumber,
        ...(STAFF_STATE.selectedRestaurantTableId
          ? { restaurantTableId: STAFF_STATE.selectedRestaurantTableId }
          : {}),
        customerName,
        customerPhone,
        note,
        items: entries.map((item) => ({
          id: item.id,
          qty: item.qty
        }))
      })
    });

    const createdOrder = createResult.order || null;
    clearStaffTableOrderForm({ keepStatus: true });
    closeStaffTableOrderMobileSheet();
    setStaffTableOrderStatus("Order saved.", "success");
    showStaffTakeOrderSubview("tables", { focus: false });
    await Promise.all([
      loadStaffTableActivity(),
      loadStaffOrders({ silent: true }),
      STAFF_STATE.kdsOrdersLoaded ? loadStaffKdsOrders({ silent: true }) : Promise.resolve()
    ]);
    if (createdOrder?.id) {
      await openStaffOrderFromTableActivity(createdOrder.id, {
        confirmedOrder: createdOrder
      });
      setStaffTableOrderDetailNotice("Order created successfully.", "success");
    }
  } catch (error) {
    console.error("Staff table order submit failed:", error);
    if (isStaffOrderingDisabledApiError(error)) {
      setStaffTableOrderStatus(getStaffOrderingDisabledStatusMessage(error), "warning");
      return;
    }

    if (isStaffTableOrderConflictError(error)) {
      showStaffTableOrderConflict(error.responseData?.activeOrder, tableNumber);
      return;
    }

    const errorMessage = getStaffTableOrderSubmitErrorMessage(error);

    if (isStaffTableOrderItemValidationError(error)) {
      setStaffTableOrderStatus(`${errorMessage} Refreshing the live menu...`, "warning");
      await loadStaffTableOrderMenu({ silent: true });
      setStaffTableOrderStatus(`${errorMessage} The live menu has been refreshed.`, "warning");
      return;
    }

    setStaffTableOrderStatus(errorMessage, "warning");
  } finally {
    setStaffTableOrderSubmitBusy(false);
    setStaffTableOrderSubmitDisabled(
      !getStaffTableOrderCartEntries().length || !getStaffTableOrderingState().staffOrderingEnabled
    );
  }
}

function setStaffOrdersLoading(message = "") {
  const content = $("#staffOrdersContent");
  const selectedSourceCard = getStaffSelectedOrderSourceCard();
  const sourceState = getStaffOrderSourceAsyncState(selectedSourceCard);
  const loadingTitle = String(message || "").trim() || sourceState.loadingTitle;

  if (!selectedSourceCard) {
    setStaffOrderSourcePromptState({
      title: "Loading order sources...",
      copy: sourceState.loadingCopy,
      busy: true
    });
  }
  setStaffDashboardSummaryEmpty("Loading dashboard summary...", true);
  renderStaffOrdersQuickReports(null);
  clearStaffOrdersOperationalSummary();
  renderStaffOrdersAttentionSummary([]);
  clearStaffOrdersActionStatus();
  setStaffSectionLastUpdated("#staffDashboardLastUpdated", "Refreshing dashboard...");
  clearStaffFilterStatus();
  if (!content) return;

  content.className = "staff-orders-state staff-orders-loading-state staff-section-stage";
  content.setAttribute("tabindex", "-1");
  content.setAttribute("role", "status");
  content.setAttribute("aria-busy", "true");
  content.innerHTML = `
    <div class="staff-orders-state-head">
      <p class="staff-orders-state-kicker">Updating queue</p>
      <h3 class="staff-orders-state-title">${escapeHTML(loadingTitle)}</h3>
      <p class="staff-orders-state-copy">${escapeHTML(sourceState.loadingCopy)}</p>
    </div>
    <div class="staff-orders-skeleton-list" aria-hidden="true">
      ${Array.from({ length: 3 }, () => `
        <div class="staff-orders-skeleton-card">
          <span class="staff-orders-skeleton-line is-title"></span>
          <span class="staff-orders-skeleton-line"></span>
          <span class="staff-orders-skeleton-line is-short"></span>
        </div>
      `).join("")}
    </div>
  `;
}

function showStaffLoginView(message = "") {
  const loginWrap = $("#staffLoginWrap");
  const dashboardWrap = $("#staffDashboardWrap");

  document.body.classList.remove("is-staff-dashboard-active");
  setStaffProfileMenuExpanded(false);

  stopStaffAutoRefresh();
  stopStaffKitchenDisplayClock();
  if (isStaffFullscreenActive() && typeof document.exitFullscreen === "function") {
    void document.exitFullscreen().catch(() => {});
  }
  resetStaffDashboardState();
  if (loginWrap) loginWrap.style.display = "grid";
  if (dashboardWrap) dashboardWrap.style.display = "none";
  syncStaffSidebarForViewport();
  updateStaffFullscreenToggle();

  if (message) {
    setStaffLoginStatus(message);
  }
}

function showStaffDashboardView(staffUser = {}) {
  const loginWrap = $("#staffLoginWrap");
  const dashboardWrap = $("#staffDashboardWrap");
  const hotelLabel = $("#staffSessionHotel");
  document.body.classList.add("is-staff-dashboard-active");
  const featureConfig = normalizeStaffFeatureConfig(staffUser.features || {});
  const resolvedStaffUser = { ...staffUser, features: featureConfig };
  STAFF_STATE.featureConfig = featureConfig;
  STAFF_STATE.staffUser = resolvedStaffUser;
  loadStaffKdsPreferences(resolvedStaffUser);
  applyStaffRoleWorkspaceAccess(resolvedStaffUser);

  if (loginWrap) loginWrap.style.display = "none";
  if (dashboardWrap) dashboardWrap.style.display = "grid";
  if (hotelLabel) hotelLabel.textContent = resolvedStaffUser.hotelSlug || "this hotel";
  updateStaffWorkspaceHotelBadge(resolvedStaffUser);
  showStaffView(STAFF_STATE.activeView || getDefaultStaffView(resolvedStaffUser));
  syncStaffSidebarForViewport();
  startStaffKitchenDisplayClock();
  updateStaffSoundAlertToggle();
  updateStaffBrowserAlertToggle();
  updateStaffFullscreenToggle();
}

function showStaffView(view = "dashboard") {
  const nextView = isStaffKdsDisplayMode()
    ? "kds"
    : canStaffAccessView(view)
      ? view
      : getDefaultStaffView();
  STAFF_STATE.activeView = nextView;

  document.querySelectorAll("[data-staff-view]").forEach((button) => {
    if (button.hidden) return;

    const isActive = button.dataset.staffView === nextView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-staff-view-panel]").forEach((panel) => {
    const panelView = panel.dataset.staffViewPanel || "";
    panel.hidden = !canStaffAccessView(panelView) || panelView !== nextView;
  });
  if (nextView === "rooms" && typeof window.openProfessionalRoomDeepLink === "function") {
    window.openProfessionalRoomDeepLink();
  }

  updateStaffWorkspaceContext(nextView);
}

function clearStaffFreshDataIndicator(view = "") {
  if (!view) return;

  document
    .querySelector(`[data-staff-view="${view}"]`)
    ?.classList.remove("has-fresh-data");
}

function markStaffFreshData(view = "") {
  if (!view || STAFF_STATE.activeView === view) return;

  document
    .querySelector(`[data-staff-view="${view}"]`)
    ?.classList.add("has-fresh-data");
}

function openStaffView(view = "dashboard") {
  const requestedView = String(view || "").trim();
  if (
    requestedView === "kds" &&
    !isStaffKdsDisplayMode() &&
    canStaffAccessView("kds")
  ) {
    window.location.assign(getStaffKitchenDisplayUrl());
    return;
  }

  const nextView = isStaffKdsDisplayMode()
    ? "kds"
    : canStaffAccessView(view)
      ? view
      : getDefaultStaffView();
  showStaffView(nextView);
  clearStaffFreshDataIndicator(nextView);
  acknowledgeStaffNotificationView(nextView);
  if (isStaffCompactViewport()) {
    setStaffSidebarExpanded(false, { restoreFocus: true });
  }
  if (nextView === "rooms" && typeof window.openProfessionalRoomDeepLink === "function") {
    window.openProfessionalRoomDeepLink();
  }

  if (nextView === "reservations" && !STAFF_STATE.reservationsLoaded) {
    void loadStaffReservations();
  }

  if (nextView === "rooms" && !STAFF_STATE.roomsLoaded) {
    void loadStaffRooms();
  }

  if (
    nextView === "rooms" &&
    canStaffUseFeature("room_service") &&
    !STAFF_STATE.tableOrderMenuLoaded
  ) {
    void ensureStaffRoomServiceMenuLoaded();
  }

  if (nextView === "support" && !STAFF_STATE.supportRequestsLoaded) {
    void loadStaffSupportRequests();
  }

  if (nextView === "table-order") {
    showStaffTakeOrderSubview("home", { focus: false });
    void loadStaffOrderingSettings();
  }

  if (nextView === "kds" && !STAFF_STATE.kdsOrdersLoaded) {
    void loadStaffKdsOrders();
  }

  if (nextView === "reports" && !STAFF_STATE.businessReportLoaded) {
    void loadStaffBusinessReport();
  }

  if (nextView === "inquiries" && !STAFF_STATE.inquiriesLoaded) {
    void loadStaffInquiries();
  }

  if (nextView === "contacts" && !STAFF_STATE.contactSubmissionsLoaded) {
    void loadStaffContacts();
  }

  if (nextView === "testimonials" && !STAFF_STATE.testimonialsLoaded) {
    void loadStaffTestimonials();
  }

  if (staffAutoRefreshTimer) {
    startStaffAutoRefresh();
  }
}

function setStaffTabCount(selector, count, label = "records loaded") {
  const countEl = $(selector);
  if (!countEl) return;

  const safeCount = Math.max(0, Math.floor(Number(count || 0) || 0));
  const accessibleLabel = `${safeCount} ${label}`;
  countEl.textContent = formatStaffCount(safeCount);
  countEl.setAttribute("aria-label", accessibleLabel);
  countEl.title = accessibleLabel;
}

function getStaffKdsOrderKitchenStatus(order = {}) {
  const status = normalizeStatus(
    order.effectiveKitchenStatus || order.kitchenStatus || order.status || "new"
  );

  return STAFF_KDS_STATUS_ORDER.includes(status) ? status : "new";
}

function getStaffKdsStatusCounts(orders = []) {
  return (Array.isArray(orders) ? orders : []).reduce((counts, order) => {
    const status = getStaffKdsOrderKitchenStatus(order);
    counts[status] = Number(counts[status] || 0) + 1;
    return counts;
  }, {});
}

function pruneStaffKdsFreshOrderIds(now = Date.now()) {
  const nextFreshOrderIds = Object.entries(
    STAFF_STATE.kdsFreshOrderIds && typeof STAFF_STATE.kdsFreshOrderIds === "object"
      ? STAFF_STATE.kdsFreshOrderIds
      : {}
  ).reduce((freshIds, [orderId, markedAt]) => {
    const timestamp = Number(markedAt || 0);
    if (
      orderId &&
      Number.isFinite(timestamp) &&
      now - timestamp < STAFF_KDS_FRESH_HIGHLIGHT_WINDOW_MS
    ) {
      freshIds[orderId] = timestamp;
    }

    return freshIds;
  }, {});

  STAFF_STATE.kdsFreshOrderIds = nextFreshOrderIds;
  return nextFreshOrderIds;
}

function markStaffKdsFreshOrders(orders = []) {
  const now = Date.now();
  const nextFreshOrderIds = {
    ...pruneStaffKdsFreshOrderIds(now)
  };

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const orderId = String(order?.kdsTicketId || order?.id || "").trim();
    if (orderId) {
      nextFreshOrderIds[orderId] = now;
    }
  });

  STAFF_STATE.kdsFreshOrderIds = nextFreshOrderIds;
}

function isStaffKdsOrderFresh(order = {}) {
  const orderId = String(order?.kdsTicketId || order?.id || "").trim();
  if (!orderId) return false;

  const freshOrderIds = pruneStaffKdsFreshOrderIds();
  const markedAt = Number(freshOrderIds[orderId] || 0);
  return Number.isFinite(markedAt) && Date.now() - markedAt < STAFF_KDS_FRESH_HIGHLIGHT_WINDOW_MS;
}

function getStaffKdsOpenOrderCount(orders = STAFF_STATE.kdsOrders) {
  return (Array.isArray(orders) ? orders : []).filter((order) => {
    const status = getStaffKdsOrderKitchenStatus(order);
    return status !== "served" && status !== "cancelled";
  }).length;
}

function getStaffSelectedKdsStatusFilter() {
  return String(STAFF_STATE.kdsStatusFilter || "all").trim() || "all";
}

function getStaffSelectedKdsSortMode() {
  const sortMode = String(STAFF_STATE.kdsSortMode || "oldest").trim().toLowerCase();
  return sortMode === "newest" ? "newest" : "oldest";
}

function isStaffKdsHideServedEnabled() {
  return STAFF_STATE.kdsHideServed === true;
}

function isStaffKdsHideCancelledEnabled() {
  return STAFF_STATE.kdsHideCancelled === true;
}

function setStaffKdsToggleState(selector, isEnabled) {
  const button = $(selector);
  if (!button) return;

  const pressed = isEnabled ? "true" : "false";
  button.setAttribute("aria-pressed", pressed);
  button.classList.toggle("is-active", !!isEnabled);
}

function syncStaffKdsFilterControls() {
  const statusInput = $("#staffKdsStatusInput");
  if (statusInput) {
    statusInput.value = getStaffSelectedKdsStatusFilter();
  }

  const sortInput = $("#staffKdsSortInput");
  if (sortInput) {
    sortInput.value = getStaffSelectedKdsSortMode();
  }
  const sourceInput = $("#staffKdsSourceInput");
  if (sourceInput) sourceInput.value = STAFF_STATE.kdsSourceFilter || "all";
  const viewInput = $("#staffKdsViewModeInput");
  if (viewInput) {
    viewInput.value = getStaffKdsViewMode();
    viewInput.querySelector('option[value="manager"]')?.toggleAttribute("disabled", STAFF_STATE.kdsCapabilities?.canManage !== true);
  }
  setStaffKdsToggleState("#staffKdsAddedItemsToggle", STAFF_STATE.kdsAdditionsOnly === true);

  setStaffKdsToggleState("#staffKdsHideServedToggle", isStaffKdsHideServedEnabled());
  setStaffKdsToggleState("#staffKdsHideCancelledToggle", isStaffKdsHideCancelledEnabled());

  const activePresetKey = getStaffKdsActivePresetKey();
  setStaffKdsToggleState("#staffKdsServiceFocusBtn", activePresetKey === "service-focus");
  setStaffKdsToggleState("#staffKdsRushWatchBtn", activePresetKey === "rush-watch");
  setStaffKdsToggleState("#staffKdsPrepFocusBtn", activePresetKey === "prep-focus");
}

function updateStaffViewTabCounts() {
  setStaffTabCount("#staffOrdersTabCount", STAFF_STATE.orders.length, "orders loaded in the selected range");
  setStaffTabCount("#staffKdsTabCount", getStaffKdsOpenOrderCount(), "open kitchen tickets");
  setStaffTabCount("#staffSupportTabCount", getStaffOpenSupportRequestCount(), "open support requests");
  setStaffTabCount("#staffRoomsTabCount", STAFF_STATE.rooms.length + STAFF_STATE.roomBookings.length, "room records loaded");
  setStaffTabCount("#staffReservationsTabCount", STAFF_STATE.reservations.length, "reservations loaded in the selected range");
  setStaffTabCount("#staffInquiriesTabCount", STAFF_STATE.inquiries.length, "inquiries loaded in the selected range");
  setStaffTabCount("#staffContactsTabCount", STAFF_STATE.contactSubmissions.length, "contact messages loaded in the selected range");
  setStaffTabCount("#staffTestimonialsTabCount", STAFF_STATE.testimonials.length, "reviews loaded in the selected range");
}

function getStaffRecordId(record = {}) {
  return String(record?.kdsTicketId || record?.id || record?.orderId || "").trim();
}

function hasNewStaffRecords(previousRecords = [], nextRecords = []) {
  return getNewStaffRecords(previousRecords, nextRecords).length > 0;
}

function setStaffFormDisabled(form, isDisabled) {
  if (!form) return;
  const busy = !!isDisabled;

  form.querySelectorAll("input, button, select, textarea").forEach((field) => {
    field.disabled = busy;
  });
  form.setAttribute("aria-busy", busy ? "true" : "false");

  if (form.id === "staffLoginForm") {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.setAttribute("aria-busy", busy ? "true" : "false");
      if (busy) {
        button.dataset.loginButtonLabel = button.dataset.loginButtonLabel || button.textContent || "Login";
        button.textContent = "Logging in…";
      } else {
        button.textContent = button.dataset.loginButtonLabel || "Login";
      }
    }
  }
}

async function staffFetchJson(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  const token = getStaffToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const startedAt = performance.now();
  const response = await fetch(url, {
    ...options,
    headers
  });
  const durationMs = performance.now() - startedAt;
  const requestId = response.headers.get("x-request-id") || "";
  const serverTiming = response.headers.get("server-timing") || "";

  if (durationMs >= STAFF_SLOW_REQUEST_WARNING_MS) {
    let safePath = "";
    try {
      safePath = new URL(url, window.location.href).pathname;
    } catch {
      safePath = String(url || "").split("?")[0];
    }

    const method = String(options.method || "GET").toUpperCase();
    const warningKey = `${method} ${safePath}`;
    const lastWarningAt = Number(
      staffSlowRequestWarningAtByPath.get(warningKey) || 0
    );

    if (Date.now() - lastWarningAt >= STAFF_SLOW_REQUEST_WARNING_COOLDOWN_MS) {
      staffSlowRequestWarningAtByPath.set(warningKey, Date.now());
      console.warn("Slow staff API request", {
        method,
        path: safePath,
        durationMs: Number(durationMs.toFixed(1)),
        status: response.status,
        requestId,
        serverTiming
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const retryAfterSeconds = Number.parseInt(response.headers.get("Retry-After") || "", 10);
    const retryMessage =
      response.status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? ` Please retry in about ${retryAfterSeconds} seconds.`
        : "";
    const error = new Error(`${data.message || (response.status === 429 ? "Too many requests." : "Request failed")}${retryMessage}`);
    error.status = response.status;
    error.code = data.code || "";
    error.responseData = data;
    throw error;
  }

  return data;
}

async function fetchStaffOrderingSettings() {
  const result = await staffFetchJson(`${STAFF_API_BASE}/ordering-settings`);
  STAFF_STATE.tableOrdering = normalizeStaffTableOrderingState(result.ordering);
  syncStaffPaymentMethodSettingsForm();
  renderStaffWorkspaceOrderingBadge("table-order");
  renderStaffTableOrderCart();
  return STAFF_STATE.tableOrdering;
}

async function loadStaffOrderingSettings() {
  try {
    STAFF_STATE.tableOrdering = null;
    renderStaffWorkspaceOrderingBadge("table-order");
    await fetchStaffOrderingSettings();
  } catch (error) {
    console.error("Staff ordering settings load failed:", error);
    STAFF_STATE.tableOrdering = { ...DEFAULT_STAFF_TABLE_ORDERING_STATE };
    syncStaffPaymentMethodSettingsForm();
    renderStaffWorkspaceOrderingBadge("table-order");
    renderStaffTableOrderCart();
  }
}

function isStaffActionInProgress() {
  return Boolean(document.querySelector('[data-staff-action-busy="true"]'));
}

function setStaffActionBusyState(button, isBusy) {
  if (!button) return;

  if (isBusy) {
    button.disabled = true;
    button.dataset.staffActionBusy = "true";
    return;
  }

  delete button.dataset.staffActionBusy;
}

async function refreshStaffOperationalData({ silent = false } = {}) {
  if (
    staffAutoRefreshInFlight ||
    !getStaffToken() ||
    isStaffActionInProgress()
  ) {
    return;
  }

  staffAutoRefreshInFlight = true;
  if (silent) {
    staffAutoRefreshSoundPlayed = false;
    resetStaffAutoRefreshFreshSummary();
  }

  try {
    if (silent) {
      setStaffLiveRefreshStatus("Refreshing...", "muted");
    }

    const refreshTasks = [];
    refreshTasks.push(loadStaffNotificationSummary({ silent: true }));

    if (isStaffKdsDisplayMode() || STAFF_STATE.activeView === "kds") {
      if (canStaffUseFeature("food")) refreshTasks.push(loadStaffKdsOrders({ silent }));
    } else if (
      canStaffUseFeature("food") &&
      ["dashboard", "orders"].includes(STAFF_STATE.activeView)
    ) {
      refreshTasks.push(loadStaffOrders({ silent }));
    }

    if (
      !isStaffKdsDisplayMode() &&
      canStaffUseFeature("food") &&
      ["dashboard", "support"].includes(STAFF_STATE.activeView)
    ) {
      refreshTasks.push(loadStaffSupportRequests({ silent }));
    }

    if (
      !isStaffKdsDisplayMode() &&
      canStaffUseFeature("food") &&
      STAFF_STATE.activeView === "table-order" &&
      STAFF_STATE.tableOrderSubview === "tables"
    ) {
      refreshTasks.push(loadStaffTableActivity({ silent }));
      if (STAFF_STATE.selectedTableOrderId) {
        refreshTasks.push(loadSelectedStaffTableOrder({ silent: true }).catch(() => null));
      }
    }

    if (!isStaffKdsDisplayMode() && isStaffManagerSession()) {
      if (STAFF_STATE.activeView === "reservations" && canStaffUseFeature("food")) {
        refreshTasks.push(loadStaffReservations({ silent }));
      }
      if (
        ["dashboard", "rooms"].includes(STAFF_STATE.activeView) &&
        canStaffUseFeature("rooms")
      ) {
        refreshTasks.push(loadStaffRooms({ silent }));
      }
      if (STAFF_STATE.activeView === "inquiries") refreshTasks.push(loadStaffInquiries({ silent }));
      if (STAFF_STATE.activeView === "contacts") refreshTasks.push(loadStaffContacts({ silent }));
      if (STAFF_STATE.activeView === "testimonials") refreshTasks.push(loadStaffTestimonials({ silent }));
    }

    if (
      !isStaffKdsDisplayMode() &&
      !isStaffManagerSession() &&
      canStaffUseFeature("rooms") &&
      (STAFF_STATE.roomsLoaded || STAFF_STATE.activeView === "rooms")
    ) {
      refreshTasks.push(loadStaffRooms({ silent }));
    }

    await Promise.all(refreshTasks);

    if (silent) {
      const freshNoticeMessage = getStaffAutoRefreshFreshNoticeMessage();
      if (freshNoticeMessage) {
        flashStaffLiveRefreshNotice(freshNoticeMessage, "warning");
      }
    }

    if (silent && !staffLiveRefreshOverrideActive) {
      setStaffLiveRefreshStatus(`Updated ${formatStaffRefreshTime()}`, "live");
    }
  } catch (error) {
    console.warn("Staff auto-refresh failed:", error);

    if (silent) {
      setStaffLiveRefreshStatus("Refresh retrying", "warning");
    }
  } finally {
    staffAutoRefreshInFlight = false;
    if (silent) {
      resetStaffAutoRefreshFreshSummary();
    }
  }
}

function stopStaffAutoRefresh() {
  if (staffLiveRefreshNoticeTimer) {
    window.clearTimeout(staffLiveRefreshNoticeTimer);
    staffLiveRefreshNoticeTimer = null;
  }

  staffLiveRefreshOverrideActive = false;
  if (!staffAutoRefreshTimer) {
    setStaffLiveRefreshStatus("Live updates off", "muted");
    setStaffKdsLiveStatus("Kitchen waiting", "muted");
    return;
  }

  window.clearInterval(staffAutoRefreshTimer);
  staffAutoRefreshTimer = null;
  setStaffLiveRefreshStatus("Live updates off", "muted");
  setStaffKdsLiveStatus("Kitchen waiting", "muted");
}

function startStaffAutoRefresh() {
  stopStaffAutoRefresh();
  setStaffLiveRefreshStatus("Live updates on", "live");
  setStaffKdsLiveStatus(
    shouldStaffSynchronizeKds() ? "Kitchen live" : "Kitchen waiting",
    shouldStaffSynchronizeKds() ? "live" : "muted"
  );
  const intervalMs =
    isStaffKdsDisplayMode() || STAFF_STATE.activeView === "kds"
      ? STAFF_KDS_AUTO_REFRESH_INTERVAL_MS
      : STAFF_AUTO_REFRESH_INTERVAL_MS;
  staffAutoRefreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    void refreshStaffOperationalData({ silent: true });
  }, intervalMs);
}

async function loadStaffOrders({ silent = false } = {}) {
  const range = $("#staffOrdersRangeInput")?.value || "recent";
  const previousOrders = STAFF_STATE.orders;
  const previousRenderSignature = STAFF_STATE.ordersRenderSignature;
  const focusState = getStaffOrdersFocusState();
  if (staffOrdersRequestController) staffOrdersRequestController.abort();
  const requestController = new AbortController();
  staffOrdersRequestController = requestController;

  try {
    if (!silent) {
      setStaffOrdersLoading();
      if (focusState) {
        $("#staffOrdersContent")?.focus({ preventScroll: true });
      }
      setStaffSectionLastUpdated("#staffOrdersLastUpdated", "Refreshing...");
      clearStaffFreshDataIndicator("orders");
    }

    const params = new URLSearchParams({ range });
    const result = await staffFetchJson(`${STAFF_API_BASE}/orders?${params.toString()}`, {
      signal: requestController.signal
    });
    const nextOrders = normalizeStaffOrdersForDisplay(result.orders);
    const nextRenderSignature = getStaffOrdersRenderSignature(nextOrders);
    const shouldRenderOrders = !silent || nextRenderSignature !== previousRenderSignature;
    const scrollAnchorState =
      silent && shouldRenderOrders ? getStaffOrdersScrollAnchorState() : null;
    const freshOrders = silent ? getNewStaffRecords(previousOrders, nextOrders) : [];
    markStaffOrderSourcesFresh(freshOrders);
    handleStaffFreshRecords("orders", freshOrders);

    STAFF_STATE.orders = nextOrders;
    STAFF_STATE.ordersRenderSignature = nextRenderSignature;
    renderStaffOrderSourceCards(STAFF_STATE.orders);
    const loadedOrderIds = new Set(STAFF_STATE.orders.map(getStaffOrderId).filter(Boolean));
    STAFF_STATE.expandedOrderIds.forEach((orderId) => {
      if (!loadedOrderIds.has(orderId)) {
        STAFF_STATE.expandedOrderIds.delete(orderId);
      }
    });
    if (shouldRenderOrders) {
      updateStaffOrderTableFilterOptions(
        getStaffSelectedOrderSourceCard()
          ? getStaffOrdersForSourceCard(getStaffSelectedOrderSourceCard())
          : STAFF_STATE.orders
      );
      updateStaffViewTabCounts();
      renderStaffOrdersSummary(STAFF_STATE.orders);
      renderStaffOrdersOperationalSummary(STAFF_STATE.orders);
      renderCurrentStaffOrders();
      restoreStaffOrdersScrollAnchorState(scrollAnchorState);
      restoreStaffOrdersFocusState(focusState);
    }

    if (!isStaffManagerSession() || !canStaffUseFeature("food_reports")) {
      STAFF_STATE.dashboardReports = null;
      STAFF_STATE.dashboardReportsError = false;
      STAFF_STATE.dashboardTrend = null;
      STAFF_STATE.dashboardTrendError = false;
      renderStaffOrdersQuickReports(null);
      setStaffSectionLastUpdated(
        "#staffDashboardLastUpdated",
        isStaffManagerSession() ? "Food reports are disabled" : "Manager access required"
      );
    }

    setStaffSectionLastUpdated("#staffOrdersLastUpdated", getStaffLastUpdatedLabel());
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Staff orders load failed:", error);

    if (!silent) {
      renderStaffOrdersLoadError(error.message || "Please try again.");
      renderStaffDashboardOrdersWidgetErrors("Dashboard order data could not be loaded. Retry without leaving this page.");
      if (focusState) {
        window.requestAnimationFrame(() => {
          $("[data-staff-orders-retry]")?.focus();
        });
      }
      setStaffSectionLastUpdated("#staffOrdersLastUpdated", "Refresh failed");
      setStaffSectionLastUpdated("#staffDashboardLastUpdated", "Refresh failed");
    } else {
      throw error;
    }
  } finally {
    if (staffOrdersRequestController === requestController) {
      staffOrdersRequestController = null;
    }
  }
}

async function loadStaffKdsOrders({ silent = false } = {}) {
  const previousOrders = STAFF_STATE.kdsOrders;
  if (staffKdsRequestController) staffKdsRequestController.abort();
  const requestController = new AbortController();
  staffKdsRequestController = requestController;

  try {
    if (!silent) {
      setStaffRecordsLoading("#staffKdsContent", "Loading kitchen board...");
      setStaffSectionLastUpdated("#staffKdsLastUpdated", "Refreshing...");
      setStaffKdsLiveStatus("Kitchen refreshing", "muted");
      clearStaffFreshDataIndicator("kds");
    }

    const params = new URLSearchParams({
      includeServed: "false",
      includeCancelled: "false",
      limit: "120"
    });
    const result = await staffFetchJson(
      `${STAFF_API_BASE}/kds/orders?${params.toString()}`,
      { signal: requestController.signal }
    );
    const nextOrders = Array.isArray(result.orders) ? result.orders : [];
    const nextCounts =
      result.countsByKitchenStatus &&
      typeof result.countsByKitchenStatus === "object" &&
      !Array.isArray(result.countsByKitchenStatus)
        ? result.countsByKitchenStatus
        : getStaffKdsStatusCounts(nextOrders);
    const freshOrders = silent ? getNewStaffRecords(previousOrders, nextOrders) : [];
    const serverTime = Date.parse(result.serverTime || "");
    if (Number.isFinite(serverTime)) STAFF_STATE.kdsServerClockOffsetMs = serverTime - Date.now();
    STAFF_STATE.kdsCapabilities = result.capabilities || STAFF_STATE.kdsCapabilities;
    STAFF_STATE.kdsConsecutiveFailures = 0;

    if (freshOrders.length) {
      markStaffKdsFreshOrders(freshOrders);
      handleStaffFreshRecords("kds", freshOrders, {
        playSound: true,
        showBrowserAlert: true
      });
    }

    const renderSignature = JSON.stringify(nextOrders.map((order) => [order.kdsTicketId || order.id, order.version, order.roundVersion, order.effectiveKitchenStatus, order.updatedAt]));
    const shouldRender = !silent || renderSignature !== STAFF_STATE.kdsRenderSignature;
    STAFF_STATE.kdsOrders = nextOrders;
    STAFF_STATE.kdsCounts = nextCounts;
    STAFF_STATE.kdsOrdersLoaded = true;
    applyStaffKdsDefaultVisibility();
    updateStaffViewTabCounts();
    renderStaffKdsSummary(nextCounts);
    syncStaffKdsFilterControls();
    if (shouldRender) {
      STAFF_STATE.kdsRenderSignature = renderSignature;
      renderCurrentStaffKds();
    }
    setStaffSectionLastUpdated("#staffKdsLastUpdated", getStaffLastUpdatedLabel());
    setStaffKdsLiveStatus("Kitchen live", "live");
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Staff KDS orders load failed:", error);
    STAFF_STATE.kdsConsecutiveFailures += 1;

    if (!silent) {
      renderStaffKdsRetryState("Kitchen orders could not be loaded. Please retry.");
      setStaffSectionLastUpdated("#staffKdsLastUpdated", "Load failed");
      setStaffKdsLiveStatus("Kitchen reconnecting", "warning");
    } else {
      setStaffKdsLiveStatus("Kitchen reconnecting", "warning");
      throw error;
    }
  } finally {
    if (staffKdsRequestController === requestController) {
      staffKdsRequestController = null;
    }
  }
}

async function loadStaffDashboardTrend({ silent = false } = {}) {
  if (!isStaffManagerSession() || !canStaffUseFeature("food_reports")) {
    STAFF_STATE.dashboardReports = null;
    STAFF_STATE.dashboardReportsError = false;
    STAFF_STATE.dashboardTrend = null;
    STAFF_STATE.dashboardTrendError = false;
    STAFF_STATE.dashboardReportsFreshnessLabel = "";
    renderStaffDashboardReports(null);
    renderStaffOrdersQuickReports(null);
    return false;
  }

  if (!silent) setStaffDashboardTrendLoading();

  try {
    const result = await staffFetchJson(`${STAFF_API_BASE}/orders-reports`);
    STAFF_STATE.dashboardReports =
      result.reports && typeof result.reports === "object" ? result.reports : null;
    STAFF_STATE.dashboardTrend =
      result.trend && typeof result.trend === "object" ? result.trend : null;
    STAFF_STATE.dashboardReportsError = !STAFF_STATE.dashboardReports;
    STAFF_STATE.dashboardTrendError = !STAFF_STATE.dashboardTrend;
    STAFF_STATE.dashboardReportsFreshnessLabel = getStaffLastUpdatedLabel();
    renderStaffDashboardReports(STAFF_STATE.dashboardReports);
    renderStaffOrdersQuickReports(STAFF_STATE.dashboardReports);
    return !STAFF_STATE.dashboardTrendError;
  } catch (error) {
    console.warn("Staff dashboard trend load failed:", error);
    STAFF_STATE.dashboardReports = null;
    STAFF_STATE.dashboardReportsError = true;
    STAFF_STATE.dashboardTrend = null;
    STAFF_STATE.dashboardTrendError = true;
    STAFF_STATE.dashboardReportsFreshnessLabel = "";
    renderStaffDashboardReports(null);
    renderStaffOrdersQuickReports(null);

    if (!silent) setStaffLiveRefreshStatus("Trend unavailable", "warning");
    return false;
  }
}

async function loadStaffDashboardItemSales({ silent = false } = {}) {
  if (!isStaffManagerSession() || !canStaffUseFeature("food_reports")) {
    STAFF_STATE.itemSalesReports = null;
    STAFF_STATE.itemSalesReportsError = false;
    renderStaffDashboardAiInsights(STAFF_STATE.dashboardReports);
    return false;
  }

  try {
    const result = await staffFetchJson(`${STAFF_API_BASE}/orders-item-sales-reports`);
    STAFF_STATE.itemSalesReports =
      result.itemSalesReports && typeof result.itemSalesReports === "object"
        ? result.itemSalesReports
        : null;
    STAFF_STATE.itemSalesReportsError = !STAFF_STATE.itemSalesReports;
    renderStaffDashboardAiInsights(STAFF_STATE.dashboardReports);
    return !STAFF_STATE.itemSalesReportsError;
  } catch (error) {
    console.warn("Staff item sales reports load failed:", error);
    STAFF_STATE.itemSalesReports = null;
    STAFF_STATE.itemSalesReportsError = true;
    renderStaffDashboardAiInsights(STAFF_STATE.dashboardReports);
    if (!silent) setStaffLiveRefreshStatus("Insights partly unavailable", "warning");
    return false;
  }
}

async function loadStaffDashboardReports({ silent = false } = {}) {
  await Promise.all([
    loadStaffDashboardTrend({ silent }),
    loadStaffDashboardItemSales({ silent })
  ]);
}

async function loadStaffBusinessReport({ silent = false } = {}) {
  if (!isStaffManagerSession()) {
    STAFF_STATE.businessReport = null;
    STAFF_STATE.businessReportLoaded = false;
    setStaffReportsLoading("Owner or manager access is required for business reports.", false);
    return;
  }

  try {
    if (!silent) {
      setStaffReportsLoading();
      setStaffSectionLastUpdated("#staffReportsLastUpdated", "Refreshing reports...");
    }

    const params = getStaffBusinessReportQueryParams();
    const result = await staffFetchJson(`${STAFF_API_BASE}/reports/business?${params.toString()}`);
    STAFF_STATE.businessReport =
      result.report && typeof result.report === "object" ? result.report : null;
    STAFF_STATE.businessReportType =
      result.reportType || STAFF_STATE.businessReport?.reportType || STAFF_STATE.businessReportType;
    STAFF_STATE.businessReportLoaded = true;
    renderStaffBusinessReport(STAFF_STATE.businessReport);
    setStaffSectionLastUpdated("#staffReportsLastUpdated", getStaffLastUpdatedLabel());
  } catch (error) {
    console.error("Staff business report load failed:", error);
    STAFF_STATE.businessReport = null;
    STAFF_STATE.businessReportLoaded = false;

    if (!silent) {
      setStaffReportsLoading(error.message || "Failed to load business reports.", false);
      setStaffSectionLastUpdated("#staffReportsLastUpdated", "Load failed");
    } else {
      throw error;
    }
  }
}

function getStaffBusinessReportQueryParams() {
  const range = $("#staffReportsRangeInput")?.value || "month";
  const params = new URLSearchParams();
  params.set("type", STAFF_STATE.businessReportType || getDefaultStaffBusinessReportType());

  if (range === "custom") {
    const fromDate = $("#staffReportsFromDateInput")?.value || "";
    const toDate = $("#staffReportsToDateInput")?.value || "";

    if (!fromDate || !toDate) {
      throw new Error("Select both from and to dates for a custom report.");
    }

    params.set("range", "custom");
    params.set("fromDate", fromDate);
    params.set("toDate", toDate);
    return params;
  }

  if (range === "month_select") {
    const monthValue = $("#staffReportsMonthInput")?.value || "";
    const match = monthValue.match(/^(\d{4})-(\d{2})$/);

    if (!match) {
      throw new Error("Select a month for the month-wise report.");
    }

    params.set("month", String(Number(match[2])));
    params.set("year", match[1]);
    return params;
  }

  params.set("range", range);
  return params;
}

function setDefaultStaffReportFilterValues() {
  const monthInput = $("#staffReportsMonthInput");
  const fromInput = $("#staffReportsFromDateInput");
  const toInput = $("#staffReportsToDateInput");
  const today = new Date();
  const todayText = today.toISOString().slice(0, 10);
  const monthText = today.toISOString().slice(0, 7);

  if (monthInput && !monthInput.value) {
    monthInput.value = monthText;
  }

  if (toInput && !toInput.value) {
    toInput.value = todayText;
  }

  if (fromInput && !fromInput.value) {
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    fromInput.value = weekAgo.toISOString().slice(0, 10);
  }
}

function syncStaffReportFilterControls() {
  const range = $("#staffReportsRangeInput")?.value || "month";
  const monthInput = $("#staffReportsMonthInput");
  const fromInput = $("#staffReportsFromDateInput");
  const toInput = $("#staffReportsToDateInput");
  const showMonth = range === "month_select";
  const showCustom = range === "custom";

  setDefaultStaffReportFilterValues();

  if (monthInput) {
    monthInput.hidden = !showMonth;
  }

  if (fromInput) {
    fromInput.hidden = !showCustom;
  }

  if (toInput) {
    toInput.hidden = !showCustom;
  }
}

async function loadStaffReservations({ silent = false } = {}) {
  const range = $("#staffReservationsRangeInput")?.value || "recent";
  const previousReservations = STAFF_STATE.reservations;

  try {
    if (!silent) {
      clearStaffFreshDataIndicator("reservations");
      clearStaffRecordSummary("#staffReservationsSummary");
      setStaffRecordsLoading("#staffReservationsContent", "Loading reservations...");
    }
    const params = new URLSearchParams({ range });
    const result = await staffFetchJson(`${STAFF_API_BASE}/reservations?${params.toString()}`);
    const nextReservations = Array.isArray(result.reservations)
      ? result.reservations
      : [];
    handleStaffFreshRecords(
      "reservations",
      silent ? getNewStaffRecords(previousReservations, nextReservations) : []
    );
    STAFF_STATE.reservations = nextReservations;
    STAFF_STATE.reservationsLoaded = true;
    updateStaffViewTabCounts();
    renderCurrentStaffReservations();
  } catch (error) {
    console.error("Staff reservations load failed:", error);
    if (!silent) {
      clearStaffRecordSummary("#staffReservationsSummary");
      setStaffRecordsLoading(
        "#staffReservationsContent",
        error.message || "Failed to load staff reservations.",
        false
      );
    } else {
      throw error;
    }
  }
}

function getStaffRoomBookingSessionCount(kind = "known") {
  try {
    const hotelSlug = String(STAFF_STATE.staffUser?.hotelSlug || "hotel").trim().toLowerCase();
    const value = window.sessionStorage.getItem(`staff-room-website-${kind}:${hotelSlug}`);
    return value === null ? null : Math.max(0, Number(value || 0) || 0);
  } catch {
    return null;
  }
}

function setStaffRoomBookingSessionCount(kind = "known", value = 0) {
  try {
    const hotelSlug = String(STAFF_STATE.staffUser?.hotelSlug || "hotel").trim().toLowerCase();
    window.sessionStorage.setItem(
      `staff-room-website-${kind}:${hotelSlug}`,
      String(Math.max(0, Math.floor(Number(value || 0) || 0)))
    );
  } catch {}
}

function applyStaffRoomBookingListResult(result = {}) {
  const nextBookings = Array.isArray(result.bookings) ? result.bookings : [];
  const nextSummary = result.sourceSummary && typeof result.sourceSummary === "object"
    ? result.sourceSummary
    : STAFF_STATE.roomBookingSummary;
  const nextWebsiteTotal = Math.max(0, Number(nextSummary?.website?.total || 0) || 0);
  const currentWebsiteTotal = Math.max(0, Number(STAFF_STATE.roomBookingSummary?.website?.total || 0) || 0);
  const storedWebsiteTotal = getStaffRoomBookingSessionCount("known");
  const previousWebsiteTotal = STAFF_STATE.roomBookingSummaryInitialized
    ? currentWebsiteTotal
    : storedWebsiteTotal;

  if (!STAFF_STATE.roomBookingSummaryInitialized) {
    const storedUnread = getStaffRoomBookingSessionCount("unread");
    if (storedUnread !== null) {
      STAFF_STATE.roomWebsiteFallbackUnread = Math.max(
        STAFF_STATE.roomWebsiteFallbackUnread,
        storedUnread
      );
    }
  }

  if (previousWebsiteTotal !== null && nextWebsiteTotal > previousWebsiteTotal) {
    STAFF_STATE.roomWebsiteFallbackUnread += nextWebsiteTotal - previousWebsiteTotal;
  } else if (previousWebsiteTotal === null && STAFF_STATE.roomBookingSource === "website") {
    const recentThreshold = Date.now() - 10 * 60 * 1000;
    const recentWebsiteBookings = nextBookings.filter((booking) => {
      const sourceGroup = normalizeStatus(booking.booking_source_group || "");
      const createdAt = Date.parse(booking.created_at || booking.createdAt || "");
      return sourceGroup === "website" && Number.isFinite(createdAt) && createdAt >= recentThreshold;
    }).length;
    STAFF_STATE.roomWebsiteFallbackUnread = Math.max(
      STAFF_STATE.roomWebsiteFallbackUnread,
      recentWebsiteBookings
    );
  }

  STAFF_STATE.roomBookings = nextBookings;
  STAFF_STATE.roomBookingSummary = nextSummary;
  STAFF_STATE.roomBookingSummaryInitialized = true;
  setStaffRoomBookingSessionCount("known", nextWebsiteTotal);
  setStaffRoomBookingSessionCount("unread", STAFF_STATE.roomWebsiteFallbackUnread);
  STAFF_STATE.roomBookingPagination = result.pagination && typeof result.pagination === "object"
    ? result.pagination
    : { page: STAFF_STATE.roomBookingPage, limit: Number($("#staffRoomsLimitInput")?.value || 25), total: STAFF_STATE.roomBookings.length, totalPages: 1, hasPrevious: false, hasNext: false };
  STAFF_STATE.roomBookingPage = Math.max(1, Number(STAFF_STATE.roomBookingPagination.page || 1) || 1);
  renderStaffNotificationCards();
}

async function loadStaffRoomBookings({ silent = false } = {}) {
  const filters = getStaffRoomBookingFilterValues();
  const content = $("#staffRoomsContent");
  const status = $("#staffRoomBookingSourceStatus");
  const requestId = ++STAFF_STATE.roomBookingListRequestId;
  const queryString = buildStaffRoomBookingQueryString();
  syncStaffRoomBookingUrl();
  if (filters.fromDate && filters.toDate && filters.toDate < filters.fromDate) {
    if (status) {
      status.className = "staff-status is-error";
      status.textContent = "Check-in To date must be after Check-in From date.";
    }
    return false;
  }
  try {
    if (content) content.setAttribute("aria-busy", "true");
    if (!silent && status) {
      status.className = "staff-status";
      status.textContent = "Loading " + getStaffRoomBookingSourceLabel().toLowerCase() + "...";
    }
    const result = await staffFetchJson(STAFF_API_BASE + "/room-booking/bookings?" + queryString);
    if (requestId !== STAFF_STATE.roomBookingListRequestId) return false;
    applyStaffRoomBookingListResult(result);
    renderCurrentStaffRooms();
    updateStaffViewTabCounts();
    const deepLinkBookingId = new URL(window.location.href).searchParams.get("roomBooking") || "";
    const detailDialog = $("#staffRoomBookingDetailDialog");
    if (deepLinkBookingId && (!detailDialog?.open || STAFF_STATE.selectedRoomBookingId !== deepLinkBookingId)) {
      const trigger = document.querySelector('[data-staff-room-booking-detail="' + CSS.escape(deepLinkBookingId) + '"]');
      void openStaffRoomBookingDetail(deepLinkBookingId, trigger);
    } else if (!deepLinkBookingId && detailDialog?.open) {
      closeStaffRoomBookingDetail();
    }
    if (status) {
      status.className = "staff-status";
      status.textContent = String(Number(result.total || 0)) + " " +
        getStaffRoomBookingSourceLabel().toLowerCase() +
        " found. Compact summaries are paginated by the server; details load only when opened.";
    }
    setStaffSectionLastUpdated("#staffRoomsLastUpdated", getStaffLastUpdatedLabel());
    return true;
  } catch (error) {
    if (requestId !== STAFF_STATE.roomBookingListRequestId) return false;
    console.error("Staff room booking queue load failed:", error);
    if (!silent && status) {
      status.className = "staff-status is-error";
      status.textContent = error.message || "Failed to load the room booking queue.";
    }
    return false;
  } finally {
    if (content && requestId === STAFF_STATE.roomBookingListRequestId) {
      content.setAttribute("aria-busy", "false");
    }
  }
}
async function loadStaffRooms({ silent = false } = {}) {
  const filters = getStaffRoomBookingFilterValues();

  if (filters.fromDate && filters.toDate && filters.toDate < filters.fromDate) {
    setStaffRecordsLoading(
      "#staffRoomsContent",
      "Check-in To date must be after Check-in From date.",
      false
    );
    setStaffSectionLastUpdated("#staffRoomsLastUpdated", "Room filter needs attention");
    return;
  }

  try {
    if (!silent) {
      const content = $("#staffRoomsContent");
      if (content) {
        content.className = "staff-empty staff-section-stage is-loading";
        content.textContent = "Loading rooms and room bookings...";
      }
      setStaffSectionLastUpdated("#staffRoomsLastUpdated", "Refreshing...");
      clearStaffFreshDataIndicator("rooms");
    }

    const bookingQueryString = buildStaffRoomBookingQueryString();
    const operationDates = ensureStaffRoomOperationsDates();
    const operationQueryString = new URLSearchParams(
      operationDates || {
        checkInDate: getStaffRoomOperationsDateValue(new Date()),
        checkOutDate: getStaffRoomOperationsDateValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
      }
    ).toString();

    const [roomsResult, bookingsResult, operationsResult] = await Promise.all([
      staffFetchJson(`${STAFF_API_BASE}/room-booking/rooms`),
      staffFetchJson(`${STAFF_API_BASE}/room-booking/bookings?${bookingQueryString}`),
      staffFetchJson(`${STAFF_API_BASE}/room-booking/operations?${operationQueryString}`)
    ]);

    STAFF_STATE.rooms = Array.isArray(roomsResult.rooms) ? roomsResult.rooms : [];
    applyStaffRoomBookingListResult(bookingsResult);
    STAFF_STATE.roomOperationsRooms = Array.isArray(operationsResult.rooms)
      ? operationsResult.rooms
      : [];
    STAFF_STATE.roomOperationsPeriod = {
      checkInDate: operationsResult.checkInDate || operationDates?.checkInDate || "",
      checkOutDate: operationsResult.checkOutDate || operationDates?.checkOutDate || ""
    };
    STAFF_STATE.roomsLoaded = true;
    updateStaffViewTabCounts();
    if (silent && isStaffActionInProgress()) {
      setStaffSectionLastUpdated("#staffRoomsLastUpdated", getStaffLastUpdatedLabel());
      return;
    }
    const roomBookingDrafts = silent ? captureStaffRoomBookingDrafts() : [];
    renderCurrentStaffRooms();
    if (silent) {
      restoreStaffRoomBookingDrafts(roomBookingDrafts);
    }
    setStaffSectionLastUpdated("#staffRoomsLastUpdated", getStaffLastUpdatedLabel());
  } catch (error) {
    console.error("Staff rooms load failed:", error);

    if (!silent) {
      const content = $("#staffRoomsContent");
      const message =
        error?.status === 403
          ? "Room booking is not enabled for this hotel yet."
          : error.message || "Failed to load room booking records.";
      STAFF_STATE.rooms = [];
      STAFF_STATE.roomBookings = [];
      STAFF_STATE.roomOperationsRooms = [];
      STAFF_STATE.roomsLoaded = false;
      renderStaffRoomsSummary([], []);
      updateStaffViewTabCounts();
      if (content) {
        content.className = "staff-empty staff-section-stage";
        content.textContent = message;
      }
      setStaffSectionLastUpdated("#staffRoomsLastUpdated", "Room load failed");
    } else {
      throw error;
    }
  }
}

async function loadStaffInquiries({ silent = false } = {}) {
  const range = $("#staffInquiriesRangeInput")?.value || "recent";
  const previousInquiries = STAFF_STATE.inquiries;

  try {
    if (!silent) {
      clearStaffFreshDataIndicator("inquiries");
      clearStaffRecordSummary("#staffInquiriesSummary");
      setStaffRecordsLoading("#staffInquiriesContent", "Loading inquiries...");
    }
    const params = new URLSearchParams({ range });
    const result = await staffFetchJson(`${STAFF_API_BASE}/inquiries?${params.toString()}`);
    const nextInquiries = Array.isArray(result.inquiries) ? result.inquiries : [];
    handleStaffFreshRecords(
      "inquiries",
      silent ? getNewStaffRecords(previousInquiries, nextInquiries) : []
    );
    STAFF_STATE.inquiries = nextInquiries;
    STAFF_STATE.inquiriesLoaded = true;
    updateStaffViewTabCounts();
    renderCurrentStaffInquiries();
  } catch (error) {
    console.error("Staff inquiries load failed:", error);
    if (!silent) {
      clearStaffRecordSummary("#staffInquiriesSummary");
      setStaffRecordsLoading(
        "#staffInquiriesContent",
        error.message || "Failed to load staff inquiries.",
        false
      );
    } else {
      throw error;
    }
  }
}

async function loadStaffContacts({ silent = false } = {}) {
  const range = $("#staffContactsRangeInput")?.value || "recent";
  const previousContacts = STAFF_STATE.contactSubmissions;

  try {
    if (!silent) {
      clearStaffFreshDataIndicator("contacts");
      clearStaffRecordSummary("#staffContactsSummary");
      setStaffRecordsLoading("#staffContactsContent", "Loading contact messages...");
    }
    const params = new URLSearchParams({ range });
    const result = await staffFetchJson(`${STAFF_API_BASE}/contact-submissions?${params.toString()}`);
    const nextContacts = Array.isArray(result.contactSubmissions)
      ? result.contactSubmissions
      : [];
    handleStaffFreshRecords(
      "contacts",
      silent ? getNewStaffRecords(previousContacts, nextContacts) : []
    );
    STAFF_STATE.contactSubmissions = nextContacts;
    STAFF_STATE.contactSubmissionsLoaded = true;
    updateStaffViewTabCounts();
    renderCurrentStaffContacts();
  } catch (error) {
    console.error("Staff contact submissions load failed:", error);
    if (!silent) {
      clearStaffRecordSummary("#staffContactsSummary");
      setStaffRecordsLoading(
        "#staffContactsContent",
        error.message || "Failed to load staff contact messages.",
        false
      );
    } else {
      throw error;
    }
  }
}

async function loadStaffSupportRequests({ silent = false } = {}) {
  const range = $("#staffSupportRangeInput")?.value || "recent";
  const previousSupportRequests = STAFF_STATE.supportRequests;

  try {
    if (!silent) {
      clearStaffRecordSummary("#staffSupportSummary");
      setStaffRecordsLoading("#staffSupportContent", "Loading table support requests...");
      setStaffSectionLastUpdated("#staffSupportLastUpdated", "Refreshing...");
      clearStaffFreshDataIndicator("support");
    }

    const params = new URLSearchParams({ range });
    const result = await staffFetchJson(`${STAFF_API_BASE}/support-requests?${params.toString()}`);
    const nextSupportRequests = Array.isArray(result.supportRequests)
      ? result.supportRequests
      : [];

    handleStaffFreshRecords(
      "support",
      silent ? getNewStaffRecords(previousSupportRequests, nextSupportRequests) : []
    );

    STAFF_STATE.supportRequests = nextSupportRequests;
    STAFF_STATE.supportRequestsLoaded = true;
    updateStaffViewTabCounts();
    renderStaffDashboardSupportSummary(STAFF_STATE.supportRequests);
    renderCurrentStaffSupportRequests();
    setStaffSectionLastUpdated("#staffDashboardLastUpdated", getStaffLastUpdatedLabel());
    setStaffSectionLastUpdated("#staffSupportLastUpdated", getStaffLastUpdatedLabel());
  } catch (error) {
    console.error("Staff support requests load failed:", error);

    if (!silent) {
      renderStaffDashboardSupportSummary([]);
      clearStaffRecordSummary("#staffSupportSummary");
      setStaffRecordsLoading(
        "#staffSupportContent",
        error.message || "Failed to load staff support requests.",
        false
      );
    } else {
      throw error;
    }
  }
}

async function loadStaffTestimonials({ silent = false } = {}) {
  const range = $("#staffTestimonialsRangeInput")?.value || "recent";
  const previousTestimonials = STAFF_STATE.testimonials;

  try {
    if (!silent) {
      clearStaffFreshDataIndicator("testimonials");
      clearStaffRecordSummary("#staffTestimonialsSummary");
      setStaffRecordsLoading("#staffTestimonialsContent", "Loading testimonials...");
    }
    const params = new URLSearchParams({ range });
    const result = await staffFetchJson(`${STAFF_API_BASE}/testimonials?${params.toString()}`);
    const nextTestimonials = Array.isArray(result.testimonials) ? result.testimonials : [];
    handleStaffFreshRecords(
      "testimonials",
      silent ? getNewStaffRecords(previousTestimonials, nextTestimonials) : []
    );
    STAFF_STATE.testimonials = nextTestimonials;
    STAFF_STATE.testimonialsLoaded = true;
    updateStaffViewTabCounts();
    renderCurrentStaffTestimonials();
  } catch (error) {
    console.error("Staff testimonials load failed:", error);
    if (!silent) {
      clearStaffRecordSummary("#staffTestimonialsSummary");
      setStaffRecordsLoading(
        "#staffTestimonialsContent",
        error.message || "Failed to load staff testimonials.",
        false
      );
    } else {
      throw error;
    }
  }
}

async function patchStaffOrderAction(orderId, action) {
  return staffFetchJson(
    `${STAFF_API_BASE}/orders/${encodeURIComponent(orderId)}/${action}`,
    {
      method: "PATCH"
    }
  );
}

function getStaffRecordStatusEndpoint(recordType = "") {
  if (recordType === "order") {
    return "orders";
  }

  if (recordType === "reservation") {
    return "reservations";
  }

  if (recordType === "inquiry") {
    return "inquiries";
  }

  if (recordType === "contact") {
    return "contact-submissions";
  }

  if (recordType === "support") {
    return "support-requests";
  }

  return "";
}

async function patchStaffRecordStatus(recordType, recordId, status) {
  const endpoint = getStaffRecordStatusEndpoint(recordType);

  if (!endpoint) {
    throw new Error("Unsupported staff record type");
  }

  return staffFetchJson(
    `${STAFF_API_BASE}/${endpoint}/${encodeURIComponent(recordId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    }
  );
}

async function patchStaffKdsOrderKitchenStatus(orderId, kitchenStatus, roundSequence = 0, expectedVersion = 1) {
  const roundPath = Number(roundSequence) >= 2
    ? `/rounds/${encodeURIComponent(roundSequence)}`
    : "";
  return staffFetchJson(
    `${STAFF_API_BASE}/kds/orders/${encodeURIComponent(orderId)}${roundPath}/kitchen-status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kitchenStatus,
        expectedVersion: Math.max(1, Number(expectedVersion || 1)),
        clientRequestId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
      })
    }
  );
}

async function patchStaffTestimonialApproval(testimonialId, isApproved, expectedUpdatedAt = "", moderationAction = "") {
  return staffFetchJson(
    `${STAFF_API_BASE}/testimonials/${encodeURIComponent(testimonialId)}/approval`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ isApproved, expectedUpdatedAt, moderationAction })
    }
  );
}

function findStaffOrder(orderId) {
  const normalizedOrderId = String(orderId || "");
  return (
    STAFF_STATE.orders.find((order) => String(order.id) === normalizedOrderId) ||
    STAFF_STATE.tableActivity.find((order) => String(order.id) === normalizedOrderId) ||
    (String(STAFF_STATE.selectedTableOrderId) === normalizedOrderId
      ? STAFF_STATE.selectedTableOrder
      : null)
  );
}

function replaceStaffOrderInCollection(orders = [], updatedOrder = null) {
  if (!updatedOrder?.id) return Array.isArray(orders) ? orders : [];
  const updatedOrderId = String(updatedOrder.id);
  let replaced = false;
  const nextOrders = (Array.isArray(orders) ? orders : []).map((order) => {
    if (String(order?.id) !== updatedOrderId) return order;
    replaced = true;
    return { ...order, ...updatedOrder };
  });
  if (!replaced) nextOrders.push(updatedOrder);
  return normalizeStaffOrdersForDisplay(nextOrders);
}

function applyStaffOrderMutationResult(result = {}, orderId = "") {
  const normalizedOrderId = String(orderId || "");
  const resultOrders = Array.isArray(result.orders)
    ? result.orders
    : result.order
      ? [result.order]
      : [];
  const updatedOrder = resultOrders.find(
    (order) => String(order?.id) === normalizedOrderId
  ) || resultOrders[0] || null;

  resultOrders.forEach((order) => {
    STAFF_STATE.orders = replaceStaffOrderInCollection(STAFF_STATE.orders, order);
    const isActiveTableOrder = ["new", "confirmed", "preparing"].includes(
      normalizeStatus(order?.status)
    );
    if (isActiveTableOrder) {
      STAFF_STATE.tableActivity = replaceStaffOrderInCollection(STAFF_STATE.tableActivity, order);
    } else {
      STAFF_STATE.tableActivity = STAFF_STATE.tableActivity.filter(
        (tableOrder) => String(tableOrder?.id) !== String(order?.id)
      );
    }
  });

  if (
    updatedOrder &&
    String(STAFF_STATE.selectedTableOrderId) === normalizedOrderId
  ) {
    STAFF_STATE.selectedTableOrder = {
      ...(STAFF_STATE.selectedTableOrder || {}),
      ...updatedOrder
    };
  }

  STAFF_STATE.ordersRenderSignature = getStaffOrdersRenderSignature(STAFF_STATE.orders);
  renderStaffOrderSourceCards(STAFF_STATE.orders);
  updateStaffViewTabCounts();
  renderStaffOrdersSummary(STAFF_STATE.orders);
  renderStaffOrdersOperationalSummary(STAFF_STATE.orders);
  renderStaffOrdersStatusNavigation();

  const visibleOrderIds = new Set(getStaffVisibleOrders().map(getStaffOrderId));
  resultOrders.forEach((order) => {
    const currentCard = Array.from(document.querySelectorAll("[data-staff-order-details]"))
      .find((details) => String(details.dataset.orderId || "") === String(order?.id || ""))
      ?.closest(".staff-order-card");

    if (!visibleOrderIds.has(String(order?.id || ""))) {
      currentCard?.remove();
      return;
    }

    if (currentCard) currentCard.outerHTML = buildStaffOrderCard(order);
  });

  if (!$("#staffOrdersContent")?.querySelector(".staff-order-card")) {
    renderCurrentStaffOrders();
  }
  renderStaffTableActivity();
  renderStaffDashboardPrimaryKpis();
  renderStaffDashboardRecentOrders();
  return updatedOrder;
}

function findStaffKdsOrder(orderId, roundSequence = 0) {
  return STAFF_STATE.kdsOrders.find((order) =>
    String(order.id) === String(orderId) &&
    (!Number(roundSequence) || Number(order.roundSequence || 0) === Number(roundSequence))
  );
}

function getStaffOrderActionConfirmMessage(orderId, actionLabel, action = "") {
  const order = findStaffOrder(orderId) || {};
  const tableLabel = getStaffOrderTableLabel(order);
  const addonMeta = getStaffOrderAddonMeta(order);
  const childAddOns = addonMeta.isAddon ? [] : getStaffOrderChildAddOns(order);
  const isFamilyAction = action === "mark-family-billed" || action === "mark-family-paid";
  const familyWarning = isFamilyAction
    ? `${childAddOns.length + 1} linked order ${childAddOns.length + 1 === 1 ? "record" : "records"} will be updated for this table family.`
    : getStaffOrderFamilyActionHint(order, childAddOns);

  return [
    `${actionLabel} order ${orderId}?`,
    `Table: ${tableLabel}`,
    familyWarning ? `Important: ${familyWarning}` : "",
    "",
    "Only continue if the hotel operator has confirmed this change."
  ].filter((line) => line !== "").join("\n");
}

async function handleStaffOrderAction(button, action, actionLabel) {
  const orderId = button.dataset.orderId || "";

  if (!orderId) {
    return;
  }

  const confirmed = window.confirm(
    getStaffOrderActionConfirmMessage(orderId, actionLabel, action)
  );

  if (!confirmed) {
    return;
  }

  const originalText = button.textContent;
  setStaffOrdersActionStatus(`${actionLabel} is being applied to order ${orderId}.`, "warning");

  try {
    setStaffActionBusyState(button, true);
    button.textContent = "Updating...";
    const result = await patchStaffOrderAction(orderId, action);
    applyStaffOrderMutationResult(result, orderId);
    const successMessage = `${actionLabel} completed for order ${orderId}.`;
    setStaffOrdersActionStatus(successMessage, "success");
    if (String(STAFF_STATE.selectedTableOrderId) === String(orderId)) {
      setStaffTableOrderDetailNotice(successMessage, "success");
    }
  } catch (error) {
    console.error(`Staff ${action} failed:`, error);
    const managerAccessMessage =
      error?.status === 403
        ? "Manager access is required to update billing or payment from this staff panel."
        : error.message || `Failed to ${actionLabel.toLowerCase()}`;
    if (error?.status === 409 && error.responseData?.order) {
      applyStaffOrderMutationResult({ order: error.responseData.order }, orderId);
      if (String(STAFF_STATE.selectedTableOrderId) === String(orderId)) {
        setStaffTableOrderDetailNotice(managerAccessMessage, "warning");
      } else {
        window.alert(managerAccessMessage);
      }
    } else if (
      error?.status === 409 &&
      String(STAFF_STATE.selectedTableOrderId) === String(orderId)
    ) {
      await loadSelectedStaffTableOrder({ announceConflict: true }).catch(() => {});
    } else if (String(STAFF_STATE.selectedTableOrderId) === String(orderId)) {
      setStaffTableOrderDetailNotice(managerAccessMessage, "error");
    } else {
      window.alert(managerAccessMessage);
    }
    setStaffOrdersActionStatus(managerAccessMessage, "error");
    button.textContent = originalText;
    button.disabled = false;
  } finally {
    setStaffActionBusyState(button, false);
  }
}

function getStaffRecordStatusConfirmMessage(recordType, recordId, status) {
  const statusLabel = getStaffRecordStatusLabel(status, recordType);
  const recordLabel =
    recordType === "order"
      ? "order"
      : recordType === "reservation"
      ? "reservation"
      : recordType === "contact"
        ? "contact message"
        : recordType === "support"
          ? "support request"
        : "inquiry";

  return [
    `Update ${recordLabel} ${recordId} status to "${statusLabel}"?`,
    "",
    "Only continue if the hotel operator has confirmed this change."
  ].join("\n");
}

function getStaffKdsStatusConfirmMessage(orderId, nextKitchenStatus, roundSequence = 0) {
  const order = findStaffKdsOrder(orderId, roundSequence) || {};
  const tableLabel = getStaffOrderTableLabel(order);
  const currentStatusLabel = getStaffKdsStatusLabel(getStaffKdsOrderKitchenStatus(order));
  const nextStatusLabel = getStaffKdsStatusLabel(nextKitchenStatus);

  return [
    `Update kitchen stage for order ${orderId}${Number(roundSequence) >= 2 ? `, Round ${roundSequence}` : ""} to "${nextStatusLabel}"?`,
    `Table: ${tableLabel}`,
    `Current stage: ${currentStatusLabel}`,
    "",
    "This only updates the kitchen display stage. It does not change billing, payment, or customer order status."
  ].join("\n");
}

function hasStaffRecordStatusChanged(select) {
  if (!select) return false;

  return normalizeStatus(select.value) !== normalizeStatus(select.dataset.currentStatus);
}

function updateStaffRecordStatusButtonState(select) {
  const actions = select?.closest(".staff-record-status-actions");
  const button = actions?.querySelector("[data-staff-update-record-status]");

  if (!button) return;

  const hasRecordId = Boolean(select?.dataset.recordId);
  button.disabled = !hasRecordId || !hasStaffRecordStatusChanged(select);
}

async function handleStaffRecordStatusAction(button) {
  const recordType = button.dataset.recordType || "";
  const recordId = button.dataset.recordId || "";
  const card = button.closest(".staff-order-card");
  const select = card?.querySelector("[data-staff-record-status-select]");
  const status = select?.value || "";

  if (!recordType || !recordId || !status) {
    return;
  }

  if (!hasStaffRecordStatusChanged(select)) {
    updateStaffRecordStatusButtonState(select);
    return;
  }

  const confirmed = window.confirm(
    getStaffRecordStatusConfirmMessage(recordType, recordId, status)
  );

  if (!confirmed) {
    return;
  }

  const originalText = button.textContent;
  const statusLabel = getStaffRecordStatusLabel(status, recordType);

  if (recordType === "order") {
    setStaffOrdersActionStatus(`Updating order ${recordId} to ${statusLabel}.`, "warning");
  }

  try {
    setStaffActionBusyState(button, true);
    button.textContent = "Updating...";
    const result = await patchStaffRecordStatus(recordType, recordId, status);

    if (recordType === "reservation") {
      await loadStaffReservations();
    } else if (recordType === "inquiry") {
      await loadStaffInquiries();
    } else if (recordType === "contact") {
      await loadStaffContacts();
    } else if (recordType === "support") {
      await loadStaffSupportRequests();
    } else if (recordType === "order") {
      applyStaffOrderMutationResult(result, recordId);
      const successMessage = `Order ${recordId} status updated to ${statusLabel}.`;
      setStaffOrdersActionStatus(successMessage, "success");
      if (String(STAFF_STATE.selectedTableOrderId) === String(recordId)) {
        const remainsInFilter = getStaffTableActivityFilterStatuses().includes(
          normalizeStatus(STAFF_STATE.selectedTableOrder?.status)
        );
        setStaffTableOrderDetailNotice(
          remainsInFilter || STAFF_STATE.tableActivityStatus === "all"
            ? successMessage
            : `${successMessage} This order no longer belongs to the ${getStaffRecordStatusLabel(STAFF_STATE.tableActivityStatus, "order")} filter and will remain open until you return to the table list.`,
          remainsInFilter || STAFF_STATE.tableActivityStatus === "all" ? "success" : "warning"
        );
      }
    }
  } catch (error) {
    console.error(`Staff ${recordType} status update failed:`, error);
    const errorMessage = error.message || "Failed to update status";
    if (recordType === "order" && error?.status === 409 && String(STAFF_STATE.selectedTableOrderId) === String(recordId)) {
      await loadSelectedStaffTableOrder({ announceConflict: true }).catch(() => {});
    } else if (recordType === "order" && String(STAFF_STATE.selectedTableOrderId) === String(recordId)) {
      setStaffTableOrderDetailNotice(errorMessage, "error");
    } else {
      window.alert(errorMessage);
    }
    if (recordType === "order") {
      setStaffOrdersActionStatus(errorMessage || "Order status could not be updated.", "error");
    }
    button.textContent = originalText;
    updateStaffRecordStatusButtonState(select);
  } finally {
    setStaffActionBusyState(button, false);
  }
}

async function handleStaffKdsStatusAction(button) {
  const orderId = String(button?.dataset.orderId || "").trim();
  const nextKitchenStatus = String(button?.dataset.kitchenStatus || "").trim();
  const roundSequence = Number(button?.dataset.roundSequence || 0);
  const roundVersion = Number(button?.dataset.roundVersion || 1);
  const orderVersion = Number(button?.dataset.orderVersion || 1);

  if (!orderId || !nextKitchenStatus) {
    return;
  }

  const confirmed = window.confirm(
    getStaffKdsStatusConfirmMessage(orderId, nextKitchenStatus, roundSequence)
  );

  if (!confirmed) {
    return;
  }

  const originalText = button.textContent;

  try {
    setStaffActionBusyState(button, true);
    button.textContent = "Updating...";
    await patchStaffKdsOrderKitchenStatus(orderId, nextKitchenStatus, roundSequence, roundSequence >= 2 ? roundVersion : orderVersion);
    await loadStaffKdsOrders();
  } catch (error) {
    console.error("Staff KDS kitchen status update failed:", error);
    if (error?.status === 409) {
      await loadStaffKdsOrders({ silent: true }).catch(() => {});
      renderCurrentStaffKds();
    }
    window.alert(error.message || "Failed to update kitchen stage");
    button.textContent = originalText;
    button.disabled = false;
  } finally {
    setStaffActionBusyState(button, false);
  }
}

async function handleStaffTestimonialApprovalAction(button) {
  const testimonialId = button.dataset.testimonialId || "";
  const currentApproved = button.dataset.approved === "true";
  const requestedAction = button.dataset.testimonialAction || (currentApproved ? "unapprove" : "approve");
  const nextApproved = requestedAction === "approve";

  if (!testimonialId) {
    return;
  }

  const actionLabel = requestedAction;
  const confirmed = window.confirm(
    [
      `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} testimonial ${testimonialId}?`,
      "",
      "This only changes moderation for this hotel. It does not edit or delete the review."
    ].join("\n")
  );

  if (!confirmed) {
    return;
  }

  const originalText = button.textContent;

  try {
    setStaffActionBusyState(button, true);
    button.textContent = "Updating...";
    const currentTestimonial = STAFF_STATE.testimonials.find(
      (testimonial) => String(testimonial.id) === String(testimonialId)
    );
    const result = await patchStaffTestimonialApproval(
      testimonialId,
      nextApproved,
      currentTestimonial?.updatedAt || "",
      requestedAction
    );
    const updatedTestimonial = result?.testimonial;
    if (updatedTestimonial) {
      STAFF_STATE.testimonials = STAFF_STATE.testimonials.map((testimonial) =>
        String(testimonial.id) === String(testimonialId) ? updatedTestimonial : testimonial
      );
      renderCurrentStaffTestimonials();
      updateStaffViewTabCounts();
      ensureStaffNotificationLiveRegion().textContent = requestedAction === "approve"
        ? "Review approved. It is now eligible for public display."
        : requestedAction === "reject"
          ? "Review rejected and removed from public eligibility."
          : "Review approval removed. It is no longer public.";
      window.requestAnimationFrame(() => {
        Array.from(document.querySelectorAll("[data-staff-toggle-testimonial-approval]"))
          .find((candidate) => candidate.dataset.testimonialId === String(testimonialId))
          ?.focus();
      });
    }
  } catch (error) {
    console.error("Staff testimonial approval update failed:", error);
    window.alert(error.message || "Failed to update testimonial moderation");
    button.textContent = originalText;
    button.disabled = false;
  } finally {
    setStaffActionBusyState(button, false);
  }
}

async function loginStaff(hotelSlug, pin) {
  const response = await fetch(`${STAFF_API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ hotelSlug, pin })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Staff login failed");
  }

  return data;
}

async function checkExistingStaffSession() {
  const token = getStaffToken();

  if (!token) {
    showStaffLoginView();
    return false;
  }

  try {
    const result = await staffFetchJson(`${STAFF_API_BASE}/me`);
    showStaffDashboardView(result.staffUser || {});
    await loadStaffNotificationSummary({ silent: true });
    if (isStaffKdsDisplayMode()) {
      if (canStaffUseFeature("food")) await loadStaffKdsOrders();
    } else {
      const initialLoads = [];
      if (canStaffUseFeature("food")) {
        initialLoads.push(loadStaffOrders());
        void loadStaffSupportRequests();
        if (isStaffManagerSession() && canStaffUseFeature("food_reports")) {
          void loadStaffDashboardReports({ silent: true });
        }
      }
      if (canStaffUseFeature("rooms")) {
        initialLoads.push(loadStaffRooms());
        initialLoads.push(loadStaffRoomAdvancePolicySafely());
      }
      await Promise.all(initialLoads);
    }
    startStaffAutoRefresh();
    updateStaffSoundAlertToggle();
    updateStaffSoundVolumeControl();
    updateStaffBrowserAlertToggle();
    return true;
  } catch (error) {
    console.warn("Staff session invalid:", error);
    clearStaffToken();
    showStaffLoginView("Staff session expired. Please login again.");
    return false;
  }
}

function prefillStaffHotelSlug() {
  const input = $("#staffHotelSlugInput");
  if (!input || input.value.trim()) return;

  const params = new URLSearchParams(window.location.search);
  const hotelSlug =
    params.get("hotel") ||
    window.APP_RUNTIME_CONFIG?.DEFAULT_HOTEL_SLUG ||
    "";

  input.value = hotelSlug;
}

function bindStaffLoginForm() {
  const form = $("#staffLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const hotelSlug = $("#staffHotelSlugInput")?.value.trim() || "";
    const pin = $("#staffPinInput")?.value.trim() || "";

    try {
      setStaffFormDisabled(form, true);
      setStaffLoginStatus("Checking staff access...");
      void unlockStaffSoundAlerts();

      const result = await loginStaff(hotelSlug, pin);
      if (!result.token) {
        throw new Error("Staff login did not return a session token");
      }
      const pinInput = $("#staffPinInput");
      if (pinInput) pinInput.value = "";

      setStaffToken(result.token);
      showStaffDashboardView(result.staffUser || {});
    await loadStaffNotificationSummary({ silent: true });
      if (isStaffKdsDisplayMode()) {
        if (canStaffUseFeature("food")) await loadStaffKdsOrders();
      } else {
        const initialLoads = [];
        if (canStaffUseFeature("food")) {
          initialLoads.push(loadStaffOrders());
          void loadStaffSupportRequests();
          if (isStaffManagerSession() && canStaffUseFeature("food_reports")) {
            void loadStaffDashboardReports({ silent: true });
          }
        }
        if (canStaffUseFeature("rooms")) {
          initialLoads.push(loadStaffRooms());
          initialLoads.push(loadStaffRoomAdvancePolicySafely());
        }
        await Promise.all(initialLoads);
      }
      startStaffAutoRefresh();
    } catch (error) {
      console.error("Staff login failed:", error);
      const pinInput = $("#staffPinInput");
      if (pinInput) {
        pinInput.value = "";
      }
      clearStaffToken();
      showStaffLoginView(error.message || "Staff login failed");
      setStaffLoginStatus(error.message || "Staff login failed", true);
    } finally {
      setStaffFormDisabled(form, false);
    }
  });
}

function bindStaffLogout() {
  const button = $("#staffLogoutBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    clearStaffToken();
    const pinInput = $("#staffPinInput");
    if (pinInput) pinInput.value = "";
    showStaffLoginView("Logged out.");
  });
}

function bindStaffSoundAlertToggle() {
  const button = $("#staffSoundAlertToggleBtn");
  if (!button || button.dataset.boundClick === "true") return;

  updateStaffSoundAlertToggle();

  button.addEventListener("click", async () => {
    if (!canUseStaffSoundAlerts()) {
      updateStaffSoundAlertToggle();
      return;
    }

    const nextEnabled = !isStaffSoundAlertEnabled();
    setStaffSoundAlertEnabled(nextEnabled);
    const unlocked = nextEnabled ? await unlockStaffSoundAlerts() : staffSoundUnlocked;
    updateStaffSoundAlertToggle();

    if (!nextEnabled) {
      setStaffLiveRefreshStatus("Sound alerts off", "muted");
      return;
    }

    if (!unlocked) {
      setStaffLiveRefreshStatus("Tap once to arm sound alerts", "warning");
      return;
    }

    playStaffAlertTone();
    setStaffLiveRefreshStatus("Sound alerts on", "live");
  });

  button.dataset.boundClick = "true";
}

function bindStaffSoundVolumeControl() {
  const select = $("#staffSoundVolumeSelect");
  if (!select || select.dataset.boundChange === "true") return;

  updateStaffSoundVolumeControl();
  select.addEventListener("change", async () => {
    setStaffSoundAlertVolume(select.value);
    updateStaffSoundVolumeControl();

    if (isStaffSoundAlertEnabled() && await unlockStaffSoundAlerts()) {
      playStaffAlertTone({ force: true });
      setStaffLiveRefreshStatus(`${select.options[select.selectedIndex]?.text || "Sound volume"} selected`, "live");
    }
  });
  select.dataset.boundChange = "true";
}
function bindStaffFullscreenToggle() {
  const button = $("#staffFullscreenToggleBtn");
  if (!button || button.dataset.boundClick === "true") return;

  updateStaffFullscreenToggle();

  button.addEventListener("click", async () => {
    await toggleStaffFullscreen();
  });

  document.addEventListener("fullscreenchange", updateStaffFullscreenToggle);
  button.dataset.boundClick = "true";
}

function bindStaffBrowserAlertToggle() {
  const button = $("#staffBrowserAlertToggleBtn");
  if (!button || button.dataset.boundClick === "true") return;

  updateStaffBrowserAlertToggle();

  button.addEventListener("click", async () => {
    if (!canUseStaffBrowserAlerts()) {
      updateStaffBrowserAlertToggle();
      return;
    }

    if (isStaffBrowserAlertEnabled()) {
      setStaffBrowserAlertEnabled(false);
      updateStaffBrowserAlertToggle();
      setStaffLiveRefreshStatus("Browser alerts off", "muted");
      return;
    }

    const permission = await ensureStaffBrowserAlertPermission();
    const enabled = permission === "granted";
    setStaffBrowserAlertEnabled(enabled);
    updateStaffBrowserAlertToggle();

    if (!enabled) {
      setStaffLiveRefreshStatus("Browser alerts blocked", "warning");
      return;
    }

    showStaffBrowserNotification(
      "Staff browser alerts enabled",
      "New hotel orders will now trigger browser alerts for this workspace.",
      {
        tag: `staff-browser-alert-preview-${STAFF_STATE.staffUser?.hotelSlug || "hotel"}`,
        renotify: false,
        durationMs: 8000,
        onClick(notification) {
          try {
            window.focus();
          } catch (error) {
            console.warn("Staff browser alert preview focus failed:", error);
          }

          notification.close();
        }
      }
    );
    setStaffLiveRefreshStatus("Browser alerts on", "live");
  });

  button.dataset.boundClick = "true";
}

function bindStaffOrderActions() {
  const sidebarToggleButton = $("#staffSidebarToggleBtn");
  const sidebarCloseButton = $("#staffSidebarCloseBtn");
  const sidebarBackdrop = $("#staffSidebarBackdrop");
  const refreshButton = $("#staffRefreshOrdersBtn");
  const sourceRefreshButton = $("#staffRefreshOrderSourcesBtn");
  const kdsRefreshButton = $("#staffRefreshKdsBtn");
  const kdsServiceFocusButton = $("#staffKdsServiceFocusBtn");
  const kdsRushWatchButton = $("#staffKdsRushWatchBtn");
  const kdsPrepFocusButton = $("#staffKdsPrepFocusBtn");
  const kdsStatusInput = $("#staffKdsStatusInput");
  const kdsSortInput = $("#staffKdsSortInput");
  const kdsViewModeInput = $("#staffKdsViewModeInput");
  const kdsSourceInput = $("#staffKdsSourceInput");
  const kdsAddedItemsToggle = $("#staffKdsAddedItemsToggle");
  const kdsHideServedToggle = $("#staffKdsHideServedToggle");
  const kdsHideCancelledToggle = $("#staffKdsHideCancelledToggle");
  const kdsClearFiltersButton = $("#staffClearKdsFiltersBtn");
  const kdsSummary = $("#staffKdsSummary");
  const kdsContent = $("#staffKdsContent");
  const rangeInput = $("#staffOrdersRangeInput");
  const ordersSearchInput = $("#staffOrdersSearchInput");
  const sourceInput = $("#staffOrdersSourceInput");
  const sourceCardButtons = document.querySelectorAll("[data-staff-order-source-card]");
  const backToSourcesButton = $("#staffOrdersBackToSourcesBtn");
  const tableInput = $("#staffOrdersTableInput");
  const paymentInput = $("#staffOrdersPaymentInput");
  const billingInput = $("#staffOrdersBillingInput");
  const orderStatusInput = $("#staffOrdersStatusInput");
  const orderStatusNavigationButtons = document.querySelectorAll("[data-staff-order-status-filter]");
  const attentionToggle = $("#staffOrdersAttentionToggle");
  const clearFiltersButton = $("#staffClearFiltersBtn");
  const tableOrderForm = $("#staffTableOrderForm");
  const paymentMethodSettingsForm = $("#staffPaymentMethodSettingsForm");
  const tableOrderClearButton = $("#staffTableOrderClearBtn");
  const tableOrderRefreshMenuButton = $("#staffRefreshTableOrderMenuBtn");
  const tableOrderSearchInput = $("#staffTableOrderSearchInput");
  const tableOrderCategoryFilter = $("#staffTableOrderCategoryFilter");
  const tableOrderCategoryPills = $("#staffTableOrderCategoryPills");
  const tableOrderTableInput = $("#staffTableOrderTableInput");
  const tableOrderOpenExistingButton = $("#staffTableOrderOpenExistingBtn");
  const tableOrderChooseDifferentButton = $("#staffTableOrderChooseDifferentBtn");
  const takeOrderOpenTablesButton = $("#staffTakeOrderOpenTablesBtn");
  const takeOrderOpenCreateButton = $("#staffTakeOrderOpenCreateBtn");
  const takeOrderTablesBackButton = $("#staffTakeOrderTablesBackBtn");
  const takeOrderTablesHomeButton = $("#staffTakeOrderTablesHomeBtn");
  const takeOrderOpenOrdersButton = $("#staffTakeOrderOpenOrdersBtn");
  const takeOrderCreateBackButton = $("#staffTakeOrderCreateBackBtn");
  const takeOrderTableSearchInput = $("#staffTakeOrderTableSearchInput");
  const takeOrderRefreshTablesButton = $("#staffTakeOrderRefreshTablesBtn");
  const manageTablesButton = $("#staffManageTablesBtn");
  const closeTableManagementButton = $("#staffCloseTableManagementBtn");
  const addTableForm = $("#staffAddTableForm");
  const bulkTableForm = $("#staffBulkTableForm");
  const saveTableMasterSettingsButton = $("#staffSaveTableMasterSettingsBtn");
  const takeOrderDetailPanel = $("#staffTakeOrderDetailPanel");
  const takeOrderDetailCloseButton = $("#staffTakeOrderDetailCloseBtn");
  const tableOrderMobileCartButton = $("#staffTableOrderMobileCartBtn");
  const tableOrderMobileSheet = $("#staffTableOrderMobileSheet");
  const tableOrderMobileSheetCloseButton = $("#staffTableOrderMobileSheetCloseBtn");
  const tableOrderMobileBackToMenuButton = $("#staffTableOrderMobileBackToMenuBtn");
  const reservationsRefreshButton = $("#staffRefreshReservationsBtn");
  const reservationsRangeInput = $("#staffReservationsRangeInput");
  const reservationsStatusInput = $("#staffReservationsStatusInput");
  const inquiriesRefreshButton = $("#staffRefreshInquiriesBtn");
  const inquiriesRangeInput = $("#staffInquiriesRangeInput");
  const inquiriesStatusInput = $("#staffInquiriesStatusInput");
  const contactsRefreshButton = $("#staffRefreshContactsBtn");
  const contactsRangeInput = $("#staffContactsRangeInput");
  const contactsStatusInput = $("#staffContactsStatusInput");
  const supportRefreshButton = $("#staffRefreshSupportBtn");
  const supportRangeInput = $("#staffSupportRangeInput");
  const supportStatusInput = $("#staffSupportStatusInput");
  const roomsRefreshButton = $("#staffRefreshRoomsBtn");
  const roomsStatusInput = $("#staffRoomsStatusInput");
  const roomsPaymentStatusInput = $("#staffRoomsPaymentStatusInput");
  const roomsSearchInput = $("#staffRoomsSearchInput");
  const roomsSortInput = $("#staffRoomsSortInput");
  const roomsFromDateInput = $("#staffRoomsFromDateInput");
  const roomsToDateInput = $("#staffRoomsToDateInput");
  const roomsLimitInput = $("#staffRoomsLimitInput");
  const roomsResetFiltersButton = $("#staffResetRoomsFiltersBtn");
  const roomBookingsRefreshButton = $("#staffRefreshRoomBookingsBtn");
  const roomBookingsPreviousButton = $("#staffRoomsPreviousPageBtn");
  const roomBookingsNextButton = $("#staffRoomsNextPageBtn");
  const roomBookingDetailDialog = $("#staffRoomBookingDetailDialog");
  let roomBookingSearchTimer = null;
  const roomBookingForm = $("#staffRoomBookingForm");
  const roomBookingAvailabilityButton = $("#staffRoomBookingAvailabilityBtn");
  const roomBookingResetButton = $("#staffRoomBookingResetBtn");
  const roomBookingCheckInInput = $("#staffRoomBookingCheckInInput");
  const roomBookingCheckOutInput = $("#staffRoomBookingCheckOutInput");
  const roomBookingAdultsInput = $("#staffRoomBookingAdultsInput");
  const roomBookingChildrenInput = $("#staffRoomBookingChildrenInput");
  const roomNegotiatedRateEnabledInput = $("#staffRoomNegotiatedRateEnabledInput");
  const roomOperationsApplyButton = $("#staffRoomOperationsApplyBtn");
  const roomOperationsSearchInput = $("#staffRoomOperationsSearchInput");
  const roomOperationsStatusInput = $("#staffRoomOperationsStatusInput");
  const roomOperationsCheckInInput = $("#staffRoomOperationsCheckInInput");
  const roomOperationsCheckOutInput = $("#staffRoomOperationsCheckOutInput");
  const roomServiceOrderForm = $("#staffRoomServiceOrderForm");
  const roomServiceRefreshMenuButton = $("#staffRoomServiceRefreshMenuBtn");
  const roomServiceAddItemButton = $("#staffRoomServiceAddItemBtn");
  const roomServiceClearCartButton = $("#staffRoomServiceClearCartBtn");
  const roomServiceChargeToRoomInput = $("#staffRoomServiceChargeToRoomInput");
  const roomServicePaymentMethodInput = $("#staffRoomServicePaymentMethodInput");
  const testimonialsRefreshButton = $("#staffRefreshTestimonialsBtn");
  const testimonialsRangeInput = $("#staffTestimonialsRangeInput");
  const testimonialsApprovalInput = $("#staffTestimonialsApprovalInput");
  const reportsRefreshButton = $("#staffReportsRefreshBtn");
  const reportsRangeInput = $("#staffReportsRangeInput");
  const reportsPrintButton = $("#staffReportsPrintBtn");
  const reportsCsvButton = $("#staffReportsCsvBtn");
  const reportsExcelButton = $("#staffReportsExcelBtn");
  const reportTypeButtons = document.querySelectorAll("[data-staff-report-type]");
  const reportsMonthInput = $("#staffReportsMonthInput");
  const reportsFromDateInput = $("#staffReportsFromDateInput");
  const reportsToDateInput = $("#staffReportsToDateInput");

  if (sidebarToggleButton) {
    sidebarToggleButton.addEventListener("click", () => {
      const dashboardWrap = $("#staffDashboardWrap");
      const isCollapsed = dashboardWrap?.classList.contains("is-sidebar-collapsed");
      setStaffSidebarExpanded(!!isCollapsed, {
        focusSidebar: !!isCollapsed,
        restoreFocus: !isCollapsed
      });
    });
  }

  if (sidebarCloseButton) {
    sidebarCloseButton.addEventListener("click", () => {
      setStaffSidebarExpanded(false, { restoreFocus: true });
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      setStaffSidebarExpanded(false, { restoreFocus: true });
    });
  }

  document.addEventListener("keydown", (event) => {
    const isOpenMobileDrawer =
      isStaffMobileSidebarViewport() &&
      !$("#staffDashboardWrap")?.classList.contains("is-sidebar-collapsed");

    if (event.key === "Escape" && isOpenMobileDrawer) {
      event.preventDefault();
      setStaffSidebarExpanded(false, { restoreFocus: true });
      return;
    }

    if (event.key === "Escape" && STAFF_STATE.selectedTableOrderId) {
      event.preventDefault();
      closeStaffTableOrderDetail();
      return;
    }

    const isOpenMobileTableDetail =
      !!STAFF_STATE.selectedTableOrderId &&
      window.matchMedia("(max-width: 760px)").matches &&
      !takeOrderDetailPanel?.hidden;

    if (event.key === "Tab" && isOpenMobileTableDetail) {
      const focusableElements = Array.from(
        takeOrderDetailPanel.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === firstElement || !takeOrderDetailPanel.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !takeOrderDetailPanel.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
      return;
    }

    if (event.key === "Tab" && isOpenMobileDrawer) {
      const sidebar = $("#staffSidebarNavigation");
      const focusableElements = getStaffSidebarFocusableElements(sidebar);
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !sidebar?.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !sidebar?.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      void loadStaffOrders();
    });
  }

  if (sourceRefreshButton) {
    sourceRefreshButton.addEventListener("click", () => {
      void loadStaffOrders();
    });
  }

  if (reportsRefreshButton) {
    reportsRefreshButton.addEventListener("click", () => {
      void loadStaffBusinessReport();
    });
  }

  if (reportsRangeInput) {
    syncStaffReportFilterControls();
    reportsRangeInput.addEventListener("change", () => {
      STAFF_STATE.businessReportLoaded = false;
      syncStaffReportFilterControls();
      void loadStaffBusinessReport();
    });
  }

  [reportsMonthInput, reportsFromDateInput, reportsToDateInput].forEach((input) => {
    input?.addEventListener("change", () => {
      STAFF_STATE.businessReportLoaded = false;
      void loadStaffBusinessReport();
    });
  });

  if (reportsPrintButton) {
    reportsPrintButton.addEventListener("click", () => {
      openStaffBusinessReportPrint();
    });
  }

  reportsCsvButton?.addEventListener("click", () => {
    downloadStaffBusinessReport("csv");
  });

  reportsExcelButton?.addEventListener("click", () => {
    downloadStaffBusinessReport("excel");
  });

  reportTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const reportType = String(button.dataset.staffReportType || "").trim();
      if (!canStaffUseReportType(reportType)) return;
      STAFF_STATE.businessReportType = reportType;
      STAFF_STATE.businessReport = null;
      STAFF_STATE.businessReportLoaded = false;
      renderStaffReportsCenter();
      void loadStaffBusinessReport();
    });
  });

  if (kdsRefreshButton) {
    kdsRefreshButton.addEventListener("click", () => {
      void loadStaffKdsOrders();
    });
  }

  if (kdsServiceFocusButton) {
    kdsServiceFocusButton.addEventListener("click", () => {
      applyStaffKdsServiceFocusPreset();
    });
  }

  if (kdsRushWatchButton) {
    kdsRushWatchButton.addEventListener("click", () => {
      applyStaffKdsRushWatchPreset();
    });
  }

  if (kdsPrepFocusButton) {
    kdsPrepFocusButton.addEventListener("click", () => {
      applyStaffKdsPrepFocusPreset();
    });
  }

  if (kdsStatusInput) {
    kdsStatusInput.addEventListener("change", () => {
      STAFF_STATE.kdsStatusFilter = String(kdsStatusInput.value || "all").trim() || "all";
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsViewModeInput) {
    kdsViewModeInput.addEventListener("change", () => {
      STAFF_STATE.kdsViewMode = String(kdsViewModeInput.value || "kitchen").trim().toLowerCase();
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsSourceInput) {
    kdsSourceInput.addEventListener("change", () => {
      STAFF_STATE.kdsSourceFilter = String(kdsSourceInput.value || "all").trim().toLowerCase();
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsAddedItemsToggle) {
    kdsAddedItemsToggle.addEventListener("click", () => {
      STAFF_STATE.kdsAdditionsOnly = !STAFF_STATE.kdsAdditionsOnly;
      syncStaffKdsFilterControls();
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsSortInput) {
    kdsSortInput.addEventListener("change", () => {
      STAFF_STATE.kdsSortMode = String(kdsSortInput.value || "oldest").trim().toLowerCase() || "oldest";
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsHideServedToggle) {
    kdsHideServedToggle.addEventListener("click", () => {
      STAFF_STATE.kdsHideServed = !isStaffKdsHideServedEnabled();
      syncStaffKdsFilterControls();
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsHideCancelledToggle) {
    kdsHideCancelledToggle.addEventListener("click", () => {
      STAFF_STATE.kdsHideCancelled = !isStaffKdsHideCancelledEnabled();
      syncStaffKdsFilterControls();
      saveStaffKdsPreferences();
      renderCurrentStaffKds();
    });
  }

  if (kdsClearFiltersButton) {
    kdsClearFiltersButton.addEventListener("click", () => {
      resetStaffKdsFilters();
    });
  }

  if (kdsSummary && kdsSummary.dataset.boundKeydown !== "true") {
    kdsSummary.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const summaryCard = target.closest("[data-staff-kds-summary-filter]");
      if (!summaryCard) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleStaffKdsSummaryFilter(summaryCard.getAttribute("data-staff-kds-summary-filter") || "");
    });

    kdsSummary.dataset.boundKeydown = "true";
  }

  if (kdsContent && kdsContent.dataset.boundKeydown !== "true") {
    kdsContent.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const columnHead = target.closest("[data-staff-kds-column-filter]");
      if (!columnHead) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleStaffKdsStageFilter(columnHead.getAttribute("data-staff-kds-column-filter") || "");
    });

    kdsContent.dataset.boundKeydown = "true";
  }

  if (rangeInput) {
    rangeInput.addEventListener("change", () => {
      void loadStaffOrders();
    });
  }

  sourceCardButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      selectStaffOrderSourceCard(
        button.getAttribute("data-staff-order-source-card") || "",
        { revealManagement: event.detail > 0 }
      );
    });
  });

  if (backToSourcesButton) {
    backToSourcesButton.addEventListener("click", () => {
      selectStaffOrderSourceCard("");
      document.querySelector("[data-staff-order-source-card]")?.focus();
    });
  }

  if (sourceInput) {
    sourceInput.addEventListener("change", () => {
      const nextSourceCard = getStaffOrderSourceCardKeyForFilter(sourceInput.value);
      if (nextSourceCard && nextSourceCard !== getStaffSelectedOrderSourceCard()) {
        STAFF_STATE.selectedOrderSourceCard = nextSourceCard;
        clearStaffOrderSourceFreshCount(nextSourceCard);
        updateStaffOrderTableFilterOptions(
          getStaffOrdersForSourceCard(nextSourceCard)
        );
        renderStaffOrderSourceCards(STAFF_STATE.orders);
      }
      renderCurrentStaffOrders();
    });
  }

  if (tableInput) {
    tableInput.addEventListener("change", () => {
      renderCurrentStaffOrders();
    });
  }

  if (ordersSearchInput) {
    ordersSearchInput.addEventListener("input", () => {
      if (staffOrdersSearchTimer) {
        window.clearTimeout(staffOrdersSearchTimer);
      }

      staffOrdersSearchTimer = window.setTimeout(() => {
        staffOrdersSearchTimer = null;
        renderCurrentStaffOrders();
      }, 180);
    });
  }

  if (paymentInput) {
    paymentInput.addEventListener("change", () => {
      renderCurrentStaffOrders();
    });
  }

  if (billingInput) {
    billingInput.addEventListener("change", () => {
      renderCurrentStaffOrders();
    });
  }

  if (orderStatusInput) {
    orderStatusInput.addEventListener("change", () => {
      renderCurrentStaffOrders();
    });
  }

  orderStatusNavigationButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!orderStatusInput) return;

      const status = button.getAttribute("data-staff-order-status-filter") || "all";
      if (!["all", ...STAFF_ORDER_STATUS_OPTIONS, ...STAFF_ORDER_PAYMENT_EXCEPTION_STATUSES].includes(status)) return;

      orderStatusInput.value = status;
      renderCurrentStaffOrders();
    });
  });

  if (attentionToggle) {
    attentionToggle.addEventListener("click", () => {
      setStaffAttentionFilterEnabled(!isStaffAttentionFilterEnabled());
      renderCurrentStaffOrders();
    });
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", () => {
      resetStaffViewFilters();
    });
  }

  if (tableOrderForm) {
    tableOrderForm.addEventListener("submit", (event) => {
      void handleStaffTableOrderSubmit(event);
    });
    tableOrderForm.addEventListener("input", () => {
      syncStaffTakeOrderProgress();
    });
  }

  if (paymentMethodSettingsForm) {
    paymentMethodSettingsForm.addEventListener("submit", (event) => {
      void handleStaffPaymentMethodSettingsSubmit(event);
    });
  }

  if (tableOrderTableInput) {
    tableOrderTableInput.addEventListener("input", () => {
      setStaffTableOrderConflict(null);
      if ($("#staffTableOrderStatus")?.dataset.statusTone === "warning") {
        setStaffTableOrderStatus("");
      }
    });
  }

  if (tableOrderOpenExistingButton) {
    tableOrderOpenExistingButton.addEventListener("click", () => {
      const orderId = STAFF_STATE.tableOrderConflict?.id || "";
      if (orderId) void openStaffOrderFromTableActivity(orderId);
    });
  }

  if (tableOrderChooseDifferentButton) {
    tableOrderChooseDifferentButton.addEventListener("click", () => {
      if (tableOrderTableInput) {
        tableOrderTableInput.value = "";
        tableOrderTableInput.readOnly = false;
        delete tableOrderTableInput.dataset.restaurantTableId;
      }
      STAFF_STATE.selectedRestaurantTableId = "";
      setStaffTableOrderConflict(null);
      setStaffTableOrderStatus("Enter a different table number.", "muted");
      tableOrderTableInput?.focus();
    });
  }

  if (takeOrderOpenTablesButton) {
    takeOrderOpenTablesButton.addEventListener("click", () => {
      showStaffTakeOrderSubview("tables");
    });
  }

  if (takeOrderOpenCreateButton) {
    takeOrderOpenCreateButton.addEventListener("click", () => {
      resetStaffTableOrderAdditionMode();
      showStaffTakeOrderSubview("create");
    });
  }

  [takeOrderTablesBackButton, takeOrderTablesHomeButton, takeOrderCreateBackButton].forEach((button) => {
    button?.addEventListener("click", () => {
      if (button === takeOrderCreateBackButton && STAFF_STATE.tableOrderMode === "add") {
        STAFF_STATE.tableOrderCart = {};
        STAFF_STATE.tableOrderItemNotes = {};
        resetStaffTableOrderAdditionMode();
        showStaffTakeOrderSubview("tables", { focus: false });
        renderStaffTableOrderDetail();
        window.requestAnimationFrame(() => $("#staffTakeOrderDetailPanel")?.focus({ preventScroll: true }));
        return;
      }
      if (button === takeOrderTablesBackButton || button === takeOrderTablesHomeButton) {
        closeStaffTableOrderDetail({ restoreFocus: false });
      }
      showStaffTakeOrderSubview("home");
    });
  });

  if (takeOrderOpenOrdersButton) {
    takeOrderOpenOrdersButton.addEventListener("click", () => {
      openStaffView("orders");
    });
  }

  if (takeOrderTableSearchInput) {
    takeOrderTableSearchInput.addEventListener("input", () => {
      STAFF_STATE.tableActivityQuery = String(takeOrderTableSearchInput.value || "").trimStart();
      renderStaffTableActivity();
    });
  }

  document.querySelectorAll("[data-staff-table-activity-status]").forEach((button) => {
    button.addEventListener("click", () => {
      STAFF_STATE.tableActivityStatus = button.dataset.staffTableActivityStatus || "all";
      renderStaffTableActivity();
    });
  });

  if (takeOrderRefreshTablesButton) {
    takeOrderRefreshTablesButton.addEventListener("click", () => {
      void loadStaffTableActivity();
    });
  }

  if (manageTablesButton) {
    manageTablesButton.addEventListener("click", () => {
      const panel = $("#staffTableManagementPanel");
      if (panel) panel.hidden = false;
      void loadStaffTableMaster();
      window.requestAnimationFrame(() => panel?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  }

  if (closeTableManagementButton) {
    closeTableManagementButton.addEventListener("click", () => {
      const panel = $("#staffTableManagementPanel");
      if (panel) panel.hidden = true;
    });
  }

  addTableForm?.addEventListener("submit", (event) => {
    void handleAddRestaurantTable(event);
  });

  bulkTableForm?.addEventListener("submit", (event) => {
    void handleBulkRestaurantTables(event);
  });
  bulkTableForm?.addEventListener("input", updateBulkTablePreview);

  saveTableMasterSettingsButton?.addEventListener("click", () => {
    void saveTableMasterEnforcement();
  });

  if (takeOrderDetailCloseButton) {
    takeOrderDetailCloseButton.addEventListener("click", () => {
      closeStaffTableOrderDetail();
    });
  }

  if (takeOrderDetailPanel) {
    takeOrderDetailPanel.addEventListener("scroll", () => {
      STAFF_STATE.tableOrderDetailScrollTop = takeOrderDetailPanel.scrollTop;
    }, { passive: true });
  }

  if (tableOrderMobileCartButton) {
    tableOrderMobileCartButton.addEventListener("click", () => {
      openStaffTableOrderMobileSheet();
    });
  }

  if (tableOrderMobileSheetCloseButton) {
    tableOrderMobileSheetCloseButton.addEventListener("click", () => {
      closeStaffTableOrderMobileSheet();
    });
  }

  if (tableOrderMobileBackToMenuButton) {
    tableOrderMobileBackToMenuButton.addEventListener("click", () => {
      closeStaffTableOrderMobileSheet();
      $("#staffTableOrderSearchInput")?.scrollIntoView({
        behavior: getStaffPreferredScrollBehavior(),
        block: "center"
      });
      $("#staffTableOrderSearchInput")?.focus({ preventScroll: true });
    });
  }

  if (tableOrderMobileSheet) {
    tableOrderMobileSheet.addEventListener("close", () => {
      if (
        STAFF_STATE.activeView === "table-order" &&
        STAFF_STATE.tableOrderSubview === "create" &&
        getStaffTableOrderCartEntries().length
      ) {
        tableOrderMobileCartButton?.focus({ preventScroll: true });
      }
    });
  }

  if (tableOrderClearButton) {
    tableOrderClearButton.addEventListener("click", () => {
      if (STAFF_STATE.tableOrderMode === "add") {
        STAFF_STATE.tableOrderCart = {};
        STAFF_STATE.tableOrderItemNotes = {};
        STAFF_STATE.tableOrderIdempotencyKey = createStaffOrderAdditionIdempotencyKey();
        const noteInput = $("#staffTableOrderNoteInput");
        if (noteInput) noteInput.value = "";
        renderStaffTableOrderMenu();
        renderStaffTableOrderCart();
        syncStaffTableOrderMode();
        setStaffTableOrderStatus("New-items cart cleared. Existing order items were not changed.", "muted");
      } else {
        clearStaffTableOrderForm();
      }
    });
  }

  if (tableOrderRefreshMenuButton) {
    tableOrderRefreshMenuButton.addEventListener("click", () => {
      void loadStaffTableOrderMenu();
    });
  }

  if (tableOrderSearchInput) {
    tableOrderSearchInput.addEventListener("input", () => {
      STAFF_STATE.tableOrderMenuQuery = String(tableOrderSearchInput.value || "").trimStart();
      if (staffTableOrderSearchTimer) {
        window.clearTimeout(staffTableOrderSearchTimer);
      }
      staffTableOrderSearchTimer = window.setTimeout(() => {
        staffTableOrderSearchTimer = null;
        resetStaffTableOrderMenuRenderLimit();
        renderStaffTableOrderMenu();
      }, 240);
    });
  }

  if (tableOrderCategoryFilter) {
    tableOrderCategoryFilter.addEventListener("change", () => {
      setStaffTableOrderMenuCategory(tableOrderCategoryFilter.value || "all");
    });
  }

  if (tableOrderCategoryPills) {
    tableOrderCategoryPills.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const categoryButton = target.closest("[data-staff-table-order-category]");
      if (!categoryButton) return;
      setStaffTableOrderMenuCategory(categoryButton.dataset.staffTableOrderCategory || "all");
    });
  }

  document.querySelectorAll("[data-staff-view]").forEach((button) => {
    button.addEventListener("click", () => {
      openStaffView(button.dataset.staffView || "orders");
    });
  });

  if (reservationsRefreshButton) {
    reservationsRefreshButton.addEventListener("click", () => {
      void loadStaffReservations();
    });
  }

  if (reservationsRangeInput) {
    reservationsRangeInput.addEventListener("change", () => {
      void loadStaffReservations();
    });
  }

  if (reservationsStatusInput) {
    reservationsStatusInput.addEventListener("change", () => {
      renderCurrentStaffReservations();
    });
  }

  if (inquiriesRefreshButton) {
    inquiriesRefreshButton.addEventListener("click", () => {
      void loadStaffInquiries();
    });
  }

  if (inquiriesRangeInput) {
    inquiriesRangeInput.addEventListener("change", () => {
      void loadStaffInquiries();
    });
  }

  if (inquiriesStatusInput) {
    inquiriesStatusInput.addEventListener("change", () => {
      renderCurrentStaffInquiries();
    });
  }

  if (contactsRefreshButton) {
    contactsRefreshButton.addEventListener("click", () => {
      void loadStaffContacts();
    });
  }

  if (contactsRangeInput) {
    contactsRangeInput.addEventListener("change", () => {
      void loadStaffContacts();
    });
  }

  if (contactsStatusInput) {
    contactsStatusInput.addEventListener("change", () => {
      renderCurrentStaffContacts();
    });
  }

  if (supportRefreshButton) {
    supportRefreshButton.addEventListener("click", () => {
      void loadStaffSupportRequests();
    });
  }

  if (supportRangeInput) {
    supportRangeInput.addEventListener("change", () => {
      void loadStaffSupportRequests();
    });
  }

  if (supportStatusInput) {
    supportStatusInput.addEventListener("change", () => {
      renderCurrentStaffSupportRequests();
    });
  }

  if (roomsRefreshButton) {
    roomsRefreshButton.addEventListener("click", () => {
      void loadStaffRooms();
    });
  }

  if (roomOperationsApplyButton) {
    roomOperationsApplyButton.addEventListener("click", () => {
      void loadStaffRoomOperations();
    });
  }

  if (roomOperationsSearchInput) {
    roomOperationsSearchInput.addEventListener("input", () => {
      renderStaffRoomAvailabilityGrid();
    });
  }

  if (roomOperationsStatusInput) {
    roomOperationsStatusInput.addEventListener("change", () => {
      renderStaffRoomAvailabilityGrid();
    });
  }

  [roomOperationsCheckInInput, roomOperationsCheckOutInput].forEach((input) => {
    input?.addEventListener("change", () => {
      const status = $("#staffRoomOperationsStatus");
      if (status) {
        status.hidden = false;
        status.className = "staff-status";
        status.textContent = "Dates changed. Select Update Room View to refresh shared availability.";
      }
    });
  });

  const refreshRoomBookingFilters = () => {
    STAFF_STATE.roomBookingPage = 1;
    void loadStaffRoomBookings();
  };

  [roomsStatusInput, roomsPaymentStatusInput, roomsSortInput, roomsFromDateInput, roomsToDateInput, roomsLimitInput].forEach((input) => {
    input?.addEventListener("change", refreshRoomBookingFilters);
  });

  roomsSearchInput?.addEventListener("input", () => {
    window.clearTimeout(roomBookingSearchTimer);
    roomBookingSearchTimer = window.setTimeout(refreshRoomBookingFilters, 300);
  });
  roomBookingsRefreshButton?.addEventListener("click", () => { void loadStaffRoomBookings(); });
  roomBookingsPreviousButton?.addEventListener("click", () => {
    if (STAFF_STATE.roomBookingPagination?.hasPrevious !== true) return;
    STAFF_STATE.roomBookingPage = Math.max(1, STAFF_STATE.roomBookingPage - 1);
    void loadStaffRoomBookings();
  });
  roomBookingsNextButton?.addEventListener("click", () => {
    if (STAFF_STATE.roomBookingPagination?.hasNext !== true) return;
    STAFF_STATE.roomBookingPage += 1;
    void loadStaffRoomBookings();
  });

  roomBookingDetailDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeStaffRoomBookingDetail();
  });
  roomBookingDetailDialog?.addEventListener("close", () => {
    finishStaffRoomBookingDetailClose();
  });

  if (roomsResetFiltersButton) {
    roomsResetFiltersButton.addEventListener("click", () => {
      if (roomsStatusInput) roomsStatusInput.value = "all";
      if (roomsPaymentStatusInput) roomsPaymentStatusInput.value = "all";
      if (roomsSearchInput) roomsSearchInput.value = "";
      if (roomsSortInput) roomsSortInput.value = "created_desc";
      if (roomsFromDateInput) roomsFromDateInput.value = "";
      if (roomsToDateInput) roomsToDateInput.value = "";
      if (roomsLimitInput) roomsLimitInput.value = "25";
      STAFF_STATE.roomBookingPage = 1;
      void loadStaffRoomBookings();
    });
  }

  if (roomBookingForm) {
    roomBookingForm.addEventListener("submit", (event) => {
      void handleStaffRoomBookingSubmit(event);
    });
  }

  const roomAdvanceOptionInput = $("#staffRoomAdvanceOptionInput");
  if (roomAdvanceOptionInput) {
    roomAdvanceOptionInput.addEventListener("change", syncStaffRoomAdvanceFields);
    syncStaffRoomAdvanceFields();
  }
  const roomAdvancePolicySaveButton = $("#staffRoomAdvancePolicySaveBtn");
  if (roomAdvancePolicySaveButton) {
    roomAdvancePolicySaveButton.addEventListener("click", () => {
      void saveStaffRoomAdvancePolicy();
    });
  }

  if (roomNegotiatedRateEnabledInput) {
    roomNegotiatedRateEnabledInput.addEventListener("change", () => {
      syncStaffRoomNegotiatedRateFields();
    });
    syncStaffRoomNegotiatedRateFields({ clearDisabled: false });
  }

  if (roomBookingAvailabilityButton) {
    roomBookingAvailabilityButton.addEventListener("click", async () => {
      try {
        roomBookingAvailabilityButton.disabled = true;
        roomBookingAvailabilityButton.textContent = "Checking...";
        setStaffRoomBookingStatus("Checking room availability...", false);
        await checkStaffRoomBookingAvailability();
      } catch (error) {
        console.error("Staff room availability check failed:", error);
        setStaffRoomBookingStatus(
          error.message || "Failed to check room availability.",
          true
        );
      } finally {
        roomBookingAvailabilityButton.disabled = false;
        roomBookingAvailabilityButton.textContent = "Check Available Rooms";
      }
    });
  }

  if (roomBookingResetButton) {
    roomBookingResetButton.addEventListener("click", () => {
      resetStaffRoomBookingForm();
    });
  }

  [
    roomBookingCheckInInput,
    roomBookingCheckOutInput,
    roomBookingAdultsInput,
    roomBookingChildrenInput
  ].forEach((input) => {
    input?.addEventListener("change", () => {
      if (!roomBookingCheckInInput?.value || !roomBookingCheckOutInput?.value) return;
      if (roomBookingCheckOutInput.value <= roomBookingCheckInInput.value) return;
      void checkStaffRoomBookingAvailability().catch((error) => {
        setStaffRoomBookingStatus(error.message || "Failed to check room availability.", true);
      });
    });
  });

  if (roomServiceOrderForm) {
    roomServiceOrderForm.addEventListener("submit", (event) => {
      void handleStaffRoomServiceOrderSubmit(event);
    });
  }

  if (roomServiceRefreshMenuButton) {
    roomServiceRefreshMenuButton.addEventListener("click", async () => {
      roomServiceRefreshMenuButton.disabled = true;
      roomServiceRefreshMenuButton.textContent = "Refreshing...";
      setStaffRoomServiceStatus("Refreshing menu...", false);
      try {
        await loadStaffTableOrderMenu({ silent: true });
        setStaffRoomServiceStatus("Menu refreshed.", false);
      } catch (error) {
        setStaffRoomServiceStatus(error.message || "Failed to refresh menu.", true);
      } finally {
        roomServiceRefreshMenuButton.disabled = false;
        roomServiceRefreshMenuButton.textContent = "Refresh Menu";
      }
    });
  }

  if (roomServiceAddItemButton) {
    roomServiceAddItemButton.addEventListener("click", () => {
      addSelectedStaffRoomServiceItem();
    });
  }

  if (roomServiceClearCartButton) {
    roomServiceClearCartButton.addEventListener("click", () => {
      STAFF_STATE.roomServiceCart = {};
      renderStaffRoomServiceCart();
      setStaffRoomServiceStatus("Room service items cleared.", false);
    });
  }

  if (roomServiceChargeToRoomInput && roomServicePaymentMethodInput) {
    roomServiceChargeToRoomInput.addEventListener("change", () => {
      if (roomServiceChargeToRoomInput.checked) {
        roomServicePaymentMethodInput.value = "Room Bill";
      } else if (roomServicePaymentMethodInput.value === "Room Bill") {
        roomServicePaymentMethodInput.value = "COD";
      }
    });

    roomServicePaymentMethodInput.addEventListener("change", () => {
      roomServiceChargeToRoomInput.checked = roomServicePaymentMethodInput.value === "Room Bill";
    });
  }

  if (testimonialsRefreshButton) {
    testimonialsRefreshButton.addEventListener("click", () => {
      void loadStaffTestimonials();
    });
  }

  if (testimonialsRangeInput) {
    testimonialsRangeInput.addEventListener("change", () => {
      void loadStaffTestimonials();
    });
  }

  if (testimonialsApprovalInput) {
    testimonialsApprovalInput.addEventListener("change", () => {
      renderCurrentStaffTestimonials();
    });
  }

  document.addEventListener("change", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const statusSelect = target.closest("[data-staff-record-status-select]");
    if (statusSelect) {
      updateStaffRecordStatusButtonState(statusSelect);
    }

    const roomBookingStatusSelect = target.closest("[data-staff-room-booking-status-select]");
    if (roomBookingStatusSelect) {
      updateStaffRoomBookingStatusButtonState(roomBookingStatusSelect);
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const itemId = String(target.dataset.staffTableOrderItemNote || "").trim();
    if (!itemId) return;
    STAFF_STATE.tableOrderItemNotes = {
      ...STAFF_STATE.tableOrderItemNotes,
      [itemId]: String(target.value || "").slice(0, 500)
    };
  });

  document.addEventListener("toggle", (event) => {
    const details = event.target;

    if (!(details instanceof HTMLDetailsElement) || !details.matches("[data-staff-order-details]")) {
      return;
    }

    const orderId = String(details.dataset.orderId || "").trim();
    if (!orderId) return;

    if (details.open) {
      STAFF_STATE.expandedOrderIds.add(orderId);
    } else {
      STAFF_STATE.expandedOrderIds.delete(orderId);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const roomBookingSourceButton = target.closest("[data-room-booking-source]");
    if (roomBookingSourceButton) {
      selectStaffRoomBookingSource(roomBookingSourceButton.dataset.roomBookingSource || "website");
      return;
    }

    const openRoomBookingButton = target.closest("[data-staff-room-open-booking]");
    if (openRoomBookingButton) {
      showStaffRoomOperationsView("booking");
      const dates = ensureStaffRoomOperationsDates();
      const checkInInput = $("#staffRoomBookingCheckInInput");
      const checkOutInput = $("#staffRoomBookingCheckOutInput");
      if (dates && checkInInput && checkOutInput) {
        if (!checkInInput.value) checkInInput.value = dates.checkInDate;
        if (!checkOutInput.value) checkOutInput.value = dates.checkOutDate;
        void checkStaffRoomBookingAvailability().catch((error) => {
          setStaffRoomBookingStatus(error.message || "Failed to check room availability.", true);
        });
      }
      return;
    }

    const openRoomAvailabilityButton = target.closest("[data-staff-room-open-availability]");
    if (openRoomAvailabilityButton) {
      showStaffRoomOperationsView("availability");
      if (!STAFF_STATE.roomOperationsRooms.length) void loadStaffRoomOperations();
      return;
    }

    const openRoomServiceButton = target.closest("[data-staff-room-open-service]");
    if (openRoomServiceButton) {
      showStaffRoomOperationsView("service");
      void ensureStaffRoomServiceMenuLoaded();
      return;
    }

    const roomBackHomeButton = target.closest("[data-staff-room-back-home]");
    if (roomBackHomeButton) {
      showStaffRoomOperationsView("home");
      return;
    }

    const openBookingDetailButton = target.closest("[data-staff-room-booking-detail]");
    if (openBookingDetailButton) {
      void openStaffRoomBookingDetail(
        openBookingDetailButton.dataset.staffRoomBookingDetail || "",
        openBookingDetailButton
      );
      return;
    }

    if (target.closest("[data-staff-close-room-booking-detail]")) {
      closeStaffRoomBookingDetail();
      return;
    }

    const retryBookingDetailButton = target.closest("[data-staff-retry-room-booking-detail]");
    if (retryBookingDetailButton) {
      void openStaffRoomBookingDetail(
        retryBookingDetailButton.dataset.staffRetryRoomBookingDetail || "",
        STAFF_STATE.selectedRoomBookingTrigger
      );
      return;
    }

    const openRoomDetailButton = target.closest("[data-staff-room-open-detail]");
    if (openRoomDetailButton) {
      void openStaffRoomOperationDetail(
        openRoomDetailButton.dataset.staffRoomOpenDetail || "",
        openRoomDetailButton
      );
      return;
    }

    if (target.closest("[data-staff-room-close-detail]")) {
      closeStaffRoomOperationDetail();
      return;
    }

    const bookSelectedRoomButton = target.closest("[data-staff-room-book-room]");
    if (bookSelectedRoomButton) {
      void openStaffRoomBookingForRoom(bookSelectedRoomButton.dataset.staffRoomBookRoom || "");
      return;
    }

    const roomServiceBookingButton = target.closest("[data-staff-room-service-booking]");
    if (roomServiceBookingButton) {
      openStaffRoomServiceForBooking(
        roomServiceBookingButton.dataset.staffRoomServiceBooking || ""
      );
      return;
    }

    if (target.closest("[data-staff-room-open-records]")) {
      closeStaffRoomOperationDetail();
      showProfessionalRoomView?.("bookings", { historyMode: "push", focus: true });
      selectStaffRoomBookingSource(STAFF_STATE.roomBookingSource || "website", { historyMode: "replace", load: true, acknowledge: true });
      return;
    }

    const dashboardTrendRetryButton = target.closest("[data-staff-dashboard-trend-retry]");
    if (dashboardTrendRetryButton) {
      void loadStaffDashboardTrend();
      return;
    }

    const dashboardOrdersRetryButton = target.closest("[data-staff-dashboard-orders-retry]");
    if (dashboardOrdersRetryButton) {
      void loadStaffOrders();
      return;
    }

    const dashboardInsightsRetryButton = target.closest("[data-staff-dashboard-insights-retry]");
    if (dashboardInsightsRetryButton) {
      void (STAFF_STATE.dashboardReportsError
        ? loadStaffDashboardReports()
        : loadStaffDashboardItemSales());
      return;
    }

    const retryOrdersButton = target.closest("[data-staff-orders-retry]");
    if (retryOrdersButton) {
      void loadStaffOrders();
      return;
    }

    const retryTableActivityButton = target.closest("[data-staff-retry-table-activity]");
    if (retryTableActivityButton) {
      void loadStaffTableActivity();
      return;
    }

    const retrySelectedTableOrderButton = target.closest("[data-staff-retry-selected-table-order]");
    if (retrySelectedTableOrderButton) {
      void loadSelectedStaffTableOrder().catch(() => {});
      return;
    }

    const saveTableButton = target.closest("[data-staff-save-table]");
    if (saveTableButton) {
      void saveRestaurantTable(saveTableButton.dataset.staffSaveTable || "");
      return;
    }

    const tableQrButton = target.closest("[data-staff-table-qr]");
    if (tableQrButton) {
      void generateRestaurantTableQr(tableQrButton.dataset.staffTableQr || "");
      return;
    }

    const rotateTableQrButton = target.closest("[data-staff-table-qr-rotate]");
    if (rotateTableQrButton) {
      void rotateRestaurantTableQr(rotateTableQrButton.dataset.staffTableQrRotate || "");
      return;
    }

    const revokeTableQrButton = target.closest("[data-staff-table-qr-revoke]");
    if (revokeTableQrButton) {
      void revokeRestaurantTableQr(revokeTableQrButton.dataset.staffTableQrRevoke || "");
      return;
    }

    const availableTableButton = target.closest("[data-staff-select-available-table]");
    if (availableTableButton) {
      void selectAvailableRestaurantTable(availableTableButton.dataset.staffSelectAvailableTable || "");
      return;
    }

    const openTableOrderButton = target.closest("[data-staff-open-table-order]");
    if (openTableOrderButton) {
      void openStaffOrderFromTableActivity(openTableOrderButton.dataset.staffOpenTableOrder || "");
      return;
    }

    const addMoreItemsButton = target.closest("[data-staff-add-more-items]");
    if (addMoreItemsButton) {
      void openStaffAddMoreItems(addMoreItemsButton.dataset.orderId || "");
      return;
    }

    const clearOrderFiltersButton = target.closest("[data-staff-clear-order-filters]");
    if (clearOrderFiltersButton) {
      resetStaffViewFilters();
      return;
    }

    const roomServiceRemoveButton = target.closest("[data-staff-room-service-remove]");
    if (roomServiceRemoveButton) {
      const itemId = roomServiceRemoveButton.dataset.staffRoomServiceRemove || "";
      setStaffRoomServiceCartQty(itemId, 0);
      setStaffRoomServiceStatus("Item removed from room service order.", false);
      return;
    }

    const tableOrderLoadMoreButton = target.closest("[data-staff-table-order-load-more]");
    if (tableOrderLoadMoreButton) {
      STAFF_STATE.tableOrderMenuRenderLimit += STAFF_TABLE_ORDER_RENDER_BATCH_SIZE;
      renderStaffTableOrderMenu();
      return;
    }

    const tableOrderPlusButton = target.closest("[data-staff-table-order-plus]");
    if (tableOrderPlusButton) {
      const itemId = tableOrderPlusButton.dataset.staffTableOrderPlus || "";
      setStaffTableOrderItemQty(itemId, getStaffTableOrderItemQty(itemId) + 1);
      return;
    }

    const tableOrderMinusButton = target.closest("[data-staff-table-order-minus]");
    if (tableOrderMinusButton) {
      const itemId = tableOrderMinusButton.dataset.staffTableOrderMinus || "";
      setStaffTableOrderItemQty(itemId, getStaffTableOrderItemQty(itemId) - 1);
      return;
    }

    const markBilledButton = target.closest("[data-staff-mark-billed]");
    if (markBilledButton) {
      void handleStaffOrderAction(markBilledButton, "mark-billed", "Mark billed");
      return;
    }

    const updateRoomBookingStatusButton = target.closest("[data-staff-update-room-booking-status]");
    if (updateRoomBookingStatusButton) {
      void handleStaffRoomBookingStatusUpdate(updateRoomBookingStatusButton);
      return;
    }

    const recordRoomPaymentButton = target.closest("[data-staff-record-room-payment]");
    if (recordRoomPaymentButton) {
      void handleStaffRoomBookingPayment(recordRoomPaymentButton);
      return;
    }

    const recordRoomRefundButton = target.closest("[data-staff-record-room-refund]");
    if (recordRoomRefundButton) {
      void handleStaffRoomBookingRefund(recordRoomRefundButton);
      return;
    }

    const roomCheckoutSummaryButton = target.closest("[data-staff-room-checkout-summary-btn]");
    if (roomCheckoutSummaryButton) {
      void handleStaffRoomCheckoutSummary(roomCheckoutSummaryButton);
      return;
    }

    const roomCheckoutPrintButton = target.closest("[data-staff-room-checkout-print]");
    if (roomCheckoutPrintButton) {
      const bookingId = String(roomCheckoutPrintButton.dataset.bookingId || "").trim();
      const bill = STAFF_STATE.roomCheckoutBills?.[bookingId];

      if (!bill) {
        window.alert("Load the checkout summary before printing.");
        return;
      }

      void staffFetchJson(
        `${STAFF_API_BASE}/room-checkout-bill/bookings/${encodeURIComponent(bookingId)}/audit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bill_printed" })
        }
      ).catch(() => {});
      openStaffRoomCheckoutInvoice(bill);
      return;
    }

    const finalizeRoomCombinedCheckoutButton = target.closest("[data-staff-finalize-room-combined-checkout]");
    if (finalizeRoomCombinedCheckoutButton) {
      void handleStaffRoomCombinedCheckoutButton(finalizeRoomCombinedCheckoutButton);
      return;
    }

    const markPaidButton = target.closest("[data-staff-mark-paid]");
    if (markPaidButton) {
      void handleStaffOrderAction(markPaidButton, "mark-paid", "Mark paid");
      return;
    }

    const markFamilyBilledButton = target.closest("[data-staff-mark-family-billed]");
    if (markFamilyBilledButton) {
      void handleStaffOrderAction(markFamilyBilledButton, "mark-family-billed", "Mark full table billed");
      return;
    }

    const markFamilyPaidButton = target.closest("[data-staff-mark-family-paid]");
    if (markFamilyPaidButton) {
      void handleStaffOrderAction(markFamilyPaidButton, "mark-family-paid", "Mark full table paid");
      return;
    }

    const viewBillButton = target.closest("[data-staff-view-bill]");
    if (viewBillButton) {
      const orderId = viewBillButton.dataset.orderId || "";
      const order = findStaffOrder(orderId);

      if (!order) {
        window.alert("Order not found in the current staff list.");
        return;
      }

      openStaffOrderBill(order);
      return;
    }

    const updateKdsStatusButton = target.closest("[data-staff-kds-update-status]");
    if (updateKdsStatusButton) {
      void handleStaffKdsStatusAction(updateKdsStatusButton);
      return;
    }

    const kdsColumnFilterHead = target.closest("[data-staff-kds-column-filter]");
    if (kdsColumnFilterHead) {
      toggleStaffKdsStageFilter(kdsColumnFilterHead.getAttribute("data-staff-kds-column-filter") || "");
      return;
    }

    const kdsSummaryFilterCard = target.closest("[data-staff-kds-summary-filter]");
    if (kdsSummaryFilterCard) {
      toggleStaffKdsSummaryFilter(kdsSummaryFilterCard.getAttribute("data-staff-kds-summary-filter") || "");
      return;
    }

    const retryKdsButton = target.closest("[data-staff-kds-retry]");
    if (retryKdsButton) {
      void loadStaffKdsOrders();
      return;
    }

    const updateRecordStatusButton = target.closest("[data-staff-update-record-status]");
    if (updateRecordStatusButton) {
      void handleStaffRecordStatusAction(updateRecordStatusButton);
      return;
    }

    const testimonialApprovalButton = target.closest("[data-staff-toggle-testimonial-approval]");
    if (testimonialApprovalButton) {
      void handleStaffTestimonialApprovalAction(testimonialApprovalButton);
    }
  });
}

async function initStaffOrdersPage() {
  applyStaffPageMode();
  prefillStaffHotelSlug();
  bindStaffSoundRuntimeUnlock();
  bindStaffLoginForm();
  bindStaffReferenceHeader();
  bindStaffDashboardOverviewActions();
  bindStaffLogout();
  bindStaffFullscreenToggle();
  bindStaffSoundAlertToggle();
  bindStaffSoundVolumeControl();
  bindStaffBrowserAlertToggle();
  bindStaffOrderActions();
  syncStaffSidebarForViewport();
  await checkExistingStaffSession();
}

window.addEventListener("offline", () => {
  if (!shouldStaffSynchronizeKds()) return;
  setStaffKdsLiveStatus("Kitchen offline", "warning");
  updateStaffKitchenDisplayFreshness(
    `Offline · last synchronized ${formatStaffRefreshTime()}`
  );
});

window.addEventListener("online", () => {
  if (
    !shouldStaffSynchronizeKds() ||
    !getStaffToken() ||
    !canStaffUseFeature("food")
  ) {
    return;
  }
  setStaffKdsLiveStatus("Kitchen reconnecting", "muted");
  void loadStaffKdsOrders({ silent: true }).catch(() => {});
});

document.addEventListener("visibilitychange", () => {
  if (!shouldStaffSynchronizeKds()) return;
  if (document.hidden) {
    updateStaffKitchenDisplayFreshness(
      `Background mode · last synchronized ${formatStaffRefreshTime()}`
    );
    return;
  }
  if (getStaffToken() && canStaffUseFeature("food")) {
    void loadStaffKdsOrders({ silent: true }).catch(() => {});
  }
});

window.addEventListener("beforeunload", stopStaffAutoRefresh);
window.addEventListener("resize", handleStaffViewportChange);
document.addEventListener("DOMContentLoaded", initStaffOrdersPage);















