import * as x from "../schemaLib";

export const ComponentDefinition = x
  .object({
    name: x.string(),
    category: x.number(),
    type: x.number(),
    mass: x.number(),
    value: x.number(),
    flags: x.number(),
    tags: x.string(),
    audio_filename_start: x.string(),
    audio_filename_loop: x.string(),
    audio_filename_end: x.string(),
  })
  .partial();
