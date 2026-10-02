<script lang="ts">
  import { m } from '$lib/paraglide/messages';
</script>

<dl class="features">
  <div class="c-pink">
    <dt><i class="fa-solid fa-user-group"></i>{m.home_feature_relax_title()}</dt>
    <dd>{m.home_feature_relax_text()}</dd>
  </div>
  <div class="c-lblue">
    <dt><i class="fa-solid fa-forward"></i>{m.home_feature_rate_title()}</dt>
    <dd>
      {m.home_feature_rate_before()}
      <a href="/patcher">{m.home_feature_rate_link()}</a>{m.home_feature_rate_after()}
    </dd>
  </div>
  <div class="c-orange">
    <dt><i class="fa-solid fa-angles-up"></i>{m.home_feature_ranking_title()}</dt>
    <dd>
      {m.home_feature_ranking_before()}
      <a href="/rank-request">{m.home_feature_ranking_link()}</a>
      {m.home_feature_ranking_after()}
    </dd>
  </div>
  <div class="c-purple">
    <dt><i class="fa-solid fa-shield-halved"></i>{m.home_feature_clans_title()}</dt>
    <dd>{m.home_feature_clans_text()}</dd>
  </div>
</dl>
