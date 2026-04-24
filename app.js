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
activeRole = activeRole.toLowerCase().includes("insurance")
  ? "insurance"
  : "hospital";
let alerts = [];
let notifications = [];
const selectedIds = new Set();

const els = {
  roleTitle: document.querySelector("#roleTitle"),
  roleSubtitle: document.querySelector("#roleSubtitle"),
  feedTitle: document.querySelector("#feedTitle"),
  feedSummary: document.querySelector("#feedSummary"),
  alertFeed: document.querySelector("#alertFeed"),
  notificationFeed: document.querySelector("#notificationFeed"),
  visibleCount: document.querySelector("#visibleCount"),
  selectedCount: document.querySelector("#selectedCount"),
  updateCount: document.querySelector("#updateCount"),
  lastRefresh: document.querySelector("#lastRefresh"),
  connectionState: document.querySelector("#connectionState"),
  selectAllBtn: document.querySelector("#selectAllBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
};

document.querySelectorAll(".role-btn").forEach((button) => {
  button.addEventListener("click", () => {
    activeRole = button.dataset.role;
    selectedIds.clear();
    render();
  });
});

document.querySelector("#refreshBtn").addEventListener("click", () => {
  render();
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

  const roleLabel = activeRole === "hospital" ? "Hospital" : "Insurance";
  els.roleTitle.textContent = `${roleLabel} Dashboard`;
  els.roleSubtitle.textContent =
    activeRole === "hospital"
      ? "Severe Level 4/5 incidents and ambulance response updates."
      : "All impact levels, EV driver activity, technician support, and case progress updates.";
  els.feedTitle.textContent = `${roleLabel} Notifications`;
  els.feedSummary.textContent =
    activeRole === "hospital"
      ? "Hospital only receives Level 4 and Level 5 cases."
      : "Insurance receives every impact level and all related case updates.";

  const visible = visibleAlerts();
  const updates = visibleNotifications();
  selectedIds.forEach((id) => {
    if (!visible.some((item) => alertId(item) === id)) {
      selectedIds.delete(id);
    }
  });

  els.visibleCount.textContent = visible.length;
  els.selectedCount.textContent = selectedIds.size;
  els.updateCount.textContent = updates.length;
  els.lastRefresh.textContent = formatTime(new Date());
  els.selectAllBtn.textContent =
    visible.length > 0 && visible.every((item) => selectedIds.has(alertId(item)))
      ? "Clear visible"
      : "Select all";

  els.alertFeed.innerHTML =
    visible.length === 0
      ? emptyState("No live notifications yet")
      : visible.map(alertCard).join("");

  els.notificationFeed.innerHTML =
    updates.length === 0
      ? emptyState("No extra updates yet")
      : updates.slice(0, 8).map(notificationCard).join("");

  bindSelection();
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
