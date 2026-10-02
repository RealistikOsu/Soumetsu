export type FlashKind = 'error' | 'success' | 'warning';

interface Flash {
  id: number;
  kind: FlashKind;
  text: string;
  carry: boolean;
}

class FlashStore {
  items = $state<Flash[]>([]);
  #next = 0;

  show(kind: FlashKind, text: string) {
    this.items.push({ id: this.#next++, kind, text, carry: false });
  }

  // Shown on the page the next navigation lands on, like Hanayo's messages across a redirect.
  next(kind: FlashKind, text: string) {
    this.items.push({ id: this.#next++, kind, text, carry: true });
  }

  dismiss(id: number) {
    this.items = this.items.filter((item) => item.id !== id);
  }

  navigated() {
    this.items = this.items.filter((item) => item.carry).map((item) => ({ ...item, carry: false }));
  }
}

export const flash = new FlashStore();
