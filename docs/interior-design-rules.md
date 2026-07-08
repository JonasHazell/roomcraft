# Interior Design Rules — rule catalog for the rule engine

This document is a structured catalog of rules for furnishing residential homes: building codes and Swedish standards, international guidelines, industry best practice, and feng shui. The rules are sorted in descending order of importance (level 5 → 1) and written so that each rule can be translated into an automated check.

## Field schema

Each rule has the following fields:

| Field | Meaning |
|---|---|
| **ID** | Unique identifier with category prefix (SAF, ACC, ERG, FEN, LGT, COL, ACO, AES) |
| **Category** | Safety, Accessibility, Ergonomics & dimensions, Feng shui, Light, Color & textiles, Acoustics, Aesthetics |
| **Room** | Room type(s) the rule applies to — `All` if room-independent |
| **Importance** | 5 = critical … 1 = fine-tuning (see scale below) |
| **Measurability** | `A` = automatically measurable from floor plan/model (geometry, dimensions, placement) · `D` = partial — requires object metadata (e.g. material type, light source) · `M` = manual — requires asking the user or a photo |
| **Condition** | The measurable/testable condition. Condition met = rule passed |
| **Source** | Code, standard, or tradition the rule rests on |
| **Remedy** | Template for the improvement suggestion when the rule is violated |

## Importance scale

| Level | Name | Meaning | Suggested score weight |
|---|---|---|---|
| 5 | Critical | Personal or fire safety. Violations should always be flagged red | 16 |
| 4 | Basic function | The room cannot be used as intended, or excludes people with disabilities | 8 |
| 3 | Ergonomics & placement | Established dimensions and placements for comfort and well-being — includes the core feng shui rules | 4 |
| 2 | Comfort & atmosphere | Light, color, acoustics, order, energy flow | 2 |
| 1 | Aesthetics & fine-tuning | Styling, proportion, harmony | 1 |

**Scoring proposal:** total score = Σ(weight × passed) / Σ(weight × applicable), computed per category and overall. Rules with measurability `M` should be excludable from the score and shown as a checklist instead. The feng shui category should be toggleable on/off as a whole for users who don't want it, but weighted like the other categories when it is on.

**Source caveat:** BBR and SS rules are requirements for new construction/alteration, not for furnishing an existing home — the rule engine uses them as quality benchmarks. Feng shui rules rest on tradition (the Form School/Compass School), not on standards; they are cited with the source `Feng shui`.

---

# Level 5 — Critical rules (safety)

### SAF-01 — Escape route must not be blocked
- **Category:** Safety · **Room:** All · **Importance:** 5 · **Measurability:** A
- **Condition:** Clear passage ≥ 80 cm from every occupied area (bed, seating group, dining area, workspace) to at least one escape route (door or openable window). No furniture in the way.
- **Source:** BBR 5:3 (evacuation), MSB
- **Remedy:** Move {furniture} so that the path from {location} to {escape route} is clear (at least 80 cm wide).

### SAF-02 — Doors must open fully
- **Category:** Safety · **Room:** All · **Importance:** 5 · **Measurability:** A
- **Condition:** No furniture stands within any door's swing area (the door leaf's sweep). The door must be able to open at least 90°.
- **Source:** BBR 5:3, best practice
- **Remedy:** Move {furniture} out of the door's swing area so that {door} can open fully.

### SAF-03 — Escape window must be accessible
- **Category:** Safety · **Room:** Bedroom, children's room, living room · **Importance:** 5 · **Measurability:** A
- **Condition:** If a window serves as an alternative escape route: clear floor area ≥ 60 cm in front of the window, and no tall furniture blocking the opening.
- **Source:** BBR 5:323
- **Remedy:** Move {furniture} so that the window in {room} can be reached and opened unobstructed.

### SAF-04 — Smoke alarm unobstructed and correctly placed
- **Category:** Safety · **Room:** All · **Importance:** 5 · **Measurability:** D
- **Condition:** At least one smoke alarm per floor (recommended: one per bedroom + outside the bedroom door), mounted on the ceiling at least 50 cm from the wall, not obscured by tall cabinets or shelving.
- **Source:** BBR 5:2513, MSB general guidance
- **Remedy:** Add/move a smoke alarm in {room}; keep 50 cm clear around it.

### SAF-05 — Tall furniture must be anchored against tipping
- **Category:** Safety · **Room:** All, especially children's rooms · **Importance:** 5 · **Measurability:** D
- **Condition:** Furniture taller than 75 cm that can tip (bookcases, dressers, non-built-in wardrobes) is anchored to the wall. In children's rooms this applies to all climbable furniture.
- **Source:** Swedish Consumer Agency, IKEA/industry standard, ASTM F2057 (int.)
- **Remedy:** Anchor {furniture} to the wall with anti-tip restraints.

### SAF-06 — Clearance around fireplaces and open flames
- **Category:** Safety · **Room:** Living room, kitchen · **Importance:** 5 · **Measurability:** A
- **Condition:** Combustible furniture and textiles ≥ 100 cm in front of wood stove/open fireplace; no curtains or textiles within 50 cm of the fireplace opening. Hearth plate of non-combustible material in front of the opening.
- **Source:** BBR 5:4, MSB
- **Remedy:** Move {furniture/textile} at least {distance} from the fireplace.

