KOTHA STUDIO — FINAL CAPSTONE PROPOSAL PACKAGE
Prajwal Basnet · Gritfeat Solutions · Full Stack Web Development Internship
Version 1.0 · 25 November 2026 · for mentor approval

================================================================================
WHAT IS IN THIS FOLDER
================================================================================
  Kotha_Studio_Proposal.docx   The master document. All 13 required documents
                               plus 5 appendices, one typeface (Arial), A4,
                               25 mm margins, static contents with real page
                               numbers.
  Kotha_Studio_Proposal.pdf    The same document rendered to PDF. This is the
                               file to submit and to present from.
  Kotha_Studio_Proposal_Summary.docx / .pdf
                               A six-page version of the whole proposal — one
                               sheet per topic. Hand this round the room; keep
                               the master for the defence and the record.
  FIGMA_HANDOFF.txt            Frame list, prototype wiring, component inventory
                               and tokens for assembling the clickable Figma
                               prototype of the main flow.
  assets/                      Every diagram and wireframe as SVG (editable)
                               and PNG (300 dpi equivalent, 2200 px wide).
  build/                       The generators. Re-running them reproduces every
                               figure and the document exactly.

================================================================================
THE 13 DOCUMENTS, AND WHERE THEY LIVE
================================================================================
   1  Project proposal .................. Section 1   (pages 7–10)
   2  Requirements ...................... Section 2   (26 user stories + NFRs)
   3  Roles and use-case diagram ........ Section 3   (permission matrix, 5 flows)
   4  System architecture ............... Section 4   (diagram + layer rules)
   5  Database design ................... Section 5   (8 collections, ER, indexes)
   6  API specification ................. Section 6   (every endpoint + Khalti)
   7  UI/UX design ...................... Section 7   (10 wireframes + mobile)
   8  Component and route map ........... Section 8   (tree, routes, state, hooks)
   9  Tech stack and tools .............. Section 9   (reason per library + Git)
  10  Security plan ..................... Section 10  (tokens, RBAC, OWASP map)
  11  Project plan ...................... Section 11  (4 sprints, 88 h, milestones)
  12  Testing plan ...................... Section 12  (32 tests + manual checklist)
  13  Deployment plan ................... Section 13  (hosts, env, CI, rollback)
   A  Criterion coverage matrix ......... Appendix A
   B  Topic coverage matrix ............. Appendix B
   C  Evaluation marks mapping .......... Appendix C
   D  Candidate background .............. Appendix D
   E  Open questions for the mentor ..... Appendix E

================================================================================
FIGURES
================================================================================
  fig_architecture      System architecture (Section 4)
  fig_usecase           Actors and use cases (Section 3)
  fig_er                Entity relationships (Section 5)
  fig_authflow          Token lifecycle sequence (Section 10)
  fig_componenttree     Component hierarchy (Section 8)
  fig_pipeline          Blueprint to 3D pipeline (Section 7)
  fig_deployment        Deployment topology (Section 13)
  fig_gitflow           Git and review workflow (Section 9)
  fig_designplate       Monochrome design plate (Section 7)
  fig_cover             Cover motif: form -> space -> object
  wf_landing            W-01  Landing
  wf_auth               W-02  Register / login
  wf_dashboard          W-03  Client dashboard
  wf_blueprint          W-04  Blueprint editor
  wf_room3d             W-05  Generated 3D room
  wf_door               W-06  Direct edit: a doorway between two rooms
  wf_catalogue          W-07  Catalogue
  wf_checkout           W-08  Checkout and Khalti
  wf_designer           W-09  Designer studio
  wf_admin              W-10  Admin console
  wf_mobile             M-01  Mobile trio

================================================================================
REBUILDING
================================================================================
  cd build
  python3 fig_diagrams.py        # technical diagrams -> assets/
  python3 wireframes.py          # wireframes -> assets/
  python3 build_doc.py           # master DOCX + PDF, resolves real TOC page numbers
  python3 build_summary.py       # six-page summary DOCX + PDF

  Requires: python3, python-docx, librsvg (rsvg-convert), LibreOffice (soffice),
  poppler (pdftotext, pdftoppm). All free.

================================================================================
BEFORE SUBMISSION
================================================================================
  [ ] Fill in the cover: college / university, programme, mentor, supervisor.
  [ ] Assemble the Figma prototype from FIGMA_HANDOFF.txt and paste the link
      into Section 7.10 and into the submission form.
  [ ] Confirm the Khalti sandbox keys exist (Section 11.6).
  [ ] Present for 10 minutes, answer questions for 20, get approval.
  [ ] Only then start writing application code.
