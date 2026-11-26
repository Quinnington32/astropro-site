// Extra sublease / relet / lease takeover content. Written to be accurate and general.
// Anything state-specific is limited to statutes that were checked against the statute text.

export const tipsAndTricks = [
  ["Get approval in writing first", "Most leases require the landlord's consent to sublease or assign. Ask by email so you have a record, and wait for a written yes before you advertise or accept money."],
  ["Know which exit you are using", "A sublease usually keeps you on the lease. A lease takeover (assignment) moves the lease to the new tenant, with landlord approval. A relet lets the property find a replacement and release you. Ask your landlord which they allow and what each costs."],
  ["Remember you may still be responsible", "In a sublease you generally stay liable to the landlord for rent and damage if the subtenant does not pay. Pick someone reliable and ask what the landlord requires of a replacement."],
  ["Start early", "Rent keeps running until someone takes over. Listing weeks or months before your move-out date gives you more choices and more negotiating room."],
  ["Time it to the school calendar", "Demand peaks before fall semester, before spring semester and before summer sessions. Summer subleases are most wanted from March through May. Spring takeovers are most wanted in November and December."],
  ["Price it to move", "Look at what similar places near campus list for now. Pricing at or a little below comparable listings usually brings replies faster than waiting for a perfect price. A small discount costs less than another month of empty rent."],
  ["Show it well", "Bright, tidy photos of every room, the floor plan, what is included (parking, furniture, utilities) and exact dates sell a place. Add a short video walkthrough if you can."],
  ["Be clear about the details", "List rent, deposit, utilities, lease end date, pet rules, parking, the move-in date, and whether the landlord has approved subleasing. Fewer unanswered questions means fewer wasted messages."],
  ["Screen the replacement", "Ask for a student or government ID, a way to verify income or a guarantor, and references. Many landlords run their own application on the replacement. Let them, and let them make the final call."],
  ["Meet in person or on live video", "Tour together before anything is signed. A real student will happily do a live video walkthrough. Be cautious of anyone who refuses."],
  ["Put the deal in writing", "Use a written sublease or assignment that covers the dates, rent, deposit, who pays utilities, damage responsibility and what happens if someone moves out early. Your landlord or school may have a template."],
  ["Handle the deposit carefully", "Decide who holds the original deposit and who gets it back. If the subtenant also pays you a deposit, keep a receipt and a record of the unit's condition at move-in."],
  ["Document the condition", "Take dated photos or video of every room before the replacement moves in and at hand-off. This protects both of you from disputes later."],
  ["Use payment methods you can trace", "Take rent and deposits through the property, a bank transfer you can trace or another method with a record. Do not accept overpayment checks and never refund the difference."],
  ["Sort out utilities and parking", "Switch the utilities and any parking, gym or amenity accounts to the new tenant in writing, with a date, so nothing ends up in your name."],
  ["Keep paying until the takeover is final", "Do not stop paying rent until the landlord confirms in writing that the new tenant is on the lease or that you are released. A missed payment can cost you your deposit or hurt your credit."],
  ["Roommate leases need everyone", "If you share a lease, other co-tenants usually have to agree, and a new roommate may have to be approved by the landlord and by them."],
  ["Ask about relet fees", "Many properties charge a relet or lease-transfer fee. Compare it to your remaining rent. A fee that is lower than a month or two of rent is often the cheapest way out."],
  ["Check the lease for buyout and termination clauses", "Some leases allow an early termination for a set fee or a notice period. If you cannot find a replacement quickly, it may be cheaper than paying months of rent."],
  ["Warn your guarantor", "If a parent or other guarantor signed your lease, they are on the hook too. Tell them your plan and make sure any release covers them as well."],
];

export const calendarNote = "Demand tends to peak before each term. For summer subleases, list from March through May. For fall, list from June through August. For a spring takeover, list from November through January. If you are leaving mid-term, list as early as you can and price for the time left.";