### SAF-07 — Stove clear of combustibles and correctly placed
- **Category:** Safety · **Room:** Kitchen · **Importance:** 5 · **Measurability:** A
- **Condition:** Stove/cooktop is not placed under a window with curtains and not immediately next to an openable window or door; no curtains or combustible storage within 50 cm to the side of the cooktop; clear space above the cooktop except for the extractor fan/hood.
- **Source:** BBR 5:4, Swedish kitchen practice, Swedish National Electrical Safety Board
- **Remedy:** Place the stove with at least 30–50 cm of countertop toward the window/door and remove curtains next to the cooktop.

### SAF-08 — Electrical installations in bathrooms per zone classification
- **Category:** Safety · **Room:** Bathroom · **Importance:** 5 · **Measurability:** D
- **Condition:** No outlets or non-IP-rated fixtures in zones 0–1 (in/above bathtub and shower); zone 1 requires at least IPX4 and SELV or RCD protection. Portable lamps and electrical appliances placed out of reach from bathtub/shower.
- **Source:** SS 436 40 00 (Swedish wiring regulations), Swedish National Electrical Safety Board, IEC 60364-7-701
- **Remedy:** Remove {electrical object} from zone {zone} or replace with an IP-rated fixed installation.

### SAF-09 — Cords and power strips out of walkways
- **Category:** Safety · **Room:** All · **Importance:** 5 · **Measurability:** D
- **Condition:** No loose cords cross walkways; power strips are not under rugs or pinched behind furniture; cable reels are fully unwound under high load.
- **Source:** Swedish National Electrical Safety Board, MSB
- **Remedy:** Reroute {cord} along the wall/baseboard or move {furniture needing power} closer to an outlet.

### SAF-10 — No heavy objects above where people lie or sit
- **Category:** Safety · **Room:** Bedroom, living room, children's room · **Importance:** 5 · **Measurability:** A
- **Condition:** No heavy shelves, large glass-framed pictures, or mirrors hang directly above a bed, crib, or the head end of a sofa. (Coincides with feng shui rule FEN-06.)
- **Source:** Child safety best practice; Feng shui
- **Remedy:** Move {object} to a wall without a bed/sofa beneath it, or replace with a lightweight, secured mounting.

### SAF-11 — Glass in furniture and walkways
- **Category:** Safety · **Room:** All, especially homes with children · **Importance:** 5 · **Measurability:** D
- **Condition:** Glass tables and glass doors in/near walkways are made of tempered or laminated glass; glass tables with sharp corners are avoided in homes with small children.
- **Source:** SS-EN 12150 (tempered glass), Swedish Consumer Agency
- **Remedy:** Switch to tempered glass or furniture with rounded corners in {room}.

### SAF-12 — Non-slip rugs in walkways
- **Category:** Safety · **Room:** Hallway, bathroom, stairs · **Importance:** 5 · **Measurability:** D
- **Condition:** Loose rugs in walkways and wet rooms have non-slip backing; no curled rug edges in passages; no loose rugs on stairs.
- **Source:** Fall prevention best practice (National Board of Health and Welfare, elderly safety)
- **Remedy:** Add non-slip backing under {rug} or remove it from the walkway.

### SAF-13 — Window safety in children's rooms
- **Category:** Safety · **Room:** Children's room · **Importance:** 5 · **Measurability:** A
- **Condition:** No climbable furniture (bed, dresser, desk) directly under an openable window above the ground floor; windows have restrictors.
- **Source:** BBR 8:231, Swedish Consumer Agency
- **Remedy:** Move {furniture} away from the window or install a window restrictor.

### SAF-14 — Radiators and ventilation must not be covered
- **Category:** Safety · **Room:** All · **Importance:** 5 · **Measurability:** A
- **Condition:** Radiators are not covered by tightly placed furniture (sofa ≥ 10 cm from the radiator, not fully blocking it) or long curtains hanging over them; supply and exhaust air vents are unobstructed.
- **Source:** Fire/energy best practice, Boverket
- **Remedy:** Pull {furniture} forward at least 10 cm and shorten the curtain above the radiator.

---

# Level 4 — Accessibility and basic function

### ACC-01 — Main passages at least 90 cm
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** Walkways between rooms and to the home's main functions ≥ 90 cm wide (comfortable: 110 cm). Secondary passages (e.g. between coffee table and armchair) ≥ 60 cm.
- **Source:** SS 91 42 21, BBR 3:1, NKBA (int.)
- **Remedy:** Widen the passage at {location} from {measured} to at least 90 cm by moving {furniture}.

### ACC-02 — Wheelchair turning space
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** A clear turning circle with diameter ≥ 130 cm (normal level; 150 cm for enhanced level/ADA) exists in the entrance, kitchen, bathroom, bedroom, and living room.
- **Source:** SS 91 42 21, BBR 3:146, ADA (int.)
- **Remedy:** Free up a 130 cm circle in {room} by moving {furniture}.

### ACC-03 — Clear passage width in doorways
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** Clear passage width in doorways ≥ 80 cm with the door open 90°; no furniture narrows the opening.
- **Source:** BBR 3:143, SS 91 42 21
- **Remedy:** Move {furniture} that narrows the passage through {door} to less than 80 cm.

### ACC-04 — Maneuvering space at the door's handle side
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** Clear area ≥ 70 cm beside the door's handle side (on the pull side) so the door can be opened by a person using a wheelchair or walker.
- **Source:** SS 91 42 21
- **Remedy:** Keep 70 cm clear next to the handle side of {door}.

