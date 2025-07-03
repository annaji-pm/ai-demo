import { CoreMessage, streamText, generateText } from 'ai';
import dotenv from 'dotenv';
import { ModuleOne, ModuleTwo, ModuleThree, ModuleFour, ModuleFive, ModuleSix, ModuleSeven, ModuleEight, ModuleNine, ModuleTen, ModuleEleven } from './modules';

dotenv.config();

// Check if API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

async function main() {

  // await ModuleOne();
  // await ModuleTwo();
  // await ModuleThree();
  // await ModuleFour();
  // await ModuleFive();
  // await ModuleSix();
  // await ModuleSeven();
  // await ModuleEight();
  // await ModuleNine();
  // await ModuleTen();
  await ModuleEleven();

}

main().catch(console.error);