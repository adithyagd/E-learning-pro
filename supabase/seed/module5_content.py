"""Module 5 content seed source. Run:
python3 supabase/seed/module5_content.py > supabase/seed/module5_lessons.sql
python3 supabase/seed/module5_content.py --json > /tmp/m5.json
All people, companies and records below are fictional training examples.
"""
import json, sys

OBJECTIVES = [
    "Maintain accurate candidate information and records.",
    "Handle resumes and recruitment documents professionally.",
    "Record candidate qualifications, skills and experience accurately.",
    "Track candidate source and recruiter ownership.",
    "Maintain factual recruiter notes and follow-up history.",
    "Identify and handle possible duplicate candidate records.",
    "Understand and correctly use recruitment pipeline stages.",
    "Track candidate progress and pending recruitment actions.",
    "Manage candidate follow-ups and status updates accurately.",
    "Coordinate recruitment activities from interview through joining.",
    "Maintain accurate recruitment documentation and daily reports.",
    "Manage recruiter priorities, pending actions and daily recruitment operations.",
]

A, B, C = "A. Candidate Management", "B. Recruitment Pipeline", "C. Recruitment Operations"

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

# ---------------- Section A ----------------
L.append((A, "Candidate Profile and Basic Information", "What a complete, accurate candidate record contains and why it matters.", "text", 15, [
    h("Why the candidate record matters"),
    p("Every decision in recruitment — screening, submission, interview, offer, joining — depends on the candidate record. An incomplete or wrong record causes missed calls, wrong submissions and lost candidates."),
    h("Basic information fields"),
    terms(("Candidate ID", "Unique identifier assigned when the record is created. Never reused, never changed."),
          ("Employee ID (where applicable)", "Assigned only after the candidate joins as an employee. Do not confuse it with the Candidate ID."),
          ("Name", "Full name as on the resume or ID proof. Check spelling with the candidate."),
          ("Email", "Primary contact email, verified by sending a confirmation."),
          ("Phone", "Primary mobile number with country code; note an alternate if provided."),
          ("Location", "Current city and area, plus willingness to relocate if relevant."),
          ("Joining date", "Recorded only when confirmed by the candidate and the client."),
          ("Designation", "Current or most recent job title."),
          ("Department", "Function the candidate works in, e.g. Procurement, Customer Support."),
          ("Candidate source", "Where the candidate came from, e.g. Employee Referral, Job Portal."),
          ("Ownership", "The recruiter responsible for the candidate's next action.")),
    h("Information, notes and status are different"),
    terms(("Candidate information", "Facts about the candidate: contact details, experience, skills, location. Changes rarely."),
          ("Recruiter notes", "Dated, factual record of conversations and observations, e.g. '12 Mar, 4:10 pm — confirmed 30-day notice.'"),
          ("Recruitment status", "The candidate's current stage, e.g. Screened or Interview Scheduled. Changes as the process moves.")),
    ex("Fictional record", "Candidate ID C-10482 · Ms. Nandini S. · nandini.s@example.com · +91 98XXXXXX21 · Pune (Hinjewadi) · Purchase Executive, Procurement · Source: Employee Referral · Owner: Recruiter Arjun M. · Status: Screened."),
    h("Updating information correctly"),
    ul("Update only after confirming with the candidate or a document.", "Change one field at a time and record why in a note.", "Never overwrite a phone or email without confirming the new one works.", "Keep records complete — a missing field becomes a missed action later."),
    note("If information is not confirmed, leave it blank and add a follow-up action. A blank field is better than a guessed one."),
]))

