# Alberta tax-calculator calculation depth

Reviewed baseline: `master` at `3df193aa7097f0dc6d002566532a12c0b1db572a`
(merged PR #12). Its CI run [37883467414](https://github.com/scomofo/wealthflow/actions/runs/37883467414)
passed. No open PR duplicated this slice when reviewed.

## Closed implementation gap

The interactive calculator previously applied basic personal amounts and
pooled federal/provincial dividend credits. Alberta age, pension and disability
amounts existed in the knowledge reference, but were not calculation inputs.
The supplemental credit was absent. RRSP and pension-split comparisons used
separate basic-amount calculations.

`src/renderer/js/canadian/tax-estimate.js` now supplies the main estimate,
RRSP impact and no-split/50%-split comparison through one credit model:

- Federal and Alberta adult age, eligible pension, adult disability and basic
  spouse amounts; the federal Canada employment amount.
- Explicit eligibility and year-end age; no demographic/eligibility inference
  from household records. Unknown age earns no age/disability credit.
- Optional employee base CPP/EI credits and enhanced CPP/CPP2 income deduction,
  separately entered from Schedule 8 / return amounts and capped at employee
  maxima. Blank fields assume zero.
- Alberta supplemental credit on modeled eligible claim bases above $61,200,
  and the federal top-up using the statutory 7.14% multiplier.
- Independent federal/provincial non-refundable credit caps, preventing an
  unused credit from reducing another jurisdiction's tax.
- Pension income counted once, separately from Other and dividends; RRSP
  comparisons recalculate income-tested credits. Pension splitting recalculates
  the sender's age/spouse amounts and requires separate confirmation before
  granting the recipient a pension income amount.
- Each jurisdiction's result rounded to cents before totaling and comparing,
  so the displayed component taxes and savings agree.

The page shows eligible claim bases, top-up/supplemental entitlements, actual
tax reduction beyond basic amounts, and each jurisdiction's tax after credits.
Bracket bars are labeled before credits. All controls have associated labels;
checkbox changes retain keyboard focus. Helper text and labels are readable
in both themes. `CLAUDE.md`, README and the Alberta reference reflect this scope.

## Primary-source verification

Verified October 9, 2026 (UTC):

- [CRA TD1 2026](https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/td1/td1-26e.pdf)
  and [TD1AB 2026](https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/td1ab/td1ab-26e.pdf):
  personal amounts and eligibility conditions.
- [TD1AB worksheet](https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/td1ab-ws/td1ab-ws-26e.pdf):
  15% age-amount reduction above the net-income threshold.
- [CRA T4127 January 2026](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html):
  Alberta K5P, employee CPP/EI amounts and Canada employment amount.
  The [July revision](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html)
  leaves the Alberta formula unchanged.
- [Worksheet AB428 2025](https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/5009-d/5009-d-25e.pdf):
  supplemental-base exclusions; 2026 threshold is taken from T4127, rather
  than copying the 2025 worksheet's $60,000 threshold. The latest annual
  Alberta filing package available at verification was for 2025.
- [Income Tax Act s.118(11)](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-118.html):
  enacted federal top-up formula.
- [CRA pension splitting](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/pension-income-splitting.html):
  separate recipient pension-credit eligibility and effects on income-tested
  age/spouse amounts.

## Automated evidence

`npm test -- --runInBand`: **361 tests passed in 57 suites**.
`npm run lint` and `git diff --check`: **passed**.

The 33 added tests exercise real modules, including worked examples,
age/claim thresholds, explicit eligibility, contribution-credit versus
deduction handling, jurisdiction isolation, malformed inputs, rendering and
DOM handler behavior. Expected worked-example figures are independently
derived from the source tables rather than a second implementation.

| Scenario | Federal tax | Alberta tax | Total |
| --- | ---: | ---: | ---: |
| $100,000 employment, no optional CPP/EI or extra eligibility | $14,182.59 | $6,954.48 | $21,137.07 |
| Same, with maximum employee base CPP/EI and $1,127 enhanced deduction | $13,301.60 | $6,470.38 | $19,771.98 |
| Age 65, $60,000 eligible pension, no RRSP deduction | $4,908.53 | $2,483.83 | $7,392.36 |
| Same pension scenario with $10,000 RRSP deduction | $3,202.53 | $1,563.83 | $4,766.36 |
| $90,000 eligible dividends only | $1,092.66 | $0.00 | $1,092.66 |

The pension/RRSP example saves **$2,626.00**, including restored age credits.
The dividend example previously returned about **$382.10** because unused
Alberta dividend credit incorrectly offset federal tax.

A focused Chromium 153 renderer harness imported the real calculator and
Plan event handlers. It passed ordinary-income totals, disability/spouse
activation, supplemental-credit display, numeric/checkbox focus, unique
pension/spouse fields, associated labels, desktop overflow and province
round-trip checks, without renderer exceptions. Dark/light renders were
visually inspected. The harness supplied a minimal state object and a
debounce adapter; this is renderer evidence, not Electron IPC or packaged
Windows acceptance.

## Remaining scope and acceptance

The calculator remains a 2026 adult planning estimate. It excludes caregiver
and eligible-dependant claims, unused-credit transfers, medical/donation/tuition
credits, refundable benefits, OAS recovery, AMT and self-employment contributions.
These need their own eligibility and interaction rules. No new jurisdiction
coverage was added. Other provinces and the transaction-based Tax Season helper
retain their narrower basic-amount estimates.

The pension comparison tests 0% versus 50%; it is not an optimizer. Spouse
income is assumed to be ordinary net/taxable income before splitting, with
other spouse deductions/credits unknown. Inputs remain session-only, matching
the existing calculator; they do not create or change database records.

Packaged Windows Electron has not been exercised. Its shortest remaining
acceptance is to open Tax Calculator, enter the first and pension/RRSP examples
above, toggle the eligibility controls using the keyboard, navigate away/back,
and confirm the totals, focus and explicitly selected province. A discrepancy
should trigger a focused renderer/preload investigation, not a new feature pass.
