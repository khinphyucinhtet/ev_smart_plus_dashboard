import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getDatabase,
  onValue,
  ref,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRs1tS9yobBzOtkp-U3mqVfu9swTij1EU",
  authDomain: "evsmart-2694c.firebaseapp.com",
  databaseURL:
    "https://evsmart-2694c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "evsmart-2694c",
  storageBucket: "evsmart-2694c.firebasestorage.app",
  messagingSenderId: "1016507832438",
  appId: "1:1016507832438:web:8a77cfb51c61b922e26757",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let activeRole = new URLSearchParams(location.search).get("role") || "hospital";
activeRole = normalizeRole(activeRole);
let alerts = [];
let notifications = [];
const selectedIds = new Set();
let reportGeneratedAt = null;
let reportGenerationTimer = null;
let reportBannerTimer = null;
let reportConfidenceScore = 94;
let selangorMap = null;
let zoneLayers = new Map();
let mapOverlayDismissed = false;
const hospitalReportTitle = "Hospital report submitted";
const chartDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const reportZones = {
  "shah-alam": {
    title: "Shah Alam",
    riskText: "High alert zone",
    riskClass: "high-text",
    incidentsCount: 14,
    criticalPct: 36,
    action: "Pre-position 1 ambulance unit",
    window: "5 PM - 8 PM",
    level: "high",
    center: [3.0738, 101.5183],
    polygon: [
      [3.175, 101.365],
      [3.166, 101.47],
      [3.118, 101.548],
      [3.036, 101.595],
      [2.985, 101.553],
      [2.979, 101.445],
      [3.02, 101.375],
      [3.095, 101.345],
    ],
    narrative:
      "Frequent severe alerts are clustering around Shah Alam, so ambulance units should keep standby coverage closer to Persiaran Kayangan and nearby access roads.",
    spark: [4, 7, 9, 6, 11, 10, 14],
  },
  klang: {
    title: "Klang",
    riskText: "High alert zone",
    riskClass: "high-text",
    incidentsCount: 12,
    criticalPct: 31,
    action: "Increase standby around Klang corridor",
    window: "6 PM - 9 PM",
    level: "high",
    center: [3.0449, 101.4455],
    polygon: [
      [3.135, 101.279],
      [3.112, 101.372],
      [3.062, 101.436],
      [2.998, 101.451],
      [2.955, 101.404],
      [2.948, 101.315],
      [2.993, 101.252],
      [3.072, 101.24],
    ],
    narrative:
      "Klang is showing repeated roadside support demand and higher crash density near major connectors, so ambulance fuel readiness should stay elevated in this corridor.",
    spark: [5, 6, 8, 10, 8, 9, 12],
  },
  "subang-jaya": {
    title: "Subang Jaya",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 9,
    criticalPct: 22,
    action: "Increase patrol check-ins during peak hours",
    window: "4 PM - 7 PM",
    level: "medium",
    center: [3.0433, 101.5812],
    polygon: [
      [3.105, 101.508],
      [3.093, 101.595],
      [3.055, 101.628],
      [3.01, 101.62],
      [2.99, 101.57],
      [3.01, 101.515],
      [3.05, 101.494],
    ],
    narrative:
      "Subang Jaya is showing moderate accident frequency, especially during charging-stop and commute periods, so dispatch readiness should stay active around key junctions.",
    spark: [3, 5, 6, 4, 7, 8, 9],
  },
  "petaling-jaya": {
    title: "Petaling Jaya",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 8,
    criticalPct: 18,
    action: "Keep rapid-response routing open toward city connectors",
    window: "7 AM - 10 AM",
    level: "medium",
    center: [3.1073, 101.6067],
    polygon: [
      [3.175, 101.56],
      [3.164, 101.66],
      [3.115, 101.698],
      [3.064, 101.682],
      [3.045, 101.616],
      [3.066, 101.555],
      [3.121, 101.54],
    ],
    narrative:
      "Petaling Jaya remains a moderate-risk corridor with recurring support activity, so hospital routing and traffic-aware ambulance planning should stay ready.",
    spark: [2, 4, 5, 6, 5, 7, 8],
  },
  gombak: {
    title: "Gombak",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 7,
    criticalPct: 19,
    action: "Stage one roving crew on standby",
    window: "5 PM - 7 PM",
    level: "medium",
    center: [3.2561, 101.6841],
    polygon: [
      [3.34, 101.59],
      [3.324, 101.71],
      [3.27, 101.77],
      [3.203, 101.742],
      [3.187, 101.652],
      [3.222, 101.585],
    ],
    narrative:
      "Gombak is still within a moderate range, but evening incidents are becoming more frequent, so mobile responder coverage should remain flexible.",
    spark: [2, 3, 4, 5, 4, 6, 7],
  },
  kajang: {
    title: "Kajang",
    riskText: "Lower risk / monitor",
    riskClass: "low-text",
    incidentsCount: 5,
    criticalPct: 12,
    action: "Maintain normal patrol readiness",
    window: "2 PM - 5 PM",
    level: "low",
    center: [2.9935, 101.7874],
    polygon: [
      [3.07, 101.71],
      [3.065, 101.84],
      [3.005, 101.875],
      [2.946, 101.848],
      [2.934, 101.75],
      [2.974, 101.703],
    ],
    narrative:
      "Kajang currently shows lower severity and stable trend movement, so standard ambulance routing and nearby support coverage remain sufficient.",
    spark: [1, 2, 3, 3, 4, 3, 5],
  },
  sepang: {
    title: "Sepang",
    riskText: "Lower risk / monitor",
    riskClass: "low-text",
    incidentsCount: 4,
    criticalPct: 10,
    action: "Keep airport-link response route available",
    window: "11 AM - 2 PM",
    level: "low",
    center: [2.6931, 101.7498],
    polygon: [
      [2.83, 101.61],
      [2.827, 101.84],
      [2.742, 101.913],
      [2.632, 101.89],
      [2.588, 101.73],
      [2.645, 101.6],
      [2.742, 101.58],
    ],
    narrative:
      "Sepang remains lower risk overall, but long-distance EV travel routes suggest keeping one clear dispatch route open for charging-related roadside support.",
    spark: [1, 1, 2, 2, 3, 3, 4],
  },
  "kuala-selangor": {
    title: "Kuala Selangor",
    riskText: "Stable / monitor",
    riskClass: "low-text",
    incidentsCount: 4,
    criticalPct: 11,
    action: "Maintain coastal coverage",
    window: "12 PM - 3 PM",
    level: "low",
    center: [3.3395, 101.2497],
    polygon: [
      [3.47, 101.08],
      [3.47, 101.28],
      [3.38, 101.33],
      [3.25, 101.3],
      [3.22, 101.15],
      [3.31, 101.05],
    ],
    narrative:
      "Kuala Selangor remains calmer overall, but coastal highway response coverage should stay open for scattered roadside cases.",
    spark: [1, 2, 2, 3, 2, 3, 4],
  },
  rawang: {
    title: "Rawang",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 6,
    criticalPct: 17,
    action: "Keep one standby route northbound",
    window: "6 AM - 9 AM",
    level: "medium",
    center: [3.3213, 101.5767],
    polygon: [
      [3.4, 101.47],
      [3.43, 101.61],
      [3.34, 101.67],
      [3.25, 101.63],
      [3.24, 101.5],
      [3.31, 101.45],
    ],
    narrative:
      "Rawang is showing moderate commuter-risk buildup, especially on northbound connectors, so dispatch timing should be watched closely.",
    spark: [2, 3, 4, 4, 5, 5, 6],
  },
  "hulu-langat": {
    title: "Hulu Langat",
    riskText: "Stable / monitor",
    riskClass: "low-text",
    incidentsCount: 5,
    criticalPct: 13,
    action: "Maintain hillside access readiness",
    window: "3 PM - 6 PM",
    level: "low",
    center: [3.1234, 101.8602],
    polygon: [
      [3.22, 101.75],
      [3.24, 101.93],
      [3.14, 101.99],
      [3.03, 101.94],
      [3.03, 101.79],
      [3.11, 101.73],
    ],
    narrative:
      "Hulu Langat remains mostly stable, but narrower access roads mean slower ambulance routing during late-day incidents.",
    spark: [1, 2, 3, 3, 4, 4, 5],
  },
  puchong: {
    title: "Puchong",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 7,
    criticalPct: 20,
    action: "Keep one support crew near township exits",
    window: "5 PM - 8 PM",
    level: "medium",
    center: [3.0327, 101.6188],
    polygon: [
      [3.09, 101.56],
      [3.083, 101.658],
      [3.032, 101.69],
      [2.988, 101.672],
      [2.974, 101.602],
      [3.002, 101.552],
    ],
    narrative:
      "Puchong is building moderate evening congestion risk, especially around township connectors and charging-stop corridors.",
    spark: [2, 3, 4, 4, 6, 6, 7],
  },
  "ampang-jaya": {
    title: "Ampang Jaya",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 6,
    criticalPct: 18,
    action: "Keep hillside access routes clear",
    window: "4 PM - 7 PM",
    level: "medium",
    center: [3.1485, 101.7603],
    polygon: [
      [3.2, 101.69],
      [3.21, 101.8],
      [3.155, 101.85],
      [3.108, 101.828],
      [3.102, 101.73],
      [3.14, 101.69],
    ],
    narrative:
      "Ampang Jaya stays in the medium-risk band, with slower responder access expected on hilly connectors during peak traffic.",
    spark: [2, 2, 3, 4, 4, 5, 6],
  },
  "sungai-buloh": {
    title: "Sungai Buloh",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 6,
    criticalPct: 18,
    action: "Keep one standby crew near northern interchange exits",
    window: "6 PM - 8 PM",
    level: "medium",
    center: [3.2086, 101.5721],
    polygon: [
      [3.268, 101.505],
      [3.278, 101.612],
      [3.222, 101.654],
      [3.168, 101.632],
      [3.153, 101.542],
      [3.19, 101.495],
    ],
    narrative:
      "Sungai Buloh is showing moderate connector-related accident pressure, so ambulance staging should remain flexible near northern interchange routes.",
    spark: [2, 3, 3, 4, 5, 5, 6],
  },
  cyberjaya: {
    title: "Cyberjaya",
    riskText: "Lower risk / monitor",
    riskClass: "low-text",
    incidentsCount: 4,
    criticalPct: 11,
    action: "Maintain standard coverage near EV campus routes",
    window: "1 PM - 4 PM",
    level: "low",
    center: [2.9213, 101.6559],
    polygon: [
      [2.973, 101.608],
      [2.974, 101.707],
      [2.926, 101.736],
      [2.88, 101.715],
      [2.874, 101.63],
      [2.912, 101.596],
    ],
    narrative:
      "Cyberjaya remains comparatively stable, but EV commuter and campus traffic still justify maintaining one clear responder route during daytime demand.",
    spark: [1, 1, 2, 2, 3, 3, 4],
  },
};
let activeZone = "shah-alam";

