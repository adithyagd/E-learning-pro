## Rules
- The Final Assessment reuses the module assessment engine (config `scope='final'`, questions `scope='final'`); eligibility is enforced in `start_final_assessment()` via `is_final_assessment_eligible()` and the page reads `final_assessment_overview()` — one engine, no duplicate tables.
- The attempt runner/result UI lives only in `features/assessments/AttemptView.tsx`, shared by module and final assessments.
