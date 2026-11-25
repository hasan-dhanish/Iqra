# Learning Dashboard — Project Handoff & Client Pivot Memory

> [!IMPORTANT]
> **INSTRUCTION FOR THE NEXT AI AGENT:**
> When the user imports/shares this file at the start of a new session, **DO NOT start editing code right away.**
> First, confirm you understand the existing codebase and the client Learning Dashboard goal, and **ask the user the structured questions in Section 5** to clarify exactly what to add, keep, remove, and customize before writing any code.

---

## 1. Origin & What This Codebase Currently Is

This folder (`c:\Users\Hasan\Desktop\H&F\Learning-Dashboard`) was cloned from **LDOI Studio Workbench** (`c:\Users\Hasan\Desktop\H&F\Maintenance`, commit `2d1fc79`, with `.git`, `dist`, and `node_modules` intentionally excluded so this client project starts clean).

> **First-time setup in this folder:** Run `npm install` before `npm run dev` / `npm run build` / `npm run lint`.

### Current Tech Stack
- **Frontend:** React 19 + TypeScript + Vite (`tsc -b && vite build`)
- **Styling:** Tailwind CSS v4 + custom theme tokens & `.dark-theme` overrides in `src/index.css`
- **Icons:** Lucide React (`lucide-react`)
- **Linter:** `oxlint` (`npm run lint`)
- **Backend / Realtime:** Supabase (`src/lib/supabase.ts`, `supabase/schema.sql`) with `BroadcastChannel` + `localStorage` fallback/hybrid persistence.

### Existing Modules & Key Files
- **`src/App.tsx`** — Main app shell, Light/Dark theme state (`darkMode`, `toggleDarkMode`), tab navigation.
- **`src/context/LdoiContext.tsx`** — Central state provider (currently hardcoded for 4 LDOI founders; handles projects, notes, documents, journal entries, quotations, deadlines, presence, live cursors, live typing).
- **`src/index.css`** — Global design tokens, `.paper-card` glassmorphism, `.dark-theme` overrides, `.book-shelf-ledge`, `.notebook-*` spread styles, `.floating-sheet`, `.ldoi-check-row` inline checkboxes, `.clear-all-bin-btn`, print stylesheet.
- **`src/lib/pinboard.ts`** — Data types & `localStorage` persistence for the infinite canvas (`BoardPositions`, `BoardConnector`, `BoardZone`, `BoardStroke`, `PinPageData`), plus `convertJournalHtmlToPinPage` and journal text/snippet helpers.
- **Reusable Core Views (KEEP & ADAPT):**
  - `src/components/DashboardView.tsx` + `src/components/SevenSegmentClock.tsx` — Desk overview with custom SVG 7-segment digital clock, greeting, active folders, deadlines, and recent notebook entries.
  - `src/components/JournalView.tsx` — Apple Books-style 3D bookshelf + open physical notebook spread with rich-text editor, **inline interactive checkboxes** (`Enter` continues checklist, empty `Enter` exits), custom color wheels, live typing sync, and explicit book deletion.
  - `src/components/ProjectsView.tsx` & `src/components/FolderCard.tsx` — Glassmorphic physical folder-silhouette cards (great for **Subjects / Courses / Study Modules**).
  - `src/components/ProjectDetailView.tsx` & `src/components/ProjectPinboard.tsx` — Infinite pan/zoom visual matrix with rich-text + checklist pages, **Import from Notebooks** modal (import specific pages or whole notebooks onto the canvas), resizable Discussion Zones, round-cornered orthogonal 90° connectors with single-capsule segment length sliders, freehand pen, pinned images/files, Elements jump menu, Fit All, full Undo/Redo, and Clear All.
  - `src/components/DeadlinesView.tsx` — Timeline/urgency tracker (great for **Exams, Assignments & Study Milestones**).
- **LDOI Studio-Specific Views (LIKELY REMOVE OR REPLACE):**
  - `src/components/QuotationsView.tsx` & `src/components/QuotationBuilderModal.tsx` (INR quotations/proposals)
  - `src/components/EnquiriesView.tsx` (client sales enquiries)
  - Hardcoded LDOI team auth in `src/components/AuthScreen.tsx` and `src/constants.ts` (`Hasan`, `Aathavan`, `Allen`, `Harsath`).

---

## 2. Client Vision: Learning & Study Dashboard

The user is repurposing this workspace for a **client who wants a Learning Dashboard** to study with:
1. **Keep the Notebook (`JournalView.tsx`):**
   - Subject-based notebooks on the 3D bookshelf, rich-text study notes, inline checkboxes for study tasks/topics, and color customization.
2. **Keep the Infinite Matrix (`ProjectPinboard.tsx`):**
   - Used by learners for **drawing flowcharts, mind maps, concept connections, planning syllabi**, grouping topics in Discussion Zones, freehand sketching, and importing specific notebook pages onto the board.
3. **NEW Core Feature — In-App Excel / Spreadsheet Support:**
   - Users must be able to **work on Excel files directly inside the website** (open/upload `.xlsx`/`.xls`/`.csv`, edit cells/formulas/sheets, create new sheets, save changes, and export/download back to `.xlsx` or `.csv`).
   - Example study uses: syllabus trackers, grade/GPA calculators, spaced-repetition logs, practice problem datasets, study timetables.
