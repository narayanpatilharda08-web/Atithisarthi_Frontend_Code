"use strict";

(function staffRealtimeClient(root) {
  const state = {
    url: "",
    getToken: null,
    controller: null,
    reconnectTimer: null,
    attempt: 0,
    connected: false,
    stopped: true
  };

  function emit(name, detail = {}) {
    root.dispatchEvent(new CustomEvent(`staff:realtime-${name}`, { detail }));
  }

  function clearReconnectTimer() {
    if (state.reconnectTimer) {
      root.clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (state.stopped || state.reconnectTimer) return;
    const delay = Math.min(15000, 1000 * (2 ** Math.min(state.attempt, 4)));
    state.attempt += 1;
    state.reconnectTimer = root.setTimeout(() => {
      state.reconnectTimer = null;
      void open();
    }, delay);
  }

  function processEvent(block = "") {
    const lines = block.split(/\r?\n/);
    const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const rawData = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (eventName === "notification") emit("event", data);
      if (eventName === "ready") emit("ready", data);
    } catch {
      // A malformed live event is ignored; reconciliation remains authoritative.
    }
  }

  async function open() {
    if (state.stopped || state.controller) return;
    const token = typeof state.getToken === "function" ? state.getToken() : "";
    if (!state.url || !token) return;

    const controller = new AbortController();
    state.controller = controller;
    emit("state", { status: "connecting" });

    try {
      const response = await fetch(state.url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`
        },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new Error(`Live update connection failed (${response.status})`);
      }

      state.connected = true;
      state.attempt = 0;
      emit("state", { status: "connected" });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!state.stopped && !controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";
        blocks.forEach(processEvent);
      }
    } catch (error) {
      if (!controller.signal.aborted && !state.stopped) {
        emit("state", { status: "disconnected", error: error?.message || "Live updates disconnected" });
      }
    } finally {
      if (state.controller === controller) state.controller = null;
      if (state.connected) {
        state.connected = false;
        if (!state.stopped) emit("state", { status: "disconnected" });
      }
      if (!state.stopped) scheduleReconnect();
    }
  }

  function connect({ url = "", getToken } = {}) {
    const nextUrl = String(url || "").trim();
    if (!nextUrl || typeof getToken !== "function") return;
    if (!state.stopped && state.url === nextUrl && state.getToken === getToken) return;
    disconnect();
    state.url = nextUrl;
    state.getToken = getToken;
    state.stopped = false;
    void open();
  }

  function disconnect() {
    state.stopped = true;
    clearReconnectTimer();
    state.controller?.abort();
    state.controller = null;
    state.connected = false;
  }

  root.addEventListener("online", () => {
    if (!state.stopped && !state.controller) void open();
  });
  root.document.addEventListener("visibilitychange", () => {
    if (!root.document.hidden && !state.stopped && !state.controller) void open();
  });

  root.StaffRealtime = Object.freeze({ connect, disconnect, isConnected: () => state.connected });
})(window);