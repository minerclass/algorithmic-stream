/* The Algorithmic Stream: source bank.
   Every source here is an illustrative composite set in the fictional river
   town of Miller's Crossing. None of them is a real citation. The town, the
   1871 flood, the people, the station, and the archive are invented so that
   the game can teach lateral reading without putting a false reference into
   anyone's bibliography.

   reach:   which stretch of the river the source belongs to
   holds:   true when the source survives the audit as cited
   checks:  the three lateral-reading moves, each with the clue it reveals
            and whether that clue is a tell (points toward the verdict)
   verdict: the explanation shown in the debrief */

const STREAM_REACHES = [
  { id: "voice",  numeral: "I",   name: "Voice",   tagline: "Primary orality. What is known is what is remembered and retold.", speed: 0.55 },
  { id: "ink",    numeral: "II",  name: "Ink",     tagline: "Literacy. A mark that stays put can be revisited and compared.", speed: 0.75 },
  { id: "signal", numeral: "III", name: "Signal",  tagline: "Secondary orality. Broadcast voices reach everyone at once, on a schedule.", speed: 1.0 },
  { id: "feed",   numeral: "IV",  name: "Feed",    tagline: "Algorithmic secondary orality. People still speak, but the system decides who is heard.", speed: 1.35 },
  { id: "phantom", numeral: "V",  name: "Phantom", tagline: "Tertiary algorithmicity. The system now produces the words as well as ranking them.", speed: 1.7 }
];