### ACC-05 — Access around the bed
- **Category:** Accessibility · **Room:** Bedroom · **Importance:** 4 · **Measurability:** A
- **Condition:** A double bed is reachable from both long sides with ≥ 60 cm clear (comfortable 70–80 cm); a single bed from at least one long side. At the foot end ≥ 60 cm if it is part of a walkway. Bed-making space per SS: 80 cm along one long side.
- **Source:** SS 91 42 21, best practice
- **Remedy:** Move the bed so that {side} gets at least 60 cm of clear width.

### ACC-06 — Clear area in front of storage
- **Category:** Accessibility · **Room:** Bedroom, hallway · **Importance:** 4 · **Measurability:** A
- **Condition:** ≥ 110 cm clear area in front of wardrobes and dressers (extended drawer/open door + person). At least 70 cm if the furniture is rarely used.
- **Source:** SS 91 42 21
- **Remedy:** Free up 110 cm in front of {storage furniture}.

### ACC-07 — Space at the dining area
- **Category:** Accessibility · **Room:** Dining area, kitchen · **Importance:** 4 · **Measurability:** A
- **Condition:** ≥ 60 cm of table width per seat; ≥ 70 cm from table edge to wall/furniture behind a chair (to pull out and stand up); ≥ 110 cm if others must pass behind someone seated.
- **Source:** SS 91 42 21, NKBA
- **Remedy:** Shift the table {direction} or reduce the number of place settings; behind {chair} there is only {measured} cm.

### ACC-08 — Kitchen work area: clear floor space in front of fittings
- **Category:** Accessibility · **Room:** Kitchen · **Importance:** 4 · **Measurability:** A
- **Condition:** ≥ 110 cm clear floor space in front of base cabinets, stove, dishwasher, and fridge (120 cm between opposing counter runs in a galley kitchen). An open dishwasher or oven door does not block the only passage.
- **Source:** SS 91 42 21, BBR 3:1, NKBA
- **Remedy:** Free up the floor space in front of {unit}; move {furniture}.

### ACC-09 — Clear space in the bathroom
- **Category:** Accessibility · **Room:** Bathroom · **Importance:** 4 · **Measurability:** A
- **Condition:** Clear area in front of the washbasin ≥ 70 × 110 cm; beside the toilet ≥ 80 cm on one side for transfer (enhanced level); no loose furniture shrinking the maneuvering area below a 130 cm circle.
- **Source:** SS 91 42 21, BBR 3:146
- **Remedy:** Remove/move {object} to restore clear space at {unit}.

### ACC-10 — The entrance's basic functions
- **Category:** Accessibility · **Room:** Hallway · **Importance:** 4 · **Measurability:** D
- **Condition:** Inside the entrance door there is a clear area ≥ 130 cm, seating for dressing/undressing, a surface to set things down, and coat hanging/shoe storage — without blocking the walkway.
- **Source:** SS 91 42 21, best practice
- **Remedy:** Add {missing function} to the hallway without encroaching on the passage.

### ACC-11 — Windows must be openable and reachable
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** Every openable window can be reached and used for airing without moving furniture; deep furniture (> 60 cm) does not stand flush against the window frame.
- **Source:** BBR 6:253 (airing), best practice
- **Remedy:** Move {furniture} so that the window in {room} can be opened.

### ACC-12 — Outlets and switches accessible
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** Switches by doors are not obscured by furniture; at least one outlet per functional area (bed, sofa, workspace) is accessible without moving furniture.
- **Source:** SS 437 01 02, best practice
- **Remedy:** Move {furniture} blocking {outlet/switch}.

### ACC-13 — The room must not be over-furnished
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** Clear floor area (not covered by furniture) ≥ 40 % of the room's area; in bedrooms and living rooms preferably ≥ 50 %.
- **Source:** Best practice, harmonizes with feng shui (free flow of chi)
- **Remedy:** The room has {measured} % clear floor area — remove or downsize {suggested furniture}.

### ACC-14 — Every function has its minimum area
- **Category:** Accessibility · **Room:** All · **Importance:** 4 · **Measurability:** A
- **Condition:** The room's declared functions fit with their standard dimensions: sleeping area (bed + access), dining area (table + chair space), seating group (sofa + table + passage), workspace (desk ≥ 100 × 60 cm + chair). One function must not "borrow" from another so that both become unusable.
- **Source:** SS 91 42 21
- **Remedy:** {Function} does not fully fit in {room} — move it to {other room} or slim down {other function}.

---

# Level 3 — Ergonomics, dimensions, and placement

## Living room

### ERG-01 — Distance sofa–coffee table
- **Category:** Ergonomics & dimensions · **Room:** Living room · **Importance:** 3 · **Measurability:** A
- **Condition:** 30–45 cm between the front edge of the sofa and the coffee table — close enough to reach, far enough for legs.
- **Source:** Best practice (NKBA, industry practice)
- **Remedy:** Adjust the coffee table to 30–45 cm from the sofa (currently {measured} cm).

### ERG-02 — TV distance and TV height
- **Category:** Ergonomics & dimensions · **Room:** Living room, bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** Viewing distance 1.2–1.6 × the screen diagonal for 4K (approx. 2.5 × for HD); the center of the screen at seated eye height, approx. 90–110 cm above the floor; viewing angle from the main seat ≤ 30° from the screen's normal.
- **Source:** SMPTE/THX guidelines, ergonomic practice
- **Remedy:** With a {inch}-inch TV, the seat should be {range} m from the screen (currently {measured} m).

