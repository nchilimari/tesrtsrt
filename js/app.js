(() => {
  "use strict";

  const STORAGE_KEY = "sms-chat-prototype.messages.v1";
  const CONTACT_STORAGE_KEY = "sms-chat-prototype.contact-name.v1";
  const HISTORY_SEED_KEY = "sms-chat-prototype.history-seed.v1";
  const OUTGOING_HISTORY_SEED_KEY = "sms-chat-prototype.history-outgoing-seed.v1";

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  const TODAY_KEY = toDateKey(new Date());
  const YESTERDAY_KEY = toDateKey(dateDaysAgo(1));
  const DAY_BEFORE_YESTERDAY_KEY = toDateKey(dateDaysAgo(2));
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
  const contactForm = document.querySelector("#contact-form");
  const contactInput = document.querySelector("#contact-input");
  const contactHeading = document.querySelector("#contact-name");
  const conversation = document.querySelector(".conversation");

  function loadContactName() {
    try {
      return localStorage.getItem(CONTACT_STORAGE_KEY)?.trim() || "7001";
    } catch {
      return "7001";
    }
  }

  function updateContactName(value) {
    contactHeading.textContent = value;
    conversation.setAttribute("aria-label", `Conversation with ${value}`);
    document.title = `SMS Chat · ${value}`;
  }

  let contactName = loadContactName();
  contactInput.value = contactName;
  updateContactName(contactName);
  let messages = loadMessages();

  function loadMessages() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const starterMessages = INITIAL_MESSAGES.map((message) => ({ ...message, date: TODAY_KEY }));
      if (stored === null) {
        const seeded = [...createHistoricalMessages(), ...starterMessages];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        localStorage.setItem(HISTORY_SEED_KEY, "true");
        localStorage.setItem(OUTGOING_HISTORY_SEED_KEY, "true");
        return seeded;
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new TypeError("Saved messages are invalid.");
      let restored = parsed.filter((message) =>
        message && typeof message.text === "string" && typeof message.time === "string" && typeof message.outgoing === "boolean"
      ).map((message) => ({
        id: typeof message.id === "string" ? message.id : createId(),
        text: message.text,
        time: message.time,
        date: typeof message.date === "string" ? message.date : TODAY_KEY,
        outgoing: message.outgoing,
        underlineDateTime: message.underlineDateTime === true
      }));

      if (localStorage.getItem(HISTORY_SEED_KEY) !== "true") {
        restored = [...createHistoricalMessages(), ...restored];
        localStorage.setItem(HISTORY_SEED_KEY, "true");
        localStorage.setItem(OUTGOING_HISTORY_SEED_KEY, "true");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      } else if (localStorage.getItem(OUTGOING_HISTORY_SEED_KEY) !== "true") {
        restored = [...restored, ...createHistoricalOutgoingMessages()];
        restored.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || (a.outgoing === b.outgoing ? 0 : a.outgoing ? -1 : 1));
        localStorage.setItem(OUTGOING_HISTORY_SEED_KEY, "true");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      }
      return restored;
    } catch (error) {
      console.warn("Could not restore saved messages; using the starter conversation.", error);
      return [...createHistoricalMessages(), ...INITIAL_MESSAGES.map((message) => ({ ...message, date: TODAY_KEY }))];
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

  function dateLabel(date) {
    if (date === TODAY_KEY) return "Astăzi";
    if (date === YESTERDAY_KEY) return "Ieri";
    if (date === DAY_BEFORE_YESTERDAY_KEY) return "Alaltăieri";
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("ro-MD", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
  }

  function renderMessages() {
    const fragment = document.createDocumentFragment();
    let previousDate = null;
    for (const message of messages) {
      if (message.date !== previousDate) {
        const divider = document.createElement("div");
        divider.className = "date-divider";
        const label = document.createElement("span");
        label.textContent = dateLabel(message.date);
        divider.append(label);
        fragment.append(divider);
        previousDate = message.date;
      }

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
          const dateLabelText = "Data ";
          if (dateTimeLine.startsWith(dateLabelText)) {
            text.append(document.createTextNode(dateLabelText));
            const underlinedDateTime = document.createElement("u");
            underlinedDateTime.textContent = dateTimeLine.slice(dateLabelText.length);
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
    return { id: createId(), text, time, date: toDateKey(receivedAt), outgoing: false, underlineDateTime: true };
  }

  function historicalSamples() {
    return [
      { daysAgo: 2, time: "10:15", board: "0877" },
      { daysAgo: 2, time: "16:21", board: "0925" },
      { daysAgo: 1, time: "07:32", board: "0820" },
      { daysAgo: 1, time: "14:43", board: "0901" },
      { daysAgo: 1, time: "19:32", board: "0877" }
    ];
  }

  function createHistoricalOutgoingMessages() {
    return historicalSamples().map((sample) => {
      const date = dateDaysAgo(sample.daysAgo);
      const [hours, minutes] = sample.time.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      return {
        id: `history-user-${toDateKey(date)}-${sample.time}`,
        text: sample.board,
        time: sample.time,
        date: toDateKey(date),
        outgoing: true
      };
    });
  }

  function createHistoricalMessages() {
    return historicalSamples().flatMap((sample) => {
      const date = dateDaysAgo(sample.daysAgo);
      const [hours, minutes] = sample.time.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      return [
        {
          id: `history-user-${toDateKey(date)}-${sample.time}`,
          text: sample.board,
          time: sample.time,
          date: toDateKey(date),
          outgoing: true
        },
        createTicketReply(sample.board, date)
      ];
    });
  }
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const sentAt = new Date();
    const time = formatTime(sentAt);
    messages.push({ id: createId(), text, time, date: toDateKey(sentAt), outgoing: true });
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
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = contactInput.value.trim();
    if (!value) {
      contactInput.setCustomValidity("Enter a contact name or number.");
      contactInput.reportValidity();
      return;
    }
    contactInput.setCustomValidity("");
    contactName = value;
    updateContactName(contactName);
    try {
      localStorage.setItem(CONTACT_STORAGE_KEY, contactName);
    } catch (error) {
      console.warn("Contact name could not be saved in this browser.", error);
    }
    closeMenu();
  });
  contactInput.addEventListener("input", () => contactInput.setCustomValidity(""));
  closeMenuButton.addEventListener("click", closeMenu);
  optionsDialog.addEventListener("click", (event) => {
    if (event.target === optionsDialog) closeMenu();
  });
  optionsDialog.addEventListener("close", () => menuButton.setAttribute("aria-expanded", "false"));
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset this conversation to the five default ticket exchanges?")) return;
    messages = createHistoricalMessages();
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
