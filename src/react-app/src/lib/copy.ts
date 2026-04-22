// Centralized user-facing copy. Tonally deadpan / tongue-in-cheek — the
// words carry the brand voice so the visual chrome can stay calm.
export const copy = {
    brand: {
        name: "WONT FIX",
        tagline: "The issue tracker that already knows how this ends.",
    },
    emptyStates: {
        issueList: "Nothing to fix. Suspicious.",
        initiativeList:
            "No initiatives yet. Or: one huge one called 'everything' — your call.",
        labelList: "No labels. Neutrality is also a label.",
        commentList: "No one has commented. Wise.",
    },
    loading: {
        issueList: "Summoning issues… this is fine.",
        generic: "Loading…",
    },
    toasts: {
        issueCreated: { title: "Filed.", description: "Good luck with it." },
        issueUpdated: {
            title: "Saved.",
            description: "Against our better judgment.",
        },
        issueClosedWontFix: {
            title: "Marked as won't fix.",
            description: "Classic.",
        },
        issueInstantSelfTriage: {
            title: "Respect.",
            description: "Instant self-triage.",
        },
        commentCreated: {
            title: "Comment posted.",
            description: "Thoughts received.",
        },
        commentUpdated: { title: "Updated.", description: "Revised for clarity." },
        commentDeleted: {
            title: "Comment deleted.",
            description: "As if it never happened.",
        },
        initiativeCreated: {
            title: "Initiative created.",
            description: "A new umbrella for your problems.",
        },
        initiativeUpdated: {
            title: "Initiative updated.",
            description: "New name, same chaos.",
        },
        initiativeArchived: {
            title: "Archived.",
            description: "Resting in the land of good intentions.",
        },
        initiativeUnarchived: {
            title: "Back from the dead.",
            description: "Hope you've got a plan this time.",
        },
        labelCreated: {
            title: "Label added.",
            description: "Taxonomy is a love language.",
        },
        labelUpdated: {
            title: "Label updated.",
            description: "Rebranded. Reborn.",
        },
        labelDeleted: { title: "Label removed.", description: "Unsorted." },
        copiedPrompt: {
            title: "Copied.",
            description: "Paste it into your LLM of choice.",
        },
        genericError: {
            title: "Nope.",
            description: "Try again — or don't, we're not your mom.",
        },
    },
    notFound: {
        title: "This issue is closed.",
        description: "Actually, it never existed. Move along.",
    },
} as const;