### ERG-03 — Conversation-friendly seating group
- **Category:** Ergonomics & dimensions · **Room:** Living room · **Importance:** 3 · **Measurability:** A
- **Condition:** Seats in a conversation group within 2.5–3.5 m of each other and oriented toward a common center; no seat fully turned away from the group.
- **Source:** Best practice (interior design practice)
- **Remedy:** Angle {armchair/sofa} toward the center of the group and keep distances under 3.5 m.

### ERG-04 — Surface within reach of every seat
- **Category:** Ergonomics & dimensions · **Room:** Living room · **Importance:** 3 · **Measurability:** A
- **Condition:** Every seat has a surface to set things down (coffee table, side table) within 45 cm reach, at roughly armrest height (45–60 cm).
- **Source:** Best practice
- **Remedy:** Place a side table by {seat}.

### ERG-05 — The sofa's placement in the room
- **Category:** Ergonomics & dimensions · **Room:** Living room · **Importance:** 3 · **Measurability:** A
- **Condition:** The sofa has its back against a wall or marks a room division with clear passage behind it (≥ 60 cm); it does not float unmotivated in the middle of the room. (Reinforced by FEN-13.)
- **Source:** Best practice; Feng shui
- **Remedy:** Place the sofa against {wall} or give it a clear backing (e.g. a console table).

## Dining area

### ERG-06 — Table and chair height in harmony
- **Category:** Ergonomics & dimensions · **Room:** Dining area, kitchen · **Importance:** 3 · **Measurability:** D
- **Condition:** Table height 72–75 cm with seat height 45 cm (difference 27–30 cm); bar stool: difference 25–30 cm relative to the bar counter.
- **Source:** SS-EN 1729, furniture industry standard
- **Remedy:** Switch to chairs with seat height approx. {table height − 29} cm.

### ERG-07 — Pendant lamp above the table
- **Category:** Ergonomics & dimensions · **Room:** Dining area, kitchen · **Importance:** 3 · **Measurability:** A
- **Condition:** Pendant hangs 55–65 cm above the tabletop (75–90 cm above a kitchen island) and is centered over the table; the shade's width ≤ the table's width − 30 cm.
- **Source:** Lighting industry practice (Ljuskultur)
- **Remedy:** Adjust the pendant to {target} cm above the table and center it.

## Bedroom

### ERG-08 — Headboard against a solid wall
- **Category:** Ergonomics & dimensions · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** The bed's headboard stands against a wall (not free-standing in the room, not against a window). (Coincides with FEN-03.)
- **Source:** Best practice; Feng shui
- **Remedy:** Turn the bed so that the headboard gets wall support at {wall}.

### ERG-09 — Nightstand at bed height
- **Category:** Ergonomics & dimensions · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** Nightstand at every used side of the bed, with its top within ±5 cm of the top of the mattress.
- **Source:** Best practice
- **Remedy:** Add a nightstand at {side} at a height of approx. {mattress height} cm.

## Kitchen

### ERG-10 — The work triangle
- **Category:** Ergonomics & dimensions · **Room:** Kitchen · **Importance:** 3 · **Measurability:** A
- **Condition:** The sum of the distances stove–sink–fridge is 4.0–8.0 m; no leg < 1.2 m or > 2.7 m; the triangle is not crossed by a through walkway and is not broken by tall cabinetry.
- **Source:** NKBA, kitchen industry practice
- **Remedy:** The triangle is {measured} m — move {unit} to get within 4–8 m.

### ERG-11 — Landing surfaces by stove and fridge
- **Category:** Ergonomics & dimensions · **Room:** Kitchen · **Importance:** 3 · **Measurability:** A
- **Condition:** ≥ 40 cm of counter space on both sides of the cooktop and ≥ 40 cm next to the fridge's opening side; ≥ 80 cm of continuous prep surface between cooktop and sink.
- **Source:** SS 91 42 21, NKBA
- **Remedy:** Free up counter space at {unit}.

### ERG-12 — Counter height matched to the user
- **Category:** Ergonomics & dimensions · **Room:** Kitchen · **Importance:** 3 · **Measurability:** M
- **Condition:** Counter height = the user's elbow height − 10 to 15 cm (standard 88–92 cm suits heights of 170–185 cm).
- **Source:** Ergonomic practice, SS 91 42 21
- **Remedy:** Consider a counter height of {recommendation} cm based on the user's height.

## Workspace

### ERG-13 — Desk dimensions and screen distance
- **Category:** Ergonomics & dimensions · **Room:** Home office, bedroom, living room · **Importance:** 3 · **Measurability:** A
- **Condition:** Desk ≥ 100 × 60 cm (screen work: depth ≥ 80 cm or monitor arm); screen 50–75 cm from the eyes with its top edge at eye height; desk height 68–74 cm or adjustable.
- **Source:** AFS 2020:1 (Swedish Work Environment Authority), SS-EN 527
- **Remedy:** Increase the desk depth or mount a monitor arm so the screen ends up 50–75 cm away.

### ERG-14 — Workspace perpendicular to the window
- **Category:** Ergonomics & dimensions · **Room:** Home office · **Importance:** 3 · **Measurability:** A
- **Condition:** The desk stands with its side toward the window — not with the screen in front of the window (backlight) or with the window directly behind the back (reflections).
- **Source:** AFS 2020:1, lighting practice
- **Remedy:** Rotate the desk 90° so that daylight falls in from the side.

## Feng shui — placement (core rules)

