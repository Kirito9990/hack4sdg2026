# CareCall — Andy Wang contribution evidence

Verified 2026-10-27 against the public default branch `codex/CareCall`, head `2bb36320e909438895915ce07c0ed35a12bedd2b`.

- GitHub: [Kirito9990](https://github.com/Kirito9990)
- Team repository: [liangxuntan/hack4sdg2026](https://github.com/liangxuntan/hack4sdg2026)
- [Author-filtered history](https://github.com/liangxuntan/hack4sdg2026/commits/codex/CareCall/?author=Kirito9990)
- 67 commits reachable in the default-branch history returned by GitHub; 24 attributed to Kirito9990 (including 3 merge commits), plus 2 separately authored commits with Kirito9990 co-author trailers. Counts are evidence of attribution, not a measure of individual effort. Other branches are not covered by this inventory.

## Selected implementation evidence

| Contribution | Evidence |
| --- | --- |
| Extended translation across request text, summaries and chat for English, Cantonese and Mandarin | [090744a](https://github.com/liangxuntan/hack4sdg2026/commit/090744a6e0c8fce8eac1919ab73513c9265aa2bb) |
| Improved request clarification to ask for missing actionable details | [a5dc965](https://github.com/liangxuntan/hack4sdg2026/commit/a5dc9657ff39e67c5f906dd335e522072f2c6d1f) |
| Refined follow-up and structured request classification | [387da8c](https://github.com/liangxuntan/hack4sdg2026/commit/387da8cc4a258ebff061f040f82faa5271c0b627) |
| Integrated speech, clarification and triage through an OpenRouter model | [7f74f1f](https://github.com/liangxuntan/hack4sdg2026/commit/7f74f1f8d22b20eea14c0e59a671e6caba7cbdce) |
| Implemented explicit consent for request AI processing, versioned choices, optional recording retention and regression tests | [69947cd](https://github.com/liangxuntan/hack4sdg2026/commit/69947cd7614cf3080c2f207ec7e0ab07bf0f0829) |

## CV draft

**CareCall — AI Application Developer (Team Project), Hack4SDG 2026**

- Extended a community-assistance prototype with LLM-powered request clarification and structured classification, integrating speech transcription through OpenRouter.
- Implemented multilingual translation of requests, summaries and chat across English, Cantonese and Mandarin, retaining original text alongside translations.
- Added explicit consent controls for request AI processing, versioned consent records and optional audio retention, with automated regression tests.

These bullets describe prototype implementation, not production impact or measured accuracy. The team built on an existing resident/volunteer application. Do not claim sole authorship, production deployment, clinical safety or unmeasured usage/performance. AI-assistant co-author credits remain part of the original history. Tests were inspected as code evidence; they were not rerun during this documentation task.

## Full attributed history

| Date (UTC) | Attribution | Commit |
| --- | --- | --- |
| 2026-10-15 | Author | [2bb3632 — Make the photo and speak controls a compact row that still opens the picker and the microphone.](https://github.com/liangxuntan/hack4sdg2026/commit/2bb36320e909438895915ce07c0ed35a12bedd2b) |
| 2026-10-15 | Author | [309665c — Record that the translation, chat page, and map fixes were published.](https://github.com/liangxuntan/hack4sdg2026/commit/309665c5a78167a10c568c369bb61dda86294ccc) |
| 2026-10-15 | Author | [bdad3aa — Keep translations faithful across languages and make the follow-up chat and request map usable.](https://github.com/liangxuntan/hack4sdg2026/commit/bdad3aa6794f3bb578d2c2f0bdf9a04dc5eb3a94) |
| 2026-10-15 | Author | [090744a — Translate request text, summaries, and chat between English, Cantonese, and Mandarin.](https://github.com/liangxuntan/hack4sdg2026/commit/090744a6e0c8fce8eac1919ab73513c9265aa2bb) |
| 2026-10-15 | Author | [801fafe — Show the other person's chat in the reader's language so an English volunteer can be read in Cantonese.](https://github.com/liangxuntan/hack4sdg2026/commit/801fafee8360cb9fa5597c6e9fd65dca3fd9ee87) |
| 2026-10-14 | Author | [69947cd — Ask before sending a request to the model, and store a recording only when the resident keeps it for the volunteer.](https://github.com/liangxuntan/hack4sdg2026/commit/69947cd7614cf3080c2f207ec7e0ab07bf0f0829) |
| 2026-10-14 | Author | [b050eee — Reset follow-up when the original request is edited.](https://github.com/liangxuntan/hack4sdg2026/commit/b050eee5f82008b484460fa95cb40c45ef126fb3) |
| 2026-10-14 | Author | [d093321 — Fix the Render build by loading the emergency check without a TypeScript import extension.](https://github.com/liangxuntan/hack4sdg2026/commit/d093321c7fd4872321f108a91676f8c363a05ecb) |
| 2026-10-14 | Author | [b1caf91 — Keep a live demo moving when a reply is off-topic, an emergency is unassessed, or signup is waiting on location.](https://github.com/liangxuntan/hack4sdg2026/commit/b1caf91966b8fb1f66cd1afc418a6e4ffb69d902) |
| 2026-10-14 | Author | [a5dc965 — Keep asking about the task until a neighbour could act on it.](https://github.com/liangxuntan/hack4sdg2026/commit/a5dc9657ff39e67c5f906dd335e522072f2c6d1f) |
| 2026-10-14 | Author | [d201888 — Give follow-up answers their own page and show category and priority after sending.](https://github.com/liangxuntan/hack4sdg2026/commit/d20188829e732f0508db67816136cc18a527f446) |
| 2026-10-14 | Author | [19c71ee — Make phone tabs and the location button easier to see.](https://github.com/liangxuntan/hack4sdg2026/commit/19c71ee92a40862aa8199b4a03f7808c34f5e155) |
| 2026-10-14 | Author | [3d8872c — Use the CareCall mark in the header and keep phone login on one screen.](https://github.com/liangxuntan/hack4sdg2026/commit/3d8872c2c31464650460983adabad0cc87704e96) |
| 2026-10-14 | Author | [271f0e4 — Give the active chat more room and place cancel and report on one row.](https://github.com/liangxuntan/hack4sdg2026/commit/271f0e490e6428183b73e9aadff57896c58771d9) |
| 2026-10-14 | Author | [d7e8d2a — Simplify completed history, drop ratings, and move friend requests into Community.](https://github.com/liangxuntan/hack4sdg2026/commit/d7e8d2a4fbcd139885cc8ecd722c60f14e44a744) |
| 2026-10-13 | Author | [7f74f1f — Replace Deepgram with one OpenRouter model for speech, follow-ups, and triage.](https://github.com/liangxuntan/hack4sdg2026/commit/7f74f1f8d22b20eea14c0e59a671e6caba7cbdce) |
| 2026-10-12 | Author | [56c4274 — Show volunteers a popup when a new request appears nearby.](https://github.com/liangxuntan/hack4sdg2026/commit/56c42749e76126f033d5aafbf64ea1a80af23792) |
| 2026-10-12 | Author | [387da8c — Keep follow-up questions to missing details, classify requests with Qwen Flash, and let volunteers preview partner rewards.](https://github.com/liangxuntan/hack4sdg2026/commit/387da8cc4a258ebff061f040f82faa5271c0b627) |
| 2026-10-12 | Author | [af77aaa — Let residents and volunteers finish help with clearer follow-ups, ratings, and a community chat.](https://github.com/liangxuntan/hack4sdg2026/commit/af77aaade463f91311c67ee513d18973c9393c34) |
| 2026-10-02 | Author | [fe48152 — Fix production TypeScript build](https://github.com/liangxuntan/hack4sdg2026/commit/fe4815265449a8e9eaad9c10666bfbf49e1f859e) |
| 2026-10-02 | Author | [3945427 — Add HEIC and HEIF photo attachment support](https://github.com/liangxuntan/hack4sdg2026/commit/3945427c21926f995363384eb649a9e7edd744a3) |
| 2026-09-27 | Author (merge) | [1162ac5 — Merge pull request #5 from liangxuntan/cursor/pending-map-fullscreen-6be9](https://github.com/liangxuntan/hack4sdg2026/commit/1162ac59b4c23879094be8ab442b5b1aa9c68d44) |
| 2026-09-27 | Co-author trailer | [2489ed1 — Fix fullscreen map not filling until manual recenter](https://github.com/liangxuntan/hack4sdg2026/commit/2489ed19b15348836c0deffc766d809b7b8e7395) |
| 2026-09-27 | Author (merge) | [6fca96f — Merge pull request #3 from liangxuntan/cursor/Carecall](https://github.com/liangxuntan/hack4sdg2026/commit/6fca96f7b8ee09d5159149f554d28e2f9b111a39) |
| 2026-09-27 | Author (merge) | [7df5632 — Merge pull request #1 from liangxuntan/cursor/pending-map-fullscreen-6be9](https://github.com/liangxuntan/hack4sdg2026/commit/7df5632f27ee082aa81ef195973f0d20249d404f) |
| 2026-09-27 | Co-author trailer | [455c91e — Enlarge map and add fullscreen view for pending requests](https://github.com/liangxuntan/hack4sdg2026/commit/455c91e61e9348868d1f337cd3b7ac334f032309) |
