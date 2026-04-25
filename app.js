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
const reportZones = {
  "shah-alam": {
    title: "Shah Alam",
    riskText: "High alert zone",
    riskClass: "high-text",
    incidents: "14 incidents",
    critical: "36% Level 4/5",
    action: "Pre-position 1 ambulance unit",
    narrative:
      "Frequent severe alerts are clustering around Shah Alam, so ambulance units should keep standby coverage closer to Persiaran Kayangan and nearby access roads.",
    spark: [4, 7, 9, 6, 11, 10, 14],
  },
  "subang-jaya": {
    title: "Subang Jaya",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidents: "9 incidents",
    critical: "22% Level 4/5",
    action: "Increase patrol check-ins during peak hours",
    narrative:
      "Subang Jaya is showing moderate accident frequency, especially during charging-stop and commute periods, so dispatch readiness should stay active around key junctions.",
    spark: [3, 5, 6, 4, 7, 8, 9],
  },
  "petaling-jaya": {
    title: "Petaling Jaya",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidents: "8 incidents",
    critical: "18% Level 4/5",
    action: "Keep rapid-response routing open toward city connectors",
    narrative:
      "Petaling Jaya remains a moderate-risk corridor with recurring support activity, so hospital routing and traffic-aware ambulance planning should stay ready.",
    spark: [2, 4, 5, 6, 5, 7, 8],
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
  trendCards: document.querySelector("#trendCards"),
  generateStatus: document.querySelector("#generateStatus"),
};

document.querySelectorAll(".role-btn").forEach((button) => {
  button.addEventListener("click", () => {
    activeRole = normalizeRole(button.dataset.role);
    selectedIds.clear();
    syncRoleQuery();
    render();
  });
});

document.querySelectorAll(".zone").forEach((button) => {
  button.addEventListener("click", () => {
    activeZone = button.dataset.zone;
    renderReportZone();
  });
});

document.querySelector("#refreshBtn").addEventListener("click", () => {
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
  document.querySelectorAll(".zone").forEach((button) => {
    button.classList.toggle("active", button.dataset.zone === activeZone);
  });

  els.zoneTitle.textContent = zone.title;
  els.zoneRiskText.textContent = zone.riskText;
  els.zoneRiskText.className = `zone-risk ${zone.riskClass}`;
  els.zoneNarrative.textContent = zone.narrative;
  els.zoneIncidents.textContent = zone.incidents;
  els.zoneCritical.textContent = zone.critical;
  els.zoneAction.textContent = zone.action;
  els.reportUpdated.textContent = reportGeneratedAt
    ? `Updated ${formatTime(reportGeneratedAt)}`
    : "Updated --:--";
  els.trendCards.innerHTML = trendCardsMarkup();
  els.generateStatus.textContent = reportGeneratedAt
    ? `Last generated at ${formatTime(reportGeneratedAt)}`
    : "Ready to generate";
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
            <span>${escapeHtml(zone.incidents)}</span>
            <span>${escapeHtml(zone.critical)}</span>
          </div>
        </article>
      `;
    })
    .join("");
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
    els.metricValue3.textContent = "94%";
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
  els.generateReportBtn.disabled = true;
  els.generateReportBtn.textContent = "Generating...";
  els.generateStatus.textContent = "AI is preparing the latest hotspot summary...";
  els.reportUpdated.textContent = "Updating...";

  reportGenerationTimer = window.setTimeout(() => {
    reportGeneratedAt = new Date();
    els.generateReportBtn.disabled = false;
    els.generateReportBtn.textContent = "Generate AI Report";
    renderReportZone();
    renderMetrics(visibleAlerts(), visibleNotifications(), true);
  }, 1400);
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
