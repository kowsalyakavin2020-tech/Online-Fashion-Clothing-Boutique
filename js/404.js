const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
tl.from('.brand', { y: 20, opacity: 0, duration: .6 })
  .from('#d1', { y: -120, opacity: 0, duration: .8 }, '-=.3')
  .from('#d2', { y: 120, opacity: 0, duration: .8 }, '<')
  .from('h1 i', { scale: 0, rotate: -90, duration: .9, ease: 'back.out(2)' }, '-=.5')
  .from('h2,p,.cta', { y: 30, opacity: 0, stagger: .12, duration: .7 }, '-=.4')
  .from('.pic', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'power4.out' }, 0.2)
  .from('.pic img', { scale: 1.3, duration: 1.6 }, 0.2);
gsap.to('h1 i', { rotate: 14, yoyo: true, repeat: -1, duration: 1.1, ease: 'sine.inOut', transformOrigin: '50% 0%' });
addEventListener('mousemove', e => {
  const x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
  gsap.to('.pic img', { x: x * -24, y: y * -24, scale: 1.08, duration: .8 });
  gsap.to('h1', { x: x * 14, y: y * 10, duration: .8 });
});

/* "Back to home" starts from the top; "Go back" returns to the section the visitor came from (saved by index page) */
document.getElementById('bh').addEventListener('click', () => { try { sessionStorage.removeItem('sl_back'); } catch (e) {} });
