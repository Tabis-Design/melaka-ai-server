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
      return res.status(400).json({ answer: "Invalid question." });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "You are a friendly Roblox NPC guide for Melaka, Malaysia. Answer shortly, clearly, and educationally. Stay focused on Melaka history, culture, landmarks, and tourism. If the question is unrelated, politely redirect back to Melaka. Keep answers under 3 short sentences."
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
      console.log(data);
      return res.status(500).json({ answer: "AI service error. Please try again later." });
    }

    const answer = data.output_text || "I am not sure about that, but I can tell you about Melaka history and landmarks.";

    res.json({ answer: answer });
  } catch (error) {
    console.log(error);
    res.status(500).json({ answer: "Server error. Please try again later." });
  }
});

app.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});