/*
================================================================
✏️ ÚPRAVA OBSAHU WEBU – TADY ZAČNI
================================================================
👩‍🏫 LEKTOŘI  → jména, popisy a obrázky
📚 KURZY      → názvy, popisy a ceny
🛍️ PRODUKTY   → názvy, obrázky, popisy a ceny
💳 PŘEDPLATNÉ → Start / Plus / Premium
📧 OBJEDNÁVKY → ORDER_EMAIL níže
⭐ RECENZE    → žádné ukázkové recenze; začíná se od nuly

Tato verze je stále DEMO: účty a další data používají localStorage.
================================================================
*/

// Nauč se - frontend demo
// PRO NASAZENÍ: změň ORDER_EMAIL na svůj skutečný e-mail.
// Pozn.: čistý HTML/CSS/JS neumí bezpečně provozovat skutečné účty a posílat e-maily bez backendu.
// Tato verze má funkční demo účty, recenze, košík a objednávkový mailto. Pro produkci doporučuji Supabase/Firebase + platební bránu.

// 📧 SEM NAPIŠ E-MAIL PRO OBJEDNÁVKY:
const ORDER_EMAIL = "objednavky@mojedoucovani.cz";

const lecturers = [
  {id:1,name:"Maru",emoji:"👩‍🏫",bio:"Matematika a čeština pro mladší školáky. Vysvětluje krok za krokem a bez zbytečného stresu.",tags:["Matematika","Čeština","1.–5. třída"]},
  {id:2,name:"Verča",emoji:"👩‍🏫",bio:"Pomáhá dětem s domácími úkoly, čtením a základy angličtiny. Ráda používá hry a příklady z běžného života.",tags:["Čeština","Angličtina","1.–5. třída"]},
  {id:3,name:"Jana",emoji:"🧑‍🏫",bio:"Specializuje se na matematiku a systematickou přípravu na přijímací zkoušky.",tags:["Matematika","Přijímačky","Procvičování"]},
  {id:4,name:"Amy",emoji:"👩‍🏫",bio:"Pomáhá s angličtinou a češtinou a vede žáky k tomu, aby se nebáli zeptat.",tags:["Angličtina","Čeština","1.–5. třída"]},
{name:"Anička", role:"Lektorka"}
];

const courses = [
  {id:"c1",type:"1-5",title:"Matematika 1.–5. třída",desc:"Základy počítání, slovní úlohy, geometrie a procvičování.",price:199,emoji:"➗",rating:0,reviews:0,lecturer:"Maru",subscription:"Start"},
  {id:"c2",type:"1-5",title:"Čeština hravě",desc:"Čtení, pravopis, větná stavba a zábavné procvičování.",price:199,emoji:"📚",rating:0,reviews:0,lecturer:"Verča",subscription:"Start"},
  {id:"c3",type:"1-5",title:"Angličtina pro školáky",desc:"Základní slovíčka, věty a krátká konverzace pro děti.",price:249,emoji:"🇬🇧",rating:0,reviews:0,lecturer:"Verča",subscription:"Plus"},
  {id:"c4",type:"prijimacky",title:"Přijímačky – matematika",desc:"Strukturované procvičování typových úloh a strategie řešení.",price:399,emoji:"🎯",rating:0,reviews:0,lecturer:"Jana",subscription:"Plus"},
  {id:"c5",type:"prijimacky",title:"Přijímačky – čeština",desc:"Porozumění textu, gramatika a systematická příprava.",price:399,emoji:"📝",rating:0,reviews:0,lecturer:"Verča",subscription:"Plus"},
  {id:"c6",type:"prijimacky",title:"Kompletní přijímačkový balíček",desc:"Matematika + čeština + bonusové materiály a kontrolní testy.",price:699,emoji:"🏆",rating:0,reviews:0,lecturer:"Jana + Verča",subscription:"Premium"}
];

const products = [
  {id:"p1",title:"Pracovní sešit Matematika 1.–5.",desc:"Barevný sešit s úlohami od základů po chytré slovní úlohy.",price:249,vat:21,emoji:"📒",delivery:"Fyzický produkt"},
  {id:"p2",title:"Kartičky – násobilka",desc:"Sada 60 kartiček pro rychlé a hravé procvičování násobilky.",price:149,vat:21,emoji:"🃏",delivery:"Fyzický produkt"},
  {id:"p3",title:"PDF balíček: 100 úloh",desc:"Digitální soubor s úlohami a řešeními pro domácí procvičování.",price:129,vat:21,emoji:"📄",delivery:"Digitální"},
  {id:"p4",title:"Přijímačky nanečisto",desc:"Kompletní testovací balíček pro simulaci zkoušky.",price:299,vat:21,emoji:"🎓",delivery:"Fyzický + PDF"},
  {id:"p5",title:"Samolepky za pokrok",desc:"Malá odměna za velký pokrok. Sada 40 motivačních samolepek.",price:99,vat:21,emoji:"⭐",delivery:"Fyzický produkt"},
  {id:"p6",title:"Taháček na gramatiku",desc:"Přehledný laminovaný list s nejdůležitějšími pravidly.",price:89,vat:21,emoji:"🧠",delivery:"Fyzický produkt"}
];

