// War Room content: the 30-day plan, platform pages, daily tips and landlord templates. Pure data, no DOM.

// City helpers so every link lands on the student's own city.
export const cityInfo = (l) => {
  const raw = String(l.marketName || "").trim();
  const m = /^(.*?),\s*([A-Za-z]{2})\b/.exec(raw);
  const city = (m ? m[1] : raw.replace(/,.*$/, "")).trim() || "your city";
  const st = m ? m[2].toUpperCase() : "";
  const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { city, st, slug: st ? slug + "-" + st.toLowerCase() : slug, under: city.replace(/\s+/g, "_") + (st ? "," + st : ""), flat: city.toLowerCase().replace(/[^a-z]/g, ""), q: encodeURIComponent(city + (st ? ", " + st : "")) };
};

// Every platform gets its own page. url = where "Copy my post and open" goes; look = a second link to see the city's current listings.
// kind: rental sites, social & groups, campus, roommates.
export const platformList = (l, groupUrl) => {
  const c = cityInfo(l);
  const school = l.school || c.city;
  const sq = encodeURIComponent(school);
  const g = (u, q) => (u ? u.replace(/\/?$/, "/") + "search/?q=" + encodeURIComponent(q) : "");
  return [
    { id: "marketplace", kind: "social", name: "Facebook Marketplace", tag: "Free · Huge local reach", url: "https://www.facebook.com/marketplace/create/rental", lookLabel: "See rentals near " + c.city, look: "https://www.facebook.com/marketplace/category/propertyrentals", why: "Millions of students and young renters check Marketplace daily, and you can message people instantly. Your listing here sits next to the Facebook groups AstroPro already posts in for you, so it reaches people who never join groups.", steps: ["Choose Home for Rent, then fill in price, dates and bedrooms.", "Paste the listing text and add your photos.", "Publish, and watch your messages for scams."], copy: "long" },
    { id: "fbmore", kind: "social", name: "More Facebook groups", tag: "Free · We already posted in your city's groups", url: "https://www.facebook.com/search/groups/?q=" + encodeURIComponent(school + " housing sublease"), lookLabel: "Roommate groups near " + school, look: "https://www.facebook.com/search/groups/?q=" + encodeURIComponent(school + " roommates"), why: "AstroPro shares your listing to every Facebook group in your city from our main page. Add reach with groups only you know about: your major, your dorm, your hometown group, parents' groups, and international student groups.", steps: ["Open the search and join 3 groups for your school, major or dorm.", "Read each group's pinned rules, then paste your Facebook post.", "Tick this off when you've posted in at least 3."], copy: "fb" },
    { id: "craigslist", kind: "rental", name: "Craigslist", tag: "Free · Takes 5 minutes", url: "https://" + c.flat + ".craigslist.org/", lookLabel: "Sublets in " + c.city, look: "https://" + c.flat + ".craigslist.org/search/sub", why: "Free, and people still search it every day for sublets and short leases. It also brings in non-students such as interns, nurses and new hires.", steps: ["Make a free account so you can repost later. If the page doesn't match your area, choose the nearest city on craigslist.org.", "Choose housing, then sublets & temporary, and paste the listing text.", "Add photos and a general location only, never your unit number."], copy: "long" },
    { id: "zillow", kind: "rental", name: "Zillow", tag: "Free to list · Landlord OK needed", url: "https://www.zillow.com/rental-manager/", lookLabel: "Rentals in " + c.city, look: "https://www.zillow.com/" + c.slug + "/rentals/", why: "The biggest rental site in the US. Your Zillow Rental Manager listing also feeds Trulia and HotPads, which saves time. Check Zillow's current rules and fees, and only post if your landlord approved a sublease.", steps: ["Create a free Zillow Rental Manager account.", "Add a listing, paste the text and upload your photos.", "Publish, then reply to renters through Zillow."], copy: "long" },
    { id: "trulia", kind: "rental", name: "Trulia", tag: "Free through Zillow", url: "https://www.trulia.com/for_rent/" + c.under + "/", lookLabel: "Open Trulia for " + c.city, look: "https://www.zillow.com/rental-manager/", why: "Trulia is a separate search site where many renters look. Look at the competing prices in your city first so yours is competitive. Your Zillow Rental Manager listing shows up here, so there's no extra posting.", steps: ["Open Trulia for your city and look at similar places and their rents.", "If your price is higher, adjust it in Edit listing.", "Confirm your Zillow listing shows here, then tick this off."], copy: "long" },
    { id: "hotpads", kind: "rental", name: "HotPads", tag: "Free through Zillow", url: "https://hotpads.com/" + c.slug + "/apartments-for-rent", lookLabel: "Open HotPads for " + c.city, look: "https://www.zillow.com/rental-manager/", why: "HotPads is popular with younger renters because of its map search. Your Zillow Rental Manager listing appears here too.", steps: ["Open HotPads for your city and search near your address.", "Check that your listing appears with photos. If it doesn't, repost it from Zillow Rental Manager.", "Tick this off."], copy: "long" },
    { id: "apartments", kind: "rental", name: "Apartments.com", tag: "Usually paid · Great for price research", url: "https://www.apartments.com/" + c.slug + "/", lookLabel: "Rentals in " + c.city, look: "https://www.apartments.com/" + c.slug + "/", why: "Mostly used by property managers, and posting is often paid, so we use it for price research: what similar places rent for in your city. If your building lists here, link to it in your post.", steps: ["Open the city page and look at 3 similar places and their rents.", "Compare them with yours and adjust in Edit listing if you're higher.", "Tick this off."], copy: "short" },
    { id: "zumper", kind: "rental", name: "Zumper", tag: "Free for one listing", url: "https://www.zumper.com/apartments-for-rent/" + c.slug, lookLabel: "Rentals in " + c.city, look: "https://www.zumper.com/apartments-for-rent/" + c.slug, why: "A fast, mobile-first site that shares to other rental sites. Good for reaching people who search on their phone.", steps: ["Create a free account and choose List a property.", "Paste your text and add photos.", "Publish and reply to renters."], copy: "long" },
    { id: "padmapper", kind: "rental", name: "PadMapper", tag: "Free · Map search", url: "https://www.padmapper.com/apartments/" + c.slug, lookLabel: "Map of " + c.city, look: "https://www.padmapper.com/apartments/" + c.slug, why: "Renters search on a map and filter by price. Zumper powers it, so your Zumper listing can appear here.", steps: ["Open your city's map and check that your listing appears.", "If it doesn't, re-post it from your Zumper account.", "Tick this off."], copy: "long" },
    { id: "sublet", kind: "rental", name: "Sublet.com", tag: "Free · Built for subleases", url: "https://www.sublet.com/", lookLabel: "Search " + c.city, look: "https://www.sublet.com/", why: "Made for subleases, so everyone there is already looking for what you have.", steps: ["Create an account.", "Add your listing with dates and rent.", "Search " + c.city + " to see how you compare."], copy: "long" },
    { id: "leasebreak", kind: "rental", name: "LeaseBreak", tag: "Free · Strongest in big cities", url: "https://www.leasebreak.com/", lookLabel: "Search " + c.city, look: "https://www.leasebreak.com/", why: "A marketplace for lease takeovers. It's strongest in large cities, so it may be a slower source in a college town, but it costs nothing to list.", steps: ["Create an account and add your lease takeover.", "Paste the text and add photos.", "Check back in a week."], copy: "long" },
    { id: "uloop", kind: "campus", name: "Uloop", tag: "Free · College classifieds", url: "https://www.uloop.com/", lookLabel: "Search near " + school, look: "https://www.uloop.com/", why: "A classifieds site built for college students, with a page for many campuses.", steps: ["Find your school and choose Post a listing.", "Paste the text and add photos.", "Check back in a week."], copy: "long" },
    { id: "school", kind: "campus", name: "Your school's housing board", tag: "Free · Students only", url: "https://www.google.com/search?q=" + encodeURIComponent(school + " off campus housing post a sublet"), lookLabel: "Find " + school + "'s board", look: "https://www.google.com/search?q=" + encodeURIComponent(school + " off campus housing"), why: "Many schools run a free sublet board that only students and staff can use, which means fewer scams and more trust.", steps: ["Open the search and find your school's off-campus housing site.", "Sign in with your school account and choose Add a Listing.", "Paste the text and upload photos."], copy: "long" },
    { id: "reddit", kind: "social", name: "Reddit", tag: "Free · Read each group's rules", url: "https://www.reddit.com/search/?q=" + encodeURIComponent(school + " housing sublease") + "&type=sr", lookLabel: "Housing posts in " + c.city, look: "https://www.reddit.com/search/?q=" + encodeURIComponent(c.city + " sublease"), why: "Campus and city subreddits often have a monthly housing thread. People there trust a real post with details.", steps: ["Find your school or city subreddit and read its housing rules.", "Paste the Reddit post where it's allowed.", "Reply to comments and DMs quickly."], copy: "reddit" },
    { id: "instagram", kind: "social", name: "Instagram story", tag: "Free · Use your story image", url: "https://www.instagram.com/", lookLabel: "Housing pages for " + school, look: "https://www.instagram.com/explore/search/keyword/?q=" + encodeURIComponent(school + " housing"), why: "Stories reach friends of friends, and a good-looking story image gets shared. Many schools have housing and roommate pages that repost.", steps: ["Download your story image in the Marketing center and add it to your story.", "Add a link sticker with your listing link.", "DM your story to 3 housing or roommate pages for your school."], copy: "short" },
    { id: "groupme", kind: "campus", name: "GroupMe and Discord", tag: "Free · Ask a friend to post", url: "https://web.groupme.com/", lookLabel: "Find school groups", look: "https://www.google.com/search?q=" + encodeURIComponent(school + " groupme OR discord housing roommates"), why: "Every club, class and dorm has a group chat. A post from a member gets far more trust than a stranger's post.", steps: ["Ask 3 friends in different clubs or classes to post your short message.", "Post it yourself in your own groups.", "Tick this off."], copy: "short" },
    { id: "nextdoor", kind: "social", name: "Nextdoor", tag: "Free · Local neighbors", url: "https://nextdoor.com/", lookLabel: "Nextdoor in " + c.city, look: "https://nextdoor.com/", why: "Neighbors and local families sometimes have a student, intern or relative who needs a place.", steps: ["Open Nextdoor and choose For Sale & Free or Housing.", "Paste the short text with your link.", "Reply to neighbors."], copy: "short" },
    { id: "offerup", kind: "social", name: "OfferUp", tag: "Free · Local marketplace", url: "https://offerup.com/", lookLabel: "OfferUp near " + c.city, look: "https://offerup.com/", why: "A local marketplace app with many younger buyers. Rentals aren't its main use, so we treat it as an extra.", steps: ["Create a free account.", "Post your place with photos and the short text.", "Reply quickly and keep chats on the app."], copy: "short" },
    { id: "furnished", kind: "roommates", name: "Furnished Finder", tag: "Free to search · Interns and travelers", url: "https://www.furnishedfinder.com/", lookLabel: "Search " + c.city, look: "https://www.furnishedfinder.com/", why: "Used by travel nurses, interns and people on short work contracts, who often need furnished places for a few months.", steps: ["Create an account and add your furnished place.", "Mention flexible move-in dates.", "Reply fast. These renters decide quickly."], copy: "long" },
    { id: "roomster", kind: "roommates", name: "Roomster", tag: "Free to post", url: "https://www.roomster.com/", lookLabel: "Search " + c.city, look: "https://www.roomster.com/", why: "A roommate and room-rental site used across the US, which helps if you're renting a room inside a shared place.", steps: ["Create an account and add your room or place.", "Paste the text and add photos.", "Verify your profile so people trust you."], copy: "long" },
    { id: "roommates", kind: "roommates", name: "Roommates.com", tag: "Free to post", url: "https://www.roommates.com/", lookLabel: "Search " + c.city, look: "https://www.roommates.com/", why: "Long-running roommate site. If your place has roommates already, this finds someone who wants to join them.", steps: ["Create an account and post your room.", "Describe the roommates and the vibe.", "Reply to matches."], copy: "long" },
    { id: "spareroom", kind: "roommates", name: "SpareRoom", tag: "Free to post", url: "https://www.spareroom.com/", lookLabel: "Search " + c.city, look: "https://www.spareroom.com/", why: "A roommate-finding site with a big user base in the US and abroad, good for international students.", steps: ["Create an account and post your room.", "Add photos and move-in dates.", "Reply fast."], copy: "long" },
  ];
};

