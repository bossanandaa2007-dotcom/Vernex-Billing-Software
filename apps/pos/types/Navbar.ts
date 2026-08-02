export type NavItem = {
  title: string;
  path: string;
  icon?: JSX.Element;
  roles?: Array<'OWNER' | 'MANAGER' | 'CASHIER' | 'WORKER' | 'UNKNOW'>;
  /** Omit for pages that are not behind a feature module (always available). */
  moduleKey?: import('@/lib/modules').ModuleKey;
};
