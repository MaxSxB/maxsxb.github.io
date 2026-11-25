# Urban Assault · Metropolis Dawn

Interactive campaign maps and mission briefings for Urban Assault and its Metropolis Dawn expansion.

- Three campaigns: Resistance, Ghorkovs and Taerkastens.
- 73 mission briefings with current terrain images, HD units and buildings.
- Original English game text and briefing icons.
- Campaign selection, mission hover effects, audio and rotating 3D presentations.
- Mission debriefings in the game's layout, replaying a fictional battle on each mission's real data.

Open [the menu](index.html). Use the arrow keys and Enter to navigate, or select a territory with the mouse. Escape returns to the previous menu.

The mission launch screen ends the presentation; the game itself does not run in this website. From there, the Debriefing button opens that mission's debriefing as the game shows it: each mission's owner map, factions, host stations, squads, key sectors, beam gates and tech upgrades are real; the battle replayed over them is fictional (`assets/debriefings`, written by `work/main_menu/build-debriefings.py`).

This directory contains the static website and its assets. It runs locally or on GitHub Pages without a build step. Production tools and working files are maintained separately in `work/main_menu`.

Briefing vehicles are static copies of the game's installed HD models (`assets/briefings/models/native-*.js`, indexed by `assets/briefings/native-models.js`), written by `work/main_menu/export-native-models.py`. The local preview server `serve-native-briefings.py` reads the installed models directly instead.
