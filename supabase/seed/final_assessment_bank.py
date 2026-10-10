"""Final Assessment question bank (Step 11).

Dedicated bank (scope='final') — integrative, practical questions across all five modules,
NOT copies of the module banks. Same authoring format as assessment_bank.py:
group = (objective_no, type, difficulty, [variants]); variant = (scenario, text, options, explanation);
options prefixed "*" are correct. Variants in one group test the same objective; only one per
group is ever drawn into an attempt. All people and companies are fictional.

Selection (start_final_assessment): per module 1 easy + 2 medium + 1 hard = 20 questions.
Run:  python3 supabase/seed/final_assessment_bank.py [--apply]
"""
import json, os, sys, uuid, urllib.request

NS = uuid.UUID("6f1b3c1e-2a4d-4e8b-9c11-0e2e2e000011")
MODULES = {
    1: "8bd82b57-0542-4ac5-aea3-25c29df57a0c",
    2: "b4a056de-164f-4c17-8955-43e7a3b1090f",
    3: "c40e86cc-2b8d-4eeb-8dbb-760ff1d512c1",
    4: "ad80b14d-bb93-4fbd-ab7f-5c023a6de3aa",
    5: "0f881d0a-5883-4d7c-9abf-081ef4264104",
}
TYPES = {"single": "single_choice", "multi": "multiple_choice", "tf": "true_false",
         "scenario": "scenario", "decision": "decision"}
TF = lambda ans: ["*True", "False"] if ans else ["True", "*False"]

M1 = [
 (1, "single", "easy", [(None, "Which outcome best shows that a recruitment process was successful?",
   ["*A suitable candidate joined and fits the role requirements", "The recruiter sent the most messages",
    "The vacancy stayed open for longer", "The candidate negotiated the highest salary"],
   "Recruitment succeeds when a suitable candidate joins and fits the requirement, not when activity is high.")]),
 (2, "tf", "easy", [(None, "A recruiter should understand the requirement fully before starting to source candidates.", TF(True),
   "Sourcing without understanding the requirement wastes time and produces unsuitable profiles.")]),
 (3, "single", "easy", [(None, "Who usually confirms the final selection decision for a candidate?",
   ["*The hiring manager or client", "The candidate", "The recruiter alone", "The candidate's previous employer"],
   "The recruiter supports and recommends; the hiring manager or client makes the selection decision.")]),
 (4, "scenario", "medium", [
  ("Recruiter Meera at the fictional firm Coastal Logistics has three open requirements: one urgent, two normal.",
   "How should Meera plan her day?",
   ["*Prioritise the urgent requirement first while keeping scheduled follow-ups on the others",
    "Work only on the newest requirement", "Spend equal time on each regardless of urgency", "Wait for the client to call"],
   "Priorities follow urgency and commitments, while existing follow-ups are not dropped."),
  ("Recruiter Arjun at the fictional firm Deccan Retail has an urgent store manager role and two normal roles.",
   "What is the best way for Arjun to organise his work?",
   ["*Focus first on the urgent role and keep follow-ups on the normal roles on schedule",
    "Ignore the normal roles until the urgent one closes", "Pick the easiest role first", "Pause all roles until the client sends updates"],
   "Urgent work comes first, but committed follow-ups on other roles still happen."),
 ]),
 (5, "multi", "medium", [
  (None, "Which behaviours reflect professional recruiter ethics? (Select all that apply)",
   ["*Keeping candidate information confidential", "*Giving candidates accurate information about the role",
    "Promising a job before selection", "Sharing a candidate's CV without consent"],
   "Confidentiality and honesty are core ethics; false promises and sharing without consent are not."),
  (None, "Which actions protect candidate trust? (Select all that apply)",
   ["*Sharing a CV with a client only after the candidate agrees", "*Being honest about the salary range",
    "Exaggerating the role to keep the candidate interested", "Discussing one candidate's details with another candidate"],
   "Consent and honesty build trust; exaggeration and disclosure damage it."),
 ]),
 (6, "decision", "medium", [(
   "A candidate asks recruiter Divya whether she is 'definitely selected' after a good first interview.",
   "What should Divya say?",
   ["*The interview went well, but the decision rests with the hiring team; she will update as soon as it is confirmed",
    "Yes, you are definitely selected", "No, you were not good enough", "Avoid replying"],
   "Recruiters must not confirm outcomes that are not yet authorised; they set honest expectations.")]),
 (7, "single", "medium", [(None, "Why is turnaround time important in recruitment?",
   ["*Good candidates often accept other offers if the process is slow", "It reduces the number of interviews needed",
    "It removes the need for screening", "It allows recruiters to skip documentation"],
   "Delays lose suitable candidates to competitors; speed must not replace quality steps.")]),
 (8, "scenario", "hard", [(
   "A client of the fictional firm Western Agro wants five hires in one week, but the role needs rare certification.",
   "What is the most professional response?",
   ["*Explain the market constraint, agree a realistic plan and timeline, and start sourcing immediately",
    "Accept the deadline and submit any available profiles", "Refuse the requirement", "Lower the certification requirement without telling the client"],
   "Recruiters manage expectations with evidence and agree realistic plans; they never change requirements silently.")]),
 (9, "decision", "hard", [(
   "A strong candidate's CV shows a two-year gap that the candidate has not explained.",
   "What should the recruiter do before submitting the profile?",
   ["*Ask the candidate about the gap politely and record the factual explanation",
    "Reject the candidate immediately", "Hide the gap from the client", "Submit without mentioning it and hope it is not noticed"],
   "Gaps are clarified, not assumed; accurate information is shared with the client.")]),
 (10, "multi", "hard", [(None, "Which factors together define the quality of a hire? (Select all that apply)",
   ["*Fit with the role requirements", "*Retention after joining", "Number of calls made to source the candidate",
    "How quickly the CV was forwarded regardless of fit"],
   "Quality of hire is about fit and retention, not activity volume.")]),
]