export const scamFlags = [
  "Someone asks you to send a deposit or fee before you have seen the place or signed anything.",
  "The poster says they are out of the country or cannot meet and wants a wire transfer, gift cards, crypto or a payment app transfer.",
  "A buyer sends a check for more than the rent and asks you to send back the difference.",
  "The photos or the address appear in another listing, or the price is far below similar places nearby.",
  "A landlord or property manager is not listed anywhere you can verify.",
  "Anyone pushes you to move off the platform right away or rushes you to decide.",
];

// Only statutes confirmed against the statute text. Others point students to their state's rules.
export const stateNotes = {
  TX: {
    name: "Texas",
    paras: [
      "Texas law says that during a lease the tenant may not rent the leasehold to anyone else without the landlord's prior consent (Texas Property Code section 91.005). In practice that means you need your landlord's approval before you sublease or assign.",
      "Texas law also gives a landlord a duty to mitigate damages if a tenant abandons the lease early, and a lease clause that tries to waive that duty is void (section 91.006). That is one reason finding a replacement tenant and working with your landlord usually costs less than walking away.",
    ],
  },
};

export const defaultStateNote = (state) => `Landlord and tenant rules differ by state. Check ${state}'s landlord-tenant law or your school's off-campus housing or student legal services office for what applies to your lease.`;

export const specialSituations = [
  ["Military orders", "A service member who receives qualifying military orders may be able to end a residential lease early under the federal Servicemembers Civil Relief Act. It generally requires written notice and a copy of the orders, and for monthly rent the lease ends 30 days after the next rent due date."],
  ["Domestic violence, stalking and similar situations", "Many states let tenants end a lease early or avoid liability in these situations with proper notice or documentation. The rules differ by state. If you need help, the National Domestic Violence Hotline is 1-800-799-7233."],
  ["Unsafe or uninhabitable conditions", "Serious, unrepaired problems can sometimes let a tenant end a lease, but the steps are strict and vary by state. Give written notice and check with your school's student legal services before you move out."],
];

