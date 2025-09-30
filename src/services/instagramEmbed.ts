// Ultra-simple Instagram integration using embeds
// This uses Instagram's public embed feature - no API needed!

export interface InstagramEmbedPost {
  id: string;
  url: string;
  shortcode: string;
}

export const getInstagramEmbedPosts = (): InstagramEmbedPost[] => [
  {
    id: '1',
    url: 'https://www.instagram.com/p/DPBdj1oD6nw/',
    shortcode: 'DPBdj1oD6nw'
  },
  {
    id: '2',
    url: 'https://www.instagram.com/p/DOvYCnkjJaF/',
    shortcode: 'DOvYCnkjJaF'
  },
  {
    id: '3',
    url: 'https://www.instagram.com/p/DNnLPEHqOYO/',
    shortcode: 'DNnLPEHqOYO'
  },
  {
    id: '4',
    url: 'https://www.instagram.com/p/DMfFAnnPc5v/',
    shortcode: 'DMfFAnnPc5v'
  }, 
  {
    id: '5',
    url: 'https://www.instagram.com/p/DKwacwRs9yZ/',
    shortcode: 'DMfFAnnPc5v'
  },
  {
    id: '6',
    url: 'https://www.instagram.com/p/DJtR9y6s5_D/',
    shortcode: 'DMfFAnnPc5v'
  }
];

// Function to load Instagram embed script
export const loadInstagramEmbeds = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.instgrm) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = () => {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
        resolve();
      } else {
        reject(new Error('Instagram embed script failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Instagram embed script'));
    
    document.head.appendChild(script);
  });
};

// Function to refresh embeds after new content is added
export const refreshInstagramEmbeds = (): void => {
  if (window.instgrm) {
    window.instgrm.Embeds.process();
  }
};
