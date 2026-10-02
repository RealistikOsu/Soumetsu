<script lang="ts">
  import { page } from '$app/state';
  import Banner from '$lib/components/Banner.svelte';

  const name = $derived(page.url.searchParams.get('name') ?? 'someone');
</script>

<svelte:head><title>Stop! · RealistikOsu</title></svelte:head>

<Banner image="stop.png">
  <div>
    <h1>Stop!</h1>
    <p class="sub">You already have an account.</p>
  </div>
</Banner>

<main class="wrap welcome">
  <div class="panel stop-box c-red">
    <div>
      <p class="lead">
        We see you're trying to sign up while already signed up as <b>{name}</b>. Multiaccounting is
        punishable, and can lead to a one month restriction.
      </p>
      <ul>
        <li>If you're {name}, keep in mind that multiaccounting = ban.</li>
        <li>
          If you're not {name} but you're using {name}'s computer, please sign up from your own
          computer.
        </li>
        <li>
          If you live with {name} and don't have your own computer to sign up from, contact one of the
          staff on our <a href="/discord">Discord server</a> and we'll deal with your case.
        </li>
      </ul>
      <p class="muted">
        This can also show up if you're on another computer on the same network as {name}. As long
        as it isn't the same computer, you should be fine.
      </p>
      <div class="avatar-actions">
        <a class="btn btn-blue" href="/"
          ><i class="fa-solid fa-chevron-left"></i>Bring me back to safety!</a
        >
      </div>
      <a class="camouflaged" href="/register?stopsign=1">
        If you've truly understood all of the above, and that making a multiaccount will get your
        main account restricted, you can continue to sign up.
      </a>
    </div>
    <img src="/img/peppy-mad.png" alt="peppy, looking mad" />
  </div>
</main>
