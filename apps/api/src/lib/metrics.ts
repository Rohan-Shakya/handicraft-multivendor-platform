/**
 * Prometheus-style metrics collection.
 *
 * We implement a tiny in-process registry rather than pulling in `prom-client`
 * so the API has zero heavy dependencies for metrics. The exposition format
 * matches Prometheus text format v0.0.4 — scrapers, Grafana Agent,
 * OpenTelemetry collector, etc. all ingest it out of the box.
 *
 * Metrics are cheap: every mutation is a single map write. Gauges are fetched
 * lazily when /metrics is scraped.
 */

export type Labels = Record<string, string | number>;

function labelKey(labels?: Labels): string {
  if (!labels) return "";
  const entries = Object.entries(labels).filter(([, v]) => v != null);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}="${escapeLabel(String(v))}"`).join(",");
}

function escapeLabel(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

// ── Counters ────────────────────────────────────────────────────────────────
// Monotonically increasing values — request counts, errors, jobs processed, etc.

const counters = new Map<
  string,
  { help: string; values: Map<string, number> }
>();

function registerCounter(name: string, help: string) {
  if (!counters.has(name)) counters.set(name, { help, values: new Map() });
}

export function incCounter(name: string, value = 1, labels?: Labels) {
  const entry = counters.get(name);
  if (!entry) return;
  const key = labelKey(labels);
  entry.values.set(key, (entry.values.get(key) ?? 0) + value);
}

// ── Gauges ──────────────────────────────────────────────────────────────────
// Point-in-time values (queue depth, connection count, uptime).

const gauges = new Map<string, { help: string; values: Map<string, number> }>();

function registerGauge(name: string, help: string) {
  if (!gauges.has(name)) gauges.set(name, { help, values: new Map() });
}

export function setGauge(name: string, value: number, labels?: Labels) {
  const entry = gauges.get(name);
  if (!entry) return;
  entry.values.set(labelKey(labels), value);
}

// ── Histograms ──────────────────────────────────────────────────────────────
// Latency distributions — request duration, downstream call time.

const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000];

const histograms = new Map<
  string,
  {
    help: string;
    buckets: number[];
    /**
     * Keyed by the label set; each entry tracks counts per bucket + sum + count.
     */
    values: Map<string, { buckets: Map<number, number>; sum: number; count: number }>;
  }
>();

function registerHistogram(name: string, help: string, buckets = DEFAULT_BUCKETS) {
  if (!histograms.has(name)) histograms.set(name, { help, buckets, values: new Map() });
}

export function observeHistogram(name: string, value: number, labels?: Labels) {
  const h = histograms.get(name);
  if (!h) return;
  const key = labelKey(labels);
  let slot = h.values.get(key);
  if (!slot) {
    slot = { buckets: new Map(h.buckets.map((b) => [b, 0])), sum: 0, count: 0 };
    h.values.set(key, slot);
  }
  slot.sum += value;
  slot.count += 1;
  for (const b of h.buckets) {
    if (value <= b) slot.buckets.set(b, (slot.buckets.get(b) ?? 0) + 1);
  }
}

// ── Registration (call once at boot) ────────────────────────────────────────

export function initMetrics() {
  // HTTP
  registerCounter(
    "http_requests_total",
    "Total number of HTTP requests processed, keyed by method, route, status."
  );
  registerHistogram(
    "http_request_duration_ms",
    "HTTP request latency in milliseconds, bucketed."
  );
  // Business
  registerCounter(
    "orders_created_total",
    "Orders successfully placed via /storefront/checkout."
  );
  registerCounter(
    "payments_captured_total",
    "Payments captured, keyed by provider."
  );
  registerCounter(
    "payments_failed_total",
    "Payment failures, keyed by provider + reason."
  );
  registerCounter(
    "rate_limit_hits_total",
    "Requests blocked by the rate limiter."
  );
  // Workers
  registerCounter(
    "worker_jobs_processed_total",
    "Background jobs completed, keyed by queue + status."
  );
  registerHistogram(
    "worker_job_duration_ms",
    "Background job processing time in milliseconds."
  );
  // Runtime
  registerGauge("process_uptime_seconds", "Node process uptime.");
  registerGauge(
    "process_resident_memory_bytes",
    "Resident set size (rough process memory)."
  );
  registerGauge(
    "process_heap_used_bytes",
    "Node heap size currently in use."
  );
  registerGauge("queue_depth", "Job queue waiting + active counts.");
}

// ── Prometheus exposition ───────────────────────────────────────────────────

function formatLabels(key: string): string {
  return key ? `{${key}}` : "";
}

export function collectMetrics(): string {
  // Refresh runtime gauges right before scrape so they're accurate.
  const mem = process.memoryUsage();
  setGauge("process_uptime_seconds", process.uptime());
  setGauge("process_resident_memory_bytes", mem.rss);
  setGauge("process_heap_used_bytes", mem.heapUsed);

  const lines: string[] = [];

  for (const [name, entry] of counters) {
    lines.push(`# HELP ${name} ${entry.help}`);
    lines.push(`# TYPE ${name} counter`);
    if (entry.values.size === 0) {
      lines.push(`${name} 0`);
    } else {
      for (const [key, value] of entry.values) {
        lines.push(`${name}${formatLabels(key)} ${value}`);
      }
    }
  }

  for (const [name, entry] of gauges) {
    lines.push(`# HELP ${name} ${entry.help}`);
    lines.push(`# TYPE ${name} gauge`);
    if (entry.values.size === 0) {
      lines.push(`${name} 0`);
    } else {
      for (const [key, value] of entry.values) {
        lines.push(`${name}${formatLabels(key)} ${value}`);
      }
    }
  }

  for (const [name, h] of histograms) {
    lines.push(`# HELP ${name} ${h.help}`);
    lines.push(`# TYPE ${name} histogram`);
    for (const [key, slot] of h.values) {
      const baseLabels = key ? `${key},` : "";
      for (const b of h.buckets) {
        lines.push(
          `${name}_bucket{${baseLabels}le="${b}"} ${slot.buckets.get(b) ?? 0}`
        );
      }
      lines.push(`${name}_bucket{${baseLabels}le="+Inf"} ${slot.count}`);
      lines.push(`${name}_sum${formatLabels(key)} ${slot.sum}`);
      lines.push(`${name}_count${formatLabels(key)} ${slot.count}`);
    }
  }

  return lines.join("\n") + "\n";
}
