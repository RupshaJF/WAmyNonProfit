/* verify.html — URL থেকে মেম্বার আইডি বের করা ও নম্বর মাস্ক করা */

export const getMemberId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    if (!id) {
        const pathParts = window.location.pathname.split('/');
        id = pathParts[pathParts.length - 1];
        if (id === 'verify.html' || id === '') return null;
    }
    if (!id) return null;
    id = id.trim().toUpperCase();
    /* শুধু A-Z, 0-9 ও ড্যাশ — এর বাইরে কিছু থাকলে আইডি ধরাই হয় না (HTML/পাথ ইনজেকশন বন্ধ) */
    return /^[A-Z0-9-]{3,40}$/.test(id) ? id : null;
};

export const maskMobile = (number) => {
    if (!number || number.length < 11) return number;
    return number.substring(0, 3) + '*****' + number.substring(number.length - 3);
};
