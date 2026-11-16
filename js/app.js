(() => {
  "use strict";

  const STORAGE_KEY = "sms-chat-prototype.messages.v1";
  const INITIAL_MESSAGES = [
    { id: "seed-1", text: "Hey! How are you?", time: "09:15", outgoing: false },
    { id: "seed-2", text: "I'm good, thanks! How about you?", time: "09:16", outgoing: true },
    { id: "seed-3", text: "Pretty good. Are we still meeting today?", time: "09:17", outgoing: false },
    { id: "seed-4", text: "Yes! Let's meet at 6 PM.", time: "09:18", outgoing: true },
    { id: "seed-5", text: "Perfect. See you there!", time: "09:19", outgoing: false },
    { id: "seed-6", text: "By the way, don't forget to bring the documents.", time: "09:25", outgoing: false },
    { id: "seed-7", text: "Of course, I have everything ready.", time: "09:26", outgoing: true },
    { id: "seed-8", text: "Great! 👍", time: "09:30", outgoing: false }
  ];

  const list = document.querySelector("#message-list");
  const emptyState = document.querySelector("#empty-state");
  const form = document.querySelector("#message-form");
  const input = document.querySelector("#message-input");
  const sendButton = document.querySelector("#send-button");
  const menuButton = document.querySelector("#menu-button");
  const optionsDialog = document.querySelector("#options-dialog");
  const closeMenuButton = document.querySelector("#close-menu");
  const resetButton = document.querySelector("#reset-button");
  let messages = loadMessages();

  function loadMessages() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MESSAGES));
        return INITIAL_MESSAGES.map((message) => ({ ...message }));
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new TypeError("Saved messages are invalid.");
      return parsed.filter((message) =>
        message && typeof message.text === "string" && typeof message.time === "string" && typeof message.outgoing === "boolean"
      ).map((message) => ({
        id: typeof message.id === "string" ? message.id : createId(),
        text: message.text,
        time: message.time,
        outgoing: message.outgoing,
        underlineDateTime: message.underlineDateTime === true
      }));
    } catch (error) {
      console.warn("Could not restore saved messages; using the starter conversation.", error);
      return INITIAL_MESSAGES.map((message) => ({ ...message }));
    }
  }

  function persistMessages() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn("Messages could not be saved in this browser.", error);
    }
  }

  function createId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function renderMessages() {
    const fragment = document.createDocumentFragment();
    for (const message of messages) {
      const row = document.createElement("article");
      row.className = `message-row ${message.outgoing ? "outgoing" : "incoming"}`;
      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      const text = document.createElement("p");
      text.className = "message-text";
      if (message.underlineDateTime) {
        const lines = message.text.split("\n");
        text.append(document.createTextNode(lines[0] ?? ""));
        if (lines.length > 1) {
          text.append(document.createTextNode("\n"));
          const dateTimeLine = lines[1];
          const label = "Data ";
          if (dateTimeLine.startsWith(label)) {
            text.append(document.createTextNode(label));
            const underlinedDateTime = document.createElement("u");
            underlinedDateTime.textContent = dateTimeLine.slice(label.length);
            text.append(underlinedDateTime);
          } else {
            const underlinedDateTime = document.createElement("u");
            underlinedDateTime.textContent = dateTimeLine;
            text.append(underlinedDateTime);
          }
        }
        if (lines.length > 2) text.append(document.createTextNode(`\n${lines.slice(2).join("\n")}`));
      } else {
        text.textContent = message.text;
      }
      const time = document.createElement("time");
      time.className = "message-time";
      time.textContent = message.time;
      row.append(bubble);
      bubble.append(text, time);
      fragment.append(row);
    }
    list.replaceChildren(fragment);
    emptyState.hidden = messages.length !== 0;
    list.setAttribute("aria-label", messages.length ? `${messages.length} messages` : "No messages");
  }

  function scrollToLatest(smooth = true) {
    requestAnimationFrame(() => {
      list.scrollTo({ top: list.scrollHeight, behavior: smooth ? "smooth" : "instant" });
    });
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
    sendButton.disabled = input.value.trim().length === 0;
  }

  function formatTime(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${date.getFullYear()}`;
  }

  function randomSevenDigitNumber() {
    if (!globalThis.crypto?.getRandomValues) {
      return String(Math.floor(1_000_000 + Math.random() * 9_000_000));
    }

    const range = 9_000_000;
    const limit = Math.floor(0x1_0000_0000 / range) * range;
    const sample = new Uint32Array(1);
    do {
      globalThis.crypto.getRandomValues(sample);
    } while (sample[0] >= limit);
    return String(1_000_000 + (sample[0] % range));
  }

  function createTicketReply(sentText, receivedAt) {
    const time = formatTime(receivedAt);
    const text = `Bilet electronic nr. 08${randomSevenDigitNumber()}\nData ${formatDate(receivedAt)} ora ${time}\nValabil 1 ora\nPret 7 MDL\nNumar de bord ${sentText}`;
    return { id: createId(), text, time, outgoing: false, underlineDateTime: true };
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const sentAt = new Date();
    const time = formatTime(sentAt);
    messages.push({ id: createId(), text, time, outgoing: true });
    messages.push(createTicketReply(text, sentAt));
    persistMessages();
    renderMessages();
    input.value = "";
    resizeInput();
    scrollToLatest();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
  });
  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  });

  menuButton.addEventListener("click", () => {
    optionsDialog.showModal();
    menuButton.setAttribute("aria-expanded", "true");
  });
  function closeMenu() {
    optionsDialog.close();
    menuButton.setAttribute("aria-expanded", "false");
  }
  closeMenuButton.addEventListener("click", closeMenu);
  optionsDialog.addEventListener("click", (event) => {
    if (event.target === optionsDialog) closeMenu();
  });
  optionsDialog.addEventListener("close", () => menuButton.setAttribute("aria-expanded", "false"));
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset this conversation and remove all saved messages?")) return;
    messages = [];
    persistMessages();
    renderMessages();
    closeMenu();
    scrollToLatest(false);
  });

  document.querySelectorAll(".back-button, .attach-button, .emoji-button").forEach((button) => {
    button.addEventListener("click", () => button.blur());
  });

  function syncVisualViewport() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    document.documentElement.style.setProperty("--viewport-height", `${viewport.height}px`);
    if (document.activeElement === input) scrollToLatest(false);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncVisualViewport);
    window.visualViewport.addEventListener("scroll", syncVisualViewport);
    syncVisualViewport();
  }
  window.addEventListener("resize", syncVisualViewport);

  renderMessages();
  resizeInput();
  scrollToLatest(false);

  if (window.isSecureContext && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" })
      .then((registration) => {
        console.info("Service worker registered.", registration.scope);
      })
      .catch((error) => {
        console.warn("Service worker registration failed.", error);
      });
  } else {
    console.info("Offline support requires HTTPS or localhost and service worker support.");
  }
})();
