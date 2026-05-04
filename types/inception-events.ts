export {};

declare global {
  interface WindowEventMap {
    "inception:toast": CustomEvent<{ message: string; variant?: "error" | "info" }>;
    "inception:claim-row": CustomEvent<{ address: string }>;
    "inception:show-connected-state": Event;
  }
}
