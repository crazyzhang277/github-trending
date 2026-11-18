import { useState } from 'react';
import { getInitials } from '../utils/format';

interface RepoAvatarProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}

function AvatarImage({ src, alt, className = '', size = 36 }: RepoAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span
        className={`avatar-fallback ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {getInitials(alt)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function RepoAvatar(props: RepoAvatarProps) {
  return <AvatarImage key={props.src} {...props} />;
}