L.append((A, "Resume and Document Handling", "Collect, organise and protect candidate documents professionally.", "text", 15, [
    h("Collecting resumes and documents"),
    p("Ask for the latest resume in a standard format. At later stages, collect only the documents the process needs (e.g. relieving letter, ID proof at joining)."),
    steps(("Collect", "Request the current resume; confirm it is the latest version."),
          ("Check completeness", "Contact details, experience dates, education, current role all present."),
          ("Associate correctly", "Attach the document to the correct Candidate ID — check name and phone before saving."),
          ("Name clearly", "Use a consistent format."),
          ("Keep current", "Replace outdated versions; keep a note of when the update was received.")),
    cmp("Document naming",
        "C-10482_Nandini_S_Resume_2026-03.pdf",
        "resume final new (2).pdf", "Clear", "Unclear"),
    h("Avoid duplicates and information loss"),
    ul("Do not attach the same resume twice to one record.", "Do not attach a resume to a different candidate with a similar name.", "Before replacing a document, confirm the new one is complete.", "Never delete a document without recording the reason."),
    h("Protecting candidate information"),
    ul("Share resumes only with authorised people for the specific requirement.", "Do not forward candidate documents to personal email or chat groups.", "Do not download documents to shared or public computers.", "Mask ID numbers when they are not needed."),
    note("Candidate documents contain personal data. Handling them carelessly damages trust and may break company policy."),
]))

L.append((A, "Candidate Skills, Qualification and Experience", "Scenario: compare candidate details against a requirement and spot gaps.", "scenario", 18, [
    h("What to capture"),
    terms(("Qualification", "Highest relevant education, institution and year."),
          ("Skills", "Tools and abilities with evidence of use, e.g. 'SAP MM — daily PO creation'."),
          ("Total experience", "All work experience, in years and months."),
          ("Relevant / role-specific experience", "Experience doing the work the requirement asks for."),
          ("Location", "Current location and commute or relocation fit."),
          ("Notice period", "Official notice, any buyout or early-release possibility."),
          ("Candidate expectations", "Expected CTC, work mode, shift preferences.")),
    p("Compare each requirement point with the candidate's information and classify it as Matched, Missing or Requires clarification."),
    h("Fictional scenario"),
    ex("Requirement", "Accounts Payable Executive, fictional client 'Meridian Logistics', Hyderabad (Gachibowli), WFO. B.Com mandatory, 2–4 yrs AP experience, Tally or SAP FICO, notice ≤ 30 days, CTC up to 4.8 LPA."),
    ex("Candidate (fictional)", "Mr. Rahul K., B.Com 2020, 4 yrs 2 months total experience — 1 yr sales coordination, then 3 yrs 2 months AP at a fictional distribution firm. Uses Tally daily. Lives in Kukatpally. Notice: 'around a month'. CTC expectation not shared."),
    p("Identify matched information, missing information and information requiring clarification before reading the model answer."),
    answer("Model Analysis",
           ("Matched", "B.Com; 3 yrs 2 months relevant AP experience (within 2–4); Tally; Hyderabad location."),
           ("Missing", "Expected CTC; current CTC; whether he has worked with vendor reconciliation."),
           ("Requires clarification", "Notice period ('around a month' — confirm exact days and buyout); commute from Kukatpally to Gachibowli for WFO."),
           ("Note on experience", "Total 4.2 yrs but relevant is 3.2 yrs — record both separately.")),
]))