const els = {
  roleTitle: document.querySelector("#roleTitle"),
  roleSubtitle: document.querySelector("#roleSubtitle"),
  feedTitle: document.querySelector("#feedTitle"),
  feedSummary: document.querySelector("#feedSummary"),
  alertFeed: document.querySelector("#alertFeed"),
  notificationFeed: document.querySelector("#notificationFeed"),
  metricLabel1: document.querySelector("#metricLabel1"),
  metricLabel2: document.querySelector("#metricLabel2"),
  metricLabel3: document.querySelector("#metricLabel3"),
  metricLabel4: document.querySelector("#metricLabel4"),
  metricValue1: document.querySelector("#metricValue1"),
  metricValue2: document.querySelector("#metricValue2"),
  metricValue3: document.querySelector("#metricValue3"),
  metricValue4: document.querySelector("#metricValue4"),
  connectionState: document.querySelector("#connectionState"),
  generateReportBtn: document.querySelector("#generateReportBtn"),
  selectAllBtn: document.querySelector("#selectAllBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  updatesPanel: document.querySelector("#updatesPanel"),
  feedPanel: document.querySelector("#feedPanel"),
  reportPanel: document.querySelector("#reportPanel"),
  reportUpdated: document.querySelector("#reportUpdated"),
  zoneTitle: document.querySelector("#zoneTitle"),
  zoneRiskText: document.querySelector("#zoneRiskText"),
  zoneNarrative: document.querySelector("#zoneNarrative"),
  zoneIncidents: document.querySelector("#zoneIncidents"),
  zoneCritical: document.querySelector("#zoneCritical"),
  zoneAction: document.querySelector("#zoneAction"),
  zoneWindow: document.querySelector("#zoneWindow"),
  mapOverlayCard: document.querySelector("#mapOverlayCard"),
  mapOverlayClose: document.querySelector("#mapOverlayClose"),
  trendChart: document.querySelector("#trendChart"),
  generateStatus: document.querySelector("#generateStatus"),
  reportBanner: document.querySelector("#reportBanner"),
  reportBannerText: document.querySelector("#reportBannerText"),
  reportBannerTime: document.querySelector("#reportBannerTime"),
  regionChips: document.querySelector("#regionChips"),
  mapOverlayTitle: document.querySelector("#mapOverlayTitle"),
  mapOverlayText: document.querySelector("#mapOverlayText"),
  mapOverlayRisk: document.querySelector("#mapOverlayRisk"),
  regionalSummary: document.querySelector("#regionalSummary"),
  riskDistribution: document.querySelector("#riskDistribution"),
  reportModalOverlay: document.querySelector("#reportModalOverlay"),
  reportModalClose: document.querySelector("#reportModalClose"),
  reportModalOk: document.querySelector("#reportModalOk"),
  reportModalGrid: document.querySelector("#reportModalGrid"),
};

document.querySelectorAll(".role-btn").forEach((button) => {
  button.addEventListener("click", () => {
    activeRole = normalizeRole(button.dataset.role);
    selectedIds.clear();
    syncRoleQuery();
    render();
  });
});

document.querySelector("#refreshBtn").addEventListener("click", () => {
  if (activeRole === "report") {
    randomizeReportData();
  }
  render();
});

els.generateReportBtn.addEventListener("click", () => {
  generateAiReport();
});

els.mapOverlayClose.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  mapOverlayDismissed = true;
  els.mapOverlayCard.classList.add("hidden");
});

