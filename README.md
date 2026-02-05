![Seeker Banner](https://raw.githubusercontent.com/user-attachments/assets/placeholder-banner.png)

# Seeker | The Personal AI-Tutor

## Table of Contents

- [Overview](#overview)
- [Technical Architecture](#technical-architecture)
    - [The Live Multimodal Loop](#the-live-multimodal-loop)
    - [Curriculum Architect Flow](#curriculum-architect-flow)
    - [Agentic Media Pipeline](#agentic-media-pipeline)
- [Gemini 3 Implementation](#gemini-3-implementation)
- [Directory Structure](#directory-structure)
  - [/src/components](#srccomponents)
  - [/src/pages](#srcpages)
  - [/src/lib](#srclib)
  - [/src/utils](#srcutils)
- [Running the Application](#running-the-application)

## Overview

Seeker is a hyper-personalized educational platform that replaces the static "one-size-fits-all" learning model with an adaptive, real-time AI tutor. By harnessing **Gemini 3 Pro** and the **Gemini Live API**, Seeker transforms standard PDF documents into interactive voice-based lectures, complete with a real-time virtual blackboard.

The application moves beyond simple text chat, offering a multimodal experience where the AI speaks, draws diagrams, builds structured curriculums, and generates multimedia study guides (comics, podcasts, and videos) tailored to the user's psychological learning profile.

## Technical Architecture

Seeker operates as a distributed system across two repositories to handle the intense computational requirements of generative media.

*   **Frontend (This Repo):** Handles the real-time "Live Classroom," audio streaming, and direct user interaction.
*   **Backend ([Seeker Server](https://github.com/greatsage-raphael/seeker_server)):** Handles long-running agentic workflows (Video Rendering, FFmpeg processing, Comic generation) that cannot run in a browser environment.

### Client-Server Interaction Flow

The Frontend manages the immediate learning experience. When a lesson concludes, it dispatches asynchronous triggers to the Backend. The Backend generates high-fidelity assets (using Veo and Gemini) and uploads them to Supabase. The Frontend listens for database changes via WebSockets to update the UI in real-time when the media is ready.

![Client-Server Interaction Flow](https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/diagram-export-2-5-2026-8_25_01-PM.png)

### The Live Multimodal Loop

The core of Seeker is the `LessonPage`. Unlike traditional chatbots, this establishes a persistent bi-directional WebSocket connection with the Gemini Live API.

1.  **Audio Input:** The browser captures microphone input (`16kHz PCM`), processes it via `AudioContext`, and streams chunks to the model.
2.  **VAD (Voice Activity Detection):** The model listens for user interruptions. If detected, the frontend immediately halts audio playback and clears the buffer (interruptibility).
3.  **Multimodal Output:** The model responds with Audio (played via the browser) and Text/JSON commands (rendered dynamically on the `<Blackboard />` component).

![The Live Multimodal Loop](https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/diagram-export-2-5-2026-8_30_46-PM.png)

### Curriculum Architect Flow
Users upload raw PDF documents (textbooks, papers) via the `CoursesPage`. The frontend converts these files to Base64 and sends them to **Gemini 3 Pro**. Using its high-reasoning capabilities, the model acts as an "Architect," restructuring the raw data into a gamified dependency tree (Courses → Modules → Lesson Plans).

### Agentic Media Pipeline
After a lesson concludes, the frontend triggers asynchronous generation requests. While the user reviews their notes, the system generates high-fidelity media:
*   **Comics:** Gemini 3 generates visual descriptions which are rendered into comic panels.
*   **Podcasts:** Two distinct AI personalities ("Alex" and "Sam") discuss the lesson topic.
*   **Cinematics:** Google Veo generates 8-second video loops stitched into an explainer video.

## Gemini 3 Implementation

Seeker utilizes the specific strengths of the Gemini 3 family to handle tasks previously impossible in the browser:

*   **Gemini 2.5 Flash (Native Audio):** Used for the "Live Classroom." We utilize the native audio modality (not Speech-to-Text -> LLM -> Text-to-Speech) to achieve <300ms latency, creating a natural conversational flow.
*   **Gemini 3 Pro (Reasoning):** Used in the "Curriculum Architect." The model analyzes complex academic PDFs and restructures them into pedagogical logic trees (prerequisites, learning objectives) rather than just summarizing them.
*   **Gemini 3 Image:** Used for "Visual Thinking." When a student asks for clarification, the model generates real-time diagrams and blackboard sketches to visually explain concepts.

## Directory Structure

### `/src/components`
Contains the core UI logic for the interactive elements.
*   `Blackboard.tsx`: The primary interface. Handles the WebSocket connection, renders the chalkboard text, and manages the overlay for AI-generated diagrams and quizzes.
*   `CertificateView.tsx`: A dynamically generated certificate component using `html-to-image` for gamification rewards.
*   `SlideCinema.tsx`: A custom video player component for reviewing AI-generated lectures.

### `/src/pages`
Route-level components that manage data fetching and page layout.
*   `LessonPage.tsx`: Manages the AudioContext and Gemini Live session lifecycle. Handles interruptions and tool-use callbacks.
*   `CoursesPage.tsx`: Handles file uploads (PDFs) and the "Curriculum Architect" prompting logic.
*   `ProfilePage.tsx`: Visualization of user progress, including GitHub-style heatmaps, XP tracking, and unlocked badges.
*   `NotesPage.tsx`: The post-lesson review hub. Displays the markdown notes, generated comic books, and podcasts.

### `/src/lib`
*   `supabase.ts`: Singleton instance of the Supabase client for database and storage interactions.
*   `gamification.ts`: Logic for awarding badges (e.g., "Night Scholar", "Deep Diver") based on user behavior and timestamps.

### `/src/utils`
*   `audio.ts`: Low-level audio processing utilities. Handles the conversion of Base64 strings to `Float32Array` buffers and downsampling for the Gemini API requirements (16kHz).

## Running the Application

This is a **Vite + React** project using **TypeScript**.

First, install the dependencies:

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file in the root directory. You will need keys for Clerk (Auth), Supabase (Database), and Google GenAI.

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIza...
```

# Development Server
- Run the development server to start the application:


```bash
npm run dev
```