const materialSets = {
  guest: [
    {icon:"🔒",title:"Ukázkový pracovní list",desc:"Ukázka materiálu. Přihlaste se a odemkněte vlastní obsah.",locked:true}
  ],
  Start: [
    {icon:"📘",title:"Základy matematiky",desc:"Procvičování základních početních operací.",locked:false},
    {icon:"📝",title:"Český jazyk – pravopis",desc:"Krátká cvičení pro 1.–5. třídu.",locked:false},
    {icon:"🎲",title:"Hravé procvičování",desc:"Mini aktivity, které můžete vytisknout.",locked:false},
    {icon:"🔒",title:"Rozšířené testy",desc:"Dostupné od předplatného Plus.",locked:true}
  ],
  Plus: [
    {icon:"📘",title:"Základy matematiky",desc:"Procvičování základních početních operací.",locked:false},
    {icon:"📝",title:"Český jazyk – pravopis",desc:"Krátká cvičení pro 1.–5. třídu.",locked:false},
    {icon:"🎯",title:"Přijímačky – matematika",desc:"Typové úlohy a postupy řešení.",locked:false},
    {icon:"📚",title:"Přijímačky – čeština",desc:"Práce s textem a gramatika.",locked:false},
    {icon:"🧪",title:"Test nanečisto",desc:"Časově omezený zkušební test.",locked:false},
    {icon:"🔒",title:"Prémiové kontrolní testy",desc:"Dostupné od Premium.",locked:true}
  ],
  Premium: [
    {icon:"📘",title:"Základy matematiky",desc:"Procvičování základních početních operací.",locked:false},
    {icon:"📝",title:"Český jazyk – pravopis",desc:"Krátká cvičení pro 1.–5. třídu.",locked:false},
    {icon:"🎯",title:"Přijímačky – matematika",desc:"Typové úlohy a postupy řešení.",locked:false},
    {icon:"📚",title:"Přijímačky – čeština",desc:"Práce s textem a gramatika.",locked:false},
    {icon:"🧪",title:"Test nanečisto",desc:"Časově omezený zkušební test.",locked:false},
    {icon:"🏆",title:"Prémiové kontrolní testy",desc:"Kompletní sada kontrolních testů.",locked:false}
  ]
};

let state = {
  user: JSON.parse(localStorage.getItem("ct_user") || "null"),
  cart: JSON.parse(localStorage.getItem("ct_cart") || "[]"),
  // ⭐ Skutečné recenze kurzů – začínají úplně prázdné.
  reviews: JSON.parse(localStorage.getItem("ct_reviews") || "{}"),
  // 👩‍🏫 Skutečná hodnocení lektorů – také začínají úplně prázdná.
  lecturerReviews: JSON.parse(localStorage.getItem("ct_lecturer_reviews") || "{}")
};

// Pokud starší verze obsahovala předvyplněné recenze, smažeme je.
// Nová verze nezačíná žádným falešným hodnocením.
function cleanOldDemoReviews(){
  const hadLegacyCourseReviews = state.reviews && Object.keys(state.reviews).length > 0;
  if(hadLegacyCourseReviews){
    state.reviews = {};
    localStorage.setItem("ct_reviews","{}");
  }
}
cleanOldDemoReviews();

