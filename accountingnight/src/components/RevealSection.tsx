import { type PropsWithChildren } from 'react';
import { useReveal } from '../hooks/useReveal';

interface RevealSectionProps extends PropsWithChildren {
  id?: string;
  className?: string;
  label?: string;
}

export function RevealSection({ id, className = '', label, children }: RevealSectionProps) {
  const ref = useReveal<HTMLElement>();

  return (
    <section ref={ref} id={id} className={`section reveal ${className}`} aria-label={label}>
      {children}
    </section>
  );
}
