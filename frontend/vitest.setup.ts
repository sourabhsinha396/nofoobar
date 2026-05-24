import "@testing-library/jest-dom/vitest";

// jsdom doesn't ship ResizeObserver; some libs (e.g. react-resizable-panels)
// instantiate it during mount and crash without a polyfill.
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);