function save(){
  localStorage.setItem("ct_user",JSON.stringify(state.user));
  localStorage.setItem("ct_cart",JSON.stringify(state.cart));
  localStorage.setItem("ct_reviews",JSON.stringify(state.reviews));
  localStorage.setItem("ct_lecturer_reviews",JSON.stringify(state.lecturerReviews));
}
function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2800)}
function eur(v){return new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK",maximumFractionDigits:0}).format(v)}
function stars(r){return "★★★★★".slice(0,Math.round(r))+"☆☆☆☆☆".slice(0,5-Math.round(r))}
function allReviews(id){return state.reviews[id] || []}

function calcCourseRating(course){
  const custom=allReviews(course.id);
  if(!custom.length)return {rating:0,count:0};
  const sum=custom.reduce((a,r)=>a+r.rating,0);
  return {rating:sum/custom.length,count:custom.length};
}

function allLecturerReviews(id){return state.lecturerReviews[id] || []}

function calcLecturerRating(id){
  const reviews=allLecturerReviews(id);
  if(!reviews.length)return {rating:0,count:0};
  const sum=reviews.reduce((a,r)=>a+r.rating,0);
  return {rating:sum/reviews.length,count:reviews.length};
}

function courseCard(c){
  const rr=calcCourseRating(c);
  return `<article class="course-card">
    <div class="course-cover"><span class="badge">${c.type==="prijimacky"?"PŘIJÍMAČKY":"1.–5. TŘÍDA"}</span><span>${c.emoji}</span></div>
    <div class="course-body">
      <h3>${c.title}</h3><p>${c.desc}</p>
      <div class="rating">${rr.count ? `<span>${stars(rr.rating)}</span><small>${rr.rating.toFixed(1).replace(".",",")} • ${rr.count} hodnocení</small>` : `<small class="muted">⭐ Zatím bez hodnocení</small>`}</div>
      <small class="muted">Lektor: <b>${c.lecturer}</b> • Přístup: <b>${c.subscription}</b></small>
      <div class="price-row"><div class="price"><strong>${eur(c.price)}</strong><small>vč. DPH • měsíčně</small></div></div>
      <div class="card-actions"><button class="small-btn light" onclick="openCourse('${c.id}')">Recenze</button><button class="small-btn light" onclick="openReservation('${c.id}')">📅 Termín</button><button class="small-btn primary" onclick="addToCart('${c.id}','course')">Přidat do košíku</button></div>
    </div>
  </article>`
}


async function openReservation(courseId){
  const course=courses.find(c=>c.id===courseId);
  if(!course)return;
  showModal(`<button class="modal-close" onclick="closeModal()">×</button>
    <h2>📅 Rezervace doučování</h2>
    <p><b>${course.title}</b></p>
    <p class="muted">Vyberte termín. Každý termín má nejvýše 5 míst.</p>
    <div id="reservationSlots"><p>Načítám volné termíny…</p></div>`);
  try{
    const r=await fetch(`/api/slots?courseId=${encodeURIComponent(course.id)}`);
    const slots=await r.json();
    if(!r.ok)throw new Error(slots.error||"Termíny se nepodařilo načíst.");
    const box=document.getElementById("reservationSlots");
    if(!slots.length){
      box.innerHTML='<div class="no-access"><div style="font-size:40px">📭</div><h3>Momentálně nejsou vypsané volné termíny.</h3><p class="muted">Zkuste to prosím později.</p></div>';
      return;
    }
    box.innerHTML=`<div class="reservation-slot-list">${slots.map(s=>`
      <button class="reservation-slot" onclick="openReservationForm(${s.id})">
        <span><b>${new Date(s.startsAt).toLocaleString("cs-CZ",{dateStyle:"full",timeStyle:"short"})}</b><small>Lektor: ${s.lecturer}</small></span>
        <strong>${s.available}/${s.capacity} míst</strong>
      </button>`).join("")}</div>`;
  }catch(e){
    document.getElementById("reservationSlots").innerHTML=`<p class="error">${e.message}</p>`;
  }
}

async function openReservationForm(slotId){
  try{
    const r=await fetch("/api/slots");
    const slots=await r.json();
    const slot=slots.find(s=>s.id===slotId);
    if(!slot)throw new Error("Tento termín už není dostupný.");
    const name=state.user?.name||"";
    const email=state.user?.email||"";
    showModal(`<button class="modal-close" onclick="closeModal()">×</button>
      <h2>📝 Rezervace termínu</h2>
      <p><b>${slot.courseTitle}</b><br>${new Date(slot.startsAt).toLocaleString("cs-CZ",{dateStyle:"full",timeStyle:"short"})}<br>Lektor: <b>${slot.lecturer}</b></p>
      <form onsubmit="submitReservation(event,${slot.id})" class="form-grid">
        <label>Jméno a příjmení<input name="name" value="${name.replace(/"/g,"&quot;")}" required></label>
        <label>E-mail<input type="email" name="email" value="${email.replace(/"/g,"&quot;")}" required></label>
        <label>Telefon<input name="phone"></label>
        <button class="btn primary full" type="submit">Rezervovat místo</button>
      </form>`);
  }catch(e){showToast(e.message)}
}

async function submitReservation(e,slotId){
  e.preventDefault();
  const fd=new FormData(e.target);
  try{
    const r=await fetch("/api/reservations",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({slotId,name:fd.get("name"),email:fd.get("email"),phone:fd.get("phone")})
    });
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Rezervace se nepodařila vytvořit.");
    showModal(`<button class="modal-close" onclick="closeModal()">×</button>
      <div class="success-box"><div style="font-size:55px">✅</div>
      <h2>Rezervace je hotová</h2>
      <p>Číslo rezervace: <b>${data.reservationNumber}</b></p>
      <p>Na váš e-mail vám pošleme informace k připojení, jakmile administrátor doplní Google Meet.</p>
      <button class="btn primary" onclick="closeModal()">Hotovo</button></div>`);
  }catch(err){showToast(err.message)}
}