L.append((A, "Candidate Source, Ownership and Recruiter Notes", "Practice: record source, ownership and factual notes correctly.", "practice", 18, [
    h("Candidate sources"),
    terms(("Job Portal", "Candidate found or applied via a job board."),
          ("Professional Network", "Found through a professional networking platform."),
          ("Employee Referral", "Referred by a current employee — record the referrer."),
          ("Consultant", "Submitted by a partner recruitment consultant."),
          ("Campus", "Sourced through a college placement drive."),
          ("Job Fair", "Met at a recruitment fair or event."),
          ("Walk-in", "Attended a walk-in drive in person."),
          ("Direct Application", "Applied directly through the company's careers channel."),
          ("Internal Source", "Existing database or an internal employee moving roles.")),
    p("Source tracking shows which channels bring suitable candidates and prevents disputes about who introduced a candidate."),
    h("Ownership"),
    p("The owner is the recruiter accountable for the candidate's next action. Ownership changes only with a recorded handover."),
    h("Recruiter notes and follow-up history"),
    ul("Write facts: what was said, agreed and pending.", "Include date and time of every note.", "End each note with a next action and due date.", "Keep follow-up history complete — every call attempt counts."),
    cmp("Writing a note",
        "14 Mar, 11:20 am — Spoke to candidate. Interested. Notice 30 days, early release possible. Expected CTC 5 LPA. Next: share JD by email today; follow up 15 Mar 5 pm.",
        "Candidate seemed arrogant, probably won't join. Call later.", "Factual", "Subjective"),
    note("Never record opinions about appearance, age, gender, religion, caste, accent or personal life. Notes may be read by clients, managers and auditors."),
    h("Practice exercise"),
    ex("Fictional situation", "On 18 Mar at 3:45 pm, Recruiter Priya D. calls Ms. Farah A., who was referred by employee Sanjay P. Farah is interested in the Inside Sales role, currently in Noida, notice 60 days (negotiable to 45), expects 4.5 LPA, and asks for the JD on email. She can talk again on 20 Mar after 6 pm."),
    p("Write the source, owner, note and next action for this candidate."),
    answer("Model Record",
           ("Source", "Employee Referral — referrer: Sanjay P."),
           ("Owner", "Priya D."),
           ("Note", "18 Mar, 3:45 pm — Spoke to candidate. Interested in Inside Sales. Location Noida. Notice 60 days, negotiable to 45. Expected CTC 4.5 LPA. Requested JD by email."),
           ("Next action", "Send JD by email on 18 Mar."),
           ("Next follow-up", "20 Mar after 6 pm — confirm interest after JD review and notice negotiation.")),
]))

L.append((A, "Duplicate Handling and Accurate Candidate Records", "Scenario: identify possible duplicates without losing or overwriting information.", "scenario", 17, [
    h("Why duplicates are a problem"),
    p("Duplicate records split history across two places, cause two recruiters to call the same candidate, and can lead to the same candidate being submitted twice to a client."),
    h("How to check"),
    steps(("Candidate ID", "Search the ID first if the candidate already has one."),
          ("Email", "Exact email match is a strong indicator."),
          ("Phone", "Exact phone match is a strong indicator; numbers can change, so confirm."),
          ("Name", "Similar names alone are weak — many people share names."),
          ("Resume information", "Compare employers, dates and education.")),
    h("Rules"),
    ul("Never merge or overwrite on a name match alone.", "Confirm identity with the candidate before combining information.", "Keep the older record's history; add new information, do not replace it.", "If unclear, escalate to your team lead with both Candidate IDs."),
    h("Fictional scenario"),
    ex("Existing record", "C-09811 · Mohammed Imran · imran.m@example.com · +91 97XXXXXX40 · Chennai · Last updated 8 months ago · Status: Not Interested."),
    ex("New profile received", "Md. Imran · imran.work@example.com · +91 97XXXXXX40 · Bengaluru · Resume shows the same previous employer and degree year as C-09811."),
    answer("Model Approach",
           ("Assessment", "Possible duplicate — same phone, same employer history and degree year; different email and city."),
           ("Action", "Call the candidate on the shared number and confirm identity, new email and relocation to Bengaluru."),
           ("Record update", "If confirmed, update C-09811: add new email and location with a dated note. Do not create a new record."),
           ("Status", "Move from Not Interested to the correct current stage only after the candidate confirms interest."),
           ("If unconfirmed", "Do not merge; escalate to the team lead with both details.")),
]))

