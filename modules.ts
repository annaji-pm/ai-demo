import { openai } from '@ai-sdk/openai';
import { CoreMessage, cosineSimilarity, embed, embedMany, generateObject, generateText, streamText, tool } from "ai";
import { readFileSync } from 'fs';
import path from 'path';
import * as readline from 'node:readline/promises';
import z from 'zod';
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const model = openai("gpt-4o-mini");

/**
 *  How to generate a response from a model from a simple prompt
 */
export const ModuleOne = async (
  prompt: string = "what is the capital of France?",
) => {
  const { text } = await generateText({
    model,
    prompt,
  });

  console.log(text);
};

/**
 * Instead of generating the text, we are now streaming it!
 */
export const ModuleTwo = async (
  prompt: string = "what is the meaning of life?",
) => {
  const { textStream } = streamText({
    model,
    prompt,
  });

  // The textStream is an AsyncIterable, so it can be
  // iterated over like an array.
  for await (const text of textStream) {
    process.stdout.write(text);
  }

  return textStream;
};

/**
 * Using System Prompts:Summarize a text file
 */
export const ModuleThree = async () => {
  const input = readFileSync(
    path.join(
      process.cwd(),
      "README.md",
    ),
    "utf-8",
  );

  const { text } = await generateText({
    model,
    prompt: input,
    system:
      `You are a text summarizer. ` +
      `Summarize the text you receive. ` +
      `Be concise. ` +
      `Return only the summary. ` +
      `Do not use the phrase "here is a summary". ` +
      `Highlight relevant phrases in bold. ` +
      `The summary should be two sentences long. `,
  });

  console.log(text);
};


const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: CoreMessage[] = [];

/**
 * Chat with a model
 */
export const ModuleFour = async () => {
  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model,
      messages,
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    messages.push({ role: 'assistant', content: fullResponse });
  }
}

/**
 * Module 5: Structured Outputs with Zod
 */
export const ModuleFive = async (
  prompt: string = "How to make a pizza?",
) => {
  const schema = z.object({
    recipe: z.object({
      name: z
        .string()
        .describe("The title of the recipe"),
      ingredients: z
        .array(
          z.object({
            name: z.string(),
            amount: z.string(),
          }),
        )
        .describe(
          "The ingredients needed for the recipe",
        ),
      steps: z
        .array(z.string())
        .describe("The steps to make the recipe"),
    }),
  });

  const { object } = await generateObject({
    model,
    schema,
    prompt,
    schemaName: "Recipe",
    system:
      `You are helping a user create a recipe.`,
  });

  console.dir(object.recipe, { depth: null });
};

const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: `http://localhost:1234/v1`,
});

/**
 * Module 6: Extracting Data from PDFs
 */
export const ModuleSix = async (
  docPath: string = path.join(process.cwd(), "invoice.pdf"),
) => {

  const schema = z
  .object({
    total: z
      .number()
      .describe("The total amount of the invoice."),
    currency: z
      .string()
      .describe("The currency of the total amount."),
    invoiceNumber: z
      .string()
      .describe("The invoice number."),
    issueDate: z
      .string()
      .describe(
        "The date the invoice was issued.",
      ),
    companyName: z
      .string()
      .describe(
        "The name of the company issuing the invoice.",
      ),
    billTo: z
      .string()
      .describe(
        "The name of the company or person receiving the invoice.",
      ),
  })
  .describe("The extracted data from the invoice.");

  const { object } = await generateObject({
    model,
    system:
      `You will receive an invoice. ` +
      `Please extract the data from the invoice.`,
    schema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: readFileSync(docPath),
            mimeType: "application/pdf",
          },
        ],
      },
    ],
  });

  console.dir(object, { depth: null });
};


/*
 * Module 7: Using Local LLMs
 */
export const ModuleSeven = async (
  input: string = "What is the capital of France?",
) => {
  const { text } = await generateText({
    // Changing the model to lmstudio("") will use the local LLM
    model: lmstudio(""),
    prompt: input,
    maxRetries: 0,
  });

  console.log(text);
};

/*
 * Module 8: Vector/Embedding Search
 */
export const ModuleEight = async (
  searchTerm: string = "Pineapple",
) => {
  const localModel =
    lmstudio.textEmbeddingModel("");

  const values = ["Apple", "Banana", "Mango", "Car", "Bicycle", "Motorcycle"];

  const { embeddings } = await embedMany({
    model: localModel,
    values,
  });

  const vectorDatabase = embeddings.map(
    (embedding, index) => ({
      value: values[index]!,
      embedding,
    }),
  );

  const searchTermEmbedding = await embed({
    model: localModel,
    value: searchTerm,
  });

  const entries = vectorDatabase.map((entry) => {
    return {
      value: entry.value,
      similarity: cosineSimilarity(
        entry.embedding,
        searchTermEmbedding.embedding,
      ),
    };
  });

  const sortedEntries = entries.sort(
    (a, b) => b.similarity - a.similarity,
  );

  console.dir(sortedEntries, { depth: null });
};

/*
 * Module 9: Function and Tool Calling
 */
export const ModuleNine = async (
  prompt: string = "What's 13 + 5?",
) => {

    const addNumbers = tool({
      description: "Add two numbers together",
      parameters: z.object({
        num1: z.number(),
        num2: z.number(),
      }),
      execute: async ({ num1, num2 }) => {
        return num1 + num2;
      },
    });

  const result = await generateText({
    model,
    prompt,
    tools: {
      addNumbers,
    },
  });
  console.log(result.toolResults);
};

/*
 * Module 10: Tool Calling with Max Steps (Feeding the model with the result of the previous step)
 */
export const ModuleTen = async () => {
  const result = await generateText({
    model,
    prompt: "What's 13 + 5?",
    // This is the number of steps the model can take to solve the problem.
    // Maximum number of sequential LLM calls (steps), e.g. when you use tool calls. Must be at least 1.
    // A maximum number is required to prevent infinite loops in the case of misconfigured tools.
    // By default, it's set to 1, which means that only a single LLM call is made.
    maxSteps: 2,
    tools: {
      addNumbers: tool({
        description: "Add two numbers together",
        parameters: z.object({
          num1: z.number(),
          num2: z.number(),
        }),
        execute: async ({ num1, num2 }) => {
          return num1 + num2;
        },
      }),
    },
  });
  console.log(result.steps.length);
  console.log(result.text);
};


/*
 * Module 11: Tool Calling with multiple steps
 */
export const ModuleEleven = async () => {
  const result = await generateText({
    model,
    prompt: "Get the weather in Toronto and Campbell River BC, then add them together.",
    maxSteps: 3,
    tools: {
      addNumbers: tool({
        description: "Add two numbers together",
        parameters: z.object({
          num1: z.number(),
          num2: z.number(),
        }),
        execute: async ({ num1, num2 }) => {
          return num1 + num2;
        },
      }),
      getWeather: tool({
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
          city: z.string(),
        }),
        execute: async ({ latitude, longitude, city }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relativehumidity_2m&timezone=auto`,
          );
 
          const weatherData = await response.json();
          return {
            temperature: weatherData.current.temperature_2m,
            weatherCode: weatherData.current.weathercode,
            humidity: weatherData.current.relativehumidity_2m,
            city,
          };
        },
      }),
    },
  });
  console.log(result.steps.length)
  console.log(result.text);
};