function renderHome(){document.getElementById("homeCourses").innerHTML=courses.slice(0,3).map(courseCard).join("")}
function renderCourses(filter="all"){
  document.getElementById("coursesGrid").innerHTML=courses.filter(c=>filter==="all"||c.type===filter).map(courseCard).join("");
  document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter))
}
function renderReservationCourses(){
  const box=document.getElementById("reservationCourses");
  if(!box)return;
  box.innerHTML=courses.map(c=>`<article class="course-card">
    <div class="course-cover"><span class="badge">${c.type==="prijimacky"?"PŘIJÍMAČKY":"1.–5. TŘÍDA"}</span><span>${c.emoji}</span></div>
    <div class="course-body"><h3>${c.title}</h3><p>${c.desc}</p>
    <small class="muted">Kurz vede: <b>${c.lecturer}</b></small>
    <div class="card-actions"><button class="small-btn primary" onclick="openReservation('${c.id}')">📅 Vybrat termín</button></div>
    </div></article>`).join("");
}

function renderLecturers(){
  document.getElementById("lectorsGrid").innerHTML=lecturers.map(l=>{
    const rr=calcLecturerRating(l.id);
    return `<article class="lector-card">
      <div class="lector-avatar">${l.emoji}</div>
      <h3>${l.name}</h3>
      <p>${l.bio}</p>
      <div class="tags">${l.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>
      <div class="rating">${rr.count ? `<span>${stars(rr.rating)}</span><small>${rr.rating.toFixed(1).replace(".",",")} • ${rr.count} hodnocení</small>` : `<small class="muted">⭐ Zatím bez hodnocení</small>`}</div>
      <button class="small-btn primary" onclick="openLecturer(${l.id})">Podrobnosti a hodnocení</button>
    </article>`;
  }).join("")
}
function productCard(p){
  const priceWithVat=p.price*(1+p.vat/100);
  return `<article class="product-card"><div class="product-image">${p.emoji}</div><div class="product-body"><div class="product-meta"><span>${p.delivery}</span></div><h3>${p.title}</h3><p>${p.desc}</p><div class="price-row"><div class="price"><strong>${eur(priceWithVat)}</strong><small>bez DPH: ${eur(p.price)}</small></div><button class="small-btn primary" onclick="addToCart('${p.id}','product')">Koupit</button></div></div></article>`
}
function renderProducts(){document.getElementById("productsGrid").innerHTML=products.map(productCard).join("")}

function renderMaterials(){
  const box=document.getElementById("materialsContent");
  if(!state.user){box.innerHTML=`<div class="materials-wrap"><div class="no-access"><div style="font-size:55px">🔐</div><h2>Materiály jsou za přihlášením</h2><p class="muted">Vytvořte si účet nebo se přihlaste, aby se zobrazilo vaše předplatné a dostupný obsah.</p><button class="btn primary" onclick="openAuth('login')">Přihlásit se</button></div></div>`;return}
  const sub=state.user.subscription||"Start";
  const mats=materialSets[sub]||materialSets.Start;
  box.innerHTML=`<div class="materials-wrap">
    <div class="subscription-card"><div><span class="eyebrow">Aktivní předplatné</span><h2>${sub}</h2><p>${sub==="Start"?"Základní materiály pro 1.–5. třídu.":sub==="Plus"?"Rozšířené materiály a příprava na přijímačky.":"Kompletní přístup ke všem materiálům."}</p></div><button class="btn secondary" onclick="openSubscriptions()">Změnit předplatné</button></div>
    <div class="material-grid">${mats.map(m=>`<article class="material ${m.locked?"locked":""}"><div class="material-icon">${m.icon}</div><h3>${m.title}</h3><p>${m.desc}</p>${m.locked?'<span class="lock-note">🔒 Odemkne vyšší předplatné</span>':'<button class="small-btn light" onclick="showToast(\'Materiál je připraven k otevření – napoj zde vlastní PDF/odkaz.\')">Otevřít materiál</button>'}</article>`).join("")}</div>
  </div>`
}

function updateHeader(){document.getElementById("accountLabel").textContent=state.user?state.user.name:"Přihlásit";document.getElementById("cartCount").textContent=state.cart.reduce((s,x)=>s+x.qty,0)}
function addToCart(id,type){const item=(type==="course"?courses:products).find(x=>x.id===id);const key=type+"_"+id;const found=state.cart.find(x=>x.key===key);if(found)found.qty++;else state.cart.push({key,id,type,qty:1});save();updateHeader();showToast(`${item.title} byl přidán do košíku.`)}
function removeCart(key){state.cart=state.cart.filter(x=>x.key!==key);save();updateHeader();openCart()}
function changeQty(key,delta){const item=state.cart.find(x=>x.key===key);if(!item)return;item.qty+=delta;if(item.qty<=0)state.cart=state.cart.filter(x=>x.key!==key);save();updateHeader();openCart()}

