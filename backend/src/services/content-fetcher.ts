import * as cheerio from 'cheerio';
import axios, { AxiosInstance } from 'axios';
import { Config } from '../config';
import { Supadata } from '@supadata/js';

export interface RecipeContent {
  text: string;
  imageUrl: string;
  userContext?: string; // Additional context information for the user prompt
  systemContext?: string; // Additional context information for the system prompt
}

// Interface for content fetchers
export interface ContentFetcher {
  canFetchContent(url: string): boolean;
  fetchContent(url: string): Promise<RecipeContent>;
}

interface TranscriptChunk {
  text: string;
  offset: number;
  duration: number;
  lang: string;
}

interface Transcript {
  content: TranscriptChunk[] | string;
  lang: string;
  availableLangs: string[];
}

interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  duration: number;
  channel: {
    id: string;
    name: string;
  };
  tags: string[];
  thumbnail: string;
  uploadDate: string;
  viewCount: number;
  likeCount: number;
  transcriptLanguages: string[];
}

// Web content fetcher using Cheerio (default fetcher)
export class WebContentFetcher implements ContentFetcher {
  private axios: AxiosInstance;

  constructor(axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance || axios.create();
  }

  canFetchContent(_url: string): boolean {
    // This is the default fetcher, it can handle anything that's not handled by specialized fetchers
    return true;
  }

  async fetchContent(url: string): Promise<RecipeContent> {
    try {
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);

      // Try to find og:image meta tag
      let imageUrl = '';
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        imageUrl = ogImage;
      }

      // Extract page title for context
      let pageTitle = $('title').text().trim() || '';
      if (!pageTitle) {
        pageTitle = $('meta[property="og:title"]').attr('content') || '';
      }

      // Add context information
      let userContext = '';
      if (pageTitle) {
        userContext = `This content is from the web page titled: "${pageTitle}".`;
      }

      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, header, footer, iframe, noscript').remove();

      // Extract the main content
      const content = $('body').text().trim();

      // Clean up the content (remove excessive whitespace)
      return {
        text: content.replace(/\s+/g, ' '),
        imageUrl,
        userContext,
      };
    } catch (error) {
      console.error('Error fetching web content:', error);
      throw new Error(
        `Failed to fetch content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// YouTube content fetcher using Supadata SDK
export class YouTubeContentFetcher implements ContentFetcher {
  private supadata: Supadata;

  constructor(apiKey?: string) {
    this.supadata = new Supadata({
      apiKey: apiKey || Config.SUPADATA_API_KEY,
    });
  }

  canFetchContent(url: string): boolean {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
    return youtubeRegex.test(url);
  }

  // Helper method to extract YouTube video ID from URL
  private extractVideoId(url: string): string | null {
    const youtubeRegex =
      /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?$/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  }

  async fetchContent(url: string): Promise<RecipeContent> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL: Could not extract video ID');
    }

    try {
      // Get transcript using Supadata SDK
      const transcript: Transcript = await this.supadata.youtube.transcript({
        videoId: videoId,
        lang: 'en',
      });

      const transcriptText =
        transcript.content instanceof Array
          ? transcript.content
              .filter((item: TranscriptChunk) => item.text !== '[Music]')
              .map(item => `${item.offset}-${item.offset + item.duration}: ${item.text}`)
              .join('\n')
              .trim()
          : transcript.content;

      if (transcriptText.length === 0) {
        throw new Error('No transcript text found');
      }

      // Get video metadata using Supadata SDK
      const video: YoutubeVideo = await this.supadata.youtube.video({
        id: videoId,
      });

      // Format the transcript text
      const text = `# Video Transcript\n\n${transcriptText}\n\n# Video Description\n${video.description}\n\n`;

      // Get the thumbnail URL from the video metadata
      const imageUrl = video.thumbnail;

      // Build enhanced context with video information
      let userContext = `This content is a transcript from the YouTube video titled: "${video.title}".`;

      if (video.channel && video.channel.name) {
        userContext += ` Created by: ${video.channel.name}.`;
      }

      const systemContext = `
      Special instructions for YouTube transcripts:
1. Pay special attention to when the presenter mentions ingredients and their amounts, as they might be scattered throughout the video
2. Look for the presenter describing cooking times and temperatures, which might be mentioned casually
3. Infer measurements when they are not explicitly stated but shown visually (mentioned as "this much" or similar expressions)
4. Be attentive to cooking tools that are shown or used but not explicitly named
5. The recipe title might be mentioned at the beginning, end, or in the context information
6. Prioritise the transcript over the description.
`;

      return { text, imageUrl, userContext, systemContext };
    } catch (error) {
      console.error('Error fetching YouTube content:', error);
      throw new Error(
        `Failed to fetch YouTube content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
