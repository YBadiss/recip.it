import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { Logger } from '../../utils/logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import FormData from 'form-data';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic as string);

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
    try {
      // Create a temporary directory for the frame
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-frame-'));
      const outputFile = path.join(tempDir, 'first-frame.jpg');

      // Extract the first frame from the video
      await this.extractFirstFrame(videoUrl, outputFile);

      // Upload the frame to Imgur
      const imgurUrl = await this.uploadToImgur(outputFile);

      // Clean up temporary file
      fs.unlinkSync(outputFile);
      fs.rmdirSync(tempDir);

      return imgurUrl;
    } catch (error) {
      this.logger.error('Error extracting and uploading video frame', { error });
      throw error;
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
      ffmpeg(videoUrl)
        .on('error', (err: Error) => {
          this.logger.error('Error extracting frame from video', { err });
          reject(err);
        })
        .on('end', () => {
          this.logger.info('Frame extracted successfully');
          resolve();
        })
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          timemarks: ['00:00:01'], // Take screenshot at 1 second
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
