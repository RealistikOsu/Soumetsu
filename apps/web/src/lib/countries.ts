import { intlLocale } from '$lib/i18n';
import { m } from '$lib/paraglide/messages';

const codes =
  'ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws xk ye yt za zm zw'.split(
    ' '
  );

// The browser's own names for these two end in "SAR China", which players don't pick their country for.
const plainNames: Record<string, Record<string, string>> = {
  HK: { en: 'Hong Kong', ru: 'Гонконг', pl: 'Hongkong', hu: 'Hongkong' },
  MO: { en: 'Macau', ru: 'Макао', pl: 'Makau', hu: 'Makaó' }
};

const nameOf = (names: Intl.DisplayNames, code: string, locale: string) =>
  plainNames[code]?.[locale] ?? plainNames[code]?.en ?? names.of(code) ?? code;

const names = new Intl.DisplayNames([intlLocale()], { type: 'region' });

export const countries = [
  { code: 'XX', name: m.common_country_unknown() },
  ...codes
    .map((code) => ({
      code: code.toUpperCase(),
      name: nameOf(names, code.toUpperCase(), intlLocale())
    }))
    .sort((a, b) => a.name.localeCompare(b.name, intlLocale()))
];

// Old accounts can have '' or '0' as their country, which Intl rejects with a RangeError.
export const isCountry = (code: string) => /^[a-z]{2}$/i.test(code) && code.toUpperCase() !== 'XX';

export function countryName(code: string, locale = intlLocale()) {
  if (!isCountry(code)) return m.common_country_unknown();
  return nameOf(new Intl.DisplayNames([locale], { type: 'region' }), code.toUpperCase(), locale);
}
