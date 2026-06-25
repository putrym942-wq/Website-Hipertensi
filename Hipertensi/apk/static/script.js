/**
 * HyperScan — script.js
 * Handles: form UX, validation, progress bar, slider, submit loading
 * and result page animations.
 */

'use strict';

/* ================================================================
   UTILITIES
   ================================================================ */

/** Show a toast notification */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.querySelector('.toast-container')
    || (() => {
      const el = document.createElement('div');
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  setTimeout(remove, duration);
}

/** Debounce helper */
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}


/* ================================================================
   STRESS SCORE SLIDER
   ================================================================ */
function initSlider() {
  const slider = document.getElementById('stressRange');
  const display = document.getElementById('stressVal');
  if (!slider || !display) return;

  const colors = [
    '#4ADE80', // 0
    '#86EFAC', // 1
    '#A3E635', // 2
    '#FDE047', // 3
    '#FACC15', // 4
    '#FB923C', // 5
    '#F97316', // 6
    '#EF4444', // 7
    '#DC2626', // 8
    '#B91C1C', // 9
    '#7F1D1D', // 10
  ];

  function update() {
    const val = parseInt(slider.value, 10);
    display.textContent = val;
    const color = colors[val] || '#DC2626';
    display.style.color = color;

    const pct = (val / 10) * 100;
    slider.style.background = `linear-gradient(to right, ${color} ${pct}%, #2C2C2C ${pct}%)`;
  }

  slider.addEventListener('input', update);
  update(); // initial paint
}


/* ================================================================
   FORM VALIDATION
   ================================================================ */

const RULES = {
  Age:            { min: 18,  max: 84,   label: 'Usia' },
  BMI:            { min: 10,  max: 50,   label: 'BMI' },
  Sleep_Duration: { min: 1,   max: 12,   label: 'Durasi Tidur' },
  Salt_Intake:    { min: 0,   max: 20,   label: 'Asupan Garam' },
};

function validateNumber(input) {
  const name = input.name;
  const rule = RULES[name];
  if (!rule) return true;

  const val = parseFloat(input.value);
  const errorEl = input.closest('.field')?.querySelector('.field-error');

  const setError = (msg) => {
    input.classList.remove('valid');
    input.classList.add('invalid');
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
    return false;
  };
  const setValid = () => {
    input.classList.remove('invalid');
    input.classList.add('valid');
    if (errorEl) errorEl.classList.remove('visible');
    return true;
  };

  if (input.value === '') return setError(`${rule.label} wajib diisi.`);
  if (isNaN(val))         return setError(`Masukkan angka yang valid.`);
  if (val < rule.min)     return setError(`Minimum ${rule.min}.`);
  if (val > rule.max)     return setError(`Maksimum ${rule.max}.`);
  return setValid();
}

function validateSelect(select) {
  if (!select.value) {
    select.style.borderColor = 'var(--red-mid)';
    return false;
  }
  select.style.borderColor = '';
  return true;
}

function validateRadioGroup(form, name) {
  return !!form.querySelector(`input[name="${name}"]:checked`);
}

function validateForm(form) {
  let valid = true;

  // Number inputs
  form.querySelectorAll('input[type="number"]').forEach(input => {
    if (!validateNumber(input)) valid = false;
  });

  // Selects
  form.querySelectorAll('select').forEach(select => {
    if (!validateSelect(select)) valid = false;
  });

  // Radio groups
  ['Smoking_Status', 'Family_History'].forEach(name => {
    if (!validateRadioGroup(form, name)) {
      valid = false;
      const group = form.querySelector(`.chip-group`);
      // chips already styled via CSS :has, no extra work needed
    }
  });

  return valid;
}


/* ================================================================
   FORM PROGRESS BAR
   ================================================================ */
