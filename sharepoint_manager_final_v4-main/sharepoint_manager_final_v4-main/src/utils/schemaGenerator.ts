import { z } from 'zod';
import { ColumnConfig, ListConfig, SharePointColumnDefinition } from '../types';

/**
 * Enterprise Zod Schema Factory for Dynamic Forms
 *
 * Dynamically constructs a Zod validation schema based on SharePoint Column Configurations.
 * Ensures strict runtime type checking and field requirement validation without
 * hardcoding form schemas across different SharePoint list definitions.
 */
export function generateZodSchema(
  columnsOrConfig: ColumnConfig[] | SharePointColumnDefinition[] | ListConfig
): z.ZodObject<any> {
  const columns: any[] = Array.isArray(columnsOrConfig)
    ? columnsOrConfig
    : (columnsOrConfig as ListConfig).columns || [];

  const shape: Record<string, z.ZodTypeAny> = {};

  columns.forEach((col) => {
    const isRequired = Boolean(col.required);
    const key = col.name || col.key;
    const label = col.displayName || col.label || key;
    const type = String(col.type || '').toLowerCase();

    // Skip system read-only columns
    if (col.readOnly || key === 'ID' || key === 'id' || key === 'Created' || key === 'Modified') {
      return;
    }

    switch (type) {
      case 'number':
      case 'currency': {
        const numSchema = z.coerce.number({
          message: `${label} must be a number`,
        });

        if (isRequired) {
          shape[key] = numSchema;
        } else {
          shape[key] = z
            .union([z.number(), z.string().length(0), z.null(), z.undefined()])
            .transform((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)))
            .optional();
        }
        break;
      }

      case 'boolean': {
        shape[key] = z.boolean().optional().default(Boolean(col.defaultValue ?? false));
        break;
      }

      case 'choice': {
        if (isRequired) {
          shape[key] = z.string().min(1, `${label} is required`);
        } else {
          shape[key] = z.string().optional().or(z.literal(''));
        }
        break;
      }

      case 'multichoice': {
        if (isRequired) {
          shape[key] = z.array(z.string()).min(1, `At least one selection for ${label} is required`);
        } else {
          shape[key] = z.array(z.string()).optional().default([]);
        }
        break;
      }

      case 'date':
      case 'datetime': {
        if (isRequired) {
          shape[key] = z.string().min(1, `${label} is required`);
        } else {
          shape[key] = z.string().optional().or(z.literal(''));
        }
        break;
      }

      case 'person': {
        if (isRequired) {
          shape[key] = z.union([
            z.string().min(1, `${label} is required`),
            z.object({ displayName: z.string() }),
            z.array(z.any()).min(1, `${label} is required`),
          ]);
        } else {
          shape[key] = z.any().optional();
        }
        break;
      }

      case 'lookup': {
        if (isRequired) {
          shape[key] = z.union([
            z.string().min(1, `${label} is required`),
            z.number(),
          ]);
        } else {
          shape[key] = z.any().optional();
        }
        break;
      }

      case 'url':
      case 'image': {
        if (isRequired) {
          shape[key] = z.string().url(`${label} must be a valid URL`).or(z.string().min(1, `${label} is required`));
        } else {
          shape[key] = z.string().optional().or(z.literal(''));
        }
        break;
      }

      case 'text':
      case 'note':
      case 'multiline':
      default: {
        if (isRequired) {
          shape[key] = z.string().min(1, `${label} is required`);
        } else {
          shape[key] = z.string().optional().or(z.literal(''));
        }
        break;
      }
    }
  });

  return z.object(shape);
}