# ---------------- Section B ----------------
L.append((B, "Recruitment Pipeline Stages", "The standard stages and statuses a candidate moves through.", "text", 18, [
    h("The pipeline"),
    p("Sourced → Contacted → Interested → Screened → Shortlisted → Interview Scheduled → Interview Attended → Selected → Offered → Offer Accepted → Joined"),
    steps(("Sourced", "Profile identified as potentially relevant; no contact yet."),
          ("Contacted", "Recruiter has reached out by call or message."),
          ("Interested", "Candidate has confirmed interest in the role."),
          ("Screened", "Screening call completed and evaluated against the requirement."),
          ("Shortlisted", "Profile approved for submission or interview."),
          ("Interview Scheduled", "Date, time and mode confirmed with candidate and interviewer."),
          ("Interview Attended", "Candidate attended — confirmed by interviewer or client."),
          ("Selected", "Authorised confirmation of selection received."),
          ("Offered", "Offer formally released to the candidate."),
          ("Offer Accepted", "Candidate has accepted the offer in writing."),
          ("Joined", "Candidate has actually reported and joined on the joining date.")),
    h("Additional statuses"),
    terms(("Rejected", "Not selected at screening or interview; record the stage and reason."),
          ("Not Interested", "Candidate declined the opportunity; record the reason if shared."),
          ("No Response", "Candidate did not respond after the agreed number of attempts."),
          ("On Hold", "Process paused — by client or candidate — with a review date."),
          ("Dropout", "Candidate withdrew after offer or before joining."),
          ("Absconded", "Candidate joined but stopped reporting without notice.")),
    note("Always keep the candidate at the correct current stage. The pipeline is only useful if it reflects what has actually happened."),
]))

L.append((B, "Tracking Candidate Progress and Pending Actions", "Practice: build a tracking record so no candidate is forgotten.", "practice", 20, [
    h("What to track"),
    terms(("Current status", "The candidate's actual stage today."),
          ("Last action", "What was last done and when."),
          ("Pending action", "What must happen next — follow-up, feedback, offer, joining confirmation."),
          ("Owner", "Who is responsible for the pending action."),
          ("Due date", "When the pending action must be completed."),
          ("Next follow-up", "Date and time of the next contact.")),
    p("Common pending actions: interview pending, feedback pending, offer pending, joining pending. Each must have an owner and a date."),
    h("Fictional tracking exercise"),
    ex("Situation (today is Mon 10 Mar)", "Recruiter Meera J. handles: (1) Mr. Aditya P. — interviewed Fri 7 Mar, client has not shared feedback. (2) Ms. Lakshmi V. — screened Sat 8 Mar, suitable, profile not yet sent to client. (3) Mr. Rohan T. — offer accepted, joining 17 Mar, documents not yet received."),
    p("Prepare the tracking record with all seven fields for each candidate."),
    answer("Model Tracking Record",
           ("Aditya P.", "Status: Interview Attended · Last: Interview 7 Mar · Pending: client feedback · Owner: Meera J. · Due: 10 Mar · Next follow-up: client today 12 pm; update candidate by 5 pm."),
           ("Lakshmi V.", "Status: Screened · Last: Screening call 8 Mar · Pending: submit profile for shortlisting · Owner: Meera J. · Due: 10 Mar · Next follow-up: inform candidate of submission today."),
           ("Rohan T.", "Status: Offer Accepted · Last: Acceptance received · Pending: joining documents · Owner: Meera J. · Due: 13 Mar · Next follow-up: call 11 Mar 11 am; joining reminder 16 Mar.")),
    note("A candidate without a next follow-up date is a candidate who will be forgotten."),
]))

L.append((B, "Status Updates and Pipeline Accuracy", "Scenario: decide the correct status for real-world situations.", "scenario", 18, [
    h("When to change status"),
    terms(("Contacted, no response", "Status: Contacted. Record each attempt; move to No Response only after the agreed attempts."),
          ("Candidate confirms interest", "Move to Interested."),
          ("Screening call completed", "Move to Screened with the evaluation."),
          ("Interview date confirmed by both sides", "Move to Interview Scheduled."),
          ("Interviewer confirms attendance", "Move to Interview Attended."),
          ("Authorised selection confirmation received", "Move to Selected."),
          ("Offer letter released", "Move to Offered."),
          ("Written acceptance received", "Move to Offer Accepted."),
          ("Joining confirmed by client HR on the joining day", "Move to Joined."),
          ("Not selected", "Move to Rejected with stage and reason."),
          ("Candidate withdraws after offer", "Move to Dropout with reason.")),
    h("Rules"),
    ul("Do not move a candidate forward without evidence.", "Do not leave outdated statuses — update the same day.", "Do not mark Selected before authorised confirmation.", "Do not mark Joined before actual joining confirmation."),
    h("Fictional situations"),
    ex("Situation 1", "Ms. Divya R. said on the phone 'I think the interview went well, they will select me'."),
    ex("Situation 2", "Mr. Sameer L. accepted the offer verbally but has not replied to the offer email."),
    ex("Situation 3", "Mr. Kiran B. was due to join today; the candidate messaged 'reached office', client HR has not confirmed."),
    answer("Model Answers",
           ("Situation 1", "Status remains Interview Attended. Feedback pending from the client — candidate opinion is not evidence."),
           ("Situation 2", "Status remains Offered. Pending: written acceptance; follow up today."),
           ("Situation 3", "Do not mark Joined yet. Confirm with client HR, then update to Joined with date and time.")),
]))

