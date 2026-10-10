"""Generates supabase/seed/module2_lessons.sql (idempotent Module 2 content seed).
Run: python3 supabase/seed/module2_content.py > supabase/seed/module2_lessons.sql
"""
import json

OBJECTIVES = [
    "Explain the purpose of a Job Description.",
    "Identify the important sections of a JD.",
    "Understand job titles and actual role responsibilities.",
    "Separate mandatory requirements from preferred requirements.",
    "Identify required qualifications and skills.",
    "Evaluate experience requirements.",
    "Understand location, work mode and shift requirements.",
    "Convert a JD into a structured candidate profile.",
    "Identify important screening points before sourcing.",
    "Ask for clarification when a recruitment requirement is unclear.",
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

L = []

L.append(("Introduction to Job Descriptions", "What a JD is, why it matters and how to read one before sourcing.", "text", 12, [
    h("What is a Job Description?"),
    p("A Job Description (JD) is the written requirement from the client or hiring manager. It explains what the role is, what the person will do and what the person must bring. For a recruiter, the JD is the starting point of every search."),
    h("Purpose of a JD"),
    ul("Defines the role and its responsibilities.", "States the skills, qualification and experience required.", "Sets conditions such as location, work mode, shift and salary range.", "Gives the recruiter and the hiring team one shared reference."),
    h("Why recruiters must understand a JD before sourcing"),
    p("If you source before you understand the requirement, you send unsuitable profiles, waste the candidate's time and lose the hiring manager's trust. Ten minutes spent decoding the JD saves hours of wrong calls."),
    h("Main sections of a JD"),
    terms(("Job title", "The name of the position, e.g. Inside Sales Executive."),
          ("About the role / summary", "One or two lines on why the role exists."),
          ("Responsibilities", "The actual day-to-day work."),
          ("Requirements", "Qualification, skills and experience — usually split into must-have and preferred."),
          ("Job details", "Location, work mode, shift, CTC range, notice period, number of openings."),
          ("About the company", "Context you can use when pitching the role.")),
    h("Example JD"),
    ex("Sample JD — Inside Sales Executive (original training example)", "Location: Bengaluru (Whitefield), work from office, day shift 9:30–6:30. Openings: 3. Responsibilities: call inbound and outbound leads for a B2B software product, qualify prospects, book demos for the field team, update the CRM daily. Must have: graduate in any discipline, 1–3 years of B2B inside sales or telesales, fluent English and Kannada or Hindi. Preferred: CRM experience (Zoho or Salesforce), SaaS selling exposure. CTC: up to 4.5 LPA fixed plus incentives. Notice period: immediate to 30 days."),
    terms(("Title", "Inside Sales Executive — a phone-based sales role, not field sales."),
          ("Responsibilities", "Lead qualification and demo booking; the person does not close large deals."),
          ("Must have", "Graduate, 1–3 years B2B inside/telesales, English plus Kannada or Hindi."),
          ("Preferred", "CRM tools and SaaS exposure — useful, but not a reason to reject."),
          ("Job details", "Bengaluru office, day shift, 3 openings, up to 4.5 LPA, join within 30 days.")),
    h("Job title vs actual responsibilities"),
    p("Titles are short labels; responsibilities describe the real work. Always read the responsibilities before deciding which candidates fit."),
    h("Mandatory vs preferred"),
    cmp("How to treat requirements", "Mandatory: the candidate must meet it. Missing it usually means the profile is not suitable.", "Preferred: an advantage. A candidate without it can still be shortlisted.", "Mandatory", "Preferred"),
    h("How a recruiter should read a JD"),
    steps(("Read it fully once", "Do not stop at the title."),
          ("Mark the must-haves", "Underline qualification, core skills and minimum experience."),
          ("Mark the conditions", "Location, work mode, shift, CTC, notice period, openings."),
          ("List what is unclear", "Anything vague becomes a question for the hiring manager."),
          ("Summarise in one line", "e.g. 'Graduate with 1–3 yrs B2B telesales, Bengaluru office, join in 30 days.'")),
    note("If you cannot summarise the requirement in one sentence, you are not ready to source yet."),
]))

L.append(("Understanding Job Titles and Roles", "Titles, roles, seniority and why the same job appears under different names.", "text", 14, [
    h("Key terms"),
    terms(("Job title", "The label on the JD or offer letter."),
          ("Role", "The work the person actually does."),
          ("Department", "The team the role sits in — Sales, Engineering, HR, Support."),
          ("Seniority", "Level in the hierarchy: executive, senior executive, lead, manager."),
          ("Experience level", "Years and depth of relevant work expected for the role.")),
    h("Common title variations"),
    p("Companies name the same work differently. Search for all common variations, not just the title on the JD."),
    terms(("Software Developer / Software Engineer", "Usually the same work: writing, testing and maintaining code. Check the tech stack, not the word 'developer' or 'engineer'."),
          ("Business Development Executive / Sales Executive", "Both sell. BDE roles often focus on finding new clients; Sales Executive may handle existing accounts or walk-in sales."),
          ("HR Recruiter / Talent Acquisition Executive", "Both source and screen candidates. 'Talent Acquisition' is often used in corporates; the daily work is similar."),
          ("Customer Support Executive", "May also appear as Customer Service Associate, Customer Care Executive or Process Associate (voice/non-voice).")),
    h("Why the same role has different titles"),
    ul("Company size — a startup 'Manager' may equal a large company 'Senior Executive'.", "Industry habits — BPOs use 'Associate', IT uses 'Engineer'.", "Internal grading systems.", "Titles used to attract candidates."),
    h("Understanding the work behind a title"),
    ex("Scenario", "A JD says 'Business Development Executive', but the responsibilities are: answer inbound queries, explain course fees to students on the phone, enrol them. The real role is inbound telesales/counselling. Searching only for 'BDE' with field-sales experience would bring the wrong profiles."),
    cmp("Title-only vs responsibility-based sourcing", "Search by the work: 'inbound calls', 'counselling', 'enrolment', plus title variations.", "Search only for the exact title 'Business Development Executive'.", "Do", "Avoid"),
    note("Never shortlist or reject on title alone. Ask the candidate what they did day to day and compare it with the JD responsibilities."),
]))

L.append(("Decoding Skills and Qualifications", "Separating qualifications and skills into must-have and good-to-have.", "scenario", 18, [
    h("What to identify in every JD"),
    terms(("Educational qualification", "Degree or diploma required, e.g. B.Com, B.E./B.Tech, any graduate."),
          ("Technical skills", "Tools or technologies, e.g. Java, Tally, Excel, SAP MM."),
          ("Functional skills", "Job knowledge, e.g. accounts payable, vendor negotiation, lead qualification."),
          ("Soft skills", "Communication, language fluency, customer handling, teamwork."),
          ("Certifications", "Formal certificates, e.g. AWS Certified, CA Inter, Six Sigma Green Belt."),
          ("Experience", "Minimum years of relevant work."),
          ("Industry/domain experience", "Background in a specific sector, e.g. manufacturing, BFSI, healthcare.")),
    h("Must have vs good to have"),
    cmp("Read the wording carefully", "Must have: 'required', 'mandatory', 'must', 'minimum', 'should have'.", "Good to have: 'preferred', 'plus', 'added advantage', 'nice to have', 'exposure to'.", "Must have", "Good to have"),
    h("Scenario JD — Accounts Executive (original training example)"),
    ex("JD extract", "B.Com or M.Com required. 2–4 years in accounts payable / receivable. Must be hands-on with Tally Prime and GST filing. Advanced Excel (VLOOKUP, pivot tables) required. SAP FICO exposure is an added advantage. Manufacturing industry background preferred. Good written English."),
    terms(("Qualification (must)", "B.Com or M.Com."),
          ("Experience (must)", "2–4 years AP/AR."),
          ("Technical (must)", "Tally Prime, GST filing, advanced Excel."),
          ("Technical (preferred)", "SAP FICO."),
          ("Domain (preferred)", "Manufacturing."),
          ("Soft skill", "Good written English — confirm with the hiring manager how strictly this is assessed.")),
    h("How to use this"),
    steps(("Build your search", "Use must-haves as search keywords: 'Tally Prime', 'GST', 'accounts payable'."),
          ("Screen", "Confirm every must-have on the call; do not assume from the CV."),
          ("Rank", "Candidates with preferred skills move higher, but are not the only ones shortlisted.")),
    note("If a JD lists ten 'mandatory' skills, ask the hiring manager which three are truly non-negotiable. Very long must-have lists often hide a few real priorities."),
]))

L.append(("Understanding Experience Requirements", "Total vs relevant experience, levels, gaps and availability.", "scenario", 16, [
    h("Types of experience"),
    terms(("Total experience", "All years of work, in any role."),
          ("Relevant experience", "Years doing work that matches this JD."),
          ("Industry experience", "Years in the same sector as the client."),
          ("Role-specific experience", "Years in the same function and level, e.g. 'team lead in voice process'.")),
    h("Experience levels"),
    terms(("Fresher", "No full-time work experience; internships may count."),
          ("Entry-level", "Around 0–2 years."),
          ("Mid-level", "Around 3–7 years, works independently."),
          ("Senior-level", "Around 8+ years, leads people or complex work.")),
    p("Ranges vary by company — always follow the range written in the JD."),
    h("Other factors to check"),
    terms(("Career gaps", "Ask politely and neutrally for the reason; a gap is not automatically a rejection. Record facts, not opinions."),
          ("Notice period", "How long before the candidate can join."),
          ("Current employment status", "Employed, serving notice, or currently not working — affects joining date.")),
    h("Comparing candidate experience with the JD"),
    ex("Scenario 1", "JD: 3–5 years Java backend development. Candidate: 6 years total — 2 years manual testing, 4 years Java backend. Relevant experience is 4 years — a match, even though total is 6."),
    ex("Scenario 2", "JD: 2+ years customer support in international voice process. Candidate: 3 years domestic chat support. Total experience fits, but relevant experience (international voice) is zero — not a match unless the hiring manager agrees."),
    ex("Scenario 3", "JD: 1–3 years. Candidate: 5 years. Over-experience can mean salary mismatch or quick attrition. Check expectations before shortlisting and flag it to the hiring manager."),
    note("Always write relevant experience separately from total experience in your notes — hiring managers ask for it."),
]))

L.append(("Understanding Location, Work Mode and Shift", "How location, work mode, shift and travel affect who you source.", "text", 15, [
    h("Location terms"),
    terms(("Job location", "Where the employee will work, e.g. Pune — Hinjewadi."),
          ("Candidate location", "Where the candidate lives now."),
          ("Local candidate", "Already living within commuting distance."),
          ("Relocation", "Candidate is willing to move; confirm timeline and whether support is offered."),
          ("Joining location", "Where the candidate reports on day one — can differ from the posting location for training.")),
    h("Work mode"),
    terms(("Work from office", "Full-time at the client location."),
          ("Hybrid", "Mix of office and home — confirm the number of office days."),
          ("Remote", "Fully from home — confirm laptop, internet and any state/country limits.")),
    h("Shifts"),
    terms(("Day shift", "Standard daytime hours."),
          ("Night shift", "Often for US/UK processes; check transport and allowances."),
          ("Rotational shift", "Timings change weekly or monthly; candidate must be flexible."),
          ("Travel requirement", "Percentage of time on the road or at client sites.")),
    h("How these affect sourcing"),
    ul("Filter searches by location and nearby areas first.", "State work mode and shift in your first message to save time.", "Night or rotational shifts reduce the pool — start sourcing earlier.", "For relocation, confirm the candidate's real willingness, not just 'open to relocate' on a portal."),
    h("Recruiter scenarios"),
    ex("Scenario 1", "Role: Hyderabad, WFO, rotational shift. A strong candidate in Vijayawada says 'I can relocate'. Ask when, whether they have arranged accommodation, and confirm they accept rotational shifts before shortlisting."),
    ex("Scenario 2", "JD says 'Hybrid'. The candidate asks how many days in office. If the JD does not say, do not guess — check with the hiring manager and reply."),
    note("Most early drop-outs come from location, shift or work-mode surprises. Confirm all three on the first call."),
]))

L.append(("Salary, Notice Period and Other Candidate Requirements", "CTC, availability, eligibility and communicating requirements accurately.", "text", 17, [
    h("Compensation terms"),
    terms(("CTC", "Cost to Company — total yearly cost including fixed pay, variable pay and benefits."),
          ("Expected salary", "What the candidate wants for the new role."),
          ("Current salary", "Ask only when relevant to the role and allowed by company policy and applicable law; record it accurately and keep it confidential."),
          ("Fixed vs variable", "Clarify how much of the CTC is guaranteed.")),
    h("Availability"),
    terms(("Notice period", "Time the candidate must serve at their current employer."),
          ("Immediate joiner", "Can join within a few days."),
          ("Joining timeline", "The client's target start date."),
          ("Availability", "When the candidate can attend interviews.")),
    h("Eligibility and other requirements"),
    ul("Work authorisation or eligibility where applicable (e.g. right to work in a country).", "Documents needed for background verification.", "Role-specific needs: two-wheeler and licence for field roles, a language test, a typing speed.", "Willingness for night shift or travel."),
    h("Practical examples"),
    ex("Example 1", "JD: up to 6 LPA. Candidate expects 7.5 LPA. Do not say 'that should be fine'. Say: 'The approved range is up to 6 LPA. I will share your expectation with the hiring team, but I cannot confirm any number.'"),
    ex("Example 2", "Client needs joining within 15 days. Candidate has a 60-day notice with no buyout. Record it and inform the hiring manager before scheduling — do not hide it to fill the slot."),
    h("Avoid unauthorised promises"),
    cmp("What you say to candidates", "'The final offer depends on the interview outcome and the hiring team's approval.'", "'You will definitely get 30% hike' or 'the job is confirmed'.", "Say", "Never say"),
    note("Only the employer can make an offer. Your role is to communicate confirmed information accurately and record what the candidate tells you."),
]))

L.append(("JD Decoding: Mandatory vs Preferred", "Practice exercise: decode a sample JD, then review the correct interpretation.", "practice", 20, [
    h("Exercise instructions"),
    p("Read the JD below. On paper or in a notepad, identify each item in the checklist. When you have finished, open the correct interpretation and compare."),
    ex("Sample JD — Customer Support Associate, International Voice (original training example)", "Company: a travel-services client of E2E Procurement. Openings: 10. Location: Noida Sector 62, work from office. Shift: rotational night shifts (US hours), 5 days a week, two rotational offs. Responsibilities: handle inbound calls from US customers about bookings, changes and refunds; resolve queries using the internal tool; log every call. Requirements: graduate or undergraduate with at least 6 months of international voice experience; excellent spoken English with neutral accent; comfortable with night shifts. Preferred: travel or airline process experience; basic computer skills and typing 25+ WPM. Salary: 3.0–4.2 LPA plus night-shift allowance and cab facility. Notice period: immediate joiners preferred, up to 15 days acceptable."),
    h("Checklist — identify these"),
    ul("Job title", "Required qualification", "Mandatory skills", "Preferred skills", "Required experience", "Location", "Work mode", "Shift", "Salary information", "Notice period", "Number of openings", "Key candidate profile"),
    answer("Correct interpretation",
           ("Job title", "Customer Support Associate — International Voice."),
           ("Required qualification", "Graduate or undergraduate (undergraduates accepted)."),
           ("Mandatory skills", "Excellent spoken English with neutral accent; willingness for night shifts."),
           ("Preferred skills", "Travel/airline process experience; basic computer skills; typing 25+ WPM."),
           ("Required experience", "Minimum 6 months of international voice — domestic voice or chat does not count."),
           ("Location", "Noida Sector 62."),
           ("Work mode", "Work from office."),
           ("Shift", "Rotational night shifts, US hours, 5 days, rotational offs."),
           ("Salary information", "3.0–4.2 LPA plus night-shift allowance and cab."),
           ("Notice period", "Immediate preferred; maximum 15 days."),
           ("Number of openings", "10."),
           ("Key candidate profile", "Delhi-NCR based communicator with 6+ months international voice, fluent English, ready for night shifts and able to join within 15 days.")),
    note("Common mistakes: treating 'travel process experience' as mandatory, and counting domestic chat experience as international voice."),
]))

L.append(("Convert a JD into a Candidate Profile", "Practice exercise: turn a requirement into a structured profile for sourcing and screening.", "practice", 19, [
    h("Why build a candidate profile"),
    p("A candidate profile is a one-page summary of the ideal candidate. It becomes your search brief while sourcing and your checklist while screening, so every recruiter on the requirement looks for the same person."),
    h("The requirement (original training example)"),
    ex("Email from the hiring manager", "We need 2 Procurement Executives for our Chennai (Guindy) plant, office-based, general shift 9–6, Monday to Saturday. They will raise purchase orders in SAP, follow up with vendors on delivery, compare quotations and maintain vendor records. Engineering diploma or any graduate is fine. Need 2–5 years in procurement or purchase in a manufacturing company — SAP MM is a must. Knowledge of Tamil helps with local vendors. Budget is up to 5.5 LPA. We need people within 30 days."),
    h("Exercise"),
    p("Using the email, fill in the 14 fields below. Then open the model answer."),
    ul("1. Target job title", "2. Qualification", "3. Mandatory skills", "4. Preferred skills", "5. Experience", "6. Industry/domain", "7. Location", "8. Work mode", "9. Shift", "10. Salary/CTC", "11. Notice period", "12. Joining requirement", "13. Candidate source strategy", "14. Key screening points"),
    answer("Model candidate profile",
           ("1. Target job title", "Procurement Executive (search also: Purchase Executive, Buyer, Purchase Officer)."),
           ("2. Qualification", "Engineering diploma or any graduate."),
           ("3. Mandatory skills", "SAP MM (PO creation), vendor follow-up, quotation comparison, vendor record maintenance."),
           ("4. Preferred skills", "Tamil for local vendor communication."),
           ("5. Experience", "2–5 years relevant procurement/purchase experience."),
           ("6. Industry/domain", "Manufacturing — mandatory per the email."),
           ("7. Location", "Chennai, Guindy plant; prefer candidates in South/West Chennai."),
           ("8. Work mode", "Work from office."),
           ("9. Shift", "General shift 9–6, Monday to Saturday (6 days)."),
           ("10. Salary/CTC", "Up to 5.5 LPA."),
           ("11. Notice period", "Maximum 30 days."),
           ("12. Joining requirement", "Join within 30 days; 2 openings."),
           ("13. Candidate source strategy", "Job portals with keywords 'SAP MM' + 'purchase' + 'manufacturing' filtered to Chennai; professional networks; referrals from placed procurement candidates; internal database."),
           ("14. Key screening points", "Hands-on SAP MM (ask what transactions they use), manufacturing background, comfort with 6-day week, current location and commute to Guindy, notice period ≤30 days, CTC expectation within 5.5 LPA.")),
    h("Clarify before sourcing"),
    ul("Is Saturday a full working day?", "Is 5.5 LPA fixed or including variable?", "Would a trading-company buyer with strong SAP MM be considered?"),
    note("Share your profile with the hiring manager before sourcing. A 2-minute confirmation prevents a week of wrong submissions."),
]))

assert len(L) == 8
lines = ["-- Module 2 content seed (idempotent). Generated by module2_content.py — do not hand-edit.",

         "update public.academy_modules set learning_objectives = array[%s]::text[] where module_number = 2;" % ", ".join("'" + o.replace("'", "''") + "'" for o in OBJECTIVES)]
for i, (title, desc, ctype, mins, blocks) in enumerate(L, 1):
    content = json.dumps({"blocks": blocks}, ensure_ascii=False).replace("'", "''")
    t = title.replace("'", "''"); d = desc.replace("'", "''")
    lines.append(f"""insert into public.lessons (module_id, sort_order, title, description, content_type, estimated_minutes, is_required, status, content)
select id, {i}, '{t}', '{d}', '{ctype}', {mins}, true, 'active', '{content}'::jsonb from public.academy_modules where module_number = 2
on conflict (module_id, sort_order) do update set title = excluded.title, description = excluded.description, content_type = excluded.content_type, estimated_minutes = excluded.estimated_minutes, is_required = true, status = 'active', content = excluded.content;""")

print("\n".join(lines))