const T = (id, t, to, extra = {}) => ({ id, t, do: to, ...extra });

// The 30-day plan. We already share every listing to the Facebook groups in the student's city, so these days point at everything else.
export const PLAN = [
  { d: 1, title: "Launch day", tasks: [T("d1a", "Switch on your landlord check-ins (we email them every week for you)", "ll"), T("d1b", "Download your flyer and story image, then print 10 flyers", "mkt:flyer"), T("d1c", "Reply to 3 students who are looking for a place right now", "leads")] },
  { d: 2, title: "The big rental sites", tasks: [T("d2a", "Post on Zillow (it also feeds Trulia and HotPads)", "plat:zillow"), T("d2b", "Post on Craigslist", "plat:craigslist"), T("d2c", "Hang your flyers: campus boards, laundromats, coffee shops", "mkt:flyer")] },
  { d: 3, title: "Check your competition", tasks: [T("d3a", "Look at Trulia and compare rents. Adjust your price if you're higher", "plat:trulia"), T("d3b", "Check your listing appears on HotPads", "plat:hotpads"), T("d3c", "Message 3 more students from the Lead Finder", "leads")] },
  { d: 4, title: "Sublease sites", tasks: [T("d4a", "Post on Sublet.com", "plat:sublet"), T("d4b", "Post on Zumper", "plat:zumper"), T("d4c", "Answer every message within 2 hours and offer two tour times", "msgs")] },
  { d: 5, title: "Campus reach", tasks: [T("d5a", "Post on your school's housing board", "plat:school"), T("d5b", "Post on Uloop", "plat:uloop"), T("d5c", "Ask 3 friends in different clubs to share your link", "plat:groupme")] },
  { d: 6, title: "Go visual", tasks: [T("d6a", "Add your story image to Instagram with a link sticker", "plat:instagram"), T("d6b", "Post on Facebook Marketplace", "plat:marketplace"), T("d6c", "Check your command center: views but no messages? Improve your photos", "listing:edit")] },
  { d: 7, title: "Week one check-in", tasks: [T("d7a", "Ask your landlord for a relet-list update", "ll"), T("d7b", "Run your tours with the tour checklist", "help:tour"), T("d7c", "Message 3 more students from the Lead Finder", "leads")] },
  { d: 8, title: "Communities", tasks: [T("d8a", "Post on Reddit where it's allowed", "plat:reddit"), T("d8b", "Post on Nextdoor", "plat:nextdoor"), T("d8c", "Join 3 more Facebook groups (major, dorm, hometown) and post", "plat:fbmore")] },
  { d: 9, title: "Short-term renters", tasks: [T("d9a", "Post on Furnished Finder (interns, travelers)", "plat:furnished"), T("d9b", "Post on Roommates.com or SpareRoom", "plat:roommates"), T("d9c", "Follow up with everyone who asked a question", "mkt:posts")] },
  { d: 10, title: "Sharpen the offer", tasks: [T("d10a", "No tours yet? Drop the rent $25 to $50 or add a move-in perk", "listing:edit"), T("d10b", "Update your Marketplace post with the new price", "plat:marketplace"), T("d10c", "Scan for new students looking for housing", "leads")] },
  { d: 11, title: "Fresh photos", tasks: [T("d11a", "Retake your best photo in daylight and replace it", "listing:edit"), T("d11b", "Print and hang flyers in 5 new spots near campus", "mkt:flyer"), T("d11c", "Post on Roomster", "plat:roomster")] },
  { d: 12, title: "Roommate pitch", tasks: [T("d12a", "Ask your current roommates to share your post with their friends", "mkt:posts"), T("d12b", "Post on OfferUp", "plat:offerup"), T("d12c", "Message 3 more students from the Lead Finder", "leads")] },
  { d: 13, title: "Book tours", tasks: [T("d13a", "Offer back-to-back tour slots on one day so people feel the demand", "msgs"), T("d13b", "Have the landlord's application link ready to send", "ll")] },
  { d: 14, title: "Two-week review", tasks: [T("d14a", "Look at your views and messages. What worked? Do more of it", "listing:share"), T("d14b", "Send your landlord an update", "ll")] },
  { d: 15, title: "Repost day", tasks: [T("d15a", "Repost on Craigslist so it jumps to the top", "plat:craigslist"), T("d15b", "Renew your Marketplace post", "plat:marketplace"), T("d15c", "Scan for new housing requests", "leads")] },
  { d: 16, title: "Parents and international students", tasks: [T("d16a", "Post in parent groups and international student groups", "plat:fbmore"), T("d16b", "Email your school's international student office and housing office", "mkt:posts")] },
  { d: 17, title: "Greek life and clubs", tasks: [T("d17a", "Ask a club, sorority, fraternity or RA to share your post", "plat:groupme"), T("d17b", "Message 3 more students", "leads")] },
  { d: 18, title: "Show it off", tasks: [T("d18a", "Record a 30-second video tour and post it to your story", "plat:instagram"), T("d18b", "Answer every message, follow up on every tour", "msgs")] },
  { d: 19, title: "New wording", tasks: [T("d19a", "Rewrite your title to lead with your best feature (Edit listing)", "listing:edit"), T("d19b", "Repost on Zillow with the new title", "plat:zillow")] },
  { d: 20, title: "Landlord push", tasks: [T("d20a", "Ask the landlord to refer people on their waitlist", "ll"), T("d20b", "Post a 'still available' bump", "mkt:posts")] },
  { d: 21, title: "Three-week check-in", tasks: [T("d21a", "Review your stats and drop your price if there's no interest", "listing:edit"), T("d21b", "Scan for new housing requests", "leads"), T("d21c", "Reprint flyers and replace torn ones", "mkt:flyer")] },
  { d: 22, title: "Move-in perk", tasks: [T("d22a", "Offer to cover part of the first month's rent or leave furniture", "listing:edit"), T("d22b", "Share the new offer on Marketplace and Instagram", "plat:marketplace")] },
  { d: 23, title: "Local boards", tasks: [T("d23a", "Hang flyers at gyms, churches and apartment-complex boards", "mkt:flyer"), T("d23b", "Post on Nextdoor again", "plat:nextdoor")] },
  { d: 24, title: "Warm contacts", tasks: [T("d24a", "Text 10 people you know who might need a place", "mkt:posts"), T("d24b", "Follow up with everyone who toured", "msgs")] },
  { d: 25, title: "Lead sweep", tasks: [T("d25a", "Scan for new housing requests and message 5 people", "leads"), T("d25b", "Repost on Reddit and your best Facebook groups", "plat:reddit")] },
  { d: 26, title: "Prepare to close", tasks: [T("d26a", "Ask the landlord exactly what their approval takes, and how long", "ll"), T("d26b", "Get the application link ready", "ll")] },
  { d: 27, title: "Vet your top choices", tasks: [T("d27a", "Meet in person or on live video, check ID, never take money early", "help:tour"), T("d27b", "Read the scam safety tips", "help:scams")] },
  { d: 28, title: "Close the deal", tasks: [T("d28a", "Send the landlord your pick and ask for approval in writing", "ll"), T("d28b", "Use the sign and hand-over checklist", "help:tour")] },
  { d: 29, title: "Last big push", tasks: [T("d29a", "Repost everywhere that has expired", "plat:zillow"), T("d29b", "Ask three people to share your listing one more time", "listing:share")] },
  { d: 30, title: "Review and relaunch", tasks: [T("d30a", "Look at what worked and do more of it", "listing:share"), T("d30b", "Refresh your listing with new photos and a new price, then keep going", "listing:edit")] },
];

