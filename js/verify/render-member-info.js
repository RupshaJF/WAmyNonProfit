/* verify.html — ভেরিফাইড কার্ডের ভেতরে মেম্বারের তথ্য (নাম, পেশা, রক্তের গ্রুপ ইত্যাদি) সাজিয়ে দেখানো */
import { dictionary } from './dictionary.js';
import { maskMobile } from './member-id.js';

/* ডেটাবেসের লেখা কখনো HTML হিসেবে চলবে না */
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const renderDynamicInfo = (data, lang) => {
    const infoContainer = document.getElementById('member-info-container');
    const dict = dictionary[lang];

    const createRow = (icon, labelKey, value, valueClass = 'text-gray-800 dark:text-gray-200') => `
        <div class="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
            <span class="text-gray-500 dark:text-gray-400 text-sm flex items-center">
                <i class="fas ${icon} w-5 text-gray-400 dark:text-gray-500"></i> ${dict[icon] || labelKey}
            </span>
            <span class="font-semibold text-right ${valueClass}">${esc(value) || '---'}</span>
        </div>
    `;

    infoContainer.innerHTML = `
        ${createRow('fa-user', 'নাম', data.full_name)}
        ${createRow('fa-briefcase', 'পেশা', data.occupation)}
        ${createRow('fa-star', 'সদস্যপদ ধরন', data.membership_type, 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-slate-700 px-2 py-0.5 rounded')}
        ${createRow('fa-droplet', 'রক্তের গ্রুপ', data.blood_group, 'text-red-600 dark:text-red-400 font-bold')}
        ${createRow('fa-venus-mars', 'লিঙ্গ', data.gender)}
        ${createRow('fa-phone', 'মোবাইল নম্বর', maskMobile(data.mobile_number))}
        ${createRow('fa-location-dot', 'ঠিকানা', data.permanent_address)}
    `;
};
