import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';
import { spanishZodErrorMap } from '../copy/validation';

export function spanishZodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): Resolver<z.infer<TSchema> & FieldValues> {
  return zodResolver(schema, { errorMap: spanishZodErrorMap });
}