function initProgressBar(form) {
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label');
  if (!fill) return;

  const allInputs = [
    ...form.querySelectorAll('input[type="number"]'),
    ...form.querySelectorAll('select'),
  ];
  const radioGroups = ['Smoking_Status', 'Family_History'];
  const total = allInputs.length + radioGroups.length;

  function countFilled() {
    let filled = 0;
    allInputs.forEach(input => {
      if (input.value !== '') filled++;
    });
    radioGroups.forEach(name => {
      if (form.querySelector(`input[name="${name}"]:checked`)) filled++;
    });
    return filled;
  }

  function update() {
    const filled = countFilled();
    const pct = Math.round((filled / total) * 100);
    fill.style.width = pct + '%';
    if (label) label.textContent = `${filled} / ${total} field terisi`;
  }

  allInputs.forEach(el => el.addEventListener('input', update));
  form.querySelectorAll('input[type="radio"]').forEach(el => el.addEventListener('change', update));
  update();
}


/* ================================================================
   SUBMIT HANDLER
   ================================================================ */
function initSubmit(form) {
  const btn = form.querySelector('.btn-primary');
  if (!btn) return;

  form.addEventListener('submit', (e) => {
    const valid = validateForm(form);

    if (!valid) {
      e.preventDefault();
      showToast('Harap lengkapi semua field sebelum melanjutkan.', 'error');

      // Scroll to first invalid field
      const firstInvalid = form.querySelector('.invalid, select[style*="red"]');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    // Show loading state
    btn.disabled = true;
    btn.classList.add('loading');
    const labelEl = btn.querySelector('.btn-label');
    if (labelEl) labelEl.textContent = 'Menganalisis...';
  });
}


/* ================================================================
   INLINE VALIDATION (on blur)
   ================================================================ */
function initInlineValidation(form) {
  form.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('blur', () => validateNumber(input));
    input.addEventListener('input', debounce(() => {
      if (input.classList.contains('invalid')) validateNumber(input);
    }, 400));
  });

  form.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', () => validateSelect(select));
  });
}


/* ================================================================
   BMI HELPER (auto-compute from height+weight if available)
   ================================================================ */
function initBmiHelper() {
  // The form doesn't have height/weight separately, but we can
  // show a visual indicator when BMI is entered.
  const bmiInput = document.querySelector('input[name="BMI"]');
  if (!bmiInput) return;

  const bmiCategories = [
    { max: 18.5, label: 'Berat Badan Kurang', color: '#60A5FA' },
    { max: 24.9, label: 'Normal',              color: '#4ADE80' },
    { max: 29.9, label: 'Kelebihan Berat',     color: '#FACC15' },
    { max: Infinity, label: 'Obesitas',         color: '#F87171' },
  ];

  const hint = bmiInput.closest('.field')?.querySelector('.field-hint');

  bmiInput.addEventListener('input', () => {
    const val = parseFloat(bmiInput.value);
    if (!hint || isNaN(val)) return;
    const cat = bmiCategories.find(c => val < c.max);
    if (cat) {
      hint.innerHTML = `<span style="color:${cat.color}">● ${cat.label}</span>`;
    }
  });
}


/* ================================================================
   RESULT PAGE: ANIMATE DATA ITEMS
   ================================================================ */
function initResultAnimations() {
  const items = document.querySelectorAll('.data-item');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = `slideUp 0.4s ${i * 0.04}s ease both`;
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  items.forEach(item => observer.observe(item));
}


/* ================================================================
   RESULT PAGE: PRINT BUTTON
   ================================================================ */
function initPrint() {
  const printBtn = document.querySelector('[data-print]');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}


/* ================================================================
   RESULT PAGE: COUNTER ANIMATION FOR CONFIDENCE %
   ================================================================ */
function initConfidenceCounter() {
  const el = document.querySelector('.confidence-pct[data-target]');
  if (!el) return;

  const target = parseFloat(el.dataset.target);
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = (eased * target).toFixed(1) + '%';
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}


/* ================================================================
   KEYBOARD NAVIGATION ENHANCEMENTS
   ================================================================ */
function initKeyboardNav() {
  // Enter key on chip labels triggers the radio
  document.querySelectorAll('.chip').forEach(chip => {
    chip.setAttribute('tabindex', '0');
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const radio = chip.querySelector('input[type="radio"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    });
  });
}


/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');

  // ── Index page ──
  if (form) {
    initSlider();
    initProgressBar(form);
    initInlineValidation(form);
    initSubmit(form);
    initBmiHelper();
    initKeyboardNav();
  }

  // ── Result page ──
  initResultAnimations();
  initPrint();
  initConfidenceCounter();
});
