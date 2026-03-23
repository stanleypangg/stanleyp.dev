---
title: "Axiom"
year: "2026"
order: 1
award: "1st Place · GenAI Genesis"
description: "AI game development IDE that converts natural language into fully playable 2D/3D games with generated sprites, music, and code. Won 1st place out of 1,200+ participants at Canada's largest AI hackathon."
stack: [Next.js, TypeScript, Claude API, MCP, Vercel AI SDK, Three.js, ElevenLabs]
links:
  devpost: "https://devpost.com/software/axiom-vrd28n"
---

<iframe width="100%" style="aspect-ratio:16/9;border:none;" src="https://www.youtube-nocookie.com/embed/3KOFEZUvV2s" allowfullscreen></iframe>

## What it does

Axiom is an in-browser game development IDE where you describe what you want and Claude builds it. Sprites, music, sound effects, and game logic are all generated from natural language — no coding required. You can build visual novels, chess, clicker games, and multiplayer servers, then deploy and share with one click.

## How it's built

Claude Sonnet orchestrates everything via the Vercel AI SDK, with access to 20+ custom MCP tools exposing asset generation services: ElevenLabs for audio, fal.ai and Meshy for images and 3D assets, and web search for real-time reference material. Phaser.js handles 2D game rendering, Three.js handles 3D, and PartyKit powers multiplayer networking. The core challenge was building a virtual sandbox the AI could operate freely — generating, running, and iterating on game files without leaving the browser.

## Built at

GenAI Genesis 2026, 24 hours, with Kenny Wu, Aadi Kulsh, and Aksshatt Bariar.
