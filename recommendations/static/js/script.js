/* ============================================================
   AI Job Recommendation System — script.js
   Vanilla JS. The recommendation form calls the real Django/DRF
   prediction API (/api/recommendations/predict/) and the dashboard
   renders the real response — see initRecommendationForm() and
   initDashboard() below. Everything else (nav, scroll-reveal,
   counters, contact form) has no backend behind it, as specced.
   ============================================================ */

window.CareerAI = (function () {

  /* ---------- Toast helper ---------- */
  function showToast(message) {
    var toast = document.getElementById('appToast');
    if (!toast) return;
    document.getElementById('appToastMsg').textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3200);
  }

  /* ---------- Navbar: scroll blur + mobile toggle ---------- */
  function initNavbar() {
    var nav = document.getElementById('siteNav');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (!nav) return;

    function onScroll() {
      if (window.scrollY > 24) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.innerHTML = open ? '<i class="bi bi-x-lg"></i>' : '<i class="bi bi-list"></i>';
      });
      // close mobile menu after tapping a link
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          links.classList.remove('open');
          toggle.innerHTML = '<i class="bi bi-list"></i>';
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Active-link highlight while scrolling the home page sections
    var sectionIds = ['top', 'about', 'features', 'why', 'faq', 'contact'];
    var sections = sectionIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (sections.length) {
      var navItems = links.querySelectorAll('a.nav-link-item');
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            navItems.forEach(function (a) {
              a.classList.toggle('active', a.getAttribute('href').indexOf('#' + id) !== -1);
            });
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      sections.forEach(function (s) { observer.observe(s); });
    }
  }

  /* ---------- Reveal-on-scroll (GSAP) ---------- */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    items.forEach(function (el) {
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    // --- Cinematic Hero Pinning ---
    const heroSection = document.querySelector('.hero');
    const heroCopy = document.querySelector('.hero-copy');
    const heroCanvas = document.getElementById('hero-canvas');

    if (heroSection && heroCopy && heroCanvas) {
      // 1. Initial Load Animation
      const heroTexts = document.querySelectorAll('.hero-copy .eyebrow, .hero-copy h1, .hero-copy p, .hero-actions, .hero-trust');
      gsap.from(heroTexts, {
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "power4.out",
        delay: 0.1
      });

      // 2. Scroll Pinning & Scaling
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroSection,
          start: "top top",
          end: "+=150%", // Pin for 1.5x screen height
          pin: true,
          scrub: 1 // smooth scrubbing
        }
      });

      // As we scroll down, the text fades out and flies up
      tl.to(heroCopy, {
        y: -150,
        opacity: 0,
        duration: 1
      }, 0);

      // And the 3D canvas scales up and shifts to center
      tl.to(heroCanvas, {
        scale: 1.5,
        x: '-20%', // shift left to center it since it's originally on the right
        duration: 1
      }, 0);
    }

    // --- 3D Feature Card Reveals ---
    const featureCards = document.querySelectorAll('.feature-card');
    if (featureCards.length) {
      gsap.from(featureCards, {
        scrollTrigger: {
          trigger: '#features',
          start: 'top 70%',
        },
        y: 100,
        rotationX: -15, // 3D flip effect
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "back.out(1.2)" // bouncier ease
      });
    }

    // --- Remaining Elements ---
    items.forEach(function (el) {
      if (el.closest('.hero') || el.classList.contains('feature-card')) return;

      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    });
  }

  /* ---------- Animated counters ---------- */
  function initCounters() {
    var counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var duration = 1800;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString();
      }
      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { observer.observe(c); });
  }

  /* ---------- Typing animation for hero heading ---------- */
  function initTyping() {
    var el = document.getElementById('typedHeading');
    if (!el) return;
    var phrases = ['with AI', 'in seconds', 'that fits you'];
    var phraseIndex = 0, charIndex = 0, deleting = false;

    function tick() {
      var current = phrases[phraseIndex];
      if (!deleting) {
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        charIndex--;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }
      setTimeout(tick, deleting ? 40 : 80);
    }
    charIndex = 0;
    el.textContent = '';
    setTimeout(tick, 500);
  }

  /* ---------- Button ripple effect ---------- */
  function initRipple() {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var ripple = document.createElement('span');
        var size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 600);
      });
    });
  }

  /* ---------- Contact form (real submit) ---------- */
  function initContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }
      
      var payload = {
        name: document.getElementById('cName').value.trim(),
        email: document.getElementById('cEmail').value.trim(),
        subject: document.getElementById('cSubject').value.trim(),
        message: document.getElementById('cMessage').value.trim()
      };

      fetch('/api/recommendations/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed');
        showToast('Message sent. We\'ll get back to you soon.');
        form.reset();
        form.classList.remove('was-validated');
      })
      .catch(function() {
        showToast('Failed to send message. Please try again.');
      });
    });
  }

  /* ---------- Fetch Live Metrics for AI Engine Showcase ---------- */
  function fetchLiveMetrics() {
    var accText = document.getElementById('metric-acc-text');
    if (!accText) return; // Only run on home page where this section exists

    fetch('/api/recommendations/metrics/')
      .then(function(res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(function(data) {
        if (data.error) return; // Ignore if no run recorded

        var acc = (data.accuracy * 100).toFixed(1);
        var f1 = (data.f1_macro * 100).toFixed(1);
        var prec = (data.precision_macro * 100).toFixed(1);

        document.getElementById('metric-acc-text').textContent = acc + '%';
        document.getElementById('metric-acc-bar').style.width = acc + '%';

        document.getElementById('metric-f1-text').textContent = f1 + '%';
        document.getElementById('metric-f1-bar').style.width = f1 + '%';

        document.getElementById('metric-prec-text').textContent = prec + '%';
        document.getElementById('metric-prec-bar').style.width = prec + '%';
      })
      .catch(function(error) {
        console.error('Error fetching live metrics:', error);
      });
  }

  /* ---------- Recommendation form: ranges + progress + real API call ---------- */

  // Maps this form to the fields recommendations.serializers.UserProfileInputSerializer
  // actually accepts. Personal/Academic fields not used by the model (name, age,
  // email, gender, branch, graduation year) are kept in the session snapshot for a
  // friendlier dashboard greeting, but are never sent to the API.
  function buildPredictionPayload(form) {
    var skills = (document.getElementById('skillsInput').value || '').trim();
    var certifications = (document.getElementById('certificationsInput').value || '').trim();
    var interests = (document.getElementById('interestsInput').value || '').trim();

    // The training data treated "Interests" as a certifications proxy
    // (see data_preprocessing.load_dataset2) — fold it in the same way here.
    var combinedCertifications = [certifications, interests].filter(Boolean).join(', ');

    var payload = {
      education_level: document.getElementById('educationLevel').value || 'Bachelor',
      skills: skills || 'None',
      certifications: combinedCertifications || 'None',
      experience_score: parseFloat(document.getElementById('experienceScore').value),
    };

    // CGPA field is collected on a 0–10 scale (label says "out of 10"); the model
    // was trained on a 0–100 scale (see data_preprocessing: AI Score / Recommendation
    // Score × 100), so it's scaled ×10 here before sending — no model code touched.
    var cgpaRaw = document.getElementById('cgpaInput').value;
    if (cgpaRaw !== '') {
      payload.cgpa = Math.max(0, Math.min(100, parseFloat(cgpaRaw) * 10));
    }

    return payload;
  }

  function initRecommendationForm() {
    var form = document.getElementById('recommendationForm');
    if (!form) return;

    // live range value display
    var exp = document.getElementById('experienceScore');
    var expVal = document.getElementById('experienceScoreVal');
    if (exp && expVal) {
      exp.addEventListener('input', function () {
        expVal.textContent = parseFloat(exp.value).toFixed(1);
      });
    }

    // progress dots light up as each card scrolls into view
    var cards = form.querySelectorAll('.form-card');
    var steps = document.querySelectorAll('.fp-step');
    if (cards.length && steps.length) {
      var stepObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var idx = Array.prototype.indexOf.call(cards, entry.target);
            steps.forEach(function (s, i) {
              s.classList.toggle('active', i <= idx);
            });
          }
        });
      }, { rootMargin: '-35% 0px -35% 0px' });
      cards.forEach(function (c) { stepObserver.observe(c); });
    }

    var errorBox = document.getElementById('formError');
    function showFormError(title, message) {
      if (!errorBox) { showToast(message); return; }
      errorBox.innerHTML = '<strong>' + title + '</strong>' + message;
      errorBox.style.display = 'block';
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function hideFormError() {
      if (errorBox) errorBox.style.display = 'none';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideFormError();

      if (!form.checkValidity()) {
        showFormError('Missing information', 'Please fill in the required fields (marked on Personal Information) before generating a recommendation.');
        return;
      }

      var payload = buildPredictionPayload(form);

      // Snapshot used only for dashboard personalization / matched-skills display.
      // None of this is sent to the API beyond what buildPredictionPayload already sends.
      var formSnapshot = {
        fullName: document.getElementById('fullName').value.trim(),
        skills: document.getElementById('skillsInput').value.trim(),
        educationLevel: payload.education_level,
        experienceScore: payload.experience_score,
      };

      var overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.classList.add('show');

      var animationDone = new Promise(function (resolve) {
        runLoadingSequence(resolve);
      });

      var apiCall = fetch('/api/recommendations/predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        });
      });

      Promise.all([apiCall, animationDone]).then(function (results) {
        var result = results[0];
        if (overlay) overlay.classList.remove('show');

        if (result.status === 503) {
          showFormError('No trained model available', 'Run <code>python manage.py train_model</code> on the server, then try again.');
          return;
        }
        if (result.status === 400) {
          var errors = Object.entries(result.data).map(function (kv) {
            return kv[0] + ': ' + (Array.isArray(kv[1]) ? kv[1].join(' ') : kv[1]);
          }).join('<br>');
          showFormError('Invalid input', errors || 'Please check the highlighted fields and try again.');
          return;
        }
        if (result.status !== 201 && result.status !== 200) {
          showFormError('Something went wrong', 'The server responded with status ' + result.status + '. Please try again.');
          return;
        }

        try {
          sessionStorage.setItem('careerai_result', JSON.stringify({
            apiResponse: result.data,
            formSnapshot: formSnapshot,
            savedAt: Date.now(),
          }));
        } catch (err) {
          // sessionStorage unavailable (e.g. private mode) — still proceed,
          // the dashboard will just show its empty state.
        }

        window.location.href = '/dashboard/';
      }).catch(function () {
        if (overlay) overlay.classList.remove('show');
        showFormError('Can\'t reach the server', 'Make sure <code>python manage.py runserver</code> is running, then try again.');
      });
    });
  }

  function runLoadingSequence(onDone) {
    var overlay = document.getElementById('loadingOverlay');
    var bar = document.getElementById('loadingProgressBar');
    var stepEls = document.querySelectorAll('.loading-step');
    if (!overlay) { onDone(); return; }

    overlay.classList.add('show');
    var i = 0;
    var total = stepEls.length;

    function activate(index) {
      stepEls.forEach(function (el, idx) {
        el.classList.toggle('active', idx === index);
      });
      if (bar) bar.style.width = Math.round(((index + 1) / total) * 100) + '%';
    }

    activate(0);
    var interval = setInterval(function () {
      i++;
      if (i < total) {
        activate(i);
      } else {
        clearInterval(interval);
        setTimeout(function () {
          overlay.classList.remove('show');
          onDone();
        }, 500);
      }
    }, 750);
  }

  /* ---------- Dashboard: career reference data ----------
     This is informational copy (descriptions, salary ranges, growth notes,
     reference skill lists) written for each of the model's real output
     classes. It is NOT model output — the model only ever returns a class
     name + probabilities. Everything quantitative on the dashboard (the
     top match, confidence %, ranked list, charts) comes straight from the
     API response; this object only supplies the descriptive text and the
     reference skill lists used to compute "matched / to improve" and the
     roadmap, which are real comparisons against what the user typed. */
  var CAREER_INFO = {
    'AI Researcher': {
      description: 'Designs and studies new machine learning techniques, often bridging research and applied AI.',
      coreSkills: ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Research'],
      salary: '₹12L – ₹28L / yr',
      responsibilities: ['Design and test new model architectures', 'Run experiments and document findings', 'Turn research into usable models', 'Stay current with recent papers'],
      growth: 'Excellent — one of the fastest-growing technical specializations.',
      scope: 'Expanding quickly as more companies invest in in-house AI research.',
      insights: ['High Demand', 'Research-Driven', 'Cutting-Edge Work', 'Premium Compensation']
    },
    'Cybersecurity Analyst': {
      description: 'Protects systems and networks by identifying vulnerabilities and responding to security threats.',
      coreSkills: ['Network Security', 'Penetration Testing', 'Ethical Hacking', 'Firewalls', 'Risk Assessment', 'Incident Response'],
      salary: '₹7L – ₹19L / yr',
      responsibilities: ['Monitor systems for threats', 'Run vulnerability assessments', 'Respond to security incidents', 'Harden infrastructure'],
      growth: 'Excellent — demand consistently outpaces the talent supply.',
      scope: 'A critical, growing need across every industry.',
      insights: ['High Demand', 'Mission-Critical', 'Strong Job Security', 'Competitive Salary']
    },
    'Data Scientist': {
      description: 'Turns raw data into models and insights that guide business decisions.',
      coreSkills: ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualization', 'Pandas'],
      salary: '₹9L – ₹20L / yr',
      responsibilities: ['Explore and clean datasets', 'Build predictive models', 'Present findings to stakeholders', 'Run experiments'],
      growth: 'Strong growth across nearly every industry.',
      scope: 'High demand for analytical and modeling skills.',
      insights: ['High Demand', 'Excellent Growth', 'Remote Opportunities', 'Competitive Salary']
    },
    'Software Engineer': {
      description: 'Builds and maintains the applications and systems that ship to users.',
      coreSkills: ['Programming Fundamentals', 'Data Structures', 'System Design', 'Git', 'APIs', 'Cloud Computing'],
      salary: '₹6L – ₹18L / yr',
      responsibilities: ['Write and review code', 'Design system architecture', 'Fix bugs and ship features', 'Collaborate with product teams'],
      growth: 'Broad and consistent demand across the industry.',
      scope: 'A wide range of specializations to grow into.',
      insights: ['High Demand', 'Broad Opportunities', 'Remote-Friendly', 'Steady Growth']
    }
  };

  function parseSkillList(text) {
    return (text || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function getSessionResult() {
    try {
      var raw = sessionStorage.getItem('careerai_result');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function initJobModal(careerInfoByName) {
    var modalEl = document.getElementById('jobModal');
    if (!modalEl) return;
    modalEl.addEventListener('show.bs.modal', function (e) {
      var key = e.relatedTarget ? e.relatedTarget.getAttribute('data-job') : null;
      var info = careerInfoByName[key];
      if (!info) return;

      document.getElementById('jobModalTitle').textContent = key;
      document.getElementById('jobModalBody').innerHTML =
        '<h6>Job Description</h6><p>' + info.description + '</p>' +
        '<h6>Required Skills</h6><div>' + info.coreSkills.map(function (s) { return '<span class="skill-pill">' + s + '</span>'; }).join('') + '</div>' +
        '<h6>Responsibilities</h6><ul style="padding-left:18px; font-size:14px; color:var(--text-muted);">' +
        info.responsibilities.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
        '<h6>Expected Salary</h6><p>' + info.salary + '</p>' +
        '<h6>Career Growth</h6><p>' + info.growth + '</p>' +
        '<h6>Future Scope</h6><p>' + info.scope + '</p>';
    });
  }

  function initCharts(rankedCareers) {
    var barEl = document.getElementById('skillBarChart');
    var doughnutEl = document.getElementById('confidenceDoughnut');
    if (typeof Chart === 'undefined' || !rankedCareers || !rankedCareers.length) return;

    var labels = rankedCareers.map(function (r) { return r.career; });
    var values = rankedCareers.map(function (r) { return parseFloat(r.probability); });
    var colors = ['#2563EB', '#3B82F6', '#10B981', '#94A3B8'];

    if (barEl) {
      new Chart(barEl, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Model Confidence',
            data: values,
            backgroundColor: values.map(function (_, i) { return colors[i % colors.length]; }),
            borderRadius: 8,
            maxBarThickness: 48
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' }, ticks: { color: '#64748B', callback: function (v) { return v + '%'; } } },
            x: { grid: { display: false }, ticks: { color: '#64748B' } }
          }
        }
      });
    }

    if (doughnutEl) {
      new Chart(doughnutEl, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: labels.map(function (_, i) { return colors[i % colors.length]; }),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Poppins', size: 11 }, color: '#64748B' } } }
        }
      });
    }
  }

  function renderDashboard(session) {
    var apiResponse = session.apiResponse;
    var formSnapshot = session.formSnapshot || {};
    var ranked = apiResponse.ranked_careers || [];
    var topCareer = apiResponse.predicted_career;
    var topInfo = CAREER_INFO[topCareer] || {};

    var userSkills = parseSkillList(formSnapshot.skills);
    var userSkillsLower = userSkills.map(function (s) { return s.toLowerCase(); });

    function isMatched(refSkill) {
      var lower = refSkill.toLowerCase();
      return userSkillsLower.some(function (s) { return s.indexOf(lower) !== -1 || lower.indexOf(s) !== -1; });
    }

    // ----- Greeting -----
    var greetingEl = document.getElementById('dashGreeting');
    if (greetingEl) {
      greetingEl.innerHTML = formSnapshot.fullName
        ? 'Hi <strong>' + formSnapshot.fullName + '</strong> — here\'s what the model found for your profile.'
        : 'Here\'s what the model found for your profile.';
    }

    // ----- Top recommendation -----
    document.getElementById('topRecJob').textContent = topCareer;
    document.getElementById('topRecMatch').textContent = apiResponse.confidence;
    document.getElementById('topRecSub').textContent = topInfo.description || '';

    // ----- Matched / improve skills -----
    var matchedList = document.getElementById('matchedSkillsList');
    matchedList.innerHTML = userSkills.length
      ? userSkills.map(function (s) { return '<li><i class="bi bi-dot"></i> ' + s + '</li>'; }).join('')
      : '<li><i class="bi bi-dot"></i> No skills were entered</li>';

    var coreSkills = topInfo.coreSkills || [];
    var toImprove = coreSkills.filter(function (s) { return !isMatched(s); }).slice(0, 5);
    var improveList = document.getElementById('improveSkillsList');
    improveList.innerHTML = toImprove.length
      ? toImprove.map(function (s) { return '<li><i class="bi bi-dot"></i> ' + s + '</li>'; }).join('')
      : '<li><i class="bi bi-dot"></i> You already cover the core skills</li>';

    var insightsList = document.getElementById('careerInsightsList');
    insightsList.innerHTML = (topInfo.insights || []).map(function (s) { return '<li><i class="bi bi-dot"></i> ' + s + '</li>'; }).join('');

    // ----- Job cards (one per real model class, ranked by confidence) -----
    var jobCardsRow = document.getElementById('jobCardsRow');
    // Note: no data-reveal here — these cards are injected after the page's
    // initial scroll-reveal observer has already run, so any data-reveal
    // element added at this point would never get its is-visible class and
    // would stay invisible. Static, page-load markup elsewhere still reveals.
    jobCardsRow.innerHTML = ranked.map(function (r, i) {
      var info = CAREER_INFO[r.career] || {};
      return (
        '<div class="col-lg-3 col-md-6">' +
        '<div class="job-card">' +
        '<div class="job-card-top"><h5>' + r.career + '</h5><span class="job-match">' + r.probability + ' Match</span></div>' +
        '<p class="job-desc">' + (info.description || '') + '</p>' +
        '<p class="job-salary">Salary range: <strong>' + (info.salary || '—') + '</strong></p>' +
        '<button class="btn btn-outline btn-sm mt-auto" data-bs-toggle="modal" data-bs-target="#jobModal" data-job="' + r.career + '">View Details</button>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    // ----- Roadmap (core skills for the top match, marking what's already covered) -----
    document.getElementById('roadmapSub').textContent = 'A suggested order to close your skill gaps for ' + topCareer + '.';
    var roadmapList = document.getElementById('roadmapList');
    roadmapList.innerHTML = coreSkills.map(function (s) {
      var done = isMatched(s);
      return (
        '<div class="roadmap-item ' + (done ? 'done' : '') + '">' +
        '<div class="roadmap-dot"><i class="bi ' + (done ? 'bi-check-lg' : 'bi-circle') + '"></i></div>' +
        '<div class="roadmap-text"><h6>' + s + '</h6><p>' + (done ? 'Already in your profile' : 'Recommended next step') + '</p></div>' +
        '</div>'
      );
    }).join('');

    // ----- Charts + modal -----
    initCharts(ranked);
    initJobModal(CAREER_INFO);

    // ----- Footer note: real model accuracy from the metrics endpoint -----
    var metaNote = document.getElementById('modelMetaNote');
    fetch('/api/recommendations/metrics/')
      .then(function (res) { if (!res.ok) throw new Error('no metrics'); return res.json(); })
      .then(function (data) {
        if (metaNote) {
          metaNote.innerHTML = 'Model accuracy <strong>' + (data.accuracy * 100).toFixed(2) + '%</strong> · ' +
            data.label_classes.length + ' career classes · Profile #' + (apiResponse.profile_id != null ? apiResponse.profile_id : '—');
        }
      })
      .catch(function () {
        if (metaNote) metaNote.textContent = 'Profile #' + (apiResponse.profile_id != null ? apiResponse.profile_id : '—');
      });
  }

  function initDashboard() {
    var session = getSessionResult();
    var emptyEl = document.getElementById('dashboardEmpty');
    var contentEl = document.getElementById('dashboardContent');

    if (!session || !session.apiResponse) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (contentEl) contentEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    renderDashboard(session);
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Custom Cursor
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (dot && ring) {
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let ringX = mouseX;
      let ringY = mouseY;

      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
      });

      function renderCursor() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.transform = `translate(calc(${ringX}px - 50%), calc(${ringY}px - 50%))`;
        requestAnimationFrame(renderCursor);
      }
      requestAnimationFrame(renderCursor);

      document.querySelectorAll('a, button, .feature-card, .adv-card, input').forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
      });
    }

    initNavbar();
    initReveal();
    initCounters();
    initTyping();
    initRipple();
    initContactForm();
    fetchLiveMetrics();
  });

  return {
    initRecommendationForm: initRecommendationForm,
    initDashboard: initDashboard,
    showToast: showToast
  };

})();