function openCart(){
  const rows=state.cart.map(x=>{const list=x.type==="course"?courses:products;const item=list.find(i=>i.id===x.id);const price=x.type==="course"?item.price:item.price*(1+item.vat/100);return {...x,item,price}})
  const total=rows.reduce((s,x)=>s+x.price*x.qty,0);
  showModal(`<button class="modal-close" onclick="closeModal()">×</button><h2>🛒 Košík</h2>${rows.length?`<div class="cart-list">${rows.map(x=>`<div class="cart-item"><div><b>${x.item.title}</b><p>${x.type==="course"?"Kurz":"Produkt"} • ${eur(x.price)}</p></div><div class="qty"><button onclick="changeQty('${x.key}',-1)">−</button><b>${x.qty}</b><button onclick="changeQty('${x.key}',1)">+</button></div><button class="small-btn light" onclick="removeCart('${x.key}')">×</button></div>`).join("")}</div><div class="total"><span>Celkem</span><span>${eur(total)}</span></div><button class="btn primary full" style="margin-top:18px" onclick="openCheckout()">Pokračovat k objednávce</button>`:`<div class="cart-empty">Košík je zatím prázdný.<br><br><a class="btn primary" href="#courses" data-route onclick="closeModal()">Prohlédnout kurzy</a></div>`}`)
}

function showModal(content){document.getElementById("modal").innerHTML=content;document.getElementById("modalBackdrop").classList.add("open")}
function closeModal(){document.getElementById("modalBackdrop").classList.remove("open")}
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()})

function openAuth(mode="login"){
  showModal(`<button class="modal-close" onclick="closeModal()">×</button><h2>${mode==="login"?"👋 Vítejte zpět":"✨ Vytvořit účet"}</h2>
    <form class="form" onsubmit="submitAuth(event,'${mode}')">
      ${mode==="register"?'<label>Jméno<input name="name" required placeholder="Např. Jana Nováková"></label>':''}
      <label>E-mail<input name="email" type="email" required placeholder="vas@email.cz"></label>
      <label>Heslo<input name="password" type="password" required minlength="4" placeholder="Min. 4 znaky"></label>
      <div id="authError" class="error"></div>
      <button class="btn primary full">${mode==="login"?"Přihlásit se":"Vytvořit účet"}</button>
      <button type="button" class="btn secondary full" onclick="openAuth('${mode==="login"?"register":"login"}')">${mode==="login"?"Nemám účet – registrovat":"Už mám účet – přihlásit"}</button>
    </form>`)
}
function submitAuth(e,mode){
  e.preventDefault();const fd=new FormData(e.target);const email=fd.get("email").toLowerCase().trim();const users=JSON.parse(localStorage.getItem("ct_users")||"[]");
  if(mode==="register"){
    if(users.some(u=>u.email===email)){document.getElementById("authError").textContent="Tento e-mail už je registrovaný.";return}
    const u={name:fd.get("name"),email,password:fd.get("password"),subscription:"Start"};users.push(u);localStorage.setItem("ct_users",JSON.stringify(users));state.user={name:u.name,email:u.email,subscription:u.subscription};save();closeModal();updateHeader();renderMaterials();showToast("Účet byl vytvořen. Vítejte v ChytréTřídě!");return
  }
  const u=users.find(x=>x.email===email&&x.password===fd.get("password"));if(!u){document.getElementById("authError").textContent="E-mail nebo heslo nesouhlasí.";return}
  state.user={name:u.name,email:u.email,subscription:u.subscription||"Start"};save();closeModal();updateHeader();renderMaterials();showToast("Úspěšně přihlášeno.")
}
function logout(){state.user=null;save();updateHeader();renderMaterials();closeModal();showToast("Byli jste odhlášeni.")}
function account(){
  if(!state.user){openAuth("login");return}
  showModal(`<button class="modal-close" onclick="closeModal()">×</button><h2>👤 Můj účet</h2><p><b>${state.user.name}</b><br><span class="muted">${state.user.email}</span></p><div class="subscription-card"><div><b>Aktivní předplatné</b><p>${state.user.subscription}</p></div><button class="btn secondary" onclick="openSubscriptions()">Změnit</button></div><button class="btn secondary full" onclick="logout()">Odhlásit se</button>`)
}
function openSubscriptions(){
  showModal(`<button class="modal-close" onclick="closeModal()">×</button><h2>Vyberte předplatné</h2><div style="display:grid;gap:12px">${["Start","Plus","Premium"].map((s,i)=>`<div class="subscription-card" style="margin:0"><div><b>${s}</b><p>${i===0?"Základy a 1.–5. třída":i===1?"Rozšířený obsah + přijímačky":"Všechny materiály a testy"}</p></div><button class="btn ${state.user?.subscription===s?"secondary":"primary"}" onclick="selectSubscription('${s}')">${state.user?.subscription===s?"Aktivní":"Vybrat"}</button></div>`).join("")}</div>`)
}
function selectSubscription(s){if(!state.user){openAuth("login");return}state.user.subscription=s;const users=JSON.parse(localStorage.getItem("ct_users")||"[]");const u=users.find(x=>x.email===state.user.email);if(u)u.subscription=s;localStorage.setItem("ct_users",JSON.stringify(users));save();closeModal();renderMaterials();showToast(`Předplatné ${s} bylo nastaveno.`)}

