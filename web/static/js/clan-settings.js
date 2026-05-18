// Client-side handlers for the clan settings page.
// Every form on the page is intercepted and the change is sent to soumetsu-api
// directly via SoumetsuAPI.clans.*, giving the user a toast straight away
// instead of redirecting through a server-side flash.

(function () {
    'use strict';

    const root = document.getElementById('clan-settings-root');
    if (!root) {
        return;
    }
    const clanId = parseInt(root.dataset.clanId, 10);
    if (!clanId) {
        return;
    }

    function toast(type, message) {
        if (typeof showMessage === 'function') {
            showMessage(type, message);
        } else {
            // Defensive fallback — showMessage lives in dist.min.js, which is
            // loaded before this script, but if it ever goes missing the alert
            // still tells the user something happened.
            window.alert(message);
        }
    }

    function describeError(err) {
        if (err && err.message) {
            return err.message;
        }
        return 'Something went wrong. Please try again.';
    }

    function setBusy(button, busy) {
        if (!button) {
            return;
        }
        if (busy) {
            button.dataset.originalDisabled = button.disabled ? '1' : '0';
            button.disabled = true;
            button.classList.add('opacity-60', 'cursor-wait');
        } else {
            button.disabled = button.dataset.originalDisabled === '1';
            button.classList.remove('opacity-60', 'cursor-wait');
        }
    }

    // --- Identity (name / tag / description) -----------------------------
    const identityForm = document.getElementById('clan-identity-form');
    if (identityForm) {
        identityForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = identityForm.querySelector('button[type="submit"]');
            setBusy(button, true);

            const body = {
                name: identityForm.querySelector('[name="name"]').value.trim(),
                tag: identityForm.querySelector('[name="tag"]').value.trim(),
                description: identityForm.querySelector('[name="description"]').value,
            };

            try {
                await SoumetsuAPI.clans.update(clanId, body);
                toast('success', 'Clan details saved.');
                const heading = document.getElementById('clan-name-heading');
                if (heading) {
                    heading.textContent = 'Manage ' + body.name;
                }
                const tagBadge = document.getElementById('clan-tag-badge');
                if (tagBadge) {
                    tagBadge.textContent = '[' + body.tag + ']';
                }
            } catch (err) {
                toast('error', describeError(err));
            } finally {
                setBusy(button, false);
            }
        });
    }

    // --- Icon upload ------------------------------------------------------
    const iconForm = document.getElementById('clan-icon-form');
    if (iconForm) {
        iconForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const fileInput = iconForm.querySelector('[name="icon"]');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                toast('error', 'Please pick an image to upload.');
                return;
            }
            const button = iconForm.querySelector('button[type="submit"]');
            setBusy(button, true);

            try {
                await SoumetsuAPI.clans.uploadIcon(clanId, fileInput.files[0]);
                toast('success', 'Clan icon updated.');
                refreshIconPreviews();
                fileInput.value = '';
            } catch (err) {
                toast('error', describeError(err));
            } finally {
                setBusy(button, false);
            }
        });
    }

    // --- Icon remove ------------------------------------------------------
    const iconRemoveForm = document.getElementById('clan-icon-remove-form');
    if (iconRemoveForm) {
        iconRemoveForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = iconRemoveForm.querySelector('button[type="submit"]');
            setBusy(button, true);
            try {
                await SoumetsuAPI.clans.removeIcon(clanId);
                toast('success', 'Clan icon removed.');
                refreshIconPreviews();
            } catch (err) {
                toast('error', describeError(err));
            } finally {
                setBusy(button, false);
            }
        });
    }

    function refreshIconPreviews() {
        const stamp = Date.now();
        document.querySelectorAll('[data-clan-icon]').forEach((el) => {
            el.style.visibility = '';
            el.src = '/api/v2/clans/' + clanId + '/icon?t=' + stamp;
        });
    }

    // --- Invite (rotate) --------------------------------------------------
    const inviteForm = document.getElementById('clan-invite-form');
    if (inviteForm) {
        inviteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = inviteForm.querySelector('button[type="submit"]');
            setBusy(button, true);
            try {
                const data = await SoumetsuAPI.clans.regenerateInvite(clanId);
                const code = data && (data.invite || data.invite_code);
                if (code) {
                    const baseURL = (window.soumetsuConf && window.soumetsuConf.baseAPI) || window.location.origin;
                    const url = baseURL.replace(/\/$/, '') + '/clans/invites/' + code;
                    const field = document.getElementById('invite-url-field');
                    if (field) {
                        field.value = url;
                    }
                    const empty = document.getElementById('invite-empty-state');
                    const present = document.getElementById('invite-present-state');
                    if (empty) {
                        empty.classList.add('hidden');
                    }
                    if (present) {
                        present.classList.remove('hidden');
                        if (field) {
                            field.value = url;
                        }
                    }
                }
                toast('success', 'A fresh invite link has been generated.');
            } catch (err) {
                toast('error', describeError(err));
            } finally {
                setBusy(button, false);
            }
        });
    }

    // --- Copy invite to clipboard ----------------------------------------
    const copyButton = document.getElementById('invite-copy-button');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const field = document.getElementById('invite-url-field');
            if (!field) {
                return;
            }
            try {
                await navigator.clipboard.writeText(field.value);
                const icon = copyButton.querySelector('i');
                if (icon) {
                    const previous = icon.className;
                    icon.className = 'fas fa-check';
                    setTimeout(() => {
                        icon.className = previous;
                    }, 1500);
                }
            } catch (err) {
                toast('error', 'Could not copy the link.');
            }
        });
    }

    // --- Kick member ------------------------------------------------------
    document.querySelectorAll('[data-kick-member]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userId = parseInt(form.dataset.kickMember, 10);
            const username = form.dataset.kickUsername || 'this member';
            if (!userId || !confirm('Kick ' + username + ' from the clan?')) {
                return;
            }
            const button = form.querySelector('button[type="submit"]');
            setBusy(button, true);
            try {
                await SoumetsuAPI.clans.kickMember(clanId, userId);
                form.closest('[data-member-row]').remove();
                toast('success', username + ' has been removed.');
            } catch (err) {
                toast('error', describeError(err));
                setBusy(button, false);
            }
        });
    });

    // --- Disband ----------------------------------------------------------
    const disbandForm = document.getElementById('clan-disband-form');
    if (disbandForm) {
        disbandForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = disbandForm.dataset.clanName || 'this clan';
            if (!confirm('Disband ' + name + '? This cannot be undone.')) {
                return;
            }
            const button = disbandForm.querySelector('button[type="submit"]');
            setBusy(button, true);
            try {
                await SoumetsuAPI.clans.disband(clanId);
                window.location.href = '/';
            } catch (err) {
                toast('error', describeError(err));
                setBusy(button, false);
            }
        });
    }
})();