export const TIPS = [
  "The fastest way to a sublease is being everywhere. Post on a new platform today.",
  "Reply within 2 hours. The first student to get an answer usually books the tour.",
  "Photos sell places. Bright daylight beats a perfect room.",
  "A $25 price drop gets more attention than a new description.",
  "Put the dates in the first line. Students search by move-in date.",
  "Offer two tour times in your first reply and the answer is nearly always yes.",
  "Landlords answer faster to a short, polite email than a long one.",
  "Ask a friend in a different major to share your post. New people see it.",
  "Print flyers. Almost no one else does, and campus boards still work.",
  "Mention what's included. Utilities, furniture and parking get the most clicks.",
  "Never take money before the landlord approves in writing.",
  "Keep posting. Most students find someone in the second or third week, not the first.",
  "Say 'tours this week' in your post. It creates urgency.",
  "Move-in perks win tours: a free week, furniture, or help with the first month.",
  "A short video tour doubles the replies on Instagram and Marketplace.",
  "Check your messages even at night. Students decide fast.",
  "Add a landmark to the title: 'Steps from the library.' Everyone knows where that is.",
  "Ask your landlord who's on the waitlist. They usually have people who missed out.",
  "Be specific about the price and dates. Vague posts get skipped.",
  "Reply to every person who asks, even to say it's taken. They tell friends.",
  "Bump your post with 'still available' and a fresh photo.",
  "Roommates sell a place. Mention who lives there and what they're like.",
  "Don't give up on week three. Early lease-end dates bring more people in.",
  "Post at night, 8 to 10 pm. That's when students scroll.",
  "A clean, tidy room is worth more than the price drop.",
  "Meet in person or on live video before anything else.",
  "The more places your link lands, the more your views climb.",
  "Update your landlord every week. The ones who hear from you remember you.",
  "Almost there. Keep every conversation going and ask for the application.",
  "Remember: keep posting and getting your sublease out there. You've got this.",
];

