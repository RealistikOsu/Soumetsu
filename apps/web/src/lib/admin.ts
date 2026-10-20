import { getContext, setContext } from 'svelte';
import { Privilege } from '$lib/auth/privileges';

export type Waiting = 'reports' | 'messageReports' | 'requests';

export interface AdminPage {
  href: string;
  label: string;
  icon: string;
  needs: number;
  // Extra words the search matches, for pages people look for by what they do there.
  keywords: string;
  waiting?: Waiting;
}

export interface AdminArea {
  key: string;
  name: string;
  colour: string;
  icon: string;
  pages: AdminPage[];
}

export const dashboardPage: AdminPage = {
  href: '/admin',
  label: 'Dashboard',
  icon: 'fa-gauge-high',
  needs: Privilege.AdminAccessRap,
  keywords: 'home'
};

// Each page keeps the privilege its page needed in RealistikPanel.
export const adminAreas: AdminArea[] = [
  {
    key: 'players',
    name: 'Players',
    colour: 'c-green',
    icon: 'fa-users',
    pages: [
      {
        href: '/admin/users',
        label: 'Users',
        icon: 'fa-users',
        needs: Privilege.AdminManageUsers,
        keywords: 'players accounts hwid ip ban restrict freeze'
      },
      {
        href: '/admin/reports',
        label: 'Player reports',
        icon: 'fa-triangle-exclamation',
        needs: Privilege.AdminManageReport,
        keywords: 'reports cheating',
        waiting: 'reports'
      },
      {
        href: '/admin/message-reports',
        label: 'Message reports',
        icon: 'fa-flag',
        needs: Privilege.AdminManageReport,
        keywords: 'chat messages reports',
        waiting: 'messageReports'
      },
      {
        href: '/admin/clans',
        label: 'Clans',
        icon: 'fa-shield-halved',
        needs: Privilege.PanelManageClans,
        keywords: 'clan'
      }
    ]
  },
  {
    key: 'beatmaps',
    name: 'Beatmaps',
    colour: 'c-pink',
    icon: 'fa-music',
    pages: [
      {
        href: '/admin/ranking',
        label: 'Ranking',
        icon: 'fa-angles-up',
        needs: Privilege.AdminAccessRap,
        keywords: 'rank beatmaps status loved'
      },
      {
        href: '/admin/requests',
        label: 'Rank requests',
        icon: 'fa-paper-plane',
        needs: Privilege.AdminAccessRap,
        keywords: 'requests beatmaps',
        waiting: 'requests'
      },
      {
        href: '/admin/upload-requests',
        label: 'Upload requests',
        icon: 'fa-circle-play',
        needs: Privilege.AdminAccessRap,
        keywords: 'uploads beatmaps'
      }
    ]
  },
  {
    key: 'site',
    name: 'Site',
    colour: 'c-blue',
    icon: 'fa-globe',
    pages: [
      {
        href: '/admin/news',
        label: 'News',
        icon: 'fa-newspaper',
        needs: Privilege.AdminManageDocs,
        keywords: 'posts'
      },
      {
        href: '/admin/badges',
        label: 'Badges',
        icon: 'fa-certificate',
        needs: Privilege.AdminManageSetting,
        keywords: 'badge'
      },
      {
        href: '/admin/daily-challenge',
        label: 'Daily challenge',
        icon: 'fa-calendar-day',
        needs: Privilege.AdminManageBeatmap,
        keywords: 'daily'
      },
      {
        href: '/admin/commissions',
        label: 'Commissions',
        icon: 'fa-clipboard-check',
        needs: Privilege.AdminManageSetting,
        keywords: 'tasks'
      },
      {
        href: '/admin/shop',
        label: 'Shop',
        icon: 'fa-store',
        needs: Privilege.AdminManageSetting,
        keywords: 'decorations coins'
      },
      {
        href: '/admin/casino',
        label: 'Casino',
        icon: 'fa-dice',
        needs: Privilege.AdminManageSetting,
        keywords: 'coins games'
      }
    ]
  },
  {
    key: 'server',
    name: 'Server',
    colour: 'c-orange',
    icon: 'fa-server',
    pages: [
      {
        href: '/admin/bancho',
        label: 'Bancho settings',
        icon: 'fa-tower-broadcast',
        needs: Privilege.AdminManageServer,
        keywords: 'maintenance menu icon'
      },
      {
        href: '/admin/settings',
        label: 'System settings',
        icon: 'fa-sliders',
        needs: Privilege.AdminManageSetting,
        keywords: 'registration'
      },
      {
        href: '/admin/lazer',
        label: 'Lazer',
        icon: 'fa-bolt',
        needs: Privilege.AdminManageBeatmap,
        keywords: 'wipe roll back'
      },
      {
        href: '/admin/privileges',
        label: 'Privileges',
        icon: 'fa-key',
        needs: Privilege.AdminManageSetting,
        keywords: 'groups permissions'
      },
      {
        href: '/admin/console',
        label: 'Console',
        icon: 'fa-terminal',
        needs: Privilege.PanelErrorLogs,
        keywords: 'errors tracebacks'
      }
    ]
  },
  {
    key: 'logs',
    name: 'Logs',
    colour: 'c-purple',
    icon: 'fa-list-check',
    pages: [
      {
        href: '/admin/stats',
        label: 'Statistics',
        icon: 'fa-chart-line',
        needs: Privilege.AdminAccessRap,
        keywords: 'stats graphs'
      },
      {
        href: '/admin/logs',
        label: 'Action logs',
        icon: 'fa-list-check',
        needs: Privilege.AdminViewRapLogs,
        keywords: 'staff logs'
      },
      {
        href: '/admin/ban-logs',
        label: 'Ban logs',
        icon: 'fa-user-xmark',
        needs: Privilege.AdminViewRapLogs,
        keywords: 'bans restrictions silences'
      }
    ]
  }
];

// The layout loads the areas a staff member can open and what's waiting, and the dashboard shows the same.
export interface AdminNav {
  readonly areas: AdminArea[];
  readonly waiting: Record<Waiting, number> | null;
}

const navKey = Symbol('admin-nav');

export const setAdminNav = (nav: AdminNav) => setContext(navKey, nav);
export const getAdminNav = () => getContext<AdminNav>(navKey);

export const waitingIn = (pages: AdminPage[], waiting: Record<Waiting, number> | null) =>
  pages.reduce((total, p) => total + (p.waiting ? (waiting?.[p.waiting] ?? 0) : 0), 0);

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
