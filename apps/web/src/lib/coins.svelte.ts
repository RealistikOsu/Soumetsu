import { casinoBalance } from '$lib/api/casino';

class Coins {
  #balance = $state<number | null>(null);

  get balance() {
    return this.#balance;
  }

  set(n: number) {
    this.#balance = n;
  }

  clear() {
    this.#balance = null;
  }

  async refresh() {
    this.#balance = (await casinoBalance()).balance;
  }
}

export const coins = new Coins();
