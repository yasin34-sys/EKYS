# EKYS CEPTE — Product Screen Specifications

**Status:** Draft, pending approval. Built on Design System v1.1 (`docs/design/DESIGN_SYSTEM.md`) — every component named below refers to that document. This is the blueprint for implementation; no screen should be built without a corresponding, approved entry here.

**Grounding:** every data reference below is checked against what's actually implemented — the domain model (`Exam`, `Topic`, `Question`, `Package`, `UserProfile`, `Entitlement`, `Attempt`, `ExamSession`, `LearningMetric`, `RepeatPoolEntry`) and the existing use cases (`BootstrapAppUseCase`, `GetPublishedExamsUseCase`, `GetTopicsByExamUseCase`, `GetPackagesByExamUseCase`, `StartExamSessionUseCase`, `SubmitAnswerUseCase`, `FinishExamSessionUseCase`, `GetRepeatPoolUseCase`, `GetDashboardMetricsUseCase`). Where a screen needs data or a use case that doesn't exist yet, that's flagged explicitly rather than assumed.

**One product decision made here, not previously specified, worth flagging up front:** Practice (package study) and Deneme (timed mock exam) are two distinct modes sharing one Question Screen. **Practice reveals correctness immediately per question** (learning-oriented). **Deneme defers all reveals until Session Result** (exam-simulation-oriented — a real exam doesn't tell you if you're right as you go). This distinction drives §9–§11 below and isn't just a visual choice — it changes what `SubmitAnswerUseCase`'s result is used for in each mode.

---

## 1. Splash

