"""Module 4 content seed source. Run:
python3 supabase/seed/module4_content.py > supabase/seed/module4_lessons.sql
python3 supabase/seed/module4_content.py --json > /tmp/m4.json
"""
import json, sys

OBJECTIVES = [
    "Understand professional recruiter communication principles.",
    "Conduct structured and professional candidate screening calls.",
    "Ask relevant questions based on job requirements.",
    "Evaluate candidate qualifications, skills and experience against requirements.",
    "Distinguish between requirement matches, gaps and information requiring clarification.",
    "Handle candidate questions and objections professionally.",
    "Coordinate interviews accurately and professionally.",
    "Communicate interview updates and follow-ups clearly.",
    "Maintain accurate candidate screening and interview information.",
    "Complete an end-to-end screening and interview coordination workflow.",
]

def h(t): return {"type": "h", "text": t}
def p(t): return {"type": "p", "text": t}
def ul(*i): return {"type": "list", "items": list(i)}
def steps(*i): return {"type": "steps", "items": [{"title": a, "text": b} for a, b in i]}
def terms(*i): return {"type": "terms", "items": [{"term": a, "definition": b} for a, b in i]}
def ex(t, x): return {"type": "example", "title": t, "text": x}
def cmp(t, good, bad, gl=None, bl=None):
    d = {"type": "compare", "title": t, "good": good, "bad": bad}
    if gl: d["goodLabel"] = gl
    if bl: d["badLabel"] = bl
    return d
def note(t): return {"type": "callout", "text": t}
def answer(t, *items): return {"type": "answer", "title": t, "items": [{"term": a, "definition": b} for a, b in items]}

def channel(name, what, when, adv, lim, reach):
    return [h(name), terms(("What it is", what), ("When it is useful", when), ("Advantages", adv), ("Limitations", lim), ("Candidates it reaches", reach))]

L = []

L.append(("Professional Candidate Communication", "Respectful, clear and trustworthy communication with every candidate.", "text", 15, [
    h("Communication fundamentals"),
    p("Every call, message and email shapes how candidates see you and the company. Professional communication is clear, respectful, accurate, concise and focused on the requirement."),
    terms(("Respectful interaction", "Greet by name, ask if it is a good time, thank the candidate for their time."),
          ("Clear and simple language", "Short sentences; explain terms like CTC or notice buyout if needed."),
          ("Professional tone", "Polite and calm, even when the candidate is not interested."),
          ("Active listening", "Let the candidate finish, then summarise what you heard."),
          ("Relevant questions", "Ask only what the requirement needs."),
          ("Avoid confusing language", "No jargon, slang or internal abbreviations."),
          ("Avoid assumptions", "Ask instead of guessing location, salary or interest."),
          ("Maintain trust", "Share only confirmed information; do what you said you would."),
          ("Professionalism", "Be on time for calls, keep records accurate, protect candidate data.")),
    h("Good vs poor communication (fictional example)"),
    cmp("Opening a call with Ms. Kavya R. about a Customer Support role",
        "\"Good afternoon, Kavya. This is Arjun from E2E Procurement. I'm calling about a Customer Support Executive opening in Bengaluru that matches your profile. Is this a good time to speak for five minutes?\"",
        "\"Hi, job hai, interested? Salary achha hai, kal interview aa jao.\"",
        "Good", "Poor"),
    h("Why the good example is better"),
    ul("Introduces the recruiter and company, so the candidate knows who is calling.", "States the role and location clearly.", "Asks for permission and sets a time expectation.", "Makes no promises about salary or selection.", "The poor example is vague, informal, pressures the candidate and implies unverified salary."),
    note("Candidates remember how they were treated, even when they are not selected. That reputation affects future sourcing."),
]))

L.append(("Recruiter Screening Calls", "Preparing for, conducting and closing a structured screening call.", "text", 18, [
    h("Purpose of a screening call"),
    p("A screening call confirms whether the candidate meets the requirement and is genuinely interested, before their profile goes to the hiring manager."),
    h("Before the call"),
    ul("Re-read the JD and your candidate profile notes.", "Review the candidate's CV and source record.", "List what to confirm and what is still missing.", "Have the approved role details ready: location, shift, CTC range, process."),
    h("Fictional screening-call structure"),
    steps(("Greeting", "\"Good morning, may I speak with Mr. Rahul Menon?\""),
          ("Introduction", "Your name, company and reason for calling."),
          ("Candidate availability", "\"Is this a good time to talk for about ten minutes?\" If not, fix a call-back time."),
          ("Role explanation", "Title, key responsibilities, location, work mode, shift — confirmed facts only."),
          ("Basic screening", "Experience, skills, qualification, location, notice period, expectations."),
          ("Candidate questions", "Answer what you know; note anything you need to verify."),
          ("Next steps", "Explain what happens next and approximate timelines."),
          ("Professional closing", "Thank the candidate and confirm how you will contact them.")),
    h("During the call"),
    ul("Listen carefully; do not interrupt.", "Record answers accurately as you go.", "Repeat key facts back: \"So your notice period is 30 days, negotiable to 15?\""),
    h("After the call"),
    p("Update the candidate record the same day: response, confirmed details, gaps, next action and date."),
    note("This lesson is training only — the platform does not place calls or send messages."),
]))