els.reportModalClose.addEventListener("click", closeReportModal);
els.reportModalOk.addEventListener("click", closeReportModal);
els.reportModalOverlay.addEventListener("click", (event) => {
  if (event.target === els.reportModalOverlay) {
    closeReportModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.reportModalOverlay.classList.contains("open")) {
    closeReportModal();
  }
});

els.selectAllBtn.addEventListener("click", () => {
  const visible = visibleAlerts();
  const allSelected =
    visible.length > 0 && visible.every((item) => selectedIds.has(alertId(item)));
  selectedIds.clear();
  if (!allSelected) {
    visible.forEach((item) => selectedIds.add(alertId(item)));
  }
  render();
});

els.deleteBtn.addEventListener("click", async () => {
  if (selectedIds.size === 0) {
    return;
  }
  const ok = confirm(`Delete ${selectedIds.size} selected alert(s)?`);
  if (!ok) {
    return;
  }

  const ids = Array.from(selectedIds);
  await Promise.all(ids.map((id) => remove(ref(database, `alerts/${id}`))));

  const linkedNotificationIds = notifications
    .filter((item) => ids.includes(String(item.alert_id || "")))
    .map((item) => String(item.notification_id || ""))
    .filter(Boolean);

  await Promise.all(
    linkedNotificationIds.map((id) => remove(ref(database, `notifications/${id}`))),
  );

  selectedIds.clear();
  render();
});

els.alertFeed.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-alert-id]");
  if (!button) {
    return;
  }

  const alert = findAlertById(button.dataset.reportAlertId);
  if (!alert) {
    return;
  }

  openReportModal(alert);
});

els.notificationFeed.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-notification-id]");
  if (!button) {
    return;
  }

  const notification = notifications.find(
    (item) =>
      String(item.notification_id || item.id || "") ===
      String(button.dataset.reportNotificationId || ""),
  );
  if (!notification) {
    return;
  }

  const alert = findAlertById(notification.alert_id);
  openReportModal(alert, notification);
});