function openCheckout(){
  if(!state.cart.length){showToast("Košík je prázdný.");return}
  if(!state.user){closeModal();openAuth("login");showToast("Pro dokončení objednávky se nejdřív přihlaste.");return}

  const rows=state.cart.map(x=>{
    const list=x.type==="course"?courses:products;
    const item=list.find(i=>i.id===x.id);
    const price=x.type==="course"?item.price:item.price*(1+item.vat/100);
    return {name:item.title,qty:x.qty,price};
  });
  const total=rows.reduce((s,x)=>s+x.qty*x.price,0);

  showModal(`<button class="modal-close" onclick="closeModal()">×</button>
    <h2>📦 Objednávka</h2>
    <p class="muted">Vyplň doručovací údaje. Po odeslání se objednávka uloží a přijde na e-mail správce.</p>
    <form class="form" onsubmit="submitOrder(event)">
      <label>Jméno a příjmení<input name="name" value="${escapeHtml(state.user.name||"")}" required></label>
      <label>E-mail<input name="email" type="email" value="${escapeHtml(state.user.email||"")}" required></label>
      <label>Telefon<input name="phone" type="tel" placeholder="+420 123 456 789" required></label>

      <h3>Doručovací adresa</h3>
      <label>Ulice a číslo domu<input name="street" required placeholder="Školní 25"></label>
      <label>Město<input name="city" required placeholder="Kladno"></label>
      <label>PSČ<input name="zip" required placeholder="272 01"></label>

      <label>Poznámka<textarea name="note" rows="3" placeholder="Např. preferovaný čas doručení..."></textarea></label>
      <label>Platba
        <select name="payment">
          <option>Platba převodem</option>
        </select>
      </label>

      <div class="total"><span>Celkem</span><span>${eur(total)}</span></div>
      <button class="btn primary full">Odeslat objednávku</button>
    </form>`)
}

