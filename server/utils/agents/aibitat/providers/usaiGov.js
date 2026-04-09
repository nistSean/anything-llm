const OpenAI = require("openai");
const Provider = require("./ai-provider.js");
const InheritMultiple = require("./helpers/classes.js");
const UnTooled = require("./helpers/untooled.js");
const { toValidNumber } = require("../../../http/index.js");

/**
 * The agent provider for the USAi.gov provider.
 * Since we cannot promise the USAi.gov provider supports tool calling
 * we wrap it in untooled which is often far better anyway.
 */
class USAiGovProvider extends InheritMultiple([Provider, UnTooled]) {
  model;

  constructor(config = {}) {
    super();
    const { model = "gpt-4" } = config;
    const client = new OpenAI({
      baseURL: process.env.USAI_GOV_BASE_PATH,
      apiKey: process.env.USAI_GOV_API_KEY ?? null,
      maxRetries: 3,
    });

    this._client = client;
    this.model = model;
    this.verbose = true;
    this.maxTokens = process.env.USAI_GOV_MAX_TOKENS
      ? toValidNumber(process.env.USAI_GOV_MAX_TOKENS, 1024)
      : 1024;
  }

  get client() {
    return this._client;
  }

  async #handleFunctionCallChat({ messages = [] }) {
    return await this.client.chat.completions
      .create({
        model: this.model,
        temperature: 0,
        messages,
        max_tokens: this.maxTokens,
      })
      .then((result) => {
        if (!result.hasOwnProperty("choices"))
          throw new Error("USAi.gov chat: No results!");
        if (result.choices.length === 0)
          throw new Error("USAi.gov chat: No results length!");
        return result.choices[0].message.content;
      })
      .catch((_) => {
        return null;
      });
  }

  async #handleFunctionCallStream({ messages = [] }) {
    return await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages,
    });
  }

  /**
   * Create a completion based on the received messages.
   *
   * @param messages A list of messages to send to the API.
   * @param functions
   * @returns The completion.
   */
  async complete(messages, functions = []) {
    return await this.handleCompletion(
      messages,
      functions,
      this.#handleFunctionCallChat.bind(this)
    );
  }

  /**
   * Stream a completion based on the received messages.
   *
   * @param messages A list of messages to send to the API.
   * @param functions
   * @param eventHandler
   * @returns The completion.
   */
  async stream(messages, functions = [], eventHandler = null) {
    return await this.handleStream(
      messages,
      functions,
      this.#handleFunctionCallStream.bind(this),
      eventHandler
    );
  }

  /**
   * Get the cost of the completion.
   *
   * @param _usage The completion to get the cost for.
   * @returns The cost of the completion.
   */
  getCost(_usage) {
    return 0;
  }
}

module.exports = USAiGovProvider;