### FEN-01 — Bed in the command position
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** From the bed you can see the room's door without lying in a straight line with it; the bed stands diagonally from the door with a clear view of the entrance.
- **Source:** Feng shui (Form School)
- **Remedy:** Move the bed to the wall diagonal from the door so the door is visible from a lying position.

### FEN-02 — Avoid the coffin position
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** The foot of the bed does not point straight at the door.
- **Source:** Feng shui
- **Remedy:** Rotate or offset the bed so that the foot end is not in line with the door.

### FEN-03 — Bed not under a window
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** The headboard does not stand under or in front of a window; if unavoidable, compensate with a tall headboard and thick curtains.
- **Source:** Feng shui; coincides with ERG-08
- **Remedy:** Move the bed to a solid wall; alternatively a tall headboard + blackout curtain.

### FEN-04 — Bed not in the door–window line
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** The bed does not lie in the straight line between door and window (a draft of chi straight across the bed).
- **Source:** Feng shui
- **Remedy:** Offset the bed out of the door–window line.

### FEN-05 — No mirror facing the bed
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** No mirror (incl. mirrored wardrobe; a TV screen counts more leniently) reflects the bed from a lying position.
- **Source:** Feng shui
- **Remedy:** Move/angle the mirror, or cover the mirrored wardrobe with a curtain/film.

### FEN-06 — Nothing heavy above the bed
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 3 · **Measurability:** A
- **Condition:** No shelves, heavy pictures, ceiling beams, or deep sloped ceilings directly above the bed; the ceiling lamp does not hang directly over the body.
- **Source:** Feng shui; coincides with SAF-10
- **Remedy:** Move the bed or {object}; under a beam/sloped ceiling: a canopy that softens it.

### FEN-07 — Desk in the command position
- **Category:** Feng shui · **Room:** Home office · **Importance:** 3 · **Measurability:** A
- **Condition:** The person sitting at the desk sees the door and does not have their back to it; the back is supported by a wall. If impossible: a mirror showing the door.
- **Source:** Feng shui
- **Remedy:** Rotate the desk so the door is visible diagonally in front; otherwise place a small mirror by the screen.

### FEN-08 — The cook sees the door
- **Category:** Feng shui · **Room:** Kitchen · **Importance:** 3 · **Measurability:** A
- **Condition:** The person standing at the stove has a view of the kitchen entrance; otherwise compensate with a reflective surface (mirror, glossy backsplash) behind the cooktop.
- **Source:** Feng shui
- **Remedy:** Install a reflective backsplash behind the cooktop so the entrance is visible.

### FEN-09 — Fire and water in conflict
- **Category:** Feng shui · **Room:** Kitchen · **Importance:** 3 · **Measurability:** A
- **Condition:** The stove (fire) does not stand flush against or directly opposite the sink/fridge/dishwasher (water); at least 30–40 cm of counter (wood element) buffers between them.
- **Source:** Feng shui (Five Elements theory)
- **Remedy:** Let a counter section separate the cooktop from {water unit}.

### FEN-10 — No mirror directly facing the front door
- **Category:** Feng shui · **Room:** Hallway · **Importance:** 3 · **Measurability:** A
- **Condition:** No mirror hangs directly opposite the front door (it sends incoming chi back out); a mirror on a side wall in the hallway is, however, good.
- **Source:** Feng shui
- **Remedy:** Move the mirror to a wall perpendicular to the front door.

### FEN-11 — Clear and welcoming entrance
- **Category:** Feng shui · **Room:** Hallway · **Importance:** 3 · **Measurability:** A
- **Condition:** The front door can open at least 90° without hitting anything; clear area inside the door; the entrance is lit and not cluttered (shoes/outerwear have storage).
- **Source:** Feng shui; coincides with SAF-02/ACC-10
- **Remedy:** Clear the area inside the door and arrange storage for {objects}.

### FEN-12 — No arrow-straight chi corridor
- **Category:** Feng shui · **Room:** All · **Importance:** 3 · **Measurability:** A
- **Condition:** The front door is not in a straight, unbroken sightline with a large window or balcony door (chi rushes through). If the line exists: break it with a rug, furniture, plant, or ceiling lamp along the way.
- **Source:** Feng shui
- **Remedy:** Place {rounded furniture/plant/rug} in the line between door and window.

### FEN-13 — Sofa with backing in the room
- **Category:** Feng shui · **Room:** Living room · **Importance:** 3 · **Measurability:** A
- **Condition:** The sofa has its back against a wall and a view of the room's entrance; no main seat has its back directly to the door.
- **Source:** Feng shui (command position); coincides with ERG-05
- **Remedy:** Place the sofa against {wall} with a clear view of the door.

### FEN-14 — Sharp corners do not point at resting places
- **Category:** Feng shui · **Room:** Bedroom, living room · **Importance:** 3 · **Measurability:** A
- **Condition:** Sharp furniture corners and protruding wall corners ("poison arrows") do not point directly at the bed or main seat at close range (< 1 m); rounded shapes are preferred near resting places.
- **Source:** Feng shui (sha chi)
- **Remedy:** Angle {furniture}, choose a rounded alternative, or soften the corner with a plant.

---

# Level 2 — Light, color, acoustics, order, and energy

## Light

### LGT-01 — Three layers of light per room
- **Category:** Light · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Every room has (1) ambient light, (2) task light at every activity area, and (3) mood light. Rule of thumb: 5–7 light points in the living room, at least 3 in other rooms.
- **Source:** Ljuskultur, lighting industry practice
- **Remedy:** The room lacks {layer} — add {suggestion}.

