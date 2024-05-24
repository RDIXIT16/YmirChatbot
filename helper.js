const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} = require("@langchain/google-genai");
const { TaskType } = require("@google/generative-ai");
const { CSVLoader } = require("@langchain/community/document_loaders/fs/csv");
const path = require("path");
const directory = path.join(__dirname, "faiss");
const { PromptTemplate } = require("@langchain/core/prompts");
const {
  RunnableSequence,
  RunnablePassthrough,
} = require("@langchain/core/runnables");
const { formatDocumentsAsString } = require("langchain/util/document");
const { StringOutputParser } = require("@langchain/core/output_parsers");

class SearchAI {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    this.apiKey = apiKey;
    this.googleEmbedding = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-pro",
      maxOutputTokens: 2048,
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7,
      top_p: 0.85,
    });
  }

  run = async (query) => {
    if (!query) {
      throw new Error("query is required");
    }

    let vectorStore;

    try {
      vectorStore = await FaissStore.load(directory, this.googleEmbedding);
    } catch (err) {
      console.log(err);
      throw new Error("Run createEmbedding function first");
    }
    if (!vectorStore) {
      throw new Error("Error in embedding");
    }

    const retriever = vectorStore.asRetriever();

    const prompt =
      PromptTemplate.fromTemplate(`Answer the question based only on the following context:{context}
                                    Question: {question}. return only the answer string`);

    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      this.model,
      new StringOutputParser(),
    ]);

    try {
      const output = await chain.invoke(query);
      return output;
    } catch (err) {
      console.log(err);
      throw new Error("Error in generating output");
    }
  };

  createEmbedding = async (path) => {
    if (!path) {
      throw new Error("path is required");
    }
    //loading csv
    let docs;
    try {
      const loader = new CSVLoader(path);
      docs = await loader.load();
    } catch (err) {
      console.log(err);
      throw new Error("Unable to load csv file");
    }

    //creating vector db and saving it
    try {
      const vectorStore = await FaissStore.fromDocuments(
        docs,
        this.googleEmbedding
      );
      await vectorStore.save(directory);
    } catch (err) {
      console.log(err);
      throw new Error("Unable to save vector db");
    }
  };

  embeddingExists = async () => {
    try {
      await FaissStore.load(directory, this.googleEmbedding);
      return true;
    } catch (err) {
      return false;
    }
  };
}

module.exports = SearchAI;