M2 = [
 (1, "single", "easy", [(None, "What is the main purpose of decoding a job description?",
   ["*To understand exactly what the role needs before searching", "To rewrite the client's company policy",
    "To decide the candidate's salary alone", "To shorten the JD for posting"],
   "Decoding converts a JD into a clear understanding of what the right candidate looks like.")]),
 (2, "tf", "easy", [(None, "A 'preferred' skill in a JD is the same as a mandatory skill.", TF(False),
   "Mandatory skills are must-haves; preferred skills add value but are not required.")]),
 (3, "single", "easy", [(None, "A JD says 'Work mode: Hybrid, 3 days in office'. What does this mean for candidates?",
   ["*They must be able to attend the office three days a week", "They can work fully remotely",
    "They must relocate abroad", "They work only night shifts"],
   "Hybrid with three office days requires regular office attendance.")]),
 (4, "scenario", "medium", [
  ("A JD for a fictional Sales Executive role at Konkan Motors lists: '2–4 years B2B sales (mandatory), CRM exposure (preferred), Pune'.",
   "Which candidate fits best?",
   ["*3 years B2B sales in Pune, no CRM exposure", "1 year retail sales in Pune with CRM", "6 years B2C sales in Delhi", "Fresher with CRM certification"],
   "Mandatory requirements (experience range, B2B, location) come first; preferred skills are secondary."),
  ("A JD for a fictional Accounts Executive role at Malabar Foods lists: '3–5 years accounts (mandatory), Tally (mandatory), GST filing (preferred), Kochi'.",
   "Which candidate fits best?",
   ["*4 years accounts with Tally in Kochi, limited GST filing", "2 years accounts with GST filing in Kochi, no Tally",
    "7 years audit in Mumbai", "Fresher with GST certificate in Kochi"],
   "All mandatory items are met by the first candidate; the preferred skill is only partly met, which is acceptable."),
 ]),
 (5, "decision", "medium", [
  ("A JD says '5+ years experience' but the client verbally says '3 years is fine for the right person'.",
   "What should the recruiter do?",
   ["*Confirm the change in writing and update the requirement record", "Use 3 years without recording it",
    "Ignore the verbal comment", "Ask candidates to inflate their experience"],
   "Requirement changes must be confirmed in writing before sourcing changes."),
  ("A client mentions on a call that the shift for a support role has changed from day to rotational.",
   "What is the correct next step?",
   ["*Get written confirmation and update the JD and candidate communication", "Tell only new candidates",
    "Keep using the old JD", "Wait until an interview to mention it"],
   "Written confirmation keeps the requirement accurate for all candidates."),
 ]),
 (6, "multi", "medium", [(None, "Which items should a candidate profile built from a JD include? (Select all that apply)",
   ["*Mandatory skills and experience range", "*Location and work mode", "The recruiter's personal salary", "Candidate's religion"],
   "A profile captures job-relevant requirements only; personal attributes are never criteria.")]),
 (7, "single", "medium", [(None, "A JD title says 'Senior Executive' but responsibilities describe team management of eight people. What should the recruiter do?",
   ["*Clarify the actual level and scope with the client before sourcing", "Source only freshers",
    "Assume the title is correct and ignore responsibilities", "Change the title on job posts without asking"],
   "When title and responsibilities conflict, the recruiter clarifies scope with the client.")]),
 (8, "scenario", "hard", [(
   "A fictional JD at Sahyadri Pharma asks for 'MSc Chemistry, 2–3 years QC, ready for shifts, Nashik, max 30 days notice'. A candidate has MSc, 3 years QC, Nashik, 60 days notice.",
   "How should the recruiter classify the candidate?",
   ["*Clarification required — all criteria match except notice period, which must be discussed", "Strong match — submit immediately",
    "Not suitable — reject", "Weak match — skip without recording"],
   "One mandatory criterion is unmet, so it needs clarification (early release, buyout or client flexibility) before submission.")]),
 (9, "decision", "hard", [(
   "A client's JD includes 'age below 28' as a requirement.",
   "What should the recruiter do?",
   ["*Explain that selection must be based on skills and experience and agree job-relevant criteria with the client",
    "Filter candidates by age silently", "Ask candidates their age in the first message", "Accept and publish the age limit"],
   "Recruiters do not screen on personal attributes; they steer criteria to job-relevant evidence.")]),
 (10, "multi", "hard", [(None, "Which JD details most often need clarification before sourcing? (Select all that apply)",
   ["*Unclear experience range", "*Conflicting title and responsibilities", "The client company's logo colour", "The recruiter's preferred job portal"],
   "Ambiguous requirements cause wrong sourcing; cosmetic details do not.")]),
]

