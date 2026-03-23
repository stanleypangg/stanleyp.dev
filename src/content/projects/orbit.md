---
title: "Orbit"
year: "2025"
order: 3
award: "Best Future of our Planet Hack · Hack the Valley"
description: "Agentic LangGraph pipeline that generates editable 3D upcycling concepts with Three.js previews. Built with Redis checkpointing and SSE streaming for real-time progress. Won at Hack the Valley (500+ participants)."
stack: [Next.js, TypeScript, FastAPI, Python, LangGraph, Redis, Three.js]
links:
  github: "https://github.com/stanleypangg/Orbit"
  devpost: "https://devpost.com/software/orbit-ja26qm"
---

<iframe width="100%" style="aspect-ratio:16/9;border:none;" src="https://www.youtube-nocookie.com/embed/YheB8MwZDT8" allowfullscreen></iframe>

## What it does

Orbit turns waste materials into actionable upcycling concepts. You describe a material, and it generates three product concepts — each with a 3D preview, feasibility score, material breakdown, and DIY build guide. A Magic Pencil editor lets you refine any concept with natural language before exporting.

## How it's built

The backend is an 11-phase LangGraph agent workflow with interrupt/resume support, backed by Redis checkpointing so no state is lost across pauses. Parallel image generation feeds into Trellis for 2D-to-3D conversion, and SSE streams progress to the frontend in real time (<100ms latency). Gemini 2.5 Flash handles concept generation with enforced JSON schema output for reliability across all agent phases.

## Built at

Hack the Valley X, 24 hours, with Isaac Nguyen, Sarah Kim, and Steric Tsui.
