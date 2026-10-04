function deadlineAfter(days) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  deadline.setHours(23, 59, 59, 999);
  return deadline.toISOString();
}

window.SOCIETIES = [
  {
    id: "coding-club",
    name: "Coding Club",
    category: "Technical",
    interests: ["technology", "engineering", "making", "collaboration"],
    tagline: "Learn coding and build projects together.",
    members: "180 members",
    deadline: deadlineAfter(14),
    description: "A friendly place for NSUT students to learn programming, work on projects and take part in coding events.",
    criteria: ["Bring curiosity; experience is never a prerequisite.", "Be able to join one weekly evening session.", "Come ready to share what you learn with the group."],
    roles: [
      { title: "Tech Team", type: "Technical", description: "Build projects and support coding activities." },
      { title: "Content Creation", type: "Media", description: "Create posts and updates about club events." },
      { title: "Public Relations", type: "Outreach", description: "Share club news and connect with other student groups." }
    ]
  },
  {
    id: "fine-arts-society",
    name: "Fine Arts Society",
    category: "Cultural",
    interests: ["art", "design", "creative", "exhibitions"],
    tagline: "Make art, share ideas and build creative practice.",
    members: "92 members",
    deadline: deadlineAfter(8),
    description: "A creative community for NSUT students exploring drawing, painting, illustration, photography and collaborative art projects.",
    criteria: ["Bring curiosity; a portfolio is not required.", "Be open to sharing work and giving thoughtful feedback.", "Join studio sessions or help prepare campus exhibitions."],
    roles: [
      { title: "Fine Arts", type: "Creative", description: "Develop artwork and creative displays for society events." },
      { title: "Design", type: "Design", description: "Create posters and visual identities for upcoming activities." },
      { title: "Public Relations", type: "Outreach", description: "Help students hear about exhibitions and events." }
    ]
  },
  {
    id: "sports-committee",
    name: "Sports Committee",
    category: "Sports",
    interests: ["sports", "competition", "movement", "teamwork"],
    tagline: "Get active, play as a team and have fun.",
    members: "146 members",
    deadline: deadlineAfter(16),
    description: "A place for students to take part in sports, support campus teams and help organise friendly competitions.",
    criteria: ["All experience levels are welcome.", "Join one practice and one game night each week.", "Bring trainers and a good teammate attitude."],
    roles: [
      { title: "Operations", type: "Events", description: "Set up and run sports events and competitions." },
      { title: "Public Relations", type: "Outreach", description: "Promote matches and share results with students." },
      { title: "Content Creation", type: "Media", description: "Capture matches and create updates about sports activities." }
    ]
  },
  {
    id: "writing-publishing-society",
    name: "Writing & Publishing Society",
    category: "Literary",
    interests: ["writing", "editing", "publishing", "design"],
    tagline: "Make campus stories, zines and journals.",
    members: "74 members",
    deadline: deadlineAfter(11),
    description: "An editorial collective for essays, interviews, poetry, illustration and independently published campus projects.",
    criteria: ["No publishing experience is required.", "Be open to drafting, editing and collaborative feedback.", "Choose a part of the process to explore, from writing to production."],
    roles: [
      { title: "Editorial", type: "Writing", description: "Edit and develop essays, interviews and poetry for publication." },
      { title: "Design", type: "Design", description: "Design publication layouts, covers and supporting artwork." },
      { title: "Public Relations", type: "Outreach", description: "Share new issues and invite students to contribute." }
    ]
  },
  {
    id: "cultural-society",
    name: "Cultural Society",
    category: "Cultural",
    interests: ["events", "community", "organizing", "creative"],
    tagline: "Bring campus together through events.",
    members: "210 members",
    deadline: deadlineAfter(21),
    description: "We organise student events that celebrate creativity, culture and the different interests across NSUT.",
    criteria: ["Care about people, not polished CVs.", "Be able to help with one activity a month.", "Come with ideas and the patience to make them happen."],
    roles: [
      { title: "Operations", type: "Events", description: "Plan event schedules, logistics and setup." },
      { title: "Public Relations", type: "Outreach", description: "Promote events and coordinate with other societies." },
      { title: "Fine Arts", type: "Creative", description: "Create visual elements and decorations for events." }
    ]
  },
  {
    id: "music-and-dance-society",
    name: "Music and Dance Society",
    category: "Cultural",
    interests: ["music", "dance", "performance", "rehearsal"],
    tagline: "Perform, practise and enjoy the stage.",
    members: "118 members",
    deadline: deadlineAfter(6),
    description: "A society for NSUT students interested in music, dance and performances at campus events.",
    criteria: ["Every genre and experience level belongs here.", "Be up for one rehearsal or planning session a week.", "Bring your own instrument if you have one; we have a few to share."],
    roles: [
      { title: "Performance", type: "Stage", description: "Rehearse and perform at campus events." },
      { title: "Content Creation", type: "Media", description: "Capture rehearsals and performances for society updates." },
      { title: "Operations", type: "Events", description: "Organise rehearsals, performances and event setup." }
    ]
  },
  {
    id: "electronics-society",
    name: "Electronics Society",
    category: "Technical",
    interests: ["technology", "electronics", "engineering", "making"],
    tagline: "Explore electronics by making things.",
    members: "63 members",
    deadline: deadlineAfter(18),
    description: "A student society for learning about circuits, electronics and hands-on technical projects.",
    criteria: ["No previous electronics experience is needed.", "Join a project or workshop when you can.", "Be curious and work well with other students."],
    roles: [
      { title: "Electronics", type: "Technical", description: "Build and test electronics projects and prototypes." },
      { title: "Tech Team", type: "Technical", description: "Support demonstrations and technical workshops." },
      { title: "Operations", type: "Events", description: "Arrange materials and setup for project sessions." }
    ]
  },
  {
    id: "literary-society",
    name: "Literary Society",
    category: "Literary",
    interests: ["reading", "books", "discussion", "community"],
    tagline: "A place for books, writing and conversation.",
    members: "156 members",
    deadline: deadlineAfter(24),
    description: "A community for readers who want to explore books, poetry and ideas through reading groups and thoughtful discussion.",
    criteria: ["No specialist knowledge is needed to join.", "Be curious about different voices and perspectives.", "Join a reading group or help host a discussion."],
    roles: [
      { title: "Reading Groups", type: "Community", description: "Host discussions and help members discover books." },
      { title: "Editorial", type: "Writing", description: "Create reviews and reading guides for members." },
      { title: "Public Relations", type: "Outreach", description: "Invite students to readings and share society news." }
    ]
  }
];