**Purpose:** brand moment during native app launch, before any JS bootstrap logic runs.
**User goal:** none — a moment of waiting that shouldn't feel like waiting.
**Information architecture:** single element — wordmark.
**Layout hierarchy:** full-bleed background, wordmark dead-centered (the one deliberate exception to "never dead-center," since there's no content hierarchy to establish here).
**Card hierarchy:** none.
**Component list:** app icon/wordmark; optional one permitted gradient exception (Design System §36) on the background.
**Visual weight:** wordmark only, maximum weight, nothing competing.
**Empty state:** n/a.
**Loading state:** this screen *is* the loading state for native launch — hands off to §2 in-JS Loading (spinner) if the JS bootstrap sequence (`initializeDatabase` → `verifyIntegrity` → `BootstrapAppUseCase`) takes longer than the splash's minimum display time.
**Error state:** none at this layer — errors surface after handoff, in the Root Loading states already implemented (`auth-not-configured`, `database-integrity-error`, generic error).
**User actions:** none, non-interactive.
**Micro-interactions:** fade-out transition on handoff (Confident Ease, §28) — disabled under reduce-motion (instant cut instead).
**Navigation behavior:** auto-advances after a minimum ~800ms–1.2s even if bootstrap finishes faster (a flash under that duration reads as broken, not fast). Advances to First Launch (new device) or directly into the Tabs (returning user).
**Accessibility:** screen reader announces the app name once; no interactive elements to label.

**Top to bottom:** background → centered wordmark. That's the entire screen.

---

## 2. First Launch

**Purpose:** welcome a first-time candidate and get them into the app with zero friction — no signup wall, since anonymous sessions are automatic (ADR-009).
**User goal:** understand what this is and start immediately.
**Information architecture:** one screen, not a multi-page carousel — a feature-tour onboarding is explicitly rejected here as working against focus-first and fast-start.
**Layout hierarchy:** wordmark/logo top third, one-line value proposition middle, single Primary Button bottom third.
**Card hierarchy:** none — this screen has no cards, only typography and one button.
**Component list:** `AppText` (largeTitle + subhead), `PrimaryButton`.
**Visual weight:** the button carries the only real weight below the wordmark — everything else is quiet.
**Empty state:** n/a.
**Loading state:** button shows a brief in-place loading state while `BootstrapAppUseCase` runs (anonymous session creation) — not a separate screen transition.
**Error state:** if bootstrap fails here, same Root Loading error states apply (info tone for `auth-not-configured`, danger tone for genuine failures).
**User actions:** one — "Başla" (Get Started).
**Micro-interactions:** button press opacity shift only; no ripple.
**Navigation behavior:** tapping "Başla" is the only path forward, into the Tabs at Home. This screen is never shown again on this device once passed.
**Accessibility:** value-prop text and button both meet AA contrast; button has a clear accessibility label beyond just "Başla" (e.g., "Uygulamayı başlat").

**Top to bottom:** wordmark → one calm sentence explaining what EKYS CEPTE is → "Başla" button.

---

## 3. Anonymous User Flow

Not a single screen — a cross-cutting state active whenever `UserProfile.accountStatus === 'ANONYMOUS'`. Specified here because it shapes several other screens.

**Purpose:** let a candidate use free-tier content fully, with a gentle, never-blocking path toward registering.
**User goal:** keep studying without being interrupted by a signup wall; register only when *they* decide it's worth it.
**Information architecture:** the upgrade path lives in exactly two places — a persistent, low-emphasis row on **Profile** (§17), and a single contextual nudge after a genuinely meaningful moment (completing a first deneme, on **Session Result**, §11) — never as a modal interruption, never repeated on every app open.
**Component list (of the future prompt, not built yet):** a `Card` (not Hero — this must never outweigh the actual content around it) with calm framing: "İlerlemeni kaydet" (save your progress), not a hard sell.
**Visual weight:** deliberately low — this is the one place in the product where restraint matters more than conversion.
**Empty/Loading/Error state:** n/a at the flow level.
**User actions:** dismiss (always available, no guilt-inducing copy on dismissal) or proceed to registration.
**Micro-interactions:** none beyond standard card/button interactions.
**Navigation behavior:** registration (email/password or OAuth — exact mechanism deferred, `AuthService.upgradeAnonymousAccount` already exists as the underlying capability) happens in a modal sheet, not a full navigation push — this is a focused, single task, matching §15.
**Accessibility:** dismiss action has an unambiguous label; the prompt is never the only way to continue using the app.

---

## 4. Home

**Purpose:** answer exactly one question — "what should I do right now?"
**User goal:** resume or start studying with zero decision fatigue.
**Information architecture:** greeting → one Hero Card → at most one supporting narrative glance. Explicitly **not** a stat grid — accumulating stat cards here belongs on Statistics (§14) instead (Design System §25).
**Layout hierarchy:** top-anchored (never dead-centered, §12 rationale already established), `largeTitle` greeting at top.
**Card hierarchy:** exactly one Hero Card, one Standard Card beneath it — no more.
**Component list:** `AppText` (largeTitle, subhead), Hero Card, one Stat Card (narrative-framed), `Ionicons`.
**Visual weight:** the Hero Card is unambiguously the heaviest element on the screen.
**Hero Card priority logic** (a real product decision, not just layout): 1) if an `ExamSession` with `status='IN_PROGRESS'` exists, Hero Card reads "Kaldığın yerden devam et" with a Continue action straight into Question Screen; 2) else if Repeat Pool is non-empty, Hero Card reads "X tekrar sorusu seni bekliyor" (repeat questions are the highest-value study action available); 3) else Hero Card reads "Yeni bir konuya başla," pointing at Exams.
**Empty state:** if none of the three Hero conditions apply and no exams exist yet, Hero Card itself becomes an empty-state card ("Henüz yayınlanmış sınav yok" — same voice as Exams' empty state, §19 of the Design System).
**Loading state:** skeleton Hero Card + skeleton supporting card (Design System §20 — no spinner here, this is primary content).
**Error state:** danger-tone inline message inside the Hero Card slot if the underlying queries fail, with a retry action.
**User actions:** tap Hero Card (context-dependent destination per the priority logic above).
**Micro-interactions:** Hero Card press feedback (opacity/scale, §29).
**Navigation behavior:** Hero Card is the only navigable element; the supporting glance card is informational only (taps through to Statistics if tapped, low-emphasis).
**Accessibility:** Hero Card's accessible label states its actual destination ("Sınava devam et," not just "Devam et").

**Top to bottom:** greeting ("EKYS CEPTE" / today-oriented subhead) → Hero Card (priority-logic content) → one narrative Stat Card → end of screen (no further scroll content in MVP).

---

## 5. Exams

**Purpose:** browse published exams.
**User goal:** find and open the exam they're preparing for.
**Information architecture:** `largeTitle` header → Card List of exams (already built; formalizing here).
**Layout hierarchy:** top-anchored list, no Hero Card (this is a browse screen, not a decision screen — no single exam deserves more weight than another until the user picks one).
**Card hierarchy:** uniform Standard Cards — deliberately flat here, since elevating one exam over another would be a false signal.
**Component list:** `AppText`, `Card`, `FlatList`.
**Visual weight:** evenly distributed across all exam cards.
**Empty state:** "Henüz yayınlanmış sınav yok" / "Yayınlandığında burada görünecek" (already built, keeping as-is).
**Loading state:** skeleton Card List (replacing the current spinner, per Design System §20).
**Error state:** danger-tone `EmptyState`-style message with a retry action (currently missing a retry action — flagged as a gap to close).
**User actions:** tap an exam card → Exam Detail.
**Micro-interactions:** card press feedback only.
**Navigation behavior:** stack push to Exam Detail (not a modal — this is a genuine drill-down, not a focused task).
**Accessibility:** each card's label includes name, question count, and duration together, not just the name.

**Top to bottom:** "Sınavlar" title → exam cards (name, question count · duration) stacked with `md` gaps → empty/skeleton/error state fills the space if applicable.

---

## 6. Exam Detail

**New screen — not yet built.**
**Purpose:** build confidence about one exam before committing to a package — "this is well organized, I can do this."
**User goal:** understand the exam's shape and find the right package to start with.
**Information architecture:** exam name/stats header → Topics overview (informational, table-of-contents role, not a navigation destination in itself) → embedded Packages-for-this-exam list.
**Layout hierarchy:** sub-screen header (`title2`, not `largeTitle` — §17), back affordance.
**Card hierarchy:** one Standard Card for exam stats (narrative-framed: "Bu sınavda 80 soru var, ortalama 90 dakika sürer" rather than a cold stat table), Compact List for Topics (dense, hairline-divided — this is the deliberate Compact List use case named in Design System §18), Standard Cards for the embedded package list.
**Component list:** `AppText`, `Card`, Compact List, package cards (reused from §7).
**Visual weight:** exam stats card is the heaviest element; Topics list is intentionally quiet/dense (it's reference material, not a decision point).
**Empty state:** if an exam has zero published packages yet, the package section shows "Bu sınav için henüz paket yayınlanmadı" instead of an empty list.
**Loading state:** skeleton for stats card + skeleton rows for Topics/Packages.
**Error state:** danger-tone message with retry, scoped to whichever section failed (exam stats vs. topics vs. packages can fail independently).
**User actions:** tap a package card → Package Detail. Topics are informational only in this screen (not tappable) — tapping a topic to filter/drill in is an explicit non-goal for this screen, to avoid adding a redundant navigation path.
**Micro-interactions:** package card press feedback.
**Navigation behavior:** back returns to Exams; tapping a package pushes to Package Detail.
**Accessibility:** Topics list rows are still screen-reader-navigable even though non-interactive (informational content still needs to be announced).

**Top to bottom:** back affordance + `title2` exam name → narrative stats card → "Konular" section label → Compact List of topics → "Paketler" section label → package cards.

---

## 7. Packages

**Purpose:** cross-exam browse/discovery of all study packages.
**User goal:** understand what's available, and at a glance, what's free vs. what needs unlocking.
**Information architecture:** grouped by Exam (section headers) if more than one exam exists; a flat Card List if only one (current MVP reality). This is a deliberate rule, not a guess — avoids a pointless single-item section header when there's only one exam.
**Layout hierarchy:** top-anchored, `largeTitle` header.
**Card hierarchy:** uniform Standard Cards, same reasoning as Exams (§5) — a browse screen shouldn't pre-elevate any one package.
**Component list:** `AppText`, `Card`, small tag/chip for package_type + difficulty_level, a small "Ücretsiz" (free) tag on `is_free_tier` packages — no lock icon or anything alarming on premium ones, premium is the default unmarked state, free is the exception worth flagging.
**Visual weight:** evenly distributed.
**Empty state:** "Henüz paket yayınlanmadı" style, same voice pattern as Exams.
**Loading state:** skeleton Card List.
**Error state:** danger-tone with retry.
**User actions:** tap a package → Package Detail.
**Micro-interactions:** card press feedback.
**Navigation behavior:** stack push to Package Detail.
**Accessibility:** the free/premium distinction is never color-only — the "Ücretsiz" tag is text, always.

**Top to bottom:** "Paketler" title → (optional exam section header) → package cards (type · difficulty, free tag if applicable) stacked with `md` gaps.

---

## 8. Package Detail

**New screen — not yet built.**
**Purpose:** understand exactly what's in this package and start it.
**User goal:** decide to start, or discover they need to unlock it first.
**Information architecture:** package header (type, difficulty) → contents summary → access status → primary action.
**Layout hierarchy:** sub-screen header, back affordance.
**Card hierarchy:** one Hero Card carrying the primary action (Start, or Unlock) — this screen's entire job is that one decision, so it gets exactly one Hero Card and nothing competing with it.
**Component list:** `AppText`, Hero Card, `PrimaryButton`.
**Visual weight:** the Hero Card/CTA dominates; everything else is supporting context.
**Note — a real gap, flagged rather than invented around:** a "question count for this specific package" figure isn't backed by an existing use case yet (`PackageQuestion` membership isn't currently counted anywhere in the Application layer). This screen needs that capability before it can show it — noted here as an implementation dependency, not assumed to already exist.
**Empty state:** n/a (a package always has identity even before its question count is known).
**Loading state:** skeleton header + skeleton Hero Card.
**Error state:** danger-tone with retry.
**User actions:** if `hasAccess` (via `GetPackagesByExamUseCase`'s combined free-tier/entitlement logic) — "Başla" starts a session (`StartExamSessionUseCase`) and pushes to Question Screen. If not — "Kilidi Aç" pushes to Premium.
**Micro-interactions:** primary button press feedback; if access state is genuinely still loading, the button shows a skeleton/disabled state rather than defaulting to either "Başla" or "Kilidi Aç" prematurely.
**Navigation behavior:** back to wherever this was reached from (Exam Detail or Packages tab — both valid entry points).
**Accessibility:** the CTA's label always states the actual action ("Sınava başla" vs. "Paketin kilidini aç"), never a bare "Devam."

**Top to bottom:** back affordance + package type/difficulty header → narrative description → Hero Card with the single primary action.

---

## 9. Question Screen

**The single most important screen in the product — under Focus Mode (Design System §27).**
**Purpose:** present one question, capture one answer, in either Practice or Deneme mode.
**User goal:** answer with full attention, nothing else competing for it.
**Information architecture:** minimal top bar (progress "3/20", small quiet exit/pause affordance) → Question Card → Option Rows → (Deneme mode only) Timer.
**Layout hierarchy:** tab bar hidden entirely (true Focus Mode, not just visually de-emphasized). Question Card gets the most generous whitespace of any card in the whole product.
**Card hierarchy:** one Question Card (body text), up to five Option Rows beneath it — no other cards on this screen.
**Component list:** progress indicator, `AppText`, Question Card, Option Row (×2–5), Timer (Deneme only), small exit affordance.
**Visual weight:** the question body is the single heaviest element on screen; options are secondary but still large, confident tap targets (§14 of the Design System).
**Empty state:** n/a — this screen is never rendered without a question.
**Loading state:** brief skeleton for the Question Card while the next question's data resolves between questions — never a full-screen spinner mid-session, that would break Focus Mode.
**Error state:** if `SubmitAnswerUseCase` throws (`NotFoundError`, `IntegrityViolationError`), a small inline danger-tone message appears without leaving Focus Mode — never an ejecting full-screen error for a single answer failure.
**User actions:** tap an Option Row.
  - **Practice mode:** tap immediately submits (`SubmitAnswerUseCase`) and reveals correctness in place — this screen and Question Result (§10) are the same screen, not two.
  - **Deneme mode:** tap selects and submits (an `Attempt` is created either way, since the architecture is submit-per-answer), but the option only shows an `accent`-tinted "selected" state, never `success`/`danger` — no reveal until Session Result. A user may navigate back to a previous question and re-select; because `Attempt` is insert-only, this creates a new `Attempt` row, and the *latest* one is what counts for scoring — this is already how the Repeat Pool and scoring logic work, not a new mechanism.
**Micro-interactions:** Option Row selection transition (120ms, Confident Ease, Design System §29); progress indicator increments without a jarring jump.
**Navigation behavior:** Practice mode advances to the next question automatically after a brief pause once the result is acknowledged. Deneme mode advances immediately on selection (no reveal to acknowledge). The exit affordance returns to wherever the session was started from, with the session left `IN_PROGRESS` (resumable per §15's state-restoration principle) — it does not abandon the session.
**Accessibility:** exit affordance always present and labeled, even inside Focus Mode — Focus Mode removes *distraction*, not *escape routes*. Option Rows are large enough to meet the 44×44pt minimum by a wide margin, given how frequently this interaction repeats.

**Top to bottom:** progress "X/N" + exit affordance (small, top corners) → (Deneme only) Timer → Question Card (body) → Option Rows A–E stacked with generous gaps.

---

## 10. Question Result

**Practice mode only — this is a state of Question Screen (§9), not a separate navigated screen.** Specified separately here because the user-facing behavior is distinct enough to warrant its own walkthrough.

**Purpose:** immediate, honest, non-judgmental feedback.
**User goal:** know if they were right, understand why if wrong, move on without dwelling.
**Information architecture:** Option Rows transform in place — no navigation, no new screen.
**Card hierarchy:** unchanged from Question Screen — the transformation happens within the existing Option Rows.
**Component list:** Option Row (result-revealed state), `Ionicons` (checkmark/x), "Sonraki" button.
**Visual weight:** the correct option (if not the one selected) and the user's own selection are now the two heaviest elements; other options dim slightly.
**Empty/Loading state:** n/a — this is instantaneous given `SubmitAnswerUseCase` already runs against local SQLite.
**Error state:** covered under Question Screen (§9).
**User actions:** tap "Sonraki" (Next) to advance — not fully automatic, so the user controls their own pace of reflection.
**Micro-interactions:** correct/incorrect icon scales in with no overshoot (Design System §29) — a controlled arrival, not a bounce or flash.
**Navigation behavior:** advances to the next question within the same Focus Mode session.
**Accessibility:** correct/incorrect is always paired with an icon and would also work for a screen reader via an explicit "doğru"/"yanlış" announcement, never color alone.

**Note — a real, disclosed gap:** `Question` has no explanation/rationale field in the current schema, so Question Result cannot show *why* an answer is correct beyond the correct/incorrect state itself. This is a content-model gap, not a UI omission — flagged for a future schema decision, not invented around here.

---

## 11. Session Result

**Purpose:** present a completed Deneme's outcome — the Deneme Summary Card (Design System §26) at full-screen scale.
**User goal:** understand how they did, honestly, without feeling judged either way.
**Information architecture:** score header → narrative pass/fail framing → topic breakdown → actions.
**Layout hierarchy:** top-anchored, `largeTitle`-scale score presentation, but calm — not a stamp, not a badge.
**Card hierarchy:** one Hero Card for the overall result, Standard Cards for the topic breakdown.
**Component list:** `AppText` (tabular score), Hero Card, Compact List (topic breakdown), `PrimaryButton` ×2.
**Visual weight:** the score is the single heaviest element on the screen.
**Score framing (a real product decision):** never a stark "BAŞARISIZ" (FAILED) stamp. Instead: "Geçme puanının X puan altındasın" (you're X points below the passing score) if failed, "Geçme puanının X puan üzerindesin" if passed — both stated as fact, in the same visual register, not styled as opposite extremes. This directly implements the brand personality (§2) — a failed deneme is information, not a verdict.
**Empty state:** n/a — this screen only renders for a completed session.
**Loading state:** skeleton while `FinishExamSessionUseCase`'s score computation resolves.
**Error state:** danger-tone with retry if scoring fails.
**Achievement Moment trigger:** if this is the candidate's *first-ever* completed deneme, this is one of the 3–5 reserved Achievement Moments (Design System §25) — a brief `warmAccent` takeover precedes the normal Session Result content, not instead of it.
**User actions:** "Cevapları Gözden Geçir" (review answers — reveals all Deneme-mode answers now, since reveal was deferred per §9) and "Ana Sayfaya Dön" (return home).
**Micro-interactions:** score number counts up on entry (Confident Ease, brief) rather than appearing instantly — the one place in the product where a number animating in is earned, since it's a genuinely significant moment.
**Navigation behavior:** "Review" pushes into a read-only version of the question set with all reveals now visible; "Return Home" pops the entire session stack back to the Home tab (not a simple back — this session is complete, going "back" into it doesn't make sense).
**Accessibility:** score and pass/fail framing are announced together as one coherent statement, not as fragmented separate labels.

**Top to bottom:** (optional Achievement Moment) → score (tabular, large) → narrative pass/fail sentence → topic breakdown list → two action buttons.

---

## 12. Repeat Pool

**Purpose:** surface previously-missed questions for targeted review — one of the product's genuinely differentiated features.
**User goal:** efficiently fix known weak points instead of re-studying everything.
**Information architecture:** brief explanatory subhead (the concept isn't obvious on first encounter) → list of pool questions → start action.
**Layout hierarchy:** top-anchored, `largeTitle` header + one explanatory `subhead` line beneath it.
**Card hierarchy:** one Hero Card ("Tekrar Başlat") anchoring the primary action, Compact List beneath showing pool contents (topic + a short snippet, not full question bodies — this is a preview list, not the actual practice session).
**Component list:** `AppText`, Hero Card, Compact List, `Ionicons`.
**Visual weight:** the Hero Card/start action is the clear focal point; the list itself is intentionally quieter (reference, not decision).
**Empty state:** "Tekrar edilecek soru yok — harika gidiyorsun" (no questions to repeat — you're doing great) — this is one of the few places a positive-framed empty state is appropriate, since an empty Repeat Pool is genuinely good news, not a gap to apologize for.
**Loading state:** skeleton Hero Card + skeleton list rows.
**Error state:** danger-tone with retry.
**User actions:** tap Hero Card to start a Repeat session (functions like a Practice-mode session scoped to just the pool's questions) → Question Screen.
**Micro-interactions:** standard card press feedback.
**Navigation behavior:** stack push into Question Screen in Practice mode, scoped to the pool.
**Accessibility:** the explanatory subhead is essential, not decorative — a screen reader user needs the concept explained just as much as a sighted one.

**Top to bottom:** "Tekrar Havuzu" title → one-line explanation → Hero Card (start action, question count) → Compact List preview of pool questions (or positive empty state).

---

## 13. Learning Progress

**Purpose:** full per-topic mastery breakdown — the "see all" destination from Statistics (§14).
**User goal:** identify which topics need more attention, at a glance, across the whole subject.
**Information architecture:** dense, list-forward — this is an Overview context (Design System §7's density-by-context principle), not a Focus context, so more information per screen is appropriate here.
**Layout hierarchy:** top-anchored, `title2` header (this is typically reached as a sub-screen, not a tab root).
**Card hierarchy:** Compact List — every topic as one dense row, not one card per topic (a Card List here would create excessive scrolling for a subject with many topics, exactly the case §18 reserves Compact List for).
**Component list:** `AppText`, Compact List, Topic Progress Chip (×N).
**Visual weight:** evenly distributed across rows — no topic is visually privileged over another here.
**Empty state:** "Henüz konu ilerlemesi yok — bir paketle çalışmaya başla" pointing back toward Packages.
**Loading state:** skeleton rows.
**Error state:** danger-tone with retry.
**User actions:** rows are informational in MVP (no per-topic drill-down screen exists yet) — tapping is a non-goal until a Topic Detail screen is justified by real usage.
**Micro-interactions:** none beyond list scroll.
**Navigation behavior:** reached from Statistics ("Tüm konuları gör") or directly if ever added to a nav path later.
**Accessibility:** each Topic Progress Chip's mastery level is stated in text ("Gelişiyor"), never conveyed by chip color alone.

**Top to bottom:** `title2` "Konu İlerlemesi" → Compact List: topic name + Topic Progress Chip, one row per topic.

---

## 14. Statistics

**Purpose:** the actual Dashboard (Design System §25) — "how am I actually doing?"
**User goal:** get an honest, digestible sense of overall readiness without being overwhelmed by data.
**Information architecture:** one narrative Hero stat → a small grid of narrative-framed Stat Cards (max 4–6, §24) → link to Learning Progress.
**Layout hierarchy:** top-anchored, `largeTitle` header.
**Card hierarchy:** one Hero Card (overall readiness, most prominent), 2-column grid of Stat Cards beneath.
**Component list:** `AppText`, Hero Card, Stat Card (×4–6 max), `PrimaryButton`/text link.
**Visual weight:** the Hero Card (overall readiness) is unambiguously the focal point; the grid is secondary, evenly weighted within itself.
**Empty state:** if no `LearningMetric` rows exist yet, the whole screen becomes a single explanatory empty state ("Henüz istatistik yok — ilk paketini tamamladığında burada göreceksin") rather than a grid of zeros, which would look broken/sad rather than simply early.
**Loading state:** skeleton Hero Card + skeleton grid.
**Error state:** danger-tone with retry.
**User actions:** "Tüm konuları gör" → Learning Progress.
**Micro-interactions:** stat numbers count up briefly on first load (once, not on every re-render) — restrained, not a flashy odometer effect.
**Navigation behavior:** reached from Profile or Home's supporting glance card; links onward to Learning Progress.
**Accessibility:** narrative sentence and its supporting number are read together as one statement.

**Top to bottom:** "İstatistikler" title → Hero Card (overall readiness, narrative) → 2-column Stat Card grid (narrative-framed) → "Tüm konuları gör" link.

---

## 15. Premium

**Purpose:** present the value of upgrading, confidently, per Design System §35 — no urgency tactics of any kind.
**User goal:** understand what premium unlocks and decide, on their own terms, whether it's worth it.
**Information architecture:** value proposition header → free-vs-premium comparison → pricing → single CTA.
**Layout hierarchy:** top-anchored, one clear narrative header ("Tüm konulara sınırsız erişim" — unlimited access to all topics — not a hard-sell headline).
**Card hierarchy:** one Feature Card for the comparison table, one Hero-weight card for pricing/CTA.
**Component list:** `AppText`, comparison rows (checkmark vs. muted dash, never a red X — §35), pricing display (tabular figures, elevated typography), `PrimaryButton`.
**Visual weight:** pricing/CTA card is the heaviest element, but presented with the same typographic respect as exam statistics, not banner styling.
**`warmAccent` use:** permitted here (one of its two sanctioned contexts, §5) — used tastefully on the pricing card, not as background decoration throughout.
**Empty state:** n/a.
**Loading state:** skeleton for pricing while the store/IAP layer resolves (not yet implemented — flagged as a dependency).
**Error state:** if purchase-flow initialization fails, a calm danger-tone message with retry — never blocking the rest of the screen from being readable.
**User actions:** "Şimdi Yükselt" (Upgrade Now) → native purchase flow (not yet implemented) → Purchase Success on completion.
**Micro-interactions:** standard button feedback only — explicitly no attention-grabbing pulse/glow on the CTA, which would tip into manufactured urgency.
**Navigation behavior:** reached from Package Detail ("Kilidi Aç") or Profile; on successful purchase, proceeds to Purchase Success; on cancellation, returns exactly where the user was.
**Accessibility:** comparison rows are readable independent of color (checkmark/dash icons plus text labels, never icon-only).

**Top to bottom:** narrative header → free-vs-premium comparison card → pricing card with CTA.

---

## 16. Purchase Success

**Purpose:** confirm the purchase and welcome the candidate into full access — an Achievement Moment (§25).
**User goal:** know it worked, and get back to studying quickly.
**Information architecture:** single-purpose confirmation screen, near-full-screen, brief.
**Layout hierarchy:** centered (one of the few deliberate exceptions to top-anchoring, alongside Splash — this is a moment, not a browsing screen).
**Card hierarchy:** none — this is typography and color, not cards.
**Component list:** `AppText` (warm, `warmAccent`-toned), `Ionicons` (checkmark), one permitted gradient exception, `PrimaryButton`.
**Visual weight:** the confirmation message is the only element.
**Empty/Loading/Error state:** n/a — this screen only renders after a confirmed successful purchase.
**User actions:** "Devam Et" (Continue) → back into the app, now with full access.
**Micro-interactions:** the one Achievement Moment entrance animation (§25) — brief, restrained, no confetti/sound.
**Navigation behavior:** returns to wherever the purchase was initiated from (typically Package Detail, now unlocked) — not back to Premium.
**Accessibility:** respects reduce-motion (the Achievement entrance becomes an instant state, not an animated one, if that OS setting is on).

**Top to bottom:** warm confirmation icon → "Hoş geldin" / access-confirmed message → "Devam Et" button.

---

## 17. Profile

**Purpose:** account status and entry point to the rest of account-level features.
**User goal:** check account status, manage the account, find Settings/About.
**Information architecture:** account status card (already built) → Anonymous upgrade row (if applicable, §3) → navigation rows to Settings/About/Statistics.
**Layout hierarchy:** top-anchored, `largeTitle` header (already built).
**Card hierarchy:** one Standard Card for account status, one low-emphasis Card for the upgrade prompt (Anonymous only), a Compact List for navigation rows.
**Component list:** `AppText`, `Card`, Compact List rows, `Ionicons` (chevrons).
**Visual weight:** account status card is primary; navigation rows are uniformly quiet (this is a menu, nothing here should compete for attention).
**Empty/Loading state:** already built (skeleton to replace the current spinner, per §20).
**Error state:** danger-tone with retry (already built as a generic error; formalizing the tone here).
**User actions:** tap Settings/About/Statistics rows; tap the upgrade prompt (Anonymous only); sign out (Registered only).
**Micro-interactions:** row press feedback (subtle background tint, not full card elevation change).
**Navigation behavior:** each row pushes to its respective screen; sign-out returns to First Launch-equivalent state (a fresh anonymous session is created next).
**Accessibility:** each navigation row's chevron is decorative only — the label itself states the destination.

**Top to bottom:** "Profil" title → account status card (already built) → (Anonymous only) upgrade prompt card → navigation rows: İstatistikler, Ayarlar, Hakkında → (Registered only) Çıkış Yap.

---

## 18. Settings

**New screen — not yet built.**
**Purpose:** app-level preferences.
**User goal:** adjust how the app behaves, quickly find and change one thing.
**Information architecture:** grouped Compact List — Appearance, Notifications, Data/Privacy, Account.
**Layout hierarchy:** sub-screen header, back affordance.
**Card hierarchy:** grouped Compact Lists (each group in its own container, per standard iOS Settings-style grouping — a well-understood, non-Material pattern).
**Component list:** `AppText`, Compact List, toggle controls, `Ionicons`.
**Visual weight:** evenly distributed — this is a utility screen, not a decision screen.
**Flagged dependencies, not built yet:** dark-mode toggle (needs §34's `ThemeProvider`), notification preferences (no push system exists), data/privacy controls (no such flow built).
**Empty/Loading/Error state:** n/a — this screen is static preference controls, not data-dependent (aside from account info in the Account group).
**User actions:** toggle preferences; tap into Account-related sub-flows.
**Micro-interactions:** toggle switch transition, standard platform-appropriate (this is one of the few controls where matching each platform's native toggle is correct, not a custom-styled override).
**Navigation behavior:** back to Profile.
**Accessibility:** every toggle has an explicit on/off state announced, not just a visual position.

**Top to bottom:** back affordance + "Ayarlar" header → "Görünüm" group (dark mode, future) → "Bildirimler" group (future) → "Hesap" group (sign out, data).

---

## 19. About

**New screen — not yet built.**
**Purpose:** version info, legal, support — required for store compliance, not a feature surface.
**User goal:** find the privacy policy/terms, or contact support, quickly.
**Information architecture:** simple informational Compact List.
**Layout hierarchy:** sub-screen header, back affordance.
**Card hierarchy:** one Compact List group.
**Component list:** `AppText`, Compact List.
**Visual weight:** minimal — this screen should never try to be interesting, it should be efficient.
**Empty/Loading/Error state:** n/a — static content.
**User actions:** tap rows for Privacy Policy / Terms of Service / Support (each opens an external link or a simple text screen — mechanism not yet decided, flagged).
**Micro-interactions:** standard row press feedback.
**Navigation behavior:** back to Profile; external links open outside the app (browser) rather than an in-app webview, to avoid a heavier, un-speced screen.
**Accessibility:** version number is announced as text, not just displayed.

**Top to bottom:** back affordance + "Hakkında" header → app version/build row → Gizlilik Politikası → Kullanım Koşulları → Destek.

---

## 20. Error Screens

Not one screen — a pattern applied consistently wherever a screen-level (not inline) error occurs: navigating to content that no longer exists (a deleted package), a full network failure on an otherwise-empty screen, or an unrecoverable bootstrap failure (already built at the Root layout level).

**Purpose:** communicate what went wrong without alarming the user, and offer a way forward wherever possible.
**User goal:** understand whether this is their fault, a temporary problem, or something to report — and what to do next.
**Information architecture:** `InfoState` component (already built, Design System-native) — icon, title, message, optional retry action.
**Tone rule (already established, reaffirmed here):** informational tone (`info`, calm) for expected/recoverable states, danger tone reserved for genuine, unexpected failures — never alarm-red for something the user didn't cause and can't fix by panicking.
**Component list:** `InfoState`, `PrimaryButton` (retry, where applicable).
**Empty/Loading state:** n/a — this pattern *is* the error state.
**User actions:** retry (where the failure is plausibly transient) or return to a known-good screen (e.g., back to Packages if a specific package is missing).
**Micro-interactions:** none — error states should feel calm and static, not draw additional attention via animation.
**Navigation behavior:** never a dead end — every error screen has at least one way forward, even if that's just "go back."
**Accessibility:** the retry action (if present) is always the first focusable element after the message, so a screen reader user doesn't have to hunt for it.

---

## Navigation Map

```
Splash
  └─▶ First Launch (new device only)
        └─▶ [Tabs]
  └─▶ [Tabs] (returning user)

[Tabs] ── Home | Exams | Packages | Profile
│
├─ Home
│   ├─▶ Question Screen (resume IN_PROGRESS session)
│   ├─▶ Repeat Pool (if Hero Card priority #2)
│   └─▶ Exams (if Hero Card priority #3)
│
├─ Exams
│   └─▶ Exam Detail
│         └─▶ Package Detail (embedded package list)
│
├─ Packages
│   └─▶ Package Detail
│         ├─▶ Question Screen (if hasAccess)
│         └─▶ Premium (if not)
│
├─ Question Screen  (Focus Mode — tab bar hidden)
│   ├─ Practice mode: Question Result is inline (same screen)
│   └─ Deneme mode: session ends ─▶ Session Result
│
├─ Session Result
│   ├─▶ Question Screen (review, all reveals visible)
│   ├─▶ Repeat Pool (contextual, if new pool entries resulted)
│   └─▶ Home (return)
│
├─ Repeat Pool
│   └─▶ Question Screen (Practice mode, scoped to pool)
│
├─ Statistics  (reached from Home glance or Profile)
│   └─▶ Learning Progress
│
├─ Premium  (reached from Package Detail or Profile)
│   └─▶ Purchase Success
│         └─▶ back to originating Package Detail (now unlocked)
│
└─ Profile
    ├─▶ Statistics
    ├─▶ Settings
    ├─▶ About
    └─▶ Anonymous upgrade sheet (modal, Anonymous users only)

Error Screens: reachable from any screen on failure; always resolve back to
a known-good screen, never a dead end.
```

**Depth check against §15's "shallow navigation" principle:** the deepest path in the product is Exams → Exam Detail → Package Detail → Question Screen → Session Result — four levels, and Session Result explicitly returns to Home rather than unwinding the stack level-by-level, keeping the *felt* depth shallow even where the *technical* stack isn't.

---

**Next step:** wait for approval. Once accepted, screens should be implemented in roughly this priority order: Home/Exams/Packages refinements to match Hero Card + skeleton loading (already-built screens, bringing them in line with this spec) → Exam Detail, Package Detail (unblocks real navigation) → Question Screen, Question Result, Session Result (the core product experience) → Repeat Pool, Learning Progress, Statistics → Premium, Purchase Success → Profile refinements, Settings, About → Error Screen pattern applied consistently throughout.
