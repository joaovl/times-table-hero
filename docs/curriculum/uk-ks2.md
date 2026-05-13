# UK National Curriculum coverage — Key Stage 2

Key Stage 2 of the UK National Curriculum runs across Years 3, 4, 5, and 6 (ages roughly 7 to 11). For mathematics it is organised into a set of programmes of study, one per year group, each grouped into strands like Number and place value, Addition and subtraction, Multiplication and division, Fractions (including decimals), Measurement, Geometry, and Statistics.

Times Table Hero covers Years 3 through 6. Year 6 coverage was added in May 2026 across the existing modules plus three new modules — Ratio & Proportion, Algebra, and Statistics — see the Year 6 section below and the "Coverage gaps" section at the bottom.

This page lists, year by year, which National Curriculum objectives the app practises and which module + skill exercises each one. Mappings come directly from the `CURRICULUM_TAGS` constant exported by each module's `logic.ts`, so this page stays in step with the code.

## How to read the tables

- **NC objective** — the practical curriculum aim, paraphrased to fit a single row. Each row maps to one or more sentences in the official programme of study.
- **Module** — which module in the Hub holds the skill. Use the slug to navigate, for example `https://times-table-hero.pages.dev/decimals`.
- **Skill** — the internal skill key. You can select this skill on the module's setup screen.
- **Notes** — short clarifications such as overlapping years or related skills.

If a skill maps to more than one year (for example, "compare and order numbers" appears in Y3, Y4, and Y5 at increasing magnitudes), the same skill row appears in each year's table at the difficulty level appropriate for that year.

## Year 3

| NC objective | Module | Skill | Notes |
|---|---|---|---|
| Recall and use multiplication and division facts for the 3, 4 and 8 multiplication tables | Times Tables | tables 3, 4, 8 | Pick the relevant tables in setup |
| Recognise the place value of each digit in a 3-digit number | Number Sense | place-value-3d | |
| Compare and order numbers up to 1,000 | Number Sense | order-numbers | |
| Count from 0 in multiples of 4, 8, 50 and 100 | Number Sense | count-multiples | |
| Add and subtract numbers mentally and using formal written methods (3-digit) | Arithmetic | add, subtract | Set operand digit-count to 2 or 3 |
| Solve problems, including missing number problems, using the four operations | Word Problems | arith-1step | One-step word problems |
| Add and subtract amounts of money to give change | Money | change | Whole-pound change for Y3 difficulty |
| Add amounts of money | Money | add-money | |
| Subtract amounts of money | Money | subtract-money | |
| Compare amounts of money in pounds and pence | Money | compare-prices | |
| Add money of different denominations to find a total cost | Money | multi-item | |
| Solve one-step problems involving money | Word Problems | money-1step | |
| Convert between different units of measure (cm <-> mm) | Conversions | length-cm-mm | Also revisited in Y4 |
| Measure, compare, add and subtract lengths (m / cm / mm) | Word Problems | measure-1step | Easy / medium templates |
| Recognise and show, using diagrams, equivalent fractions with small denominators | Fractions | id, eq | |
| Add and subtract fractions with the same denominator | Fractions | add-same, sub-same | |
| Solve simple problems involving fractions of a quantity | Word Problems | fractions-1step | |
| Draw 2-D shapes; recognise and describe 2-D shapes by their properties | Shapes | name-2d, count-sides | |
| Measure the perimeter of simple 2-D shapes | Shapes | perimeter-rect | Also revisited in Y4 |
| Tell and write the time from an analogue clock | Time | read | To the nearest 5 minutes is fine at Y3 |
| Read Roman numerals to XII on a clock face | Number Sense / Time | (no dedicated number-sense skill for I-XII; see Time `read-roman`) | Number-sense roman-100 covers I-C |
| Solve problems involving converting and adding time intervals | Time | arith | Add minutes / hours to a start time |
| Interpret and present data using bar charts and tables | Charts | read-bar, compare-bar | |

## Year 4

