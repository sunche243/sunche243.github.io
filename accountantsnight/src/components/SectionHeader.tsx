interface SectionHeaderProps {
  eyebrow: string;
  title?: string;
  align?: 'left' | 'center';
}

export function SectionHeader({ eyebrow, title, align = 'center' }: SectionHeaderProps) {
  return (
    <div className={`section-header section-header--${align}`}>
      <p>{eyebrow}</p>
      {title ? <h2>{title}</h2> : null}
    </div>
  );
}