M3 = [
 (1, "single", "easy", [(None, "What is candidate sourcing?",
   ["*Finding and identifying potential candidates for a requirement", "Issuing offer letters",
    "Running payroll", "Conducting exit interviews"],
   "Sourcing is the search for suitable potential candidates.")]),
 (2, "tf", "easy", [(None, "Employee referrals can be a valuable sourcing channel.", TF(True),
   "Referrals often bring pre-qualified candidates who fit the culture.")]),
 (3, "single", "easy", [(None, "In Boolean search, what does the operator OR do?",
   ["*Returns results containing any of the listed terms", "Returns results containing all terms",
    "Excludes a term", "Searches an exact phrase"],
   "OR broadens a search by accepting any of the terms.")]),
 (4, "scenario", "medium", [
  ("Recruiter Sana needs Java developers with Spring Boot but not freshers or interns.",
   "Which search string is most suitable?",
   ['*Java AND "Spring Boot" NOT (fresher OR intern)', "Java OR Spring Boot OR fresher", "Java NOT Spring Boot", '"Java fresher intern"'],
   "AND requires both skills, quotes keep the phrase, NOT with brackets excludes freshers and interns."),
  ("Recruiter Kiran needs accountants with Tally or SAP, excluding trainees.",
   "Which search string is most suitable?",
   ["*Accountant AND (Tally OR SAP) NOT trainee", "Accountant OR Tally OR SAP OR trainee", "Accountant NOT Tally", '"Accountant Tally SAP trainee"'],
   "Brackets group the alternatives; NOT removes trainees."),
 ]),
 (5, "decision", "medium", [
  ("A requirement needs 4 years of field sales. A profile shows 4 years of inside sales only.",
   "How should the recruiter classify relevance?",
   ["*Partial match — relevant experience but different sales type; clarify with the candidate", "Strong match",
    "Exact match", "Irrelevant — delete the profile"],
   "Related but not identical experience is a partial match that needs clarification."),
  ("A requirement needs warehouse supervision experience. A profile shows 3 years as a warehouse associate.",
   "How should the recruiter classify relevance?",
   ["*Partial match — relevant domain but no supervision evidence yet", "Strong match", "Exact match", "No match — never contact"],
   "Domain fit without the required responsibility is partial and must be clarified."),
 ]),
 (6, "multi", "medium", [(None, "What should a sourcing tracker record for each profile? (Select all that apply)",
   ["*Source channel", "*Date contacted and outcome", "Candidate's family details", "Rumours about the candidate"],
   "Trackers hold factual, job-relevant sourcing data only.")]),
 (7, "single", "medium", [(None, "Why should a recruiter prepare a sourcing strategy before searching?",
   ["*To choose the right channels and keywords for the requirement", "To avoid contacting any candidates",
    "To replace the JD", "To skip screening"],
   "A strategy aligns channels and keywords to the requirement so searching is efficient.")]),
 (8, "scenario", "hard", [(
   "After three days, recruiter Neha has 40 sourced profiles for a niche role but only 2 are relevant.",
   "What is the best next step?",
   ["*Review keywords and channels, refine the strategy, and check the requirement with the client", "Send all 40 profiles to the client",
    "Keep repeating the same search", "Close the requirement"],
   "Low relevance signals a strategy problem; refine searches and confirm the requirement rather than forwarding weak profiles.")]),
 (9, "decision", "hard", [(
   "A colleague offers a list of candidate phone numbers copied from another company's internal database.",
   "What should the recruiter do?",
   ["*Decline and use only legitimate, consent-based sourcing channels", "Use the list quietly",
    "Share it with the client", "Call all numbers and claim they applied"],
   "Improperly obtained data must never be used; sourcing must be ethical and lawful.")]),
 (10, "multi", "hard", [(None, "Which signs indicate a profile should be shortlisted for screening? (Select all that apply)",
   ["*Meets mandatory skills", "*Experience within the required range", "Has a professional-looking photo", "Lives near the recruiter"],
   "Shortlisting relies on requirement fit, not appearance or irrelevant factors.")]),
]

