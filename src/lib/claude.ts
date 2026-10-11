import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { PlanSchema, type Plan } from './schema';
import { SYSTEM_PROMPT, buildPrompt, type ExistingGroup } from './prompt';
import type { TabItem } from './tabs';

/** An error whose message is fit to show in the popup as-is. */
export class UserFacingError extends Error {}

function client(apiKey: string): Anthropic {
  // The key is the user's own and never leaves their machine except to api.anthropic.com.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 120_000 });
}

/** Server-side refusal fallbacks are not available for Haiku. */
function fallbackParams(model: string) {
  if (model.startsWith('claude-haiku')) return {};
  return { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
}

export async function suggestGroups(opts: {
  apiKey: string;
  model: string;
  items: TabItem[];
  groups: ExistingGroup[];
  minGroupSize: number;
}): Promise<Plan> {
  const { apiKey, model, items, groups, minGroupSize } = opts;
  let res;
  try {
    res = await client(apiKey).beta.messages.parse({
      model,
      max_tokens: 16000,
      // Sorting tabs is easy for the model; low effort keeps runs fast and cheap.
      output_config: { effort: 'low', format: betaZodOutputFormat(PlanSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(items, groups, minGroupSize) }],
      ...fallbackParams(model),
    });
  } catch (err) {
    throw toUserFacing(err);
  }

  if (res.stop_reason === 'refusal') throw new UserFacingError('Claude declined to group these tabs.');
  if (res.stop_reason === 'max_tokens') throw new UserFacingError('Too many tabs for one run. Close a few and try again.');
  if (!res.parsed_output) throw new UserFacingError('Claude returned an answer that could not be read. Try again.');
  return res.parsed_output;
}

/** Checks the key and that it can use the chosen model, without spending tokens. */
export async function testKey(apiKey: string, model: string): Promise<string> {
  try {
    const info = await client(apiKey).models.retrieve(model);
    return info.display_name;
  } catch (err) {
    throw toUserFacing(err);
  }
}

export function toUserFacing(err: unknown): Error {
  if (err instanceof UserFacingError) return err;
  console.warn('Claude API error', err);
  if (err instanceof Anthropic.AuthenticationError) return new UserFacingError('Your API key was rejected. Check it in Settings.');
  if (err instanceof Anthropic.PermissionDeniedError) return new UserFacingError('Your API key is not allowed to use this model.');
  if (err instanceof Anthropic.NotFoundError) return new UserFacingError('Model not found. Pick another model in Settings.');
  if (err instanceof Anthropic.RateLimitError) return new UserFacingError('Rate limited by the Claude API. Wait a moment and try again.');
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new UserFacingError('The Claude API took too long to answer. Try again.');
  if (err instanceof Anthropic.APIConnectionError) return new UserFacingError('Could not reach the Claude API. Check your connection.');
  if (err instanceof Anthropic.BadRequestError) return new UserFacingError(`Claude API rejected the request: ${apiMessage(err)}`);
  if (err instanceof Anthropic.APIError) return new UserFacingError(`Claude API error (${err.status ?? '?'}): ${apiMessage(err)}`);
  return err instanceof Error ? err : new Error(String(err));
}

function apiMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? err.message;
}
