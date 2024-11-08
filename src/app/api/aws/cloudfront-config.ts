export const getMediaUrl = (key: string) => {
  const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  if (!cloudfrontDomain) {
    throw new Error('CloudFront domain not configured');
  }

  // If it's already a full URL, return as is
  if (key.startsWith('http')) {
    return key;
  }

  // Remove any leading slash
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `${cloudfrontDomain}/${cleanKey}`;
};
