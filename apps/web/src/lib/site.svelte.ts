import { siteInfo, type SiteInfo } from '$lib/api/site';

class Site {
  info = $state.raw<SiteInfo | null>(null);

  async load() {
    this.info = await siteInfo().catch(() => this.info);
  }
}

export const site = new Site();
