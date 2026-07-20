---
layout: post
title: “I’m in. Let’s Cause Some Responsible Chaos”
---


It rained in Miami this past weekend. Not the usual 20-minute afternoon tropical storm kind, but the all-day, not-going-anywhere kind. So, I did what anyone would do with a rainy weekend and time to kill. I went down the [OpenClaw](https://openclaw.ai/) rabbit hole. Here's what happened.

**OpenClaw Postmortem**

It took me a while to wrap my head around it, but once you realize [OpenClaw](https://openclaw.ai/) is essentially a gateway that connects to multiple APIs — with an obvious emphasis on AI/LLMs — you're off to the races.

**Installation**

My first attempt was on [Windows](https://www.microsoft.com/windows) 11 via [WSL2](https://learn.microsoft.com/en-us/windows/wsl/) (Windows Subsystem for Linux) — a lightweight way to run [Linux](https://kernel.org/) on [Windows](https://www.microsoft.com/windows) without a full VM or dual-boot. Easier to set up, but it keeps [OpenClaw](https://openclaw.ai/) sandboxed, with no access to native [Windows](https://www.microsoft.com/windows) apps or a local file system.

My second attempt was a native [Windows](https://www.microsoft.com/windows) 11 install, which unlocks full control: local apps, OS settings, file system, etc. More powerful, but also more painful — [Windows](https://www.microsoft.com/windows) doesn't come with most of the underlying tools Linux distros take for granted ([NodeJS](https://nodejs.org/), [NPM](https://www.npmjs.com/), [Git](https://git-scm.com/), [Python](https://www.python.org/), [C compiler](https://visualstudio.microsoft.com/), a [terminal](https://github.com/microsoft/terminal), etc.). [OpenClaw](https://openclaw.ai/) does a good job of installing dependencies during the onboarding process, but I decided to lay the groundwork first and avoid issues down the road.

I'd imagine this would be a lot simpler to set up on a machine running [MacOS](https://www.apple.com/os/macos/) — given its [NeXTSTEP](https://youtu.be/rf5o5liZxnA?si=7d6GPV_2nwX_6JXX)/[FreeBSD](https://www.freebsd.org/) origins — so the "[Mac mini](https://www.apple.com/mac-mini/) + [OpenClaw](https://openclaw.ai/)" hype is somewhat justifiable (not to mention the M4 processor, a capable Neural Engine, and a palatable price tag).

That said, [OpenClaw](https://openclaw.ai/)'s CLI setup is surprisingly polished — it walks you through gateway configuration, LLM model selection, add-ons, skills, etc. (e.g., [Nano Banana](https://gemini.google/overview/image-generation/) for images, [Brave API for web search](https://brave.com/search/api/), and so on).

**Move Fast and Crack Claws**

By the time I decided to play around with [OpenClaw](https://openclaw.ai/), a new version had already come out — "openclaw 2026.2.26" — significantly changing how API keys were handled, for instance. AI assistants such as Google's [Gemini](https://deepmind.google/models/gemini/) and Anthropic's [Claude](https://claude.com/product/overview) also struggle keeping up with [OpenClaw](https://openclaw.ai/)'s documentation. The fact that the tool has already gone through a series of rebrandings (think "the artist previously known as Clawdbot and Moltbot,") doesn't help either.

**APIs**

I started with my existing Google [Gemini](https://deepmind.google/models/gemini/) account (paid,) which quickly proved to be a mistake. The [Gemini API](https://aistudio.google.com/) throttled requests aggressively, putting me in "cooldowns" ranging from 5 minutes to more than an hour. Adding [Grok](https://grok.com/) (free tier) as a fallback didn't help much either. I eventually settled on a pre-paid [OpenRouter](https://openrouter.ai/) account — an interesting model that reminded me of old CDN arbitration — plus a pre-paid [DeepSeek](https://www.deepseek.com/) account. Side benefit: a solid crash course in API requests, embeddings, quotas and rate limiting.

Call me paranoid, but I also created two separate virtual credit card numbers for these two API keys, just in case my quotas didn't work and I ended up with thousands of dollars in debt.

**The WhatsApp Experiment**

I wanted full environment separation, so I dusted off an old [Google Pixel](https://store.google.com/category/phones) phone, grabbed a [Tello](https://tello.com/buy/custom_plans) eSIM ($5/month,) and connected [OpenClaw](https://openclaw.ai/) to [WhatsApp](https://www.whatsapp.com/) — all through the CLI, including nifty QR code generation right on the terminal. [OpenClaw](https://openclaw.ai/) itself was running on a fresh [Windows](https://www.microsoft.com/windows) 11 Pro install on an old [Microsoft Surface](https://www.microsoft.com/surface) laptop (great machines, by the way — Redmond's best synthesis of [Vaio](https://www.sony.com/en/SonyInfo/design/gallery/), [ThinkPad](https://www.ibm.com/history/thinkpad), and [MacBook](https://www.apple.com/macbook) DNA.)

One gotcha: finding [WhatsApp](https://www.whatsapp.com/) group IDs is non-trivial. They look like 120363023456789012@g.us, not phone numbers — and they're not surfaced anywhere obvious ("[openclaw gateway start --verbose](https://docs.openclaw.ai/cli/gateway)" can help catch those IDs).

**Claudio Claw, The Friendly Neighborhood Bot**

I created a bot — named him Claudio Claw, along with a friendly lobster profile pic — and set strict guardrails: only accept commands from me, no deleting OS files, no changing group settings, default to PT-BR, no over-the-top slang or clichés, stay cool unless "@" mentioned, cite sources, add value, no bullying, do no harm. All of this stored in a "soul.md" file which surprisingly enough could be modified by Claudio himself.

Then I invited him to a small [WhatsApp](https://www.whatsapp.com/) group of childhood friends from Brazil.

He immediately jumped the gun — introducing himself as "Claudio Claw, an [OpenClaw](https://openclaw.ai/) AI bot" — breaking one of his core rules (don't pretend to be human, but also don't disclose your tech stack.) Two members raised privacy and security concerns on the spot. One left the group immediately (but later returned once I assured him Claudio was gone.) A third accused me of wrecking the group — "*Fuck @PS. You've managed to destroy the group. Now let that sink in*".

Shortly after the chaos, I noticed a barrage of API errors on the [OpenClaw](https://openclaw.ai/) dashboard. Both [OpenRouter](https://openrouter.ai/) and [DeepSeek](https://www.deepseek.com/) had burned through their balances. No tokens, no API, no bot.

**Learnings**

**Get consent first.** I mentioned the idea in passing in the [WhatsApp](https://www.whatsapp.com/) group, but I should've been more explicit — and maybe even put it to a vote — before dropping an autonomous AI agent into an intimate, very personal group.

**APIs are not cheap.** Millions of tokens sounds like a lot until you actually use them. Set hard quotas and budget accordingly.

**Take Internet claims with a grain of salt.** People saying they're running entire businesses on [OpenClaw](https://openclaw.ai/) connected to [Salesforce](https://www.salesforce.com/), [Figma](https://www.figma.com/), [Runway](https://runwayml.com/), [Suno](https://suno.com/), [NotebookLM](https://notebooklm.google.com/), [Cursor](https://cursor.com/), [insert the latest trendy tool here] at little to no cost — and raking in millions — are probably exaggerating, to say the very least.

**Same goes for the dystopian stories.** [OpenClaw](https://openclaw.ai/) checking your [Strava](https://www.strava.com/) activities data, your bathroom smart scale weight gain trends, and quietly removing junk food from your [Instacart](https://www.instacart.com/) grocery cart? Probably not happening at all today — but honestly, we're likely not that far off.