/**
 * Client-Side Password Length & Complexity Authenticator
 * Direct frontend validation preventing backend roundtrips when format criteria are unmet.
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('password');
  const passwordErrorBox = document.getElementById('frontendPasswordError');
  const strengthFill = document.getElementById('pwStrengthFill');

  const ruleLength = document.getElementById('rule-length');
  const ruleUpper = document.getElementById('rule-upper');
  const ruleNumber = document.getElementById('rule-number');
  const ruleSpecial = document.getElementById('rule-special');

  if (passwordInput && (ruleLength || passwordErrorBox)) {
    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;

      const hasLength = val.length >= 8;
      const hasUpper = /[A-Z]/.test(val);
      const hasNumber = /[0-9]/.test(val);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);

      // Update UI checklist if present
      if (ruleLength) toggleRule(ruleLength, hasLength);
      if (ruleUpper) toggleRule(ruleUpper, hasUpper);
      if (ruleNumber) toggleRule(ruleNumber, hasNumber);
      if (ruleSpecial) toggleRule(ruleSpecial, hasSpecial);

      // Calculate score
      let score = 0;
      if (hasLength) score++;
      if (hasUpper) score++;
      if (hasNumber) score++;
      if (hasSpecial) score++;

      if (strengthFill) {
        const widths = ['0%', '25%', '50%', '75%', '100%'];
        const colors = ['#e5e7eb', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
        strengthFill.style.width = widths[score];
        strengthFill.style.backgroundColor = colors[score];
      }

      if (passwordErrorBox && (hasLength && hasUpper && hasNumber && hasSpecial)) {
        passwordErrorBox.style.display = 'none';
        passwordInput.classList.remove('is-invalid');
      }
    });
  }

  function toggleRule(element, isValid) {
    if (isValid) {
      element.classList.add('valid');
      element.classList.remove('invalid');
      const icon = element.querySelector('.rule-icon');
      if (icon) icon.textContent = '✓';
    } else {
      element.classList.remove('valid');
      element.classList.add('invalid');
      const icon = element.querySelector('.rule-icon');
      if (icon) icon.textContent = '○';
    }
  }

  // Intercept registration form submission with instant client-side validation
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      const val = passwordInput.value;
      const hasLength = val.length >= 8;
      const hasUpper = /[A-Z]/.test(val);
      const hasNumber = /[0-9]/.test(val);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);

      if (!hasLength || !hasUpper || !hasNumber || !hasSpecial) {
        e.preventDefault();
        e.stopPropagation();

        if (passwordErrorBox) {
          passwordErrorBox.style.display = 'block';
          passwordErrorBox.innerHTML = `
            <strong>Password Format Requirement:</strong>
            ${!hasLength ? 'Password must be at least 8 characters long. ' : ''}
            ${!hasUpper ? 'Must include at least 1 uppercase letter. ' : ''}
            ${!hasNumber ? 'Must include at least 1 number. ' : ''}
            ${!hasSpecial ? 'Must include at least 1 special symbol. ' : ''}
          `;
        }

        passwordInput.classList.add('is-invalid');
        passwordInput.focus();
        return false;
      }
    });
  }

  // Intercept login form if password is empty or below basic format
  if (loginForm && passwordInput) {
    loginForm.addEventListener('submit', (e) => {
      const val = passwordInput.value;
      if (val.length < 8) {
        e.preventDefault();
        if (passwordErrorBox) {
          passwordErrorBox.style.display = 'block';
          passwordErrorBox.textContent = 'Frontend Validation: Password must be at least 8 characters in length.';
        }
        passwordInput.classList.add('is-invalid');
        passwordInput.focus();
        return false;
      }
    });
  }
});
