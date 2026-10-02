<script lang="ts">
  let copied = $state(false);

  async function copy() {
    await navigator.clipboard.writeText('-devserver ussr.pl');
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="methods">
  <section class="panel method c-blue">
    <header>
      <i class="fa-solid fa-link"></i>
      <div>
        <h2>The shortcut method</h2>
        <p>osu!'s own private server option. No admin rights needed.</p>
      </div>
    </header>
    <ol class="steps">
      <li>
        <b>Open the osu! shortcut's properties</b>
        <span>
          Right-click an osu! shortcut on your desktop, or make a new one, and pick Properties. It
          opens on the Shortcut tab.
        </span>
      </li>
      <li>
        <b>Add this to the end of Target</b>
        <span class="target">
          <span class="target-label">Target:</span>
          <code>"C:\...\osu!\osu!.exe" <mark>-devserver ussr.pl</mark></code>
        </span>
        <span class="tip">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>
            The path has to be in quotes <code>"..."</code>, and <code>-devserver ussr.pl</code>
            goes <b>after</b> the closing quote, not inside it. If the quotes are missing, add them.
          </span>
        </span>
        <button class="btn copy" class:copied type="button" onclick={copy}>
          <i class="fa-regular fa-copy"></i>Copy <code>-devserver ussr.pl</code>
        </button>
      </li>
      <li>
        <b>Launch osu! from that shortcut</b>
        <span>You're connected. Log in with your RealistikOsu account.</span>
      </li>
    </ol>
  </section>

  <section class="panel method c-green">
    <header>
      <i class="fa-solid fa-download"></i>
      <div>
        <h2>The RealistikOsu patcher</h2>
        <p>
          Does the connecting for you. If you play relax, it also brings back ranking panels, rate
          changes and a pp counter.
        </p>
      </div>
    </header>
    <p class="needs">
      <i class="fa-brands fa-windows"></i><i class="fa-brands fa-linux"></i>Windows and Linux.
    </p>
    <ol class="steps">
      <li>
        <b>Download the patcher and run it</b>
        <span><a href="/patcher">Get it from the patcher page</a> for your platform.</span>
      </li>
      <li>
        <b>That's it</b>
        <span>The patcher connects you to RealistikOsu. Log in with your account.</span>
      </li>
    </ol>
    <a class="btn btn-green" href="/patcher"
      ><i class="fa-solid fa-download"></i>Go to the patcher</a
    >
  </section>
</div>
