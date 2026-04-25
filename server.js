import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
      console.log("OPENAI ERROR:", data);
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
      console.log("JSON PARSE ERROR:", rawText);

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
    console.log("SERVER ERROR:", error);

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

app.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});
