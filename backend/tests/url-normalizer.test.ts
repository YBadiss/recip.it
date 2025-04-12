import { normalizeUrl } from '../src/utils/url-normalizer';

describe('URL Normalizer Utility Tests', () => {
  // Test basic URL normalization
  it('should normalize URLs to a standard format', () => {
    const testUrls = [
      // Original URL, expected normalized URL
      ['http://example.com', 'https://example.com'],
      ['https://example.com/', 'https://example.com'],
      ['http://Example.com', 'https://example.com'],
      ['https://www.example.com', 'https://example.com'],
      ['https://www.example.com/', 'https://example.com'],
    ];

    testUrls.forEach(([input, expected]) => {
      expect(normalizeUrl(input)).toBe(expected);
    });
  });

  // Test removal of tracking parameters
  it('should remove tracking parameters from URLs', () => {
    const testUrls = [
      // Original URL, expected normalized URL
      [
        'https://example.com/recipe?utm_source=google&utm_medium=cpc', 
        'https://example.com/recipe'
      ],
      [
        'https://example.com/recipe?id=123&utm_campaign=summer', 
        'https://example.com/recipe?id=123'
      ],
      [
        'https://example.com/recipe?fbclid=123&id=456', 
        'https://example.com/recipe?id=456'
      ],
      [
        'https://example.com/recipe?id=123&ref=homepage', 
        'https://example.com/recipe?id=123'
      ],
    ];

    testUrls.forEach(([input, expected]) => {
      expect(normalizeUrl(input)).toBe(expected);
    });
  });

  // Test removal of hash fragments
  it('should remove hash fragments from URLs', () => {
    const testUrls = [
      // Original URL, expected normalized URL
      [
        'https://example.com/recipe#section1', 
        'https://example.com/recipe'
      ],
      [
        'https://example.com/recipe?id=123#comments', 
        'https://example.com/recipe?id=123'
      ],
    ];

    testUrls.forEach(([input, expected]) => {
      expect(normalizeUrl(input)).toBe(expected);
    });
  });

  // Test handling of invalid URLs
  it('should handle invalid URLs gracefully', () => {
    const invalidUrl = 'not a url';
    expect(normalizeUrl(invalidUrl)).toBe(invalidUrl);
  });

  // Test real-world recipe URLs
  it('should normalize real-world recipe URLs correctly', () => {
    const testUrls = [
      // Original URL, expected normalized URL
      [
        'https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/?utm_source=email', 
        'https://allrecipes.com/recipe/21014/good-old-fashioned-pancakes'
      ],
      [
        'http://www.food.com/recipe/chocolate-cake-123?fbclid=abc123', 
        'https://food.com/recipe/chocolate-cake-123'
      ],
      [
        'https://www.epicurious.com/recipes/food/views/simple-pasta?ref=rss', 
        'https://epicurious.com/recipes/food/views/simple-pasta'
      ],
    ];

    testUrls.forEach(([input, expected]) => {
      expect(normalizeUrl(input)).toBe(expected);
    });
  });
}); 