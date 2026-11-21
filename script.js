/* ==========================================================
   Body Scent — shared script (used by every page)
   Each feature runs only if its elements exist on the page:
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Config ---------- */
  var PRODUCTS_URL = "products.json";
  var ORDER_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbw-x4R3KLHYXkDx-oaLpUL3QRHHHaKUa3s-QLWyBbXp4OW8aOyo_FLYUPxECioOvKc4XQ/exec";
  var ORDERS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRrPEfXdaznd1CmUcO2wzCoAAz1LUpgI8iFmfYJWuKFH5SPIj5f4TXG2NlLK3UKoZyU6215gQlgyTAq/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  /* ---------- Helpers ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function formatPrice(price) {
    return Number(price).toLocaleString("th-TH") + " บาท";
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  function isValidMood(key) {
    return MOODS.some(function (m) {
      return m.key === key;
    });
  }

  /* ==========================================================
     1) product.html — product cards + mood filter
     ========================================================== */
  function initProductPage() {
    var filterBar = document.getElementById("filter-bar");
    var list = document.getElementById("product-list");
    if (!filterBar || !list) return;

    var products = [];
    var params = new URLSearchParams(window.location.search);
    var requested = (params.get("mood") || "all").toLowerCase();
    var currentMood = isValidMood(requested) ? requested : "all";

    function buildFilters() {
      filterBar.innerHTML = "";
      MOODS.forEach(function (mood) {
        var children = [];
        if (mood.key !== "all") {
          children.push(el("span", { class: "mood-dot", "data-mood": mood.key }));
        }
        children.push(el("span", { text: mood.label }));

        var btn = el(
          "button",
          { type: "button", class: "filter", "data-mood-filter": mood.key },
          children
        );
        btn.addEventListener("click", function () {
          setMood(mood.key);
        });
        filterBar.appendChild(btn);
      });
      syncFilterState();
    }

    function syncFilterState() {
      var buttons = filterBar.querySelectorAll("[data-mood-filter]");
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.getAttribute("data-mood-filter") === currentMood;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function setMood(mood) {
      currentMood = mood;
      syncFilterState();
      render();
      // keep the URL shareable without reloading the page
      try {
        var url = new URL(window.location.href);
        if (mood === "all") url.searchParams.delete("mood");
        else url.searchParams.set("mood", mood);
        window.history.replaceState(null, "", url.toString());
      } catch (e) {
        /* ignore */
      }
    }

    function buildCard(product) {
      var fullName = product.size ? product.name + " " + product.size : product.name;

      var orderParams = new URLSearchParams();
      orderParams.set("item", fullName);
      orderParams.set("price", String(product.price));

      var img = el("img", {
        src: product.image,
        alt: product.name,
        loading: "lazy"
      });

      var meta = el("div", { class: "product-card__meta" }, [
        el("span", { class: "mood-dot", "data-mood": product.mood }),
        el("span", { text: moodLabel(product.mood) }),
        el("span", {
          text: product.size ? product.size : product.type === "rollon" ? "โรลออน" : ""
        })
      ]);

      var footer = el("div", { class: "product-card__footer" }, [
        el("span", { class: "price", text: formatPrice(product.price) }),
        el("a", {
          class: "btn btn--accent",
          href: "order.html?" + orderParams.toString(),
          text: "สั่งซื้อ"
        })
      ]);

      return el("article", { class: "product-card", "data-mood": product.mood }, [
        el("div", { class: "product-card__media" }, [img]),
        el("div", { class: "product-card__body" }, [
          el("h3", { class: "product-card__name", text: product.name }),
          meta,
          el("p", { class: "product-card__desc", text: product.description || "" })
        ]),
        footer
      ]);
    }

    function render() {
      list.innerHTML = "";
      var visible = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });

      if (!visible.length) {
        list.appendChild(el("p", { class: "muted", text: "ไม่พบสินค้าในหมวดนี้" }));
        return;
      }
      visible.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    buildFilters();

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        render();
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = "";
        list.appendChild(
          el("p", { class: "muted", text: "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง" })
        );
      });
  }

  /* ==========================================================
     2) order.html — prefill from URL + submit order
     ========================================================== */
  function initOrderPage() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var itemField = document.getElementById("items");
    var totalField = document.getElementById("total");

    // Prefill both fields as soon as the page loads
    if (itemField && params.has("item")) {
      itemField.value = params.get("item");
    }
    if (totalField && params.has("price")) {
      totalField.value = params.get("price");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var payload = {
        customerName: document.getElementById("customerName").value.trim(),
        contact: document.getElementById("contact").value.trim(),
        items: document.getElementById("items").value.trim(),
        total: document.getElementById("total").value.trim(),
        note: document.getElementById("note").value.trim()
      };

      fetch(ORDER_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload)
      })
        .then(function () {
          window.location.href = "thankyou.html";
        })
        .catch(function (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================
     3) admin.html — orders table from published Google Sheet CSV
     ========================================================== */

  // Minimal CSV parser: handles quoted fields, "" escapes,
  // commas and line breaks inside quotes, CRLF/LF, and a leading BOM.
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    // last field / row (file without trailing newline)
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function initAdminPage() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;

    var COLUMNS = 6; // date, name, contact, items, total, note

    function showMessage(message) {
      tbody.innerHTML = "";
      var td = el("td", { colspan: String(COLUMNS), class: "muted", text: message });
      tbody.appendChild(el("tr", null, [td]));
    }

    function formatTotal(value) {
      var num = Number(String(value).replace(/,/g, ""));
      return value !== "" && !isNaN(num) ? num.toLocaleString("th-TH") : value;
    }

    showMessage("กำลังโหลดข้อมูล...");

    // timestamp param avoids stale cached copies of the published CSV
    var url = ORDERS_CSV_URL + "&_=" + Date.now();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // drop header row and fully empty rows
        var data = rows.slice(1).filter(function (r) {
          return r.some(function (cell) {
            return cell.trim() !== "";
          });
        });

        if (!data.length) {
          showMessage("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        // Sheet appends new orders at the bottom → reverse so newest is first
        data.reverse();

        tbody.innerHTML = "";
        data.forEach(function (r) {
          var tr = document.createElement("tr");
          for (var c = 0; c < COLUMNS; c++) {
            var value = r[c] !== undefined ? r[c].trim() : "";
            if (c === 4) value = formatTotal(value);
            tr.appendChild(el("td", { text: value })); // textContent → safe from injected HTML
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      });
  }

  /* ---------- Init ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
