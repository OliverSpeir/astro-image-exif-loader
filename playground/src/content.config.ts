import { defineCollection } from "astro:content";
import { defineExifCollection } from "astro-image-exif-loader";

const images = defineCollection(
  defineExifCollection({
    imagesDir: { pattern: "**/*", base: "src/content/images" },
    // extractAll: true,
    // tags:["Make", "AEXv"],
    // presets: ["basic"],
    // excludeTags: [""]
  })
);

export const collections = {
  images,
};