import { BackButton } from '@/components/ui/detail-header';

/** Kept as the one-line import for pages that only need the shared back icon. */
export const BackLink = ({
  fallback = '/welcome',
  label = 'Back',
}: {
  fallback?: string;
  label?: string;
}) => <BackButton fallback={fallback} label={label} />;