onValue(
  ref(database, "alerts"),
  (snapshot) => {
    alerts = snapshotToList(snapshot.val());
    els.connectionState.textContent = "Live";
    els.connectionState.classList.remove("error");
    render();
  },
  (error) => showError(error.message),
);

onValue(
  ref(database, "notifications"),
  (snapshot) => {
    notifications = snapshotToList(snapshot.val());
    render();
  },
  (error) => showError(error.message),
);

function snapshotToList(value) {
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).map(([id, item]) => ({
    id,
    ...(item || {}),
  }));
}

function render() {
  document.querySelectorAll(".role-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === activeRole);
  });

  const reportMode = activeRole === "report";
  document.body.classList.toggle("report-mode", reportMode);
  els.feedPanel.classList.toggle("hidden", reportMode);
  els.updatesPanel.classList.toggle("hidden", reportMode);
  els.reportPanel.classList.toggle("hidden", !reportMode);
  els.generateReportBtn.classList.toggle("hidden", !reportMode);
  els.selectAllBtn.disabled = reportMode;
  els.deleteBtn.disabled = reportMode;

  if (activeRole === "hospital") {
    els.roleTitle.textContent = "Hospital Dashboard";
    els.roleSubtitle.textContent =
      "Severe Level 4/5 incidents and ambulance response updates.";
    els.feedTitle.textContent = "Hospital Notifications";
    els.feedSummary.textContent =
      "Hospital only receives Level 4 and Level 5 cases.";
  } else if (activeRole === "insurance") {
    els.roleTitle.textContent = "Insurance Dashboard";
    els.roleSubtitle.textContent =
      "All impact levels, EV driver activity, technician support, and case progress updates.";
    els.feedTitle.textContent = "Insurance Notifications";
    els.feedSummary.textContent =
      "Insurance receives every impact level and all related case updates.";
  } else {
    els.roleTitle.textContent = "Accidents Report";
    els.roleSubtitle.textContent =
      "AI-generated hotspot report for ambulance standby planning and higher-risk EV accident regions.";
    els.feedTitle.textContent = "Regional Risk Summary";
    els.feedSummary.textContent =
      "Color zones are simulated planning insights based on recent EVSmart+ accident activity.";
  }

  const visible = visibleAlerts();
  const updates = visibleNotifications();
  selectedIds.forEach((id) => {
    if (!visible.some((item) => alertId(item) === id)) {
      selectedIds.delete(id);
    }
  });

  renderMetrics(visible, updates, reportMode);
  els.selectAllBtn.textContent = reportMode
    ? "Select all"
    : visible.length > 0 && visible.every((item) => selectedIds.has(alertId(item)))
      ? "Clear visible"
      : "Select all";

  els.alertFeed.innerHTML =
    reportMode
      ? emptyState("Open a risk zone to review AI-generated ambulance planning insights.")
      : visible.length === 0
      ? emptyState("No live notifications yet")
      : visible.map(alertCard).join("");

  els.notificationFeed.innerHTML =
    reportMode
      ? ""
      : updates.length === 0
      ? emptyState("No extra updates yet")
      : updates.slice(0, 8).map(notificationCard).join("");

  bindSelection();
  if (reportMode) {
    initializeSelangorMap();
    renderReportZone();
  }
}

function visibleAlerts() {
  return [...alerts]
    .filter((item) => {
      const level = impactLevel(item);
      return activeRole === "hospital" ? level >= 4 : level >= 1;
    })
    .sort((a, b) => {
      const severity = impactLevel(b) - impactLevel(a);
      if (severity !== 0) {
        return severity;
      }
      return parseDate(b.timestamp) - parseDate(a.timestamp);
    });
}

function visibleNotifications() {
  return [...notifications]
    .filter((item) => {
      const audience = String(item.audience || "").toLowerCase();
      if (audience === "all") {
        return true;
      }
      if (activeRole === "hospital") {
        return audience === "hospital" || audience === "emergency_contact";
      }
      return true;
    })
    .sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function renderReportZone() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  els.zoneTitle.textContent = zone.title;
  els.zoneRiskText.textContent = zone.riskText;
  els.zoneRiskText.className = `zone-risk ${zone.riskClass}`;
  els.zoneNarrative.textContent = zone.narrative;
  els.zoneIncidents.textContent = `${zone.incidentsCount} incidents`;
  els.zoneCritical.textContent = `${zone.criticalPct}% Level 4/5`;
  els.zoneAction.textContent = zone.action;
  els.zoneWindow.textContent = zone.window;
  els.reportUpdated.textContent = reportGeneratedAt
    ? `Updated ${formatTime(reportGeneratedAt)}`
    : "Updated --:--";
  els.regionChips.innerHTML = regionChipsMarkup();
  els.regionalSummary.textContent = buildRegionalSummary();
  els.riskDistribution.innerHTML = riskDistributionMarkup();
  els.generateStatus.textContent = reportGeneratedAt
    ? `Last generated at ${formatTime(reportGeneratedAt)}`
    : "Ready to generate";
  if (!mapOverlayDismissed) {
    els.mapOverlayCard.classList.remove("hidden");
  }
  els.mapOverlayTitle.textContent = zone.title;
  els.mapOverlayText.textContent = zone.narrative;
  els.mapOverlayRisk.textContent = zone.riskText;
  els.mapOverlayRisk.className = `map-overlay-risk ${zone.riskClass}`;
  bindRegionChips();
  renderTrendChart();
  updateMapVisuals();
}