const STREAM_SOURCES = [
  /* ---- Reach I: Voice ------------------------------------------------- */
  {
    id: "voice-hale",
    reach: "voice",
    title: "Recollection of Saima Hale",
    year: "recorded 1912",
    claim: "My grandmother woke the street when the ferry bell rang at two in the morning. By the time the church bell answered, the water was in the lane.",
    holds: true,
    checks: {
      who: { text: "Recorded by a county historical society interviewer in 1912. Hale was eleven in 1871 and lived two streets from the levee.", tell: false },
      evidence: { text: "She names two specific bells and their order. Neither detail is dramatic; both are checkable against the written record.", tell: true },
      others: { text: "The clerk's ledger entry for March 2, 1871 reads \"ferry bell rung 2 o'clock, church bell after.\" The order matches.", tell: true }
    },
    verdict: "Holds. An oral recollection, recorded decades later, that is corroborated in its specific details by a written source made the same night. Memory is evidence when it can be checked against something that stayed put."
  },
  {
    id: "voice-rhyme",
    reach: "voice",
    title: "Children's skipping rhyme about the '71 water",
    year: "collected 1898",
    claim: "\"March thaw, levee gone, / count the lanterns, count them wrong.\" Sung by children in the lower town for a generation after the flood.",
    holds: true,
    checks: {
      who: { text: "Written down by a schoolteacher in a notebook now held by the county library. The teacher dated the entry and named the street.", tell: false },
      evidence: { text: "The rhyme carries the season (the March thaw) and the fact of the breach. It carries no numbers you could cite as fact.", tell: true },
      others: { text: "The engineer's 1872 report attributes the breach to thaw water behind the levee. The season agrees.", tell: true }
    },
    verdict: "Holds, for what it is. A rhyme is evidence of how a community remembered an event, not a record of casualties or causes. Cited for memory, it holds. Cited for a death toll, it would not."
  },
  {
    id: "voice-tavern",
    reach: "voice",
    title: "Tavern retelling: \"they dynamited the levee\"",
    year: "recorded 1950",
    claim: "An unnamed speaker insists the levee was blown on purpose to spare the mill on the far bank, and that everyone in town knew it.",
    holds: false,
    checks: {
      who: { text: "The speaker is not named. The recording was made by a visiting folklorist who noted \"told as common knowledge, no first-hand claim.\"", tell: true },
      evidence: { text: "The story has a motive and a villain but no date, no name, and no document. It explains the flood; it does not describe it.", tell: true },
      others: { text: "The engineer's 1872 report found thaw water and a rotten sill. No other source in the stream mentions dynamite.", tell: true }
    },
    verdict: "Fails as cited. A rumor told as common knowledge, uncorroborated and contradicted by the engineering record. It is a real recording of a real belief, but it cannot carry a claim about what caused the breach."
  },

  /* ---- Reach II: Ink -------------------------------------------------- */
  {
    id: "ink-ledger",
    reach: "ink",
    title: "County clerk's ledger, March 1871",
    year: "1871",
    claim: "Dated entries record bell times, water marks on the courthouse steps, and twenty-three names listed under \"lost to the water.\"",
    holds: true,
    checks: {
      who: { text: "Kept by the county clerk as part of his duties. The hand is consistent with his entries from the previous year.", tell: false },
      evidence: { text: "Entries are dated and specific. The water marks were measured in feet and inches against a fixed step.", tell: true },
      others: { text: "The 1912 Hale recording and the 2019 library scan both point back to this ledger. It is the source the others lean on.", tell: true }
    },
    verdict: "Holds. A contemporaneous administrative record, kept by someone whose job was to keep it, that later sources cite rather than contradict."
  },
  {
    id: "ink-engineer",
    reach: "ink",
    title: "Engineer's report on the levee breach",
    year: "1872",
    claim: "Thaw water pooled behind the levee for three days before a rotten timber sill gave way near the ferry landing.",
    holds: true,
    checks: {
      who: { text: "Commissioned by the county and signed by a state engineer. His name appears on two other levee reports from the same decade.", tell: false },
      evidence: { text: "Includes measurements, a sketch of the failed section, and the names of three workmen who inspected it.", tell: true },
      others: { text: "The ledger's water marks rise over the three days the report describes. Nothing in the stream contradicts it except the tavern story.", tell: true }
    },
    verdict: "Holds. A technical report with named authorship and physical evidence, consistent with the ledger. It is the source that settles the cause."
  },
  {
    id: "ink-pamphlet",
    reach: "ink",
    title: "Pamphlet: \"The Flood Was a Judgment\"",
    year: "1871",
    claim: "A printed sermon argues that the lower town was punished for keeping the tavern open on Sundays.",
    holds: true,
    checks: {
      who: { text: "Printed by a local church press and signed by its minister. The library holds two copies.", tell: false },
      evidence: { text: "The pamphlet offers no evidence about the flood itself. Its evidence is scripture. It is a document about how some people explained the event.", tell: true },
      others: { text: "The ledger confirms the tavern existed and the minister was in town. Nothing confirms or denies a judgment.", tell: false }
    },
    verdict: "Holds, as a document. A real printed sermon is good evidence of what one part of the town argued, and poor evidence of why the levee broke. The audit accepts it because citing a source for what it is was the right move."
  },

  /* ---- Reach III: Signal ---------------------------------------------- */
  {
    id: "signal-radio",
    reach: "signal",
    title: "Radio retrospective: \"Sixty-five years since the water\"",
    year: "1936",
    claim: "A thirty-minute program interviews three survivors and reads the clerk's ledger entries aloud on air.",
    holds: true,
    checks: {
      who: { text: "Produced by the regional station's news desk. The station's log lists the broadcast date and the producer.", tell: false },
      evidence: { text: "The survivors are named. The ledger passages read on air match the ledger word for word.", tell: true },
      others: { text: "The 1912 Hale recording and the ledger line up with what the survivors say. The program adds voices; it does not add new claims.", tell: true }
    },
    verdict: "Holds. A broadcast that names its sources and reads from the written record. Secondary orality at its most careful: the voice carries, but the ledger is still underneath it."
  },
  {
    id: "signal-drama",
    reach: "signal",
    title: "Television docudrama: \"The Night the Levee Went\"",
    year: "1971 centennial",
    claim: "A dramatization in which the mill owner is shown lighting a fuse. Opening card: \"based on true events.\"",
    holds: false,
    checks: {
      who: { text: "Made by a production company for the centennial. Writers are credited; no historian is.", tell: true },
      evidence: { text: "The dialogue is invented. \"Based on true events\" covers the flood, not the fuse.", tell: true },
      others: { text: "The engineer's report found a rotten sill, not a fuse. The drama adapted the tavern rumor because it made a better scene.", tell: true }
    },
    verdict: "Fails as cited. A dramatization is a source about 1971 television, not about 1871. Its most memorable scene comes from the one rumor the record contradicts."
  },

  /* ---- Reach IV: Feed ------------------------------------------------- */
  {
    id: "feed-library",
    reach: "feed",
    title: "Library history account: scanned ledger page",
    year: "2019",
    claim: "A post from the county library's account shares a scan of the March 2, 1871 ledger page with a link to the full digitized volume.",
    holds: true,
    checks: {
      who: { text: "The account is the library's own, linked from the library website. The post names the archivist who made the scan.", tell: false },
      evidence: { text: "The scan is readable and the link resolves to the catalogue entry for the ledger.", tell: true },
      others: { text: "It is the ledger. The post is a doorway to a source, not a new source.", tell: true }
    },
    verdict: "Holds. A feed post is not automatically weak. This one is an institution pointing at its own archive with a working path back to the original."
  },
  {
    id: "feed-viral",
    reach: "feed",
    title: "Viral post: \"The 1871 flood killed 400\"",
    year: "2021",
    claim: "A widely shared image with the number 400 in large type over a painting of a river. Forty thousand shares.",
    holds: false,
    checks: {
      who: { text: "An anonymous account that posts \"forgotten history\" images daily. No location, no sources, no replies to questions.", tell: true },
      evidence: { text: "No source for the number. The painting is of a different river. The share count is the only large number that is real.", tell: true },
      others: { text: "The ledger lists twenty-three names. Nothing in the stream supports four hundred.", tell: true }
    },
    verdict: "Fails as cited. Reach is not evidence. The number was never sourced, and the one contemporaneous record gives a figure seventeen times smaller."
  },
  {
    id: "feed-digest",
    reach: "feed",
    title: "Feed digest: \"What everyone is saying about the flood\"",
    year: "2024",
    claim: "An automatically assembled summary of the most engaged posts about the flood, presented as a consensus.",
    holds: false,
    checks: {
      who: { text: "No author. The digest is generated from engagement rankings. It summarizes whatever was shared most.", tell: true },
      evidence: { text: "Its evidence is other posts, weighted by shares. The 400 figure appears in it because the viral post was popular, not because it was right.", tell: true },
      others: { text: "The digest contradicts the ledger on the death toll and repeats the dynamite story from the docudrama.", tell: true }
    },
    verdict: "Fails as cited. This is the system ranking human voices by engagement and calling the result consensus. The quiet, correct sources did not make the cut."
  },

  /* ---- Reach V: Phantom ----------------------------------------------- */
  {
    id: "phantom-gazette",
    reach: "phantom",
    title: "AI answer citing the Miller's Crossing Gazette, March 3, 1871",
    year: "generated 2026",
    claim: "A chatbot reply quotes a front-page story: \"At two o'clock the bell was heard, and by three the lower town was a lake.\" It gives a page number.",
    holds: false,
    checks: {
      who: { text: "A chatbot. Asked for its source, it repeats the citation with more confidence and a different page number.", tell: true },
      evidence: { text: "The quotation appears nowhere except in chatbot output. The wording blends the Hale recording and the ledger.", tell: true },
      others: { text: "The library catalogue shows the Gazette began publishing in 1879. There is no March 1871 issue to quote.", tell: true }
    },
    verdict: "Fails as cited. A fluent, specific, fabricated citation. The page number and the exact date are the tell: fabrications are often more precise than the record they imitate."
  },
  {
    id: "phantom-transcript",
    reach: "phantom",
    title: "AI-assisted transcript of the Hale recording",
    year: "2026",
    claim: "A machine-generated transcript of the 1912 recording, reviewed by an archivist, with timestamps and a link to the audio file.",
    holds: true,
    checks: {
      who: { text: "Published by the county archive. The archivist who checked the transcript is named, and the audio is linked.", tell: false },
      evidence: { text: "Every line has a timestamp. You can play the audio and hear the words. The tool did the typing; the archive did the checking.", tell: true },
      others: { text: "It is the Hale recording, which the ledger corroborates.", tell: true }
    },
    verdict: "Holds. Machine assistance did not make this fabricated. What matters is whether the path back to the original exists and whether a person stands behind it. Both are true here."
  },
  {
    id: "phantom-photo",
    reach: "phantom",
    title: "\"Photograph\" of the breach, night of March 2, 1871",
    year: "generated 2025",
    claim: "A dramatic image of water pouring through a levee under moonlight, captioned as a period photograph.",
    holds: false,
    checks: {
      who: { text: "No photographer is named. The file's metadata records an image-generation tool and a prompt.", tell: true },
      evidence: { text: "Night photography of fast-moving water was not possible in 1871. The lantern in the frame casts two shadows.", tell: true },
      others: { text: "The archive holds no photographs of the flood. The first photograph of the levee in its collection is from 1888.", tell: true }
    },
    verdict: "Fails as cited. A generated image presented as a record. The technology of 1871 could not have made it, and the archive has never held it."
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { STREAM_REACHES, STREAM_SOURCES };
}