L.append(("Candidate Screening Questions", "Asking relevant, professional questions linked to the requirement.", "scenario", 18, [
    h("Question areas"),
    terms(("Qualification", "\"What is your highest qualification and year of completion?\""),
          ("Skills", "\"Which version of Tally do you use, and for which tasks?\""),
          ("Experience", "\"How many years have you worked specifically in accounts payable?\""),
          ("Location / work mode", "\"The role is work from office in Guindy. Is that comfortable for you?\""),
          ("Shift / availability", "\"The shift is rotational, including nights. Are you able to work this?\""),
          ("Notice period", "\"What is your notice period, and is early release possible?\""),
          ("Salary expectation", "\"What are your expectations for this role?\" — share the approved range only if authorised."),
          ("Missing information", "\"Your CV does not mention GST filing — have you handled it?\"")),
    h("Avoid irrelevant or inappropriate questions"),
    p("Never ask about religion, caste, marital status, pregnancy or family plans, age (beyond legal eligibility), or anything unrelated to the job."),
    h("Scenario (fictional)"),
    ex("Role: Accounts Executive, Chennai, B.Com, 2–4 yrs AP, Tally Prime + GST mandatory", "Candidate: Ms. Divya S., 3 years at a fictional trading firm. Which questions should the recruiter ask?"),
    answer("Relevant vs not relevant",
           ("Relevant", "\"Do you prepare GST returns yourself?\" — verifies a mandatory skill."),
           ("Relevant", "\"How many vendor invoices do you process monthly?\" — checks depth of AP experience."),
           ("Relevant", "\"Can you commute to Guindy daily for a 9:30 start?\" — location/work mode."),
           ("Not relevant", "\"Are you planning to get married soon?\" — personal, not job-related, inappropriate."),
           ("Not relevant", "\"Which community are you from?\" — discriminatory and unacceptable."),
           ("Needs care", "\"What is your current CTC?\" — ask only where policy and law allow; expected CTC is usually sufficient.")),
]))

L.append(("Candidate Evaluation and Screening Decisions", "Objective, evidence-based screening decisions against the JD.", "text", 17, [
    h("Decision categories"),
    terms(("MATCH", "Candidate meets the relevant requirement."),
          ("GAP", "Candidate does not currently meet the requirement."),
          ("CLARIFICATION REQUIRED", "Information is missing or unclear."),
          ("NOT SUITABLE", "Candidate clearly does not meet an essential requirement.")),
    h("Evaluation framework"),
    p("For each requirement record: Requirement → Candidate information → Match / Gap → Evidence → Screening decision."),
    ex("Fictional example — Mr. Imran K., Java Developer, Pune", "Java + Spring Boot (mandatory): 4 yrs, described current project APIs → MATCH. Location Pune: lives in Mumbai, will relocate in 30 days → CLARIFICATION REQUIRED (confirm with hiring manager). AWS (preferred): none → GAP, not blocking. Notice ≤45 days: 60 days, buyout possible → CLARIFICATION REQUIRED. Decision: Shortlist subject to hiring-manager approval on relocation and notice."),
    h("Outcomes"),
    terms(("Shortlisted", "All mandatory requirements matched; preferred gaps noted."),
          ("Needs clarification", "One or more mandatory items unclear; resolve before submitting."),
          ("Not suitable", "An essential requirement is clearly not met. Inform the candidate politely.")),
    h("Keep decisions objective"),
    p("Decide only on job-related evidence. Never let appearance, age assumptions, gender stereotypes, religion, caste, personal relationships or other unrelated characteristics influence a decision."),
    note("Write the evidence, not your opinion: '3 years AP at ABC Traders, prepares GSTR-1 monthly' — not 'seems good'."),
]))