### LGT-02 — Illuminance per function
- **Category:** Light · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Guide values: kitchen counter 500 lux, reading/work area 300–500 lux, bathroom mirror 300–500 lux (evenly from the sides), ambient light 100–200 lux, nighttime orientation light 5–20 lux.
- **Source:** SS-EN 12464-1 (adapted for homes), Ljuskultur
- **Remedy:** Strengthen the light at {area} to approx. {target} lux.

### LGT-03 — Uniform and warm color temperature
- **Category:** Light · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** 2700–3000 K in social and resting rooms, 3000–4000 K at work surfaces; do not mix color temperatures within the same field of view; CRI ≥ 80 (≥ 90 at mirrors and wardrobes).
- **Source:** Ljuskultur, best practice
- **Remedy:** Replace {light source} with {target} K for uniform light.

### LGT-04 — Glare-free lighting
- **Category:** Light · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** No unshielded light sources at eye height (seated 100–130 cm, standing 150–170 cm); pendants over tables shield the bulb; task light falls from the side, not from behind (shadows) or from the front (reflections).
- **Source:** SS-EN 12464-1, Ljuskultur
- **Remedy:** Shield or raise/lower {fixture}.

### LGT-05 — Make the most of daylight
- **Category:** Light · **Room:** All · **Importance:** 2 · **Measurability:** A
- **Condition:** Tall furniture (> 120 cm) does not stand in front of windows; reading and work areas are within 2 m of a window; light surfaces/mirrors on the wall opposite windows help dark rooms.
- **Source:** BBR 6:322 (daylight), best practice
- **Remedy:** Move {tall furniture} away from the window; place {function} closer to the daylight.

### LGT-06 — Screens free of reflections
- **Category:** Light · **Room:** Living room, home office · **Importance:** 2 · **Measurability:** A
- **Condition:** TV and computer screens do not face a window or an unshielded fixture.
- **Source:** AFS 2020:1, best practice
- **Remedy:** Angle the screen or add a curtain that removes the reflection.

### LGT-07 — Dimmable ambient light
- **Category:** Light · **Room:** Living room, bedroom, dining area · **Importance:** 2 · **Measurability:** M
- **Condition:** Ambient and mood lighting in social rooms is dimmable so the light level can follow the time of day.
- **Source:** Best practice, Ljuskultur
- **Remedy:** Put a dimmer on {fixture}.

## Color and textiles

### COL-01 — The 60-30-10 rule
- **Category:** Color & textiles · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Color distribution roughly 60 % base color (walls, large surfaces), 30 % secondary color (larger furniture, textiles), 10 % accent color (cushions, art, details).
- **Source:** Best practice (classic design theory)
- **Remedy:** The room is dominated by {n} equally strong colors — let {color} carry 60 % and reduce {color} to an accent.

### COL-02 — Limited palette
- **Category:** Color & textiles · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Max 3–4 colors beyond neutrals per room; adjacent rooms share at least one common color or tone for cohesion.
- **Source:** Best practice
- **Remedy:** Remove or replace objects in {deviating color}.

### COL-03 — Color by compass orientation
- **Category:** Color & textiles · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** North-facing rooms (cold light) get warm tones; south-facing rooms tolerate cooler/saturated colors; dark colors require good lighting (see LGT-01).
- **Source:** Best practice (color theory, NCS practice)
- **Remedy:** The room faces {direction} — consider a {warmer/cooler} shade.

### COL-04 — Vertical light gradient
- **Category:** Color & textiles · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Ceiling lighter than walls, walls lighter than floor (perceived as stable and gives a taller ceiling). Deliberate departures (dark ceiling in large rooms) are fine but should be precisely that — deliberate.
- **Source:** Best practice (spatial perception)
- **Remedy:** A lighter ceiling color raises the perceived ceiling height in {room}.

### COL-05 — Rug size in the seating group
- **Category:** Color & textiles · **Room:** Living room · **Importance:** 2 · **Measurability:** A
- **Condition:** The rug is large enough that at least all front legs of the seating group's furniture stand on it (ideally the whole pieces + 15–20 cm margin); it does not float like a postage stamp in the middle of the group.
- **Source:** Best practice
- **Remedy:** Switch to a rug of approx. {recommended size} so that {furniture} stands on it.

### COL-06 — The rug under the dining table
- **Category:** Color & textiles · **Room:** Dining area · **Importance:** 2 · **Measurability:** A
- **Condition:** A rug under the dining table extends ≥ 60–70 cm beyond the table on all sides so that chairs remain on the rug even when pulled out.
- **Source:** Best practice
- **Remedy:** The rug needs to be at least {table dimensions + 130} cm.

### COL-07 — Curtain hanging
- **Category:** Color & textiles · **Room:** All · **Importance:** 2 · **Measurability:** A
- **Condition:** Curtain rod/track sits 10–15 cm above the window frame or near the ceiling; the rod extends 15–25 cm beyond the frame on each side; curtain width 1.5–2 × the window's width; length to the floor (0–1 cm above) — not hovering at the bottom of the frame.
- **Source:** Best practice
- **Remedy:** Raise the track to {target} and choose floor-length curtains.

## Acoustics and air

### ACO-01 — Dampen hard rooms
- **Category:** Acoustics · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Rooms with hard surfaces (parquet/tile + large glass) have at least two of three dampeners: a large rug, heavier curtains, upholstered furniture. Large bare wall surfaces facing each other are broken up with a bookcase, textile, or acoustic panel.
- **Source:** Best practice (reverberation time, SS-EN ISO 3382 as reference)
- **Remedy:** Add {rug/curtain/upholstered furniture} in {room} to shorten the reverberation.

