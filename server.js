import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let dailyQuizCache = null;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackDailyQuiz() {
  return {
    date: getTodayKey(),
    questions: [
      {
        question: "What is Melaka famous for?",
        answers: ["Its historical trading port", "Snow mountains", "Desert safaris"],
        correctIndex: 1,
        explanation: "Melaka was an important trading port with rich cultural history."
      },
      {
        question: "Which street in Melaka is famous for food and night markets?",
        answers: ["Jonker Street", "Oxford Street", "Wall Street"],
        correctIndex: 1,
        explanation: "Jonker Street is known for food, shopping, and its night market."
      },
      {
        question: "What old fort can visitors see in Melaka?",
        answers: ["A Famosa", "The Colosseum", "Great Wall"],
        correctIndex: 1,
        explanation: "A Famosa is one of Melaka's famous historical landmarks."
      },
      {
        question: "Which culture is strongly linked with Baba Nyonya heritage?",
        answers: ["Peranakan culture", "Viking culture", "Aztec culture"],
        correctIndex: 1,
        explanation: "Baba Nyonya culture is part of Melaka's Peranakan heritage."
      },
      {
        question: "What river is popular with tourists in Melaka?",
        answers: ["Melaka River", "Amazon River", "Nile River"],
        correctIndex: 1,
        explanation: "The Melaka River is a popular area for sightseeing and river cruises."
      },
      {
        question: "Why was Melaka important in history?",
        answers: ["It was a major trading hub", "It was a ski resort", "It was a desert kingdom"],
        correctIndex: 1,
        explanation: "Melaka became important because of trade between East and West."
      },
      {
        question: "Which famous red building is in Dutch Square?",
        answers: ["Christ Church", "Big Ben", "Eiffel Tower"],
        correctIndex: 1,
        explanation: "Christ Church is one of the famous red buildings in Dutch Square."
      },
      {
        question: "What food is Melaka known for?",
        answers: ["Chicken rice balls", "Tacos", "Sushi rolls"],
        correctIndex: 1,
        explanation: "Chicken rice balls are one of Melaka's well-known local foods."
      },
      {
        question: "What type of city is Melaka often called?",
        answers: ["A heritage city", "A snow city", "A space city"],
        correctIndex: 1,
        explanation: "Melaka is known for its heritage, culture, and historical landmarks."
      },
      {
        question: "Which hill in Melaka is linked with old ruins and history?",
        answers: ["St. Paul's Hill", "Mount Everest", "Hollywood Hill"],
        correctIndex: 1,
        explanation: "St. Paul's Hill is a historical site visited by many tourists."
      }
    ]
  };
}

function normalizeQuiz(parsed) {
  const fallback = fallbackDailyQuiz();
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  const cleanQuestions = questions.slice(0, 10).map(function (item, index) {
    const fallbackItem = fallback.questions[index];

    let answers = Array.isArray(item.answers) ? item.answers.slice(0, 3) : fallbackItem.answers;
    while (answers.length < 3) {
      answers.push(fallbackItem.answers[answers.length]);
    }

    let correctIndex = Number(item.correctIndex);
    if (Number.isNaN(correctIndex) || correctIndex < 1 || correctIndex > 3) {
      correctIndex = fallbackItem.correctIndex;
    }

    return {
      question: item.question || fallbackItem.question,
      answers: answers,
      correctIndex: correctIndex,
      explanation: item.explanation || fallbackItem.explanation
    };
  });

  while (cleanQuestions.length < 10) {
    cleanQuestions.push(fallback.questions[cleanQuestions.length]);
  }

  return {
    date: getTodayKey(),
    questions: cleanQuestions
  };
}

app.get("/", function (req, res) {
  res.json({ status: "Melaka AI server is running" });
});

app.post("/npc-chat", async function (req, res) {
  try {
    const question = req.body.question;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        answer: "Invalid question.",
        questions: [
          "What is Melaka famous for?",
          "Tell me about Melaka history.",
          "What places should I visit in Melaka?"
        ]
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: `
You are a friendly Roblox NPC guide for Melaka, Malaysia.

Always stay focused on Melaka, Malaysia.
Answer shortly, clearly, and educationally.
Keep the answer under 3 short sentences.

You must respond ONLY in valid JSON format like this:
{
  "answer": "your short answer here",
  "questions": [
    "follow up question 1",
    "follow up question 2",
    "follow up question 3"
  ]
}

The 3 questions must always be new follow-up questions related to the current answer.
Do not repeat the same questions every time.
Do not include markdown.
Do not include extra text outside JSON.
`
          },
          {
            role: "user",
            content: question
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        answer: "AI service error: " + (data.error?.message || "Unknown OpenAI error"),
        questions: [
          "What is Melaka famous for?",
          "Tell me about Melaka history.",
          "What places should I visit in Melaka?"
        ]
      });
    }

    let rawText = data.output_text || "";

    if (!rawText && data.output && data.output[0] && data.output[0].content && data.output[0].content[0]) {
      rawText = data.output[0].content[0].text || "";
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      parsed = {
        answer: rawText || "I can tell you more about Melaka history and landmarks.",
        questions: [
          "What is the history of Melaka?",
          "What landmarks can I visit in Melaka?",
          "What food is Melaka known for?"
        ]
      };
    }

    const answer = parsed.answer || "I can tell you more about Melaka.";
    const questions = Array.isArray(parsed.questions) && parsed.questions.length >= 3
      ? parsed.questions.slice(0, 3)
      : [
          "What is the history of Melaka?",
          "What landmarks can I visit in Melaka?",
          "What food is Melaka known for?"
        ];

    res.json({
      answer: answer,
      questions: questions
    });

  } catch (error) {
    res.status(500).json({
      answer: "Server error. Please try again later.",
      questions: [
        "What is Melaka famous for?",
        "Tell me about Melaka history.",
        "What places should I visit in Melaka?"
      ]
    });
  }
});

app.post("/npc-daily-quiz", async function (req, res) {
  try {
    const today = getTodayKey();

    if (dailyQuizCache && dailyQuizCache.date === today) {
      return res.json(dailyQuizCache);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: `
You are a Roblox quiz generator about Melaka, Malaysia.

Generate exactly 10 multiple-choice quiz questions about Melaka, Malaysia.
The quiz must be educational, simple, and suitable for Roblox players.

Respond ONLY in valid JSON:
{
  "questions": [
    {
      "question": "question 1",
      "answers": ["answer 1", "answer 2", "answer 3"],
      "correctIndex": 1,
      "explanation": "short explanation"
    }
  ]
}

Rules:
- Generate exactly 10 questions.
- Each question must have exactly 3 answers.
- correctIndex must be 1, 2, or 3.
- Only one answer should be correct.
- Keep questions short.
- Keep explanations under 2 short sentences.
- Focus only on Melaka history, landmarks, culture, food, tourism, and heritage.
- Do not include markdown.
- Do not include extra text outside JSON.
`
          },
          {
            role: "user",
            content: "Generate today's 10-question Melaka quiz."
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      dailyQuizCache = fallbackDailyQuiz();
      return res.json(dailyQuizCache);
    }

    let rawText = data.output_text || "";

    if (!rawText && data.output && data.output[0] && data.output[0].content && data.output[0].content[0]) {
      rawText = data.output[0].content[0].text || "";
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      parsed = fallbackDailyQuiz();
    }

    dailyQuizCache = normalizeQuiz(parsed);
    res.json(dailyQuizCache);

  } catch (error) {
    dailyQuizCache = fallbackDailyQuiz();
    res.json(dailyQuizCache);
  }
});

app.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});
