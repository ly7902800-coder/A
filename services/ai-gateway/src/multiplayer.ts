export interface MultiplayerPlan {
  transport: "websocket" | "webrtc" | "engine-native";
  authority: "server" | "host" | "hybrid";
  stateSync: "snapshot" | "delta" | "rollback";
  services: string[];
}

export function planMultiplayer(kind: "web" | "mobile" | "game"): MultiplayerPlan {
  return {
    transport: kind === "web" ? "websocket" : "engine-native",
    authority: "server",
    stateSync: "delta",
    services: ["authentication", "matchmaking", "presence", "session-state", "telemetry"]
  };
}