M4 = [
 (1, "single", "easy", [(None, "What should a recruiter do first on a screening call?",
   ["*Introduce themselves, the company and the purpose of the call, and check if it is a good time", "Ask for current salary immediately",
    "Read the full JD without pausing", "Ask personal questions"],
   "A professional opening sets context and respects the candidate's time.")]),
 (2, "tf", "easy", [(None, "It is acceptable to ask a candidate about their religion during screening.", TF(False),
   "Personal attributes such as religion are never screening criteria.")]),
 (3, "single", "easy", [(None, "Which question is relevant in a screening call?",
   ["*What is your current notice period?", "Are you planning to get married soon?", "Which caste do you belong to?", "How old are your parents?"],
   "Notice period is job-relevant; the others are inappropriate.")]),
 (4, "scenario", "medium", [
  ("Candidate Rahul says the offered salary is lower than he expected.",
   "What is the best response from the recruiter?",
   ["*Acknowledge the concern, explain the full role value honestly, and share the expectation with the client", "Promise a higher salary",
    "End the call", "Tell him other candidates accept less"],
   "Objections are handled with honesty and escalation, never false promises or pressure."),
  ("Candidate Priya worries the commute to the fictional office in Whitefield is too long.",
   "What should the recruiter do?",
   ["*Acknowledge it, share accurate details on location and timings, and let her decide", "Tell her the office is closer than it is",
    "Pressure her to accept", "Ignore the concern"],
   "Accurate information lets candidates make informed decisions."),
 ]),
 (5, "decision", "medium", [
  ("An interview is confirmed for 11:00 on Thursday at the fictional firm Godavari Infra.",
   "Which confirmation message is most complete?",
   ["*Date, time, venue or link, interviewer name, documents to carry and a contact number", "See you Thursday",
    "Interview soon, details later", "Come whenever convenient"],
   "Complete confirmations reduce no-shows and confusion."),
  ("A video interview is booked for Monday 15:30 with the fictional firm Narmada Textiles.",
   "Which confirmation is most complete?",
   ["*Date, time, meeting link, interviewer name, expected duration and a support contact", "Monday interview",
    "Link will come later maybe", "Join anytime Monday"],
   "Complete details make the interview easy to attend."),
 ]),
 (6, "multi", "medium", [(None, "Which are valid screening decisions? (Select all that apply)",
   ["*Match", "*Clarification Required", "Based on appearance", "Based on accent"],
   "Screening outcomes are evidence-based: Match, Gap, Clarification Required or Not Suitable.")]),
 (7, "single", "medium", [(None, "After an interview, the client has not shared feedback for three days. What should the recruiter do?",
   ["*Follow up with the client and update the candidate on the expected timeline", "Tell the candidate they are rejected",
    "Stop communicating with the candidate", "Tell the candidate they are selected"],
   "Recruiters chase feedback and keep candidates informed honestly.")]),
 (8, "scenario", "hard", [(
   "A candidate meets all skills but on the call gives inconsistent dates for their last two jobs.",
   "What is the correct screening outcome?",
   ["*Clarification Required — record the inconsistency and verify before submission", "Match — submit immediately",
    "Not Suitable — reject without asking", "Ignore the dates"],
   "Inconsistencies are verified and recorded before a decision; they are not ignored or assumed.")]),
 (9, "decision", "hard", [(
   "A client asks to reschedule an interview 30 minutes before it starts; the candidate is already travelling.",
   "What should the recruiter do?",
   ["*Inform the candidate immediately, apologise, offer new slots and record the change", "Let the candidate arrive and find out",
    "Cancel the candidate's application", "Ask the candidate to wait all day"],
   "Prompt, respectful communication protects the candidate experience.")]),
 (10, "multi", "hard", [(None, "Which practices make interview coordination reliable? (Select all that apply)",
   ["*Sending a reminder before the interview", "*Recording confirmation from both sides", "Booking without checking availability",
    "Sharing other candidates' slots with the candidate"],
   "Reminders and recorded confirmations reduce no-shows; privacy must be respected.")]),
]

