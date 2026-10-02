---
reference_version: 493bad23883ad29e971d9ef51a8d6173
title: "Список фильтров для планшета"
old_id: 10
description: "Какие фильтры OpenTabletDriver можно использовать в relax и с какими настройками."
icon: pen-nib
colour: purple
---

# Список фильтров для планшета на RealistikOsu

Здесь собраны фильтры для OpenTabletDriver, разбитые на категории по тому, можно ли их использовать в **relax**-режимах нашего сервера. 

> [!CAUTION]
> **Абьюз любых «фич» драйверов планшета (например, запрещённых настроек anti-chatter) строго запрещён и карается 3-м страйком в нашей системе наказаний.**

- Сторонние фильтры запрещены, пока их лично не проверит стафф RealistikOsu. Запросить проверку можно через тикет в поддержку.
- Мы оставляем за собой право применять и менять эти правила так, как сочтём нужным.

----------------------------------------------------

<!-- tone: red -->
## 1. Запрещены
Тут всё понятно: любое использование этих фильтров — повод для мгновенного рестрикта.

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
## 2. Разрешены с оговорками
Можно использовать в определённых рамках. Если эти требования не соблюдены, твой скор/лайвплей автоматически признаётся недействительным.

* **Temporal Resampler**  
  * Любое значение Prediction Ratio выше 0 запрещено  
  * Любое значение Frame Time Shift выше 0 запрещено  
  * Любое значение Reverse EMA ниже 0.6 запрещено  
  * Запрещено использовать Reverse EMA вместе с настройками EMA любого другого фильтра  
* **Reconstructor**  
  * Любое значение EMA Weight ниже 0.6 запрещено  
  * Запрещено использовать Reconstructor вместе с настройками EMA любого другого фильтра  
* **jaaakb's ScuffedInter/Extrapolator**  
  * Любое значение Interpolation ниже 1 запрещено  
* **Devocub Antichatter**  
  * Любое использование Prediction запрещено  
* **Saturn (Non-Interpolated)**  
  * Любое значение Reverse EMA ниже 0.6 запрещено  
  * Запрещено использовать Reverse EMA вместе с настройками EMA любого другого фильтра  
  * Любое значение Stock EMA weight ниже 1 запрещено

<!-- tone: yellow -->
### 2.1 На свой страх и риск
Их ещё будут тестировать и обсуждать в стаффе; с ними всё менее стабильно, чем с другими категориями.

* **MouseUtils**  
* **ScriptRunner**

----------------------------------------------------

<!-- tone: green -->
## 3. 100% легальны
Проверены и подходят для игры, но многие комбинации ещё не тестировались.

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