export const extraGuides = [
  ["sublease-agreement-checklist", "Sublease agreement checklist: what to include",
   "A checklist of what a student sublease agreement should include: dates, rent, deposit, utilities, damage, landlord approval and more.",
   "Sublease agreement checklist",
   "Put the deal in writing. Here is what to include.",
   [["Who is involved", "Names and contact details for you, the new tenant and the landlord, plus the address and unit."],
    ["Dates", "The start and end date of the sublease or takeover, and the move-in and move-out dates."],
    ["Rent and deposit", "The monthly rent, due date, how it is paid, the deposit amount, who holds it and when it is returned."],
    ["Landlord approval", "A line stating the landlord approved the arrangement, with a copy of the written approval attached."],
    ["Utilities, parking and amenities", "Who pays for what, and who changes the accounts into their name."],
    ["Condition and damage", "A move-in condition report with photos, and who pays for damage during the sublease."],
    ["Rules", "Pets, guests, smoking, quiet hours and anything else the original lease covers. The new tenant should receive a copy of the lease."],
    ["Ending early", "What happens if either side needs to leave early, and how much notice is required."]],
   [["Do I need a written sublease?", "Yes. A written agreement protects everyone and is far easier to rely on than a text conversation. Your landlord or your school's off-campus housing office may have a template."],
    ["Does a sublease agreement replace the landlord's permission?", "No. The agreement is between you and the new tenant. Most leases still require your landlord's approval."]]],
  ["how-to-price-a-sublease", "How to price a sublease",
   "How to price a student sublease so it fills quickly: check comparable listings, factor in term length and extras, and know when to discount.",
   "How to price a sublease",
   "A fair price fills the place faster and costs you less in the end.",
   [["Look at comparable places", "Search current sublease and rental listings near the same campus, with the same bedrooms and similar distance. Use those as your starting point."],
    ["Adjust for the details", "Furnished places, parking, utilities included and a short walk to campus can justify a higher price. Fewer months left, or an awkward move-in date, may need a discount."],
    ["Think in total cost", "A month of empty rent costs you the full amount. A small discount that fills the place sooner often saves you money."],
    ["Test and adjust", "If you have had no real replies in about a week, lower the price a little or improve the photos and description before changing anything else."]],
   [["Should I price below what I pay?", "Not always. If similar places are listed for more, you can ask for your rent. If you are close to your move-out date and no one has replied, a discount can be cheaper than more months of rent."],
    ["Can I charge more than I pay?", "Check your lease and local rules. Some leases or local laws limit what a subtenant can be charged, and you should be open with your landlord."]]],
  ["how-to-vet-a-subtenant", "How to vet a subtenant",
   "How to vet a subtenant or lease takeover tenant: verify identity, income or guarantor, references, and get the landlord's approval.",
   "How to vet a subtenant",
   "Choosing the right replacement protects your deposit and your credit.",
   [["Verify who they are", "Ask for a student or government ID and match it to the name on messages and payments."],
    ["Check they can pay", "Ask about income, a guarantor or a campus job, and talk to a previous landlord or roommate as a reference."],
    ["Meet them", "Tour in person or on live video together and see how they communicate. Reliable people answer questions plainly."],
    ["Let the landlord approve", "Most landlords run their own application on the replacement. Their approval is the one that counts."],
    ["Stay alert for scams", "Walk away from anyone who wants to pay with gift cards, overpay by check or rush you to skip the landlord."]],
   [["What should I ask a potential subtenant?", "Ask about their move-in date, how long they plan to stay, whether they have roommates or pets, and how they plan to pay."],
    ["Can I do a background or credit check?", "That is usually handled by the landlord. Doing your own checks involves consent and legal rules, so the landlord's application is the safer path."]]],
  ["subleasing-for-the-summer", "Subleasing for the summer: a student guide",
   "How to sublease your apartment for the summer: when to list, how to price a short term, and how to protect your lease.",
   "Subleasing for the summer",
   "Going home or interning away? Here is how to cover rent for the summer months.",
   [["List early", "Summer subleases are most wanted from March through May. The earlier you list, the more choices you have."],
    ["Check your lease", "Confirm that your lease allows subleasing and get the landlord's written approval. Make clear you plan to return in the fall."],
    ["Price for a short term", "Short terms often need a discount because the subtenant moves out again quickly. Offer furnished, utilities included or flexible dates to stand out."],
    ["Plan the handoff", "Agree on move-in and move-out dates, a cleaning plan, the deposit and who pays utilities, and take photos of the condition."]],
   [["Can I sublease just for the summer?", "Often yes with your landlord's approval. You usually stay on the lease and remain responsible for it."],
    ["Who pays the utilities?", "Agree in writing. Many students include utilities in a flat rent to keep it simple."]]],
  ["subleasing-while-studying-abroad", "Subleasing while studying abroad",
   "How to sublease your apartment while you study abroad: approval, timing, who handles problems, and paying rent from overseas.",
   "Subleasing while studying abroad",
   "Studying abroad doesn't have to mean paying rent on an empty place.",
   [["Get approval before you leave", "Ask your landlord for written permission to sublease for the semester."],
    ["Pick someone you can trust", "You will not be there to fix problems, so choose a reliable student and have a local contact, such as a friend, who can check in."],
    ["Set up payments", "Arrange how rent and the deposit are paid and how you will stay in touch across time zones."],
    ["Plan your return", "Agree on the exact move-out date so you have a place to come back to."]],
   [["Can I leave a friend in charge?", "A local friend can help, but the landlord still treats you as the tenant. Make sure the friend has clear instructions."]]],
  ["how-to-take-over-a-lease", "How to take over a lease",
   "How to take over someone else's lease as a student: finding takeovers, checking the details, getting landlord approval and avoiding scams.",
   "How to take over a lease",
   "A lease takeover can save you the deposit, the application fee and the wait.",
   [["Find takeovers", "Look in the student housing Facebook groups, school housing boards and sublease listings near campus. You can also ask property offices which units are being relet."],
    ["Read the lease", "Ask for a copy of the lease and check the rent, the end date and any fees or rules you would be agreeing to."],
    ["Get the landlord's approval", "Apply with the landlord. The takeover is not final until they approve it and put you on the lease or sign the paperwork."],
    ["See the unit", "Tour in person or on live video, and check the condition against move-in photos."],
    ["Avoid scams", "Never send money before you have seen the place and confirmed with the landlord that the takeover is real."]],
   [["Do I get a new lease?", "Sometimes. In a lease takeover you usually assume the remaining term of the existing lease. In a relet the property may sign you to a new lease."],
    ["Will I pay an application fee?", "The property may charge one, and it may charge the person leaving a transfer fee. Ask both before you commit."]]],
  ["ending-a-lease-early-special-situations", "Ending a lease early: special situations",
   "When a student can sometimes end a lease early: military orders, domestic violence and unsafe conditions. General information, not legal advice.",
   "Ending a lease early: special situations",
   "Most students need to find a replacement, but a few situations have their own rules.",
   specialSituations,
   [["Where can I get help?", "Your school's student legal services or off-campus housing office is a good first call, and local legal aid can help with your state's rules."]]],
];