export const MOTIVATION = [
  "Remember: keep posting and getting your sublease out there.",
  "Every post is another chance. Keep going.",
  "Consistency beats luck. Do today's three things.",
  "Your next tenant is scrolling right now.",
];

// Landlord templates. Each has a name, when to use it, and builds a subject and body from the listing.
export const llTemplates = (l, k) => {
  const area = l.area, dates = k.dates, you = l.ownerName || "[Your name]";
  const word = l.type === "relet" ? "relet" : l.type === "assignment" ? "assign my lease at" : "sublease";
  return [
    { id: "permission", name: "Ask for permission", when: "Use this first, before you accept anyone.", subject: "Request to " + word + " my unit at " + area, body: "Hello,\n\nI'm a current tenant at " + area + " and I need to leave early. I'd like to ask what options I have to " + (l.type === "relet" ? "relet the unit" : l.type === "assignment" ? "assign my lease" : "sublease the unit") + " for " + dates + ".\n\nCould you please tell me:\n1. Whether this is allowed under my lease, and what approval you need in writing.\n2. What screening the new tenant must pass, and any fees.\n3. Whether I stay responsible on the lease, or can be released.\n4. How the security deposit would be handled.\n\nI'll find a qualified tenant and send you their application. Thank you for your help.\n\nBest,\n" + you },
    { id: "relet", name: "Confirm I'm on the relet list", when: "Send this in week one. Many landlords forget.", subject: "Confirming my spot on the relet list: " + area, body: "Hi,\n\nI'm reaching out to confirm that I'm on the relet list for " + area + ". I'm doing everything I can on my end to find a qualified tenant (" + dates + "), but I want to make sure you're also keeping my unit on your list.\n\nCould you please reply to confirm I'm on the list and let me know where my unit stands?\n\nThank you for your help.\n\nBest,\n" + you },
    { id: "weekly", name: "Weekly follow-up", when: "Once a week while you're still looking.", subject: "Relet update request: " + area, body: "Hi,\n\nI'm following up on my relet for " + area + ". Are there any prospective tenants or applications on your side, and is my unit still on your relet list? I'm happy to send over any tenant I find so you can start their application right away.\n\nThank you,\n" + you },
    { id: "waitlist", name: "Ask about their waitlist", when: "When you're not getting traction.", subject: "Do you have a waitlist for " + area + "?", body: "Hi,\n\nDo you have a waitlist or anyone who recently asked about units like mine at " + area + "? My unit is available " + dates + " at " + money(l.rent) + "/month, and I'd love to hand it over to someone from your list.\n\nIf it helps, I can send you a short listing with photos.\n\nThank you,\n" + you },
    { id: "tenant", name: "Introduce a new tenant", when: "As soon as you have someone interested.", subject: "Applicant for " + area, body: "Hi,\n\nI have a qualified person interested in taking over my unit at " + area + " for " + dates + ". Could you please send me the application link and the steps for approval?\n\nHere's who they are: [name, school or employer, move-in date].\n\nThank you,\n" + you },
    { id: "approval", name: "Ask for written approval", when: "Before you hand over keys or take rent.", subject: "Written approval request: " + area, body: "Hi,\n\nThank you for working with me. Could you please confirm in writing that you approve [new tenant's name] to " + (l.type === "relet" ? "take over" : l.type === "assignment" ? "take over my lease" : "sublease") + " the unit at " + area + " for " + dates + "?\n\nOnce I have your email approval I'll arrange the paperwork and move-in.\n\nThank you,\n" + you },
    { id: "release", name: "Ask about early termination", when: "If a sublease isn't allowed.", subject: "Early termination options for " + area, body: "Hi,\n\nI need to leave my unit at " + area + " early. Could you tell me about early termination or lease-break options, any fees, and how finding a replacement tenant changes them?\n\nI'm already marketing the unit and can send you applicants.\n\nThank you,\n" + you },
  ];
};