L.append((B, "Candidate Follow-Up and Recruitment Pipeline Management", "Practice: plan follow-ups across a multi-candidate pipeline.", "practice", 20, [
    h("Follow-up principles"),
    ul("Plan follow-ups daily and prioritise by stage and urgency.", "Contact candidates at agreed or reasonable times.", "Record every outcome and the next follow-up date.", "For no response: try call and message at different times; after agreed attempts, mark No Response.", "Escalate when a client or candidate delay risks the requirement."),
    terms(("Interview follow-up", "Same-day check with candidate; feedback chase with client within the agreed time."),
          ("Offer follow-up", "Confirm the candidate received and understood the offer; track acceptance deadline."),
          ("Joining follow-up", "Track resignation, notice, documents and joining-day confirmation.")),
    h("Fictional pipeline (today is Wed 12 Mar, 9:30 am)"),
    ex("Candidates", "1) Ms. Pooja N. — Contacted 10 Mar, two unanswered calls. 2) Mr. Vikram S. — Interview Attended 11 Mar, feedback pending. 3) Ms. Anita G. — Offered 7 Mar, acceptance deadline 13 Mar, no reply. 4) Mr. Joseph M. — Offer Accepted, joining 14 Mar. 5) Mr. Harsh D. — Screened, candidate asked to be called after 15 Mar."),
    p("For each candidate decide: who needs follow-up, why, the next action, and when."),
    answer("Model Follow-Up Plan",
           ("Anita G.", "Urgent — offer deadline tomorrow. Call 10 am today; if no reply, message and inform the client by 4 pm."),
           ("Joseph M.", "High — joining in 2 days. Call today to confirm documents and reporting time; reminder 13 Mar evening."),
           ("Vikram S.", "High — feedback pending. Chase client by 12 pm; update candidate by 5 pm."),
           ("Pooja N.", "Normal — third attempt by call this afternoon plus a message; mark No Response only after the agreed attempts."),
           ("Harsh D.", "Follow-up later — no action today; follow-up set for 16 Mar, 11 am, as requested.")),
]))

# ---------------- Section C ----------------
L.append((C, "Daily Recruitment Workflow", "A professional daily routine and how to prioritise work.", "text", 18, [
    h("Daily workflow"),
    steps(("Review requirements", "Check open requirements, priorities and any client changes."),
          ("Review pending actions", "List everything due today and overdue."),
          ("Prioritise candidates", "Order work by urgency and stage."),
          ("Candidate follow-ups", "Complete planned calls and messages."),
          ("Screening / interview coordination", "Run screenings; confirm interview schedules."),
          ("Interview feedback follow-up", "Chase pending feedback."),
          ("Offer follow-up", "Track offers awaiting acceptance."),
          ("Joining follow-up", "Track notice, documents and joining dates."),
          ("Update records", "Statuses and notes updated the same day."),
          ("Prepare daily report", "Based on recorded activity only."),
          ("Review pending work", "Check nothing due today is left open."),
          ("Plan next actions", "Set tomorrow's follow-ups and priorities.")),
    h("Prioritisation"),
    terms(("Urgent", "Must happen today or a candidate/requirement is at risk — e.g. offer deadline today, joining tomorrow."),
          ("High priority", "Time-sensitive — e.g. feedback pending, interviews to confirm."),
          ("Normal", "Routine progress — e.g. new screenings, sourcing for open roles."),
          ("Follow-up later", "Scheduled for a future date at the candidate's or client's request.")),
    note("Records first, report second. A report prepared before updating records will be wrong."),
]))