| NC objective | Module | Skill | Notes |
|---|---|---|---|
| Recall multiplication and division facts up to 12 x 12 | Times Tables | tables 6, 7, 9, 11, 12 | All tables in scope by end of Y4 |
| Recognise the place value of each digit in a 4-digit number | Number Sense | place-value-4d | |
| Order and compare numbers beyond 1,000 | Number Sense | order-numbers | |
| Count in multiples of 6, 7, 9, 25 and 1000 | Number Sense | count-multiples | |
| Count backwards through zero to include negative numbers | Number Sense | negative-count | |
| Round any number to the nearest 10, 100 or 1,000 | Number Sense | round-10, round-100, round-1000 | |
| Read Roman numerals to 100 (I to C) | Number Sense | roman-100 | |
| Add and subtract numbers with up to 4 digits using the formal written methods | Arithmetic | add, subtract | Set operand digit-count to 3 or 4 |
| Multiply two-digit and three-digit numbers by a one-digit number | Arithmetic | multiply | Pick 2- or 3-digit x 1-digit |
| Recognise and use factor pairs | Number Theory | factor-pair, factors | Easy difficulty |
| Solve problems involving multiplying and adding | Word Problems | arith-2step | Two-step problems start here |
| Use the four operations to solve problems involving money | Money | add-money, subtract-money, change | Y4 difficulty unlocks pence in change |
| Multiply amounts of money | Money | multiply-money | |
| Solve simple measure problems involving money | Word Problems | money-1step, money-2step | |
| Convert between different units of measure (m <-> cm, km <-> m) | Conversions | length-m-cm, length-km-m | |
| Convert kilograms to grams | Conversions | mass-kg-g | |
| Convert hours to minutes; minutes to seconds | Conversions | time-h-min, time-min-s | |
| Estimate, compare and calculate different measures | Word Problems | measure-1step | |
| Recognise and show families of common equivalent fractions | Fractions | eq, cmp | |
| Solve simple measure and money problems involving fractions and decimals to two decimal places | Fractions / Decimals | identify-tenths, identify-hundredths | |
| Round decimals with one decimal place to the nearest whole number | Decimals | round-1dp | |
| Recognise and write decimal equivalents of any number of tenths or hundredths | Decimals | identify-tenths, identify-hundredths, fraction-to-decimal, decimal-to-fraction | Coverage split with Fractions module |
| Compare numbers with the same number of decimal places up to two decimal places | Decimals | compare-decimals | |
| Add and subtract decimals (one and two decimal places) | Decimals | add-decimals, subtract-decimals | |
| Measure and calculate the perimeter of a rectilinear figure in cm and m | Shapes | perimeter-rect | |
| Find the area of rectilinear shapes by counting squares | Shapes | area-rect | |
| Identify acute and obtuse angles and compare and order angles | Shapes | angle-name | |
| Identify lines of symmetry in 2-D shapes | Shapes | lines-of-symmetry | |
| Describe positions on a 2-D grid as coordinates in the first quadrant | Shapes | coord-read, coord-plot | |
| Read, write and convert time between analogue and digital 12- and 24-hour clocks | Time | read | Nearest-minute precision |
| Solve problems involving converting between units of time | Time | arith | Add minutes / hours to a start time |
| Calculate the duration of an event | Time | duration | |
| Solve one-step time word problems | Word Problems | time-1step | |
| Interpret and present discrete and continuous data using charts and time graphs | Charts | total-bar, read-pie, read-line, line-max | |

## Year 5

