"""Module 3 content seed source. Run:
python3 supabase/seed/module3_content.py > supabase/seed/module3_lessons.sql
python3 supabase/seed/module3_content.py --json > /tmp/m3.json
"""
import json, sys

OBJECTIVES = [
    "Explain candidate sourcing.",
    "Identify appropriate candidate sourcing channels.",
    "Create a sourcing strategy from a recruitment requirement.",
    "Use basic Boolean search operators.",
    "Build useful recruitment search keywords.",
    "Evaluate basic candidate-profile relevance.",
    "Distinguish strong, partial and weak matches.",
    "Maintain accurate sourcing information.",
    "Prepare candidates for the screening stage.",
    "Create a structured candidate sourcing plan.",
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

L.append(("Introduction to Candidate Sourcing", "What sourcing is, active vs passive candidates and the recruiter's responsibility.", "text", 13, [
    h("What candidate sourcing means"),
    p("Sourcing is the work of finding people who may suit an open requirement and starting a conversation with them. It comes after you understand the JD and before you screen anyone."),
    h("Purpose of sourcing"),
    ul("Build a pool of relevant people for each requirement.", "Reach suitable candidates before competitors do.", "Give the screening stage good-quality profiles to work with."),
    h("Active vs passive candidates"),
    terms(("Active candidates", "Currently looking for a job — applying on portals, attending walk-ins, responding quickly."),
          ("Passive candidates", "Employed and not actively looking, but open to the right opportunity. They need a clear, respectful pitch and more follow-up.")),
    h("Why sourcing quality matters"),
    p("Ten relevant profiles are worth more than a hundred random ones. Poor sourcing wastes screening time, frustrates hiring managers and gives candidates a bad impression of the company."),
    h("Sourcing vs screening"),
    terms(("Sourcing", "Finding and attracting people who appear to match the requirement, based on available information."),
          ("Screening", "Speaking with the candidate to confirm skills, experience, availability and interest against the JD.")),
    h("Recruiter's responsibility during sourcing"),
    ul("Use only approved sources and follow each platform's terms of use.", "Respect candidate privacy; use contact details only for genuine opportunities.", "Record the source of every candidate.", "Describe the role accurately in the first message."),
    h("Practical example"),
    ex("Requirement: 4 Telecallers, Coimbatore, Tamil + English, 0–2 years", "A recruiter who understood the JD searches portals for 'telecaller' / 'tele sales' in Coimbatore, asks placed candidates for referrals, and plans a walk-in. A recruiter who skipped the JD searches 'sales' across Tamil Nadu and spends the day calling field-sales profiles from other cities."),
    note("Sourcing starts with the requirement, not with the search box. Decode the JD first (Module 2)."),
]))

blocks2 = [p("No single channel works for every role. Choose channels based on the role level, volume, location and urgency. This lesson is training only — always follow your company's approved tools and each platform's rules.")]
for c in [
    ("Job portals", "Websites where candidates post CVs and apply for jobs.", "Most volume and mid-level roles.", "Large pool, search filters, active candidates.", "Outdated CVs, duplicates, high competition.", "Mostly active candidates across levels."),
    ("Professional networks", "Online professional profile networks.", "Specialist, experienced or corporate roles.", "Detailed work history; reach passive talent.", "Lower response rates; message limits.", "Experienced and passive professionals."),
    ("Social media sourcing", "Posting or searching on social platforms and community groups.", "Volume hiring, local roles, younger audiences.", "Wide, fast reach; low cost.", "Less structured information; noise.", "Freshers, local and entry-level candidates."),
    ("Employee referrals", "Existing employees or placed candidates recommend people.", "Any role, especially hard-to-fill ones.", "Higher quality and retention; trust.", "Limited volume; risk of similar backgrounds.", "Candidates from employees' networks."),
    ("Internal databases", "Candidates already in the company's own records.", "Every requirement — check first.", "Fast, free, already known.", "Data may be old; needs re-confirmation.", "Past applicants and earlier-screened candidates."),
    ("Campus/college sourcing", "Hiring directly through colleges.", "Fresher and trainee programmes.", "Batch hiring; planned joining dates.", "Seasonal; no experience.", "Final-year students and fresh graduates."),
    ("Job fairs", "Multi-employer hiring events.", "Volume hiring and employer visibility.", "Meet many candidates in a day.", "Cost and effort; mixed relevance.", "Active job seekers, mostly entry to mid-level."),
    ("Recruitment events", "Company-run hiring days or drives.", "Urgent, high-volume requirements.", "Screen and interview on the same day.", "Needs planning and promotion.", "Local active candidates."),
    ("Walk-in recruitment", "Candidates come to the office at set times.", "BPO, retail, telecalling, support roles.", "Quick turnaround; immediate joiners.", "Unpredictable turnout; quality varies.", "Local, active, entry-level candidates."),
    ("Direct candidate outreach", "Contacting a specific person about a role.", "Niche or senior roles; passive candidates.", "Targeted; reaches people not applying.", "Time-consuming; must be respectful and relevant.", "Passive, experienced candidates."),
]:
    blocks2 += channel(*c)
blocks2.append(note("Start with the internal database and referrals, then add the channels that best fit the role level and volume."))
L.append(("Candidate Sourcing Channels", "Major sourcing channels, when to use them and their limits.", "text", 18, blocks2))

L.append(("Preparing a Sourcing Strategy", "Turning a requirement into a prioritised sourcing plan.", "scenario", 17, [
    h("Steps to build a strategy"),
    steps(("Understand the JD", "Read it fully and clarify gaps with the hiring manager."),
          ("Identify mandatory criteria", "Non-negotiables: core skill, minimum experience, location."),
          ("Identify preferred criteria", "Advantages that rank candidates higher."),
          ("Define the target profile", "One sentence describing the ideal candidate."),
          ("Decide channels", "Pick 2–4 channels that fit the role."),
          ("Define keywords", "Titles, skills and tools, plus their variations."),
          ("Define filters", "Location, experience range, qualification and skills."),
          ("Prioritise", "Fastest, highest-quality channels first."),
          ("Track results", "Count profiles found, contacted, interested and shortlisted per channel.")),
    h("Scenario"),
    ex("Requirement: 2 Java Developers, Pune (Kharadi), hybrid 3 days office, 3–6 years, Spring Boot mandatory, AWS preferred, up to 14 LPA, notice ≤ 45 days", "The recruiter writes the target profile: 'Pune-based Java backend developer, 3–6 years, Spring Boot and REST APIs, join within 45 days.'"),
    terms(("Mandatory", "Java, Spring Boot, 3–6 years, Pune or willing to relocate within 45 days."),
          ("Preferred", "AWS, microservices."),
          ("Keywords", "Java developer, Java engineer, backend developer, Spring Boot, REST API, microservices."),
          ("Filters", "Location Pune; experience 3–6 years; B.E./B.Tech/MCA."),
          ("Channel priority", "1. Internal database  2. Job portal search  3. Professional networks  4. Employee referrals."),
          ("Tracking", "Daily count per channel: found / contacted / interested / submitted.")),
    note("Review your tracker after two days. If a channel produces no interested candidates, change keywords or move effort to another channel."),
]))

L.append(("Search Keywords and Boolean Search Basics", "Using AND, OR, NOT, quotes and brackets to focus searches.", "text", 16, [
    p("Boolean search uses a few operators to combine keywords. Most job portals and databases support some form of it. Use it only within the features and terms each platform allows."),
    h("The operators"),
    terms(("AND", "Both terms must appear. Narrows the search. Example: Java AND \"Spring Boot\"."),
          ("OR", "Either term may appear. Broadens the search — useful for title variations. Example: Java OR Python."),
          ("NOT", "Excludes a term. Example: developer NOT tester."),
          ("\"Exact phrase\"", "Searches the words together in that order. Example: \"software developer\"."),
          ("Parentheses ( )", "Group terms so OR is evaluated first. Example: (\"software developer\" OR \"software engineer\") AND Java.")),
    h("Basic combinations"),
    ex("\"software developer\" AND Java", "Profiles that mention the exact title and Java."),
    ex("(\"software developer\" OR \"software engineer\") AND Java", "Covers both common titles, but still requires Java."),
    ex("(telecaller OR \"tele sales\" OR \"telesales\") AND (Tamil OR Kannada)", "Volume-hiring search for language-specific telecalling roles."),
    ex("(\"accounts executive\" OR accountant) AND Tally AND GST NOT intern", "Accounts profiles with Tally and GST, excluding internships."),
    h("Narrow vs broaden"),
    cmp("Adjusting results", "Too many results: add AND terms, use exact phrases, add NOT for unrelated roles.", "Too few results: add OR variations, remove preferred skills, widen location.", "Narrow", "Broaden"),
    note("Do not use NOT too aggressively — 'NOT testing' would also remove good developers who mention unit testing."),
]))

L.append(("Candidate Search and Profile Relevance", "Judging whether a sourced profile is a strong, partial or weak match.", "scenario", 15, [
    h("What to check on each profile"),
    ul("Job title relevance — does the actual work match?", "Skills match — mandatory skills present?", "Experience match — relevant years within range?", "Qualification", "Industry/domain", "Location and willingness to relocate", "Work mode fit", "Notice period", "Career continuity where relevant — note gaps neutrally and ask, never assume", "Any requirement-specific criteria (language, shift, licence)"),
    h("Match levels"),
    terms(("Strong match", "Meets all mandatory criteria and most preferred ones. Contact first."),
          ("Partial match", "Meets most mandatory criteria; one gap that may be acceptable (e.g. notice slightly longer). Contact and clarify."),
          ("Weak match", "Misses a core mandatory requirement. Do not submit; keep in the database for other roles.")),
    h("Examples (fictional training profiles)"),
    p("Requirement: Java Developer, Pune, 3–6 years, Spring Boot mandatory, AWS preferred, notice ≤ 45 days."),
    ex("Profile A — Strong", "Backend Developer, Pune, 4.5 years Java + Spring Boot, AWS exposure, 30-day notice."),
    ex("Profile B — Partial", "Software Engineer, Mumbai, 5 years Java + Spring Boot, open to relocation, 60-day notice (negotiable). Clarify relocation and notice before shortlisting."),
    ex("Profile C — Weak", "QA Engineer, Pune, 5 years, Selenium with Java scripting. Java appears, but the role is testing, not development."),
    note("A profile only shows what the candidate wrote. Relevance at sourcing stage is an estimate — screening confirms it."),
]))

L.append(("Sourcing Quality and Candidate Shortlisting Preparation", "Practice: compare several profiles against one requirement before screening.", "practice", 19, [
    h("Quality principles"),
    ul("Quality over quantity — submit fewer, better profiles.", "Avoid irrelevant profiles that only share a keyword.", "Check for duplicates in the internal database before contacting.", "Read all available information, not just the headline.", "Compare every profile with the JD criteria.", "Record the source for every candidate.", "Maintain ownership — one recruiter owns each candidate per requirement.", "Prepare notes and questions for the screening call.", "Do not assume — if information is missing, mark it 'to confirm'."),
    h("Exercise"),
    ex("Requirement: Customer Support Executive (Voice), Bengaluru, WFO, rotational shift, Hindi + English, 0–2 years, immediate to 15 days", "Rate each fictional profile as Strong, Partial or Weak and note what to confirm on the screening call."),
    terms(("Profile 1", "Customer Care Executive, Bengaluru, 1.5 yrs domestic voice, Hindi + English, serving notice (10 days)."),
          ("Profile 2", "Fresher, B.Com 2024, Bengaluru, Hindi + English, no shift preference stated."),
          ("Profile 3", "Chat Support Associate, Mysuru, 2 yrs non-voice, Kannada + English."),
          ("Profile 4", "Customer Care Executive, Bengaluru, 1.5 yrs — same phone number as Profile 1 under a different email.")),
    answer("Model evaluation",
           ("Profile 1 — Strong", "All mandatory criteria met. Confirm comfort with rotational shifts."),
           ("Profile 2 — Partial", "0–2 years allows freshers; confirm rotational shift acceptance and spoken English level."),
           ("Profile 3 — Weak", "No Hindi, non-voice experience and outside Bengaluru. Keep for chat/Kannada roles."),
           ("Profile 4 — Duplicate", "Same person as Profile 1. Merge records; do not contact twice or submit twice.")),
    note("Duplicates submitted to a client damage credibility. Always search your database by phone and email before outreach."),
]))

L.append(("Candidate Sourcing Documentation and Tracking", "What to record during sourcing and why accurate records matter.", "text", 14, [
    h("What to record"),
    terms(("Candidate name", "As the candidate gives it."),
          ("Candidate ID", "Internal reference where applicable."),
          ("Source", "Exact channel — portal, referral (with referrer), walk-in, database."),
          ("Requirement", "Which opening the candidate is considered for."),
          ("Recruiter ownership", "Who owns the candidate for this requirement."),
          ("Contact status", "Not contacted / contacted / no response / call back."),
          ("Initial response", "Interested, not interested (with reason), considering."),
          ("Relevant skills", "Skills confirmed against the JD."),
          ("Experience", "Total and relevant, separately."),
          ("Follow-up action", "Next step and due date."),
          ("Candidate status", "Sourced, screening scheduled, shortlisted, rejected, on hold."),
          ("Notes", "Facts only: notice period, CTC expectation, location preference."),
          ("Date/time", "When each important action happened.")),
    h("Why accuracy matters"),
    ul("Prevents duplicate calls and ownership disputes.", "Lets any team member pick up a follow-up.", "Shows which channels actually work.", "Supports audits and client reporting."),
    cmp("Writing notes", "'Expects 6 LPA; 30-day notice; prefers Whitefield; call back Thu 4 pm.'", "'Good guy, seems keen, call later.'", "Factual", "Vague"),
    note("Never record passwords, login details or unnecessary personal data. Store only what the recruitment process needs."),
]))

L.append(("Build a Candidate Sourcing Plan", "Practice: prepare a complete sourcing plan, then review the model plan.", "practice", 20, [
    h("The requirement (original training example)"),
    ex("Email from the hiring manager", "We need 3 Field Sales Executives for our FMCG distribution business in Hyderabad (Secunderabad and Kukatpally beats). Office reporting at 9 am, then field visits to retailers, 6 days a week. Graduates preferred, 12th pass acceptable with experience. 1–4 years in FMCG or beverages field sales is a must. Own two-wheeler with valid licence is mandatory. Telugu and Hindi needed. Salary up to 3.6 LPA plus incentives and petrol allowance. Need joiners within 15 days."),
    h("Exercise — prepare these 10 items"),
    ul("1. Candidate profile", "2. Mandatory requirements", "3. Preferred requirements", "4. Search keywords", "5. Boolean search string", "6. Recommended sourcing channels", "7. Target candidate profile", "8. Initial relevance criteria", "9. Candidate information to capture", "10. Follow-up preparation"),
    answer("Model Sourcing Plan",
           ("1. Candidate profile", "Field Sales Executive, FMCG, Hyderabad, 1–4 years, 3 openings."),
           ("2. Mandatory requirements", "1–4 yrs FMCG/beverage field sales; own two-wheeler + licence; Telugu and Hindi; Hyderabad-based; join ≤ 15 days; 12th pass minimum."),
           ("3. Preferred requirements", "Graduate; experience on Secunderabad or Kukatpally beats; existing retailer network."),
           ("4. Search keywords", "field sales, sales executive, sales officer, territory sales, FMCG, beverages, distribution, retail sales, beat."),
           ("5. Boolean search string", "(\"field sales\" OR \"sales executive\" OR \"sales officer\" OR \"territory sales\") AND (FMCG OR beverages OR distribution) NOT (\"inside sales\" OR telecaller)"),
           ("6. Recommended channels", "Internal database; job portals filtered to Hyderabad; referrals from current field staff; local social media job groups; walk-in drive if volume is low."),
           ("7. Target candidate profile", "Hyderabad-based FMCG field salesperson with 1–4 years, own bike, fluent Telugu and Hindi, able to join in 15 days."),
           ("8. Initial relevance criteria", "Strong: all mandatory met. Partial: one clarifiable gap (e.g. 20-day notice). Weak: no FMCG field experience or no two-wheeler."),
           ("9. Information to capture", "Name, source, current area, experience (total/FMCG), current company, two-wheeler and licence, languages, notice period, CTC expectation, contact status, next action."),
           ("10. Follow-up preparation", "Script for first call; list of questions to confirm (licence, beat familiarity, 6-day week); follow-up within 24 hours; daily channel tracker.")),
    note("This plan becomes your screening checklist in Module 4. Share it with the hiring manager before you start calling."),
]))

assert len(L) == 8
rows = [dict(sort_order=i, title=t, description=d, content_type=c, estimated_minutes=m, is_required=True, status="active", content={"blocks": b})
        for i, (t, d, c, m, b) in enumerate(L, 1)]
if "--json" in sys.argv:
    print(json.dumps({"objectives": OBJECTIVES, "lessons": rows}))
else:
    q = lambda s: s.replace("'", "''")
    out = ["-- Module 3 content seed (idempotent). Generated by module3_content.py — do not hand-edit.",
           "update public.academy_modules set learning_objectives = array[%s]::text[] where module_number = 3;" % ", ".join("'" + q(o) + "'" for o in OBJECTIVES)]
    for r in rows:
        out.append(f"""insert into public.lessons (module_id, sort_order, title, description, content_type, estimated_minutes, is_required, status, content)
select id, {r['sort_order']}, '{q(r['title'])}', '{q(r['description'])}', '{r['content_type']}', {r['estimated_minutes']}, true, 'active', '{q(json.dumps(r['content'], ensure_ascii=False))}'::jsonb from public.academy_modules where module_number = 3
on conflict (module_id, sort_order) do update set title = excluded.title, description = excluded.description, content_type = excluded.content_type, estimated_minutes = excluded.estimated_minutes, is_required = true, status = 'active', content = excluded.content;""")
    print("\n".join(out))
