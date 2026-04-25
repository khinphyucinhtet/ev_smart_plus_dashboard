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
  reportPanel: document.querySelector("#reportPanel"),
  reportUpdated: document.querySelector("#reportUpdated"),
  zoneTitle: document.querySelector("#zoneTitle"),
  zoneRiskText: document.querySelector("#zoneRiskText"),
  zoneNarrative: document.querySelector("#zoneNarrative"),
  zoneIncidents: document.querySelector("#zoneIncidents"),
  zoneCritical: document.querySelector("#zoneCritical"),
  zoneAction: document.querySelector("#zoneAction"),
  zoneWindow: document.querySelector("#zoneWindow"),
  trendCards: document.querySelector("#trendCards"),
  generateStatus: document.querySelector("#generateStatus"),
  reportBanner: document.querySelector("#reportBanner"),
  reportBannerText: document.querySelector("#reportBannerText"),
  reportBannerTime: document.querySelector("#reportBannerTime"),
  regionChips: document.querySelector("#regionChips"),
  mapOverlayTitle: document.querySelector("#mapOverlayTitle"),
  mapOverlayText: document.querySelector("#mapOverlayText"),
  mapOverlayRisk: document.querySelector("#mapOverlayRisk"),
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
  els.trendCards.innerHTML = trendCardsMarkup();
  els.regionChips.innerHTML = regionChipsMarkup();
  els.generateStatus.textContent = reportGeneratedAt
    ? `Last generated at ${formatTime(reportGeneratedAt)}`
    : "Ready to generate";
  els.mapOverlayTitle.textContent = zone.title;
  els.mapOverlayText.textContent = zone.narrative;
  els.mapOverlayRisk.textContent = zone.riskText;
  els.mapOverlayRisk.className = `map-overlay-risk ${zone.riskClass}`;
  bindRegionChips();
  updateMapVisuals();
}

function trendCardsMarkup() {
  return Object.entries(reportZones)
    .map(([id, zone]) => {
      const active = id === activeZone ? " active" : "";
      return `
        <article class="trend-card${active}">
          <div class="trend-top">
            <div>
              <span class="mini-kicker">Risk region</span>
              <h3>${escapeHtml(zone.title)}</h3>
            </div>
            <span class="trend-pill ${escapeHtml(zone.riskClass)}">${escapeHtml(zone.riskText)}</span>
          </div>
          <p>${escapeHtml(zone.narrative)}</p>
          <div class="sparkline" aria-label="${escapeHtml(zone.title)} trend">
            ${zone.spark.map((value) => `<span style="height:${Math.max(22, value * 7)}px"></span>`).join("")}
          </div>
          <div class="trend-meta">
            <span>${escapeHtml(`${zone.incidentsCount} incidents`)}</span>
            <span>${escapeHtml(`${zone.criticalPct}% Level 4/5`)}</span>
            <span>${escapeHtml(zone.window)}</span>
          </div>
        </article>
      `;
    })
    .join("");
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

function bindRegionChips() {
  document.querySelectorAll("[data-zone-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      activeZone = button.dataset.zoneChip;
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

function accountLine(item) {
  return [
    item.assigned_driver_name ? `Responder: ${item.assigned_driver_name}` : "",
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

function initializeSelangorMap() {
  if (selangorMap || !window.L) {
    return;
  }

  selangorMap = window.L.map("selangorMap", {
    zoomControl: true,
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
