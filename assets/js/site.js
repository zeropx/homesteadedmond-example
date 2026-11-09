/* Homestead POA — site behavior. No dependencies, no animation, works without it (progressive enhancement). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;

  /* ---------- text size (A / A+ / A++) ---------- */
  var KEY = "hs-text-size";
  function applySize(n) {
    root.classList.remove("ts-1", "ts-2", "ts-3");
    root.classList.add("ts-" + n);
    root.style.fontSize = n === 3 ? "130%" : n === 2 ? "115%" : "100%";
    var btns = doc.querySelectorAll(".ts__btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-s") === String(n) ? "true" : "false");
    }
  }
  var saved = 1;
  try { saved = parseInt(localStorage.getItem(KEY), 10) || 1; } catch (e) {}
  if (saved < 1 || saved > 3) saved = 1;
  applySize(saved);
  var tsBtns = doc.querySelectorAll(".ts__btn");
  for (var t = 0; t < tsBtns.length; t++) {
    tsBtns[t].addEventListener("click", function () {
      var n = parseInt(this.getAttribute("data-s"), 10);
      applySize(n);
      try { localStorage.setItem(KEY, String(n)); } catch (e) {}
    });
  }

  /* ---------- greeting ---------- */
  var g = doc.querySelector("[data-greet]");
  if (g) {
    var h = new Date().getHours();
    g.textContent = (h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", neighbor.";
  }

  /* ---------- date helpers ---------- */
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }
  function nthWeekday(year, month, weekday, n) { /* n = 1.. or -1 for last */
    if (n > 0) {
      var d = new Date(year, month, 1);
      while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
      d.setDate(d.getDate() + 7 * (n - 1));
      return d;
    }
    var l = new Date(year, month + 1, 0);
    while (l.getDay() !== weekday) l.setDate(l.getDate() - 1);
    return l;
  }
  function fmtDay(d) { return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate(); }
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + (m ? ":" + (m < 10 ? "0" : "") + m : ":00") + " " + ap;
  }

  /* ---------- pool season ---------- */
  /* Season: Saturday before Memorial Day through Labor Day. Closed Mondays except Labor Day (the last pool day). 12–8 pm. */
  function poolSeason(year) {
    var memorial = nthWeekday(year, 4, 1, -1);
    var labor = nthWeekday(year, 8, 1, 1);
    return { start: addDays(memorial, -2), end: labor, labor: labor };
  }
  function poolState(now) {
    var today = startOfDay(now), y = today.getFullYear(), s = poolSeason(y);
    if (today >= s.start && today <= s.end) {
      var isLabor = today.getTime() === s.labor.getTime();
      var closedToday = today.getDay() === 1 && !isLabor;
      if (closedToday) return { chip: "Closed today", ok: false, text: "Closed Mondays for maintenance. Open Tuesday–Sunday, 12–8 pm." };
      var open = new Date(y, today.getMonth(), today.getDate(), 12, 0), close = new Date(y, today.getMonth(), today.getDate(), 20, 0);
      var txt = isLabor ? "Open today, 12–8 pm. Labor Day is the last pool day of the season." : "Open today, 12–8 pm. Closed Mondays for maintenance.";
      if (now > close) txt = "Closed for tonight. Hours are 12–8 pm, Tuesday–Sunday.";
      return { chip: now > close ? "Closed today" : "Open today", ok: now <= close, text: txt, _o: open };
    }
    var next = today < s.start ? s.start : poolSeason(y + 1).start;
    return { chip: "Closed for season", ok: false, text: "Reopens " + fmtDay(next) + ", " + next.getFullYear() + " (Memorial Day weekend). Hours are 12–8 pm, Tuesday–Sunday. See the pool page for any board notice." };
  }
  var poolChip = doc.querySelector("[data-pool-chip]"), poolText = doc.querySelector("[data-pool-text]");
  if (poolChip || poolText) {
    var ps = poolState(new Date());
    if (poolChip) { poolChip.textContent = ps.chip; poolChip.className = "chip " + (ps.ok ? "chip--ok" : "chip--closed"); }
    if (poolText) poolText.textContent = ps.text;
  }
  var seasonLabel = doc.querySelector("[data-pool-season]");
  if (seasonLabel) {
    var now0 = new Date(), ss = poolSeason(now0.getFullYear());
    var yr = startOfDay(now0) > ss.end ? now0.getFullYear() + 1 : now0.getFullYear();
    seasonLabel.textContent = yr + " season";
  }

  /* ---------- next meeting (from events.js) ---------- */
  var mtgChip = doc.querySelector("[data-mtg-chip]"), mtgText = doc.querySelector("[data-mtg-text]"), mtgLink = doc.querySelector("[data-mtg-link]");
  if ((mtgChip || mtgText) && window.HS_EVENTS) {
    var nowM = new Date(), up = null;
    for (var i = 0; i < window.HS_EVENTS.length; i++) {
      var ev = window.HS_EVENTS[i];
      if (!/meeting/i.test(ev.title)) continue;
      var en = new Date(ev.end);
      if (en > nowM && (!up || new Date(ev.start) < new Date(up.start))) up = ev;
    }
    if (up) {
      var sd = new Date(up.start), n = daysBetween(nowM, sd);
      var label = n <= 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + " days";
      if (mtgChip) { mtgChip.textContent = label; mtgChip.className = "chip " + (n <= 1 ? "chip--ok" : "chip--closed"); }
      if (mtgText) mtgText.innerHTML = "<b>" + up.title + "</b><br>" + fmtDay(sd) + ", " + fmtTime(sd) + (up.where ? "<br>" + up.where : "");
      if (mtgLink && up.href) mtgLink.setAttribute("href", mtgLink.getAttribute("data-base") + up.href);
    } else {
      if (mtgChip) { mtgChip.textContent = "None posted"; mtgChip.className = "chip chip--closed"; }
      if (mtgText) mtgText.textContent = "Meeting dates are posted on the calendar. Questions? Email the board.";
    }
  }

  /* ---------- calendar: mark past events ---------- */
  var evEls = doc.querySelectorAll(".event[data-end]");
  if (evEls.length) {
    var nowC = new Date(), anyUpcoming = false;
    for (var k = 0; k < evEls.length; k++) {
      var e = evEls[k], past = new Date(e.getAttribute("data-end")) < nowC;
      if (past) {
        e.classList.add("is-past");
        var slot = e.querySelector("[data-past-slot]");
        if (slot) slot.innerHTML = '<span class="chip chip--closed">Past</span>';
      } else anyUpcoming = true;
    }
    var empty = doc.querySelector("[data-cal-empty]");
    if (empty && !anyUpcoming) empty.hidden = false;
  }

  /* ---------- menu sheet ---------- */
  var sheet = doc.getElementById("menu"), openers = doc.querySelectorAll("[data-open-menu]");
  if (sheet && typeof sheet.showModal === "function") {
    for (var o = 0; o < openers.length; o++) {
      openers[o].addEventListener("click", function (ev) { ev.preventDefault(); sheet.showModal(); });
    }
    var closer = sheet.querySelector("[data-close-menu]");
    if (closer) closer.addEventListener("click", function () { sheet.close(); });
    sheet.addEventListener("click", function (ev) { if (ev.target === sheet) sheet.close(); });
    var sl = sheet.querySelectorAll("a");
    for (var s = 0; s < sl.length; s++) sl[s].addEventListener("click", function () { sheet.close(); });
  } else {
    /* No <dialog> support (or no sheet): the Menu button keeps its href and jumps to the site map in the footer. */
  }

  /* ---------- desktop nav: click to open, one at a time, close on outside click / Escape ---------- */
  var navDetails = doc.querySelectorAll(".dnav details");
  for (var d = 0; d < navDetails.length; d++) {
    navDetails[d].addEventListener("toggle", function () {
      if (!this.open) return;
      for (var j = 0; j < navDetails.length; j++) if (navDetails[j] !== this) navDetails[j].open = false;
    });
  }
  doc.addEventListener("click", function (ev) {
    for (var j = 0; j < navDetails.length; j++) if (navDetails[j].open && !navDetails[j].contains(ev.target)) navDetails[j].open = false;
  });
  doc.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") for (var j = 0; j < navDetails.length; j++) navDetails[j].open = false;
  });

  /* ---------- contact form → opens the visitor's email app (no server needed) ---------- */
  var form = doc.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = doc.getElementById("form-msg");
      var f = form.elements, name = ((f.fname.value || "").trim() + " " + (f.lname.value || "").trim()).trim(), email = (f.email.value || "").trim(), body = (f.message.value || "").trim(), subj = (f.subject.value || "").trim();
      var topic = "";
      var r = form.querySelectorAll("input[name=topic]");
      for (var i = 0; i < r.length; i++) if (r[i].checked) topic = r[i].value;
      if (!name || !email || !body || !subj || !topic) {
        msg.className = "form__msg is-error";
        msg.textContent = "Please fill in every field and choose what you're asking about.";
        return;
      }
      var subject = "Homestead website (" + topic + "): " + subj;
      var text = body + "\n\n— " + name + "\nReply to: " + email;
      msg.className = "form__msg";
      msg.textContent = "Opening your email app. If nothing opens, write to " + form.getAttribute("data-to") + ".";
      window.location.href = "mailto:" + form.getAttribute("data-to") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
    });
  }

  /* ---------- year ---------- */
  var yEls = doc.querySelectorAll("[data-year]");
  for (var y = 0; y < yEls.length; y++) yEls[y].textContent = new Date().getFullYear();
})();