L.append((C, "Requirement Tracking and Client Coordination", "Scenario: track open requirements and coordinate professionally with clients.", "scenario", 18, [
    h("Tracking requirements"),
    terms(("Requirement status", "Open, On Hold, Closed — with the date of change."),
          ("Number of positions", "Total, filled and remaining."),
          ("Candidate progress", "Count of candidates at each stage for that requirement."),
          ("Pending client feedback", "Profiles or interviews awaiting the client's response."),
          ("Requirement changes", "Any change to skills, CTC, location or positions — recorded with who requested it.")),
    h("Client coordination"),
    ul("Communicate politely, clearly and in writing for important points.", "Document every client instruction with date and person.", "Confirm changes in writing before acting on them.", "Escalate unclear or conflicting requirements to your team lead."),
    h("Fictional scenario"),
    ex("Requirement", "Fictional client 'Northwind Retail' — 6 Store Associates, Kochi. 2 joined, 3 at interview stage, profiles pending feedback for 4 days."),
    ex("Client call", "The client's HR says on the phone: 'We may need 2 more, and maybe Malayalam is mandatory now.'"),
    answer("Model Approach",
           ("Do not act yet", "'Maybe' and 'may need' are not confirmed changes."),
           ("Confirm in writing", "Email the client: 'To confirm: do you need 8 positions instead of 6, and is Malayalam now mandatory? I will update the search once confirmed.'"),
           ("Document", "Note the call with date, time and person; status of change: awaiting confirmation."),
           ("Pending feedback", "Raise the 4-day pending feedback politely in the same email."),
           ("Escalate", "If no confirmation in the agreed time, inform the team lead.")),
]))

L.append((C, "Interview, Offer and Joining Follow-Up", "Practice: manage a candidate from interview through joining.", "practice", 20, [
    h("The follow-up chain"),
    p("Interview follow-up → feedback follow-up → selection confirmation → offer follow-up → offer acceptance → joining confirmation → joining completion"),
    terms(("Pending feedback", "Chase the client at the agreed time; keep the candidate informed."),
          ("Candidate questions", "Answer only with confirmed information; route offer questions to authorised HR."),
          ("Notice-period tracking", "Confirm resignation date and last working day."),
          ("Joining date confirmation", "Confirm with both candidate and client in writing."),
          ("Joining reminders", "Remind the day before with time, address and documents."),
          ("Dropout handling", "Understand the reason, inform the client immediately, update to Dropout."),
          ("Absconded", "Joined but stopped reporting without notice — update only after client confirmation.")),
    h("Fictional scenario"),
    ex("Situation", "Ms. Reshma K. interviewed on 3 Mar for a Procurement Coordinator role at fictional client 'Bluegate Engineering'. Client confirmed selection on 6 Mar. Offer released 8 Mar. Reshma has a 30-day notice and asked whether she can join on 10 Apr instead of 7 Apr."),
    p("Write the follow-up workflow from today until joining completion."),
    answer("Model Follow-Up Workflow",
           ("Offer follow-up", "Call within 24 hrs of release — confirm receipt and understanding; written acceptance due by the deadline."),
           ("Joining date question", "Do not agree yourself. Ask client HR whether 10 Apr is acceptable; inform Reshma in writing once confirmed."),
           ("Resignation", "Confirm resignation submitted and last working day; record dates."),
           ("Weekly check-ins", "Brief call each week during notice to spot dropout risk early."),
           ("Joining reminder", "Day before: time, address, reporting person, documents."),
           ("Joining completion", "Confirm with client HR on the day; then update status to Joined.")),
]))

