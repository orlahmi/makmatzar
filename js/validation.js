/* validation.js — form validation */
'use strict';

window.Validation = (function() {

  const MESSAGES = {
    required: 'שדה חובה',
    minLength: (n) => `מינימום ${n} תווים`,
    maxLength: (n) => `מקסימום ${n} תווים`,
    milNum: 'מספר אישי לא תקין (7-8 ספרות)',
    nationalId: 'מספר ת.ז. לא תקין (9 ספרות)',
    phone: 'מספר טלפון לא תקין',
    email: 'כתובת דוא"ל לא תקינה',
    date: 'תאריך לא תקין',
    dateRange: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
    number: 'יש להכניס מספר תקין',
    positive: 'יש להכניס מספר חיובי',
    integer: 'יש להכניס מספר שלם',
    pattern: 'פורמט לא תקין',
  };

  function validateField(value, rules) {
    if (!rules) return null;

    // required
    if (rules.required && (value === '' || value == null)) {
      return MESSAGES.required;
    }

    if (!value && !rules.required) return null;

    const v = String(value).trim();

    if (rules.minLength && v.length < rules.minLength) return MESSAGES.minLength(rules.minLength);
    if (rules.maxLength && v.length > rules.maxLength) return MESSAGES.maxLength(rules.maxLength);
    if (rules.milNum && !Utils.isValidMilNum(v)) return MESSAGES.milNum;
    if (rules.nationalId && !Utils.isValidNationalId(v)) return MESSAGES.nationalId;
    if (rules.phone && !Utils.isValidPhone(v)) return MESSAGES.phone;
    if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return MESSAGES.email;
    if (rules.number && isNaN(Number(v))) return MESSAGES.number;
    if (rules.positive && Number(v) <= 0) return MESSAGES.positive;
    if (rules.integer && !Number.isInteger(Number(v))) return MESSAGES.integer;
    if (rules.min != null && Number(v) < rules.min) return `מינימום: ${rules.min}`;
    if (rules.max != null && Number(v) > rules.max) return `מקסימום: ${rules.max}`;
    if (rules.pattern && !rules.pattern.test(v)) return MESSAGES.pattern;
    if (rules.custom) {
      const err = rules.custom(value);
      if (err) return err;
    }

    return null;
  }

  function showFieldError(field, message) {
    if (!field) return;
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');

    let errEl = field.parentNode.querySelector('.form-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'form-error';
      field.parentNode.appendChild(errEl);
    }
    errEl.innerHTML = Utils.icon('x', 12) + ' ' + Utils.escHtml(message);
  }

  function clearFieldError(field) {
    if (!field) return;
    field.classList.remove('is-invalid');
    const errEl = field.parentNode.querySelector('.form-error');
    if (errEl) errEl.remove();
  }

  function showFieldSuccess(field) {
    if (!field) return;
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    const errEl = field.parentNode.querySelector('.form-error');
    if (errEl) errEl.remove();
  }

  function validateForm(formEl, schema) {
    const errors = {};
    let isValid = true;

    Object.entries(schema).forEach(([name, rules]) => {
      const field = formEl.querySelector('[name="' + name + '"]') ||
                    formEl.querySelector('#' + name);
      if (!field) return;

      const value = field.type === 'checkbox' ? field.checked : field.value;
      const error = validateField(value, rules);

      if (error) {
        errors[name] = error;
        showFieldError(field, error);
        isValid = false;
      } else {
        clearFieldError(field);
      }
    });

    return { isValid, errors };
  }

  function clearForm(formEl) {
    const fields = formEl.querySelectorAll('.form-control, input, select, textarea');
    fields.forEach(f => {
      f.classList.remove('is-invalid', 'is-valid');
    });
    formEl.querySelectorAll('.form-error').forEach(e => e.remove());
  }

  function setupLiveValidation(formEl, schema) {
    Object.entries(schema).forEach(([name, rules]) => {
      const field = formEl.querySelector('[name="' + name + '"]') ||
                    formEl.querySelector('#' + name);
      if (!field) return;

      const validate = Utils.debounce(() => {
        const value = field.type === 'checkbox' ? field.checked : field.value;
        const error = validateField(value, rules);
        if (error) {
          showFieldError(field, error);
        } else {
          clearFieldError(field);
        }
      }, 400);

      field.addEventListener('blur', validate);
      field.addEventListener('input', validate);
    });
  }

  return {
    validateField, validateForm, clearForm, setupLiveValidation,
    showFieldError, clearFieldError, showFieldSuccess,
    MESSAGES
  };
})();