export const HELP = {
  dos: ["Meet in person or on live video before anything else.", "Get your landlord's approval in writing before accepting anyone.", "Reply within a few hours and offer two tour times.", "Take dated move-in photos with the new tenant.", "Keep every message in writing.", "Update your listing when the price or dates change."],
  donts: ["Never take a deposit or rent before the landlord approves.", "Never send keys, fobs or door codes before the paperwork is signed.", "Don't use gift cards, wire transfers or crypto.", "Don't share your unit number in public posts.", "Don't sign anything you haven't read.", "Don't stop posting after the first week."],
  scams: ["Someone offers to pay more than you asked, then asks you to send back the difference.", "They can't meet in person or on video, or say they're out of the country.", "They ask for money or a deposit before seeing the place.", "They push you to move fast or leave the platform to chat.", "Their messages mention a 'cashier's check' or a 'shipping agent'.", "Anything that feels too good to be true. Trust your gut."],
  faq: [["How long does it take to find someone?", "Most students find someone in two to four weeks. Posting in many places and replying fast is what shortens it."], ["Do I need my landlord's approval?", "Yes. Get it in writing before accepting a tenant. Use the Landlord center to ask for it and track it."], ["What if nobody messages?", "Check your photos and price first. Drop the rent $25 to $50, add a move-in perk, and post on a new platform."], ["Can I pause my listing?", "Yes. Go to My Listing and tap Pause. Turn it back on anytime."], ["What if I find someone elsewhere?", "Great. Tap Mark as filled in My Listing so the listing comes down."], ["How long does the listing stay live?", "60 days. If you still need someone near the end, you can extend it 30 more days."], ["Who sees my email?", "Only people you reply to. Messages from students arrive in your Messages center and your email."]],
};

export const TSH = [
  { title: "Before the tour", items: [["tsh1", "Get your landlord's approval in writing"], ["tsh2", "Offer two tour times in daylight, and have a roommate or friend there if you can"], ["tsh3", "Tidy the place and take fresh photos"]] },
  { title: "At the tour", items: [["tsh4", "Meet in person or on live video before anything else"], ["tsh5", "Check photo ID and that the name matches their application"], ["tsh6", "Show everything: appliances, parking, storage and any damage already there"], ["tsh7", "Go over the move-in date, rent due date and utilities"]] },
  { title: "After the tour", items: [["tsh8", "Send the landlord's application link or the office contact"], ["tsh9", "Wait for the landlord's approval in writing"], ["tsh10", "Never take money before approval"]] },
  { title: "Sign and hand over", items: [["tsh11", "Sign a written sublease or the landlord's own form"], ["tsh12", "Collect rent and deposit exactly as the paperwork says"], ["tsh13", "Walk through together and take dated move-in photos"], ["tsh14", "Send the photos to the landlord and the new tenant, then hand over keys, fobs and parking passes"], ["tsh15", "Mark your listing as filled here"]] },
];

const money = (n) => "$" + Number(n).toLocaleString("en-US");
