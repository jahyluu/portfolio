// desktop and phone content

export const PROFILE = {
  name: 'Jahy Luu',
  title: 'Software Engineer',
  location: 'Houston, TX',
  email: 'jahyluu.swe@gmail.com',
  github: 'https://github.com/jahyluu',
  linkedin: 'https://www.linkedin.com/in/jahy-luu',
  resume: '/resume.pdf',
}

export const BIO = [
  "I'm a software engineer in Houston. I graduated from the University of Houston with a B.S. in Computer Science in May 2026.",
  "I like engineering problems for the same reason I like chess: there's usually a straightforward answer and a better one, and finding the better one takes strategy. I'm most interested in backend and systems work, where an efficient design pays off every time it runs.",
  "Right now I build a 3D robotics simulator for kids at Smart Kids University, along with the data behind its AI tutor. Before that I built cloud pipelines and automation tools, and I tutored data structures and algorithms for three years.",
  "Outside of work I play League, chess and sports.",
]

export const EXPERIENCE = [
  { role: 'Software Engineer', company: 'Smart Kids University', dates: 'Jul 2025 – Present' },
  { role: 'Software Engineering Intern', company: 'Allure Skin and Wellness', dates: 'Mar 2024 – Nov 2024' },
  { role: 'Computer Science Tutor', company: 'University of Houston', dates: 'Aug 2023 – May 2026' },
  { role: 'Contract Software Engineer', company: 'Fiverr', dates: 'Mar 2023 – May 2024' },
]

export const STACK: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Java', 'Python', 'TypeScript', 'JavaScript', 'C++', 'SQL', 'GLSL', 'HTML/CSS'] },
  { group: 'Frameworks', items: ['Spring Boot', 'React', 'Node.js', 'Three.js', 'React Three Fiber', 'WebGL', 'Vite', 'Tailwind CSS', 'Selenium'] },
  { group: 'AI / ML', items: ['LangChain', 'Llama', 'Claude API', 'RAG (ChromaDB)', 'Scikit-learn', 'Pandas', 'NumPy'] },
  { group: 'Cloud & Data', items: ['AWS', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'RabbitMQ', 'Firebase'] },
  { group: 'DevOps & Testing', items: ['Git', 'Docker', 'GitHub Actions', 'Gradle', 'JUnit', 'JaCoCo', 'Postman'] },
]

export type Project = {
  id: string
  name: string
  tagline: string
  stack: string[]
  // folder color
  color: string
  summary: string[]
  repo?: string
  live?: string
  paper?: string
}

export const PROJECTS: Project[] = [
  {
    id: 'hydrius',
    name: 'Project Hydrius',
    tagline: 'Multiplayer Minecraft network with custom gamemodes',
    stack: ['Java', 'Spring Boot', 'RabbitMQ', 'Redis', 'REST APIs', 'JUnit'],
    color: '#5b8def',
    summary: [
      'A Minecraft network with custom gamemodes, built with one other developer and now retired. Spring Boot services and RabbitMQ keep events in sync across the servers, with 99.9% uptime.',
      'The hard part was concurrency on a budget. Chat, the economy and leaderboard stats all had to stay in sync for 200+ players at once, and we were students paying for our own servers. Splitting that work into small microservices let each one scale on its own and kept hosting cheap.',
      'I worked on all of the plugins with my teammate, including cross-server chat and private messaging. Gameplay state is cached in Redis so player actions never hit the database directly, and a JUnit suite covers 90% of lines, including event handling, cache consistency and failure paths.',
    ],
    repo: 'https://github.com/Project-Hydrius',
  },
  {
    id: 'cafe',
    name: 'This Portfolio',
    tagline: 'A low-poly cafe on a rainy night',
    stack: ['TypeScript', 'React', 'Three.js', 'React Three Fiber', 'GLSL', 'Vite', 'Vercel'],
    color: '#c77dff',
    summary: [
      'The room you just came from. Everything is built in code with React Three Fiber: the people, the furniture, the rain on the glass and the park outside. The camera follows one spiral tied to scroll, so it moves smoothly in both directions and hands off to this desktop at the end.',
      'Performance took the most work. Merging static meshes, trimming shadow casters and updating shadows every other frame cut draw calls by 58%, from 2,651 to 1,106 per frame.',
      'The 3D scene loads lazily behind the signature intro, which cut the JavaScript needed to start by 86%. The intro is drawn in a Web Worker so it stays smooth while the cafe loads, and all 37 shaders compile before it opens, so the first scroll doesn\'t stutter.',
    ],
    repo: 'https://github.com/jahyluu/portfolio',
  },
  {
    id: 'league-ml',
    name: 'League Match Predictor',
    tagline: 'Predicting match outcomes from 100k+ games',
    stack: ['Python', 'Scikit-learn', 'XGBoost', 'Pandas', 'NumPy', 'Riot API'],
    color: '#4cc9a0',
    summary: [
      'Built with Steven Vu. We pulled ranked matches from the Riot API and asked how well team composition alone can predict the winner, before a single minion spawns.',
      'Our paper started with 10,000 matches and compared Random Forest, XGBoost and a small neural network. The best reached 53%, and our error analysis pointed at unusual team comps and champions that play more than one role.',
      'After the paper we scaled the pipeline to 100k+ matches and reworked the features, which raised accuracy to 58% against a 50% coin-flip baseline.',
    ],
    paper: '/league-paper.pdf',
  },
  {
    id: 'outreach',
    name: 'Outreach Generator',
    tagline: 'Personalized LinkedIn messages with RAG',
    stack: ['Python', 'LangChain', 'ChromaDB', 'Streamlit', 'Groq'],
    color: '#f2a65a',
    summary: [
      'A generative AI app that writes personalized LinkedIn messages from search data, using ChromaDB and semantic embeddings for retrieval.',
    ],
    live: 'https://linkedincolddmgenerator.streamlit.app/',
    repo: 'https://github.com/jahyluu/Linkedin-DM-Generator-Public',
  },
]