L.append(("Handling Candidate Objections and Questions", "Responding professionally, and verifying instead of guessing.", "scenario", 16, [
    h("Common questions and professional responses (fictional)"),
    terms(("Role", "\"What exactly will I do?\" → Explain the confirmed responsibilities from the JD."),
          ("Salary", "\"Can you guarantee 8 LPA?\" → \"The approved range is up to 7 LPA. I'll share your expectation, but the final offer is decided by the company.\""),
          ("Location", "\"Can I work from Thane instead?\" → \"The role is based in Andheri. I'll check whether any flexibility exists and get back to you by tomorrow.\""),
          ("Shift", "\"Will nights be permanent?\" → Share the confirmed rotation; verify if unsure."),
          ("Work mode", "\"Is it hybrid?\" → State what the JD says; don't guess the number of office days."),
          ("Notice period", "\"I have 90 days.\" → Record it and check whether the client can accept it."),
          ("Interview", "\"How many rounds?\" → Share the confirmed process only."),
          ("Next steps", "\"When will I hear back?\" → Give a realistic timeline and follow up as promised.")),
    h("Never"),
    ul("Make false promises or guarantee selection.", "Invent salary figures or benefits.", "Share unverified company information.", "Argue with or pressure a candidate.", "Use disrespectful language."),
    h("Scenario"),
    ex("Mr. Suresh P. says: \"Another consultant said this company gives 40% hike. Is that true?\"", "Professional response: \"I can't confirm that. The approved range for this role is 4.5–5.5 LPA. If your expectation is higher, I'll share it with the hiring team, and they will decide.\""),
    note("When in doubt, say \"Let me verify that and get back to you\" — and record a follow-up so you actually do."),
]))

L.append(("Interview Scheduling and Coordination", "Practice: schedule, confirm and track fictional interviews accurately.", "practice", 20, [
    h("Scheduling steps"),
    steps(("Collect availability", "Ask for two or three suitable slots."),
          ("Confirm date and time", "Match with the interviewer's calendar."),
          ("Interview mode", "In person, video or phone."),
          ("Interviewer details", "Name and designation, if approved to share."),
          ("Location / meeting info", "Address and contact person, or the meeting link."),
          ("Send and record confirmation", "Written confirmation through the approved channel; log it."),
          ("Candidate acknowledgement", "Get a clear 'confirmed' from the candidate."),
          ("Reminders", "Day before and two hours before."),
          ("Rescheduling", "Offer new slots promptly; update the record."),
          ("Cancellation", "Inform both sides quickly, with a reason where appropriate.")),
    h("Exercise (fictional — no real calendar or invitations)"),
    ex("Situation", "Ms. Anjali T. (Inside Sales Executive) is free Wed 11 am or Thu 3 pm. The interviewer, Mr. Vikram (Sales Manager), is free only Thu 3–5 pm, video. Anjali confirms by message. On Wednesday evening she asks to move to Friday because of a family emergency; Vikram can do Friday 12 pm."),
    p("Fill these fields for the final schedule: Candidate, Role, Interview Date, Interview Time, Interview Mode, Interviewer, Confirmation Status, Candidate Response, Next Action."),
    answer("Model schedule record",
           ("Candidate", "Anjali T."),
           ("Role", "Inside Sales Executive"),
           ("Interview Date", "Friday (rescheduled from Thursday)"),
           ("Interview Time", "12:00 pm"),
           ("Interview Mode", "Video"),
           ("Interviewer", "Vikram — Sales Manager"),
           ("Confirmation Status", "Rescheduled and reconfirmed by both"),
           ("Candidate Response", "Requested reschedule (personal reason); confirmed Friday 12 pm"),
           ("Next Action", "Send updated link; reminder Friday 10 am; record outcome after interview")),
    note("Log every change with date and time. The interview record is the single source of truth for everyone involved."),
]))

L.append(("Interview Follow-Up and Candidate Status Communication", "Keeping candidates informed after interviews without promising outcomes.", "text", 15, [
    h("After the interview"),
    ul("Call the candidate the same day: how did it go, any concerns?", "Request feedback from the interviewer within the agreed time.", "Update the record with both sides' feedback."),
    h("Status communication"),
    terms(("Pending feedback", "\"The panel is still reviewing. I expect an update by Thursday and will call you then.\""),
          ("Feedback follow-up", "Chase the interviewer politely; tell the candidate if timelines move."),
          ("Selected", "Share only after authorised confirmation: \"I'm pleased to inform you the team has decided to move forward. HR will share offer details.\""),
          ("Rejected", "\"Thank you for your time. The team has decided not to proceed for this role. I'll keep your profile for suitable openings.\""),
          ("Offer stage", "Explain next steps and documents; do not quote numbers until the offer is approved.")),
    cmp("Before confirmation", "\"Feedback is awaited — I'll update you as soon as I hear.\"", "\"Don't worry, you're selected for sure.\"", "Say", "Never say"),
    h("Document and close professionally"),
    p("Record every status update with date and time. Close every candidate journey — selected or not — with a clear, respectful final message."),
    note("Never promise an outcome before it is confirmed by the authorised person."),
]))

