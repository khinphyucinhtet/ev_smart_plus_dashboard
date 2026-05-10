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
let activeInsightAudience = "government";
let strategicInsightsReady = false;
let strategicInsightsLoading = false;
let strategicLoadingTimer = null;
let activeTrendRange = "7";
let activeTrendRegion = "all";
let activeSuggestionTab = "summary";
let sampleReportState = {
  region: "shah-alam",
  range: "7",
  format: "pdf",
  page: 1,
  zoom: 100,
  generatedAt: null,
  reportId: "EVR-2026-0510-001",
};
let pullRefreshStartY = 0;
let pullRefreshActive = false;
let lastPullRefreshAt = 0;
const hospitalReportTitle = "Hospital report submitted";
const chartDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const sampleReportPages = [
  "Executive Summary",
  "Incident Overview",
  "Impact Level Analysis",
  "Temporal Analysis",
  "Hotspot & Location Analysis",
  "Risk & Severity Analysis",
  "AI Predictions",
  "Recommendations",
  "Government Suggestions",
  "Resource & Response Plan",
  "Action Plan & Timeline",
  "Appendices & Data Tables",
];
const reportZones = {
  "shah-alam": {
    title: "Shah Alam",
    riskText: "High alert zone",
    riskClass: "high-text",
    incidentsCount: 15,
    criticalPct: 39,
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
    incidentsCount: 14,
    criticalPct: 34,
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
    criticalPct: 17,
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
    incidentsCount: 10,
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
    incidentsCount: 10,
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
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 4,
    criticalPct: 15,
    action: "Maintain normal patrol readiness",
    window: "2 PM - 5 PM",
    level: "medium",
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
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 4,
    criticalPct: 14,
    action: "Keep airport-link response route available",
    window: "11 AM - 2 PM",
    level: "medium",
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
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 4,
    criticalPct: 14,
    action: "Maintain coastal coverage",
    window: "12 PM - 3 PM",
    level: "medium",
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
    incidentsCount: 8,
    criticalPct: 16,
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
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 7,
    criticalPct: 16,
    action: "Maintain hillside access readiness",
    window: "3 PM - 6 PM",
    level: "medium",
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
    incidentsCount: 6,
    criticalPct: 15,
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
    incidentsCount: 7,
    criticalPct: 16,
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
    criticalPct: 15,
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
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 4,
    criticalPct: 15,
    action: "Maintain standard coverage near EV campus routes",
    window: "1 PM - 4 PM",
    level: "medium",
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
  "kuala-langat": {
    title: "Kuala Langat",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 7,
    criticalPct: 16,
    action: "Keep southern coastal response route open",
    window: "4 PM - 7 PM",
    level: "medium",
    center: [2.8128, 101.5011],
    polygon: [
      [2.93, 101.36],
      [2.948, 101.58],
      [2.858, 101.65],
      [2.742, 101.63],
      [2.688, 101.49],
      [2.73, 101.34],
      [2.84, 101.31],
    ],
    narrative:
      "Kuala Langat is showing moderate pressure along southern commuter and coastal connectors, so one flexible ambulance route should stay ready through the district.",
    spark: [2, 2, 3, 4, 4, 5, 6],
  },
  "hulu-selangor": {
    title: "Hulu Selangor",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 7,
    criticalPct: 16,
    action: "Maintain northern hill-access readiness",
    window: "6 AM - 9 AM",
    level: "medium",
    center: [3.5654, 101.6384],
    polygon: [
      [3.69, 101.47],
      [3.71, 101.71],
      [3.61, 101.81],
      [3.49, 101.78],
      [3.44, 101.6],
      [3.5, 101.45],
      [3.61, 101.42],
    ],
    narrative:
      "Hulu Selangor remains mostly stable, but northern feeder roads and hilly connectors can still slow ambulance access during early-morning incident spikes.",
    spark: [1, 2, 2, 3, 4, 4, 5],
  },
  "sabak-bernam": {
    title: "Sabak Bernam",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 3,
    criticalPct: 14,
    action: "Maintain rural corridor standby coverage",
    window: "11 AM - 2 PM",
    level: "medium",
    center: [3.7697, 100.9879],
    polygon: [
      [3.87, 100.86],
      [3.89, 101.1],
      [3.81, 101.16],
      [3.71, 101.14],
      [3.66, 101.02],
      [3.69, 100.88],
      [3.78, 100.83],
    ],
    narrative:
      "Sabak Bernam remains comparatively calmer, but longer rural travel distances mean standby routing should stay prepared for scattered EV roadside emergencies.",
    spark: [1, 1, 2, 2, 2, 3, 4],
  },
  banting: {
    title: "Banting",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 4,
    criticalPct: 14,
    action: "Keep township approach routes clear",
    window: "3 PM - 6 PM",
    level: "medium",
    center: [2.8138, 101.5019],
    polygon: [
      [2.89, 101.42],
      [2.9, 101.57],
      [2.84, 101.61],
      [2.77, 101.59],
      [2.74, 101.5],
      [2.77, 101.41],
      [2.83, 101.39],
    ],
    narrative:
      "Banting is showing moderate township traffic risk, especially where EV travel merges into larger district connectors during late-afternoon movement.",
    spark: [1, 2, 3, 3, 4, 4, 5],
  },
  selayang: {
    title: "Selayang",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 6,
    criticalPct: 16,
    action: "Keep urban interchange response lanes open",
    window: "4 PM - 6 PM",
    level: "medium",
    center: [3.2374, 101.6897],
    polygon: [
      [3.29, 101.61],
      [3.302, 101.705],
      [3.255, 101.746],
      [3.198, 101.724],
      [3.188, 101.642],
      [3.226, 101.602],
    ],
    narrative:
      "Selayang is showing moderate connector pressure near urban feeder roads, so rapid ambulance turn-in routes should stay clear during late afternoon movement.",
    spark: [1, 2, 3, 3, 4, 4, 5],
  },
  "batu-caves": {
    title: "Batu Caves",
    riskText: "Watch closely",
    riskClass: "medium-text",
    incidentsCount: 4,
    criticalPct: 14,
    action: "Maintain cave-route and ring-road standby coverage",
    window: "6 PM - 8 PM",
    level: "medium",
    center: [3.2379, 101.6831],
    polygon: [
      [3.285, 101.69],
      [3.294, 101.782],
      [3.242, 101.824],
      [3.188, 101.807],
      [3.171, 101.73],
      [3.204, 101.676],
    ],
    narrative:
      "Batu Caves is showing moderate evening incident clustering near ring-road approaches, so responders should keep one fast entry corridor open during commuter hours.",
    spark: [1, 2, 2, 3, 4, 4, 5],
  },
  putrajaya: {
    title: "Putrajaya",
    riskText: "Low risk / monitor",
    riskClass: "low-text",
    incidentsCount: 3,
    criticalPct: 15,
    action: "Maintain civic-center route monitoring with light standby coverage",
    window: "2 PM - 4 PM",
    level: "low",
    center: [2.9264, 101.6964],
    polygon: [
      [2.962, 101.653],
      [2.968, 101.724],
      [2.93, 101.756],
      [2.888, 101.739],
      [2.881, 101.676],
      [2.912, 101.647],
    ],
    narrative:
      "Putrajaya remains comparatively calm, but civic-center routes should still keep one clear response path open for scattered EV support incidents.",
    spark: [1, 1, 1, 2, 2, 2, 3],
  },
};
let activeZone = "shah-alam";

syncZoneRiskPresentation();

const els = {
  roleTitle: document.querySelector("#roleTitle"),
  roleSubtitle: document.querySelector("#roleSubtitle"),
  feedTitle: document.querySelector("#feedTitle"),
  feedSummary: document.querySelector("#feedSummary"),
  alertFeed: document.querySelector("#alertFeed"),
  notificationFeed: document.querySelector("#notificationFeed"),
  metrics: document.querySelector(".metrics"),
  metricLabel1: document.querySelector("#metricLabel1"),
  metricLabel2: document.querySelector("#metricLabel2"),
  metricLabel3: document.querySelector("#metricLabel3"),
  metricLabel4: document.querySelector("#metricLabel4"),
  metricValue1: document.querySelector("#metricValue1"),
  metricValue2: document.querySelector("#metricValue2"),
  metricValue3: document.querySelector("#metricValue3"),
  metricValue4: document.querySelector("#metricValue4"),
  metricMeta1: document.querySelector("#metricMeta1"),
  metricMeta2: document.querySelector("#metricMeta2"),
  metricMeta3: document.querySelector("#metricMeta3"),
  metricMeta4: document.querySelector("#metricMeta4"),
  connectionState: document.querySelector("#connectionState"),
  hospitalHeaderActions: document.querySelector("#hospitalHeaderActions"),
  hospitalUpdatedBadge: document.querySelector("#hospitalUpdatedBadge"),
  hospitalSelectAllBtn: document.querySelector("#hospitalSelectAllBtn"),
  hospitalDeleteBtn: document.querySelector("#hospitalDeleteBtn"),
  insuranceHeaderActions: document.querySelector("#insuranceHeaderActions"),
  insuranceUpdatedBadge: document.querySelector("#insuranceUpdatedBadge"),
  insuranceSelectAllBtn: document.querySelector("#insuranceSelectAllBtn"),
  insuranceDeleteBtn: document.querySelector("#insuranceDeleteBtn"),
  reportUtility: document.querySelector("#reportUtility"),
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
  zoneCause: document.querySelector("#zoneCause"),
  avgImpactLevel: document.querySelector("#avgImpactLevel"),
  peakCrashTime: document.querySelector("#peakCrashTime"),
  mostSevereArea: document.querySelector("#mostSevereArea"),
  nightRisk: document.querySelector("#nightRisk"),
  delayRisk: document.querySelector("#delayRisk"),
  trendChart: document.querySelector("#trendChart"),
  topRiskChart: document.querySelector("#topRiskChart"),
  severityDistribution: document.querySelector("#severityDistribution"),
  riskSplitStats: document.querySelector("#riskSplitStats"),
  peakHourHeatmap: document.querySelector("#peakHourHeatmap"),
  weekdayTrendChart: document.querySelector("#weekdayTrendChart"),
  trendRegionFilter: document.querySelector("#trendRegionFilter"),
  focusRegionSelect: document.querySelector("#focusRegionSelect"),
  trendTotalIncidents: document.querySelector("#trendTotalIncidents"),
  trendTotalMeta: document.querySelector("#trendTotalMeta"),
  trendHighSeverity: document.querySelector("#trendHighSeverity"),
  trendHighMeta: document.querySelector("#trendHighMeta"),
  trendAvgDaily: document.querySelector("#trendAvgDaily"),
  trendAvgMeta: document.querySelector("#trendAvgMeta"),
  trendPeakDay: document.querySelector("#trendPeakDay"),
  trendPeakMeta: document.querySelector("#trendPeakMeta"),
  generateStatus: document.querySelector("#generateStatus"),
  strategicAnalysisBtnText: document.querySelector("#strategicAnalysisBtnText"),
  reportBanner: document.querySelector("#reportBanner"),
  reportBannerText: document.querySelector("#reportBannerText"),
  reportBannerTime: document.querySelector("#reportBannerTime"),
  regionChips: document.querySelector("#regionChips"),
  riskDistribution: document.querySelector("#riskDistribution"),
  reportModalOverlay: document.querySelector("#reportModalOverlay"),
  reportModalClose: document.querySelector("#reportModalClose"),
  reportModalOk: document.querySelector("#reportModalOk"),
  reportModalGrid: document.querySelector("#reportModalGrid"),
  reportModalTitle: document.querySelector("#reportModalTitle"),
  reportModalDescription: document.querySelector(".report-modal-header p"),
  strategicAnalysisBtn: document.querySelector("#strategicAnalysisBtn"),
  strategicSummary: document.querySelector("#strategicSummary"),
  strategicRecommendations: document.querySelector("#strategicRecommendations"),
  strategicLoadingStream: document.querySelector("#strategicLoadingStream"),
  reportPreviewPeriod: document.querySelector("#reportPreviewPeriod"),
  reportPreviewTime: document.querySelector("#reportPreviewTime"),
  reportDatasetScope: document.querySelector("#reportDatasetScope"),
  reportDataPoints: document.querySelector("#reportDataPoints"),
  reportPrediction: document.querySelector("#reportPrediction"),
  reportKeyFindings: document.querySelector("#reportKeyFindings"),
  reportPotentialCauses: document.querySelector("#reportPotentialCauses"),
  reportRecommendedActions: document.querySelector("#reportRecommendedActions"),
  reportDeploymentPlan: document.querySelector("#reportDeploymentPlan"),
  reportSuggestionTabs: document.querySelector("#reportSuggestionTabs"),
  reportExecutiveCard: document.querySelector("#reportExecutiveCard"),
  reportFindingsCard: document.querySelector("#reportFindingsCard"),
  reportCausesCard: document.querySelector("#reportCausesCard"),
  reportSolutionsCard: document.querySelector("#reportSolutionsCard"),
  reportResourcesCard: document.querySelector("#reportResourcesCard"),
  reportPredictionCard: document.querySelector("#reportPredictionCard"),
  viewFullAnalyticsBtn: document.querySelector("#viewFullAnalyticsBtn"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  shareReportBtn: document.querySelector("#shareReportBtn"),
  sendHospitalBtn: document.querySelector("#sendHospitalBtn"),
  generateBriefingBtn: document.querySelector("#generateBriefingBtn"),
  viewDetailedReportBtn: document.querySelector("#viewDetailedReportBtn"),
  sampleReportRegionSelect: document.querySelector("#sampleReportRegionSelect"),
  sampleDateDisplay: document.querySelector("#sampleDateDisplay"),
  generateSampleReportBtn: document.querySelector("#generateSampleReportBtn"),
  sampleReportPage: document.querySelector("#sampleReportPage"),
  sampleReportPrintable: document.querySelector("#sampleReportPrintable"),
  sampleReportPageList: document.querySelector("#sampleReportPageList"),
  previewPrevBtn: document.querySelector("#previewPrevBtn"),
  previewNextBtn: document.querySelector("#previewNextBtn"),
  previewPageIndicator: document.querySelector("#previewPageIndicator"),
  previewZoomOutBtn: document.querySelector("#previewZoomOutBtn"),
  previewZoomInBtn: document.querySelector("#previewZoomInBtn"),
  previewZoomValue: document.querySelector("#previewZoomValue"),
  previewDownloadPdfBtn: document.querySelector("#previewDownloadPdfBtn"),
  previewShareBtn: document.querySelector("#previewShareBtn"),
  previewPrintBtn: document.querySelector("#previewPrintBtn"),
};

document.querySelectorAll("[data-role]").forEach((button) => {
  button.addEventListener("click", () => {
    activeRole = normalizeRole(button.dataset.role);
    selectedIds.clear();
    syncRoleQuery();
    render();
  });
});

els.hospitalSelectAllBtn?.addEventListener("click", toggleHospitalSelection);
els.hospitalDeleteBtn?.addEventListener("click", deleteSelectedHospitalAlerts);
els.insuranceSelectAllBtn?.addEventListener("click", toggleInsuranceSelection);
els.insuranceDeleteBtn?.addEventListener("click", deleteSelectedInsuranceAlerts);

els.strategicAnalysisBtn?.addEventListener("click", () => {
  if (strategicInsightsLoading) {
    return;
  }
  strategicInsightsLoading = true;
  strategicInsightsReady = false;
  els.strategicAnalysisBtn.classList.add("loading");
  if (els.strategicAnalysisBtnText) {
    els.strategicAnalysisBtnText.textContent = "Generating...";
  }
  if (els.generateStatus) {
    els.generateStatus.textContent = "Generating AI strategy...";
  }
  renderStrategicInsights();
  if (strategicLoadingTimer) {
    window.clearTimeout(strategicLoadingTimer);
  }
  strategicLoadingTimer = window.setTimeout(() => {
    strategicInsightsLoading = false;
    strategicInsightsReady = true;
    els.strategicAnalysisBtn.classList.remove("loading");
    if (els.strategicAnalysisBtnText) {
      els.strategicAnalysisBtnText.textContent = "Generate Strategic Analysis";
    }
    renderStrategicInsights();
  }, 700);
});

els.viewDetailedReportBtn?.addEventListener("click", () => {
  openZoneInsightModal();
});

document.querySelectorAll("[data-insight-audience]").forEach((button) => {
  button.addEventListener("click", () => {
    activeInsightAudience = button.dataset.insightAudience || "government";
    renderStrategicInsights();
  });
});

document.querySelectorAll("[data-trend-range]").forEach((button) => {
  button.addEventListener("click", () => {
    activeTrendRange = button.dataset.trendRange || "7";
    document.querySelectorAll("[data-trend-range]").forEach((item) => {
      item.classList.toggle("active", item.dataset.trendRange === activeTrendRange);
    });
    renderTrendChart();
    renderTrendMetrics(reportZones[activeZone] || reportZones["shah-alam"]);
    renderStrategicInsights();
  });
});

els.exportPdfBtn?.addEventListener("click", exportStrategicReportPdf);
els.shareReportBtn?.addEventListener("click", shareStrategicReport);
els.sendHospitalBtn?.addEventListener("click", sendStrategicReportToHospital);
els.generateBriefingBtn?.addEventListener("click", generateStrategicBriefing);
els.trendRegionFilter?.addEventListener("change", () => {
  const selected = els.trendRegionFilter.value || "all";
  activeTrendRegion = selected;
  if (selected !== "all" && reportZones[selected]) {
    activeZone = selected;
  }
  renderReportZone();
});
els.focusRegionSelect?.addEventListener("change", () => {
  const selected = els.focusRegionSelect.value || "shah-alam";
  if (reportZones[selected]) {
    activeZone = selected;
    renderReportZone();
  }
});
document.querySelectorAll("[data-suggestion-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    activeSuggestionTab = button.dataset.suggestionTab || "summary";
    document.querySelectorAll("[data-suggestion-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.suggestionTab === activeSuggestionTab);
    });
    renderStrategicInsights();
  });
});
document.querySelectorAll("[data-sample-range]").forEach((button) => {
  button.addEventListener("click", () => {
    sampleReportState.range = button.dataset.sampleRange || "7";
    document.querySelectorAll("[data-sample-range]").forEach((item) => {
      item.classList.toggle("active", item.dataset.sampleRange === sampleReportState.range);
    });
    updateSampleDateDisplay();
    renderSampleReportPreview();
  });
});
document.querySelectorAll("[data-report-format]").forEach((button) => {
  button.addEventListener("click", () => {
    sampleReportState.format = button.dataset.reportFormat || "pdf";
    document.querySelectorAll("[data-report-format]").forEach((item) => {
      item.classList.toggle("active", item.dataset.reportFormat === sampleReportState.format);
    });
  });
});
document.querySelectorAll(".sample-content-option").forEach((input) => {
  input.addEventListener("change", () => {
    renderSampleReportPreview();
  });
});
els.sampleReportRegionSelect?.addEventListener("change", () => {
  sampleReportState.region = els.sampleReportRegionSelect.value || "shah-alam";
  renderSampleReportPreview();
});
els.viewFullAnalyticsBtn?.addEventListener("click", () => {
  openAdvancedInsightsModal();
});
els.generateSampleReportBtn?.addEventListener("click", () => {
  generateSampleReport();
});
els.previewPrevBtn?.addEventListener("click", () => {
  sampleReportState.page = Math.max(1, sampleReportState.page - 1);
  renderSampleReportPreview();
});
els.previewNextBtn?.addEventListener("click", () => {
  sampleReportState.page = Math.min(sampleReportPages.length, sampleReportState.page + 1);
  renderSampleReportPreview();
});
els.previewZoomOutBtn?.addEventListener("click", () => {
  sampleReportState.zoom = Math.max(80, sampleReportState.zoom - 20);
  renderSampleReportPreview();
});
els.previewZoomInBtn?.addEventListener("click", () => {
  sampleReportState.zoom = Math.min(120, sampleReportState.zoom + 20);
  renderSampleReportPreview();
});
els.previewDownloadPdfBtn?.addEventListener("click", downloadSampleReportPdf);
els.previewShareBtn?.addEventListener("click", shareSampleReport);
els.previewPrintBtn?.addEventListener("click", printSampleReport);

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
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === activeRole);
  });

  const reportMode = activeRole === "report";
  const hospitalMode = activeRole === "hospital";
  const insuranceMode = activeRole === "insurance";
  document.body.classList.toggle("report-mode", reportMode);
  document.body.classList.toggle("hospital-mode", hospitalMode);
  document.body.classList.toggle("insurance-mode", insuranceMode);
  els.feedPanel.classList.toggle("hidden", reportMode);
  els.updatesPanel.classList.toggle("hidden", reportMode || insuranceMode);
  els.reportPanel.classList.toggle("hidden", !reportMode);
  els.reportUtility.classList.toggle("hidden", !reportMode);
  els.metrics.classList.toggle("hidden", reportMode || hospitalMode || insuranceMode);
  els.hospitalHeaderActions?.classList.toggle("hidden", !hospitalMode);
  els.insuranceHeaderActions?.classList.toggle("hidden", !insuranceMode);
  els.connectionState?.classList.toggle("hidden", hospitalMode || insuranceMode);

  if (activeRole === "hospital") {
    els.roleTitle.textContent = "Hospital Dashboard";
    els.roleSubtitle.textContent =
      "Nearest hospital dashboard for Level 4/5 EV accident alerts sent from the driver's current location.";
    els.feedTitle.textContent = "Hospital Notifications";
    els.feedSummary.textContent =
      "Hospital only receives Level 4 and Level 5 cases.";
  } else if (activeRole === "insurance") {
    els.roleTitle.textContent = "Insurance Dashboard";
    els.roleSubtitle.textContent =
      "Insurance dashboard for all EV impact levels, driver activity, support logs, and claim review updates.";
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
  updateHospitalHeader(visible, updates);
  updateInsuranceHeader();

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
  updateHospitalControls(visible);
  updateInsuranceControls(visible);
  if (reportMode) {
    initializeSelangorMap();
    initializeSampleReportControls();
    if (!reportGeneratedAt) {
      refreshReportData({ showBanner: false });
    } else {
      renderReportZone();
    }
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
  syncZoneRiskPresentation();
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  populateRegionSelects();
  els.zoneTitle.textContent = zone.title;
  els.zoneRiskText.textContent = zone.riskText;
  els.zoneRiskText.className = `zone-risk ${zone.riskClass}`;
  els.zoneNarrative.textContent = zone.narrative;
  els.zoneIncidents.textContent = `${zone.incidentsCount} incidents`;
  els.zoneCritical.textContent = `${zone.criticalPct}% Level 4/5`;
  els.zoneAction.textContent = zone.action;
  els.zoneWindow.textContent = zone.window;
  if (els.zoneCause) {
    els.zoneCause.textContent = likelyCauseForZone(zone);
  }
  renderReportUpdatedBadge();
  els.regionChips.innerHTML = regionChipsMarkup();
  els.riskDistribution.innerHTML = riskDistributionMarkup();
  els.generateStatus.textContent = reportGeneratedAt
    ? `Auto-updated at ${formatTime(reportGeneratedAt)}`
    : "Auto-refresh ready";
  renderTrendMetrics(zone);
  renderStrategicInsights();
  bindRegionChips();
  bindRiskCards();
  renderTrendChart();
  renderWeekdayTrendChart();
  updateMapVisuals();
}

function compareZonesByPriority(a, b) {
  const riskDiff = riskPriority(riskBandFromZone(b)) - riskPriority(riskBandFromZone(a));
  if (riskDiff !== 0) {
    return riskDiff;
  }
  const incidentDiff = b.incidentsCount - a.incidentsCount;
  if (incidentDiff !== 0) {
    return incidentDiff;
  }
  return b.criticalPct - a.criticalPct;
}

function riskPriority(level) {
  if (level === "high") {
    return 3;
  }
  if (level === "medium") {
    return 2;
  }
  return 1;
}

function riskBandFromZone(zone) {
  if (zone.incidentsCount >= 13) {
    return "high";
  }
  if (zone.incidentsCount >= 5) {
    return "medium";
  }
  return "low";
}

function riskLabel(level) {
  if (level === "high") {
    return "High";
  }
  if (level === "medium") {
    return "Medium";
  }
  return "Low";
}

function riskTextForLevel(level) {
  if (level === "high") {
    return "High alert zone";
  }
  if (level === "medium") {
    return "Watch closely";
  }
  return "Low risk / monitor";
}

function riskClassForLevel(level) {
  if (level === "high") {
    return "high-text";
  }
  if (level === "medium") {
    return "medium-text";
  }
  return "low-text";
}

function syncZoneRiskPresentation() {
  Object.values(reportZones).forEach((zone) => {
    const level = riskBandFromZone(zone);
    zone.level = level;
    zone.riskText = riskTextForLevel(level);
    zone.riskClass = riskClassForLevel(level);
  });
}

function populateRegionSelects() {
  const regionOptions = Object.entries(reportZones)
    .sort(([, a], [, b]) => a.title.localeCompare(b.title))
    .map(([id, zone]) => `<option value="${escapeHtml(id)}">${escapeHtml(zone.title)}</option>`)
    .join("");
  const trendOptions = `<option value="all">All Regions (${Object.keys(reportZones).length})</option>${regionOptions}`;

  if (els.trendRegionFilter && els.trendRegionFilter.innerHTML !== trendOptions) {
    els.trendRegionFilter.innerHTML = trendOptions;
  }
  if (els.focusRegionSelect && els.focusRegionSelect.innerHTML !== regionOptions) {
    els.focusRegionSelect.innerHTML = regionOptions;
  }

  if (els.trendRegionFilter) {
    els.trendRegionFilter.value = activeTrendRegion;
  }

  if (els.focusRegionSelect) {
    els.focusRegionSelect.value = activeZone;
  }
}

function likelyCauseForZone(zone) {
  if (zone.title === "Shah Alam" || zone.title === "Klang") {
    return "Evening traffic pressure and EV charging route congestion";
  }
  if (zone.window.includes("PM")) {
    return "Connector road congestion and commuter flow pressure";
  }
  return "Routine urban travel movement with lower severe-impact density";
}

function preferredRiskBand(id) {
  if (["shah-alam", "klang"].includes(id)) {
    return "high";
  }
  if (
    [
      "gombak",
      "petaling-jaya",
      "subang-jaya",
      "rawang",
      "ampang-jaya",
      "kuala-langat",
      "hulu-selangor",
      "puchong",
      "sungai-buloh",
      "selayang",
      "hulu-langat",
    ].includes(id)
  ) {
    return "medium";
  }
  return "low";
}

function regionChipsMarkup() {
  return Object.entries(reportZones)
    .sort(([, a], [, b]) => compareZonesByPriority(a, b))
    .map(([id, zone], index) => {
      const active = id === activeZone ? " active" : "";
      const levelTag = `L${severityLevelFromZone(zone)}`;
      return `
        <button type="button" class="region-chip ${zone.level}${active}" data-zone-chip="${escapeHtml(id)}">
          <span class="region-chip-rank">
            <i class="chip-dot"></i>
            <span class="chip-rank">${escapeHtml(String(index + 1))}</span>
          </span>
          <span class="region-chip-copy">
            <strong>${escapeHtml(zone.title)}</strong>
            <span>${escapeHtml(`${levelTag} | ${zone.incidentsCount} cases`)}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function riskDistributionMarkup() {
  const preferredRiskOrder = [
    "Shah Alam",
    "Klang",
    "Gombak",
    "Petaling Jaya",
    "Subang Jaya",
    "Rawang",
    "Hulu Langat",
    "Ampang Jaya",
    "Kuala Langat",
    "Hulu Selangor",
    "Selayang",
    "Puchong",
    "Sungai Buloh",
    "Kajang",
    "Cyberjaya",
    "Sepang",
    "Kuala Selangor",
    "Banting",
    "Batu Caves",
    "Putrajaya",
    "Sabak Bernam",
  ];
  const preferredRank = (title) => {
    const index = preferredRiskOrder.indexOf(title);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const zones = Object.values(reportZones)
    .slice()
    .sort((a, b) => {
      const rankDiff = preferredRank(a.title) - preferredRank(b.title);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      const incidentDiff = b.incidentsCount - a.incidentsCount;
      if (incidentDiff !== 0) {
        return incidentDiff;
      }
      return a.title.localeCompare(b.title);
    });
  return zones
    .map(
      (zone, index) => `
        <button type="button" class="risk-pill ${zone.level}${zone.title === (reportZones[activeZone] || reportZones["shah-alam"]).title ? " active" : ""}" data-risk-zone="${escapeHtml(zone.title)}">
          <div class="risk-pill-head">
            <div class="risk-pill-rankline">
              <span class="risk-rank-text">${escapeHtml(String(index + 1))}</span>
              <strong>${escapeHtml(zone.title)}</strong>
            </div>
            <span class="risk-severity-badge ${zone.level}">${escapeHtml(riskLabel(zone.level))}</span>
          </div>
          <div class="risk-pill-meta">
            <div class="risk-pill-meta-row">
              <span class="risk-pill-meta-label">Cases</span>
              <span class="risk-pill-meta-value accent">${escapeHtml(`${zone.incidentsCount} cases`)}</span>
            </div>
            <div class="risk-pill-meta-row">
              <span class="risk-pill-meta-label">Peak</span>
              <span class="risk-pill-meta-value">${escapeHtml(zone.window)}</span>
            </div>
            <div class="risk-pill-meta-row">
              <span class="risk-pill-meta-label">Common Impact</span>
              <span class="risk-pill-meta-value accent">${escapeHtml(`Level ${severityLevelFromZone(zone)}`)}</span>
            </div>
          </div>
        </button>
      `,
    )
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

function bindRiskCards() {
  document.querySelectorAll("[data-risk-zone]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.riskZone;
      const match = Object.entries(reportZones).find(([, zone]) => zone.title === target);
      if (!match) {
        return;
      }
      activeZone = match[0];
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

function updateHospitalHeader(visible = visibleAlerts(), updates = visibleNotifications()) {
  if (activeRole !== "hospital") {
    return;
  }

  const now = new Date();
  if (els.hospitalUpdatedBadge) {
    els.hospitalUpdatedBadge.innerHTML = `
      <span>Live</span>
      <strong>Updated ${formatTime(now)}</strong>
      <small>${formatDate(now)}</small>
    `;
  }
}

function updateInsuranceHeader() {
  if (activeRole !== "insurance") {
    return;
  }

  const now = new Date();
  if (els.insuranceUpdatedBadge) {
    els.insuranceUpdatedBadge.innerHTML = `
      <span>Live</span>
      <strong>Updated ${formatTime(now)}</strong>
      <small>${formatDate(now)}</small>
    `;
  }
}

function updateHospitalControls(visible = visibleAlerts()) {
  if (activeRole !== "hospital") {
    return;
  }

  const visibleIds = visible.map(alertId).filter(Boolean);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  if (els.hospitalSelectAllBtn) {
    els.hospitalSelectAllBtn.textContent = allSelected ? "Clear Selection" : "Select All";
  }
}

function updateInsuranceControls(visible = visibleAlerts()) {
  if (activeRole !== "insurance") {
    return;
  }

  const visibleIds = visible.map(alertId).filter(Boolean);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  if (els.insuranceSelectAllBtn) {
    els.insuranceSelectAllBtn.textContent = allSelected ? "Clear Selection" : "Select All";
  }
}

function toggleHospitalSelection() {
  const visibleIds = visibleAlerts().map(alertId).filter(Boolean);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  selectedIds.clear();
  if (!allSelected) {
    visibleIds.forEach((id) => selectedIds.add(id));
  }

  render();
}

function toggleInsuranceSelection() {
  const visibleIds = visibleAlerts().map(alertId).filter(Boolean);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  selectedIds.clear();
  if (!allSelected) {
    visibleIds.forEach((id) => selectedIds.add(id));
  }

  render();
}

async function deleteSelectedHospitalAlerts() {
  const selectedAlerts = visibleAlerts().filter((item) => selectedIds.has(alertId(item)));

  if (selectedAlerts.length === 0) {
    window.alert("Please select at least one notification.");
    return;
  }

  if (!window.confirm("Delete selected hospital notifications?")) {
    return;
  }

  try {
    await Promise.all(
      selectedAlerts.map((item) => remove(ref(database, `alerts/${item.id || alertId(item)}`))),
    );
    selectedIds.clear();
    render();
  } catch (error) {
    window.alert(`Unable to delete selected notifications: ${error.message}`);
  }
}

async function deleteSelectedInsuranceAlerts() {
  const selectedAlerts = visibleAlerts().filter((item) => selectedIds.has(alertId(item)));

  if (selectedAlerts.length === 0) {
    window.alert("Please select at least one notification.");
    return;
  }

  if (!window.confirm("Delete selected insurance notifications?")) {
    return;
  }

  try {
    await Promise.all(
      selectedAlerts.map((item) => remove(ref(database, `alerts/${item.id || alertId(item)}`))),
    );
    selectedIds.clear();
    render();
  } catch (error) {
    window.alert(`Unable to delete selected notifications: ${error.message}`);
  }
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

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderReportUpdatedBadge() {
  if (!els.reportUpdated) {
    return;
  }
  const now = new Date();
  els.reportUpdated.innerHTML = `
    <span>Live</span>
    <strong>Updated ${formatTime(now)}</strong>
    <small>${formatDate(now)}</small>
  `;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function emptyState(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function openReportModal(alertItem, notificationItem = null) {
  const fields = buildReportFields(alertItem, notificationItem);
  openCustomReportModal(
    "Ambulance Report Details",
    "Submitted from the ambulance responder workflow and synced live to the hospital dashboard.",
    fields,
  );
}

function openCustomReportModal(title, description, fields) {
  els.reportModalTitle.textContent = title;
  els.reportModalDescription.textContent = description;
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
  updateHospitalHeader();
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
    const strongestZones = topZones(2)
      .map((zone) => zone.title)
      .join(" and ");

    els.metricLabel1.textContent = "Active Hotspots (AI)";
    els.metricLabel2.textContent = "High-Risk Zones";
    els.metricLabel3.textContent = "AI Confidence Score";
    els.metricLabel4.textContent = "AI Data Updated";
    els.metricValue1.textContent = Object.keys(reportZones).length;
    els.metricValue2.textContent = highRiskCount;
    els.metricValue3.textContent = `${reportConfidenceScore}%`;
    els.metricValue4.textContent = updatedText;
    els.metricMeta1.textContent = `Focus strongest around ${strongestZones}`;
    els.metricMeta2.textContent = `${highRiskCount === 1 ? "One district" : `${highRiskCount} districts`} require close watch`;
    els.metricMeta3.textContent = reportConfidenceScore >= 94 ? "High confidence" : "Monitoring confidence";
    els.metricMeta4.textContent = reportGeneratedAt ? formatDate(reportGeneratedAt) : "Awaiting AI refresh";
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
  els.metricMeta1.textContent = "Realtime alert feed";
  els.metricMeta2.textContent = "Bulk action queue";
  els.metricMeta3.textContent = "Responder & support logs";
  els.metricMeta4.textContent = formatDate(new Date());
}

function refreshReportData({ showBanner = true, forceBump = false } = {}) {
  if (reportGenerationTimer) {
    window.clearTimeout(reportGenerationTimer);
  }
  if (reportBannerTimer) {
    window.clearTimeout(reportBannerTimer);
  }
  randomizeReportData(forceBump);
  reportGeneratedAt = new Date();
  strategicInsightsReady = true;
  renderReportZone();
  renderMetrics(visibleAlerts(), visibleNotifications(), true);

  if (!showBanner) {
    els.reportBanner.classList.add("hidden");
    return;
  }

  els.reportBannerText.textContent =
    `Hotspot prioritisation updated for ${reportZones[activeZone].title}. Ambulance readiness recommendations are refreshed.`;
  els.reportBannerTime.textContent = formatTime(reportGeneratedAt);
  els.reportBanner.classList.remove("hidden");
  reportBannerTimer = window.setTimeout(() => {
    els.reportBanner.classList.add("hidden");
  }, 2800);
}

function randomizeReportData(forceBump = false) {
  Object.entries(reportZones).forEach(([id, zone]) => {
    if (forceBump) {
      const incidentDelta = randomInt(-1, 1);
      const pctDelta = randomInt(-1, 2);
      const preferredBand = preferredRiskBand(id);
      const nextCount = zone.incidentsCount + incidentDelta;
      if (preferredBand === "high") {
        zone.incidentsCount = clamp(nextCount, 13, 16);
      } else if (preferredBand === "medium") {
        zone.incidentsCount = clamp(nextCount, 5, 12);
      } else {
        zone.incidentsCount = clamp(nextCount, 2, 4);
      }
      zone.criticalPct = clamp(zone.criticalPct + pctDelta, 8, 42);
    }
    zone.spark = zone.spark.map((value, index) =>
      Math.max(1, value + randomInt(index === zone.spark.length - 1 ? -1 : -2, 2)),
    );
  });
  syncZoneRiskPresentation();
  reportConfidenceScore = clamp(reportConfidenceScore + randomInt(-2, 2), 91, 97);
}

function buildRegionalSummary() {
  const ranked = Object.values(reportZones)
    .slice()
    .sort(compareZonesByPriority);
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

function severityWord(level) {
  if (level === "high") {
    return "High";
  }
  if (level === "low") {
    return "Low";
  }
  return "Medium";
}

async function shareStrategicReport() {
  const text = buildStrategicReportText();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      openCustomReportModal(
        "Report copied",
        "The strategic report text is ready to paste into email, chat, or briefing notes.",
        [{ label: "Copied content", value: "AI report preview copied to clipboard.", full: true }],
      );
      return;
    }
  } catch (_) {
    // Fallback below.
  }

  openCustomReportModal(
    "Share report",
    "Clipboard sharing is unavailable in this browser, so the report text is shown below for manual sharing.",
    [{ label: "Strategic report", value: text, full: true }],
  );
}

function sendStrategicReportToHospital() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  openCustomReportModal(
    "Hospital briefing queued",
    "This simulation prepares a hospital-facing handover summary from the current hotspot analysis.",
    [
      { label: "Focused region", value: zone.title },
      { label: "Audience", value: "Hospital emergency coordination" },
      { label: "Key handover", value: `Prepare surge-readiness during ${zone.window} and hold visibility for ${zone.criticalPct}% critical-share risk.`, full: true },
    ],
  );
}

function openZoneInsightModal() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  const fields = [
    { label: "Focused Region", value: zone.title },
    { label: "Current Risk", value: zone.riskText },
    { label: "Average Impact Level", value: averageImpactLevel(zone) },
    { label: "Peak Crash Time", value: zone.window },
    { label: "Recent Incidents", value: `${zone.incidentsCount} cases in the past 7 days` },
    { label: "Critical Share", value: `${zone.criticalPct}% Level 4/5` },
    { label: "Recommended Action", value: zone.action, full: true },
    { label: "AI Narrative", value: zone.narrative, full: true },
  ];
  openCustomReportModal(
    "AI Hotspot Detail Report",
    "Generated from the Accidents Report dashboard using the selected regional hotspot.",
    fields,
  );
}

function averageImpactLevel(zone) {
  return (2.4 + zone.criticalPct / 25).toFixed(1);
}

function severityLevelFromZone(zone) {
  return clamp(Math.round(Number(averageImpactLevel(zone))), 2, 5);
}

function topZones(limit) {
  return Object.values(reportZones)
    .slice()
    .sort(compareZonesByPriority)
    .slice(0, limit);
}

function trendRangeLabel(range) {
  const labels = {
    "7": "Past 7 Days",
    "30": "Past 30 Days",
    monthly: "Monthly Overview",
    yearly: "Yearly Overview",
  };
  return labels[range] || labels["7"];
}

function trendSeriesForRange(range) {
  const base = {
    labels: chartDays,
    bars: chartDays.map((_, index) =>
      Math.max(
        4,
        Math.round(
          Object.values(reportZones).reduce(
            (sum, zone) => sum + (zone.spark[index] ?? 0),
            0,
          ) / 4,
        ),
      ),
    ),
    shah: reportZones["shah-alam"].spark,
    subang: reportZones["subang-jaya"].spark,
    pj: reportZones["petaling-jaya"].spark,
  };

  if (range === "30") {
    return {
      labels: ["W1", "W2", "W3", "W4", "W5", "W6"],
      bars: [18, 24, 28, 25, 31, 34],
      shah: [10, 12, 14, 13, 16, 18],
      subang: [7, 8, 10, 9, 11, 12],
      pj: [6, 7, 8, 8, 9, 10],
    };
  }

  if (range === "monthly") {
    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      bars: [44, 47, 42, 50, 56, 61],
      shah: [19, 20, 18, 22, 24, 26],
      subang: [12, 13, 11, 14, 15, 16],
      pj: [10, 10, 9, 11, 12, 13],
    };
  }

  if (range === "yearly") {
    return {
      labels: ["Q1", "Q2", "Q3", "Q4"],
      bars: [118, 126, 134, 147],
      shah: [48, 51, 55, 61],
      subang: [31, 33, 35, 39],
      pj: [27, 28, 31, 34],
    };
  }

  return base;
}

function initializeSelangorMap() {
  if (selangorMap || !window.L) {
    return;
  }

  selangorMap = window.L.map("selangorMap", {
    zoomControl: false,
    scrollWheelZoom: true,
    minZoom: 9,
    maxZoom: 13,
  }).setView([3.1, 101.58], 10);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(selangorMap);

  const focusBounds = window.L.latLngBounds(
    [
      [2.7, 101.22],
      [3.46, 101.93],
    ],
  );
  selangorMap.fitBounds(focusBounds, { padding: [20, 20] });
  window.L.control.zoom({ position: "topright" }).addTo(selangorMap);

  Object.entries(reportZones).forEach(([id, zone]) => {
    const polygon = window.L.polygon(zone.polygon, {
      color: zoneStroke(zone.level),
      fillColor: zoneFill(zone.level),
      fillOpacity: 0.28,
      weight: id === activeZone ? 4 : 2,
      className: `zone-polygon zone-polygon-${zone.level}`,
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

    const glow = window.L.circleMarker(zone.center, {
      radius: id === activeZone ? 22 : 16,
      stroke: false,
      fillColor: zoneStroke(zone.level),
      fillOpacity: id === activeZone ? 0.26 : 0.15,
    }).addTo(selangorMap);

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

    zoneLayers.set(id, { polygon, marker, glow });
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
      fillOpacity: id === activeZone ? 0.38 : 0.22,
      weight: id === activeZone ? 4 : 2.4,
    });
    layer.glow.setStyle({
      radius: id === activeZone ? 24 : 16,
      fillColor: zoneStroke(zone.level),
      fillOpacity: id === activeZone ? 0.28 : 0.14,
    });
    layer.marker.setStyle({
      radius: id === activeZone ? 8 : 6,
      fillColor: zoneStroke(zone.level),
    });
    if (
      id === activeZone &&
      !selangorMap.getBounds().pad(-0.08).contains(window.L.latLng(zone.center))
    ) {
      selangorMap.flyTo(zone.center, Math.max(selangorMap.getZoom(), 10.8), {
        duration: 0.6,
      });
    }
  });
}

function zoneStroke(level) {
  if (level === "high") {
    return "#ff4d4f";
  }
  if (level === "medium") {
    return "#fbbf24";
  }
  return "#22c55e";
}

function zoneFill(level) {
  if (level === "high") {
    return "#dc2626";
  }
  if (level === "medium") {
    return "#d97706";
  }
  return "#16a34a";
}

function analyticsZones() {
  if (activeTrendRegion !== "all" && reportZones[activeTrendRegion]) {
    return [reportZones[activeTrendRegion]];
  }
  return Object.values(reportZones);
}

function analyticsTopZones(limit) {
  return analyticsZones()
    .slice()
    .sort(compareZonesByPriority)
    .slice(0, limit);
}

function parseHourRange(windowText) {
  const match = String(windowText).match(/(\d{1,2})\s*(AM|PM)\s*-\s*(\d{1,2})\s*(AM|PM)/i);
  if (!match) {
    return [17, 20];
  }
  const to24 = (hourText, suffix) => {
    let hour = Number(hourText) % 12;
    if (suffix.toUpperCase() === "PM") {
      hour += 12;
    }
    return hour;
  };
  const start = to24(match[1], match[2]);
  let end = to24(match[3], match[4]);
  if (end <= start) {
    end += 24;
  }
  return [start, end];
}

function buildTrendDataset(range) {
  const zones = analyticsZones();
  const rawDailyTotals = chartDays.map((_, index) =>
    zones.reduce((sum, zone) => sum + (zone.spark[index] ?? 0), 0),
  );
  const rawHighTotals = chartDays.map((_, index) =>
    zones.reduce(
      (sum, zone) => sum + Math.max(1, Math.round((zone.spark[index] ?? 0) * (zone.criticalPct / 100))),
      0,
    ),
  );
  const scale = activeTrendRegion === "all" ? 0.42 : 1;
  const dailyTotals = rawDailyTotals.map((value) => Math.max(3, Math.round(value * scale)));
  const dailyHigh = rawHighTotals.map((value) => Math.max(1, Math.round(value * Math.max(0.35, scale))));

  if (range === "30") {
    const totalBase = dailyTotals.reduce((sum, value) => sum + value, 0);
    const highBase = dailyHigh.reduce((sum, value) => sum + value, 0);
    return {
      labels: ["W1", "W2", "W3", "W4", "W5"],
      totals: [0.9, 1.02, 1.14, 1.08, 1.22].map((factor) => Math.round(totalBase * factor)),
      high: [0.82, 0.96, 1.08, 1.04, 1.2].map((factor) => Math.round(highBase * factor)),
    };
  }

  if (range === "monthly") {
    const totalBase = dailyTotals.reduce((sum, value) => sum + value, 0);
    const highBase = dailyHigh.reduce((sum, value) => sum + value, 0);
    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      totals: [3.9, 4.2, 4.1, 4.6, 4.8, 5.1].map((factor) => Math.round(totalBase * factor)),
      high: [1.6, 1.75, 1.7, 1.9, 2.05, 2.15].map((factor) => Math.round(highBase * factor)),
    };
  }

  if (range === "yearly") {
    const totalBase = dailyTotals.reduce((sum, value) => sum + value, 0);
    const highBase = dailyHigh.reduce((sum, value) => sum + value, 0);
    return {
      labels: ["Q1", "Q2", "Q3", "Q4"],
      totals: [12.2, 13.1, 14.4, 15.3].map((factor) => Math.round(totalBase * factor)),
      high: [4.7, 5.1, 5.6, 6.2].map((factor) => Math.round(highBase * factor)),
    };
  }

  return {
    labels: chartDays,
    totals: dailyTotals,
    high: dailyHigh,
  };
}

function severityBreakdown(zones) {
  return zones.reduce(
    (acc, zone) => {
      const highCases = Math.max(1, Math.round(zone.incidentsCount * (zone.criticalPct / 100)));
      const level5 = Math.max(0, Math.round(highCases * 0.18));
      const level4 = Math.max(0, highCases - level5);
      const remaining = Math.max(0, zone.incidentsCount - highCases);
      const level3 = Math.max(1, Math.round(remaining * 0.45));
      const level2 = Math.max(0, Math.round(remaining * 0.32));
      const level1 = Math.max(0, remaining - level3 - level2);
      acc[5] += level5;
      acc[4] += level4;
      acc[3] += level3;
      acc[2] += level2;
      acc[1] += level1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  );
}

function peakHourMatrix(zones) {
  const rowDefs = [
    { key: "Morning", label: "6 AM - 12 PM", start: 6, end: 12 },
    { key: "Afternoon", label: "12 PM - 5 PM", start: 12, end: 17 },
    { key: "Evening", label: "5 PM - 9 PM", start: 17, end: 21 },
    { key: "Night", label: "9 PM - 6 AM", start: 21, end: 30 },
  ];
  return rowDefs.map((row) => {
    const cells = Array.from({ length: 24 }, (_, hour) => {
      return zones.reduce((sum, zone) => {
        const [start, end] = parseHourRange(zone.window);
        const effectiveHour = hour < 6 ? hour + 24 : hour;
        const matchesRow =
          row.start < row.end
            ? effectiveHour >= row.start && effectiveHour < row.end
            : effectiveHour >= row.start || effectiveHour < row.end;
        const matchesZone = effectiveHour >= start && effectiveHour < end;
        if (matchesRow && matchesZone) {
          return sum + zone.incidentsCount * (zone.level === "high" ? 1.2 : zone.level === "medium" ? 0.85 : 0.45);
        }
        return sum;
      }, 0);
    });
    return { ...row, cells };
  });
}

function renderTrendMetrics(zone) {
  const zones = analyticsZones();
  const dataset = buildTrendDataset(activeTrendRange);
  const totals = dataset.totals;
  const highs = dataset.high;
  const totalIncidents = totals.reduce((sum, value) => sum + value, 0);
  const highSeverity = highs.reduce((sum, value) => sum + value, 0);
  const avgDaily = (totalIncidents / Math.max(1, totals.length)).toFixed(1);
  const peakIndex = totals.indexOf(Math.max(...totals));
  const highest = analyticsTopZones(1)[0] || zone;

  if (els.zoneCause) {
    els.zoneCause.textContent = likelyCauseForZone(zone);
  }
  if (els.trendTotalIncidents) {
    els.trendTotalIncidents.textContent = totalIncidents;
    els.trendTotalMeta.textContent = `${trendRangeLabel(activeTrendRange)} coverage across ${activeTrendRegion === "all" ? "21 regions" : zone.title}`;
    els.trendHighSeverity.textContent = highSeverity;
    els.trendHighMeta.textContent = `${Math.round((highSeverity / Math.max(1, totalIncidents)) * 100)}% of the selected dataset`;
    els.trendAvgDaily.textContent = avgDaily;
    els.trendAvgMeta.textContent = `${zones.length} region${zones.length === 1 ? "" : "s"} included`;
    els.trendPeakDay.textContent = dataset.labels[peakIndex] || "Sunday";
    els.trendPeakMeta.textContent = `${totals[peakIndex] || 0} incidents`;
  }
  if (els.reportPreviewPeriod) {
    els.reportPreviewPeriod.textContent = trendRangeLabel(activeTrendRange);
  }
  renderTopRiskChart();
  renderSeverityDistribution();
  renderPeakHourHeatmap();
  renderRiskSplit();
  renderWeekdayTrendChart();
  if (els.avgImpactLevel) {
    els.avgImpactLevel.textContent = averageImpactLevel(zone);
  }
  if (els.peakCrashTime) {
    els.peakCrashTime.textContent = zone.window;
  }
  if (els.mostSevereArea) {
    els.mostSevereArea.textContent = highest.title;
  }
  if (els.nightRisk) {
    els.nightRisk.textContent = zone.criticalPct >= 28 ? "High" : zone.criticalPct >= 18 ? "Moderate" : "Low";
  }
  if (els.delayRisk) {
    els.delayRisk.textContent = zone.level === "high" ? "Medium" : zone.level === "medium" ? "Moderate" : "Low";
  }
}

function renderWeekdayTrendChart() {
  const svg = els.weekdayTrendChart;
  if (!svg) {
    return;
  }

  const zones = analyticsZones();
  const values = chartDays.map((_, index) =>
    zones.reduce((sum, zone) => sum + (zone.spark[index] ?? 0), 0),
  );
  const scaledValues = values.map((value) =>
    Math.max(3, Math.round(value * (activeTrendRegion === "all" ? 0.42 : 1))),
  );
  const maxValue = Math.max(...scaledValues, 10);
  const width = 420;
  const height = 240;
  const padding = { top: 22, right: 20, bottom: 38, left: 24 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = chartWidth / scaledValues.length;

  const bars = scaledValues
    .map((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding.left + index * stepX + 12;
      const y = padding.top + chartHeight - barHeight;
      const barWidth = Math.max(22, stepX - 24);
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="12" class="weekday-bar" />
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" class="chart-bar-value">${value}</text>
        <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" class="chart-label">${escapeHtml(
          chartDays[index],
        )}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="weekdayBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#39a357" />
        <stop offset="100%" stop-color="#176334" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="22" class="chart-bg" />
    ${Array.from({ length: 4 }, (_, index) => {
      const value = Math.round((maxValue / 4) * (4 - index));
      const y = padding.top + (chartHeight / 4) * index;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid" />`;
    }).join("")}
    ${bars}
  `;
}

function renderTrendChart() {
  const svg = els.trendChart;
  if (!svg) {
    return;
  }
  const dataset = buildTrendDataset(activeTrendRange);
  const labels = dataset.labels;
  const totals = dataset.totals;
  const highs = dataset.high;
  const allValues = [...totals, ...highs];
  const maxValue = Math.max(...allValues, 10);
  const width = 760;
  const height = 320;
  const padding = { top: 28, right: 26, bottom: 46, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = chartWidth / totals.length;
  const scaleY = (value) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const xAt = (index) => padding.left + index * stepX + stepX / 2;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((maxValue / 5) * (5 - index));
    const y = scaleY(value);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid" />
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="chart-y-label">${value}</text>`;
  }).join("");

  const bars = totals
    .map((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding.left + index * stepX + 14;
      const y = padding.top + chartHeight - barHeight;
      return `<rect x="${x}" y="${y}" width="${Math.max(26, stepX - 28)}" height="${barHeight}" rx="14" class="chart-bar" />
        <text x="${x + Math.max(26, stepX - 28) / 2}" y="${y - 8}" text-anchor="middle" class="chart-bar-value">${value}</text>`;
    })
    .join("");

  const linePath = highs
    .map((value, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${scaleY(value)}`)
    .join(" ");
  const points = highs
    .map((value, index) => `<circle cx="${xAt(index)}" cy="${scaleY(value)}" r="5" class="chart-point red" />`)
    .join("");
  const labelsMarkup = labels
    .map((label, index) => `<text x="${xAt(index)}" y="${height - 12}" text-anchor="middle" class="chart-label">${label}</text>`)
    .join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1f8b46" />
        <stop offset="100%" stop-color="#135c2c" />
      </linearGradient>
      <linearGradient id="chartAreaRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(239, 68, 68, 0.32)" />
        <stop offset="100%" stop-color="rgba(239, 68, 68, 0.02)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="24" class="chart-bg" />
    ${gridLines}
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" class="chart-axis" />
    <path d="${linePath} L ${xAt(highs.length - 1)} ${padding.top + chartHeight} L ${xAt(0)} ${padding.top + chartHeight} Z" class="chart-area red" />
    ${bars}
    <path d="${linePath}" class="chart-line red" />
    ${points}
    ${labelsMarkup}
  `;
}

function renderTopRiskChart() {
  const svg = els.topRiskChart;
  if (!svg) {
    return;
  }
  const zones = analyticsTopZones(5);
  const width = 420;
  const height = 240;
  const padding = { top: 24, right: 30, bottom: 26, left: 118 };
  const maxValue = Math.max(...zones.map((zone) => zone.incidentsCount), 10);
  const rowHeight = 34;
  const barWidth = width - padding.left - padding.right;

  const rows = zones
    .map((zone, index) => {
      const y = padding.top + index * rowHeight;
      const barLen = (zone.incidentsCount / maxValue) * barWidth;
      return `
        <text x="${padding.left - 10}" y="${y + 16}" text-anchor="end" class="mini-bar-label">${escapeHtml(zone.title)}</text>
        <rect x="${padding.left}" y="${y}" width="${barWidth}" height="14" rx="7" class="mini-bar-track" />
        <rect x="${padding.left}" y="${y}" width="${barLen}" height="14" rx="7" fill="${zoneStroke(zone.level)}" />
        <text x="${padding.left + barLen + 8}" y="${y + 12}" class="mini-bar-value">${zone.incidentsCount}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="20" class="chart-bg" />
    ${rows}
    <text x="${width / 2}" y="${height - 10}" text-anchor="middle" class="chart-label">Incidents</text>
  `;
}

function renderSeverityDistribution() {
  const container = els.severityDistribution;
  if (!container) {
    return;
  }
  const zones = analyticsZones();
  const buckets = severityBreakdown(zones);
  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  const values = [buckets[5], buckets[4], buckets[3], buckets[2], buckets[1]];
  const colors = ["#7c3aed", "#ef4444", "#f59e0b", "#22c55e", "#0ea5e9"];
  let offset = 0;
  const segments = values
    .map((value, index) => {
      const start = offset;
      const slice = total ? (value / total) * 360 : 0;
      offset += slice;
      return `${colors[index]} ${start}deg ${offset}deg`;
    })
    .join(", ");

  container.innerHTML = `
    <div class="severity-donut-wrap">
      <div class="severity-donut" style="background: conic-gradient(${segments});">
        <div class="severity-donut-center">
          <strong>${total}</strong>
          <span>Total</span>
        </div>
      </div>
      <div class="severity-legend-list">
        ${[5, 4, 3, 2, 1]
          .map((level, index) => {
            const value = buckets[level];
            const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";
            return `<div class="severity-legend-item"><span><i style="background:${colors[index]}"></i>Level ${level}</span><strong>${value} (${pct}%)</strong></div>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderRiskSplit() {
  const container = els.riskSplitStats;
  if (!container) {
    return;
  }
  const zones = analyticsZones();
  const counts = zones.reduce(
    (acc, zone) => {
      acc[zone.level] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );
  const total = zones.length;
  container.innerHTML = ["low", "medium", "high"]
    .map((level) => {
      const label = riskLabel(level);
      const count = counts[level];
      const pct = total ? ((count / total) * 100).toFixed(1) : "0.0";
      return `
        <div class="risk-split-card ${level}">
          <span>${label} Risk</span>
          <strong>${count}</strong>
          <p>${pct}%</p>
        </div>
      `;
    })
    .join("");
}

function renderPeakHourHeatmap() {
  const container = els.peakHourHeatmap;
  if (!container) {
    return;
  }
  const rows = peakHourMatrix(analyticsZones());
  const maxValue = Math.max(...rows.flatMap((row) => row.cells), 1);
  const peakRow = rows.reduce((best, row) => {
    const avg = row.cells.reduce((sum, value) => sum + value, 0) / row.cells.length;
    return !best || avg > best.avg ? { key: row.key, avg } : best;
  }, null);

  container.innerHTML = `
    <div class="heatmap-grid-wrap">
      ${rows
        .map((row) => {
          const avg = row.cells.reduce((sum, value) => sum + value, 0) / row.cells.length;
          return `
            <div class="heatmap-row">
              <div class="heatmap-row-label">
                <strong>${row.key}</strong>
                <span>${row.label}</span>
              </div>
              <div class="heatmap-cells">
                ${row.cells
                  .map((value, index) => {
                    const intensity = value / maxValue;
                    return `<span class="heatmap-cell" style="background: rgba(239, 68, 68, ${0.08 + intensity * 0.82})" title="${row.key} ${index}:00"></span>`;
                  })
                  .join("")}
              </div>
              <div class="heatmap-row-score ${peakRow && peakRow.key === row.key ? "peak" : ""}">
                ${avg.toFixed(1)}${peakRow && peakRow.key === row.key ? " • Peak" : ""}
              </div>
            </div>
          `;
        })
        .join("")}
      <div class="heatmap-hours">
        ${Array.from({ length: 24 }, (_, hour) => `<span>${hour}</span>`).join("")}
      </div>
    </div>
  `;
}

function strategicPlaceholderCards() {
  return [
    {
      title: "Key Findings",
      icon: "KF",
      severity: "high",
      points: ["Highest-risk hotspot summary will appear after AI generation."],
    },
    {
      title: "Main Causes",
      icon: "MC",
      severity: "medium",
      points: ["Likely contributing factors will be identified from trend and severity signals."],
    },
    {
      title: "Recommended Actions",
      icon: "RA",
      severity: "high",
      points: ["Ambulance positioning and responder allocation recommendations will appear here."],
    },
    {
      title: "Resource Plan",
      icon: "RP",
      severity: "medium",
      points: ["Patrol and route-cover planning will be generated here."],
    },
    {
      title: "Next 24 Hours Prediction",
      icon: "24",
      severity: "high",
      points: ["Projected night-risk pressure will be shown after AI generation."],
      emphasis: "prediction",
    },
  ];
}

function strategicContentFor(zone) {
  const scopedZones = analyticsZones()
    .slice()
    .sort(compareZonesByPriority);
  const highestZones = scopedZones.slice(0, 5);
  const leadZone = highestZones[0] || zone;
  const secondZone = highestZones[1] || leadZone;
  const mediumZones = highestZones.slice(2, 5).map((item) => item.title);
  const calmZones = analyticsZones()
    .filter((item) => item.level === "low")
    .sort((a, b) => a.incidentsCount - b.incidentsCount)
    .slice(0, 3)
    .map((item) => item.title);
  const calmLabel = calmZones.length ? calmZones.join(", ") : "routine lower-risk regions";
  return {
    summary: `${leadZone.title} and ${secondZone.title} show the strongest Level 4 accident concentration. Evening 5 PM - 9 PM remains the main response window, while medium-risk areas need monitoring rather than full emergency deployment.`,
    cards: [
      {
        title: "Key Findings",
        icon: "KF",
        severity: "high",
        points: [
          `${leadZone.title} and ${secondZone.title} show the strongest Level 4 accident concentration.`,
          "Evening 5 PM - 9 PM is the highest-risk period.",
          "Medium-risk areas require monitoring, not full emergency deployment.",
        ],
      },
      {
        title: "Main Causes",
        icon: "PC",
        severity: "medium",
        points: [
          "Evening commuter congestion.",
          "EV charging-route traffic buildup.",
          "Sudden lane changes near busy access roads.",
        ],
      },
      {
        title: "Recommended Actions",
        icon: "RS",
        severity: "high",
        points: [
          `Increase ambulance standby near ${leadZone.title} and ${secondZone.title}.`,
          "Add warning signage during evening peak hours.",
          "Send public advisory alerts before 5 PM.",
        ],
      },
      {
        title: "Resource Plan",
        icon: "RD",
        severity: "medium",
        points: [
          `Pre-position one ambulance near the ${leadZone.title}/${secondZone.title} corridor.`,
          `Keep a support route open toward ${secondZone.title}.`,
          "Use lighter patrol coverage for low-risk districts.",
        ],
      },
      {
        title: "Next 24 Hours Prediction",
        icon: "RP",
        severity: "high",
        points: [
          `${leadZone.title} may remain the highest-risk night cluster if evening congestion continues.`,
        ],
        emphasis: "prediction",
      },
    ],
    findings: [
      `${leadZone.title} and ${secondZone.title} show the strongest Level 4 accident concentration.`,
      "Evening 5 PM - 9 PM is the highest-risk period.",
      "Medium-risk areas require monitoring, not full emergency deployment.",
    ],
    causes: [
      "Evening commuter congestion.",
      "EV charging-route traffic buildup.",
      "Sudden lane changes near busy access roads.",
    ],
    actions: [
      `Increase ambulance standby near ${leadZone.title} and ${secondZone.title}.`,
      "Add warning signage during evening peak hours.",
      "Send public advisory alerts before 5 PM.",
    ],
    deploymentPlan: [
      `Pre-position one ambulance near the ${leadZone.title}/${secondZone.title} corridor.`,
      `Keep a support route open toward ${secondZone.title}.`,
      "Use lighter patrol coverage for low-risk districts.",
    ],
    prediction: `${leadZone.title} may remain the highest-risk night cluster if evening congestion continues.`,
  };
}

function strategicCardsMarkup(cards) {
  return cards
    .map(
      (card) => `
        <article class="strategic-recommendation ${card.severity}${card.emphasis ? ` ${card.emphasis}` : ""}">
          <div class="strategic-recommendation-top">
            <span class="strategic-recommendation-icon">${escapeHtml(card.icon)}</span>
            <span class="strategic-recommendation-badge ${escapeHtml(card.severity)}">${escapeHtml(severityWord(card.severity))}</span>
          </div>
          <strong>${escapeHtml(card.title)}</strong>
          ${
            Array.isArray(card.points)
              ? `<ul class="strategic-points">${card.points
                  .map((point) => `<li>${escapeHtml(point)}</li>`)
                  .join("")}</ul>`
              : `<p>${escapeHtml(card.text || "")}</p>`
          }
        </article>
      `,
    )
    .join("");
}

function strategicInsightProfile(zone) {
  const content = strategicContentFor(zone);
  const metrics = buildReportMetricProfile(activeTrendRegion === "all" ? "all" : activeZone, activeTrendRange, {
    summaryMode: true,
  });
  const configs = {
    summary: {
      summary:
        "Government-focused action suggestions based on hotspot, severity, peak-hour, and regional risk patterns.",
      executive:
        "Shah Alam and Klang remain the strongest Level 4 clusters during evening peak hours. A focused standby and public advisory plan can reduce response pressure in the next reporting cycle.",
      findings: content.findings,
      causes: content.causes,
      solutions: content.actions,
      resources: content.deploymentPlan,
      prediction: content.prediction,
    },
    risk: {
      summary:
        "Risk intelligence highlights the strongest pressure corridors, impact severity split, and likely escalation windows.",
      executive:
        "High-risk density remains concentrated around Shah Alam and Klang, while medium-risk districts need monitoring rather than full emergency deployment.",
      findings: [
        "High-alert districts continue clustering around the western Selangor commuter belt.",
        "Critical severity remains most visible during the evening 5 PM - 9 PM window.",
        "Low-risk districts remain suitable for lighter routine patrol coverage.",
      ],
      causes: content.causes,
      solutions: [
        "Prioritize high-visibility monitoring on red-band districts first.",
        "Keep amber-band corridors under rotating enforcement coverage.",
        "Issue targeted public alerts before evening congestion builds.",
      ],
      resources: content.deploymentPlan,
      prediction: content.prediction,
    },
    operations: {
      summary:
        "Operational planning focuses on ambulance standby, warnings, and route coverage for the next reporting cycle.",
      executive:
        "Operations should focus on evening response readiness, corridor visibility, and keeping approach roads open near the highest-risk districts.",
      findings: content.findings,
      causes: content.causes,
      solutions: [
        `Maintain visibility patrols during ${zone.window} peak-risk windows.`,
        "Coordinate warning signage and public advisories before the evening rush window.",
        "Stage field-note collection to verify corridor bottlenecks after peak periods.",
      ],
      resources: content.deploymentPlan,
      prediction: `${zone.title} will continue to demand operational attention if the evening load remains elevated.`,
    },
    resources: {
      summary:
        "Resource planning prioritizes ambulance standby, corridor access, and lighter patrol coverage for low-risk districts.",
      executive:
        "Ambulance assets should stay near Shah Alam and Klang, while low-risk districts retain lighter routine patrol coverage.",
      findings: content.findings,
      causes: content.causes,
      solutions: content.actions,
      resources: content.deploymentPlan,
      prediction: content.prediction,
    },
    future: {
      summary:
        "Future prediction uses severity share, peak-hour concentration, and hotspot stability to estimate the next 24 hours.",
      executive:
        "If evening congestion continues, Shah Alam may remain the highest-risk night cluster while medium-risk districts absorb spillover pressure.",
      findings: content.findings,
      causes: content.causes,
      solutions: content.actions,
      resources: content.deploymentPlan,
      prediction: `${content.prediction} Confidence remains highest when evening pressure and connector congestion continue together.`,
    },
    policy: {
      summary:
        "Policy suggestions focus on signage, public advisory reach, charging-route flow, and corridor-level prevention.",
      executive:
        "Government enhancements should prioritize warning signage, public advisories, and charging-route traffic flow before evening rush hour.",
      findings: content.findings,
      causes: content.causes,
      solutions: [
        "Increase standby coverage near Shah Alam and Klang corridors.",
        "Improve EV charging station traffic flow around busy districts.",
        "Coordinate public advisories and enforcement messaging before evening rush hour.",
      ],
      resources: content.deploymentPlan,
      prediction: content.prediction,
    },
  };
  const selected = configs[activeSuggestionTab] || configs.summary;
  return { ...content, ...selected, metrics };
}

function suggestionExecutiveCardMarkup(profile) {
  const { metrics } = profile;
  return `
    <div class="suggestion-card-head">
      <div class="suggestion-card-title">
        <span class="suggestion-card-icon">ES</span>
        <strong>Executive Summary</strong>
      </div>
    </div>
    <p class="suggestion-card-copy">${escapeHtml(profile.executive)}</p>
    <div class="suggestion-metrics">
      <div class="suggestion-metric-box">
        <span>Total Incidents</span>
        <strong>${metrics.totalIncidents}</strong>
        <small>${metrics.totalDelta}</small>
      </div>
      <div class="suggestion-metric-box">
        <span>High Severity (L4/L5)</span>
        <strong>${metrics.highSeverity}</strong>
        <small>${metrics.highMeta}</small>
      </div>
      <div class="suggestion-metric-box">
        <span>Critical Share</span>
        <strong>${metrics.criticalShare}%</strong>
        <small>${metrics.criticalDelta}</small>
      </div>
      <div class="suggestion-metric-box">
        <span>Peak Period</span>
        <strong>${escapeHtml(metrics.peakPeriod)}</strong>
        <small>${escapeHtml(metrics.peakLabel)}</small>
      </div>
      <div class="suggestion-metric-box">
        <span>Top Hotspot</span>
        <strong>${escapeHtml(metrics.topHotspot)}</strong>
        <small>${escapeHtml(metrics.topHotspotMeta)}</small>
      </div>
    </div>
  `;
}

function suggestionListCardMarkup(title, icon, items, severity = "medium") {
  return `
    <div class="suggestion-card-head">
      <div class="suggestion-card-title">
        <span class="suggestion-card-icon">${escapeHtml(icon)}</span>
        <strong>${escapeHtml(title)}</strong>
      </div>
    </div>
    <ul class="suggestion-card-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function suggestionPredictionCardMarkup(profile) {
  return `
    <div class="suggestion-card-head">
      <div class="suggestion-card-title">
        <span class="suggestion-card-icon">RP</span>
        <strong>Next 24 Hours Prediction</strong>
      </div>
    </div>
    <p class="suggestion-card-copy">${escapeHtml(profile.prediction)}</p>
    <div class="prediction-badge-row">
      <span>Risk Level</span>
      <span class="risk-level-badge">${escapeHtml(profile.metrics.riskLevel)}</span>
    </div>
    <div class="confidence-progress">
      <div class="confidence-progress-top">
        <span>Confidence</span>
        <strong>${profile.metrics.confidence}%</strong>
      </div>
      <div class="confidence-progress-bar">
        <div class="confidence-progress-fill" style="width:${profile.metrics.confidence}%"></div>
      </div>
    </div>
  `;
}

function renderStrategicInsights() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  const loadingLines = [
    "Analyzing 21 regional accident patterns...",
    "Detecting severe impact clusters...",
    "Generating strategic response suggestions...",
  ];

  if (els.strategicLoadingStream) {
    els.strategicLoadingStream.innerHTML = loadingLines
      .map(
        (line, index) =>
          `<div class="analysis-loading-item ${strategicInsightsLoading || strategicInsightsReady ? "active" : ""}" style="transition-delay:${index * 120}ms">${escapeHtml(line)}</div>`,
      )
      .join("");
  }

  const profile = strategicInsightProfile(zone);
  els.strategicSummary.textContent = strategicInsightsLoading
    ? "AI analysis is processing the latest regional hotspot signals for the government emergency dashboard."
    : profile.summary;

  if (els.reportExecutiveCard) {
    els.reportExecutiveCard.innerHTML = suggestionExecutiveCardMarkup(profile);
  }
  if (els.reportFindingsCard) {
    els.reportFindingsCard.innerHTML = suggestionListCardMarkup(
      "Key Findings",
      "KF",
      profile.findings,
      "high",
    );
  }
  if (els.reportCausesCard) {
    els.reportCausesCard.innerHTML = suggestionListCardMarkup(
      "Main Causes",
      "MC",
      profile.causes,
      "medium",
    );
  }
  if (els.reportSolutionsCard) {
    els.reportSolutionsCard.innerHTML = suggestionListCardMarkup(
      "Recommended Actions",
      "RA",
      profile.solutions,
      "high",
    );
  }
  if (els.reportResourcesCard) {
    els.reportResourcesCard.innerHTML = suggestionListCardMarkup(
      "Resource Plan",
      "RP",
      profile.resources,
      "medium",
    );
  }
  if (els.reportPredictionCard) {
    els.reportPredictionCard.innerHTML = suggestionPredictionCardMarkup(profile);
  }

  renderReportPreview({
    findings: profile.findings,
    causes: profile.causes,
    actions: profile.solutions,
    deploymentPlan: profile.resources,
    prediction: profile.prediction,
    metrics: profile.metrics,
  });

  if (els.generateStatus) {
    els.generateStatus.textContent = strategicInsightsLoading
      ? "Analyzing..."
      : `Updated ${formatTime(reportGeneratedAt || new Date())}`;
  }
}

function renderReportPreview(content) {
  if (els.reportPreviewTime) {
    els.reportPreviewTime.textContent = reportGeneratedAt
      ? formatDate(reportGeneratedAt)
      : "Awaiting generation";
  }
  if (els.reportDatasetScope) {
    const zoneCount = analyticsZones().length;
    els.reportDatasetScope.textContent = `${zoneCount} region${zoneCount === 1 ? "" : "s"}`;
  }
  if (els.reportDataPoints) {
    const totalCases = content.metrics?.totalIncidents
      || analyticsZones().reduce((sum, zone) => sum + zone.incidentsCount, 0);
    els.reportDataPoints.textContent = `${totalCases} incidents`;
  }
  if (els.reportPrediction) {
    els.reportPrediction.textContent = content.prediction;
  }
  if (els.reportKeyFindings) {
    els.reportKeyFindings.innerHTML = content.findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if (els.reportPotentialCauses) {
    els.reportPotentialCauses.innerHTML = content.causes.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if (els.reportRecommendedActions) {
    els.reportRecommendedActions.innerHTML = content.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if (els.reportDeploymentPlan) {
    els.reportDeploymentPlan.innerHTML = content.deploymentPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
}

function reportRangeMultiplier(range, regionKey = "all") {
  const all = regionKey === "all";
  const lookup = all
    ? { "7": 1.78, "30": 5.1, monthly: 7.4, custom: 2.2, yearly: 14.8 }
    : { "7": 1, "30": 3.2, monthly: 4.4, custom: 1.5, yearly: 8.6 };
  return lookup[range] || lookup["7"];
}

function zonesForReportRegion(regionKey) {
  if (regionKey !== "all" && reportZones[regionKey]) {
    return [reportZones[regionKey]];
  }
  return Object.values(reportZones);
}

function buildReportMetricProfile(regionKey = "all", range = "7", { summaryMode = false } = {}) {
  const zones = zonesForReportRegion(regionKey);
  const focusZone =
    (regionKey !== "all" && reportZones[regionKey]) ||
    zones.slice().sort(compareZonesByPriority)[0] ||
    reportZones["shah-alam"];
  const totalBase = zones.reduce((sum, zone) => sum + zone.incidentsCount, 0);
  const multiplier = reportRangeMultiplier(range, regionKey);
  const totalIncidents = Math.max(
    focusZone.incidentsCount,
    Math.round(totalBase * multiplier),
  );
  const highSeverity =
    regionKey === "all"
      ? Math.round(totalIncidents * 0.296)
      : Math.max(1, Math.round(totalIncidents * (focusZone.criticalPct / 100)));
  const criticalShare =
    regionKey === "all"
      ? 36.1
      : Number((focusZone.criticalPct).toFixed(1));
  const topHotspot = zones.slice().sort(compareZonesByPriority)[0] || focusZone;
  const confidence = regionKey === "all" ? 94 : clamp(88 + Math.round(focusZone.criticalPct / 8), 88, 97);
  const totalDelta = regionKey === "all" ? "+12.4% vs prev. 7 days" : "+20% vs prev. 7 days";
  const criticalDelta = regionKey === "all" ? "+4.3% vs prev. 7 days" : "+5% vs prev. 7 days";
  return {
    totalIncidents,
    highSeverity,
    criticalShare,
    peakPeriod:
      regionKey === "all"
        ? "Evening, 5 PM - 9 PM"
        : focusZone.window,
    peakLabel:
      regionKey === "all"
        ? "Peak statewide pressure"
        : focusZone.window.includes("PM")
        ? "Evening Peak"
        : "Daytime Peak",
    topHotspot: topHotspot.title,
    topHotspotMeta: `${topHotspot.incidentsCount} incidents`,
    riskLevel: riskLabel(focusZone.level).toUpperCase(),
    confidence,
    totalDelta,
    highMeta: regionKey === "all" ? "30% of total incidents" : `${focusZone.criticalPct}% of total`,
    criticalDelta,
    regionLabel: regionKey === "all" ? "All Selangor Regions" : `${focusZone.title}, Selangor`,
    focusZone,
    zones,
    summaryMode,
  };
}

function initializeSampleReportControls() {
  if (els.sampleReportRegionSelect && !els.sampleReportRegionSelect.dataset.initialized) {
    els.sampleReportRegionSelect.value = sampleReportState.region;
    els.sampleReportRegionSelect.dataset.initialized = "true";
  }
  if (els.sampleReportPageList && !els.sampleReportPageList.dataset.initialized) {
    els.sampleReportPageList.dataset.initialized = "true";
    els.sampleReportPageList.innerHTML = sampleReportPages
      .map(
        (title, index) => `
          <button class="sample-page-item" type="button" data-sample-page="${index + 1}">
            <span class="sample-page-number">${index + 1}</span>
            <span>${escapeHtml(title)}</span>
          </button>
        `,
      )
      .join("");
    els.sampleReportPageList.querySelectorAll("[data-sample-page]").forEach((button) => {
      button.addEventListener("click", () => {
        sampleReportState.page = Number(button.dataset.samplePage || 1);
        renderSampleReportPreview();
      });
    });
  }
  updateSampleDateDisplay();
  renderSampleReportPreview();
}

function updateSampleDateDisplay() {
  if (!els.sampleDateDisplay) {
    return;
  }
  els.sampleDateDisplay.textContent = sampleDateRangeLabel(sampleReportState.range);
}

function sampleDateRangeLabel(range) {
  const today = new Date(2026, 4, 10);
  let start = new Date(today);
  if (range === "30") {
    start.setDate(today.getDate() - 29);
  } else if (range === "monthly") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (range === "custom") {
    start.setDate(today.getDate() - 13);
  } else {
    start.setDate(today.getDate() - 6);
  }
  return `${formatShortDate(start)} - ${formatShortDate(today)}`;
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function selectedSampleOptions() {
  return Array.from(document.querySelectorAll(".sample-content-option:checked")).map(
    (input) => input.value,
  );
}

function generateSampleReportId() {
  const stamp = reportGeneratedAt || new Date();
  const year = stamp.getFullYear();
  const month = String(stamp.getMonth() + 1).padStart(2, "0");
  const day = String(stamp.getDate()).padStart(2, "0");
  return `EVR-${year}-${month}${day}-001`;
}

function generateSampleReport() {
  if (!els.generateSampleReportBtn) {
    return;
  }
  els.generateSampleReportBtn.classList.add("loading");
  els.generateSampleReportBtn.textContent = "Generating...";
  window.setTimeout(() => {
    sampleReportState.generatedAt = new Date();
    sampleReportState.reportId = generateSampleReportId();
    els.generateSampleReportBtn.classList.remove("loading");
    els.generateSampleReportBtn.textContent = "Generate Report";
    renderSampleReportPreview();
    showSampleToast("Report generated successfully.");
  }, 500);
}

function renderSampleReportPreview() {
  if (!els.sampleReportPage) {
    return;
  }
  const profile = buildReportMetricProfile(sampleReportState.region, sampleReportState.range);
  const pageTitle = sampleReportPages[sampleReportState.page - 1] || sampleReportPages[0];
  const options = selectedSampleOptions();
  const sectionMarkup = buildSampleReportSections(profile, options, sampleReportState.page);

  els.sampleReportPage.className = `sample-report-page sample-report-scale-${sampleReportState.zoom}`;
  els.sampleReportPage.innerHTML = `
    <div class="sample-report-top">
      <div class="sample-report-brand">
        <img src="icon.png" alt="EVSmart+ logo" />
        <div>
          <strong>EVSmart+</strong>
          <span>EV Emergency Analytics</span>
        </div>
      </div>
      <div class="sample-report-title">
        <h4>EV Accident Report</h4>
        <p>Detailed Regional Analysis &amp; Strategic Recommendations</p>
        <span class="sample-report-badge">CONFIDENTIAL - GOVERNMENT USE</span>
      </div>
      <div class="sample-report-meta">
        <div>Report ID: <strong>${escapeHtml(sampleReportState.reportId)}</strong></div>
        <div>Generated: <strong>${escapeHtml(formatDate(sampleReportState.generatedAt || new Date()))}</strong></div>
        <div>Data Range: <strong>${escapeHtml(sampleDateRangeLabel(sampleReportState.range))}</strong></div>
        <div>Selected Region: <strong>${escapeHtml(profile.regionLabel)}</strong></div>
      </div>
    </div>

    <div class="sample-report-summary">
      <div>
        <span class="sample-section-tag">${escapeHtml(pageTitle)}</span>
        <p>This report provides a comprehensive analysis of EV accidents in the selected region for the selected period. The analysis includes incident statistics, impact levels, temporal patterns, risk forecasting, and AI-powered strategic recommendations.</p>
      </div>
      <div class="sample-report-metrics">
        <div class="sample-report-metric"><span>Total Incidents</span><strong>${profile.totalIncidents}</strong><small>${profile.totalDelta}</small></div>
        <div class="sample-report-metric"><span>High Severity (L4/L5)</span><strong>${profile.highSeverity}</strong><small>${profile.highMeta}</small></div>
        <div class="sample-report-metric"><span>Critical Share</span><strong>${profile.criticalShare}%</strong><small>${profile.criticalDelta}</small></div>
        <div class="sample-report-metric"><span>Peak Period</span><strong>${escapeHtml(profile.peakPeriod)}</strong><small>${escapeHtml(profile.peakLabel)}</small></div>
        <div class="sample-report-metric"><span>Risk Level</span><strong>${escapeHtml(profile.riskLevel)}</strong><small>Confidence: ${profile.confidence}%</small></div>
        <div class="sample-report-metric"><span>Top Hotspot</span><strong>${escapeHtml(profile.topHotspot)}</strong><small>${escapeHtml(profile.topHotspotMeta)}</small></div>
      </div>
    </div>

    ${sectionMarkup}
  `;

  if (els.previewPageIndicator) {
    els.previewPageIndicator.textContent = `Pages: ${sampleReportState.page} / ${sampleReportPages.length}`;
  }
  if (els.previewZoomValue) {
    els.previewZoomValue.textContent = `${sampleReportState.zoom}%`;
  }
  if (els.sampleReportPageList) {
    els.sampleReportPageList.querySelectorAll("[data-sample-page]").forEach((item) => {
      item.classList.toggle("active", Number(item.dataset.samplePage) === sampleReportState.page);
    });
  }
}

function buildSampleReportSections(profile, options, page) {
  if (page === 1) {
    const sections = [];
    if (options.includes("overview")) {
      sections.push(sampleIncidentOverviewSection(profile));
    }
    if (options.includes("impact")) {
      sections.push(sampleImpactAnalysisSection(profile));
    }
    if (options.includes("predictions")) {
      sections.push(sampleFuturePredictionSection(profile));
    }
    if (options.includes("government")) {
      sections.push(sampleGovernmentSuggestionsSection(profile));
    }
    return sections.join("") || sampleGenericPageSection(profile, page);
  }

  if (page === 2 && options.includes("overview")) {
    return sampleIncidentOverviewSection(profile);
  }
  if (page === 3 && options.includes("impact")) {
    return sampleImpactAnalysisSection(profile);
  }
  if (page === 7 && options.includes("predictions")) {
    return sampleFuturePredictionSection(profile);
  }
  if (page === 9 && options.includes("government")) {
    return sampleGovernmentSuggestionsSection(profile);
  }

  return sampleGenericPageSection(profile, page);
}

function sampleIncidentOverviewSection(profile) {
  return `
    <section class="sample-report-section-card">
      <h5>1. Incident Overview</h5>
      <div class="sample-report-two-col">
        <div class="mini-chart-card">
          <svg class="mini-chart-svg" viewBox="0 0 420 220" aria-label="Incident trend chart">
            ${buildMiniTrendChart(profile)}
          </svg>
          <p class="mini-chart-footnote"><strong>Trend Analysis:</strong> Incidents show an increasing trend with peak concentration during evening hours. High-severity incidents are concentrated during the selected peak window.</p>
        </div>
        <div class="mini-chart-card">
          ${buildMiniDonut(profile)}
        </div>
      </div>
    </section>
  `;
}

function sampleImpactAnalysisSection(profile) {
  return `
    <section class="sample-report-section-card">
      <h5>2. Impact Level Analysis</h5>
      <div class="mini-table-card">
        ${buildImpactTable(profile)}
      </div>
    </section>
  `;
}

function sampleFuturePredictionSection(profile) {
  return `
    <section class="sample-report-section-card">
      <h5>3. Future Prediction</h5>
      <div class="future-prediction-grid">
        <div class="future-prediction-card">
          <span class="sample-section-tag">Next 24 Hours</span>
          <strong>${escapeHtml(strategicContentFor(profile.focusZone).prediction)}</strong>
        </div>
        <div class="future-prediction-card">
          <span class="sample-section-tag">Next 7 Days</span>
          <strong>Medium-to-high pressure will remain centered around ${escapeHtml(profile.focusZone.title)} and adjacent commuter corridors.</strong>
        </div>
        <div class="future-prediction-card">
          <span class="sample-section-tag">High-Risk Time Window</span>
          <strong>${escapeHtml(profile.focusZone.window)}</strong>
        </div>
        <div class="future-prediction-card">
          <span class="sample-section-tag">Preventive Action</span>
          <strong>Pre-position response assets and issue public advisories before evening peak demand.</strong>
        </div>
      </div>
    </section>
  `;
}

function sampleGovernmentSuggestionsSection(profile) {
  return `
    <section class="sample-report-section-card">
      <h5>4. Government Enhancement Suggestions</h5>
      <div class="government-suggestion-card">
        <ul>
          <li>Increase ambulance standby around high-risk corridors.</li>
          <li>Add temporary warning signage near accident-prone access roads.</li>
          <li>Improve EV charging station traffic flow around busy districts.</li>
          <li>Use public advisory alerts before evening peak hours.</li>
          <li>Coordinate hospital and ambulance readiness during Level 4/5 patterns.</li>
        </ul>
      </div>
    </section>
  `;
}

function sampleGenericPageSection(profile, page) {
  return `
    <section class="sample-report-section-card">
      <h5>${page}. ${escapeHtml(sampleReportPages[page - 1] || "Report Section")}</h5>
      <p class="sample-report-note">This preview page focuses on ${escapeHtml(sampleReportPages[page - 1] || "the selected report section")} for ${escapeHtml(profile.regionLabel)} using the selected content options and current regional hotspot data.</p>
    </section>
  `;
}

function buildMiniTrendChart(profile) {
  const spark = (profile.focusZone.spark || chartDays.map(() => 3)).map((value) =>
    Math.max(2, Math.round(value * 1.35)),
  );
  const highs = spark.map((value) => Math.max(1, Math.round(value * 0.7)));
  const width = 420;
  const height = 220;
  const padding = { top: 20, right: 24, bottom: 34, left: 24 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...spark, ...highs, 10);
  const step = chartWidth / spark.length;
  const linePath = highs
    .map((value, index) => {
      const x = padding.left + index * step + step / 2;
      const y = padding.top + chartHeight - (value / max) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return `
    <defs>
      <linearGradient id="sampleBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2e7d32" />
        <stop offset="100%" stop-color="#1f6b28" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#ffffff" />
    ${spark
      .map((value, index) => {
        const barHeight = (value / max) * chartHeight;
        const x = padding.left + index * step + 10;
        const y = padding.top + chartHeight - barHeight;
        return `<rect x="${x}" y="${y}" width="${Math.max(18, step - 20)}" height="${barHeight}" rx="10" fill="url(#sampleBarGradient)" />`;
      })
      .join("")}
    <path d="${linePath}" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    ${highs
      .map((value, index) => {
        const x = padding.left + index * step + step / 2;
        const y = padding.top + chartHeight - (value / max) * chartHeight;
        return `<circle cx="${x}" cy="${y}" r="4.5" fill="#ffffff" stroke="#ef4444" stroke-width="2.5" />`;
      })
      .join("")}
    ${chartDays
      .map((label, index) => `<text x="${padding.left + index * step + step / 2}" y="${height - 10}" text-anchor="middle" fill="#556373" font-size="12" font-weight="700">${label}</text>`)
      .join("")}
  `;
}

function buildMiniDonut(profile) {
  const distribution = severityBreakdown(profile.zones);
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  const values = [distribution[5], distribution[4], distribution[3], distribution[2], distribution[1]];
  const colors = ["#ef4444", "#fb923c", "#facc15", "#22c55e", "#0ea5e9"];
  let cursor = 0;
  const segments = values
    .map((value, index) => {
      const start = cursor;
      const slice = total ? (value / total) * 360 : 0;
      cursor += slice;
      return `${colors[index]} ${start}deg ${cursor}deg`;
    })
    .join(", ");
  return `
    <div class="mini-donut-wrap">
      <div class="severity-donut" style="margin:0 auto;background:conic-gradient(${segments});">
        <div class="severity-donut-center">
          <strong>${profile.focusZone.incidentsCount}</strong>
          <span>Total</span>
        </div>
      </div>
      <div class="severity-legend-list">
        ${[5, 4, 3, 2, 1]
          .map((level, index) => `<div class="severity-legend-item"><span><i style="background:${colors[index]}"></i>Level ${level}</span><strong>${values[index]}</strong></div>`)
          .join("")}
      </div>
    </div>
  `;
}

function buildImpactTable(profile) {
  const distribution = severityBreakdown(profile.zones);
  const rows = [
    ["Level 1", "Minor", distribution[1], "Routine monitoring"],
    ["Level 2", "Low", distribution[2], "Driver assistance follow-up"],
    ["Level 3", "Medium", distribution[3], "Field verification and watch-band response"],
    ["Level 4", "High", distribution[4], "Ambulance standby and corridor prioritization"],
    ["Level 5", "Critical", distribution[5], "Immediate multi-agency escalation"],
  ];
  const total = rows.reduce((sum, [, , count]) => sum + count, 0);
  return `
    <table class="impact-table">
      <thead>
        <tr>
          <th>Impact Level</th>
          <th>Category</th>
          <th>Count</th>
          <th>Percentage</th>
          <th>Suggested Response</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            ([level, label, count, response]) => `
              <tr>
                <td>${level}</td>
                <td>${label}</td>
                <td>${count}</td>
                <td>${total ? Math.round((count / total) * 100) : 0}%</td>
                <td>${escapeHtml(response)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function openAdvancedInsightsModal() {
  openCustomReportModal(
    "Advanced Insights",
    "Expanded explanation of the current advanced operational indicators and recommended government actions.",
    [
      {
        label: "Risk trend explanation",
        value:
          "Regional pressure is increasing by roughly 18% versus the previous 7-day cycle, driven by stronger evening activity in Shah Alam and Klang.",
        full: true,
      },
      {
        label: "Hotspot movement explanation",
        value:
          "Hotspot movement is stable, with no major district rotation. Core high-risk clustering remains centered on the western commuter belt.",
        full: true,
      },
      {
        label: "Response readiness explanation",
        value:
          "Average response readiness remains good at 12.4 minutes, but corridor congestion can still delay access during the 5 PM - 9 PM window.",
        full: true,
      },
      {
        label: "Suggested government action summary",
        value:
          "Maintain evening visibility patrols, pre-position one standby ambulance near Klang, and issue early public advisories before peak commuter buildup.",
        full: true,
      },
    ],
  );
}

async function downloadSampleReportPdf() {
  const printable = els.sampleReportPage;
  if (!printable) {
    return;
  }
  const html2canvasRef = window.html2canvas;
  const jsPdfCtor = window.jspdf?.jsPDF;
  if (!html2canvasRef || !jsPdfCtor) {
    openCustomReportModal(
      "PDF export unavailable",
      "The PDF export libraries are not available, so the report can be printed from your browser instead.",
      [{ label: "Next step", value: "Use Print Report or reload the page with the CDN scripts enabled." }],
    );
    return;
  }
  const canvas = await html2canvasRef(printable, {
    scale: 2,
    backgroundColor: "#ffffff",
  });
  const image = canvas.toDataURL("image/png");
  const pdf = new jsPdfCtor("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  pdf.addImage(image, "PNG", 0, 0, width, height);
  pdf.save(sampleReportFileName());
}

async function shareSampleReport() {
  const profile = buildReportMetricProfile(sampleReportState.region, sampleReportState.range);
  const summary = `EVSmart+ report summary for ${profile.regionLabel}: ${profile.totalIncidents} incidents, ${profile.highSeverity} high-severity cases, peak period ${profile.peakPeriod}.`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: "EVSmart+ Report Summary",
        text: summary,
      });
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
      showSampleToast("Report summary copied.");
      return;
    }
  } catch (_) {
    // Fallback below.
  }
  openCustomReportModal("Share Report", "Sharing support is unavailable in this browser.", [
    { label: "Report summary", value: summary, full: true },
  ]);
}

function printSampleReport() {
  if (!els.sampleReportPage) {
    return;
  }
  const popup = window.open("", "_blank", "width=980,height=900");
  if (!popup) {
    openCustomReportModal("Print blocked", "Allow popups to print the report preview from your browser.", [
      { label: "Next step", value: "Enable popups, then press Print Report again." },
    ]);
    return;
  }
  popup.document.write(`<!doctype html><html><head><title>EVSmart+ Report Preview</title><style>
    body{font-family:'Segoe UI',sans-serif;padding:24px;background:#f3f7f4}
    .page{max-width:860px;margin:0 auto;background:#fff;border:1px solid #dfe6e2;border-radius:16px;padding:26px 28px}
  </style></head><body><div class="page">${els.sampleReportPage.innerHTML}</div></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function showSampleToast(message) {
  let toast = document.querySelector(".sample-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "sample-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showSampleToast.timer);
  showSampleToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function sampleReportFileName() {
  const region =
    sampleReportState.region === "all"
      ? "All_Selangor_Regions"
      : String(reportZones[sampleReportState.region]?.title || sampleReportState.region).replaceAll(" ", "_");
  const range = String(sampleDateRangeLabel(sampleReportState.range)).replaceAll(" ", "_");
  return `EVSmart_Report_${region}_${range}.pdf`;
}

function buildStrategicReportText() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  const content = strategicContentFor(zone);
  return [
    "EVSmart+ AI Report & Suggestions",
    `Report Period: ${trendRangeLabel(activeTrendRange)}`,
    `Generated Time: ${formatDate(reportGeneratedAt || new Date())}`,
    `Dataset Scope: ${Object.keys(reportZones).length} regions`,
    "",
    "Key Findings",
    ...content.findings.map((item) => `- ${item}`),
    "",
    "Main Causes",
    ...content.causes.map((item) => `- ${item}`),
    "",
    "Recommended Actions",
    ...content.actions.map((item) => `- ${item}`),
    "",
    "Resource Plan",
    ...content.deploymentPlan.map((item) => `- ${item}`),
    "",
    `Next 24 Hours Prediction: ${content.prediction}`,
  ].join("\n");
}

function exportStrategicReportPdf() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  const content = strategicContentFor(zone);
  const popup = window.open("", "_blank", "width=1020,height=920");
  if (!popup) {
    openCustomReportModal(
      "Export blocked",
      "Allow popups to print the strategic report as PDF from your browser.",
      [{ label: "Next step", value: "Enable popups, then press Export PDF again." }],
    );
    return;
  }
  popup.document.write(`<!doctype html>
  <html><head><title>EVSmart+ AI Report & Suggestions</title><style>
  body{font-family:'Segoe UI',sans-serif;padding:32px;color:#17212b;background:#fff}
  h1,h2,h3,p{margin:0}.head{display:flex;justify-content:space-between;gap:24px;margin-bottom:24px}
  .brand{color:#166534;font-weight:900;letter-spacing:.04em;text-transform:uppercase;font-size:12px;margin-bottom:10px}
  .title{font-size:34px;margin-bottom:8px}.muted{color:#5b6b7c;line-height:1.55}.pill{display:inline-block;padding:8px 12px;border-radius:999px;background:#eff8f1;color:#166534;font-weight:800;font-size:12px}
  .meta,.grid{display:grid;gap:14px}.meta{grid-template-columns:repeat(3,minmax(0,1fr));margin:24px 0}.grid{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:18px}
  .card{border:1px solid #dfe7e1;border-radius:18px;padding:16px;background:#fff}.card span{display:block;color:#5b6b7c;font-size:12px;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em}.card strong{font-size:18px;line-height:1.45}
  ul{margin:10px 0 0 20px;padding:0;line-height:1.6}.section{margin-top:24px}
  </style></head><body>
  <div class="head"><div><div class="brand">EVSmart+ AI Report</div><h1 class="title">AI Report & Suggestions</h1><p class="muted">${escapeHtml(content.summary)}</p></div><div class="pill">${escapeHtml(trendRangeLabel(activeTrendRange))}</div></div>
  <div class="meta">
    <div class="card"><span>Focused Region</span><strong>${escapeHtml(zone.title)}</strong></div>
    <div class="card"><span>Generated Time</span><strong>${escapeHtml(formatDate(reportGeneratedAt || new Date()))}</strong></div>
    <div class="card"><span>Dataset Scope</span><strong>${Object.keys(reportZones).length} regions</strong></div>
  </div>
  <div class="grid">
    <div class="card"><span>Main Causes</span><ul>${content.causes.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    <div class="card"><span>Risk Prediction</span><strong>${escapeHtml(content.prediction)}</strong></div>
  </div>
  <div class="section card"><span>Key Findings</span><ul>${content.findings.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
  <div class="section card"><span>Recommended Actions</span><ul>${content.actions.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
  <div class="section card"><span>Resource Plan</span><ul>${content.deploymentPlan.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
  </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function generateStrategicBriefing() {
  const zone = reportZones[activeZone] || reportZones["shah-alam"];
  const content = strategicContentFor(zone);
  openCustomReportModal(
    "Executive briefing",
    "A concise government-style briefing generated from the lower strategic report section.",
    [
      { label: "Focused region", value: zone.title },
      { label: "Risk level", value: zone.riskText },
      { label: "Peak window", value: zone.window },
      { label: "Potential cause", value: likelyCauseForZone(zone), full: true },
      { label: "Risk prediction", value: content.prediction, full: true },
      { label: "Deployment plan", value: content.deploymentPlan.join(" | "), full: true },
    ],
  );
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

window.addEventListener(
  "touchstart",
  (event) => {
    if (window.scrollY <= 0 && event.touches.length === 1) {
      pullRefreshStartY = event.touches[0].clientY;
      pullRefreshActive = true;
    }
  },
  { passive: true },
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (!pullRefreshActive || event.touches.length !== 1 || window.scrollY > 0) {
      return;
    }
    const delta = event.touches[0].clientY - pullRefreshStartY;
    const now = Date.now();
    if (delta > 84 && now - lastPullRefreshAt > 1600) {
      lastPullRefreshAt = now;
      pullRefreshActive = false;
      if (activeRole === "report") {
        refreshReportData();
      } else {
        render();
      }
    }
  },
  { passive: true },
);

window.addEventListener("touchend", () => {
  pullRefreshActive = false;
});

window.setInterval(() => {
  if (activeRole === "hospital") {
    updateHospitalHeader();
  }
  if (activeRole === "insurance") {
    updateInsuranceHeader();
  }
  if (activeRole === "report") {
    renderReportUpdatedBadge();
  }
}, 1000);

syncRoleQuery();
render();
