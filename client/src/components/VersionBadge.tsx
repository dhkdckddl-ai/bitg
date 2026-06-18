import { APP_VERSION } from '../version';

export default function VersionBadge() {
  return (
    <span className="font-mono text-[10px] text-[var(--color-text-secondary)] opacity-70">
      v{APP_VERSION}
    </span>
  );
}
