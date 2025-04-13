import * as cheerio from 'cheerio';
import axios, { AxiosInstance } from 'axios';
import { Config } from '../config';
import { Supadata } from '@supadata/js';

// Interface for content fetchers
export interface ContentFetcher {
  canFetchContent(url: string): boolean;
  fetchContent(url: string): Promise<{
    text: string;
    imageUrl: string;
    context?: string; // Additional context information for the prompt
  }>;
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

  canFetchContent(url: string): boolean {
    // This is the default fetcher, it can handle anything that's not handled by specialized fetchers
    return true;
  }

  async fetchContent(url: string): Promise<{ text: string; imageUrl: string; context?: string }> {
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
      let context = '';
      if (pageTitle) {
        context = `This content is from the web page titled: "${pageTitle}".`;
      }

      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, header, footer, iframe, noscript').remove();

      // Extract the main content
      const content = $('body').text().trim();

      // Clean up the content (remove excessive whitespace)
      return {
        text: content.replace(/\s+/g, ' '),
        imageUrl,
        context,
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
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
    return youtubeRegex.test(url);
  }

  // Helper method to extract YouTube video ID from URL
  private extractVideoId(url: string): string | null {
    const youtubeRegex =
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?$/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  }

  async fetchContent(url: string): Promise<{ text: string; imageUrl: string; context?: string }> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL: Could not extract video ID');
    }

    try {
      // Get transcript using Supadata SDK
      const transcript: Transcript = await this.supadata.youtube.transcript({
        url: `https://www.youtube.com/watch?v=${videoId}`,
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
      const text = `${video.description}\n\n${transcriptText}`;

      // Get the thumbnail URL from the video metadata
      const imageUrl = video.thumbnail;

      // Build enhanced context with video information
      let context = `This content is a transcript from the YouTube video titled: "${video.title}".`;

      if (video.channel && video.channel.name) {
        context += ` Created by: ${video.channel.name}.`;
      }

      return { text, imageUrl, context };
    } catch (error) {
      console.error('Error fetching YouTube content:', error);
      throw new Error(
        `Failed to fetch YouTube content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
