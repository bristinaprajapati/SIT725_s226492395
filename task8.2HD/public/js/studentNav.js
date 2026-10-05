
(function () {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }

  if (!user || user.role !== 'student' || !localStorage.getItem('token')) {
    return;
  }

  const links = [
    { label: 'Dashboard', href: '/student/dashboard.html' },
    { label: 'Rooms', href: '/index.html' },
    { label: 'Apply', href: '/application.html#apply' },
    { label: 'Track Application', href: '/application.html#track' },
    { label: 'Complaints', href: '/complaints.html' },
  ];

  // Styles are prefixed with "sn-" so they do not clash with each page's own CSS
  const style = document.createElement('style');
  style.textContent = `
    body.sn-has-nav { padding-left: 260px !important; }
    .sn-sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
      background: #1e293b; color: #fff; padding: 24px 16px;
      display: flex; flex-direction: column; justify-content: space-between;
      font-family: Arial, sans-serif; z-index: 1000; box-sizing: border-box;
    }
    .sn-sidebar h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 4px; color: #fff; }
    .sn-sidebar p { color: #94a3b8; font-size: 0.875rem; margin: 0 0 24px; word-break: break-all; }
    .sn-sidebar ul { list-style: none; padding: 0; margin: 0; }
    .sn-sidebar li { margin-bottom: 8px; }
    .sn-sidebar a {
      display: block; padding: 10px 14px; color: #94a3b8; text-decoration: none;
      border-radius: 6px; font-weight: 500; font-size: 0.95rem;
    }
    .sn-sidebar a:hover, .sn-sidebar a.sn-active { background: #0f172a; color: #fbfbfb; }
    .sn-logout {
      width: 100%; padding: 10px; background: #ef4444; color: #fff; border: none;
      border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.95rem;
    }
    .sn-logout:hover { background: #dc2626; }
    @media (max-width: 768px) {
      body.sn-has-nav { padding-left: 0 !important; }
      .sn-sidebar { position: static; width: 100%; padding: 16px; }
      .sn-sidebar ul { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      .sn-sidebar li { margin: 0; }
    }
  `;
  document.head.appendChild(style);

  const aside = document.createElement('aside');
  aside.className = 'sn-sidebar';

  const top = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = 'Student Portal';
  const who = document.createElement('p');
  who.textContent = user.name || user.email || 'Student';
  top.append(title, who);

  const list = document.createElement('ul');
  links.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;
    li.appendChild(a);
    list.appendChild(li);
  });
  top.appendChild(list);

  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'sn-logout';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  });

  aside.append(top, logoutBtn);
  document.body.prepend(aside);
  document.body.classList.add('sn-has-nav');

  // Highlight the link for the page (and section) the student is on
  function markActive() {
    const here = window.location.pathname + window.location.hash;
    const path = window.location.pathname;
    list.querySelectorAll('a').forEach((a) => {
      const target = new URL(a.href);
      const exact = target.pathname + target.hash === here;
      const samePageNoHash =
        target.pathname === path && !window.location.hash &&
        (target.hash === '' || target.hash === '#apply');
      a.classList.toggle('sn-active', exact || samePageNoHash);
    });
  }
  markActive();
  window.addEventListener('hashchange', markActive);
})();