async function submitOrder(e){
  e.preventDefault();
  if(!state.cart.length){showToast("Košík je prázdný.");return}

  const fd=new FormData(e.target);
  const button=e.target.querySelector("button[type='submit'], button.btn");
  if(button){button.disabled=true;button.textContent="Odesílám objednávku…";}

  const items=state.cart.map(x=>{
    const list=x.type==="course"?courses:products;
    const item=list.find(i=>i.id===x.id);
    const price=x.type==="course"?item.price:item.price*(1+item.vat/100);
    return {
      id:item.id,
      type:x.type,
      name:item.title,
      quantity:x.qty,
      unitPrice:Number(price.toFixed(2))
    };
  });

  const payload={
    customer:{
      name:String(fd.get("name")||"").trim(),
      email:String(fd.get("email")||"").trim(),
      phone:String(fd.get("phone")||"").trim(),
      street:String(fd.get("street")||"").trim(),
      city:String(fd.get("city")||"").trim(),
      zip:String(fd.get("zip")||"").trim()
    },
    note:String(fd.get("note")||"").trim(),
    payment:String(fd.get("payment")||""),
    subscription:state.user?.subscription||"Start",
    items
  };

  try{
    const response=await fetch("/api/orders",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const result=await response.json();

    if(!response.ok) throw new Error(result.error||"Objednávku se nepodařilo odeslat.");

    state.cart=[];
    save();
    updateHeader();
    closeModal();
    showToast(`Objednávka ${result.orderNumber} byla odeslána. Děkujeme!`);
    location.hash="home";
  }catch(error){
    console.error(error);
    if(button){button.disabled=false;button.textContent="Odeslat objednávku";}
    showToast(error.message||"Objednávku se nepodařilo odeslat.");
  }
}


function openLecturer(id){
  const l=lecturers.find(x=>x.id===id);
  if(!l)return;
  const rr=calcLecturerRating(id);
  const reviews=allLecturerReviews(id);

  showModal(`<button class="modal-close" onclick="closeModal()">×</button>
    <div class="lector-detail">
      <div class="lector-avatar lector-avatar-large">${l.emoji}</div>
      <span class="eyebrow">LEKTOR</span>
      <h2>${escapeHtml(l.name)}</h2>
      <p class="muted">${escapeHtml(l.bio)}</p>
      <div class="tags">${l.tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>

      <div class="rating lecturer-rating-large">
        ${rr.count ? `<span>${stars(rr.rating)}</span><b>${rr.rating.toFixed(1).replace(".",",")}</b><small>${rr.count} hodnocení</small>`
                   : `<span>☆☆☆☆☆</span><small>Zatím bez hodnocení</small>`}
      </div>

      <h3>Hodnocení lektora</h3>
      <div class="review-list">
        ${reviews.length ? reviews.map(r=>`
          <div class="review">
            <div class="review-head">
              <b>${escapeHtml(r.name)}</b>
              <span class="review-stars">${stars(r.rating)}</span>
            </div>
            <p style="margin:5px 0">${escapeHtml(r.text)}</p>
          </div>`).join("")
        : `<div class="review"><p>Zatím zde není žádné hodnocení tohoto lektora.</p></div>`}
      </div>

      ${state.user
        ? `<form class="form" style="margin-top:18px" onsubmit="submitLecturerReview(event,${l.id})">
            <label>Vaše hodnocení
              <select name="rating">
                <option value="5">★★★★★ – 5</option>
                <option value="4">★★★★☆ – 4</option>
                <option value="3">★★★☆☆ – 3</option>
                <option value="2">★★☆☆☆ – 2</option>
                <option value="1">★☆☆☆☆ – 1</option>
              </select>
            </label>
            <label>Vaše recenze
              <textarea name="text" required rows="3" placeholder="Jak se vám s lektorem pracovalo?"></textarea>
            </label>
            <button class="btn primary">Ohodnotit lektora</button>
          </form>`
        : `<button class="btn primary full" style="margin-top:18px" onclick="closeModal();openAuth('login')">Přihlásit se pro přidání hodnocení</button>`}
    </div>`)
}

function submitLecturerReview(e,id){
  e.preventDefault();
  if(!state.user)return;
  const fd=new FormData(e.target);
  if(!state.lecturerReviews[id])state.lecturerReviews[id]=[];
  state.lecturerReviews[id].push({
    name:state.user.name,
    rating:Number(fd.get("rating")),
    text:fd.get("text")
  });
  save();
  openLecturer(id);
  renderLecturers();
  showToast("Děkujeme za hodnocení lektora!");
}


async function refreshCourseReviewsInModal(id){
  try{
    const response = await fetch(`/api/reviews?courseId=${encodeURIComponent(id)}`);
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || "Recenze se nepodařilo načíst.");
    const list = document.querySelector("#modal .review-list");
    if(!list) return;
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    list.innerHTML = reviews.length
      ? reviews.map(r => `<div class="review"><div class="review-head"><b>${escapeHtml(r.authorName)}</b><span class="review-stars">${stars(Number(r.rating))}</span></div><p style="margin:5px 0">${escapeHtml(r.text)}</p><small>${escapeHtml(new Date(r.createdAt).toLocaleDateString("cs-CZ"))}</small></div>`).join("")
      : `<div class="review"><p>Zatím zde nejsou žádné recenze. Buďte první!</p></div>`;
  }catch(err){
    const list = document.querySelector("#modal .review-list");
    if(list) list.innerHTML = `<div class="review"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function openCourse(id){
  const c=courses.find(x=>x.id===id), rr=calcCourseRating(c), reviews=allReviews(id);
  showModal(`<button class="modal-close" onclick="closeModal()">×</button><span class="eyebrow">${c.type==="prijimacky"?"PŘIJÍMAČKY":"1.–5. TŘÍDA"}</span><h2>${c.emoji} ${c.title}</h2><p class="muted">${c.desc}</p>
    <div class="rating" style="font-size:18px"><span>${stars(rr.rating)}</span><b>${rr.rating.toFixed(1).replace(".",",")}</b><small>${rr.count} hodnocení</small></div>
    <div class="review-list">${reviews.length?reviews.map(r=>`<div class="review"><div class="review-head"><b>${escapeHtml(r.name)}</b><span class="review-stars">${stars(r.rating)}</span></div><p style="margin:5px 0">${escapeHtml(r.text)}</p><small>Ověřený uživatel webu</small></div>`).join(""):`<div class="review"><p>Zatím zde nejsou vaše vlastní recenze. Buďte první!</p></div>`}</div>
    ${state.user?`<form class="form" style="margin-top:18px" onsubmit="submitReview(event,'${c.id}')"><label>Vaše hodnocení<select name="rating"><option value="5">★★★★★ – 5</option><option value="4">★★★★☆ – 4</option><option value="3">★★★☆☆ – 3</option><option value="2">★★☆☆☆ – 2</option><option value="1">★☆☆☆☆ – 1</option></select></label><label>Recenze<textarea name="text" required rows="3" placeholder="Co se vám na kurzu líbilo?"></textarea></label><button class="btn primary">Přidat recenzi</button></form>`:`<button class="btn primary full" style="margin-top:18px" onclick="closeModal();openAuth('login')">Přihlásit se pro přidání recenze</button>`}
    <button class="btn secondary full" style="margin-top:10px" onclick="addToCart('${c.id}','course')">Přidat kurz do košíku • ${eur(c.price)}</button>`)
  refreshCourseReviewsInModal(id);
}

async function submitReview(e,id){e.preventDefault();const fd=new FormData(e.target);try{const response=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId:id,authorName:state.user?.name||"Uživatel",rating:Number(fd.get("rating")),text:String(fd.get("text")||"").trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Recenzi se nepodařilo uložit.");await refreshCourseReviewsInModal(id);renderCourses();renderHome();showToast("Děkujeme za recenzi!")}catch(err){showToast(err.message)}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openTerms(){showModal(`<button class="modal-close" onclick="closeModal()">×</button><h2>Obchodní podmínky – vzor</h2><p class="muted">Toto je pouze návrh textu pro demo. Před spuštěním skutečného e-shopu je potřeba doplnit skutečné identifikační údaje, podmínky plateb, dopravy, reklamací, odstoupení od smlouvy a zásady ochrany osobních údajů.</p><p>Pro reálný provoz doporučujeme právní kontrolu podmínek a napojení zabezpečené autentizace, databáze a platební brány.</p>`)}
function route(){
  const id=(location.hash||"#home").slice(1)||"home";document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));window.scrollTo({top:0,behavior:"smooth"});
  if(id==="materials")renderMaterials();if(id==="courses")renderCourses();if(id==="products")renderProducts();if(id==="lectors")renderLecturers();if(id==="reservations")renderReservationCourses();
}
document.addEventListener("click",e=>{const a=e.target.closest("[data-route]");if(a){document.getElementById("mainNav").style.display="";}})
document.getElementById("accountBtn").onclick=account;document.getElementById("cartBtn").onclick=openCart;
document.getElementById("mobileMenu").onclick=()=>{const n=document.getElementById("mainNav");n.style.display=n.style.display==="flex"?"none":"flex";n.style.position="absolute";n.style.top="68px";n.style.left="0";n.style.right="0";n.style.background="#fffdf8";n.style.padding="20px";n.style.flexDirection="column";n.style.boxShadow="0 15px 30px rgba(0,0,0,.08)"}
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>renderCourses(b.dataset.filter));
window.addEventListener("hashchange",route);

renderHome();renderCourses();renderProducts();renderLecturers();renderMaterials();renderReservationCourses();updateHeader();route();


let activeReviewCourseId = null;

function escapeReviewHtml(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function renderReviewList(reviews) {
  const list = document.getElementById("reviewList");
  const summary = document.getElementById("courseReviewsSummary");
  if (!list || !summary) return;

  if (!reviews.length) {
    list.innerHTML = '<div class="review-empty">Zatím tu není žádná recenze. Buď první!</div>';
    summary.textContent = "Zatím bez hodnocení.";
    return;
  }

  const avg = reviews.reduce((s,r) => s + Number(r.rating || 0), 0) / reviews.length;
  summary.textContent = `Průměr ${avg.toFixed(1).replace(".",",")} / 5 · ${reviews.length} ${reviews.length === 1 ? "recenze" : "recenzí"}`;

  list.innerHTML = reviews.map(r => {
    const rating = Math.max(1, Math.min(5, Number(r.rating) || 1));
    const stars = "★".repeat(rating) + "☆".repeat(5-rating);
    const date = new Date(r.createdAt);
    const dateText = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("cs-CZ");
    return `<article class="review-card">
      <div class="review-card-top">
        <span class="review-author">${escapeReviewHtml(r.authorName)}</span>
        <span class="review-stars">${stars}</span>
      </div>
      <div class="review-date">${escapeReviewHtml(dateText)}</div>
      <p class="review-text">${escapeReviewHtml(r.text)}</p>
    </article>`;
  }).join("");
}

async function loadCourseReviews(courseId) {
  const box = document.getElementById("courseReviews");
  const list = document.getElementById("reviewList");
  if (!box || !list) return;
  activeReviewCourseId = courseId;
  box.hidden = false;
  list.innerHTML = '<div class="review-empty">Načítám recenze…</div>';

  try {
    const response = await fetch(`/api/reviews?courseId=${encodeURIComponent(courseId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Recenze se nepodařilo načíst.");
    renderReviewList(Array.isArray(data.reviews) ? data.reviews : []);
  } catch (e) {
    list.innerHTML = `<div class="review-empty">${escapeReviewHtml(e.message)}</div>`;
  }
}

async function submitCourseReview(event) {
  event.preventDefault();
  const message = document.getElementById("reviewMessage");
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        courseId: activeReviewCourseId,
        authorName: document.getElementById("reviewAuthorName").value.trim(),
        rating: Number(document.getElementById("reviewRating").value),
        text: document.getElementById("reviewText").value.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Recenzi se nepodařilo odeslat.");
    document.getElementById("reviewText").value = "";
    message.textContent = "Děkujeme! Recenze byla zveřejněna.";
    await loadCourseReviews(activeReviewCourseId);
  } catch (e) {
    message.textContent = e.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reviewForm");
  if (form) form.addEventListener("submit", submitCourseReview);
});
window.openCourseReviews = loadCourseReviews;
