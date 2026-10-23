(() => {
  'use strict';
  const data = window.STUDIO_DATA;
  if (!data) return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => ['arrow-up-right','external-link'].includes(name) ? '<svg class="link-asterisk" aria-hidden="true"><use href="#link-asterisk"/></svg>' : `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const refreshIcons = () => window.lucide?.createIcons({attrs:{'stroke-width':1.6}});
  $$('[data-lucide="arrow-up-right"],[data-lucide="external-link"]').forEach(element=>{element.outerHTML=icon('arrow-up-right');});
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let filter = 'all';
  let visibleCases = 6;
  const categories = [{id:'all',title:'全部作品'},{id:'promo',title:'宣传与专题'},{id:'documentary',title:'纪录与短片'},{id:'events',title:'活动与演出'},{id:'brand',title:'品牌视觉'}];
  const matching = id => data.projects.filter(item => id === 'all' || item.format === id);
  const platform = url => {
    const host = new URL(url).hostname;
    return host.includes('douyin') ? '抖音' : host === 'mp.weixin.qq.com' ? '微信公众号' : host.includes('weixin') ? '视频号' : host.includes('xuexi.cn') ? '学习强国' : host.includes('baidu') ? '百度网盘' : '品牌网站';
  };
  const watchLabel = (project, link = project.links[0]) => link?.kind === 'publication' || link?.kind === 'video' ? link.label : project.id === 'oxs' ? '查看品牌网站' : project.id === 'foreign-language' ? '观看中英文成片' : '观看完整影片';
  const watchIcon = (project, link = project.links[0]) => link?.kind === 'publication' || project.id === 'oxs' ? 'external-link' : 'play';
  const external = (link, label, className = '', iconName = 'arrow-up-right') => `<a class="${className}" href="${escape(link.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(label)}，${platform(link.href)}，在新窗口打开">${escape(label)}${icon(iconName)}</a>`;

  function renderFilters() {
    $('#caseFilters').innerHTML = categories.map(item => `<button type="button" class="${item.id === filter ? 'is-active' : ''}" data-filter="${item.id}" aria-pressed="${item.id === filter}">${item.title}</button>`).join('');
  }

  function renderCases() {
    const projects = matching(filter);
    const shown = projects.slice(0, visibleCases);
    $('#caseGrid').innerHTML = shown.map(project => `
      <article class="case-card">
        <button class="case-image ${project.coverFit === 'contain' || project.id === 'oxs' ? 'is-original' : ''}" type="button" data-case="${project.id}" aria-label="查看《${escape(project.title)}》案例图集" title="查看案例图集">
          <img src="${escape(project.cover)}"${project.coverImage?.srcSet ? ` srcset="${escape(project.coverImage.srcSet)}" sizes="(max-width: 560px) 92vw, (max-width: 900px) 46vw, 40vw"` : ''} alt="《${escape(project.title)}》项目封面" width="${project.coverImage?.width||1400}" height="${project.coverImage?.height||787}" loading="lazy" decoding="async">
        </button>
        <div class="case-heading"><h3>${escape(project.title)}</h3>${project.year ? `<span class="case-year">${escape(project.year)}</span>` : ''}</div>
        <p class="case-type">${escape(project.type)}</p>
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
  const memberButtons=$$('[data-member]');
  const memberList=$('.team-list');
  const memberDetails=$('.team-details');
  const memberHover=window.matchMedia('(hover:hover) and (pointer:fine)');
  let activeMember=null,memberHeightAnimation=null,memberContentAnimation=null;
  function showMember(button){
    if(activeMember===button)return;
    const fromHeight=memberDetails.getBoundingClientRect().height;
    memberHeightAnimation?.cancel();
    memberContentAnimation?.cancel();
    memberDetails.style.height=`${fromHeight}px`;
    activeMember=button;
    memberButtons.forEach(other=>{
      const selected=other===button;
      other.setAttribute('aria-expanded',String(selected));
      document.getElementById(other.dataset.member).hidden=!selected;
    });
    const profile=button?document.getElementById(button.dataset.member):null;
    const toHeight=profile?.getBoundingClientRect().height||0;
    memberDetails.style.height=`${toHeight}px`;
    if(reduced.matches){memberDetails.style.height='';return;}
    const animation=memberDetails.animate([{height:`${fromHeight}px`},{height:`${toHeight}px`}],{duration:240,easing:'cubic-bezier(.22,.65,.26,1)'});
    memberHeightAnimation=animation;
    if(profile)memberContentAnimation=profile.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
    animation.finished.then(()=>{if(memberHeightAnimation===animation){memberDetails.style.height='';memberHeightAnimation=null;}}).catch(()=>{});
  }
  memberButtons.forEach((button,index)=>{
    button.addEventListener('pointerenter',event=>{
      if(memberHover.matches&&event.pointerType!=='touch')showMember(button);
    });
    button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))showMember(button);});
    button.addEventListener('click',event=>{
      if(memberHover.matches&&event.detail>0&&event.pointerType!=='touch')showMember(button);
      else showMember(activeMember===button?null:button);
    });
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%memberButtons.length;
      else if(event.key==='ArrowLeft')next=(index-1+memberButtons.length)%memberButtons.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=memberButtons.length-1;
      else if(event.key==='Escape'){event.preventDefault();showMember(null);}
      if(next!==undefined){event.preventDefault();memberButtons[next].focus();}
    });
  });
  memberList.addEventListener('pointerleave',event=>{
    if(memberHover.matches&&event.pointerType!=='touch'&&!memberList.querySelector(':focus-visible'))showMember(null);
  });
  memberList.addEventListener('focusout',event=>{
    if(!memberList.contains(event.relatedTarget)&&!memberList.matches(':hover'))showMember(null);
  });

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
  window.matchMedia('(min-width:701px)').addEventListener('change',()=>setMenu(false));

  const slides=$$('.hero-slide');
  const controls=$$('[data-hero]');
  const hero=$('.hero');
  const heroSummary=$('.hero-summary');
  if('IntersectionObserver' in window){
    let headerObserver;
    const observeHeader=()=>{
      headerObserver?.disconnect();
      headerObserver=new IntersectionObserver(entries=>{
        const over=entries[0].isIntersecting;
        header.classList.toggle('is-over-hero',over);
        if(over)$$('.main-nav a').forEach(link=>{link.classList.remove('is-active');link.removeAttribute('aria-current');});
      },{rootMargin:`-${header.offsetHeight}px 0px 0px 0px`,threshold:0});
      headerObserver.observe(hero);
    };
    observeHeader();
    if('ResizeObserver' in window)new ResizeObserver(observeHeader).observe(header);
  }else header.classList.remove('is-over-hero');
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
    heroCopyAnimations=[heroSummary.animate(
      [{opacity:0,transform:'translateX(24px)'},{opacity:1,transform:'translateX(0)'}],
      {duration:850,delay:initial?450:350,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'}
    )];
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
    if(hadFocus) controls[heroIndex].focus({preventScroll:true});
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
      heroIntro.dataset.phase='logo';
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
      const logo=document.createElement('div');
      logo.className='hero-intro-logo';
      logo.setAttribute('role','img');
      logo.setAttribute('aria-label','第二人生 Second Chapter Studio');
      const logoImage=document.createElement('img');
      logoImage.src=$('.brand img').src;
      logoImage.alt='';
      const logoWords=['second','chapter','studio'].map(name=>{
        const word=document.createElement('span');
        word.className=`hero-intro-word is-${name}`;
        word.dataset.word=name;
        word.setAttribute('aria-hidden','true');
        word.append(logoImage.cloneNode(false));
        return word;
      });
      const logoCorner=document.createElement('span');
      logoCorner.className='brand-corner brand-logo-corner intro-logo-corner';
      logoCorner.setAttribute('aria-hidden','true');
      logo.append(...logoWords,logoCorner);
      const logoWidth=Math.min(460,innerWidth*.8);
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
      try {await Promise.all([image.decode(),logoImage.decode()]);} catch {finishHeroIntro();return true;}
      if(!heroIntroActive) return true;
      const coverBounds=(width,height,left=0,top=0)=>{
        const aspect=image.naturalWidth/image.naturalHeight;
        const position=getComputedStyle(source).objectPosition.split(' ').map(value=>parseFloat(value)/100);
        const imageWidth=Math.max(width,height*aspect),imageHeight=imageWidth/aspect;
        return {width:imageWidth,height:imageHeight,x:left+(width-imageWidth)*position[0],y:top+(height-imageHeight)*position[1]};
      };
      const fullImage=coverBounds(innerWidth,innerHeight);
      const mix=(start,end,progress)=>start+(end-start)*progress;
      const cameraTransform=progress=>{
        const scale=mix(1.22,1,progress);
        return `translate(${innerWidth/2+(fullImage.x-innerWidth/2)*scale}px,${innerHeight/2+(fullImage.y-innerHeight/2)*scale}px) scale(${scale})`;
      };
      Object.assign(image.style,{width:`${fullImage.width}px`,height:`${fullImage.height}px`,transform:cameraTransform(0)});
      fogLayers.forEach(layer=>Object.assign(layer.firstElementChild.style,{
        width:`${fullImage.width}px`,height:`${fullImage.height}px`,transform:cameraTransform(0)
      }));
      const startPullback=()=>{
        if(!heroIntroActive) return;
        heroIntro.dataset.phase='pullback';
        // Keep the background still until the complete wordmark has appeared.
        const camera=[image,...fogLayers.map(layer=>layer.firstElementChild)].map(layer=>layer.animate(
          settleFrames(progress=>({transform:cameraTransform(progress)}),5.2),
          {duration:3850,easing:'linear',fill:'forwards'}
        ));
        const fog=fogLayers.map((layer,index)=>layer.animate([
          {opacity:index ? .32 : 1},
          {opacity:index ? .28 : .82,offset:.3},
          {opacity:0}
        ],{duration:index?3900:3700,easing:'cubic-bezier(.25,.1,.35,1)',fill:'forwards'}));
        const clear=image.animate([{opacity:.12},{opacity:1}],{duration:3400,delay:150,easing:'ease-in-out',fill:'forwards'});
        const washOut=wash.animate([{opacity:1},{opacity:0}],{duration:3200,easing:'ease-in-out',fill:'forwards'});
        const logoBounds=logo.getBoundingClientRect();
        const target=$('.hero-brand .brand-wordmark-art').getBoundingClientRect();
        const logoHome=logo.animate(settleFrames(progress=>({
          transform:`translate(${(target.left-logoBounds.left)*progress}px,${(target.top-logoBounds.top)*progress}px) scale(${mix(1,target.width/logoBounds.width,progress)})`
        }),4.8),{duration:2200,delay:500,easing:'linear',fill:'forwards'});
        heroIntroAnimations.push(...camera,...fog,clear,washOut,logoHome);
        Promise.all([...camera.map(animation=>animation.finished),...fog.map(animation=>animation.finished),logoHome.finished]).then(()=>finishHeroIntro()).catch(()=>{});
      };
      logoCorner.classList.add('is-animating','is-entering');
      const opening=logoCorner.getAnimations({subtree:true});
      heroIntroAnimations.push(...opening);
      Promise.all(opening.map(animation=>animation.finished)).then(async()=>{
        if(!heroIntroActive)return;
        logoCorner.classList.remove('is-animating','is-entering');
        for(const word of logoWords){
          if(!heroIntroActive)return;
          heroIntro.dataset.phase=word.dataset.word;
          const appearance=word.animate([{opacity:0},{opacity:1}],{
            duration:420,easing:'ease-out',fill:'forwards'
          });
          heroIntroAnimations.push(appearance);
          await appearance.finished;
        }
        if(!heroIntroActive)return;
        heroIntro.dataset.phase='hold';
        heroIntroTimer=setTimeout(startPullback,160);
      }).catch(()=>{});
    } catch {
      finishHeroIntro();
    }
    return true;
  }
  let heroIndex=0,heroTimer=0,heroPaused=reduced.matches,heroInteracted=false,heroRequest=0;
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
    finishHeroCopy();
    scheduleHero();
  }
  function scheduleHero() {
    clearTimeout(heroTimer);
    if(!heroIntroActive&&!heroPaused&&!document.hidden&&!caseDialog.open) heroTimer=setTimeout(()=>selectHero((heroIndex+1)%slides.length),6500);
  }
  function setHeroPause(paused) {
    heroPaused=paused;
    scheduleHero();
  }
  controls.forEach(button=>{
    button.setAttribute('aria-label',`${button.getAttribute('aria-label')}，切换并停止自动轮播`);
    button.addEventListener('click',()=>{heroInteracted=true;setHeroPause(true);selectHero(Number(button.dataset.hero));});
  });
  hero.addEventListener('focusin',event=>{
    heroInteracted=true;setHeroPause(true);
    if(event.target.closest('.hero-summary,.hero-work')) finishHeroCopy();
  });
  document.addEventListener('visibilitychange',scheduleHero);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finishHeroCopy();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden) finishHeroIntro(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&heroIntroActive){event.preventDefault();finishHeroIntro();}});
  window.addEventListener('resize',()=>{finishHeroIntro(false);scheduleHero();});
  window.addEventListener('pagehide',()=>finishHeroIntro(false));
  window.addEventListener('studio:intro-timeout',()=>finishHeroIntro(false));
  caseDialog.addEventListener('close',scheduleHero);
  reduced.addEventListener('change',()=>{setHeroPause(reduced.matches||heroInteracted);if(reduced.matches){finishHeroIntro(false);finishHeroCopy();}});

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
  $('.brand').addEventListener('pointerenter',event=>{
    if(event.pointerType!=='touch') playBrandMotion();
  });
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
