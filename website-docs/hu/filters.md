---
reference_version: 493bad23883ad29e971d9ef51a8d6173
title: "Tabletfilter-lista"
old_id: 10
description: "Melyik OpenTabletDriver filtereket használhatod relaxon, és milyen beállításokkal."
icon: pen-nib
colour: purple
---

# RealistikOsu tabletfilter-lista

Ez az oldal az OpenTabletDriverrel érkező filterek listáját tartalmazza, aszerint csoportosítva, hogy szabad-e őket használni a szerverünk **relax** módjaiban. 

> [!CAUTION]
> **A tabletdriverek bármilyen „funkciójának” kihasználása (pl. tiltott anti-chatter beállítások) szigorúan tilos, és 3. strike-ot von maga után a büntetési rendszerünkben.**

- Külső forrásból származó filtereket csak akkor használhatsz, ha a RealistikOsu staff személyesen átnézte őket. Ezt egy support ticketben kérheted.
- Fenntartjuk a jogot, hogy ezeket a szabályokat belátásunk szerint alkalmazzuk és módosítsuk.

----------------------------------------------------

<!-- tone: red -->
## 1. Tiltott
Magáért beszél: ha ezeket a filtereket bármilyen formában használod, azonnali restrictet kapsz.

* **Chatter Generator**  
* **sin(cursor)**  
* **SpringInterpolator**  
* **MeL** 
* **Windows Ink**  
* **Saturn** (Position Interpolation & Velocity Interpolation)  
* **Stroke Snapping**  
* **BezierInterpolator**

----------------------------------------------------

<!-- tone: yellow -->
## 2. Megengedett, kivételekkel
Bizonyos feltételek mellett használhatod őket. Ha nem felelsz meg ezeknek a feltételeknek, a played/liveplayed automatikusan érvénytelen.

* **Temporal Resampler**  
  * A Prediction Ratio 0 feletti értéke tilos  
  * A Frame Time Shift 0 feletti értéke tilos  
  * A Reverse EMA 0.6 alatti értéke tilos  
  * Tilos a Reverse EMA-t bármely más filter EMA beállításaival együtt használni  
* **Reconstructor**  
  * Az EMA Weight 0.6 alatti értéke tilos  
  * Tilos a Reconstructort bármely más filter EMA beállításaival együtt használni  
* **jaaakb's ScuffedInter/Extrapolator**  
  * Az Interpolation 1 alatti értéke tilos  
* **Devocub Antichatter**  
  * A Prediction bármilyen használata tilos  
* **Saturn (Non-Interpolated)**  
  * A Reverse EMA 0.6 alatti értéke tilos  
  * Tilos a Reverse EMA-t bármely más filter EMA beállításaival együtt használni  
  * A Stock EMA weight 1 alatti értéke tilos

<!-- tone: yellow -->
### 2.1 Csak saját felelősségre
Még további tesztelésre és staff megbeszélésre várnak, ezek kiszámíthatatlanabbak, mint a többi kategória.

* **MouseUtils**  
* **ScriptRunner**

----------------------------------------------------

<!-- tone: green -->
## 3. 100%-ban legális
Ezekkel nyugodtan játszhatsz, de sok kombinációt még nem teszteltünk.

<!-- columns -->
* **Kuuube's CHATTER EXTERMINATOR**
* **AbstractQbit's Radial Follow Smoothing**
* **Wireless Kit Addon**  
* **Touch Gestures Installer**  
* **Tablet Debounce**  
* **Scroll Bindings**  
* **nzbasic's Hand Speed Viewer**  
* **Monitor Toggle**  
* **MabletMapping**  
* **LED Sandbox**  
* **Hover Distance Limiter**  
* **Flip Axes**
* **BetterCalibrator**  
* **OpenKneeboard OTD-IPC**  
* **Precision Control**  
* **PSSA**  
* **Relative Mode Area**  
* **Tablet Calibration**
* **Tilt Calibration**  
* **HawkuFilters**
* **Tablet Area Randomizer**  
* **TouchEmu**  
* **Circular Area**
* **SlimyScylla**  
* **Cycle Keybind**  
* **DragThreshold**  
* **Additional Keys**  
* **DualActionBinds**  
* **Enhanced Output modes**  
* **Erase button**  
* **UX remote**  
* **VMultiMode**