| NC objective | Module | Skill | Notes |
|---|---|---|---|
| Read, write, order and compare numbers to at least 1,000,000 | Number Sense | place-value-7d, order-numbers | |
| Count forwards or backwards in steps of powers of 10 | Number Sense | count-multiples | |
| Round any number up to 1,000,000 to the nearest 10,000 and 100,000 | Number Sense | round-10k | |
| Read Roman numerals to 1,000 (M); recognise years written in Roman numerals | Number Sense | roman-1000 | |
| Identify multiples and factors, including all factor pairs of a number | Number Theory | factors, multiples, factor-pair, is-multiple | |
| Identify common factors of two numbers | Number Theory | common-factor | |
| Know and use the vocabulary of prime numbers | Number Theory | prime-recognize, prime-list-19 | |
| Establish whether a number up to 100 is prime | Number Theory | prime-recognize | Hard difficulty |
| Recognise and use square numbers and the notation for squared | Number Theory | square, square-root | |
| Recognise and use cube numbers and the notation for cubed | Number Theory | cube | |
| Add and subtract numbers mentally with increasingly large numbers (5-digit) | Arithmetic | add, subtract | Operand digit-count up to 5 |
| Multiply numbers up to 4 digits by a one- or two-digit number | Arithmetic | multiply | |
| Divide numbers up to 4 digits by a one-digit number using formal written methods | Arithmetic | divide | Allow remainders on or off |
| Solve multi-step problems involving the four operations | Word Problems | arith-2step | |
| Use all four operations to solve problems involving measure | Word Problems | measure-2step | Unit conversion + arithmetic |
| Solve problems involving money including converting between £ and p | Money | change, multi-item, multiply-money | Hard difficulty |
| Solve multi-step money word problems | Word Problems | money-2step | |
| Convert between different units of metric measure | Conversions | length-*, mass-kg-g, volume-L-mL | |
| Understand and use approximate equivalences between metric and imperial | Conversions | metric-imperial | |
| Measure and calculate the perimeter of composite rectilinear shapes | Conversions | perimeter-composite | |
| Calculate and compare the area of rectangles and irregular shapes by counting squares | Shapes / Conversions | area-rect, area-irregular | |
| Recognise and use cube and cuboid volume formulas | Conversions | volume-cube, volume-cuboid | |
| Identify, describe and represent 3-D shapes | Shapes | name-3d, count-faces, count-edges, count-vertices | |
| Identify angles at a point on a straight line and one whole turn; estimate and compare acute, obtuse and reflex angles | Shapes | angle-name-reflex, angle-measure | |
| Identify, describe and represent the position of a shape following a translation | Shapes | translation | |
| Read coordinates in the first quadrant and plot specified points | Shapes | coord-read, coord-plot | |
| Recognise mixed numbers and improper fractions and convert between them | Fractions | mixed | |
| Add and subtract fractions with denominators that are multiples of the same number | Fractions | add-diff, sub-diff | |
| Multiply proper fractions and mixed numbers by whole numbers | Fractions | mul-by-whole, mixed-mul-whole | |
| Multiply proper fractions by proper fractions | Fractions | mul-frac | |
| Read and write decimal numbers as fractions | Fractions / Decimals | to-decimal, from-decimal, fraction-to-decimal, decimal-to-fraction | |
| Recognise and use thousandths and relate them to tenths, hundredths and decimal equivalents | Decimals | identify-thousandths | |
| Round decimals with two decimal places to the nearest whole number and to one decimal place | Decimals | round-2dp | |
| Recognise the per cent symbol and understand that per cent relates to "number of parts per hundred" | Decimals | percent-fraction, percent-decimal, decimal-percent | |
| Solve problems involving 12- and 24-hour time, including PM start times | Time | time-arith-pm | |
| Calculate the duration between two times | Time | duration | |
| Complete, read and interpret information in tables, including timetables | Charts | timetable-read, timetable-duration | |
| Solve comparison, sum and difference problems using information presented in line graphs | Charts | line-trend, multi-step-bar | |
| Interpret pie charts and use these to solve problems | Charts | pie-fraction | |

## Year 6