// Official school resources, each URL confirmed from the school's own page.
export const officialResources = {
  "college-station-tx": [["Texas A&M Student Life: Leasing 101 and Off Campus Student Services", "https://studentlife.tamu.edu/education/leasing-101", "Leasing guidance from Off Campus Student Services, which also runs the AggieSearch housing tool."]],
  "ann-arbor": [["University of Michigan Off-Campus Housing: subleasing", "https://offcampus.umich.edu/article/sub-leasing", "Sublease guidance, a sublease agreement and an inventory checklist. Students can list an apartment for free on the site."]],
  "gainesville": [["UF Off Campus Life: frequently asked questions", "https://offcampus.ufl.edu/about/frequently-asked-question/", "Sublease steps, plus lease review through UF Student Legal Services. The Housing Locator also lists subleases."]],
  "austin-tx": [["UT Austin Off-Campus Living", "https://offcampus.utexas.edu", "The Off-Campus Housing Marketplace lets students find roommates or list a sublease. Legal Services for Students can review a lease."]],
  "boulder-co": [["CU Boulder Student Life: things to know about subletting", "https://www.colorado.edu/studentlife/2021/04/19/things-know-about-subletting", "Explains short-term and long-term subleases, and what to ask your property manager."]],
  "columbus": [["Ohio State Student Legal Services: subleasing", "https://studentlegal.osu.edu/sublease", "Explains what a sublease is, why a written agreement matters and how landlord permission works."]],
  "knoxville-tn": [["UT Knoxville: understanding subletting", "https://studentlife.utk.edu/off-campus-living/resources/understanding-subletting/", "UT students with written approval to sublet can list a unit on the off-campus housing site at no cost."]],
  "louisville-ky": [["University of Louisville off-campus housing", "https://louisville.edu/housing/options/communities/upperclass", "UofL students who live off campus can post sublease offers for free on the school's off-campus housing site."]],
  "champaign-il": [["Illinois Off-Campus Community Living: rights and responsibilities", "https://www.occl.illinois.edu/rights-and-responsibilities", "Tenant rights and responsibilities from the university's off-campus office."]],
  "lubbock-tx": [["Texas Tech Off-Campus Housing FAQ", "https://offcampushousing.ttu.edu/about/faq/", "Lease reviews are handled by Student Legal Services for students who pay the Student Service Fee."]],
  "lafayette-la": [["UL Lafayette renter's resources", "https://louisiana.edu/housing/choices-costs/off-campus-housing/renters-resources", "Covers subleasing terms in your lease and how to avoid rental scams."]],
  "syracuse-ny": [["Syracuse University student living: subleasing", "https://experience.syracuse.edu/student-living/?p=2585", "Explains what subleasing is and landlord notice rules."]],
  "milwaukee-wi": [["UW-Milwaukee: what is a sublease?", "https://uwm.edu/neighborhoodhousing/what-is-a-sublease-and-do-i-need-permission-from-my-landlord-to-sublease-my-room-or-entire-unit/", "Landlord approval is required, and UWM's listing service has a sublease tab."]],
  "houston": [["University of Houston: renting a room and subletting", "https://www.uh.edu/issso/housing/off-campus/renting-a-room/", "Warns that many landlords forbid subleasing and may not honor an unapproved arrangement."]],
};