M5 = [
 (1, "single", "easy", [(None, "Which pipeline stage comes directly after 'Screened'?",
   ["*Shortlisted", "Joined", "Offered", "Sourced"],
   "The sequence is Sourced → Contacted → Interested → Screened → Shortlisted → Interview Scheduled …")]),
 (2, "tf", "easy", [(None, "A candidate should be marked 'Joined' only after joining is confirmed.", TF(True),
   "Status changes must be evidence-based; Joined requires confirmation of joining.")]),
 (3, "single", "easy", [(None, "What makes a recruiter note useful?",
   ["*It is factual, dated and states the next action", "It contains opinions about personality",
    "It is written only from memory weeks later", "It is kept outside the candidate record"],
   "Good notes are factual, dated and actionable.")]),
 (4, "scenario", "medium", [
  ("Two records exist for 'Anil Kumar' with different phone numbers and different employers.",
   "What should the recruiter do?",
   ["*Treat them as possibly different people; verify using email, phone and history before any merge", "Merge them because the names match",
    "Delete both", "Keep the newer one and delete the older"],
   "Never merge on name alone; verify with identifying details and escalate if unclear."),
  ("A new profile for 'Sneha Rao' matches an existing record by name only; email and phone differ.",
   "What is the correct action?",
   ["*Do not merge on name; verify identifying details and escalate if still unclear", "Merge immediately",
    "Overwrite the old record", "Delete the new profile"],
   "Duplicates are confirmed through identifying data, not names."),
 ]),
 (5, "decision", "medium", [
  ("Candidate Faisal attended an interview yesterday; the client says feedback will come tomorrow.",
   "What is the correct current status and pending action?",
   ["*Interview Attended — follow up with the client tomorrow for feedback", "Selected — send offer", "Joined — close the requirement", "Rejected — inform the candidate"],
   "Status reflects confirmed facts; the pending action is the feedback follow-up."),
  ("Candidate Lata's interview happened today; the client has not decided yet.",
   "Which status and next action are correct?",
   ["*Interview Attended — schedule a feedback follow-up with the client", "Offered — share salary", "Selected — inform the candidate", "Dropout — close the record"],
   "Mark only what is confirmed and set a clear next action."),
 ]),
 (6, "multi", "medium", [(None, "Which items belong in a daily recruitment report? (Select all that apply)",
   ["*Requirement-wise candidate progress", "*Interviews scheduled and pending feedback", "Estimated numbers to look busy", "Personal opinions about clients"],
   "Daily reports contain accurate, requirement-wise facts — never fabricated numbers.")]),
 (7, "single", "medium", [(None, "A selected candidate has not responded to the offer for two days. What is the best action?",
   ["*Follow up, understand any concerns, record the outcome and update the client", "Mark Offer Accepted",
    "Mark Absconded immediately", "Do nothing"],
   "Offers need active follow-up and accurate status recording.")]),
 (8, "scenario", "hard", [(
   "It is 09:30. Recruiter Ravi has: an urgent client asking for status, two candidates joining today needing confirmation, five routine follow-ups, and a tracker to update.",
   "What is the best order of work?",
   ["*Confirm today's joiners, send the client a status update, then routine follow-ups, then the tracker", "Update the tracker first, then everything else",
    "Only do routine follow-ups", "Wait for the client to call again"],
   "Time-critical actions (joining confirmations, urgent client update) come first; documentation follows the same day.")]),
 (9, "decision", "hard", [(
   "A hiring manager says on a call 'we'll probably take Kavitha'. No written confirmation has been received.",
   "How should the pipeline be updated?",
   ["*Keep the current status, record the verbal indication in notes, and request written confirmation", "Mark Selected",
    "Mark Offered", "Mark Joined"],
   "Selected is marked only after authorised confirmation; verbal hints are noted, not treated as decisions.")]),
 (10, "multi", "hard", [(None, "Which fields make a candidate tracking record complete? (Select all that apply)",
   ["*Current status and last action", "*Pending action, owner and next follow-up date", "Candidate's horoscope", "A copy of another candidate's notes"],
   "Tracking needs status, last action, pending action, owner, due date and next follow-up.")]),
]

