import { z } from 'zod'

/** `?redirect=/some/path`, restricted to same-site paths so it cannot send users to another site. */
export const RedirectSearch = z.object({
  redirect: z
    .string()
    .optional()
    .transform((value) =>
      value && value.startsWith('/') && !value.startsWith('//')
        ? value
        : undefined,
    ),
})