### ACO-02 — The bedroom dark and quiet
- **Category:** Acoustics · **Room:** Bedroom · **Importance:** 2 · **Measurability:** D
- **Condition:** The bedroom has blackout curtains/blinds and textiles that dampen sound; the bed does not stand flush against a wall shared with an elevator, kitchen, or bathroom if alternatives exist.
- **Source:** Best practice (sleep hygiene), BBR 7 (acoustic environment)
- **Remedy:** Add blackout curtains; try the bed against {quieter wall}.

### ACO-03 — Plants for air and well-being
- **Category:** Acoustics · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** At least one living plant per room (living room preferably 2–3 at varying heights); thriving, not wilting.
- **Source:** Best practice; feng shui (the wood element)
- **Remedy:** Place a plant {suited to the light conditions} in {room}.

## Feng shui — energy and order

### FEN-15 — Free of clutter
- **Category:** Feng shui · **Room:** All · **Importance:** 2 · **Measurability:** M
- **Condition:** Clear floor and table surfaces dominate; open storage is not overfilled; nothing is stacked on top of wardrobes and cabinets; there are no piles of papers/clothes.
- **Source:** Feng shui; coincides with best practice
- **Remedy:** Clear {surface} and give {objects} closed storage.

### FEN-16 — Nothing broken, nothing dead
- **Category:** Feng shui · **Room:** All · **Importance:** 2 · **Measurability:** M
- **Condition:** Broken clocks, cracked mirrors, broken lighting, and dead plants are repaired or removed; all lamps have working bulbs.
- **Source:** Feng shui
- **Remedy:** Repair or remove {object}.

### FEN-17 — The five elements in balance
- **Category:** Feng shui · **Room:** All · **Importance:** 2 · **Measurability:** D
- **Condition:** Every room contains at least 3 of 5 elements and is not completely dominated by one: wood (plants, wooden furniture, green), fire (candles, red/orange, triangles), earth (ceramics, beige/terracotta, squares), metal (metal details, white/gray, circles), water (glass, mirrors, blue/black, wave shapes).
- **Source:** Feng shui (Five Elements theory)
- **Remedy:** The room is dominated by {element} — add {missing element} via {examples}.

### FEN-18 — Soft plants, not spiky
- **Category:** Feng shui · **Room:** Bedroom, living room · **Importance:** 2 · **Measurability:** D
- **Condition:** Plants with soft, rounded leaves are preferred in resting and relationship areas; cacti and spiky plants are not placed in bedrooms or near seating groups.
- **Source:** Feng shui
- **Remedy:** Move {spiky plant} to a work area/north-facing window; replace with e.g. a pilea or calathea.

### FEN-19 — No water element in the bedroom
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 2 · **Measurability:** D
- **Condition:** Aquariums, fountains, and large water motifs in art do not belong in the bedroom (unrest/restlessness according to tradition).
- **Source:** Feng shui
- **Remedy:** Move {water object} to the living room or hallway.

### FEN-20 — Pair symmetry in the bedroom
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 2 · **Measurability:** A
- **Condition:** Both sides of the bed are furnished equally: two nightstands, two lamps (relationship symbolism and practical balance).
- **Source:** Feng shui; coincides with ERG-09
- **Remedy:** Add a nightstand and lamp at {side}.

### FEN-21 — Clean under the bed
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 2 · **Measurability:** M
- **Condition:** The space under the bed is empty, or contains only soft sleep-related textiles (bed linen); no storage of shoes, papers, or exercise equipment.
- **Source:** Feng shui
- **Remedy:** Empty the space under the bed; move {objects} to a wardrobe/storage.

### FEN-22 — Minimal electronics in the bedroom
- **Category:** Feng shui · **Room:** Bedroom · **Importance:** 2 · **Measurability:** D
- **Condition:** TV, computer, and exercise equipment are avoided in the bedroom; if there is a TV: a cabinet with a door or a textile that covers the screen at night.
- **Source:** Feng shui; coincides with sleep best practice
- **Remedy:** Move {device} or hide it in closed storage.

### FEN-23 — The bathroom does not leak energy
- **Category:** Feng shui · **Room:** Bathroom · **Importance:** 2 · **Measurability:** M
- **Condition:** The bathroom door is kept closed and the toilet lid down (symbolically: water drains chi); a bathroom door directly facing a bed or dining area is screened off.
- **Source:** Feng shui
- **Remedy:** Habit rule: close the door and lid; place a screen/plant between the bathroom door and {bed/table}.

---

# Level 1 — Aesthetics, styling, and harmony

### AES-01 — Art at the right height
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** A
- **Condition:** The picture's center 145–155 cm above the floor (eye height); above furniture: 15–25 cm between the top of the furniture and the bottom of the picture; for a gallery wall, the group's common center counts.
- **Source:** Best practice (gallery hanging)
- **Remedy:** Lower/raise {picture} to a center of approx. 150 cm.

### AES-02 — The art's width follows the furniture
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** A
- **Condition:** Art/mirror above a sofa, bed, or sideboard is approx. 2/3 of the furniture's width (50–75 % accepted) and is centered over the furniture, not over the wall.
- **Source:** Best practice
- **Remedy:** Choose a wider piece or group several to approx. {2/3 × furniture width} cm.

