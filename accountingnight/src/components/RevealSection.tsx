import { useCallback, type PropsWithChildren } from 'react';
import { useReveal } from '../hooks/useReveal';

interface RevealSectionProps extends PropsWithChildren {
  id?: string;
  className?: string;
  label?: string;
  sectionRef?: (node: HTMLElement | null) => void;
}

export function RevealSection({ id, className = '', label, sectionRef, children }: RevealSectionProps) {
  const ref = useReveal<HTMLElement>();
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
    sectionRef?.(node);
  }, [ref, sectionRef]);

  return (
    <section ref={setRef} id={id} className={`section reveal ${className}`} aria-label={label}>
      {children}
    </section>
  );
}