function regionChipsMarkup() {
  return Object.entries(reportZones)
    .map(([id, zone]) => {
      const active = id === activeZone ? " active" : "";
      return `
        <button type="button" class="region-chip ${zone.level}${active}" data-zone-chip="${escapeHtml(id)}">
          <strong>${escapeHtml(zone.title)}</strong>
          <span>${escapeHtml(zone.riskText)}</span>
        </button>
      `;
    })
    .join("");
}

function riskDistributionMarkup() {
  const zones = Object.values(reportZones)
    .slice()
    .sort((a, b) => b.incidentsCount - a.incidentsCount);
  return zones
    .map(
      (zone) => `
        <div class="risk-pill ${zone.level}">
          <span>${escapeHtml(zone.title)}</span>
          <strong>${escapeHtml(`${zone.incidentsCount} cases`)}</strong>
        </div>
      `,
    )
    .join("");
}

function bindRegionChips() {
  document.querySelectorAll("[data-zone-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      activeZone = button.dataset.zoneChip;
      mapOverlayDismissed = false;
      renderReportZone();
    });
  });
}

function alertCard(item) {
  const id = alertId(item);
  const level = impactLevel(item);
  const selected = selectedIds.has(id);
  const title = item.title || severityLabel(level);
  const location = locationText(item);
  const badgeClass = level >= 5 ? "critical" : level >= 4 ? "high" : "";
  const account = accountLine(item);

  return `
    <article class="card">
      <div class="card-head">
        <input type="checkbox" data-alert-id="${escapeHtml(id)}" ${selected ? "checked" : ""} />
        <div class="card-title">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(location)}</span>
        </div>
        <span class="badge ${badgeClass}">Level ${level}</span>
      </div>
      <div class="meta">
        <span class="chip">${escapeHtml(driverName(item))}</span>
        <span class="chip">${escapeHtml(item.vehicle || "EV Vehicle")}</span>
        <span class="chip">${formatDate(item.timestamp)}</span>
        <span class="chip">${escapeHtml(item.status || "Logged")}</span>
      </div>
      <p class="detail"><b>Summary:</b> ${escapeHtml(summaryForRole(item))}</p>
      <p class="detail"><b>Action:</b> ${escapeHtml(actionText(item))}</p>
      ${account ? `<p class="detail"><b>Account / profile:</b> ${escapeHtml(account)}</p>` : ""}
      ${reportActionMarkupForAlert(item)}
    </article>
  `;
}

function notificationCard(item) {
  return `
    <article class="card">
      <div class="card-title">
        <strong>${escapeHtml(item.title || "Update")}</strong>
        <span>${escapeHtml(item.message || "-")}</span>
      </div>
      <div class="meta">
        <span class="chip">${escapeHtml(item.type || "Notification")}</span>
        <span class="chip">${formatDate(item.timestamp)}</span>
      </div>
      ${reportActionMarkupForNotification(item)}
    </article>
  `;
}

function bindSelection() {
  document.querySelectorAll("[data-alert-id]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        selectedIds.add(input.dataset.alertId);
      } else {
        selectedIds.delete(input.dataset.alertId);
      }
      render();
    });
  });
}

function impactLevel(item) {
  const level = Number(item.impact_level || 1);
  return Math.min(5, Math.max(1, Number.isFinite(level) ? level : 1));
}

function alertId(item) {
  return String(item.alert_id || item.id || "");
}

function severityLabel(level) {
  const labels = {
    1: "Level 1 - Minor bump",
    2: "Level 2 - Light impact",
    3: "Level 3 - Moderate impact",
    4: "Level 4 - Severe impact",
    5: "Level 5 - Critical crash",
  };
  return labels[level] || `Level ${level}`;
}

function summaryForRole(item) {
  if (activeRole === "hospital") {
    const parts = [
      item.ambulance_eta_minutes ? `ETA ${item.ambulance_eta_minutes} min` : "",
      item.ambulance_unit ? `Unit ${item.ambulance_unit}` : "",
      item.assigned_driver_location
        ? `Coming from ${item.assigned_driver_location}`
        : "",
      item.ambulance_contact ? `Contact ${item.ambulance_contact}` : "",
      item.ambulance_team_size ? `Team ${item.ambulance_team_size}` : "",
      item.number_of_people ? `${item.number_of_people} patient(s)` : "",
      item.patient_status || "",
      item.responder_note || "",
      item.ambulance_response_note || "",
    ].filter(Boolean);
    return (
      parts.join(" - ") ||
      item.driver_response_summary ||
      item.recommended_response ||
      severityLabel(impactLevel(item))
    );
  }

  return [
    severityLabel(impactLevel(item)),
    item.insurance_status || "Pending review",
    item.repair_condition || item.patient_status || "Claim details syncing",
  ].join(" - ");
}

function actionText(item) {
  if (activeRole === "hospital") {
    return (
      item.hospital_feed_status ||
      item.status ||
      "Waiting for hospital team review."
    );
  }
  return item.insurance_status || "Pending insurance review.";
}

function reportActionMarkupForAlert(item) {
  if (activeRole !== "hospital" || !isHospitalReportAlert(item)) {
    return "";
  }

  return `
    <div class="report-action-row">
      <button
        type="button"
        class="view-report-btn"
        data-report-alert-id="${escapeHtml(alertId(item))}"
      >
        View Report
      </button>
    </div>
  `;
}

