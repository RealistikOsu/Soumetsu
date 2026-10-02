---
title: "Tablet Filter Masterlist"
old_id: 10
description: "Which OpenTabletDriver filters you can use in relax, and with what settings."
icon: pen-nib
colour: purple
---

# RealistikOsu Tablet Filter Masterlist

This document contains a list of filters that come with OpenTabletDriver, sectioned by legality of use in our server’s **relax** gamemodes. 

> [!CAUTION]
> **Exploiting any tablet driver "features" (e.g., forbidden anti-chatter settings) is strictly prohibited and will result in a 3rd strike in our Punishment System.**

- Filters sourced from third parties will not be allowed unless personally vetted by RealistikOsu staff, which you may request through a support ticket.
- We reserve the right to apply and alter these rules as we see fit.

----------------------------------------------------

<!-- tone: red -->
## 1. Banned
Self-explanatory; use of these filters in any regard will be grounds for an instant restriction.

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
## 2. Allowed with Exceptions
Can be used within certain parameters. Failure to meet these specific requirements will result in your play/liveplay being automatically invalidated.

* **Temporal Resampler**  
  * Any value of Prediction Ratio above 0 is banned  
  * Any value of Frame Time Shift above 0 is banned  
  * Any value of Reverse EMA below 0.6 is banned  
  * Use of Reverse EMA in conjunction with any other filter’s EMA settings is banned  
* **Reconstructor**  
  * Any value of EMA Weight below 0.6 is banned  
  * Use of Reconstructor in conjunction with any other filter’s EMA settings is banned  
* **jaaakb's ScuffedInter/Extrapolator**  
  * Any value of Interpolation below 1 is banned  
* **Devocub Antichatter**  
  * Any use of Prediction is banned  
* **Saturn (Non-Interpolated)**  
  * Any value of Reverse EMA below 0.6 is banned  
  * Use of Reverse EMA in conjunction with any other filter’s EMA settings is banned  
  * Any value of Stock EMA weight below 1 is banned

<!-- tone: yellow -->
### 2.1 Use at Own Risk
Subject to further testing and staff discussion; these are more volatile than other categories.

* **MouseUtils**  
* **ScriptRunner**

----------------------------------------------------

<!-- tone: green -->
## 3. 100% Legal
Found to be fine for play, however many combinations have yet to be tested.

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