/**
 * Common contract that all AI model providers (OpenAI, Gemini, Groq, Mock) must implement.
 */
export interface LLMProvider {
  /**
   * Identifies the name of this provider.
   */
  readonly name: string;

  /**
   * Executes the lead extraction prompt for a batch of records.
   * 
   * @param records The array of raw row records.
   * @param systemPrompt The instruction set for the model.
   * @param extractionPromptTemplate The user instruction template.
   * @returns A promise resolving to the raw string response from the model.
   */
  extractLeads(
    records: Record<string, string>[],
    systemPrompt: string,
    extractionPromptTemplate: string
  ): Promise<string>;
}
