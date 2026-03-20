'use server';
/**
 * @fileOverview An AI tool that suggests standardized phrasing for library visit purposes.
 *
 * - adminPurposeSuggestion - A function that handles generating suggestions for visit purposes.
 * - AdminPurposeSuggestionInput - The input type for the adminPurposeSuggestion function.
 * - AdminPurposeSuggestionOutput - The return type for the adminPurposeSuggestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminPurposeSuggestionInputSchema = z.object({
  partialPurpose: z.string().describe('A partial phrase for a library visit purpose entered by an administrator.'),
});
export type AdminPurposeSuggestionInput = z.infer<typeof AdminPurposeSuggestionInputSchema>;

const AdminPurposeSuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of 3 to 5 suggested complete phrases for library visit purposes, based on the partial input.'),
});
export type AdminPurposeSuggestionOutput = z.infer<typeof AdminPurposeSuggestionOutputSchema>;

export async function adminPurposeSuggestion(input: AdminPurposeSuggestionInput): Promise<AdminPurposeSuggestionOutput> {
  return adminPurposeSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminPurposeSuggestionPrompt',
  input: { schema: AdminPurposeSuggestionInputSchema },
  output: { schema: AdminPurposeSuggestionOutputSchema },
  prompt: `You are an AI assistant helping a library administrator suggest standardized phrasing for library visit purposes. The user will provide a partial phrase. Your task is to complete this phrase or suggest similar, consistent, and standardized options that a library visitor might choose from. Provide 3 to 5 distinct suggestions, ensuring consistency in phrasing.

Examples of good suggestions for library visit purposes include:
- 'Research for Thesis'
- 'Group Study Session'
- 'Borrowing Books'
- 'Returning Books'
- 'Using Computer Lab'
- 'Printing Services'
- 'Attending Workshop'
- 'Consulting Librarian'
- 'Reading and Relaxation'
- 'Accessing Digital Resources'

Partial phrase: {{{partialPurpose}}}`,
});

const adminPurposeSuggestionFlow = ai.defineFlow(
  {
    name: 'adminPurposeSuggestionFlow',
    inputSchema: AdminPurposeSuggestionInputSchema,
    outputSchema: AdminPurposeSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
