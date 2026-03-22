/**
 * auth.js — handles login and register form submissions
 */

const isLoginPage    = document.getElementById('loginForm')    !== null;
const isRegisterPage = document.getElementById('registerForm') !== null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
}
function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Please wait…';
  } else {
    btn.disabled = false;
    btn.innerHTML = isLoginPage ? 'Sign In' : 'Create Account';
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
if (isLoginPage) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('loginBtn');

    if (!email || !password) {
      showToast('Please fill in all fields.'); return;
    }

    setLoading(btn, true);
    try {
      const res  = await fetch('php/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Welcome back, ' + data.name + '! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'canvas.html'; }, 900);
      } else {
        showToast(data.error || 'Login failed. Please try again.');
        setLoading(btn, false);
      }
    } catch (err) {
      showToast('Network error. Is the server running?');
      setLoading(btn, false);
    }
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────
if (isRegisterPage) {
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('registerBtn');

    if (!name || !email || !password) {
      showToast('Please fill in all fields.'); return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.'); return;
    }

    setLoading(btn, true);
    try {
      const res  = await fetch('php/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Account created! Redirecting to login…', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      } else {
        showToast(data.error || 'Registration failed. Please try again.');
        setLoading(btn, false);
      }
    } catch (err) {
      showToast('Network error. Is the server running?');
      setLoading(btn, false);
    }
  });
}
