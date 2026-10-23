import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const entry = html.match(/<script id="studio-entry">([\s\S]*?)<\/script>/)?.[1];
assert.ok(entry, 'The cover reset must run inline before deferred scripts.');

function page(url, {replaceBlocked = false} = {}) {
  const listeners = new Map();
  const frames = [];
  const state = {source: 'existing history entry'};
  const context = {
    URL,
    location: new URL(url),
    scrollY: 14000,
    calls: [],
    history: {
      state,
      scrollRestoration: 'auto',
      replaceState(value, title, href) {
        if (replaceBlocked) throw new Error('History changes unavailable');
        assert.equal(value, state);
        context.location = new URL(href);
      }
    },
    requestAnimationFrame(callback) { frames.push(callback); },
    addEventListener(type, callback, options) {
      const list = listeners.get(type) || [];
      list.push({callback, once: options?.once});
      listeners.set(type, list);
    },
    scrollTo(options) {
      assert.equal(options.behavior, 'instant');
      context.scrollY = options.top;
      context.calls.push(options);
    }
  };
  context.document = {addEventListener: context.addEventListener};
  context.window = context;
  vm.runInNewContext(entry, context);
  const emit = (type, event = {}) => {
    const current = listeners.get(type) || [];
    listeners.set(type, current.filter(listener => !listener.once));
    for (const listener of current) listener.callback(event);
  };
  const paint = () => { for (const callback of frames.splice(0)) callback(); };
  return {context, emit, paint};
}

for (const protocol of ['https://example.com/studio/', 'file:///site/index.html']) {
  for (const hash of ['', '#work', '#contact']) {
    test(`entry resets old scroll and fragment: ${protocol}${hash}`, () => {
      const {context, emit, paint} = page(`${protocol}?v=19${hash}`);
      assert.equal(context.scrollY, 0);
      assert.equal(context.location.hash, '');
      assert.equal(context.location.search, '?v=19');
      assert.equal(context.history.scrollRestoration, 'manual');
      context.scrollY = 15000;
      emit('DOMContentLoaded');
      emit('load');
      emit('pageshow', {persisted: false});
      paint();
      assert.equal(context.scrollY, 0);
    });
  }
}

test('in-page navigation is not overridden after entry', () => {
  const {context, emit, paint} = page('https://example.com/?v=19#contact');
  emit('DOMContentLoaded'); emit('load'); emit('pageshow'); paint();
  context.location.hash = '#services'; context.scrollY = 5200;
  paint();
  assert.equal(context.scrollY, 5200);
  assert.equal(context.location.hash, '#services');
});

for (const intent of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
  test(`early ${intent} stops deferred resets from fighting navigation`, () => {
    const {context, emit, paint} = page('https://example.com/');
    emit(intent);
    context.location.hash = '#work'; context.scrollY = 1700;
    emit('DOMContentLoaded'); emit('load'); emit('pageshow'); paint();
    assert.equal(context.scrollY, 1700);
    assert.equal(context.location.hash, '#work');
  });
}

test('returning from back-forward cache starts at cover again', () => {
  const {context, emit, paint} = page('https://example.com/');
  emit('DOMContentLoaded'); emit('load'); emit('pageshow'); paint();
  context.location.hash = '#contact'; context.scrollY = 15000;
  emit('pageshow', {persisted: true}); paint();
  assert.equal(context.scrollY, 0);
  assert.equal(context.location.hash, '');
});

test('restricted history APIs do not prevent the scroll reset', () => {
  const {context, emit, paint} = page('file:///site/index.html#contact', {replaceBlocked: true});
  emit('DOMContentLoaded'); emit('load'); emit('pageshow'); paint();
  assert.equal(context.scrollY, 0);
  assert.equal(context.history.scrollRestoration, 'manual');
});
