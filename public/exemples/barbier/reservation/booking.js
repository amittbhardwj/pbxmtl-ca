/**
 * PBX MTL — Barbier booking + Stripe demo
 * Default: DEMO MODE (no real charges).
 * Set window.PBX_STRIPE_PUBLISHABLE_KEY = "pk_test_..." before this script for Payment Element UI.
 */
(function () {
  "use strict";

  const LANG = document.documentElement.lang === "en" ? "en" : "fr";

  const I18N = {
    fr: {
      steps: ["Service", "Barbier", "Date", "Heure", "Coordonnées", "Paiement", "Confirmé"],
      servicesTitle: "Choisissez un service",
      barberTitle: "Choisissez votre barbier",
      dateTitle: "Choisissez une date",
      timeTitle: "Choisissez une heure",
      customerTitle: "Vos coordonnées",
      paymentTitle: "Payer l'acompte",
      confirmTitle: "Réservation confirmée",
      next: "Continuer",
      back: "Retour",
      payDeposit: "Payer l'acompte",
      payDemo: "Simuler le paiement (démo)",
      payDemoStripe: "Confirmer en mode démo (sans backend)",
      name: "Nom complet",
      email: "Courriel",
      phone: "Téléphone",
      namePh: "Alex Tremblay",
      emailPh: "alex@exemple.ca",
      phonePh: "(514) 555-0100",
      summary: "Résumé",
      service: "Service",
      barber: "Barbier",
      slot: "Créneau",
      deposit: "Acompte",
      total: "Prix total",
      duration: "Durée",
      remaining: "Solde à payer en boutique",
      ref: "Référence",
      paymentId: "ID paiement",
      modeDemo: "Mode démo",
      modeStripe: "Stripe (test)",
      demoNote:
        "Aucun vrai paiement. Cliquez pour simuler un succès Stripe (pi_demo_*).",
      stripeNote:
        "Payment Element chargé. Sans endpoint create-payment-intent, utilisez le bouton démo ci-dessous. Voir README.",
      confirmMsg: "Merci ! Votre acompte est enregistré (simulation).",
      confirmMsgStripe: "Merci ! Paiement traité en mode démo.",
      errName: "Veuillez entrer votre nom.",
      errEmail: "Courriel invalide.",
      errPhone: "Téléphone invalide.",
      taken: "Complet",
      min: "min",
      showSummary: "Voir le résumé",
      hideSummary: "Masquer",
      newBooking: "Nouvelle réservation",
      backSalon: "Retour au salon",
      homePbx: "pbxmtl.ca",
      days: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
      months: [
        "janv.", "févr.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc.",
      ],
    },
    en: {
      steps: ["Service", "Barber", "Date", "Time", "Details", "Payment", "Confirmed"],
      servicesTitle: "Choose a service",
      barberTitle: "Choose your barber",
      dateTitle: "Choose a date",
      timeTitle: "Choose a time",
      customerTitle: "Your details",
      paymentTitle: "Pay the deposit",
      confirmTitle: "Booking confirmed",
      next: "Continue",
      back: "Back",
      payDeposit: "Pay deposit",
      payDemo: "Simulate payment (demo)",
      payDemoStripe: "Confirm in demo mode (no backend)",
      name: "Full name",
      email: "Email",
      phone: "Phone",
      namePh: "Alex Tremblay",
      emailPh: "alex@example.ca",
      phonePh: "(514) 555-0100",
      summary: "Summary",
      service: "Service",
      barber: "Barber",
      slot: "Slot",
      deposit: "Deposit",
      total: "Total price",
      duration: "Duration",
      remaining: "Balance due in shop",
      ref: "Reference",
      paymentId: "Payment ID",
      modeDemo: "Demo mode",
      modeStripe: "Stripe (test)",
      demoNote:
        "No real charge. Click to simulate a Stripe success (pi_demo_*).",
      stripeNote:
        "Payment Element loaded. Without a create-payment-intent endpoint, use the demo button below. See README.",
      confirmMsg: "Thank you! Your deposit is recorded (simulation).",
      confirmMsgStripe: "Thank you! Payment processed in demo mode.",
      errName: "Please enter your name.",
      errEmail: "Invalid email.",
      errPhone: "Invalid phone.",
      taken: "Taken",
      min: "min",
      showSummary: "Show summary",
      hideSummary: "Hide",
      newBooking: "New booking",
      backSalon: "Back to salon",
      homePbx: "pbxmtl.ca",
      days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ],
    },
  };

  const t = I18N[LANG];

  const SERVICES = [
    {
      id: "coupe",
      name: LANG === "en" ? "Haircut" : "Coupe",
      price: 35,
      deposit: 10,
      duration: 30,
      icon: "✂",
    },
    {
      id: "barbe",
      name: LANG === "en" ? "Beard" : "Barbe",
      price: 25,
      deposit: 10,
      duration: 20,
      icon: "🧔",
    },
    {
      id: "combo",
      name: LANG === "en" ? "Haircut + beard" : "Coupe + barbe",
      price: 55,
      deposit: 15,
      duration: 45,
      icon: "✂🧔",
    },
  ];

  const BARBERS = [
    { id: "alex", name: "Alex", bio: LANG === "en" ? "Classic cuts" : "Coupes classiques" },
    { id: "sam", name: "Sam", bio: LANG === "en" ? "Fades & texture" : "Dégradés & texture" },
    { id: "jordan", name: "Jordan", bio: LANG === "en" ? "Beard specialist" : "Spécialiste barbe" },
  ];

  /** Deterministic pseudo-taken slots so demos feel realistic */
  function isSlotTaken(barberId, dateStr, time) {
    const key = barberId + dateStr + time;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return Math.abs(h) % 7 === 0 || Math.abs(h) % 11 === 0;
  }

  function formatMoney(n) {
    return new Intl.NumberFormat(LANG === "en" ? "en-CA" : "fr-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
    }).format(n);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toDateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** Next 7 calendar days that fall on Tue–Sat */
  function getAvailableDates() {
    const out = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    let guard = 0;
    while (out.length < 7 && guard < 21) {
      const day = d.getDay(); // 0 Sun … 6 Sat
      if (day >= 2 && day <= 6) {
        out.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
      guard++;
    }
    return out;
  }

  function getTimeSlots() {
    const slots = [];
    for (let h = 10; h < 18; h++) {
      slots.push(pad(h) + ":00");
      slots.push(pad(h) + ":30");
    }
    return slots;
  }

  function bookingRef() {
    const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = "PBX-";
    for (let i = 0; i < 8; i++) r += s[Math.floor(Math.random() * s.length)];
    return r;
  }

  function demoPaymentId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "pi_demo_";
    for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // ── State ──
  const state = {
    step: 0, // 0 service … 5 payment, 6 confirm
    service: null,
    barber: null,
    date: null,
    time: null,
    customer: { name: "", email: "", phone: "" },
    paymentId: null,
    ref: null,
  };

  const stripeKey =
    typeof window.PBX_STRIPE_PUBLISHABLE_KEY === "string" &&
    window.PBX_STRIPE_PUBLISHABLE_KEY.indexOf("pk_test_") === 0
      ? window.PBX_STRIPE_PUBLISHABLE_KEY
      : null;

  let stripe = null;
  let elements = null;

  // ── DOM helpers ──
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c != null) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ── Render progress ──
  function renderProgress() {
    const ul = $("#progress");
    if (!ul) return;
    ul.innerHTML = "";
    t.steps.forEach(function (label, i) {
      const li = el("li", {
        className:
          i === state.step ? "active" : i < state.step ? "done" : "",
        "aria-current": i === state.step ? "step" : null,
      });
      li.appendChild(el("span", { className: "dot", text: String(i + 1) }));
      li.appendChild(el("span", { className: "label", text: label }));
      ul.appendChild(li);
    });
  }

  // ── Summary ──
  function updateSummary() {
    const svc = state.service;
    const set = function (id, val) {
      const n = $("#sum-" + id);
      if (n) n.textContent = val || "—";
    };
    set("service", svc ? svc.name : null);
    set("barber", state.barber ? state.barber.name : null);
    let slot = "—";
    if (state.date && state.time) {
      const d = state.date;
      slot =
        t.days[d.getDay()] +
        " " +
        d.getDate() +
        " " +
        t.months[d.getMonth()] +
        ", " +
        state.time;
    }
    set("slot", state.date && state.time ? slot : null);
    set("total", svc ? formatMoney(svc.price) : null);
    set("deposit", svc ? formatMoney(svc.deposit) : null);

    const depEl = $("#sum-deposit-big");
    if (depEl) depEl.textContent = svc ? formatMoney(svc.deposit) : "—";

    const toggleVal = $("#summary-toggle-value");
    if (toggleVal) {
      toggleVal.textContent = svc
        ? (svc.name + " · " + formatMoney(svc.deposit))
        : t.summary;
    }
  }

  // ── Panels ──
  function showStep(n) {
    state.step = n;
    $$(".panel-step").forEach(function (p) {
      const sn = parseInt(p.getAttribute("data-step"), 10);
      p.hidden = sn !== n;
    });
    renderProgress();
    updateSummary();
    const main = $("#booking-main");
    if (main) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderServices() {
    const box = $("#options-service");
    if (!box) return;
    box.innerHTML = "";
    SERVICES.forEach(function (s) {
      const card = el(
        "button",
        {
          type: "button",
          className: "option-card" + (state.service && state.service.id === s.id ? " selected" : ""),
          "aria-pressed": state.service && state.service.id === s.id ? "true" : "false",
          onClick: function () {
            state.service = s;
            renderServices();
            updateSummary();
            $("#btn-next-service").disabled = false;
          },
        },
        [
          el("span", { className: "opt-icon", "aria-hidden": "true", text: s.icon }),
          el("span", { className: "opt-body" }, [
            el("span", { className: "opt-title", text: s.name }),
            el("span", {
              className: "opt-meta",
              text: s.duration + " " + t.min + " · " + t.deposit + " " + formatMoney(s.deposit),
            }),
          ]),
          el("span", { className: "opt-price", text: formatMoney(s.price) }),
        ]
      );
      box.appendChild(card);
    });
  }

  function renderBarbers() {
    const box = $("#options-barber");
    if (!box) return;
    box.innerHTML = "";
    BARBERS.forEach(function (b) {
      const card = el(
        "button",
        {
          type: "button",
          className: "option-card" + (state.barber && state.barber.id === b.id ? " selected" : ""),
          "aria-pressed": state.barber && state.barber.id === b.id ? "true" : "false",
          onClick: function () {
            state.barber = b;
            state.date = null;
            state.time = null;
            renderBarbers();
            updateSummary();
            $("#btn-next-barber").disabled = false;
          },
        },
        [
          el("span", { className: "opt-icon", "aria-hidden": "true", text: "✂" }),
          el("span", { className: "opt-body" }, [
            el("span", { className: "opt-title", text: b.name }),
            el("span", { className: "opt-meta", text: b.bio }),
          ]),
        ]
      );
      box.appendChild(card);
    });
  }

  function renderDates() {
    const box = $("#options-date");
    if (!box) return;
    box.innerHTML = "";
    getAvailableDates().forEach(function (d) {
      const ds = toDateStr(d);
      const selected = state.date && toDateStr(state.date) === ds;
      const chip = el(
        "button",
        {
          type: "button",
          className: "chip" + (selected ? " selected" : ""),
          "aria-pressed": selected ? "true" : "false",
          onClick: function () {
            state.date = d;
            state.time = null;
            renderDates();
            updateSummary();
            $("#btn-next-date").disabled = false;
          },
        },
        [
          el("span", { className: "chip-day", text: t.days[d.getDay()] }),
          el("span", {
            className: "chip-date",
            text: d.getDate() + " " + t.months[d.getMonth()],
          }),
        ]
      );
      box.appendChild(chip);
    });
  }

  function renderTimes() {
    const box = $("#options-time");
    if (!box) return;
    box.innerHTML = "";
    if (!state.date || !state.barber) return;
    const ds = toDateStr(state.date);
    getTimeSlots().forEach(function (time) {
      const taken = isSlotTaken(state.barber.id, ds, time);
      const selected = state.time === time;
      const chip = el(
        "button",
        {
          type: "button",
          className: "chip" + (selected ? " selected" : "") + (taken ? " taken" : ""),
          disabled: taken ? "disabled" : null,
          "aria-pressed": selected ? "true" : "false",
          "aria-label": taken ? time + " — " + t.taken : time,
          onClick: function () {
            if (taken) return;
            state.time = time;
            renderTimes();
            updateSummary();
            $("#btn-next-time").disabled = false;
          },
        },
        [taken ? time + " · " + t.taken : time]
      );
      box.appendChild(chip);
    });
  }

  function validateCustomer() {
    const name = ($("#cust-name") || {}).value || "";
    const email = ($("#cust-email") || {}).value || "";
    const phone = ($("#cust-phone") || {}).value || "";
    const err = $("#customer-error");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneOk = phone.replace(/\D/g, "").length >= 10;
    if (!name.trim()) {
      if (err) err.textContent = t.errName;
      return false;
    }
    if (!emailOk) {
      if (err) err.textContent = t.errEmail;
      return false;
    }
    if (!phoneOk) {
      if (err) err.textContent = t.errPhone;
      return false;
    }
    if (err) err.textContent = "";
    state.customer = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    return true;
  }

  function setupPaymentPanel() {
    const badge = $("#payment-mode-badge");
    const note = $("#payment-note");
    const payBtn = $("#btn-pay");
    const stripeMount = $("#payment-element");

    if (stripeKey && window.Stripe) {
      if (badge) badge.textContent = t.modeStripe;
      if (note) note.textContent = t.stripeNote;
      if (payBtn) payBtn.textContent = t.payDemoStripe;

      if (!stripe) {
        stripe = window.Stripe(stripeKey);
        // No clientSecret without backend — mount a placeholder look via Elements appearance only.
        // We intentionally do NOT call elements.create('payment') without a clientSecret.
        if (stripeMount) {
          stripeMount.innerHTML =
            '<p style="padding:1rem;color:var(--cream-muted);font-size:0.9rem;">' +
            (LANG === "en"
              ? "Stripe.js loaded (pk_test). Payment Element needs a PaymentIntent client_secret from your server. Use the demo confirm button, or add the serverless snippet from README."
              : "Stripe.js chargé (pk_test). Payment Element nécessite un client_secret PaymentIntent côté serveur. Utilisez le bouton démo, ou ajoutez le snippet serverless du README.") +
            "</p>";
        }
      }
    } else {
      if (badge) badge.textContent = t.modeDemo;
      if (note) note.textContent = t.demoNote;
      if (payBtn) payBtn.textContent = t.payDemo;
      if (stripeMount) stripeMount.innerHTML = "";
    }
  }

  function completeBooking() {
    state.paymentId = demoPaymentId();
    state.ref = bookingRef();
    state.step = 6;

    $$(".panel-step").forEach(function (p) {
      p.hidden = true;
    });
    const conf = $("#panel-confirm");
    if (conf) conf.hidden = false;

    renderProgress();
    updateSummary();

    const set = function (id, val) {
      const n = $("#conf-" + id);
      if (n) n.textContent = val;
    };
    set("msg", stripeKey ? t.confirmMsgStripe : t.confirmMsg);
    set("ref", state.ref);
    set("payment", state.paymentId);
    set("service", state.service.name);
    set("barber", state.barber.name);
    const d = state.date;
    set(
      "slot",
      t.days[d.getDay()] +
        " " +
        d.getDate() +
        " " +
        t.months[d.getMonth()] +
        ", " +
        state.time
    );
    set("deposit", formatMoney(state.service.deposit));
    set("total", formatMoney(state.service.price));
    set("name", state.customer.name);
    set("email", state.customer.email);

    // Hide sticky summary on confirm
    const sum = $("#summary");
    if (sum) sum.hidden = true;
  }

  function loadStripeJs(cb) {
    if (window.Stripe) {
      cb();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function bindNav() {
    $("#btn-next-service") &&
      $("#btn-next-service").addEventListener("click", function () {
        if (!state.service) return;
        renderBarbers();
        showStep(1);
      });

    $("#btn-back-barber") &&
      $("#btn-back-barber").addEventListener("click", function () {
        showStep(0);
      });
    $("#btn-next-barber") &&
      $("#btn-next-barber").addEventListener("click", function () {
        if (!state.barber) return;
        renderDates();
        showStep(2);
      });

    $("#btn-back-date") &&
      $("#btn-back-date").addEventListener("click", function () {
        showStep(1);
      });
    $("#btn-next-date") &&
      $("#btn-next-date").addEventListener("click", function () {
        if (!state.date) return;
        renderTimes();
        showStep(3);
        $("#btn-next-time").disabled = !state.time;
      });

    $("#btn-back-time") &&
      $("#btn-back-time").addEventListener("click", function () {
        showStep(2);
      });
    $("#btn-next-time") &&
      $("#btn-next-time").addEventListener("click", function () {
        if (!state.time) return;
        showStep(4);
      });

    $("#btn-back-customer") &&
      $("#btn-back-customer").addEventListener("click", function () {
        showStep(3);
      });
    $("#btn-next-customer") &&
      $("#btn-next-customer").addEventListener("click", function () {
        if (!validateCustomer()) return;
        if (stripeKey) {
          loadStripeJs(function () {
            setupPaymentPanel();
            showStep(5);
          });
        } else {
          setupPaymentPanel();
          showStep(5);
        }
      });

    $("#btn-back-payment") &&
      $("#btn-back-payment").addEventListener("click", function () {
        showStep(4);
      });
    $("#btn-pay") &&
      $("#btn-pay").addEventListener("click", function () {
        const btn = $("#btn-pay");
        if (btn) {
          btn.disabled = true;
          btn.textContent = "…";
        }
        // Simulate network delay for realism
        setTimeout(function () {
          completeBooking();
        }, 600);
      });

    $("#btn-new") &&
      $("#btn-new").addEventListener("click", function () {
        state.step = 0;
        state.service = null;
        state.barber = null;
        state.date = null;
        state.time = null;
        state.customer = { name: "", email: "", phone: "" };
        state.paymentId = null;
        state.ref = null;
        ["cust-name", "cust-email", "cust-phone"].forEach(function (id) {
          const n = $("#" + id);
          if (n) n.value = "";
        });
        const sum = $("#summary");
        if (sum) sum.hidden = false;
        ["btn-next-service", "btn-next-barber", "btn-next-date", "btn-next-time"].forEach(
          function (id) {
            const b = $("#" + id);
            if (b) b.disabled = true;
          }
        );
        const payBtn = $("#btn-pay");
        if (payBtn) payBtn.disabled = false;
        renderServices();
        showStep(0);
      });

    const toggle = $("#summary-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        const sum = $("#summary");
        if (!sum) return;
        sum.classList.toggle("expanded");
        const hint = $("#summary-toggle-hint");
        if (hint) {
          hint.textContent = sum.classList.contains("expanded")
            ? t.hideSummary
            : t.showSummary;
        }
      });
    }
  }

  function init() {
    renderServices();
    renderProgress();
    updateSummary();
    bindNav();
    showStep(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
