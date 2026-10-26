const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function classifyImportedItem({tags=[],url='',login=''}){
 const hint=normalize(Array.isArray(tags)?tags.join(' '):tags);
 if(/\b(credit cards?|credit card|card|the tin dung)\b/.test(hint))return 'Thẻ tín dụng';
 if(/\b(door lock|khoa cua)\b/.test(hint))return 'Khóa cửa';
 if(/\b(bank|banking|ngan hang)\b/.test(hint))return 'Bank';
 if(/\b(web logins?|web|website)\b/.test(hint)||String(url||'').trim())return 'WEB';
 if(/\b(email|e-mail|email accts?|mail)\b/.test(hint)||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(login||'').trim()))return 'Email';
 if(/\b(forum|memberships?)\b/.test(hint))return 'WEB';
 return 'APP';
}
