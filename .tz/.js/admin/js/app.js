import { auth, onAuthStateChanged, signOut } from './firebase.js';
import { ADMIN_EMAILS } from './admin-config.js';
import { renderDashboard } from './dashboard.js';
import { renderMembers } from './members.js';
import { renderTeam } from './team.js';
import { renderDonors } from './donors.js';
import { renderNotices } from './notices.js';
import { renderEvents } from './events.js';

var VIEWS = {
  dashboard: { title: 'ড্যাশবোর্ড', sub: 'রূপসা জনকল্যাণ ফাউন্ডেশন — সম্পূর্ণ প্রজেক্ট ব্যবস্থাপনা', render: renderDashboard },
  members: { title: 'আবেদন / সদস্য ফরম', sub: 'যারা ফরম সাবমিট করেছেন তাদের তালিকা, স্ট্যাটাস ও প্রোফাইল ছবি নিয়ন্ত্রণ', render: renderMembers },
  team: { title: 'কমিটি সদস্য', sub: '#/member পেজে যা দেখানো হয় তা এখান থেকে নিয়ন্ত্রণ করুন', render: renderTeam },
  donors: { title: 'দাতাগণ', sub: '#/donors পেজে যা দেখানো হয় তা এখান থেকে নিয়ন্ত্রণ করুন', render: renderDonors },
  notices: { title: 'নোটিশ / ঘোষণা', sub: 'সদস্য লগইন ড্যাশবোর্ডে যা দেখানো হয় তা এখান থেকে নিয়ন্ত্রণ করুন', render: renderNotices },
  events: { title: 'আসন্ন ইভেন্ট', sub: 'সদস্য লগইন ড্যাশবোর্ডে যা দেখানো হয় তা এখান থেকে নিয়ন্ত্রণ করুন', render: renderEvents }
};

function setActiveNav(route) {
  document.querySelectorAll('.nav-item[data-route]').forEach(function (el) {
    el.classList.toggle('active', el.dataset.route === route);
  });
}

function route() {
  var hash = (window.location.hash || '#dashboard').replace('#', '');
  var view = VIEWS[hash] || VIEWS.dashboard;
  document.getElementById('pageTitle').textContent = view.title;
  document.getElementById('pageSub').textContent = view.sub;
  setActiveNav(VIEWS[hash] ? hash : 'dashboard');
  document.getElementById('sidebar').classList.remove('open');
  view.render(document.getElementById('viewRoot'));
}

window.addEventListener('hashchange', route);

document.querySelectorAll('.nav-item[data-route]').forEach(function (el) {
  el.addEventListener('click', function () {
    window.location.hash = '#' + el.dataset.route;
  });
});

document.getElementById('menuToggle').addEventListener('click', function () {
  document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  signOut(auth).then(function () { window.location.href = 'login.html'; });
});

onAuthStateChanged(auth, function (user) {
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('whoAmI').innerHTML = '<i class="fa-solid fa-user-shield"></i> ' + user.email;
  route();
});
