import { Privilege } from '$lib/auth/privileges';

export interface AdminPage {
  href: string;
  label: string;
  colour: string;
  icon: string;
  needs: number;
}

// The panel's sections, each with the privilege its page needed in RealistikPanel.
export const adminSections: { name: string; pages: AdminPage[] }[] = [
  {
    name: 'General',
    pages: [
      {
        href: '/admin',
        label: 'Dashboard',
        colour: 'c-blue',
        icon: 'fa-gauge-high',
        needs: Privilege.AdminAccessRap
      },
      {
        href: '/admin/users',
        label: 'Users',
        colour: 'c-green',
        icon: 'fa-users',
        needs: Privilege.AdminManageUsers
      },
      {
        href: '/admin/stats',
        label: 'Statistics',
        colour: 'c-teal',
        icon: 'fa-chart-line',
        needs: Privilege.AdminAccessRap
      }
    ]
  },
  {
    name: 'System',
    pages: [
      {
        href: '/admin/logs',
        label: 'Action logs',
        colour: 'c-purple',
        icon: 'fa-list-check',
        needs: Privilege.AdminViewRapLogs
      },
      {
        href: '/admin/ban-logs',
        label: 'Ban logs',
        colour: 'c-red',
        icon: 'fa-user-xmark',
        needs: Privilege.AdminViewRapLogs
      },
      {
        href: '/admin/console',
        label: 'Console',
        colour: 'c-orange',
        icon: 'fa-terminal',
        needs: Privilege.PanelErrorLogs
      }
    ]
  },
  {
    name: 'Management',
    pages: [
      {
        href: '/admin/ranking',
        label: 'Ranking',
        colour: 'c-lblue',
        icon: 'fa-angles-up',
        needs: Privilege.AdminAccessRap
      },
      {
        href: '/admin/requests',
        label: 'Rank requests',
        colour: 'c-pink',
        icon: 'fa-paper-plane',
        needs: Privilege.AdminAccessRap
      },
      {
        href: '/admin/bancho',
        label: 'Bancho settings',
        colour: 'c-yellow',
        icon: 'fa-server',
        needs: Privilege.AdminManageServer
      },
      {
        href: '/admin/settings',
        label: 'System settings',
        colour: 'c-orange',
        icon: 'fa-sliders',
        needs: Privilege.AdminManageSetting
      },
      {
        href: '/admin/badges',
        label: 'Badges',
        colour: 'c-yellow',
        icon: 'fa-certificate',
        needs: Privilege.AdminManageSetting
      },
      {
        href: '/admin/privileges',
        label: 'Privileges',
        colour: 'c-red',
        icon: 'fa-key',
        needs: Privilege.AdminManageSetting
      },
      {
        href: '/admin/clans',
        label: 'Clans',
        colour: 'c-purple',
        icon: 'fa-shield-halved',
        needs: Privilege.PanelManageClans
      }
    ]
  }
];
