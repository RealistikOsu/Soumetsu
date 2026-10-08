<script lang="ts">
  import { m } from '$lib/paraglide/messages';

  let copied = $state(false);

  async function copy() {
    await navigator.clipboard.writeText('-devserver ussr.pl');
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="methods">
  <section class="panel method c-green">
    <header>
      <i class="fa-solid fa-download"></i>
      <div>
        <h2>{m.auth_method_patcher()}</h2>
        <p>{m.auth_method_patcher_desc()}</p>
      </div>
    </header>
    <p class="needs">
      <i class="fa-brands fa-windows"></i><i class="fa-brands fa-linux"
      ></i>{m.auth_method_patcher_platforms()}
    </p>
    <ol class="steps">
      <li>
        <b>{m.auth_method_patcher_step1()}</b>
        <span
          ><a href="/patcher">{m.auth_method_patcher_step1_link()}</a
          >{m.auth_method_patcher_step1_end()}</span
        >
      </li>
      <li>
        <b>{m.auth_method_patcher_step2()}</b>
        <span>{m.auth_method_patcher_step2_text()}</span>
      </li>
    </ol>
    <a class="btn btn-green" href="/patcher"
      ><i class="fa-solid fa-download"></i>{m.auth_method_patcher_go()}</a
    >
  </section>

  <section class="panel method c-blue">
    <header>
      <i class="fa-solid fa-link"></i>
      <div>
        <h2>{m.auth_method_shortcut()}</h2>
        <p>{m.auth_method_shortcut_desc()}</p>
      </div>
    </header>
    <ol class="steps">
      <li>
        <b>{m.auth_method_shortcut_step1()}</b>
        <span>{m.auth_method_shortcut_step1_text()}</span>
      </li>
      <li>
        <b>{m.auth_method_shortcut_step2()}</b>
        <span class="target">
          <span class="target-label">{m.auth_method_shortcut_target()}</span>
          <code>"C:\...\osu!\osu!.exe" <mark>-devserver ussr.pl</mark></code>
        </span>
        <span class="tip">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>
            {m.auth_method_shortcut_tip_start()}
            <code>"..."</code>{m.auth_method_shortcut_tip_and()}
            <code>-devserver ussr.pl</code>
            {m.auth_method_shortcut_tip_goes()} <b>{m.auth_method_shortcut_tip_after()}</b>
            {m.auth_method_shortcut_tip_end()}
          </span>
        </span>
        <button class="btn copy" class:copied type="button" onclick={copy}>
          <i class="fa-regular fa-copy"></i>{m.auth_method_shortcut_copy()}
          <code>-devserver ussr.pl</code>
        </button>
      </li>
      <li>
        <b>{m.auth_method_shortcut_step3()}</b>
        <span>{m.auth_method_shortcut_step3_text()}</span>
      </li>
    </ol>
  </section>
</div>
