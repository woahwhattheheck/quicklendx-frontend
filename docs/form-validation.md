# How forms compose with Zod schemas

Form validation lives in `lib/validation/`, not inside components. The
contract is a discriminated-union result — validators never throw into
render and never trust `FormData` to already be the right shape.

## The pattern (`ProfileForm` + `profileSchema`)

`lib/validation/profileSchema.ts` is the reference implementation:

```ts
export const profileSchema = z.object({ ... });
export type ProfileFormValues = z.infer<typeof profileSchema>;

export function parseProfileForm(input: unknown):
  | { ok: true; values: ProfileFormValues }
  | { ok: false; errors: Partial<Record<keyof ProfileFormValues, string>> }
```

Three rules that make it work:

1. **The schema is the single source of truth.** `ProfileFormValues` is
   `z.infer<typeof profileSchema>` — the form's prop types and the
   validator can never disagree, because the type is derived from the
   schema rather than declared next to it.
2. **`safeParse` at the submit boundary, not in render.** The component
   calls `parseProfileForm(rawFormData)` inside `handleSubmit`. Zod's
   thrown `ZodError` is converted into a per-field error map
   (`errors[field] = first message`) so the form shows every invalid
   field at once instead of failing on the first issue.
3. **The component owns presentation only.** `ProfileForm` keeps
   `errors` in state, renders each message next to its field under
   `role="alert"`, and clears the map on a successful parse. The form
   element carries `noValidate` — browser-native validation is off, so
   the schema's messages are the only ones the user sees and the only
   ones tests assert.

## When to reach for Zod vs. a hand validator

`lib/validation/` holds both, deliberately:

- **Zod** (`profileSchema`) for structured object input — several named
  fields, shared types, nested constraints. The schema buys you
  per-field issue paths and `z.infer` for free.
- **Hand validators** (`iban.ts`, `fileUpload.ts`, `stellarAddress.ts`)
  for single values with algorithmic checks (mod-97 checksums, byte-size
  caps, CRC16 StrKey) where a one-function `{ ok, error }` result is
  simpler than a schema.

Both return the same union shape (`ok` + `values`/`error`/`errors`), so a
component never needs to know which kind of validator it is calling —
swap one for the other without touching the JSX.

## Adding a new validated form

- Put the schema (or validator) in `lib/validation/` and export the
  `parse*` function alongside it — the component should never see `z`
  directly.
- Take `unknown` (or a `FormData`-derived bag of strings) as the parse
  input; run `safeParse`, never `parse`, at the submit boundary.
- Render every returned error next to its field in one pass; keep
  `noValidate` on the `<form>`.
- Test the schema file directly (see `profileSchema.test.ts`) and the
  form's error wiring separately — schema tests cover the rules, form
  tests cover that the right message lands next to the right field.
