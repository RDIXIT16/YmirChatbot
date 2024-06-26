const express = require("express");
const app = express();
const port = process.env.PORT ? process.env.PORT : 3000;
require("dotenv").config();
const path = require("path");
const SearchAI = require("./helper");
const cron = require("node-cron");
const axios = require("axios");
app.use(express.json());

app.get("/", async (req, res) => {
  return res.json({ message: "Hello world" });
});

app.post("/", async (req, res) => {
  const apiKey = req.header("auth");
  if (!apiKey) {
    return res.status(400).send({ error: "API key is missing" });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(400).send({ error: "Incorrect API Key" });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).send({ error: "Question is missing" });
  }

  if (question.trim().length < 6) {
    return res
      .status(400)
      .send({ error: "Message should be more than 6 character" });
  }

  const api = new SearchAI({ apiKey: process.env.GOOGLE_API_KEY });

  //checking if embedding exists
  const embeddingExists = await api.embeddingExists();
  if (!embeddingExists) {
    //creating embedding
    const directory = path.join(__dirname, "dataset.csv");

    await api.createEmbedding(directory);
  }
  console.log("question:", question);
  try {
    const response = await api.run(question);
    console.log("response: ", response);

    return res.json({ response: response });
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send({ error: "Unexpected error occured, try again" });
  }
});

cron.schedule("* * * * *", async () => {
  console.log("cron running");
  try {
    const res = await axios.get("http://ymirchatbot.onrender.com/");
    console.log(res.data);
  } catch (err) {
    console.log("err in res", err);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