L.append((C, "Recruitment Documentation and Daily Reporting", "Accurate daily updates based only on recorded activity.", "text", 17, [
    h("What a daily report covers"),
    ul("Candidates contacted and screened", "Pipeline movement (stage changes today)", "Interviews scheduled and attended", "Selections, offers and joins", "Pending actions and blockers", "Requirement-wise summary"),
    h("Fictional report example"),
    ex("Daily report — Recruiter Arjun M., 12 Mar", "Requirement: Purchase Executive (fictional client 'Southline Components', 3 positions). Contacted 14 · Interested 6 · Screened 5 · Shortlisted 2 · Interviews scheduled 2 (13 Mar) · Selected 0 · Offers 1 pending acceptance · Joined 0. Pending: client feedback on 2 profiles since 10 Mar."),
    h("Reporting discipline"),
    ul("Every number must match recorded activity.", "Submit by the agreed deadline every day.", "Report requirement-wise, not only in totals.", "Highlight pending actions and risks honestly."),
    cmp("Reporting a slow day", "Contacted 4 · Screened 1 · Pending: 3 candidates did not answer; follow-up planned tomorrow 11 am.", "Contacted 15 · Screened 6 (rounded up to match target).", "Accurate", "Fabricated"),
    note("Fabricated numbers are a serious breach of professional conduct. Reports drive business decisions and must reflect what actually happened."),
]))

L.append((C, "Recruiter Productivity, Priorities and Pending Actions", "Scenario: put a realistic workload in the correct priority order.", "scenario", 18, [
    h("Managing workload"),
    ul("Start the day from the pending-action list, not the inbox.", "Prioritise by requirement priority, candidate stage and deadline.", "Block time for calls; batch updates.", "Do not let follow-ups slip — a missed follow-up often means a lost candidate.", "Escalate early when work exceeds capacity or a blocker is outside your control.", "End the day with a review of pending items."),
    h("Fictional workload (Thu 9:00 am)"),
    ex("Tasks", "a) Candidate joins tomorrow — documents not confirmed. b) Client asked for 3 new profiles for an urgent requirement by 2 pm. c) Two interview feedbacks pending since Monday. d) Update yesterday's notes for 6 candidates. e) Screen 4 new applicants for a normal-priority role. f) Candidate asked to be called next week."),
    p("Decide the correct priority order and explain why."),
    answer("Model Priority Order",
           ("1 — (a)", "Urgent: joining tomorrow is at risk without documents."),
           ("2 — (d)", "Quick, and accurate records are needed before sharing profiles and reports."),
           ("3 — (b)", "Urgent client deadline at 2 pm."),
           ("4 — (c)", "High: feedback overdue; chase client and update candidates."),
           ("5 — (e)", "Normal: routine screening after urgent items."),
           ("6 — (f)", "Follow-up later: schedule for next week; no action today."),
           ("Escalate", "If (b) cannot be met by 2 pm, inform the team lead by 12 pm.")),
]))

