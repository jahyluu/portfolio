// desktop content. first drafts from my resume, rewrite before launch

export const PROFILE = {
  name: 'Jahy Luu',
  title: 'Software Engineer',
  location: 'Houston, TX',
  email: 'jahyluu.swe@gmail.com',
  github: 'https://github.com/jahyluu',
  linkedin: 'https://www.linkedin.com/in/jahy-luu',
  resume: '/resume.pdf',
}

// TODO: write this properly
export const BIO = [
  "I'm a software engineer in Houston. I graduated from the University of Houston with a B.S. in Computer Science in May 2026.",
  "Right now I build a 3D robotics simulator for kids at Smart Kids University, in Three.js and WebGL. Before that I worked on backend and automation projects, and I tutored data structures and algorithms for three years.",
  "Outside of work I play League, make fan art, and build things like this site.",
]

export const EXPERIENCE = [
  { role: 'Software Engineer', company: 'Smart Kids University', dates: 'Jul 2025 – Present' },
  { role: 'Software Engineering Intern', company: 'Allure Skin and Wellness', dates: 'Mar 2024 – Nov 2024' },
  { role: 'Computer Science Tutor', company: 'University of Houston', dates: 'Aug 2023 – May 2026' },
  { role: 'Contract Software Engineer', company: 'Fiverr', dates: 'Mar 2023 – May 2024' },
]

export const STACK: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Java', 'Python', 'TypeScript', 'JavaScript', 'C++', 'SQL', 'GLSL', 'HTML/CSS'] },
  { group: 'Frameworks', items: ['Spring Boot', 'React', 'Node.js', 'Three.js', 'WebGL', 'Tailwind CSS', 'Selenium'] },
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
}

// TODO: screenshots, repo links, longer write-ups
export const PROJECTS: Project[] = [
  {
    id: 'hydrius',
    name: 'Project Hydrius',
    tagline: 'Scalable multiplayer Minecraft network',
    stack: ['Java', 'Spring Boot', 'RabbitMQ', 'Redis', 'JUnit'],
    color: '#5b8def',
    summary: [
      'Multiplayer infrastructure built with one other developer. Spring Boot services and RabbitMQ keep events in sync across distributed Minecraft servers, with 99.9% uptime.',
      'Four custom plugins run player economies, live leaderboards and competitive events for 200+ concurrent players. Gameplay state is cached in Redis so actions never hit the database directly.',
      'A JUnit suite covers 90% of lines, including RabbitMQ event handling, cache consistency and failure paths.',
    ],
  },
  {
    id: 'cafe',
    name: 'This Portfolio',
    tagline: 'A low-poly cafe on a rainy night',
    stack: ['React', 'TypeScript', 'Three.js', 'React Three Fiber', 'GLSL'],
    color: '#c77dff',
    summary: [
      'The room you just came from. Everything is built in code with React Three Fiber: the people, the furniture, the rain on the glass and the park outside.',
      'The camera follows one spiral tied to scroll, so it moves smoothly in both directions and hands off to this desktop at the end.',
    ],
    repo: 'https://github.com/jahyluu',
  },
  {
    id: 'league-ml',
    name: 'League Match Predictor',
    tagline: 'Predicting match outcomes from 100k+ games',
    stack: ['Python', 'Scikit-learn', 'Pandas', 'NumPy'],
    color: '#4cc9a0',
    summary: [
      'Gradient-boosted models trained on 100k+ League of Legends matches. Feature engineering and GridSearchCV got it to 58% accuracy against a 50% coin-flip baseline.',
    ],
  },
  {
    id: 'outreach',
    name: 'Outreach Generator',
    tagline: 'Personalized LinkedIn messages with RAG',
    stack: ['Python', 'LangChain', 'ChromaDB', 'Streamlit', 'Groq'],
    color: '#f2a65a',
    summary: [
      'A full-stack generative AI tool that writes personalized LinkedIn messages from search data, using ChromaDB and semantic embeddings for retrieval.',
    ],
  },
]
