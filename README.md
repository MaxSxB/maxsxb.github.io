# Urban Assault · Metropolis Dawn

Interactive campaign maps and mission briefings for Urban Assault and its Metropolis Dawn expansion.

- Three campaigns: Resistance, Ghorkovs and Taerkastens.
- 73 mission briefings with current terrain images, HD units and buildings.
- Original English game text and briefing icons.
- Campaign selection, mission hover effects, audio and rotating 3D presentations.
- Mission debriefing layout with battle history playback (sample battle results).

Open [the menu](index.html). Use the arrow keys and Enter to navigate, or select a territory with the mouse. Escape returns to the previous menu.

The mission launch screen ends the presentation; the game itself does not run in this website. From there, [the debriefing](debrief.html) shows the after-action report layout with sample results.

This directory contains the static website and its assets. It runs locally or on GitHub Pages without a build step. Production tools and working files are maintained separately in `work/main_menu`.

Briefing vehicles are static copies of the game's installed HD models (`assets/briefings/models/native-*.js`, indexed by `assets/briefings/native-models.js`), written by `work/main_menu/export-native-models.py`. The local preview server `serve-native-briefings.py` reads the installed models directly instead.
