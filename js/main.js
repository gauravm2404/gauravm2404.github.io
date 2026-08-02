/* ═══════════════════════════════════════════════════════════
   Motion + interaction layer.
   Everything degrades gracefully and respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── Footer year ─────────────────────────────────────────── */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Split headlines into animatable words ───────────────── */
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var outer = document.createElement('span');
      outer.className = 'word';
      var inner = document.createElement('span');
      inner.textContent = w;
      inner.style.setProperty('--w', i);
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  $$('.split').forEach(splitWords);

  /* ── Body copy that fades in word-by-word ────────────────── */
  $$('.words').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w + (i < words.length - 1 ? ' ' : '');
      s.style.setProperty('--wi', i);
      el.appendChild(s);
    });
  });

  /* ── Reveal on scroll ────────────────────────────────────── */
  var revealTargets = $$('[data-reveal], .split, .split-lines, .words');
  if (!('IntersectionObserver' in window) || reduced) {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });

    /* Safety net: webfonts landing late can reflow the hero after the observer's
       first pass, leaving above-the-fold content stuck at opacity 0 until the
       user scrolls. Sweep anything already on screen once layout has settled. */
    var sweep = function () {
      revealTargets.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.05 && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    };
    window.addEventListener('load', sweep);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sweep);
    setTimeout(sweep, 900);
  }

  /* ── Count-up statistics ─────────────────────────────────── */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced) { el.textContent = prefix + target.toLocaleString('en-US') + suffix; return; }

    var start = null, dur = 1500;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);           // easeOutQuart
      el.textContent = prefix + Math.round(target * eased).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var nums = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var numIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); numIO.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { numIO.observe(n); });
  } else {
    nums.forEach(countUp);
  }

  /* ── Nav: stuck state, mobile drawer, active link ────────── */
  var nav = $('#nav');
  var toggle = $('#navToggle');
  var drawer = $('#navDrawer');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var navLinks = $$('.nav__links a');
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var activeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { activeIO.observe(s); });
  }

  /* ── Scroll-linked work: progress bar, nav shadow, parallax ─ */
  var bar = $('#progressBar');
  var parallaxEls = $$('[data-parallax]');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (nav) nav.classList.toggle('is-stuck', y > 24);

    if (!reduced) {
      parallaxEls.forEach(function (el) {
        var rate = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
        var offset = (rect.top - window.innerHeight / 2) * -rate;
        el.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
      });
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ── Pointer spotlight on cards ──────────────────────────── */
  if (!reduced && window.matchMedia('(hover:hover)').matches) {
    $$('.spotlight').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* ── Magnetic buttons ──────────────────────────────────── */
    $$('.magnet').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
        btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + (dy - 2).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });

    /* ── Portrait tilt ─────────────────────────────────────── */
    $$('.tilt').forEach(function (el) {
      var parent = el.parentElement;
      parent.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var rx = ((e.clientY - (r.top + r.height / 2)) / r.height) * -6;
        var ry = ((e.clientX - (r.left + r.width / 2)) / r.width) * 6;
        el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      parent.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ── Stacked research cards: staggered sticky offsets ────── */
  $$('.stack__card').forEach(function (card, i) {
    card.style.setProperty('--s', (i * 14) + 'px');
  });

  /* ═════════════ Publications: render, filter, search ═══════ */
  var list = $('#pubList');
  var empty = $('#pubEmpty');
  var data = window.PUBLICATIONS || [];

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlightAuthor(authors) {
    return escapeHTML(authors).replace(/Maggu G/g, '<b>Maggu G</b>');
  }

  function render() {
    if (!list) return;
    list.innerHTML = data.map(function (p, i) {
      var badges = (p.badges || []).map(function (b) {
        return '<span class="badge badge--pubmed">' + escapeHTML(b) + '</span>';
      }).join('');
      if (p.cites) badges = '<span class="badge badge--cite">' + p.cites + ' citations</span>' + badges;
      if (p.award) badges = '<span class="badge badge--award">' + escapeHTML(p.award) + '</span>' + badges;

      return '' +
        '<li class="pub" data-tags="' + (p.tags || []).join(' ') + '" ' +
            'data-text="' + escapeHTML((p.title + ' ' + p.authors + ' ' + p.venue + ' ' + (p.detail || '')).toLowerCase()) + '">' +
          '<span class="pub__n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div>' +
            '<p class="pub__title">' + escapeHTML(p.title) + '</p>' +
            '<p class="pub__authors">' + highlightAuthor(p.authors) + '</p>' +
            '<p class="pub__venue"><em>' + escapeHTML(p.venue) + '</em> · ' + escapeHTML(p.detail || '') + '</p>' +
          '</div>' +
          '<div class="pub__side">' + badges + '</div>' +
        '</li>';
    }).join('');
  }
  render();

  var items = $$('.pub');
  var activeFilter = 'all';
  var query = '';

  function applyFilters() {
    var shown = 0;
    items.forEach(function (li) {
      var tags = li.getAttribute('data-tags') || '';
      var text = li.getAttribute('data-text') || '';
      var okTag = activeFilter === 'all' || tags.split(' ').indexOf(activeFilter) !== -1;
      var okQuery = !query || text.indexOf(query) !== -1;
      var show = okTag && okQuery;
      li.classList.toggle('is-hidden', !show);
      if (show) {
        shown++;
        if (!reduced) {
          li.classList.add('is-entering');
          /* force reflow so the transition replays on each filter change */
          void li.offsetWidth;
          li.classList.remove('is-entering');
        }
      }
    });
    if (empty) empty.hidden = shown > 0;
  }

  $$('.fchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      $$('.fchip').forEach(function (c) { c.classList.remove('is-on'); });
      chip.classList.add('is-on');
      activeFilter = chip.getAttribute('data-filter');
      applyFilters();
    });
  });

  var search = $('#pubSearch');
  if (search) {
    search.addEventListener('input', function () {
      query = search.value.trim().toLowerCase();
      applyFilters();
    });
  }

  /* ── Smooth anchor scrolling that clears the fixed nav ───── */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });
})();