BANKS = {1: M1, 2: M2, 3: M3, 4: M4, 5: M5}


def build():
    questions, options = [], []
    for mod, groups in BANKS.items():
        for gi, (obj, qtype, diff, variants) in enumerate(groups, start=1):
            group = f"F-M{mod}-G{gi:02d}"
            for vi, (scenario, text, opts, expl) in enumerate(variants, start=1):
                code = f"{group}-V{vi}"
                qid = str(uuid.uuid5(NS, code))
                correct = [o for o in opts if o.startswith("*")]
                assert (len(correct) >= 2) if qtype == "multi" else (len(correct) == 1), code
                questions.append({
                    "id": qid, "code": code, "module_id": MODULES[mod], "objective_index": obj,
                    "question_type": TYPES[qtype], "question_text": text, "scenario_text": scenario,
                    "difficulty": diff, "variant_group": group, "variant_number": vi,
                    "explanation": expl, "status": "active", "scope": "final",
                })
                for oi, o in enumerate(opts, start=1):
                    options.append({
                        "id": str(uuid.uuid5(NS, f"{code}-O{oi}")), "question_id": qid,
                        "option_text": o.lstrip("*"), "is_correct": o.startswith("*"), "sort_order": oi,
                    })
    return questions, options


def post(path, rows):
    url = os.environ["SUPABASE_URL"] + f"/rest/v1/{path}"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(url, data=json.dumps(rows).encode(), method="POST", headers={
        "apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"})
    urllib.request.urlopen(req).read()


if __name__ == "__main__":
    qs, opts = build()
    for m in BANKS:
        mine = [q for q in qs if q["module_id"] == MODULES[m]]
        d = {k: len({q["variant_group"] for q in mine if q["difficulty"] == k}) for k in ("easy", "medium", "hard")}
        print(f"Module {m}: {len(mine)} questions, groups E{d['easy']}/M{d['medium']}/H{d['hard']}")
    print("total", len(qs))
    if "--apply" in sys.argv:
        post("assessment_questions?on_conflict=code", qs)
        post("assessment_question_options?on_conflict=id", opts)
        print("applied")
