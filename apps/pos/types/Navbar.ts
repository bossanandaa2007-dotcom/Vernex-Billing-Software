export type NavItem = {
  title: string;
  path: string;
  icon?: JSX.Element;
  roles?: Array<'OWNER' | 'MANAGER' | 'CASHIER' | 'WORKER' | 'UNKNOW'>;
  moduleKey: import('@/lib/modules').ModuleKey;
};