| NC objective | Module | Skill | Notes |
|---|---|---|---|
| Read, write, order and compare numbers up to 10,000,000 | Number Sense | place-value-10m | |
| Round any whole number to a required degree of accuracy (nearest 1,000,000) | Number Sense | round-1m | |
| Use negative numbers in context, calculate intervals across zero | Number Sense | negative-interval | |
| Use knowledge of the order of operations (BIDMAS / BODMAS) | Number Sense | bidmas | Mixed +, -, ×, ÷, parentheses |
| Multiply multi-digit numbers up to 4 digits by a 2-digit whole number | Arithmetic | multiply | Set chip pickers to 4 × 2 |
| Divide numbers up to 4 digits by a 2-digit whole number (with remainders) | Arithmetic | divide | Enable "Allow remainders" |
| Add and subtract fractions with different denominators and mixed numbers | Fractions | add-mixed, sub-mixed, add-diff, sub-diff | |
| Divide proper fractions by whole numbers | Fractions | div-frac-whole | e.g. 3/4 ÷ 2 = 3/8 |
| Multiply pairs of simple fractions | Fractions | mul-frac | Carried over from Y5 |
| Calculate decimal-fraction-percentage equivalents | Fractions / Decimals | to-decimal, from-decimal | |
| Solve problems using percentages of an amount | Ratio & Proportion | percent-of | e.g. 15% of 80 |
| Solve problems using scale factors | Ratio & Proportion | scale-factor | |
| Solve problems involving unequal sharing in a ratio | Ratio & Proportion | ratio-share | e.g. share £40 in 3:5 |
| Simplify ratios using common factors | Ratio & Proportion | ratio-simplify | |
| Solve equivalent-ratio problems | Ratio & Proportion | ratio-equivalent | |
| Use simple formulae | Algebra | formula-eval | e.g. p = 2(l + w) |
| Express missing-number problems algebraically | Algebra | missing-number | e.g. 3a + 4 = 10 |
| Generate and describe linear number sequences | Algebra | sequence-next, sequence-rule | |
| Substitute values into expressions | Algebra | expression-evaluate | e.g. 3x − 2 at x = 5 |
| Describe positions on the full coordinate grid (all four quadrants) | Shapes | coord-four-quadrants | |
| Angles at a point sum to 360° (find the missing angle) | Shapes | angle-at-point | |
| Angles on a straight line sum to 180° (find the missing angle) | Shapes | angle-on-line | |
| Vertically opposite angles are equal | Shapes | angle-vertical | |
| Calculate and interpret the mean as an average | Statistics | mean-calc, mean-find-missing | |
| Find the median, mode, and range of a small data set | Statistics | median, mode, range | Y6 / Y7 transition |

## Coverage gaps

This is the honest list of National Curriculum objectives the app does not yet practise. Pull requests welcome.

### Year 3 — gaps

- **Measure perimeter with a ruler.** The Shapes module practises perimeter on rectangles whose side lengths are given as numbers; there is no skill that asks the kid to measure a printed length with a real ruler.
- **Tell time to the nearest minute on a non-clock display (durations using "past" and "to" language).** The Time module asks for the digital time in H:MM form; "twenty-five to four" style answers are not yet supported.
- **Use bar models or part-whole diagrams for missing-number problems.** Question prompts are text-only.

### Year 4 — gaps

- **Recognise and write decimal equivalents to 1/4, 1/2, 3/4.** Implicitly covered by `fraction-to-decimal`, but there is no specifically-targeted "common-denominator decimals" skill.
- **Solve problems with negative numbers in context (temperature).** The `negative-count` skill teaches counting through zero but not contextual problems.
- **Statistics: solve comparison, sum and difference problems using bar charts.** Bar-chart comparison is in scope but multi-step bar arithmetic is currently a Y5 difficulty in this app.

### Year 5 — gaps

- **Equivalent fractions and decimal recall to 1/8, 1/5, 1/10.** Recall tables are not surfaced as a dedicated skill, only the conversion.
- **Compare and order fractions whose denominators are all multiples of the same number.** Comparison currently focuses on same-denominator or unrelated fractions, not multiples-of-the-same.
- **Reading scales involving decimals (rulers, jugs, weighing scales).** Visual scales are not yet rendered.
- **Convert between units of capacity using decimal notation.** `volume-L-mL` uses integer conversions; decimal conversion is a near-miss.

### Year 6 — remaining gaps

The Y6 expansion (May 2026) covers the four strands in the Year 6 table above. The remaining gaps are minor:

- **Long division with remainders expressed as fractions or decimals.** Arithmetic division currently offers integer remainders only; expressing 17 ÷ 4 as `4 1/4` or `4.25` is a future addition.
- **Two-step ratio word problems in scaled-up contexts.** The dedicated `ratio-share` skill solves the bare ratio question; embedding it in a "Sara has £40 and shares it with Tom in ratio 3:5" word-problem still routes through Word Problems and is not yet wired to a Y6 difficulty curve.
- **Algebra with two unknowns.** The `missing-number` skill handles one unknown (e.g. `3a + 4 = 10`); simultaneous equations are out of scope for Y6.

## How to contribute

If you spot a misclassified objective, an undercounted gap, or an area you can fill in, please open an issue or a pull request. The contributor guide is at [`CONTRIBUTING.md`](../../CONTRIBUTING.md) at the repo root, and the architecture overview at [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) describes the folder shape every module follows.

Mappings on this page are derived from the `CURRICULUM_TAGS` constant in each module's `src/modules/<name>/logic.ts`. If you change a mapping in code, please update this page in the same PR.
