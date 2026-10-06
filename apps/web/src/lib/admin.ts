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
        href: '/admin/reports',
        label: 'Player reports',
        colour: 'c-red',
        icon: 'fa-triangle-exclamation',
        needs: Privilege.AdminManageReport
      },
      {
        href: '/admin/message-reports',
        label: 'Message reports',
        colour: 'c-orange',
        icon: 'fa-flag',
        needs: Privilege.AdminManageReport
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
        href: '/admin/upload-requests',
        label: 'Upload requests',
        colour: 'c-red',
        icon: 'fa-circle-play',
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
        href: '/admin/lazer',
        label: 'Lazer',
        colour: 'c-teal',
        icon: 'fa-bolt',
        needs: Privilege.AdminManageBeatmap
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

export const permissions: [number, string][] = [
  [Privilege.Public, 'Public'],
  [Privilege.Normal, 'Normal'],
  [Privilege.Donor, 'Supporter'],
  [Privilege.AdminAccessRap, 'Access admin panel'],
  [Privilege.AdminManageUsers, 'Manage users'],
  [Privilege.AdminBanUsers, 'Ban users'],
  [Privilege.AdminSilenceUsers, 'Silence users'],
  [Privilege.AdminWipeUsers, 'Wipe users'],
  [Privilege.AdminManageBeatmap, 'Manage beatmaps (all modes)'],
  [Privilege.AdminManageStdBeatmaps, 'Manage beatmaps (osu!)'],
  [Privilege.AdminManageTaikoBeatmaps, 'Manage beatmaps (taiko)'],
  [Privilege.AdminManageCatchBeatmaps, 'Manage beatmaps (catch)'],
  [Privilege.AdminManageManiaBeatmaps, 'Manage beatmaps (mania)'],
  [Privilege.AdminManageServer, 'Manage servers'],
  [Privilege.AdminManageSetting, 'Manage settings'],
  [Privilege.AdminManageBetaKey, 'Manage beta keys'],
  [Privilege.AdminManageReport, 'Manage reports'],
  [Privilege.AdminManageDocs, 'Manage docs'],
  [Privilege.AdminManageBadges, 'Manage badges'],
  [Privilege.AdminViewRapLogs, 'View action logs'],
  [Privilege.AdminManagePrivilege, 'Manage privileges'],
  [Privilege.AdminSendAlerts, 'Send alerts'],
  [Privilege.AdminChatMod, 'Chat moderator'],
  [Privilege.AdminKickUsers, 'Kick users'],
  [Privilege.PendingVerification, 'Pending verification'],
  [Privilege.TournamentStaff, 'Tournament staff'],
  [Privilege.PanelErrorLogs, 'View error logs'],
  [Privilege.PanelManageClans, 'Manage clans'],
  [Privilege.PanelViewIps, 'View IPs'],
  [Privilege.Bot, 'Bot']
];