### AES-03 — Odd numbers and triangle composition
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** Still lifes and groups are styled in odd numbers (3 or 5) with varied heights forming a triangle; objects are grouped rather than spread out evenly.
- **Source:** Best practice (styling theory)
- **Remedy:** Regroup {surface} into three objects of different heights.

### AES-04 — Scale and height variation
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** A
- **Condition:** The furniture's scale matches the room (large rooms tolerate large furniture, small rooms require small-scale pieces); the room mixes at least three furniture heights (low/medium/tall) so the eye wanders.
- **Source:** Best practice (proportion theory)
- **Remedy:** Add a {tall/low} component, e.g. {suggestion}.

### AES-05 — Visual balance in the room
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** A
- **Condition:** Visual weight (large/dark furniture) is distributed around the room — not all heavy volumes along one wall while the rest stands empty.
- **Source:** Best practice
- **Remedy:** Balance {heavy side} with {furniture/bookcase/dark textile} on the opposite side.

### AES-06 — One focal point per room
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** The room has a clear focal point (fireplace, window view, artwork, main furniture piece) that the furnishing is oriented around; competing focal points (TV opposite a fireplace) are handled deliberately.
- **Source:** Best practice
- **Remedy:** Orient the seating group toward {focal point} and tone down {competitor}.

### AES-07 — Rhythm and repetition
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** Every accent color, shape, or material recurs in at least 2–3 places in the room (a single red cushion is a stranger; three red touches are a theme).
- **Source:** Best practice
- **Remedy:** Repeat {accent} in {n} more objects or remove it.

### AES-08 — Negative space
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** Walls and shelves have breathing room — leave approx. 20 % of wall and shelf surfaces empty; every room has at least one calm, unbroken surface.
- **Source:** Best practice; harmonizes with FEN-15
- **Remedy:** Thin out {wall/shelf}; let {surface} rest empty.

### AES-09 — Material mix
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** At least three different materials/textures per room (e.g. wood + textile + metal/stone/glass); not everything in the same wood type and finish.
- **Source:** Best practice
- **Remedy:** Break up {dominant material} with {suggested contrasting texture}.

### AES-10 — Coordinated metals and finishes
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** Max 2–3 metal finishes per room (e.g. brass + black), used consistently; hardware, fixtures, and details follow the palette.
- **Source:** Best practice
- **Remedy:** Replace {deviating finish} with {the home's main finish}.

### AES-11 — Light fixtures in harmony
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** D
- **Condition:** Fixtures in the same room share a design language or color (they need not be from one series); one statement fixture per room is enough.
- **Source:** Best practice
- **Remedy:** Let {fixture} be the soloist and choose more discreet companions.

### AES-12 — Personal over impersonal
- **Category:** Aesthetics · **Room:** All · **Importance:** 1 · **Measurability:** M
- **Condition:** The room contains personal objects (books, heirlooms, art, photos in well-chosen frames) — not only catalog furnishing; according to feng shui, photos of people belong in social areas rather than bedrooms.
- **Source:** Best practice; Feng shui
- **Remedy:** Bring {personal object} into {room}.

### FEN-24 — Bagua zones (requires orientation)
- **Category:** Feng shui · **Room:** All (the home as a whole) · **Importance:** 1 · **Measurability:** M
- **Condition:** The home's bagua map is laid over the floor plan (from the entrance or by compass). Each zone is supported by its element: wealth (SE, wood/purple), fame (S, fire/red), relationships (SW, earth/pairs), family (E, wood), health (center, earth/open space), children/creativity (W, metal), knowledge (NE, earth/books), career (N, water), helpful people/travel (NW, metal). In particular: the center of the home is kept open and light.
- **Source:** Feng shui (bagua, Compass/Form School)
- **Remedy:** Activate {zone} with {element/color/object}; free up the center of the home.

### FEN-25 — Color by the compass direction's element
- **Category:** Feng shui · **Room:** All · **Importance:** 1 · **Measurability:** M
- **Condition:** The room's dominant colors harmonize with the compass direction's element (N: blue/black, E/SE: green, S: red/warm tones, SW/NE: earth tones, W/NW: white/metal) — or deliberately depart using a supporting element.
- **Source:** Feng shui (Compass School)
- **Remedy:** The room lies in the {direction} — reinforce with {color/element}.

---

# Appendix — implementation tips for the rule engine

- **Applicability:** Each rule is only tested if its `Room` matches and the room's objects make it relevant (no TV → ERG-02 is skipped). Report "not applicable" separately from "passed".
- **Duplicates/reinforcements:** Some rules deliberately overlap across categories (ERG-08/FEN-03, SAF-10/FEN-06, ERG-05/FEN-13, ERG-09/FEN-20, ACC-10/FEN-11). The rule engine should link them so that the same geometric finding is not double-penalized in the total score, but they can be reported within their respective categories.
- **Measurability A** requires from the model: room polygon with doors/windows (position, width, swing direction), furniture with type, dimensions, rotation, and escape route markings. **D** requires object metadata (material, light source, color). **M** is handled with a checklist the user fills in.
- **Score display:** one total score + sub-scores per category (Safety, Accessibility, Ergonomics, Feng shui, Light, Color & textiles, Acoustics, Aesthetics), a list of violated rules sorted by importance, with the `Remedy` template filled in with actual objects and measurements.
- **Thresholds:** where ranges are given (e.g. 30–45 cm), the engine can award full points within the range, half points within ±20 %, and zero outside — this gives softer scoring than binary pass/fail.
