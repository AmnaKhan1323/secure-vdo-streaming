import type { VideoProvider } from "./types";
import type { ProviderSdk } from "./player-sdk";

export class PlayerSetupError extends Error {
  constructor(public readonly code: "timeout" | "load" | "aborted") {
    super(code === "timeout" ? "Player SDK loading timed out. Check your connection and retry." : code === "load" ? "The provider player could not load. Check your connection and retry." : "Player setup cancelled.");
  }
}

type Importer = (provider: VideoProvider) => Promise<ProviderSdk>;
const importSdk: Importer = (provider) => provider === "GUMLET"
  ? import("@gumlet/player.js").then((module) => ({ kind: "gumlet", module }))
  : import("player.js").then((module) => ({ kind: "bunny", module: module.default }));

export function loadProviderSdk(provider: VideoProvider, signal: AbortSignal, timeoutMs = 15_000, importer: Importer = importSdk): Promise<ProviderSdk> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (sdk?: ProviderSdk, error?: PlayerSetupError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(sdk!);
    };
    const abort = () => finish(undefined, new PlayerSetupError("aborted"));
    const timer = setTimeout(() => finish(undefined, new PlayerSetupError("timeout")), timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    Promise.resolve().then(() => importer(provider)).then((sdk) => finish(sdk), () => finish(undefined, new PlayerSetupError("load")));
  });
}