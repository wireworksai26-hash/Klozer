/*
 * Klozer live chat widget.
 * Embed:  <script src="https://YOUR-DOMAIN/api/v1/public/webchat/widget.js" data-key="wc_..." async></script>
 * No dependencies. Everything is drawn inside a closed shadow root so the host page's CSS cannot break it, and all
 * text from the server is inserted with textContent, never as HTML.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || !script.src) return;
  var key = script.getAttribute("data-key");
  if (!key || !/^wc_[a-f0-9]{24}$/.test(key)) return;

  var api = new URL(script.src).origin + "/api/v1/public/webchat/" + key;
  var storeKey = "klozer_wc_" + key;
  var FAST = 3000;
  var SLOW = 10000;
  var token = null;
  var lastId = 0;
  var isOpen = false;
  var timer = null;
  var idle = 0;
  var pending = []; // bubbles shown right after sending, replaced by the server's copy on the next poll
  var waitingUntil = 0;
  var started = false;

  try {
    token = window.localStorage.getItem(storeKey);
  } catch {
    token = null;
  }

  function request(method, path, body) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(api + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (res) {
      if (res.status === 401) {
        token = null;
        try {
          window.localStorage.removeItem(storeKey);
        } catch {
          /* storage unavailable */
        }
      }
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  // ---- interface
  var host = document.createElement("div");
  var root = host.attachShadow({ mode: "closed" });
  root.innerHTML =
    "<style>" +
    ":host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    ".btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;color:#fff;background:var(--c);box-shadow:0 6px 20px rgba(0,0,0,.25);font-size:26px;z-index:2147483646}" +
    ".panel{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 24px);height:480px;max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);overflow:hidden;z-index:2147483646}" +
    ".panel.open{display:flex}" +
    ".head{background:var(--c);color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}" +
    ".x{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}" +
    ".list{flex:1;overflow-y:auto;padding:12px;background:#f5f6f8;display:flex;flex-direction:column;gap:8px}" +
    ".m{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}" +
    ".v{align-self:flex-end;background:var(--c);color:#fff;border-bottom-right-radius:4px}" +
    ".a{align-self:flex-start;background:#fff;color:#1c2030;border-bottom-left-radius:4px}" +
    ".t{align-self:flex-start;color:#646b84;font-size:12px}" +
    "form{display:flex;gap:8px;padding:10px;border-top:1px solid #e3e6ee;background:#fff}" +
    "input{flex:1;border:1px solid #d5d9e4;border-radius:10px;padding:10px 12px;font-size:14px;outline:none}" +
    "input:focus{border-color:var(--c)}" +
    ".s{border:0;border-radius:10px;padding:0 14px;background:var(--c);color:#fff;font-weight:600;cursor:pointer}" +
    "</style>" +
    '<button class="btn" aria-label="Chat">&#128172;</button>' +
    '<div class="panel" role="dialog"><div class="head"><span class="title"></span><button class="x" aria-label="Close">&times;</button></div>' +
    '<div class="list"></div><form><input maxlength="1000" autocomplete="off"><button class="s" type="submit">&#10148;</button></form></div>';
  var $ = function (sel) {
    return root.querySelector(sel);
  };
  var list = $(".list");
  var input = $("input");
  // custom properties set on the host are inherited by the shadow tree
  host.style.setProperty("--c", "#046B54");
  document.body.appendChild(host);
  var setColor = function (c) {
    if (/^#[0-9a-fA-F]{6}$/.test(c || "")) host.style.setProperty("--c", c);
  };

  function bubble(cls, text) {
    var el = document.createElement("div");
    el.className = "m " + cls;
    el.textContent = text;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  }

  function showTyping() {
    var old = list.querySelector(".t");
    if (old) old.remove();
    if (Date.now() < waitingUntil) {
      var el = document.createElement("div");
      el.className = "t";
      el.textContent = "...";
      list.appendChild(el);
      list.scrollTop = list.scrollHeight;
    }
  }

  function render(messages) {
    var typing = list.querySelector(".t");
    if (typing) typing.remove();
    messages.forEach(function (m) {
      if (m.id <= lastId) return;
      lastId = m.id;
      if (m.from === "visitor" && pending.length) pending.shift().remove();
      if (m.from === "agent") waitingUntil = 0;
      bubble(m.from === "visitor" ? "v" : "a", m.text);
    });
    showTyping();
  }

  // ---- talking to the server
  function start() {
    return request("POST", "/session").then(function (r) {
      if (!r.ok) return;
      token = r.data.token;
      started = true;
      try {
        window.localStorage.setItem(storeKey, token);
      } catch {
        /* storage unavailable: the chat still works until the page is closed */
      }
      var s = r.data.settings || {};
      setColor(s.color);
      $(".title").textContent = s.title || "Chat";
      list.textContent = "";
      lastId = 0;
      pending = [];
      if (!r.data.messages.length && s.welcomeMessage) bubble("a", s.welcomeMessage);
      render(r.data.messages);
    });
  }

  function poll() {
    clearTimeout(timer);
    if (!isOpen) return;
    request("GET", "/messages?after=" + lastId)
      .then(function (r) {
        if (r.status === 401) return start();
        if (r.ok && r.data.messages.length) {
          idle = 0;
          render(r.data.messages);
        } else {
          idle++;
        }
      })
      .catch(function () {
        idle++;
      })
      .then(function () {
        timer = setTimeout(poll, idle > 10 && Date.now() >= waitingUntil ? SLOW : FAST);
      });
  }

  function randomId() {
    var bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map
      .call(bytes, function (b) {
        return ("0" + b.toString(16)).slice(-2);
      })
      .join("");
  }

  function send(text) {
    pending.push(bubble("v", text));
    waitingUntil = Date.now() + 60000;
    idle = 0;
    showTyping();
    request("POST", "/messages", { text: text, clientMessageId: randomId() }).then(function (r) {
      if (r.status === 401) return start().then(function () { send(text); });
      if (!r.ok) {
        var failed = pending.pop();
        if (failed) failed.textContent = text + " (belum terkirim)";
        waitingUntil = 0;
      }
    });
  }

  function toggle(open) {
    isOpen = open;
    $(".panel").classList.toggle("open", open);
    if (open) {
      (started ? Promise.resolve() : start()).then(function () {
        poll();
        input.focus();
      });
    } else {
      clearTimeout(timer);
    }
  }

  $(".btn").addEventListener("click", function () {
    toggle(!isOpen);
  });
  $(".x").addEventListener("click", function () {
    toggle(false);
  });
  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    send(text);
  });
})();
