import * as crypto from 'crypto';
import pdfParse from 'pdf-parse';

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
}

export interface RecipeFile {
  fileContent: string;
  fileUrl: string;
  md5Hash: string;
  contentType: ContentType;
  mimeType: string;
  isImageContent: boolean; // Flag for RecipeFetcher to handle image content
  prompt: string; // Generated prompt for the recipe extraction
}

export class FileProcessor {
  /**
   * Process an uploaded file and extract its content
   * @param file The uploaded file (from multer)
   * @returns ProcessedFile object with content, URL and hash
   */
  async processFile(file: Express.Multer.File): Promise<RecipeFile> {
    // Extract content based on file type
    let fileContent: string;
    let contentType: ContentType = ContentType.TEXT;
    let isImageContent = false;

    if (file.mimetype === 'application/pdf') {
      // Process PDF file
      try {
        const pdfData = await pdfParse(file.buffer);
        fileContent = pdfData.text;

        // If text is too short, the PDF might be image-based or empty
        if (fileContent.length < 50) {
          throw new Error(
            'Unable to extract sufficient text from PDF. The file may be image-based or empty.'
          );
        }

        console.log(`Extracted ${fileContent.length} characters from PDF`);
      } catch (pdfError) {
        console.error('Error extracting text from PDF:', pdfError);
        throw new Error(
          `Failed to parse PDF file: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
        );
      }
    } else if (file.mimetype === 'text/plain') {
      // Process TXT file - no preprocessing needed
      fileContent = file.buffer.toString('utf-8');
      console.log(`Loaded ${fileContent.length} characters from TXT file`);
    } else if (file.mimetype.startsWith('image/')) {
      // Process image file - encode as base64 for OpenAI Vision API
      fileContent = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      contentType = ContentType.IMAGE;
      isImageContent = true;
      console.log(`Processed image of type ${file.mimetype}`);
    } else {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Calculate MD5 hash of the file content
    const md5Hash = crypto
      .createHash('md5')
      .update(contentType === ContentType.IMAGE ? file.buffer : fileContent)
      .digest('hex');

    // Create the file URL
    const fileUrl = `file://upload/${md5Hash}`;

    // Generate appropriate prompt based on file type
    const prompt = this.generatePrompt({
      contentType,
      mimeType: file.mimetype,
      md5Hash,
    });

    return {
      fileContent,
      fileUrl,
      md5Hash,
      contentType,
      mimeType: file.mimetype,
      isImageContent,
      prompt,
    };
  }

  /**
   * Generate an appropriate prompt for the LLM based on file type
   * @param fileInfo File information to base the prompt on
   * @returns A formatted prompt string
   */
  generatePrompt(fileInfo: {
    contentType: ContentType;
    mimeType: string;
    md5Hash: string;
  }): string {
    const fileTypeDescription = this.getFileTypeDescription(fileInfo);
    let prompt = `Uploaded ${fileTypeDescription} with MD5: ${fileInfo.md5Hash}`;

    // Add specific instructions for image-based recipes
    if (fileInfo.contentType === ContentType.IMAGE) {
      prompt +=
        '. Extract the recipe from this image. Identify ingredients, steps, cooking time, and any other recipe details visible in the image.';
    }

    return prompt;
  }

  /**
   * Get a human-readable description of the file type
   * @param fileInfo File information object
   * @returns A string describing the file type
   */
  getFileTypeDescription(fileInfo: { contentType: ContentType; mimeType: string }): string {
    if (fileInfo.contentType === ContentType.IMAGE) {
      return 'image recipe';
    } else if (fileInfo.mimeType === 'application/pdf') {
      return 'PDF';
    } else if (fileInfo.mimeType === 'text/plain') {
      return 'TXT';
    } else {
      return fileInfo.mimeType;
    }
  }
}