L.append(("Complete Candidate Screening & Interview Workflow", "Practice: work through an end-to-end fictional scenario and make decisions.", "practice", 21, [
    h("Fictional scenario"),
    ex("JD requirement", "Role: Procurement Executive, fictional client 'Southline Components', Chennai (Ambattur), WFO, general shift, Mon–Sat. Mandatory: 2–5 yrs purchase in manufacturing, SAP MM. Preferred: Tamil. CTC up to 5.5 LPA. Notice ≤ 30 days."),
    ex("Candidate information", "Mr. Karthik V. (fictional), 3.5 yrs Purchase Executive at a fictional auto-parts maker, SAP MM daily (PO creation, vendor master), lives in Avadi, Tamil and English, expects 5.8 LPA, notice 45 days with possible early release."),
    h("Work through each stage"),
    ul("Screening — what will you confirm on the call?", "Screening decision — Match / Gap / Clarification for each requirement.", "Candidate communication — how do you handle the CTC and notice gaps?", "Interview scheduling — what do you record?", "Interview follow-up — what do you say while feedback is pending?", "Status update and next action."),
    answer("Model Evaluation",
           ("Purchase experience 2–5 yrs, manufacturing", "MATCH — 3.5 yrs at an auto-parts manufacturer."),
           ("SAP MM", "MATCH — describes daily PO creation and vendor master work."),
           ("Location Ambattur, WFO", "MATCH — Avadi is a short commute; confirm 6-day week is acceptable."),
           ("Tamil (preferred)", "MATCH."),
           ("CTC ≤ 5.5 LPA", "GAP — expects 5.8; share with hiring manager, no promise to candidate."),
           ("Notice ≤ 30 days", "CLARIFICATION REQUIRED — 45 days, early release possible; confirm in writing."),
           ("Decision", "Shortlist, flagged: CTC and notice need hiring-manager approval.")),
    answer("Model Workflow",
           ("Communication", "\"Your profile fits well. The approved range is up to 5.5 LPA; I'll share your 5.8 expectation with the team. Please check whether your company can release you within 30 days.\""),
           ("Submission", "Submit with evaluation notes and flagged items."),
           ("Scheduling", "Hiring manager approves; in-person interview Tue 11 am at Ambattur; written confirmation sent and acknowledged; reminder Mon evening."),
           ("Follow-up", "Same-day call to candidate; feedback chased next morning: \"The panel is reviewing; I'll update you by Thursday.\""),
           ("Status update", "Selected for HR round — communicated only after hiring-manager confirmation; record updated with date/time."),
           ("Next action", "Coordinate HR discussion; track notice-release confirmation.")),
    note("Every stage depends on the previous record being accurate. A missing note at screening becomes a surprise at offer stage."),
]))

assert len(L) == 8
rows = [dict(sort_order=i, title=t, description=d, content_type=c, estimated_minutes=m, is_required=True, status="active", content={"blocks": b})
        for i, (t, d, c, m, b) in enumerate(L, 1)]
if "--json" in sys.argv:
    print(json.dumps({"objectives": OBJECTIVES, "lessons": rows}))
else:
    q = lambda s: s.replace("'", "''")
    out = ["-- Module 4 content seed (idempotent). Generated by module4_content.py — do not hand-edit.",
           "update public.academy_modules set learning_objectives = array[%s]::text[] where module_number = 4;" % ", ".join("'" + q(o) + "'" for o in OBJECTIVES)]
    for r in rows:
        out.append(f"""insert into public.lessons (module_id, sort_order, title, description, content_type, estimated_minutes, is_required, status, content)
select id, {r['sort_order']}, '{q(r['title'])}', '{q(r['description'])}', '{r['content_type']}', {r['estimated_minutes']}, true, 'active', '{q(json.dumps(r['content'], ensure_ascii=False))}'::jsonb from public.academy_modules where module_number = 4
on conflict (module_id, sort_order) do update set title = excluded.title, description = excluded.description, content_type = excluded.content_type, estimated_minutes = excluded.estimated_minutes, is_required = true, status = 'active', content = excluded.content;""")
    print("\n".join(out))
