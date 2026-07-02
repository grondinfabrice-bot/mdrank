window.MDRANK_DATA = {
  categories: ["Ta mère", "Punchline", "Absurde", "Roast", "Vie quotidienne", "Défi du jour"],
  users: [
    { pseudo: "@Vanneur974", rank: "Vanneur confirmé" },
    { pseudo: "@MarmayVanne", rank: "Punchliner du quartier" },
    { pseudo: "@SniperMDR", rank: "Tireur de chute" },
    { pseudo: "@TonPseudo", rank: "Nouveau Vanneur" }
  ],
  punchlines: [
    {
      id: 1,
      pseudo: "@Vanneur974",
      category: "Ta mère",
      text: "Ta mère est tellement petite qu'elle utilise une pièce de 2 euros comme rond-point.",
      reactions: { laugh: 128, fire: 42, skull: 17, mind: 9, ice: 6 },
      superNotes: 4,
      score: 89,
      position: "#3 aujourd'hui",
      selectedReaction: "laugh",
      followed: false
    },
    {
      id: 2,
      pseudo: "@MarmayVanne",
      category: "Vie quotidienne",
      text: "Mon réveil sonne à 6h. Mon courage, lui, est encore en mode avion.",
      reactions: { laugh: 96, fire: 31, skull: 10, mind: 6, ice: 3 },
      superNotes: 6,
      score: 82,
      position: "#5 aujourd'hui",
      selectedReaction: "fire",
      followed: true
    },
    {
      id: 3,
      pseudo: "@SniperMDR",
      category: "Absurde",
      text: "J'ai rangé mes problèmes dans un tiroir. Maintenant le meuble me juge.",
      reactions: { laugh: 73, fire: 21, skull: 15, mind: 19, ice: 8 },
      superNotes: 3,
      score: 68,
      position: "#9 aujourd'hui",
      selectedReaction: "",
      followed: false
    },
    {
      id: 4,
      pseudo: "@Punch974",
      category: "Défi du jour",
      text: "Le lundi matin, même mon café demande un café.",
      reactions: { laugh: 141, fire: 37, skull: 12, mind: 8, ice: 4 },
      superNotes: 8,
      score: 94,
      position: "#1 défi",
      selectedReaction: "super",
      followed: false
    }
  ],
  challenge: {
    theme: "Le lundi matin",
    timeLeft: "12h 34min",
    top: [
      { position: 1, pseudo: "@Punch974", score: 71, text: "Même mon café demande un café." },
      { position: 2, pseudo: "@MarmayVanne", score: 64, text: "Mon réveil a posé sa démission." },
      { position: 3, pseudo: "@SniperMDR", score: 59, text: "Le lundi commence toujours sans mon accord." }
    ]
  },
  rankings: [
    { position: 1, pseudo: "@Vanneur974", text: "Ta mère est tellement petite...", score: 89, superNotes: 8 },
    { position: 2, pseudo: "@Punch974", text: "Le lundi matin, même mon café...", score: 86, superNotes: 7 },
    { position: 3, pseudo: "@MarmayVanne", text: "Mon réveil sonne à 6h...", score: 82, superNotes: 6 },
    { position: 4, pseudo: "@SniperMDR", text: "J'ai rangé mes problèmes...", score: 68, superNotes: 3 }
  ],
  reports: [
    {
      id: 101,
      pseudo: "@CompteMystere",
      category: "Roast",
      text: "Punchline retirée de l'affichage public en attente de modération.",
      reason: "Attaque une personne réelle"
    },
    {
      id: 102,
      pseudo: "@SpamRigolo",
      category: "Punchline",
      text: "Copie répétitive publiée plusieurs fois dans le feed.",
      reason: "Spam"
    }
  ],
  profile: {
    pseudo: "@TonPseudo",
    rank: "Nouveau Vanneur",
    stats: [
      { label: "Score moyen", value: "42", icon: "✦" },
      { label: "Punchlines", value: "7", icon: "✍" },
      { label: "Réactions reçues", value: "318", icon: "😂" },
      { label: "SuperNotes", value: "11", icon: "⭐" }
    ],
    badges: ["Première vanne", "Top 10 jour", "Défi tenté"]
  }
};