# ---------------- Final practice ----------------
L.append((C, "Complete Recruitment Operations Workflow", "Practice: an end-to-end fictional recruitment operations scenario.", "practice", 23, [
    h("Fictional requirement"),
    ex("Requirement", "Fictional client 'Harbourline Foods' — 3 Purchase Executives, Chennai (Guindy), WFO. 2–5 yrs purchase experience in FMCG/manufacturing, SAP MM preferred, notice ≤ 30 days, CTC up to 5 LPA. Today is Fri 14 Mar. Your name: Recruiter Kavin R."),
    h("Fictional candidates"),
    ex("1. Ms. Shalini P. (C-11201)", "Source: Job Portal. Owner: Kavin R. Interviewed 12 Mar; client confirmed selection by email 13 Mar. Offer not yet released."),
    ex("2. Mr. Arun V. (C-11214)", "Source: Employee Referral (referrer: Deepa S.). Owner: Kavin R. Screened 13 Mar — suitable; profile not yet submitted."),
    ex("3. Mr. Faizal M. (C-11188)", "Source: Consultant. Owner: Kavin R. Offer accepted in writing 5 Mar; joining 17 Mar; relieving letter pending."),
    ex("4. Ms. Rekha T. (C-11230)", "Source: Walk-in. Owner: Kavin R. Contacted 13 Mar, no answer; message sent."),
    ex("5. Mr. Gokul S. (C-11175)", "Source: Direct Application. Owner: Kavin R. Offered 10 Mar; called 13 Mar to say he accepted a counter-offer."),
    h("For each candidate identify"),
    ul("1. Current candidate status", "2. Pending action", "3. Candidate owner", "4. Next follow-up", "5. Correct pipeline stage", "6. Required documentation", "7. Daily report information", "8. Priority action"),
    answer("Model Recruitment Operations Plan",
           ("Shalini P.", "Stage: Selected (authorised email). Pending: offer release — coordinate with client HR today. Owner: Kavin R. Follow-up: client HR 11 am; candidate update by 4 pm. Docs: selection email saved to record. Priority: High."),
           ("Arun V.", "Stage: Screened. Pending: submit for shortlisting with evaluation notes. Owner: Kavin R. Follow-up: inform candidate of submission today; chase client feedback 17 Mar. Docs: screening notes, current resume, referrer recorded. Priority: High."),
           ("Faizal M.", "Stage: Offer Accepted. Pending: relieving letter before 17 Mar joining. Owner: Kavin R. Follow-up: call today 10 am; joining reminder 16 Mar evening. Docs: acceptance, joining date confirmation. Priority: Urgent."),
           ("Rekha T.", "Stage: Contacted. Pending: second attempt. Owner: Kavin R. Follow-up: call today 3 pm; mark No Response only after agreed attempts. Docs: dated attempt notes. Priority: Normal."),
           ("Gokul S.", "Stage: Dropout (withdrew after offer). Pending: inform client today; record reason. Owner: Kavin R. Follow-up: none with candidate; replacement sourcing for the position. Docs: dated note with stated reason. Priority: High."),
           ("Priority order", "Faizal → Gokul (inform client) → Shalini → Arun → Rekha.")),
    answer("Model Daily Report",
           ("Requirement", "Purchase Executive — Harbourline Foods — 3 positions; 0 joined; 1 joining 17 Mar."),
           ("Today's movement", "Contacted 1 · Screened 0 · Submitted 1 · Selected 0 (1 selection received 13 Mar) · Offers released 0 · Dropouts 1."),
           ("Pipeline", "Contacted 1 · Screened 1 · Selected 1 · Offer Accepted 1 · Dropout 1."),
           ("Pending actions", "Offer release for Shalini; relieving letter for Faizal; client feedback for Arun."),
           ("Risks", "One position reopened due to dropout; replacement sourcing started."),
           ("Note", "All counts taken from recorded activity on 14 Mar.")),
    note("Every number in the report traces back to a dated record. If it is not recorded, it did not happen."),
]))

assert len(L) == 15 and sum(x[4] for x in L) == 273
rows = [dict(sort_order=i, title=t, description=d, content_type=c, estimated_minutes=m, content={"section": s, "blocks": b})
        for i, (s, t, d, c, m, b) in enumerate(L, 1)]
if "--json" in sys.argv:
    print(json.dumps({"objectives": OBJECTIVES, "lessons": rows}, ensure_ascii=False))
else:
    q = lambda s: s.replace("'", "''")
    out = ["-- Module 5 content seed (idempotent). Generated by module5_content.py — do not hand-edit.",
           "update public.academy_modules set learning_objectives = array[%s]::text[] where module_number = 5;" % ", ".join("'" + q(o) + "'" for o in OBJECTIVES)]
    for r in rows:
        out.append(f"""insert into public.lessons (module_id, sort_order, title, description, content_type, estimated_minutes, is_required, status, content)
select id, {r['sort_order']}, '{q(r['title'])}', '{q(r['description'])}', '{r['content_type']}', {r['estimated_minutes']}, true, 'active', '{q(json.dumps(r['content'], ensure_ascii=False))}'::jsonb from public.academy_modules where module_number = 5
on conflict (module_id, sort_order) do update set title = excluded.title, description = excluded.description, content_type = excluded.content_type, estimated_minutes = excluded.estimated_minutes, is_required = true, status = 'active', content = excluded.content;""")
    print("\n".join(out))
