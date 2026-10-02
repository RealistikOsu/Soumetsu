import { m } from '$lib/paraglide/messages';

// Bit i of a user's play_style is the i-th entry, in the order Hanayo stored them.
export const playStyleNames = () => [
  m.common_playstyle_mouse(),
  m.common_playstyle_tablet(),
  m.common_playstyle_keyboard(),
  m.common_playstyle_touchscreen(),
  m.common_playstyle_spoon(),
  m.common_playstyle_leap_motion(),
  m.common_playstyle_oculus_rift(),
  m.common_playstyle_dick(),
  m.common_playstyle_eggplant()
];
