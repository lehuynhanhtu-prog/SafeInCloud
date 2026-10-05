const $=id=>document.getElementById(id);
const media=matchMedia('(max-width:650px)'),forced=new URLSearchParams(location.search).get('mode')==='app';
let screen='vault',afterBack=null;
const nav=document.createElement('nav');nav.className='mobile-nav';nav.setAttribute('aria-label','Điều hướng ứng dụng');
const back=document.createElement('button');back.className='mobile-back';back.type='button';back.textContent='‹ Quay lại';back.onclick=()=>history.back();$('detail').before(back);
const panel=document.createElement('section');panel.className='mobile-data';panel.innerHTML='<p class="eyebrow">DỮ LIỆU & BẢO MẬT</p><h2>Quản lý kho</h2><p class="hint">Sao lưu mã hóa và sử dụng cùng kho trên các thiết bị.</p>'; 
const groups=[['Đồng bộ Google Drive','sync'],['Nhập file CSV','import'],['Sao lưu mã hóa','backup'],['Khôi phục bản sao','restore'],['Khóa kho ngay','lock']];
for(const [label,id]of groups){const b=document.createElement('button');b.type='button';b.textContent=label+'  ›';b.onclick=()=>$(id).click();panel.append(b)}
$('workspace').append(panel,nav);
function show(next){screen=next;document.body.dataset.mobileScreen=next;for(const b of nav.children)b.setAttribute('aria-current',String(b.dataset.screen===next));if(next==='vault')$('view-title').textContent='Kho mật khẩu';}
for(const [label,name,icon]of [['Kho','vault','▤'],['Phân loại','categories','▦'],['Dữ liệu','data','⇄']]){const b=document.createElement('button');b.type='button';b.dataset.screen=name;const i=document.createElement('span');i.textContent=icon;i.setAttribute('aria-hidden','true');b.append(i,document.createTextNode(label));b.onclick=()=>{if(screen==='detail'){afterBack=name;history.back()}else show(name)};nav.append(b)}
function apply(){document.body.classList.toggle('app-mode',forced||media.matches);show(screen)}media.addEventListener('change',apply);apply();
window.addEventListener('vault-detail',()=>{if(!document.body.classList.contains('app-mode'))return;if(screen!=='detail')history.pushState({safeincloudDetail:true},'');show('detail');window.scrollTo(0,0)});
window.addEventListener('popstate',()=>{show(afterBack||'vault');afterBack=null;window.scrollTo(0,0)});
$('categories').addEventListener('click',e=>{if(e.target.closest('button'))show('vault')});
new MutationObserver(()=>{if($('workspace').hidden)show('vault')}).observe($('workspace'),{attributes:true,attributeFilter:['hidden']});
