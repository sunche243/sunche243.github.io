import { useEffect, useState } from 'react';

export function StickySponsorCta({ completed }: { completed: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (completed) {
      setVisible(false);
      return;
    }

    const form = document.getElementById('registration');
    const footer = document.querySelector('.final');
    let formVisible = false;
    let footerVisible = false;

    const update = () => setVisible(window.scrollY > Math.min(240, window.innerHeight * 0.28) && !formVisible && !footerVisible);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === form) formVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      }
      update();
    }, { threshold: 0.05 });

    if (form) observer.observe(form);
    if (footer) observer.observe(footer);
    window.addEventListener('scroll', update, { passive: true });
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, [completed]);

  return (
    <div className={`sponsor-sticky-cta ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <a className="button button--gold" href="#registration" tabIndex={visible ? 0 : -1}>후원 및 참석 확약하기</a>
    </div>
  );
}
