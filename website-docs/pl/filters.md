---
reference_version: 493bad23883ad29e971d9ef51a8d6173
title: "Lista filtrów do tabletu"
old_id: 10
description: "Których filtrów OpenTabletDriver możesz używać na relaxie i z jakimi ustawieniami."
icon: pen-nib
colour: purple
---

# Lista filtrów do tabletu na RealistikOsu

Ten dokument zawiera listę filtrów dostępnych dla OpenTabletDriver, podzieloną według tego, czy wolno ich używać w trybach **relax** na naszym serwerze. 

> [!CAUTION]
> **Wykorzystywanie jakichkolwiek „funkcji” sterowników tabletu (np. zakazanych ustawień anti-chatter) jest surowo zabronione i skutkuje 3. przewinieniem w naszym systemie kar.**

- Filtry od zewnętrznych autorów są niedozwolone, dopóki staff RealistikOsu osobiście ich nie sprawdzi. Możesz o to poprosić w tickecie na supporcie.
- Zastrzegamy sobie prawo do stosowania i zmieniania tych zasad według własnego uznania.

----------------------------------------------------

<!-- tone: red -->
## 1. Zakazane
Chyba nie trzeba tłumaczyć; jakiekolwiek użycie tych filtrów to podstawa do natychmiastowej restrykcji.

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
## 2. Dozwolone z wyjątkami
Można ich używać w określonych granicach. Jeśli nie spełnisz tych konkretnych wymagań, twój wynik/liveplay zostanie automatycznie unieważniony.

* **Temporal Resampler**  
  * Każda wartość Prediction Ratio powyżej 0 jest zakazana  
  * Każda wartość Frame Time Shift powyżej 0 jest zakazana  
  * Każda wartość Reverse EMA poniżej 0.6 jest zakazana  
  * Używanie Reverse EMA razem z ustawieniami EMA jakiegokolwiek innego filtra jest zakazane  
* **Reconstructor**  
  * Każda wartość EMA Weight poniżej 0.6 jest zakazana  
  * Używanie filtra Reconstructor razem z ustawieniami EMA jakiegokolwiek innego filtra jest zakazane  
* **jaaakb's ScuffedInter/Extrapolator**  
  * Każda wartość Interpolation poniżej 1 jest zakazana  
* **Devocub Antichatter**  
  * Jakiekolwiek użycie Prediction jest zakazane  
* **Saturn (Non-Interpolated)**  
  * Każda wartość Reverse EMA poniżej 0.6 jest zakazana  
  * Używanie Reverse EMA razem z ustawieniami EMA jakiegokolwiek innego filtra jest zakazane  
  * Każda wartość Stock EMA weight poniżej 1 jest zakazana

<!-- tone: yellow -->
### 2.1 Na własne ryzyko
Wymagają dalszych testów i dyskusji w staffie; są mniej pewne niż pozostałe kategorie.

* **MouseUtils**  
* **ScriptRunner**

----------------------------------------------------

<!-- tone: green -->
## 3. W 100% legalne
Uznane za w porządku do grania, ale wiele kombinacji nie zostało jeszcze przetestowanych.

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