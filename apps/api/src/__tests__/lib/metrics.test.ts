import { beforeAll, describe, expect, it } from "vitest";
import {
  collectMetrics,
  incCounter,
  initMetrics,
  observeHistogram,
  setGauge,
} from "../../lib/metrics.js";

describe("metrics registry", () => {
  beforeAll(() => {
    initMetrics();
  });

  it("records counter increments per label set", () => {
    incCounter("http_requests_total", 1, { method: "GET", route: "/t", status: "200" });
    incCounter("http_requests_total", 2, { method: "GET", route: "/t", status: "200" });
    incCounter("http_requests_total", 1, { method: "POST", route: "/t", status: "201" });
    const out = collectMetrics();
    expect(out).toContain(
      'http_requests_total{method="GET",route="/t",status="200"} 3'
    );
    expect(out).toContain(
      'http_requests_total{method="POST",route="/t",status="201"} 1'
    );
  });

  it("emits histogram buckets in Prometheus format", () => {
    observeHistogram("http_request_duration_ms", 42, { route: "/h" });
    observeHistogram("http_request_duration_ms", 250, { route: "/h" });
    const out = collectMetrics();
    expect(out).toContain('http_request_duration_ms_bucket{route="/h",le="50"} 1');
    expect(out).toContain('http_request_duration_ms_bucket{route="/h",le="250"} 2');
    expect(out).toContain('http_request_duration_ms_bucket{route="/h",le="+Inf"} 2');
    expect(out).toContain('http_request_duration_ms_count{route="/h"} 2');
  });

  it("refreshes runtime gauges on collect", () => {
    setGauge("process_uptime_seconds", 0); // will be overwritten by collect
    const out = collectMetrics();
    // process uptime is always positive at test time
    const match = out.match(/^process_uptime_seconds (\d+(\.\d+)?)/m);
    expect(match).not.toBeNull();
    expect(parseFloat(match![1]!)).toBeGreaterThan(0);
  });

  it("labels don't collide when keys are added in different orders", () => {
    incCounter("http_requests_total", 1, { a: "x", b: "y" });
    incCounter("http_requests_total", 1, { b: "y", a: "x" });
    const out = collectMetrics();
    // Both increments should merge into one series because labels sort alphabetically.
    const line = out
      .split("\n")
      .find((l) => l.startsWith('http_requests_total{a="x",b="y"}'));
    expect(line).toBeDefined();
    expect(line?.endsWith(" 2")).toBe(true);
  });
});
