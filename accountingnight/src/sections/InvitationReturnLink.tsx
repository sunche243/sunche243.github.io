interface InvitationReturnLinkProps {
  href?: string;
}

export function InvitationReturnLink({ href = import.meta.env.BASE_URL }: InvitationReturnLinkProps) {
  return (
    <a className="invitation-return-link" href={href}>
      <span aria-hidden="true">←</span> 초대장으로 돌아가기
    </a>
  );
}
