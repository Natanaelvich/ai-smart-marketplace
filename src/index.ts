import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log('🤖 Smart Marketplace AI Study Project');
  console.log('=====================================');
  
  try {
    // Test OpenAI connection
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  Please set your OPENAI_API_KEY in the .env file');
      return;
    }
    
    console.log('✅ OpenAI client initialized successfully');
    console.log('🚀 Ready to build intelligent marketplace features!');
    
    // Example: Simple AI completion
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant for a smart marketplace platform.'
        },
        {
          role: 'user',
          content: 'What are some key features an AI-powered marketplace should have?'
        }
      ],
      model: 'gpt-3.5-turbo',
      max_tokens: 150
    });
    
    console.log('\n🧠 AI Suggestion:');
    console.log(completion.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the main function
main().catch(console.error); 