function reportActionMarkupForNotification(item) {
  if (activeRole !== "hospital" || !isHospitalReportNotification(item)) {
    return "";
  }

  const notificationId = String(item.notification_id || item.id || "");
  return `
    <div class="report-action-row">
      <button
        type="button"
        class="view-report-btn"
        data-report-notification-id="${escapeHtml(notificationId)}"
      >
        View Report
      </button>
    </div>
  `;
}

function isHospitalReportAlert(item) {
  const status = String(item.status || "").toLowerCase();
  const feedStatus = String(item.hospital_feed_status || "").toLowerCase();
  const dispatchStatus = String(item.driver_dispatch_status || "").toLowerCase();
  return (
    feedStatus === "report submitted" ||
    dispatchStatus === "report_submitted" ||
    status.includes("report submitted")
  );
}

function isHospitalReportNotification(item) {
  return String(item.title || "").trim().toLowerCase() === hospitalReportTitle.toLowerCase();
}

function findAlertById(value) {
  const target = String(value || "");
  if (!target) {
    return null;
  }
  return (
    alerts.find((item) => String(item.alert_id || item.id || "") === target) || null
  );
}

function accountLine(item) {
  return [
    item.assigned_driver_name ? `Responder: ${item.assigned_driver_name}` : "",
    item.assigned_driver_location
      ? `Ambulance start: ${item.assigned_driver_location}`
      : "",
    item.driver_dispatch_status ? `Dispatch: ${item.driver_dispatch_status}` : "",
    item.ambulance_eta_minutes ? `ETA: ${item.ambulance_eta_minutes} min` : "",
    item.ambulance_unit ? `Unit: ${item.ambulance_unit}` : "",
    item.technician_location ? `Location: ${item.technician_location}` : "",
    item.hospital_name ? `Hospital: ${item.hospital_name}` : "",
  ]
    .filter(Boolean)
    .join(" - ");
}

function driverName(item) {
  return item.driver || item.driver_name || "EV Driver";
}

function locationText(item) {
  const location = item.location_name || "";
  const road = item.road_name || "";
  if (location && road) {
    return `${location} - ${road}`;
  }
  return location || road || "Unknown location";
}

