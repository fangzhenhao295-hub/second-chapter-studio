(() => {
  'use strict';
  const data = window.STUDIO_DATA;
  if (!data) return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const refreshIcons = () => window.lucide?.createIcons({attrs:{'stroke-width':1.6}});
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let filter = 'selected';
  let visibleCases = 6;
  const sectors = [{id:'selected',title:'精选'},{id:'campus',title:'高校与青年'},{id:'local',title:'地方文化'},{id:'more',title:'补充实践'}];
  const sectorNames = {campus:'高校与青年',local:'地方文化',more:'补充实践'};
  const matching = id => data.projects.filter(item => id === 'selected' ? item.sector !== 'more' : item.sector === id);
  const platform = url => {
    const host = new URL(url).hostname;
    return host.includes('douyin') ? '抖音' : host.includes('weixin') ? '视频号' : host.includes('baidu') ? '百度网盘' : '品牌网站';
  };
  const watchLabel = project => project.id === 'oxs' ? '查看品牌网站' : project.id === 'foreign-language' ? '观看中英文成片' : '观看完整影片';
  const external = (link, label, className = '') => `<a class="${className}" href="${escape(link.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(label)}，${platform(link.href)}，在新窗口打开">${escape(label)}${icon('arrow-up-right')}</a>`;

  function renderFilters() {
    $('#caseFilters').innerHTML = sectors.map(item => `<button type="button" class="${item.id === filter ? 'is-active' : ''}" data-filter="${item.id}" aria-pressed="${item.id === filter}">${item.title}<span>${String(matching(item.id).length).padStart(2,'0')}</span></button>`).join('');
  }

  function renderCases() {
    const projects = matching(filter);
    const shown = projects.slice(0, visibleCases);
    $('#caseGrid').innerHTML = shown.map(project => `
      <article class="case-card">
        <button class="case-image ${project.id === 'oxs' ? 'is-original' : ''}" type="button" data-case="${project.id}" aria-label="查看《${escape(project.title)}》案例详情">
          <img src="${escape(project.cover)}"${project.coverImage?.srcSet ? ` srcset="${escape(project.coverImage.srcSet)}" sizes="(max-width: 560px) 46vw, (max-width: 900px) 46vw, 31vw"` : ''} alt="《${escape(project.title)}》项目封面" width="${project.coverImage?.width||1400}" height="${project.coverImage?.height||787}" loading="lazy" decoding="async"><span class="case-open">${icon('arrow-up-right')}</span>
        </button>
        <div class="case-meta"><span>${sectorNames[project.sector]}</span><span>${escape(project.year)}</span></div>
        <h3>${escape(project.title)}</h3><p class="case-type">${escape(project.type)}</p>
        <div class="case-actions">${project.links.length ? external(project.links[0], watchLabel(project), 'case-watch') : '<span></span>'}<button type="button" class="case-detail" data-case="${project.id}">案例详情${icon('plus')}</button></div>
      </article>`).join('');
    $('#moreCases').hidden = shown.length >= projects.length;
    $('#caseCount').textContent = `${String(shown.length).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`;
    refreshIcons();
  }

  $('#caseFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filter = button.dataset.filter;
    visibleCases = 6;
    renderFilters();
    renderCases();
    $('#caseFilters').querySelector(`[data-filter="${filter}"]`).focus({preventScroll:true});
  });
  $('#moreCases').addEventListener('click', () => {
    const previous = visibleCases;
    visibleCases += 6;
    renderCases();
    const next = $('#caseGrid').children[previous]?.querySelector('button');
    if (next) next.focus({preventScroll:true});
  });
  $('#caseGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-case]');
    if (button) openCase(button.dataset.case);
  });

  $('#photoGrid').innerHTML = data.photos.map((photo,index) => `<button type="button" data-photo="${index}" aria-label="查看${escape(photo.alt)}"><img src="${escape(photo.src)}"${photo.srcSet ? ` srcset="${escape(photo.srcSet)}" sizes="(max-width: 900px) 30vw, 16vw"` : ''} alt="${escape(photo.alt)}" width="${photo.width||400}" height="${photo.height||500}" loading="lazy" decoding="async"></button>`).join('');
  $('#photoGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-photo]');
    if (button) openPhotos(Number(button.dataset.photo));
  });
  $('#serviceList').innerHTML = data.services.map((item,index) => `<details class="service-item"${index === 0 ? ' open' : ''}><summary><span>${String(index+1).padStart(2,'0')}</span><h3>${escape(item.title)}</h3>${icon('plus')}</summary><div><p>${escape(item.body)}</p><small>${escape(item.scope)}</small></div></details>`).join('');
  $$('.service-item').forEach(item => item.addEventListener('toggle', () => {
    if (item.open) $$('.service-item').forEach(other => {if(other !== item) other.open = false;});
  }));

  const caseDialog = $('#caseDialog');
  let activeProject = null;
  let frames = [];
  let frameIndex = 0;
  let imageRequest = 0;
  function setInfo(open) {
    $('#dialogPanel').hidden = !open;
    $('#dialogInfo').setAttribute('aria-expanded', String(open));
    $('#dialogInfo').setAttribute('aria-label', open ? '收起案例介绍' : '显示案例介绍');
  }
  function openCase(id) {
    const project = data.projects.find(item => item.id === id);
    if (!project) return;
    activeProject = project;
    const used = new Set();
    frames = [{src:project.coverImage?.fullSrc||project.cover,source:project.coverSource,alt:`《${project.title}》项目封面`},...project.media].filter(frame => {
      const source=frame.source||frame.src;
      if(used.has(source)) return false;
      used.add(source);
      return true;
    });
    frameIndex = 0;
    $('#dialogTitle').textContent = project.title;
    $('#dialogPanel').innerHTML = `<h3>${escape(project.title)}</h3>${project.summary.split('\n').filter(Boolean).map(text=>`<p>${escape(text)}</p>`).join('')}<dl><div><dt>作品类型</dt><dd>${escape(project.type)}</dd></div><div><dt>方卓煌参与分工</dt><dd>${escape(project.role)}</dd></div><div><dt>项目成果</dt><dd>${escape(project.result)}</dd></div></dl>${project.links.map(link=>external(link,`${watchLabel(project)} · ${platform(link.href)}`)).join('')}`;
    $('#dialogWatch').hidden = !project.links.length;
    if(project.links.length) {
      $('#dialogWatch').href = project.links[0].href;
      $('#dialogWatch').innerHTML = `${watchLabel(project)}${icon('arrow-up-right')}`;
    } else $('#dialogWatch').removeAttribute('href');
    setInfo(false);
    renderFrame();
    stopBrandMotion();
    caseDialog.showModal();
    document.body.style.overflow = 'hidden';
    refreshIcons();
  }
  function openPhotos(index) {
    activeProject = null;
    frames = data.photos;
    frameIndex = index;
    $('#dialogTitle').textContent = '摄影选辑';
    $('#dialogWatch').hidden = true;
    setInfo(false);
    renderFrame();
    stopBrandMotion();
    caseDialog.showModal();
    document.body.style.overflow = 'hidden';
    refreshIcons();
  }
  function renderFrame(direction = 0) {
    frameIndex = (frameIndex + direction + frames.length) % frames.length;
    const frame = frames[frameIndex];
    const request = ++imageRequest;
    const image = $('#dialogImage');
    image.alt = frame.alt || activeProject?.title || frame.title;
    $('#imageError').hidden = true;
    image.onload = () => {if(request === imageRequest) $('#imageError').hidden = true;};
    image.onerror = () => {if(request === imageRequest) $('#imageError').hidden = false;};
    image.src = frame.fullSrc||frame.src;
    $('#dialogCount').textContent = `${String(frameIndex+1).padStart(2,'0')} / ${String(frames.length).padStart(2,'0')}`;
    $('#dialogPrev').disabled = frames.length < 2;
    $('#dialogNext').disabled = frames.length < 2;
    if(!activeProject) {
      $('#dialogTitle').textContent = frame.title;
      $('#dialogPanel').innerHTML = `<h3>${escape(frame.title)}</h3><p>${escape(frame.alt)}</p><p>${escape(frame.credit)}</p>`;
    }
  }
  $('#dialogPrev').addEventListener('click',()=>renderFrame(-1));
  $('#dialogNext').addEventListener('click',()=>renderFrame(1));
  $('#dialogInfo').addEventListener('click',()=>setInfo($('#dialogPanel').hidden));
  $('#dialogClose').addEventListener('click',()=>caseDialog.close());
  $('#retryImage').addEventListener('click',()=>renderFrame());
  caseDialog.addEventListener('close',()=>{document.body.style.overflow='';$('#dialogImage').removeAttribute('src');});
  caseDialog.addEventListener('click',event=>{if(event.target===caseDialog) caseDialog.close();});
  document.addEventListener('keydown',event=>{
    if(!caseDialog.open) return;
    if(event.key==='ArrowRight') {event.preventDefault();renderFrame(1);}
    if(event.key==='ArrowLeft') {event.preventDefault();renderFrame(-1);}
  });
  let touchStart = null;
  $('#dialogStage').addEventListener('pointerdown',event=>{if(event.pointerType==='touch') touchStart={x:event.clientX,y:event.clientY};});
  $('#dialogStage').addEventListener('pointerup',event=>{
    if(!touchStart) return;
    const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;
    if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) renderFrame(dx<0?1:-1);
    touchStart=null;
  });
  $('#dialogStage').addEventListener('pointercancel',()=>{touchStart=null;});

  const header = $('.site-header');
  const menu = $('#menuToggle');
  function setMenu(open) {
    if (header.classList.contains('is-menu-open') === open) return;
    header.classList.toggle('is-menu-open',open);
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?'关闭导航':'打开导航');
    menu.innerHTML=icon(open?'x':'menu');
    refreshIcons();
  }
  menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  $$('.site-header a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('click',event=>{if(!header.contains(event.target)) setMenu(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('is-menu-open')) {setMenu(false);menu.focus();}});
  window.matchMedia('(min-width:901px)').addEventListener('change',()=>setMenu(false));

  const slides=$$('.hero-slide');
  const controls=$$('[data-hero]');
  let heroIndex=0,heroTimer=0,heroPaused=reduced.matches,heroRequest=0;
  async function selectHero(index) {
    const request=++heroRequest;
    const image=slides[index].querySelector('img');
    if(image.dataset.heroSrc) {
      if(image.dataset.heroSrcset) {
        image.srcset=image.dataset.heroSrcset;
        delete image.dataset.heroSrcset;
      }
      image.src=image.dataset.heroSrc;
      delete image.dataset.heroSrc;
      try {await image.decode();} catch {scheduleHero();return;}
    }
    if(request!==heroRequest) return;
    heroIndex=index;
    $('.hero').dataset.index=String(index);
    slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===index));
    controls.forEach((button,i)=>{button.classList.toggle('is-active',i===index);if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
    $('#heroCount').textContent=`${String(index+1).padStart(2,'0')} / 03`;
    scheduleHero();
  }
  function scheduleHero() {
    clearTimeout(heroTimer);
    if(!heroPaused&&!document.hidden&&!caseDialog.open) heroTimer=setTimeout(()=>selectHero((heroIndex+1)%slides.length),6500);
  }
  function setHeroPause(paused) {
    heroPaused=paused;
    $('#heroPause').innerHTML=icon(paused?'play':'pause');
    $('#heroPause').setAttribute('aria-label',paused?'播放封面轮播':'暂停封面轮播');
    $('#heroPause').title=paused?'播放封面轮播':'暂停封面轮播';
    refreshIcons();scheduleHero();
  }
  controls.forEach(button=>button.addEventListener('click',()=>selectHero(Number(button.dataset.hero))));
  $('#heroPause').addEventListener('click',()=>setHeroPause(!heroPaused));
  document.addEventListener('visibilitychange',scheduleHero);
  caseDialog.addEventListener('close',scheduleHero);
  reduced.addEventListener('change',()=>setHeroPause(reduced.matches));

  const brandMarks=$$('[data-brand-motion]');
  let brandMotionTimer=0;
  function stopBrandMotion() {
    clearTimeout(brandMotionTimer);
    brandMotionTimer=0;
    brandMarks.forEach(mark=>mark.classList.remove('is-animating','is-entering'));
  }
  function playBrandMotion({fromClosed=false}={}) {
    if(reduced.matches||document.hidden||brandMotionTimer||$('dialog[open]')) return;
    const visibleMarks=brandMarks.filter(mark=>{
      const bounds=mark.getBoundingClientRect();
      return bounds.width>0&&bounds.bottom>0&&bounds.top<window.innerHeight;
    });
    if(!visibleMarks.length) return;
    visibleMarks.forEach(mark=>{
      mark.classList.toggle('is-entering',fromClosed);
      mark.classList.add('is-animating');
    });
    brandMotionTimer=setTimeout(stopBrandMotion,1400);
  }
  [$('.brand'),$('.hero-category')].forEach(target=>target.addEventListener('pointerenter',event=>{
    if(event.pointerType!=='touch') playBrandMotion();
  }));
  $('.brand').addEventListener('focus',playBrandMotion);
  $('.brand').addEventListener('pointerdown',event=>{if(event.pointerType==='touch') playBrandMotion();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden) stopBrandMotion();});
  window.addEventListener('pagehide',stopBrandMotion);
  reduced.addEventListener('change',()=>{if(reduced.matches) stopBrandMotion();});

  const qrData={
    wechat:{title:'微信 / WeChat',src:'assets/wechat-contact.jpg',alt:'方卓煌的微信二维码，用于项目联系'},
    rednote:{title:'小红书 / RedNote',src:'assets/contact/xiaohongshu-qr.jpg',alt:'主创小红书二维码'},
    douyin:{title:'抖音 / Douyin',src:'assets/contact/douyin-qr.jpg',alt:'主创抖音二维码'}
  };
  const qrDialog=$('#qrDialog');
  $$('[data-qr]').forEach(button=>button.addEventListener('click',()=>{
    const item=qrData[button.dataset.qr];
    $('#qrTitle').textContent=item.title;
    $('#qrImage').src=item.src;
    $('#qrImage').alt=item.alt;
    stopBrandMotion();
    qrDialog.showModal();document.body.style.overflow='hidden';
  }));
  $('#qrClose').addEventListener('click',()=>qrDialog.close());
  qrDialog.addEventListener('click',event=>{if(event.target===qrDialog)qrDialog.close();});
  qrDialog.addEventListener('close',()=>{document.body.style.overflow='';});
  let statusTimer;
  function status(text) {
    const box=$('#statusMessage');box.textContent=text;box.classList.add('is-visible');
    clearTimeout(statusTimer);statusTimer=setTimeout(()=>box.classList.remove('is-visible'),3000);
  }
  $('#copyEmail').addEventListener('click',async()=>{
    try {
      if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText('fangzhuohuang@qq.com');
      else {
        const input=document.createElement('textarea');input.value='fangzhuohuang@qq.com';input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
        const copied=document.execCommand('copy');input.remove();if(!copied)throw Error('copy unavailable');
      }
      status('邮箱已复制');
    } catch {status('暂时无法复制，请使用上方邮箱链接联系。');}
  });
  if(!reduced.matches&&'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
    const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target);}}),{threshold:.06});
    $$('.reveal').forEach(section=>reveal.observe(section));
  }
  if('IntersectionObserver' in window) {
    const activeNav=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        $$('.main-nav a').forEach(link=>{const active=link.hash===`#${entry.target.id}`;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
      });
    },{rootMargin:'-15% 0px -60% 0px',threshold:0});
    $$('#work,#services,#ai,#team,#about').forEach(section=>activeNav.observe(section));
  }
  renderFilters();renderCases();refreshIcons();setHeroPause(heroPaused);
  requestAnimationFrame(()=>playBrandMotion({fromClosed:true}));
})();
