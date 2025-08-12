import type { ImportedExifCollectionEntry } from "./types.js";
import { resolve as pathResolve, relative } from "path";

async function imageImporter<
  Entry extends {
    id: string;
    collection: string;
    data: any;
    filePath?: string;
  },
>(
  entry: Entry | undefined,
): Promise<ImportedExifCollectionEntry<Entry["data"]> | null>;

async function imageImporter<
  Entry extends {
    id: string;
    collection: string;
    data: any;
    filePath?: string;
  },
>(entries: Entry[]): Promise<Array<ImportedExifCollectionEntry<Entry["data"]>>>;

async function imageImporter<
  Entry extends {
    id: string;
    collection: string;
    data: any;
    filePath?: string;
  },
>(
  entriesOrEntry: Entry | Entry[] | undefined,
): Promise<
  | ImportedExifCollectionEntry<Entry["data"]>
  | Array<ImportedExifCollectionEntry<Entry["data"]>>
  | null
> {
  // Handle undefined case
  if (entriesOrEntry === undefined) {
    return null;
  }

  const files = import.meta.glob("/src/**/*", { eager: false });

  // Normalize input to always work with arrays
  const isArray = Array.isArray(entriesOrEntry);
  const entries = isArray ? entriesOrEntry : [entriesOrEntry];

  // Check which entries are outside src directory
  const outsideSrc = entries.filter((entry: any) => {
    if (!entry.filePath) return true;

    // Determine if file is within the project's src directory
    const rootPath = process.cwd();
    const srcRoot = pathResolve(rootPath, "src");
    const fullPath = pathResolve(rootPath, entry.filePath);
    const insideSrc =
      fullPath.startsWith(srcRoot + "/") || fullPath === srcRoot;

    return !insideSrc;
  });

  if (outsideSrc.length === entries.length) {
    throw new Error(
      "astro-image-exif-loader: The importer only works for images under /src.",
    );
  } else if (outsideSrc.length > 0) {
    console.warn(
      `astro-image-exif-loader: ${outsideSrc.length} entries are outside /src and cannot be imported`,
    );
  }

  const results = await Promise.all(
    entries.map(async (entry) => {
      const filePath = (entry as any).filePath as string | undefined;
      if (!filePath) {
        console.warn(
          "astro-image-exif-loader: entry missing filePath: ",
          entry.id,
        );
        return {
          id: entry.id,
          collection: entry.collection,
          data: entry.data,
          defaultImport: null,
        } as ImportedExifCollectionEntry<Entry["data"]>;
      }

      // Check if this file is in src directory
      const rootPath = process.cwd();
      const srcRoot = pathResolve(rootPath, "src");
      const fullPath = pathResolve(rootPath, filePath);
      const insideSrc =
        fullPath.startsWith(srcRoot + "/") || fullPath === srcRoot;

      if (!insideSrc) {
        // File is outside src, can't import it
        return {
          id: entry.id,
          collection: entry.collection,
          data: entry.data,
          defaultImport: null,
        } as ImportedExifCollectionEntry<Entry["data"]>;
      }

      // Convert to src-relative path for import.meta.glob
      const srcRelativePath = relative(srcRoot, fullPath).replace(/\\/g, "/");
      const imagePath = `/src/${srcRelativePath}`;

      const filesMap = files as Record<string, () => Promise<any>>;
      const importer = filesMap[imagePath];

      let defaultImport: any = null;
      if (importer) {
        try {
          const mod = await importer();
          defaultImport = mod?.default ?? null;
        } catch (err) {
          console.warn(
            "astro-image-exif-loader: failed to import image module: ",
            imagePath,
            err,
          );
        }
      } else {
        console.warn(
          "astro-image-exif-loader: no importer found for: ",
          imagePath,
        );
      }

      return {
        id: entry.id,
        collection: entry.collection,
        data: entry.data,
        defaultImport,
      } as ImportedExifCollectionEntry<Entry["data"]>;
    }),
  );

  // Return single entry or array based on input type
  return isArray ? results : results[0];
}

export default imageImporter;