function parseDate(value) {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function formatDate(value) {
  const date = parseDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function emptyState(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function openReportModal(alertItem, notificationItem = null) {
  const fields = buildReportFields(alertItem, notificationItem);
  els.reportModalGrid.innerHTML = fields
    .map(
      (field) => `
        <div class="report-modal-field${field.full ? " full" : ""}">
          <span>${escapeHtml(field.label)}</span>
          <p>${escapeHtml(field.value)}</p>
        </div>
      `,
    )
    .join("");

  els.reportModalOverlay.classList.add("open");
  els.reportModalOverlay.setAttribute("aria-hidden", "false");
  els.reportModalClose.focus();
}

function closeReportModal() {
  els.reportModalOverlay.classList.remove("open");
  els.reportModalOverlay.setAttribute("aria-hidden", "true");
}

function buildReportFields(alertItem, notificationItem) {
  const item = alertItem || {};
  const impact = Number(item.impact_level || 0);
  const etaText = item.ambulance_eta_minutes
    ? `ETA ${item.ambulance_eta_minutes} min`
    : "No ETA recorded";
  const notes = [item.responder_note, item.ambulance_response_note]
    .filter(Boolean)
    .join("\n\n");
  const timestamp =
    item.report_submitted_at || notificationItem?.timestamp || item.timestamp;

  return [
    {
      label: "Responder Name",
      value:
        item.assigned_driver_name ||
        item.driver ||
        item.driver_name ||
        "Ambulance Driver",
    },
    {
      label: "Accident Location",
      value: locationText(item),
    },
    {
      label: "Patient Count",
      value: item.number_of_people ?? "Not provided",
    },
    {
      label: "Patient Condition",
      value: item.patient_status || "Not provided",
    },
    {
      label: "Severity Level",
      value: impact ? severityLabel(impact) : "Not provided",
    },
    {
      label: "Timestamp",
      value: formatDate(timestamp),
    },
    {
      label: "ETA / Notes",
      value: notes ? `${etaText}\n\n${notes}` : etaText,
      full: true,
    },
  ];
}

function showError(message) {
  els.connectionState.textContent = "Firebase error";
  els.connectionState.classList.add("error");
  els.alertFeed.innerHTML = `<div class="empty error">${escapeHtml(message)}</div>`;
}

function renderMetrics(visible, updates, reportMode) {
  if (reportMode) {
    const highRiskCount = Object.values(reportZones).filter((zone) =>
      zone.riskText.toLowerCase().includes("high"),
    ).length;
    const updatedText = reportGeneratedAt
      ? `${minutesAgo(reportGeneratedAt)} min ago`
      : "Not generated";

    els.metricLabel1.textContent = "Active Hotspots (AI)";
    els.metricLabel2.textContent = "High-Risk Zones";
    els.metricLabel3.textContent = "AI Confidence Score";
    els.metricLabel4.textContent = "AI Data Updated";
    els.metricValue1.textContent = Object.keys(reportZones).length;
    els.metricValue2.textContent = highRiskCount;
    els.metricValue3.textContent = `${reportConfidenceScore}%`;
    els.metricValue4.textContent = updatedText;
    return;
  }

  els.metricLabel1.textContent = "Visible Notifications";
  els.metricLabel2.textContent = "Selected";
  els.metricLabel3.textContent = "Live Updates";
  els.metricLabel4.textContent = "Last Refresh";
  els.metricValue1.textContent = visible.length;
  els.metricValue2.textContent = selectedIds.size;
  els.metricValue3.textContent = updates.length;
  els.metricValue4.textContent = formatTime(new Date());
}

function generateAiReport() {
  if (reportGenerationTimer) {
    window.clearTimeout(reportGenerationTimer);
  }
  if (reportBannerTimer) {
    window.clearTimeout(reportBannerTimer);
  }
  els.generateReportBtn.disabled = true;
  els.generateReportBtn.textContent = "Generating...";
  els.generateStatus.textContent = "AI is preparing the latest hotspot summary...";
  els.reportUpdated.textContent = "Updating...";
  els.reportBanner.classList.add("hidden");

  reportGenerationTimer = window.setTimeout(() => {
    randomizeReportData(true);
    reportGeneratedAt = new Date();
    els.generateReportBtn.disabled = false;
    els.generateReportBtn.textContent = "Generate AI Report";
    renderReportZone();
    renderMetrics(visibleAlerts(), visibleNotifications(), true);
    els.generateStatus.textContent = `AI report generated at ${formatTime(reportGeneratedAt)}`;
    els.reportBannerText.textContent =
      `Hotspot prioritisation updated for ${reportZones[activeZone].title}. Ambulance readiness recommendations are refreshed.`;
    els.reportBannerTime.textContent = formatTime(reportGeneratedAt);
    els.reportBanner.classList.remove("hidden");
    reportBannerTimer = window.setTimeout(() => {
      els.reportBanner.classList.add("hidden");
    }, 3800);
  }, 1400);
}

function randomizeReportData(forceBump = false) {
  Object.values(reportZones).forEach((zone) => {
    const incidentDelta = forceBump ? randomInt(-1, 2) : randomInt(-1, 1);
    const pctDelta = forceBump ? randomInt(-2, 3) : randomInt(-1, 2);
    zone.incidentsCount = Math.max(3, zone.incidentsCount + incidentDelta);
    zone.criticalPct = clamp(zone.criticalPct + pctDelta, 8, 42);
    zone.spark = zone.spark.map((value, index) =>
      Math.max(1, value + randomInt(index === zone.spark.length - 1 ? -1 : -2, 2)),
    );
  });

  const hotZones = Object.values(reportZones)
    .filter((zone) => zone.criticalPct >= 28)
    .sort((a, b) => b.criticalPct - a.criticalPct);

  hotZones.forEach((zone, index) => {
    zone.level = index < 2 ? "high" : "medium";
    zone.riskText = index < 2 ? "High alert zone" : "Watch closely";
    zone.riskClass = index < 2 ? "high-text" : "medium-text";
  });

  Object.values(reportZones)
    .filter((zone) => !hotZones.includes(zone))
    .forEach((zone) => {
      if (zone.criticalPct <= 14) {
        zone.level = "low";
        zone.riskText = "Lower risk / monitor";
        zone.riskClass = "low-text";
      } else {
        zone.level = "medium";
        zone.riskText = "Watch closely";
        zone.riskClass = "medium-text";
      }
    });

  reportConfidenceScore = clamp(reportConfidenceScore + randomInt(-2, 2), 91, 97);
}

function buildRegionalSummary() {
  const ranked = Object.values(reportZones)
    .slice()
    .sort((a, b) => b.criticalPct - a.criticalPct);
  const highest = ranked[0];
  const second = ranked[1];
  const calmer = ranked
    .slice()
    .reverse()
    .slice(0, 2)
    .map((zone) => zone.title)
    .join(" and ");
  return `Regional EV accident concentration is currently strongest around ${highest.title} and ${second.title}, while ${calmer} remain comparatively calmer and suitable for lighter standby coverage.`;
}

function renderTrendChart() {
  const svg = els.trendChart;
  if (!svg) {
    return;
  }

  const shah = reportZones["shah-alam"].spark;
  const subang = reportZones["subang-jaya"].spark;
  const pj = reportZones["petaling-jaya"].spark;
  const allZoneValues = Object.values(reportZones).map((zone) => zone.spark);
  const bars = chartDays.map((_, index) => {
    const dailyTotal = allZoneValues.reduce(
      (sum, values) => sum + (values[index] ?? 0),
      0,
    );
    return Math.max(4, Math.round(dailyTotal / 4));
  });
  const allValues = [...bars, ...shah, ...subang, ...pj];
  const maxValue = Math.max(...allValues, 10);
  const width = 420;
  const height = 250;
  const padding = { top: 24, right: 20, bottom: 34, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = chartWidth / bars.length;

  const scaleY = (value) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;
  const xAt = (index) => padding.left + index * stepX + stepX / 2;

  const yTicks = 5;
  const gridLines = Array.from({ length: yTicks }, (_, index) => {
    const value = Math.round((maxValue / yTicks) * (yTicks - index));
    const y = scaleY(value);
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid" />
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="chart-y-label">${value}</text>
    `;
  }).join("");

  const barsMarkup = bars
    .map((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding.left + index * stepX + 10;
      const y = padding.top + chartHeight - barHeight;
      const emphasis = index === 3 ? " emphasis" : "";
      return `<rect x="${x}" y="${y}" width="${stepX - 18}" height="${barHeight}" rx="12" class="chart-bar${emphasis}" />`;
    })
    .join("");

  const lineSeries = [
    {
      key: "Shah Alam",
      values: shah,
      className: "chart-line red",
      pointClass: "chart-point red",
      areaClass: "chart-area red",
    },
    {
      key: "Subang Jaya",
      values: subang,
      className: "chart-line yellow",
      pointClass: "chart-point yellow",
    },
    {
      key: "Petaling Jaya",
      values: pj,
      className: "chart-line green",
      pointClass: "chart-point green",
    },
  ];

  const pathFromValues = (values) =>
    values
      .map((value, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${scaleY(value)}`)
      .join(" ");

  const areaFromValues = (values) => {
    const linePath = pathFromValues(values);
    const bottomY = padding.top + chartHeight;
    return `${linePath} L ${xAt(values.length - 1)} ${bottomY} L ${xAt(0)} ${bottomY} Z`;
  };

  const lineMarkup = lineSeries
    .map((series) => {
      const path = pathFromValues(series.values);
      const area = series.areaClass
        ? `<path d="${areaFromValues(series.values)}" class="${series.areaClass}" />`
        : "";
      const points = series.values
        .map((value, index) => {
          const x = xAt(index);
          const y = scaleY(value);
          return `<circle cx="${x}" cy="${y}" r="4.5" class="${series.pointClass}" />`;
        })
        .join("");
      return `${area}<path d="${path}" class="${series.className}" />${points}`;
    })
    .join("");

  const labels = chartDays
    .map((day, index) => {
      const x = xAt(index);
      return `<text x="${x}" y="${height - 10}" text-anchor="middle" class="chart-label">${day}</text>`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#36455b" />
        <stop offset="100%" stop-color="#182334" />
      </linearGradient>
      <linearGradient id="chartBarGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a6f8c" stop-opacity="0.96" />
        <stop offset="100%" stop-color="#223349" stop-opacity="0.96" />
      </linearGradient>
      <linearGradient id="chartAreaRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(239, 68, 68, 0.42)" />
        <stop offset="100%" stop-color="rgba(239, 68, 68, 0.02)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="22" class="chart-bg" />
    ${gridLines}
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" class="chart-axis" />
    ${barsMarkup}
    ${lineMarkup}
    ${labels}
  `;
}

function initializeSelangorMap() {
  if (selangorMap || !window.L) {
    return;
  }

  selangorMap = window.L.map("selangorMap", {
    zoomControl: false,
    scrollWheelZoom: true,
    minZoom: 8,
    maxZoom: 13,
  }).setView([3.05, 101.55], 9);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(selangorMap);

  const selangorBounds = window.L.latLngBounds([
    [2.52, 100.95],
    [3.42, 101.98],
  ]);
  selangorMap.fitBounds(selangorBounds, { padding: [18, 18] });
  window.L.control.zoom({ position: "topright" }).addTo(selangorMap);

  Object.entries(reportZones).forEach(([id, zone]) => {
    const polygon = window.L.polygon(zone.polygon, {
      color: zoneStroke(zone.level),
      fillColor: zoneFill(zone.level),
      fillOpacity: 0.42,
      weight: id === activeZone ? 4 : 2,
    }).addTo(selangorMap);

    polygon.bindTooltip(
      `<strong>${escapeHtml(zone.title)}</strong><br>${escapeHtml(zone.riskText)}<br>${escapeHtml(`${zone.incidentsCount} incidents`)}`,
      {
        sticky: true,
        direction: "top",
      },
    );

    polygon.on("click", () => {
      activeZone = id;
      mapOverlayDismissed = false;
      renderReportZone();
    });

    const marker = window.L.circleMarker(zone.center, {
      radius: id === activeZone ? 8 : 6,
      color: "#ffffff",
      weight: 1.5,
      fillColor: zoneStroke(zone.level),
      fillOpacity: 0.95,
    }).addTo(selangorMap);

    marker.on("click", () => {
      activeZone = id;
      mapOverlayDismissed = false;
      renderReportZone();
    });

    zoneLayers.set(id, { polygon, marker });
  });
}

function updateMapVisuals() {
  if (!selangorMap) {
    return;
  }
  Object.entries(reportZones).forEach(([id, zone]) => {
    const layer = zoneLayers.get(id);
    if (!layer) {
      return;
    }
    layer.polygon.setStyle({
      color: zoneStroke(zone.level),
      fillColor: zoneFill(zone.level),
      fillOpacity: id === activeZone ? 0.56 : 0.38,
      weight: id === activeZone ? 4 : 2,
    });
    layer.marker.setStyle({
      radius: id === activeZone ? 8 : 6,
      fillColor: zoneStroke(zone.level),
    });
    if (id === activeZone) {
      selangorMap.flyTo(zone.center, Math.max(selangorMap.getZoom(), 10), {
        duration: 0.6,
      });
    }
  });
}

function zoneStroke(level) {
  if (level === "high") {
    return "#ef4444";
  }
  if (level === "medium") {
    return "#facc15";
  }
  return "#22c55e";
}

function zoneFill(level) {
  if (level === "high") {
    return "#dc2626";
  }
  if (level === "medium") {
    return "#eab308";
  }
  return "#16a34a";
}

function normalizeRole(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("insurance")) {
    return "insurance";
  }
  if (text.includes("report") || text.includes("accident")) {
    return "report";
  }
  return "hospital";
}

function syncRoleQuery() {
  const url = new URL(window.location.href);
  url.searchParams.set("role", activeRole);
  window.history.replaceState({}, "", url);
}

function minutesAgo(date) {
  const diffMs = Math.max(0, new Date().getTime() - date.getTime());
  const mins = Math.max(1, Math.round(diffMs / 60000));
  return mins;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

syncRoleQuery();
render();
