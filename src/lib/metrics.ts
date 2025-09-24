// Lightweight in-process metrics counters. In production you might
// export these periodically or bridge to Prometheus / OpenTelemetry.

export interface Counter {
  inc(by?: number): void;
  value(): number;
}

class SimpleCounter implements Counter {
  private _v = 0;
  constructor(private readonly name: string) {}
  inc(by = 1) {
    this._v += by;
  }
  value() {
    return this._v;
  }
  toJSON() {
    return { name: this.name, value: this._v };
  }
}

const registry = new Map<string, SimpleCounter>();

export function counter(name: string): Counter {
  let c = registry.get(name);
  if (!c) {
    c = new SimpleCounter(name);
    registry.set(name, c);
  }
  return c;
}

export function snapshotMetrics() {
  return Array.from(registry.values()).map((c) => c.toJSON());
}

export function resetMetrics() {
  registry.clear();
}
