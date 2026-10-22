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
  let filter = 'all';
  let visibleCases = 6;
  const categories = [{id:'all',title:'全部作品'},{id:'promo',title:'宣传与专题'},{id:'documentary',title:'纪录与短片'},{id:'events',title:'活动与演出'},{id:'brand',title:'品牌视觉'}];
  const formatNames = Object.fromEntries(categories.map(item => [item.id,item.title]));
  const matching = id => data.projects.filter(item => id === 'all' || item.format === id);
  const platform = url => {
    const host = new URL(url).hostname;
    return host.includes('douyin') ? '抖音' : host === 'mp.weixin.qq.com' ? '微信公众号' : host.includes('weixin') ? '视频号' : host.includes('xuexi.cn') ? '学习强国' : host.includes('baidu') ? '百度网盘' : '品牌网站';
  };
  const watchLabel = (project, link = project.links[0]) => link?.kind === 'publication' ? link.label : project.id === 'oxs' ? '查看品牌网站' : project.id === 'foreign-language' ? '观看中英文成片' : '观看完整影片';
  const watchIcon = (project, link = project.links[0]) => link?.kind === 'publication' || project.id === 'oxs' ? 'external-link' : 'play';
  const external = (link, label, className = '', iconName = 'arrow-up-right') => `<a class="${className}" href="${escape(link.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(label)}，${platform(link.href)}，在新窗口打开">${escape(label)}${icon(iconName)}</a>`;

  function renderFilters() {
    $('#caseFilters').innerHTML = categories.map(item => `<button type="button" class="${item.id === filter ? 'is-active' : ''}" data-filter="${item.id}" aria-pressed="${item.id === filter}">${item.title}<span>${String(matching(item.id).length).padStart(2,'0')}</span></button>`).join('');
  }

  function renderCases() {
    const projects = matching(filter);
    const shown = projects.slice(0, visibleCases);
    $('#caseGrid').innerHTML = shown.map(project => `
      <article class="case-card">
        <button class="case-image ${project.coverFit === 'contain' || project.id === 'oxs' ? 'is-original' : ''}" type="button" data-case="${project.id}" aria-label="查看《${escape(project.title)}》案例图集" title="查看案例图集">
          <img src="${escape(project.cover)}"${project.coverImage?.srcSet ? ` srcset="${escape(project.coverImage.srcSet)}" sizes="(max-width: 560px) 46vw, (max-width: 900px) 46vw, 31vw"` : ''} alt="《${escape(project.title)}》项目封面" width="${project.coverImage?.width||1400}" height="${project.coverImage?.height||787}" loading="lazy" decoding="async">
        </button>
        <div class="case-meta"><span>${formatNames[project.format]}</span>${project.year ? `<span>${escape(project.year)}</span>` : ''}</div>
        <h3>${escape(project.title)}</h3><p class="case-type">${escape(project.type)}</p>
        <div class="case-actions">${project.links.length ? external(project.links[0], watchLabel(project), 'case-watch', watchIcon(project)) : ''}<button type="button" class="case-detail" data-case="${project.id}">案例详情${icon('circle')}</button></div>
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
    const credits=project.credits?.length ? project.credits : project.role ? [{role:'方卓煌参与分工',name:project.role}] : [];
    $('#dialogPanel').innerHTML = `<h3>${escape(project.title)}</h3>${project.summary.split('\n').filter(Boolean).map(text=>`<p>${escape(text)}</p>`).join('')}<dl><div><dt>作品类型</dt><dd>${escape(project.type)}</dd></div>${credits.map(credit=>`<div><dt>${escape(credit.role)}</dt><dd>${escape(credit.name)}</dd></div>`).join('')}${project.result ? `<div><dt>项目成果</dt><dd>${escape(project.result)}</dd></div>` : ''}</dl>${project.links.map(link=>external(link,`${watchLabel(project,link)} · ${platform(link.href)}`,'case-watch',watchIcon(project,link))).join('')}`;
    $('#dialogWatch').hidden = !project.links.length;
    if(project.links.length) {
      $('#dialogWatch').href = project.links[0].href;
      $('#dialogWatch').innerHTML = `${watchLabel(project)}${icon(watchIcon(project))}`;
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
  const hero=$('.hero');
  const heroCopy=[$('.hero-category'),$('.hero-name'),$('.hero-work')];
  const heroSummary=$('.hero-summary>p');
  let heroCopyAnimations=[];
  let heroIntroActive=document.documentElement.classList.contains('hero-intro-pending');
  let heroIntro=null,heroIntroTimer=0;
  let heroIntroAnimations=[],introInert=[];
  const settleProgress = (time, stiffness = 7.5) => {
    const response = value => 1 - (1 + stiffness * value) * Math.exp(-stiffness * value);
    return response(time) / response(1);
  };
  // Sample a critically damped response once, then let the browser play the layers.
  const settleFrames = (frame, stiffness) => Array.from({length:49}, (_,index) => {
    const offset=index/48;
    return {...frame(settleProgress(offset,stiffness)),offset};
  });
  function finishHeroCopy() {
    heroCopyAnimations.forEach(animation=>animation.cancel());
    heroCopyAnimations=[];
    hero.classList.add('is-copy-ready');
  }
  function revealHeroCopy(initial=false) {
    finishHeroCopy();
    if(reduced.matches||document.hidden||!hero.animate||hero.getBoundingClientRect().bottom<=0) return;
    heroCopyAnimations=heroCopy.map((element,index)=>element.animate(
      [{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:900,delay:(initial?450:700)+[0,120,260][index],easing:'cubic-bezier(.22,.65,.26,1)',fill:'backwards'}
    ));
    heroCopyAnimations.push(heroSummary.animate(
      [{opacity:0,transform:'translateX(28px)'},{opacity:1,transform:'translateX(0)'}],
      {duration:850,delay:(initial?450:700)+1260,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'}
    ));
  }
  function finishHeroIntro(animateCopy=true) {
    if(!heroIntroActive) return;
    const hadFocus=heroIntro?.contains(document.activeElement);
    heroIntroActive=false;
    clearTimeout(heroIntroTimer);
    heroIntroAnimations.forEach(animation=>animation.cancel());
    heroIntroAnimations=[];
    heroIntro?.remove();
    heroIntro=null;
    introInert.forEach(([element,inert])=>{element.inert=inert;});
    introInert=[];
    document.documentElement.classList.remove('hero-intro-pending');
    if(animateCopy) revealHeroCopy(true);
    else finishHeroCopy();
    if(hadFocus) $('#heroPause').focus({preventScroll:true});
    playBrandMotion({fromClosed:true});
    scheduleHero();
  }
  async function startHeroIntro() {
    if(!heroIntroActive) return false;
    if(reduced.matches||document.hidden||window.scrollY>10||!hero.animate) {
      finishHeroIntro(false);
      return true;
    }
    try {
      const source=slides[0].querySelector('img');
      const image=source.cloneNode(false);
      image.className='hero-intro-image hero-intro-target';
      image.alt='';
      image.style.objectPosition=getComputedStyle(source).objectPosition;
      heroIntro=document.createElement('div');
      heroIntro.className='hero-intro';
      heroIntro.dataset.phase='frost';
      const card=document.createElement('div');
      card.className='hero-intro-card';
      card.setAttribute('aria-hidden','true');
      const scrim=document.createElement('div');
      scrim.className='hero-intro-scrim';
      scrim.style.background=getComputedStyle($('.hero-scrim')).background;
      const wash=document.createElement('div');
      wash.className='hero-intro-wash';
      const fogLayers=['frost','haze'].map(name=>{
        const layer=document.createElement('div');
        layer.className=`hero-intro-fog hero-intro-${name}`;
        const blurred=source.cloneNode(false);
        blurred.alt='';
        blurred.style.objectPosition=getComputedStyle(source).objectPosition;
        layer.append(blurred);
        return layer;
      });
      const logo=document.createElement('img');
      logo.className='hero-intro-logo';
      logo.src=$('.brand img').src;
      logo.alt='第二人生 Second Chapter Studio';
      const logoWidth=Math.min(220,innerWidth*.44);
      const logoHeight=logoWidth*880/1788;
      Object.assign(logo.style,{left:`${(innerWidth-logoWidth)/2}px`,top:`${(innerHeight-logoHeight)/2}px`,width:`${logoWidth}px`,height:`${logoHeight}px`});
      const skip=document.createElement('button');
      skip.className='icon-button hero-intro-skip';
      skip.type='button';
      skip.setAttribute('aria-label','跳过开场');
      skip.title='跳过开场';
      skip.innerHTML=icon('x');
      skip.addEventListener('click',()=>finishHeroIntro());
      card.append(image,...fogLayers,scrim,wash);
      heroIntro.append(card,logo,skip);
      introInert=[...document.body.children].filter(element=>element.tagName!=='SCRIPT').map(element=>[element,element.inert]);
      introInert.forEach(([element])=>{element.inert=true;});
      document.body.append(heroIntro);
      refreshIcons();
      try {await Promise.all([image.decode(),logo.decode()]);} catch {finishHeroIntro();return true;}
      if(!heroIntroActive) return true;
      const coverBounds=(width,height,left=0,top=0)=>{
        const aspect=image.naturalWidth/image.naturalHeight;
        const position=getComputedStyle(source).objectPosition.split(' ').map(value=>parseFloat(value)/100);
        const imageWidth=Math.max(width,height*aspect),imageHeight=imageWidth/aspect;
        return {width:imageWidth,height:imageHeight,x:left+(width-imageWidth)*position[0],y:top+(height-imageHeight)*position[1]};
      };
      const fullImage=coverBounds(innerWidth,innerHeight);
      const fullTransform=`translate(${fullImage.x}px,${fullImage.y}px) scale(1)`;
      Object.assign(image.style,{width:`${fullImage.width}px`,height:`${fullImage.height}px`,transform:fullTransform});
      fogLayers.forEach(layer=>Object.assign(layer.firstElementChild.style,{
        width:`${fullImage.width}px`,height:`${fullImage.height}px`,transform:fullTransform
      }));
      // Crossfade cached blur layers; avoid repainting a changing full-screen blur.
      const fog=fogLayers.map((layer,index)=>layer.animate([
        {opacity:index ? .16 : .3,transform:'translate(0,0) scale(1)'},
        {opacity:index ? .1 : .2,transform:`translate(${index?-2:4}px,-2px) scale(1.012)`,offset:.35},
        {opacity:0,transform:`translate(${index?-9:12}px,-7px) scale(1.045)`}
      ],{duration:index?1350:1450,delay:index?100:0,easing:'cubic-bezier(.25,.1,.35,1)',fill:'forwards'}));
      const focus=image.animate([
        {transform:`translate(${fullImage.x-fullImage.width*.006}px,${fullImage.y-fullImage.height*.006}px) scale(1.012)`},
        {transform:fullTransform}
      ],{duration:1500,easing:'cubic-bezier(.2,.6,.3,1)',fill:'forwards'});
      const clear=wash.animate([{opacity:1},{opacity:0}],{duration:1450,easing:'ease-in-out',fill:'forwards'});
      const logoIn=logo.animate([{opacity:0},{opacity:1}],{duration:420,easing:'ease-out',fill:'forwards'});
      heroIntroAnimations.push(...fog,focus,clear,logoIn);
      clear.finished.then(()=>{if(heroIntroActive&&heroIntro)heroIntro.dataset.phase='hold';}).catch(()=>{});
      heroIntroTimer=setTimeout(()=>{
        if(!heroIntroActive) return;
        heroIntro.dataset.phase='shrinking';
        const bounds=hero.getBoundingClientRect();
        const radius=getComputedStyle(hero).borderRadius;
        const timing={duration:1650,easing:'linear',fill:'forwards'};
        const mix=(start,end,progress)=>start+(end-start)*progress;
        const shrink=card.animate(settleFrames(progress=>({
          clipPath:`inset(${bounds.top*progress}px ${(innerWidth-bounds.right)*progress}px ${(innerHeight-bounds.bottom)*progress}px ${bounds.left*progress}px round ${parseFloat(radius)*progress}px)`
        })),timing);
        const finalImage=coverBounds(bounds.width,bounds.height,bounds.left,bounds.top);
        const settle=image.animate(settleFrames(progress=>({
          transform:`translate(${mix(fullImage.x,finalImage.x,progress)}px,${mix(fullImage.y,finalImage.y,progress)}px) scale(${mix(1,finalImage.width/fullImage.width,progress)})`
        }),6.8),timing);
        const scrimSettle=scrim.animate(settleFrames(progress=>({
          transform:`translate(${bounds.left*progress}px,${bounds.top*progress}px) scale(${mix(1,bounds.width/innerWidth,progress)},${mix(1,bounds.height/innerHeight,progress)})`
        })),timing);
        const logoBounds=logo.getBoundingClientRect();
        const target=$('.brand-wordmark-art').getBoundingClientRect();
        const logoHome=logo.animate(settleFrames(progress=>({
          transform:`translate(${(target.left-logoBounds.left)*progress}px,${(target.top-logoBounds.top)*progress}px) scale(${mix(1,target.width/logoBounds.width,progress)})`,
          filter:`brightness(0) invert(${1-Math.max(0,(progress-.75)/.25)})`
        }),7),timing);
        heroIntroAnimations.push(shrink,settle,scrimSettle,logoHome);
        Promise.all([shrink.finished,settle.finished,logoHome.finished]).then(()=>finishHeroIntro()).catch(()=>{});
      },1500);
    } catch {
      finishHeroIntro();
    }
    return true;
  }
  let heroIndex=0,heroTimer=0,heroPaused=reduced.matches,heroRequest=0;
  let heroTouch=null,heroDragAnimation=null,heroDragOffset=0;
  const heroReel=$('.hero-reel');
  function resetHeroDrag(animate=true) {
    const distance=heroDragOffset;
    const dragged=Boolean(heroReel.style.transform);
    heroDragOffset=0;
    heroDragAnimation?.cancel();
    heroDragAnimation=null;
    heroReel.style.transform='';
    if(animate&&dragged&&!reduced.matches) {
      const animation=heroReel.animate(settleFrames(progress=>({transform:`translateX(${distance*(1-progress)}px) scale(${1+.04*(1-progress)})`})),{duration:500,easing:'linear'});
      heroDragAnimation=animation;
      animation.finished.then(()=>{if(heroDragAnimation===animation)heroDragAnimation=null;}).catch(()=>{});
    }
  }
  function endHeroTouch(event,cancelled=false) {
    if(!heroTouch||event.pointerId!==heroTouch.id) return;
    const touch=heroTouch;
    heroTouch=null;
    if(hero.hasPointerCapture(event.pointerId))hero.releasePointerCapture(event.pointerId);
    resetHeroDrag(!cancelled);
    const dx=event.clientX-touch.x,dy=event.clientY-touch.y;
    if(!cancelled&&touch.horizontal&&Math.abs(dx)>=Math.max(44,hero.clientWidth*.1)&&Math.abs(dx)>Math.abs(dy)*1.35) {
      selectHero((heroIndex+(dx<0?1:-1)+slides.length)%slides.length);
    } else scheduleHero();
  }
  hero.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch'||!event.isPrimary||heroIntroActive||event.target.closest('a,button'))return;
    clearTimeout(heroTimer);
    resetHeroDrag(false);
    heroTouch={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false};
  });
  hero.addEventListener('pointermove',event=>{
    if(!heroTouch||event.pointerId!==heroTouch.id)return;
    const dx=event.clientX-heroTouch.x,dy=event.clientY-heroTouch.y;
    if(!heroTouch.horizontal) {
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)) {endHeroTouch(event,true);return;}
      if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.35)return;
      heroTouch.horizontal=true;
      hero.setPointerCapture(event.pointerId);
    }
    const limit=Math.min(18,hero.clientWidth*.018);
    heroDragOffset=Math.max(-limit,Math.min(limit,dx*.12));
    heroReel.style.transform=`translateX(${heroDragOffset}px) scale(1.04)`;
  });
  hero.addEventListener('pointerup',event=>endHeroTouch(event));
  hero.addEventListener('pointercancel',event=>endHeroTouch(event,true));
  async function selectHero(index) {
    clearTimeout(heroTimer);
    const request=++heroRequest;
    if(index===heroIndex) {scheduleHero();return;}
    const image=slides[index].querySelector('img');
    if(image.dataset.heroSrc) {
      if(image.dataset.heroSrcset) {
        image.srcset=image.dataset.heroSrcset;
        delete image.dataset.heroSrcset;
      }
      image.src=image.dataset.heroSrc;
      delete image.dataset.heroSrc;
    }
    try {await image.decode();} catch {scheduleHero();return;}
    if(request!==heroRequest) return;
    heroIndex=index;
    $('.hero').dataset.index=String(index);
    slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===index));
    controls.forEach((button,i)=>{button.classList.toggle('is-active',i===index);if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
    $('#heroCount').textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    revealHeroCopy();
    scheduleHero();
  }
  function scheduleHero() {
    clearTimeout(heroTimer);
    if(!heroIntroActive&&!heroPaused&&!document.hidden&&!caseDialog.open) heroTimer=setTimeout(()=>selectHero((heroIndex+1)%slides.length),6500);
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
  hero.addEventListener('focusin',event=>{if(event.target.closest('.hero-summary,.hero-work')) finishHeroCopy();});
  document.addEventListener('visibilitychange',scheduleHero);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finishHeroCopy();heroTouch=null;resetHeroDrag(false);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden) finishHeroIntro(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&heroIntroActive){event.preventDefault();finishHeroIntro();}});
  window.addEventListener('resize',()=>{finishHeroIntro(false);heroTouch=null;resetHeroDrag(false);scheduleHero();});
  window.addEventListener('pagehide',()=>finishHeroIntro(false));
  window.addEventListener('studio:intro-timeout',()=>finishHeroIntro(false));
  caseDialog.addEventListener('close',scheduleHero);
  reduced.addEventListener('change',()=>{setHeroPause(reduced.matches);if(reduced.matches){finishHeroIntro(false);finishHeroCopy();heroTouch=null;resetHeroDrag(false);}});

  const brandMarks=$$('[data-brand-motion]');
  let brandMotionTimer=0;
  function stopBrandMotion() {
    clearTimeout(brandMotionTimer);
    brandMotionTimer=0;
    brandMarks.forEach(mark=>mark.classList.remove('is-animating','is-entering'));
  }
  function playBrandMotion({fromClosed=false}={}) {
    if(heroIntroActive||reduced.matches||document.hidden||brandMotionTimer||$('dialog[open]')) return;
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
  (async()=>{
    if(await startHeroIntro()) return;
    try {await slides[heroIndex].querySelector('img').decode();} catch {}
    if(heroRequest===0) revealHeroCopy(true);
    requestAnimationFrame(()=>playBrandMotion({fromClosed:true}));
  })();
})();
