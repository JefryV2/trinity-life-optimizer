import { createContext, useContext, useMemo, useState } from 'react';

import type { HealthTab, WealthTab } from '@/lib/navigation';

type SectionNav = {
  health: HealthTab;
  wealth: WealthTab;
  setHealth: (tab: HealthTab) => void;
  setWealth: (tab: WealthTab) => void;
};

const SectionNavContext = createContext<SectionNav | null>(null);

export const SectionNavProvider = ({ children }: { children: React.ReactNode }) => {
  const [health, setHealth] = useState<HealthTab>('overview');
  const [wealth, setWealth] = useState<WealthTab>('overview');
  const value = useMemo(
    () => ({ health, wealth, setHealth, setWealth }),
    [health, wealth],
  );
  return <SectionNavContext.Provider value={value}>{children}</SectionNavContext.Provider>;
};

export const useSectionNav = () => {
  const value = useContext(SectionNavContext);
  if (!value) throw new Error('useSectionNav must be used inside SectionNavProvider');
  return value;
};
