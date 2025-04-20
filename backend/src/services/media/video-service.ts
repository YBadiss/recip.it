import { Logger } from '../../utils/logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { Config } from '../../config';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';

export class VideoService {
  private logger: Logger;
  private imgurClientId: string;

  constructor(imgurClientId: string) {
    this.logger = new Logger('VideoService');
    this.imgurClientId = imgurClientId;
  }

  /**
   * Extract the first frame of a video and upload it to Imgur
   * @param videoUrl URL of the video to extract the frame from
   * @returns URL of the uploaded image on Imgur
   */
  public async extractFirstFrameAndUploadToImgur(videoUrl: string): Promise<string> {
    const outputFile = path.join(Config.DATA_FOLDER, `${randomUUID()}.jpg`);

    try {
      // Extract the first frame from the video
      await this.extractFirstFrame(videoUrl, outputFile);

      // Upload the frame to Imgur
      const imgurUrl = await this.uploadToImgur(outputFile);

      return imgurUrl;
    } catch (error) {
      this.logger.error('Error extracting and uploading video frame', {
        error,
        videoUrl,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      // Clean up temporary files
      try {
        if (outputFile && fs.existsSync(outputFile)) {
          fs.unlinkSync(outputFile);
        }
      } catch (cleanupError) {
        this.logger.warn('Error cleaning up temporary files', { cleanupError });
      }
    }
  }

  /**
   * Extract the first frame from a video
   * @param videoUrl URL of the video
   * @param outputPath Path to save the extracted frame
   * @returns Promise that resolves when frame extraction is complete
   */
  private extractFirstFrame(videoUrl: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Properly escape the URL for shell
      const escapedUrl = `"${videoUrl.replace(/"/g, '\\"')}"`;

      // Create the ffmpeg command
      const command = `ffmpeg -ss 00:00:01 -i ${escapedUrl} -vframes 1 -y "${outputPath}"`;

      this.logger.info('Executing ffmpeg command', { command });

      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Error extracting frame from video', {
            error,
            videoUrl,
            stderr,
          });
          reject(error);
          return;
        }

        this.logger.info('Frame extracted successfully');
        resolve();
      });
    });
  }

  /**
   * Upload an image to Imgur
   * @param imagePath Path to the image file
   * @returns URL of the uploaded image
   */
  private async uploadToImgur(imagePath: string): Promise<string> {
    try {
      // Read the image file and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      this.logger.info('Uploading image to Imgur', { imagePath, base64Image });

      // Create form data with form-data package
      const formData = new FormData();
      formData.append('image', base64Image);
      formData.append('type', 'base64');

      const response = await axios.post('https://api.imgur.com/3/image', formData, {
        headers: {
          Authorization: `Client-ID ${this.imgurClientId}`,
          ...formData.getHeaders(), // Let form-data set the correct headers
        },
      });

      if (response.data && response.data.success) {
        this.logger.info('Image uploaded to Imgur successfully', {
          link: response.data.data.link,
        });
        return response.data.data.link;
      } else {
        throw new Error('Failed to upload image to Imgur: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      this.logger.error('Error uploading to Imgur', { error });
      throw error;
    }
  }
}