4. **Repurpose Projects & Deadlines for Studying:**
   - "Projects" → **Courses / Subjects / Study Tracks** (with folder cards).
   - "Deadlines" → **Exam Dates, Assignment Due Dates, Study Milestones**.
   - Remove business-only clutter (Quotations, Enquiries, INR currency/budgets) unless the user asks to keep anything.

---

## 3. Architectural Thoughts & Recommendations (For Discussion)

1. **In-App Excel Editor Options:**
   - **Option A (Full Excel-like experience):** Use **`@fortune-sheet/react`** (or **Univer**) paired with **`xlsx` (SheetJS)** for `.xlsx`/`.xls`/`.csv` import & export — gives real spreadsheet tabs, formulas (`SUM`, `AVERAGE`, etc.), cell formatting, column resizing, and copy/paste.
   - **Option B (Lightweight custom grid):** Use **`xlsx` (SheetJS)** + a lightweight React data grid for fast loading and minimal bundle size, if only basic table editing & simple formulas are needed.
   - **Where it lives:** Either a dedicated **"Spreadsheets / Excel"** sidebar tab + the ability to **pin/open Excel sheets directly from a Course/Subject Infinite Matrix** (clicking a pinned `.xlsx` card opens the in-app editor instead of just downloading!).
2. **Auth & Multi-User vs Personal:**
   - Currently `AuthScreen.tsx` & `LdoiContext.tsx` expect the 4 LDOI founders. For a client learning dashboard, decide between:
     - Simple **Email/Password or Google Auth** via Supabase (any student can sign up), OR
     - **Single-user / Local-first profile** (no login wall, or simple name/profile switcher), OR
     - **Teacher + Student / Study Group** collaboration.
3. **Study-Specific Enhancements Worth Offering:**
   - **Pomodoro / Study Focus Timer** integrated next to the 7-segment clock on the Dashboard.
   - **Syllabus Progress Bar** on each Subject FolderCard (auto-computed from completed checklist items / workflow steps).
   - **Flashcards / Quick Review** mode from notebook pages or pinned cards.
   - **PDF / Lecture Slide Viewer** when clicking pinned PDFs on the Infinite Matrix.

---

## 4. Technical Rules & Gotchas Preserved from Original Project

1. **Shell (Windows PowerShell 5.1):** Use `; if ($?) { ... }` instead of `&&`, and `Select-String` instead of `rg`.
2. **Dark Mode CSS Specificity (`src/index.css`):**
   - `.dark-theme input`, `.dark-theme .bg-white`, and `.dark-theme .text-[#18181B]` use `!important`.
   - Always handle dark-mode exceptions with higher-specificity CSS rules in `src/index.css` rather than inline `style={{ backgroundColor: 'transparent' }}`.
   - Keep physical paper (`.notebook-spread`, `.floating-sheet`) and `.book-shelf-ledge` warm light-colored in night mode, and keep custom color wheels everywhere color pickers exist.
3. **Dynamic SVG Arrowhead Markers (`ProjectPinboard.tsx`):**
   - Orthogonal connectors support arbitrary hex colors via the Color Wheel; `<defs>` dynamically generates `<marker id="arrow-${key}">` for all used colors.
4. **Connector UX Rule:**
   - Keep round-cornered 90° orthogonal connectors with the single-capsule perpendicular length slider (`segOffsets`) — never re-introduce bend circles or `+` waypoint clutter.
5. **Verification:** Always run `npm run build; if ($?) { npm run lint }` after edits.

---

## 5. Questions the Next Agent MUST Ask the User First

When the user imports this file, ask them these questions (grouped cleanly so they can answer quickly):

1. **Branding & Users:**
   - What should the app be named (e.g., *StudyDesk*, *LDOI Learn*, or the client's brand name)?
   - Who is using it — a **single student**, **multiple independent students** (each with their own login), or a **collaborative study group / tutor + students**?
2. **Excel / Spreadsheet Workflow:**
   - Do they need **full Excel features** (formulas like `=SUM()`, multiple sheet tabs, cell styling, freeze panes) or a **simple table/CSV editor**?
   - Should Excel files live in a **dedicated Spreadsheets tab**, **inside Subject/Course Workspaces** (clickable directly on the Infinite Matrix), or **both**?
   - Should edited Excel files **auto-save to Supabase/localStorage** with a "Download `.xlsx`" export button?
3. **Subjects, Syllabus & Study Features:**
   - Should "Projects" be renamed to **Subjects / Courses**?
   - Do they want extra study tools like a **Pomodoro / Study Timer** on the dashboard, **syllabus completion %** on subject folders, **flashcards**, or **in-app PDF/slide viewing**?
4. **What to Remove & Visuals:**
   - Confirm removing **Quotations**, **Enquiries**, and **INR budget/pricing** fields?
   - Keep the current **Light/Night glassmorphic + 7-segment clock + Apple Books shelf** aesthetic, or change colors/wallpapers/logo?
5. **Backend / Deployment:**
   - Will this use a **new Supabase project** (for the client's database & file storage), or start **local-first (`localStorage`)**?
